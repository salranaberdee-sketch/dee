/**
 * Notification Preferences Store
 * Manages user notification preferences and push subscriptions
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.2, 5.4
 * Enhanced with: Quiet Hours, Sound Settings, Vibration Settings
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { playNotificationSound } from '@/lib/notificationSounds'

/**
 * ส่ง notification preferences ไปยัง Service Worker
 * เพื่อให้ SW สามารถตรวจสอบ quiet hours, เล่นเสียง, และสั่นได้
 * @param {Object} prefs - notification preferences object
 */
async function syncPreferencesToServiceWorker(prefs) {
  if (!('serviceWorker' in navigator)) return
  
  try {
    const registration = await navigator.serviceWorker.ready
    if (registration.active) {
      registration.active.postMessage({
        type: 'SYNC_NOTIFICATION_PREFERENCES',
        preferences: {
          quiet_hours_enabled: prefs.quiet_hours_enabled ?? false,
          quiet_hours_start: prefs.quiet_hours_start ?? '22:00',
          quiet_hours_end: prefs.quiet_hours_end ?? '07:00',
          notification_sound: prefs.notification_sound ?? 'default',
          vibration_enabled: prefs.vibration_enabled ?? true,
          vibration_pattern: prefs.vibration_pattern ?? 'short'
        }
      })
    }
  } catch (err) {
    console.warn('ไม่สามารถ sync preferences ไปยัง Service Worker:', err)
  }
}

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
  club_application: true,
  // ฟิลด์ใหม่สำหรับ Quiet Hours
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  // ฟิลด์ใหม่สำหรับ Sound Settings
  notification_sound: 'default',
  // ฟิลด์ใหม่สำหรับ Vibration Settings
  vibration_enabled: true,
  vibration_pattern: 'short'
}

/**
 * รูปแบบการสั่นที่รองรับ
 * ค่าเป็น array ของ milliseconds สำหรับ Vibration API
 */
export const VIBRATION_PATTERNS = {
  short: [100],              // สั่นสั้น 100ms
  medium: [200, 100, 200],   // สั่น-หยุด-สั่น
  long: [500],               // สั่นยาว 500ms
  pulse: [100, 50, 100, 50, 100] // สั่นเป็นจังหวะ
}

/**
 * ตัวเลือกเสียงแจ้งเตือนที่รองรับ
 * ใช้ Web Audio API แทนไฟล์ MP3 เพื่อรองรับ offline และลดขนาด
 */
export const SOUND_OPTIONS = [
  { key: 'default', label: 'เสียงเริ่มต้น' },
  { key: 'chime', label: 'เสียงระฆัง' },
  { key: 'bell', label: 'เสียงกระดิ่ง' },
  { key: 'soft', label: 'เสียงนุ่มนวล' },
  { key: 'none', label: 'ไม่มีเสียง' }
]

/**
 * ตรวจสอบว่าเวลาที่กำหนดอยู่ในช่วง Quiet Hours หรือไม่
 * รองรับการข้ามเที่ยงคืน (เช่น 22:00 ถึง 07:00)
 * @param {string} start - เวลาเริ่มต้น (HH:mm)
 * @param {string} end - เวลาสิ้นสุด (HH:mm)
 * @param {Date} time - เวลาที่ต้องการตรวจสอบ
 * @returns {boolean} true ถ้าอยู่ในช่วง Quiet Hours
 */
export function checkQuietHours(start, end, time) {
  const [startHour, startMin] = start.split(':').map(Number)
  const [endHour, endMin] = end.split(':').map(Number)
  
  const currentHour = time.getHours()
  const currentMin = time.getMinutes()
  
  // แปลงเป็นนาทีตั้งแต่เที่ยงคืน
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  const currentMinutes = currentHour * 60 + currentMin
  
  // กรณีข้ามเที่ยงคืน (เช่น 22:00 ถึง 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
  
  // กรณีปกติ (เช่น 09:00 ถึง 17:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

export const useNotificationPreferencesStore = defineStore('notificationPreferences', () => {
  // State
  const preferences = ref(null)
  const subscriptions = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  // State ใหม่สำหรับ Quiet Hours
  const quietHoursEnabled = ref(false)
  const quietHoursStart = ref('22:00')
  const quietHoursEnd = ref('07:00')
  
  // State ใหม่สำหรับ Sound Settings
  const notificationSound = ref('default')
  
  // State ใหม่สำหรับ Vibration Settings
  const vibrationEnabled = ref(true)
  const vibrationPattern = ref('short')

  // Getters
  const hasPreferences = computed(() => preferences.value !== null)
  const subscriptionCount = computed(() => subscriptions.value.length)
  const isPushEnabled = computed(() => preferences.value?.push_enabled ?? true)
  
  // Getter สำหรับตรวจสอบว่าอยู่ในช่วง Quiet Hours หรือไม่
  const isCurrentlyQuietHours = computed(() => {
    if (!quietHoursEnabled.value) return false
    return checkQuietHours(quietHoursStart.value, quietHoursEnd.value, new Date())
  })

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
        // อัพเดท state ใหม่จากข้อมูลที่โหลดมา
        syncStateFromPreferences(data)
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
      // อัพเดท state ใหม่จากข้อมูลที่สร้างใหม่
      syncStateFromPreferences(newData)
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
   * ซิงค์ state จาก preferences object
   * ใช้เมื่อโหลดหรืออัพเดท preferences
   * @param {Object} data - ข้อมูล preferences
   */
  function syncStateFromPreferences(data) {
    if (!data) return
    
    // Quiet Hours
    quietHoursEnabled.value = data.quiet_hours_enabled ?? false
    quietHoursStart.value = data.quiet_hours_start ?? '22:00'
    quietHoursEnd.value = data.quiet_hours_end ?? '07:00'
    
    // Sound Settings
    notificationSound.value = data.notification_sound ?? 'default'
    
    // Vibration Settings
    vibrationEnabled.value = data.vibration_enabled ?? true
    vibrationPattern.value = data.vibration_pattern ?? 'short'
    
    // ส่ง preferences ไปยัง Service Worker
    syncPreferencesToServiceWorker(data)
  }

  /**
   * ตรวจสอบว่าเวลาที่กำหนดอยู่ในช่วง Quiet Hours หรือไม่
   * Implements Requirements 1.3, 1.4, 1.5
   * @param {Date} time - เวลาที่ต้องการตรวจสอบ (default: เวลาปัจจุบัน)
   * @returns {boolean} true ถ้าอยู่ในช่วง Quiet Hours และเปิดใช้งานอยู่
   */
  function isWithinQuietHours(time = new Date()) {
    if (!quietHoursEnabled.value) return false
    return checkQuietHours(quietHoursStart.value, quietHoursEnd.value, time)
  }

  /**
   * อัพเดทการตั้งค่า Quiet Hours
   * Implements Requirements 1.1, 1.2, 1.5
   * @param {boolean} enabled - เปิด/ปิด Quiet Hours
   * @param {string} start - เวลาเริ่มต้น (HH:mm)
   * @param {string} end - เวลาสิ้นสุด (HH:mm)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function updateQuietHours(enabled, start = null, end = null) {
    if (!preferences.value?.id) {
      return { success: false, error: 'Preferences not loaded' }
    }

    loading.value = true
    error.value = null

    try {
      const updateData = {
        quiet_hours_enabled: enabled,
        updated_at: new Date().toISOString()
      }
      
      // อัพเดทเวลาถ้ามีการระบุ
      if (start !== null) {
        updateData.quiet_hours_start = start
      }
      if (end !== null) {
        updateData.quiet_hours_end = end
      }

      const { data, error: updateError } = await supabase
        .from('notification_preferences')
        .update(updateData)
        .eq('id', preferences.value.id)
        .select()
        .single()

      if (updateError) {
        error.value = updateError.message
        return { success: false, error: updateError.message }
      }

      // อัพเดท local state
      preferences.value = data
      syncStateFromPreferences(data)
      return { success: true }
    } catch (err) {
      error.value = err.message || 'Failed to update quiet hours'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * อัพเดทเสียงแจ้งเตือน
   * Implements Requirement 2.3
   * @param {string} sound - ชื่อเสียง ('default', 'chime', 'bell', 'soft', 'none')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function updateNotificationSound(sound) {
    if (!preferences.value?.id) {
      return { success: false, error: 'Preferences not loaded' }
    }

    // ตรวจสอบว่าเป็นเสียงที่รองรับ
    const validSounds = SOUND_OPTIONS.map(opt => opt.key)
    if (!validSounds.includes(sound)) {
      return { success: false, error: `Invalid sound: ${sound}` }
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('notification_preferences')
        .update({
          notification_sound: sound,
          updated_at: new Date().toISOString()
        })
        .eq('id', preferences.value.id)
        .select()
        .single()

      if (updateError) {
        error.value = updateError.message
        return { success: false, error: updateError.message }
      }

      // อัพเดท local state
      preferences.value = data
      notificationSound.value = sound
      return { success: true }
    } catch (err) {
      error.value = err.message || 'Failed to update notification sound'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * เล่นเสียงตัวอย่างตามที่เลือก
   * Implements Requirement 2.2
   * @param {string} sound - ชื่อเสียง ('default', 'chime', 'bell', 'soft', 'none')
   * @returns {boolean} true ถ้าเล่นสำเร็จ
   */
  function previewSound(sound = null) {
    const soundToPlay = sound || notificationSound.value
    return playNotificationSound(soundToPlay)
  }

  /**
   * อัพเดทการตั้งค่าการสั่น
   * Implements Requirement 4.3
   * @param {boolean} enabled - เปิด/ปิดการสั่น
   * @param {string} pattern - รูปแบบการสั่น ('short', 'medium', 'long', 'pulse')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function updateVibrationSettings(enabled, pattern = null) {
    if (!preferences.value?.id) {
      return { success: false, error: 'Preferences not loaded' }
    }

    // ตรวจสอบว่าเป็นรูปแบบที่รองรับ
    if (pattern !== null && !VIBRATION_PATTERNS[pattern]) {
      return { success: false, error: `Invalid vibration pattern: ${pattern}` }
    }

    loading.value = true
    error.value = null

    try {
      const updateData = {
        vibration_enabled: enabled,
        updated_at: new Date().toISOString()
      }
      
      if (pattern !== null) {
        updateData.vibration_pattern = pattern
      }

      const { data, error: updateError } = await supabase
        .from('notification_preferences')
        .update(updateData)
        .eq('id', preferences.value.id)
        .select()
        .single()

      if (updateError) {
        error.value = updateError.message
        return { success: false, error: updateError.message }
      }

      // อัพเดท local state
      preferences.value = data
      vibrationEnabled.value = enabled
      if (pattern !== null) {
        vibrationPattern.value = pattern
      }
      return { success: true }
    } catch (err) {
      error.value = err.message || 'Failed to update vibration settings'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * ทดสอบการสั่นด้วยรูปแบบที่เลือก
   * Implements Requirement 4.4
   * ใช้ Vibration API ของ browser
   */
  function testVibration() {
    // ตรวจสอบว่า browser รองรับ Vibration API
    if (!navigator.vibrate) {
      console.warn('Vibration API not supported')
      return false
    }

    const pattern = VIBRATION_PATTERNS[vibrationPattern.value] || VIBRATION_PATTERNS.short
    navigator.vibrate(pattern)
    return true
  }

  /**
   * ส่งการแจ้งเตือนทดสอบ
   * Implements Requirements 3.1, 3.2, 3.3, 3.4, 3.5
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function sendTestNotification() {
    // ตรวจสอบว่าออนไลน์อยู่หรือไม่
    if (!navigator.onLine) {
      return { 
        success: false, 
        error: 'ไม่สามารถส่งการแจ้งเตือนทดสอบได้ กรุณาเชื่อมต่ออินเทอร์เน็ต' 
      }
    }

    if (!preferences.value?.user_id) {
      return { success: false, error: 'User not logged in' }
    }

    loading.value = true
    error.value = null

    try {
      // เรียก Edge Function สำหรับส่ง test notification
      const { data, error: funcError } = await supabase.functions.invoke('send-test-notification', {
        body: {
          userId: preferences.value.user_id
        }
      })

      if (funcError) {
        error.value = funcError.message
        return { 
          success: false, 
          error: funcError.message || 'ไม่สามารถส่งการแจ้งเตือนทดสอบได้' 
        }
      }

      if (data?.error) {
        error.value = data.error
        return { success: false, error: data.error }
      }

      return { success: true }
    } catch (err) {
      error.value = err.message || 'Failed to send test notification'
      return { 
        success: false, 
        error: 'เกิดข้อผิดพลาดในการส่งการแจ้งเตือนทดสอบ' 
      }
    } finally {
      loading.value = false
    }
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
    // Reset state ใหม่
    quietHoursEnabled.value = false
    quietHoursStart.value = '22:00'
    quietHoursEnd.value = '07:00'
    notificationSound.value = 'default'
    vibrationEnabled.value = true
    vibrationPattern.value = 'short'
  }

  return {
    // State
    preferences,
    subscriptions,
    loading,
    error,
    // State ใหม่
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    notificationSound,
    vibrationEnabled,
    vibrationPattern,
    // Getters
    hasPreferences,
    subscriptionCount,
    isPushEnabled,
    isCurrentlyQuietHours,
    // Actions
    fetchPreferences,
    updatePreference,
    fetchSubscriptions,
    isNotificationTypeEnabled,
    // Actions ใหม่
    isWithinQuietHours,
    updateQuietHours,
    updateNotificationSound,
    previewSound,
    updateVibrationSettings,
    testVibration,
    sendTestNotification,
    reset
  }
})
