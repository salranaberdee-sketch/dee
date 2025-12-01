/**
 * Notification Preferences Store
 * Manages user notification preferences and push subscriptions
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

/**
 * Default notification preferences
 * All notifications enabled by default per design spec
 */
const DEFAULT_PREFERENCES = {
  push_enabled: true,
  announcement_urgent: true,
  announcement_normal: true,
  schedule_updates: true,
  event_reminders: true,
  tournament_updates: true,
  club_application: true
}

export const useNotificationPreferencesStore = defineStore('notificationPreferences', () => {
  // State
  const preferences = ref(null)
  const subscriptions = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const hasPreferences = computed(() => preferences.value !== null)
  const subscriptionCount = computed(() => subscriptions.value.length)
  const isPushEnabled = computed(() => preferences.value?.push_enabled ?? true)

  /**
   * Fetch notification preferences for a user
   * Creates default preferences if none exist
   * Implements Requirement 2.1 - display all notification types
   * @param {string} userId - The user's ID
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async function fetchPreferences(userId) {
    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    loading.value = true
    error.value = null

    try {
      // Try to fetch existing preferences
      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected for new users
        error.value = fetchError.message
        return { success: false, error: fetchError.message }
      }

      if (data) {
        preferences.value = data
        return { success: true, data }
      }

      // No preferences exist, create default ones
      const { data: newData, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          ...DEFAULT_PREFERENCES
        })
        .select()
        .single()

      if (insertError) {
        error.value = insertError.message
        return { success: false, error: insertError.message }
      }

      preferences.value = newData
      return { success: true, data: newData }
    } catch (err) {
      error.value = err.message || 'Failed to fetch preferences'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Update a specific notification preference
   * Implements Requirements 2.2, 2.3, 2.4 - toggle notifications and persist changes
   * @param {string} type - The preference type (e.g., 'announcement_urgent', 'push_enabled')
   * @param {boolean} enabled - Whether the notification type should be enabled
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function updatePreference(type, enabled) {
    if (!preferences.value?.id) {
      return { success: false, error: 'Preferences not loaded' }
    }

    // Validate preference type
    const validTypes = [
      'push_enabled',
      'announcement_urgent',
      'announcement_normal',
      'schedule_updates',
      'event_reminders',
      'tournament_updates',
      'club_application'
    ]

    if (!validTypes.includes(type)) {
      return { success: false, error: `Invalid preference type: ${type}` }
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('notification_preferences')
        .update({
          [type]: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', preferences.value.id)
        .select()
        .single()

      if (updateError) {
        error.value = updateError.message
        return { success: false, error: updateError.message }
      }

      // Update local state
      preferences.value = data
      return { success: true }
    } catch (err) {
      error.value = err.message || 'Failed to update preference'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch all push subscriptions for a user
   * Implements Requirement 4.3 - display count of subscribed devices
   * @param {string} userId - The user's ID
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async function fetchSubscriptions(userId) {
    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        error.value = fetchError.message
        return { success: false, error: fetchError.message }
      }

      subscriptions.value = data || []
      return { success: true, data: subscriptions.value }
    } catch (err) {
      error.value = err.message || 'Failed to fetch subscriptions'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if a specific notification type is enabled
   * @param {string} type - The notification type to check
   * @returns {boolean} Whether the notification type is enabled
   */
  function isNotificationTypeEnabled(type) {
    if (!preferences.value) return true // Default to enabled
    if (!preferences.value.push_enabled) return false // Global push disabled
    return preferences.value[type] ?? true
  }

  /**
   * Reset store state
   * Called on logout to clear user-specific data
   */
  function reset() {
    preferences.value = null
    subscriptions.value = []
    loading.value = false
    error.value = null
  }

  return {
    // State
    preferences,
    subscriptions,
    loading,
    error,
    // Getters
    hasPreferences,
    subscriptionCount,
    isPushEnabled,
    // Actions
    fetchPreferences,
    updatePreference,
    fetchSubscriptions,
    isNotificationTypeEnabled,
    reset
  }
})
