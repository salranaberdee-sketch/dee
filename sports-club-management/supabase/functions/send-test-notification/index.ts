/**
 * Supabase Edge Function: send-test-notification
 * ส่งการแจ้งเตือนทดสอบไปยังอุปกรณ์ของผู้ใช้
 * 
 * Feature: notification-settings-enhancement
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
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

// VAPID keys for web push
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

// Supabase configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// ข้อความสำหรับการแจ้งเตือนทดสอบ
const TEST_NOTIFICATION = {
  title: 'ทดสอบการแจ้งเตือน',
  message: 'การแจ้งเตือนทำงานปกติ! คุณจะได้รับการแจ้งเตือนจากระบบผ่านช่องทางนี้',
  type: 'test_notification'
}

interface TestNotificationPayload {
  userId: string
}

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * ส่ง web push notification
 * @param subscription - Push subscription details
 * @param title - หัวข้อการแจ้งเตือน
 * @param message - ข้อความการแจ้งเตือน
 */
async function sendWebPush(
  subscription: PushSubscription,
  title: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
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
      title: title,
      body: message,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {
        url: '/notification-settings',
        type: 'test_notification',
        isTest: true
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
 * CORS headers สำหรับ response
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

/**
 * Main handler for send-test-notification Edge Function
 */
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
  
  try {
    // Parse request body
    const payload: TestNotificationPayload = await req.json()
    
    // Validate required fields - Requirement 3.4
    if (!payload.userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'กรุณาระบุ userId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // ตรวจสอบว่าผู้ใช้มี push subscription หรือไม่ - Requirement 3.4
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', payload.userId)
    
    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ไม่สามารถตรวจสอบการลงทะเบียนได้' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // ถ้าไม่มี subscription - Requirement 3.4
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ไม่พบการลงทะเบียนรับการแจ้งเตือน กรุณาเปิดใช้งาน Push Notification ก่อน' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Track results
    const results = {
      sent: 0,
      failed: 0,
      expiredSubscriptions: [] as string[]
    }
    
    // ส่ง push notification ไปยังทุก subscription ของผู้ใช้ - Requirement 3.1, 3.2
    for (const subscription of subscriptions) {
      const pushResult = await sendWebPush(
        subscription,
        TEST_NOTIFICATION.title,
        TEST_NOTIFICATION.message
      )
      
      if (pushResult.success) {
        results.sent++
      } else {
        results.failed++
        
        // เก็บ subscription ที่หมดอายุเพื่อลบทีหลัง
        if (pushResult.error === 'subscription_expired') {
          results.expiredSubscriptions.push(subscription.id)
        }
      }
    }
    
    // ลบ subscription ที่หมดอายุ
    if (results.expiredSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', results.expiredSubscriptions)
      
      console.log(`Removed ${results.expiredSubscriptions.length} expired subscriptions`)
    }
    
    // ถ้าส่งไม่สำเร็จเลย - Requirement 3.4
    if (results.sent === 0) {
      // ถ้าทุก subscription หมดอายุ
      if (results.expiredSubscriptions.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'การลงทะเบียนหมดอายุ กรุณาเปิดใช้งาน Push Notification ใหม่' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ไม่สามารถส่งการแจ้งเตือนได้ กรุณาลองใหม่อีกครั้ง' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // ส่งสำเร็จ - Requirement 3.2, 3.3
    return new Response(
      JSON.stringify({
        success: true,
        sent: results.sent,
        failed: results.failed,
        message: 'ส่งการแจ้งเตือนทดสอบสำเร็จ'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
