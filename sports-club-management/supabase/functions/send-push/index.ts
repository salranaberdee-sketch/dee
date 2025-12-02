/**
 * Supabase Edge Function: send-push
 * Sends push notifications and stores them in notification_history
 * 
 * Feature: notification-inbox, pwa-push-notifications
 * Requirements: 1.2 (notification storage)
 * 
 * Note: This file runs on Deno runtime (Supabase Edge Functions)
 * TypeScript errors in IDE are expected - the code works correctly on Supabase
 */

// @ts-ignore - Deno imports work on Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore - Deno imports work on Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare Deno namespace for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// VAPID keys for web push (should be in environment variables)
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

// Supabase configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Notification type mapping for notification_history
const NOTIFICATION_TYPE_MAP: Record<string, string> = {
  'announcement_urgent': 'announcement_urgent',
  'announcement_normal': 'announcement_normal',
  'schedule_update': 'schedule_updates',
  'schedule_updates': 'schedule_updates',
  'event_reminder': 'event_reminders',
  'event_reminders': 'event_reminders',
  'tournament_update': 'tournament_updates',
  'tournament_updates': 'tournament_updates',
  'club_application': 'club_application',
}

interface PushPayload {
  title: string
  message: string
  type?: string
  referenceType?: string
  referenceId?: string
  url?: string
  priority?: string
  targetType?: 'all' | 'club' | 'coaches' | 'athletes' | 'user'
  clubId?: string
  userId?: string
}

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}


/**
 * Insert notification into notification_history table
 * Called after successful push notification send
 * 
 * @param supabase - Supabase client with service role
 * @param userId - Target user ID
 * @param payload - Push notification payload
 * @returns Promise<{success: boolean, error?: string}>
 */
async function insertNotificationHistory(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: PushPayload
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    // Map the notification type to valid enum value
    const notificationType = NOTIFICATION_TYPE_MAP[payload.type || ''] || 'announcement_normal'
    
    const { data, error } = await supabase
      .from('notification_history')
      .insert({
        user_id: userId,
        title: payload.title,
        message: payload.message,
        type: notificationType,
        reference_type: payload.referenceType || null,
        reference_id: payload.referenceId || null,
        read_at: null,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()
    
    if (error) {
      console.error('Failed to insert notification history:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, id: data?.id }
  } catch (err) {
    console.error('Error inserting notification history:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Retry wrapper for insertNotificationHistory
 * Retries on transient errors with exponential backoff
 * 
 * @param supabase - Supabase client
 * @param userId - Target user ID
 * @param payload - Push notification payload
 * @param maxRetries - Maximum retry attempts (default: 3)
 */
async function insertNotificationHistoryWithRetry(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: PushPayload,
  maxRetries = 3
): Promise<{ success: boolean; error?: string; id?: string }> {
  let lastError: string | undefined
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await insertNotificationHistory(supabase, userId, payload)
    
    if (result.success) {
      return result
    }
    
    lastError = result.error
    
    // Check if error is transient (network, timeout, etc.)
    const isTransient = lastError?.includes('timeout') || 
                        lastError?.includes('network') ||
                        lastError?.includes('connection')
    
    if (!isTransient || attempt === maxRetries) {
      break
    }
    
    // Exponential backoff: 100ms, 200ms, 400ms
    const delay = 100 * Math.pow(2, attempt - 1)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  return { success: false, error: lastError }
}


/**
 * Send web push notification using Web Push API
 * 
 * @param subscription - Push subscription details
 * @param payload - Notification payload
 */
async function sendWebPush(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Import web-push library dynamically
    // @ts-ignore - Deno imports work on Supabase Edge Functions
    const webpush = await import('https://esm.sh/web-push@3.6.6')
    
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    }
    
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.message,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {
        url: payload.url || '/',
        type: payload.type,
        referenceType: payload.referenceType,
        referenceId: payload.referenceId
      }
    })
    
    await webpush.sendNotification(pushSubscription, notificationPayload)
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number }
    console.error('Web push failed:', error)
    
    // Return specific error for expired subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, error: 'subscription_expired' }
    }
    
    return { success: false, error: error.message || String(err) }
  }
}

/**
 * Get target users based on targetType
 */
async function getTargetUsers(
  supabase: ReturnType<typeof createClient>,
  payload: PushPayload
): Promise<string[]> {
  const { targetType, clubId, userId } = payload
  
  // Single user target
  if (targetType === 'user' && userId) {
    return [userId]
  }
  
  // Build query based on target type
  let query = supabase.from('push_subscriptions').select('user_id')
  
  if (targetType === 'club' && clubId) {
    // Get users in the club
    const { data: clubUsers } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('club_id', clubId)
    
    if (clubUsers && clubUsers.length > 0) {
      const userIds = clubUsers.map(u => u.id)
      query = query.in('user_id', userIds)
    }
  } else if (targetType === 'coaches') {
    const { data: coaches } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'coach')
    
    if (coaches && coaches.length > 0) {
      const userIds = coaches.map(u => u.id)
      query = query.in('user_id', userIds)
    }
  } else if (targetType === 'athletes') {
    const { data: athletes } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'athlete')
    
    if (athletes && athletes.length > 0) {
      const userIds = athletes.map(u => u.id)
      query = query.in('user_id', userIds)
    }
  }
  // For 'all', no filter needed
  
  const { data: subscriptions } = await query
  
  // Get unique user IDs
  const mappedIds = subscriptions?.map((s: { user_id: string }) => s.user_id) || []
  const userIds: string[] = [...new Set(mappedIds)] as string[]
  return userIds
}


/**
 * Main handler for send-push Edge Function
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    // Parse request body
    const payload: PushPayload = await req.json()
    
    // Validate required fields
    if (!payload.title || !payload.message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Create Supabase client with service role for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Get target users
    const targetUserIds = await getTargetUsers(supabase, payload)
    
    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, stored: 0, message: 'No target users found' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Get push subscriptions for target users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)
    
    if (subError) {
      console.error('Error fetching subscriptions:', subError)
    }
    
    // Track results
    const results = {
      sent: 0,
      failed: 0,
      stored: 0,
      storedFailed: 0,
      expiredSubscriptions: [] as string[]
    }
    
    // Process each user
    for (const userId of targetUserIds) {
      // 1. Insert notification history (don't fail if push fails)
      const historyResult = await insertNotificationHistoryWithRetry(supabase, userId, payload)
      if (historyResult.success) {
        results.stored++
      } else {
        results.storedFailed++
        console.error(`Failed to store notification for user ${userId}:`, historyResult.error)
      }
      
      // 2. Send push notification to all subscriptions for this user
      const userSubscriptions = subscriptions?.filter(s => s.user_id === userId) || []
      
      for (const subscription of userSubscriptions) {
        const pushResult = await sendWebPush(subscription, payload)
        
        if (pushResult.success) {
          results.sent++
        } else {
          results.failed++
          
          // Remove expired subscriptions
          if (pushResult.error === 'subscription_expired') {
            results.expiredSubscriptions.push(subscription.id)
          }
        }
      }
    }
    
    // Clean up expired subscriptions
    if (results.expiredSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', results.expiredSubscriptions)
      
      console.log(`Removed ${results.expiredSubscriptions.length} expired subscriptions`)
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        sent: results.sent,
        failed: results.failed,
        stored: results.stored,
        storedFailed: results.storedFailed,
        expiredRemoved: results.expiredSubscriptions.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
