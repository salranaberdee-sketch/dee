/**
 * Push Notification Service
 * Handles Web Push API interactions for PWA push notifications
 * 
 * Requirements: 1.1, 1.2, 4.2
 */

import { supabase } from './supabase'

// VAPID public key - should be set in environment or Supabase secrets
// This is a placeholder - replace with actual VAPID public key
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

/**
 * Check if Push Notifications are supported in the current browser
 * @returns {boolean} True if push notifications are supported
 */
export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Get the current notification permission status
 * @returns {NotificationPermission} 'granted', 'denied', or 'default'
 */
export function getPermissionStatus() {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Request notification permission from the user
 * Handles graceful denial per Requirement 1.2
 * @returns {Promise<NotificationPermission>} The permission result
 */
export async function requestPermission() {
  if (!isPushSupported()) {
    console.warn('Push notifications are not supported in this browser')
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
  }
}

/**
 * Get the VAPID public key for push subscription
 * @returns {string} The VAPID public key
 */
export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY
}


/**
 * Convert a base64 string to Uint8Array for VAPID key
 * @param {string} base64String - Base64 encoded string
 * @returns {Uint8Array} Converted array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Get device information for subscription tracking
 * @returns {Object} Device info object
 */
function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || 'unknown',
    language: navigator.language || 'unknown'
  }
}

/**
 * Subscribe to push notifications and store subscription in database
 * Implements Requirement 1.1 - register device subscription and store in database
 * @param {string} userId - The user's ID
 * @returns {Promise<{success: boolean, subscription?: PushSubscription, error?: string}>}
 */
export async function subscribeToPush(userId) {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' }
  }

  if (!VAPID_PUBLIC_KEY) {
    return { success: false, error: 'VAPID public key not configured' }
  }

  const permission = getPermissionStatus()
  if (permission !== 'granted') {
    return { success: false, error: 'Notification permission not granted' }
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    // If no subscription exists, create one
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    // Extract subscription keys
    const subscriptionJson = subscription.toJSON()
    const p256dh = subscriptionJson.keys?.p256dh || ''
    const auth = subscriptionJson.keys?.auth || ''

    // Store subscription in database
    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: p256dh,
        auth: auth,
        device_info: getDeviceInfo(),
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,endpoint'
      })

    if (dbError) {
      console.error('Error storing subscription:', dbError)
      return { success: false, error: 'Failed to store subscription' }
    }

    return { success: true, subscription }
  } catch (error) {
    console.error('Error subscribing to push:', error)
    return { success: false, error: error.message || 'Failed to subscribe' }
  }
}

/**
 * Unsubscribe from push notifications and remove from database
 * Implements Requirement 4.2 - remove subscription on logout
 * @param {string} userId - The user's ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function unsubscribeFromPush(userId) {
  try {
    // Get service worker registration
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Remove from database first
        const { error: dbError } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint)

        if (dbError) {
          console.error('Error removing subscription from database:', dbError)
        }

        // Unsubscribe from push manager
        await subscription.unsubscribe()
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
    return { success: false, error: error.message || 'Failed to unsubscribe' }
  }
}

/**
 * Get all subscriptions for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<{success: boolean, subscriptions?: Array, error?: string}>}
 */
export async function getUserSubscriptions(userId) {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, subscriptions: data || [] }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to fetch subscriptions' }
  }
}

/**
 * Check if current device is subscribed
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>}
 */
export async function isDeviceSubscribed(userId) {
  if (!isPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      return false
    }

    // Check if this subscription exists in database
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
      .single()

    return !error && !!data
  } catch (error) {
    console.error('Error checking subscription status:', error)
    return false
  }
}
