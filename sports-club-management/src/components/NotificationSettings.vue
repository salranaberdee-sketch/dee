<script setup>
/**
 * NotificationSettings Component
 * Displays push notification settings with enable/disable toggles
 * Enhanced with: Quiet Hours, Sound Settings, Vibration Settings, Test Notification
 * 
 * Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 2.4, 3.1, 3.4, 3.5, 4.1, 4.2, 4.4
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationPreferencesStore, SOUND_OPTIONS, VIBRATION_PATTERNS } from '@/stores/notificationPreferences'
import { 
  isPushSupported, 
  getPermissionStatus, 
  requestPermission, 
  subscribeToPush,
  unsubscribeFromPush 
} from '@/lib/pushNotification'

const auth = useAuthStore()
const notificationStore = useNotificationPreferencesStore()

// Local state
const permissionStatus = ref(getPermissionStatus())
const isSubscribing = ref(false)
const message = ref('')
const messageType = ref('success')
const isSendingTest = ref(false)

// Computed
const pushSupported = computed(() => isPushSupported())
const isLoading = computed(() => notificationStore.loading)
const preferences = computed(() => notificationStore.preferences)
const subscriptionCount = computed(() => notificationStore.subscriptionCount)
const isPushEnabled = computed(() => notificationStore.isPushEnabled)

// Computed สำหรับ Quiet Hours
const quietHoursEnabled = computed(() => notificationStore.quietHoursEnabled)
const quietHoursStart = computed(() => notificationStore.quietHoursStart)
const quietHoursEnd = computed(() => notificationStore.quietHoursEnd)

// Computed สำหรับ Sound Settings
const notificationSound = computed(() => notificationStore.notificationSound)

// Computed สำหรับ Vibration Settings
const vibrationEnabled = computed(() => notificationStore.vibrationEnabled)
const vibrationPattern = computed(() => notificationStore.vibrationPattern)

// ตัวเลือกรูปแบบการสั่น
const vibrationPatternOptions = [
  { key: 'short', label: 'สั้น' },
  { key: 'medium', label: 'ปานกลาง' },
  { key: 'long', label: 'ยาว' },
  { key: 'pulse', label: 'เป็นจังหวะ' }
]

// ตรวจสอบว่า browser รองรับ Vibration API
const vibrationSupported = computed(() => 'vibrate' in navigator)

// Notification type definitions
const notificationTypes = [
  { 
    key: 'announcement_urgent', 
    label: 'ประกาศด่วน', 
    description: 'การแจ้งเตือนประกาศสำคัญเร่งด่วน',
    icon: 'alert-triangle'
  },
  { 
    key: 'announcement_normal', 
    label: 'ประกาศทั่วไป', 
    description: 'การแจ้งเตือนประกาศข่าวสารทั่วไป',
    icon: 'megaphone'
  },
  { 
    key: 'schedule_updates', 
    label: 'อัปเดตตารางนัดหมาย', 
    description: 'แจ้งเตือนเมื่อมีการเปลี่ยนแปลงตารางนัดหมาย',
    icon: 'calendar'
  },
  { 
    key: 'event_reminders', 
    label: 'เตือนกิจกรรม', 
    description: 'แจ้งเตือนก่อนถึงกำหนดกิจกรรม',
    icon: 'clock'
  },
  { 
    key: 'tournament_updates', 
    label: 'อัปเดตการแข่งขัน', 
    description: 'แจ้งเตือนสถานะการลงทะเบียนแข่งขัน',
    icon: 'trophy'
  },
  { 
    key: 'club_application', 
    label: 'ใบสมัครชมรม', 
    description: 'แจ้งเตือนสถานะใบสมัครเข้าชมรม',
    icon: 'file-text'
  }
]

// Load data on mount
onMounted(async () => {
  if (auth.user?.id) {
    await notificationStore.fetchPreferences(auth.user.id)
    await notificationStore.fetchSubscriptions(auth.user.id)
    permissionStatus.value = getPermissionStatus()
  }
})

// Watch for auth changes
watch(() => auth.user?.id, async (userId) => {
  if (userId) {
    await notificationStore.fetchPreferences(userId)
    await notificationStore.fetchSubscriptions(userId)
  }
})

// Request notification permission
async function handleRequestPermission() {
  isSubscribing.value = true
  try {
    const result = await requestPermission()
    permissionStatus.value = result
    
    if (result === 'granted') {
      // Auto-subscribe after permission granted
      const subscribeResult = await subscribeToPush(auth.user.id)
      if (subscribeResult.success) {
        await notificationStore.fetchSubscriptions(auth.user.id)
        showMessage('เปิดใช้งานการแจ้งเตือนสำเร็จ', 'success')
      } else {
        showMessage(subscribeResult.error || 'ไม่สามารถลงทะเบียนการแจ้งเตือนได้', 'error')
      }
    } else if (result === 'denied') {
      showMessage('คุณปฏิเสธการแจ้งเตือน สามารถเปิดใช้งานได้ในการตั้งค่าเบราว์เซอร์', 'error')
    }
  } catch (error) {
    showMessage('เกิดข้อผิดพลาด: ' + error.message, 'error')
  } finally {
    isSubscribing.value = false
  }
}

// Toggle push notifications globally
async function togglePushEnabled() {
  if (!preferences.value) return
  
  const newValue = !preferences.value.push_enabled
  const result = await notificationStore.updatePreference('push_enabled', newValue)
  
  if (result.success) {
    if (newValue && permissionStatus.value === 'granted') {
      // Re-subscribe when enabling
      await subscribeToPush(auth.user.id)
      await notificationStore.fetchSubscriptions(auth.user.id)
    } else if (!newValue) {
      // Unsubscribe when disabling
      await unsubscribeFromPush(auth.user.id)
      await notificationStore.fetchSubscriptions(auth.user.id)
    }
    showMessage(newValue ? 'เปิดการแจ้งเตือนแล้ว' : 'ปิดการแจ้งเตือนแล้ว', 'success')
  } else {
    showMessage(result.error || 'ไม่สามารถอัปเดตการตั้งค่าได้', 'error')
  }
}

// Toggle specific notification type
async function toggleNotificationType(type) {
  if (!preferences.value) return
  
  const newValue = !preferences.value[type]
  const result = await notificationStore.updatePreference(type, newValue)
  
  if (!result.success) {
    showMessage(result.error || 'ไม่สามารถอัปเดตการตั้งค่าได้', 'error')
  }
}

// Show message helper
function showMessage(text, type = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => message.value = '', 3000)
}

// Get permission status text
function getPermissionText() {
  switch (permissionStatus.value) {
    case 'granted': return 'อนุญาตแล้ว'
    case 'denied': return 'ถูกปฏิเสธ'
    default: return 'ยังไม่ได้ตั้งค่า'
  }
}

// Toggle Quiet Hours
// Implements Requirement 1.1, 1.5
async function toggleQuietHours() {
  const newValue = !quietHoursEnabled.value
  const result = await notificationStore.updateQuietHours(newValue)
  
  if (result.success) {
    showMessage(newValue ? 'เปิดช่วงเวลาไม่รบกวนแล้ว' : 'ปิดช่วงเวลาไม่รบกวนแล้ว', 'success')
  } else {
    showMessage(result.error || 'ไม่สามารถอัปเดตการตั้งค่าได้', 'error')
  }
}

// Update Quiet Hours time
// Implements Requirement 1.2
async function updateQuietHoursTime(type, value) {
  const start = type === 'start' ? value : quietHoursStart.value
  const end = type === 'end' ? value : quietHoursEnd.value
  
  const result = await notificationStore.updateQuietHours(quietHoursEnabled.value, start, end)
  
  if (!result.success) {
    showMessage(result.error || 'ไม่สามารถอัปเดตเวลาได้', 'error')
  }
}

// Update notification sound
// Implements Requirement 2.3
async function updateSound(sound) {
  const result = await notificationStore.updateNotificationSound(sound)
  
  if (result.success) {
    showMessage('บันทึกเสียงแจ้งเตือนแล้ว', 'success')
  } else {
    showMessage(result.error || 'ไม่สามารถอัปเดตเสียงได้', 'error')
  }
}

// Preview sound
// Implements Requirement 2.2
function previewSound(sound) {
  notificationStore.previewSound(sound)
}

// Toggle vibration
// Implements Requirement 4.1
async function toggleVibration() {
  const newValue = !vibrationEnabled.value
  const result = await notificationStore.updateVibrationSettings(newValue)
  
  if (result.success) {
    showMessage(newValue ? 'เปิดการสั่นแล้ว' : 'ปิดการสั่นแล้ว', 'success')
  } else {
    showMessage(result.error || 'ไม่สามารถอัปเดตการตั้งค่าได้', 'error')
  }
}

// Update vibration pattern
// Implements Requirement 4.2
async function updateVibrationPattern(pattern) {
  const result = await notificationStore.updateVibrationSettings(vibrationEnabled.value, pattern)
  
  if (!result.success) {
    showMessage(result.error || 'ไม่สามารถอัปเดตรูปแบบการสั่นได้', 'error')
  }
}

// Test vibration
// Implements Requirement 4.4
function testVibration() {
  const success = notificationStore.testVibration()
  if (!success) {
    showMessage('อุปกรณ์ไม่รองรับการสั่น', 'error')
  }
}

// Send test notification
// Implements Requirements 3.1, 3.4, 3.5
async function sendTestNotification() {
  // ตรวจสอบว่าออนไลน์อยู่หรือไม่
  if (!navigator.onLine) {
    showMessage('ไม่สามารถส่งการแจ้งเตือนทดสอบได้ กรุณาเชื่อมต่ออินเทอร์เน็ต', 'error')
    return
  }

  isSendingTest.value = true
  
  try {
    const result = await notificationStore.sendTestNotification()
    
    if (result.success) {
      showMessage('ส่งการแจ้งเตือนทดสอบแล้ว', 'success')
    } else {
      showMessage(result.error || 'ไม่สามารถส่งการแจ้งเตือนทดสอบได้', 'error')
    }
  } catch (err) {
    showMessage('เกิดข้อผิดพลาดในการส่งการแจ้งเตือน', 'error')
  } finally {
    isSendingTest.value = false
  }
}
</script>

<template>
  <div class="notification-settings">
    <!-- Message Alert -->
    <div v-if="message" :class="['alert', `alert-${messageType}`]">
      <svg v-if="messageType === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {{ message }}
    </div>

    <!-- Push Not Supported Warning -->
    <div v-if="!pushSupported" class="warning-card">
      <div class="warning-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="warning-content">
        <h4>ไม่รองรับการแจ้งเตือน</h4>
        <p>เบราว์เซอร์ของคุณไม่รองรับ Push Notifications กรุณาใช้เบราว์เซอร์รุ่นใหม่</p>
      </div>
    </div>

    <!-- Main Settings Section -->
    <div v-else class="settings-section">
      <!-- Push Status Card -->
      <div class="status-card">
        <div class="status-header">
          <div class="status-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="status-info">
            <h3>Push Notifications</h3>
            <p>สถานะ: {{ getPermissionText() }}</p>
          </div>
        </div>

        <!-- Permission Request Button -->
        <div v-if="permissionStatus !== 'granted'" class="permission-section">
          <button 
            v-if="permissionStatus === 'default'"
            class="btn btn-primary"
            :disabled="isSubscribing"
            @click="handleRequestPermission"
          >
            <svg v-if="isSubscribing" class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {{ isSubscribing ? 'กำลังเปิดใช้งาน...' : 'เปิดใช้งานการแจ้งเตือน' }}
          </button>
          <p v-else-if="permissionStatus === 'denied'" class="denied-text">
            การแจ้งเตือนถูกปิดกั้น กรุณาเปิดใช้งานในการตั้งค่าเบราว์เซอร์
          </p>
        </div>

        <!-- Global Toggle (when permission granted) -->
        <div v-else class="global-toggle">
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">เปิดการแจ้งเตือน</span>
              <span class="toggle-desc">รับการแจ้งเตือนบนอุปกรณ์นี้</span>
            </div>
            <button 
              :class="['toggle-switch', { active: isPushEnabled }]"
              :disabled="isLoading"
              @click="togglePushEnabled"
            >
              <span class="toggle-knob"></span>
            </button>
          </div>
          
          <!-- Device Count -->
          <div class="device-count">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
            <span>{{ subscriptionCount }} อุปกรณ์ที่ลงทะเบียน</span>
          </div>
        </div>
      </div>

      <!-- Quiet Hours Section -->
      <!-- Implements Requirements 1.1, 1.2, 1.5 -->
      <div v-if="permissionStatus === 'granted' && isPushEnabled" class="settings-card">
        <div class="section-header">
          <div class="section-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
          <span class="section-title">ช่วงเวลาไม่รบกวน</span>
        </div>

        <div class="setting-content">
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="toggle-label">เปิดช่วงเวลาไม่รบกวน</span>
              <span class="toggle-desc">ไม่รับการแจ้งเตือนในช่วงเวลาที่กำหนด</span>
            </div>
            <button 
              :class="['toggle-switch', { active: quietHoursEnabled }]"
              :disabled="isLoading"
              @click="toggleQuietHours"
            >
              <span class="toggle-knob"></span>
            </button>
          </div>

          <!-- Time Pickers - แสดงเมื่อเปิด Quiet Hours -->
          <div v-if="quietHoursEnabled" class="time-pickers">
            <div class="time-picker-row">
              <div class="time-picker-item">
                <label class="time-label">เริ่มต้น</label>
                <input 
                  type="time" 
                  class="time-input"
                  :value="quietHoursStart"
                  :disabled="isLoading"
                  @change="updateQuietHoursTime('start', $event.target.value)"
                />
              </div>
              <div class="time-separator">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
              <div class="time-picker-item">
                <label class="time-label">สิ้นสุด</label>
                <input 
                  type="time" 
                  class="time-input"
                  :value="quietHoursEnd"
                  :disabled="isLoading"
                  @change="updateQuietHoursTime('end', $event.target.value)"
                />
              </div>
            </div>
            <p class="time-hint">ตัวอย่าง: 22:00 ถึง 07:00 (ข้ามเที่ยงคืน)</p>
          </div>
        </div>
      </div>

      <!-- Sound Settings Section -->
      <!-- Implements Requirements 2.1, 2.2, 2.4 -->
      <div v-if="permissionStatus === 'granted' && isPushEnabled" class="settings-card">
        <div class="section-header">
          <div class="section-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          </div>
          <span class="section-title">เสียงแจ้งเตือน</span>
        </div>

        <div class="setting-content">
          <div class="sound-options">
            <div 
              v-for="option in SOUND_OPTIONS" 
              :key="option.key"
              :class="['sound-option', { active: notificationSound === option.key }]"
              @click="updateSound(option.key)"
            >
              <div class="sound-radio">
                <div v-if="notificationSound === option.key" class="sound-radio-dot"></div>
              </div>
              <span class="sound-label">{{ option.label }}</span>
              <button 
                v-if="option.key !== 'none'"
                class="preview-btn"
                :disabled="isLoading"
                @click.stop="previewSound(option.key)"
                title="ฟังตัวอย่าง"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Vibration Settings Section -->
      <!-- Implements Requirements 4.1, 4.2, 4.4 -->
      <div v-if="permissionStatus === 'granted' && isPushEnabled" class="settings-card">
        <div class="section-header">
          <div class="section-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
              <path d="M2 8v8"/>
              <path d="M22 8v8"/>
            </svg>
          </div>
          <span class="section-title">การสั่น</span>
        </div>

        <div class="setting-content">
          <!-- แจ้งเตือนถ้าไม่รองรับ -->
          <div v-if="!vibrationSupported" class="warning-inline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>อุปกรณ์นี้ไม่รองรับการสั่น</span>
          </div>

          <template v-else>
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">เปิดการสั่น</span>
                <span class="toggle-desc">สั่นเมื่อได้รับการแจ้งเตือน</span>
              </div>
              <button 
                :class="['toggle-switch', { active: vibrationEnabled }]"
                :disabled="isLoading"
                @click="toggleVibration"
              >
                <span class="toggle-knob"></span>
              </button>
            </div>

            <!-- Vibration Pattern Selector - แสดงเมื่อเปิดการสั่น -->
            <div v-if="vibrationEnabled" class="vibration-settings">
              <label class="setting-label">รูปแบบการสั่น</label>
              <div class="pattern-options">
                <button 
                  v-for="option in vibrationPatternOptions" 
                  :key="option.key"
                  :class="['pattern-btn', { active: vibrationPattern === option.key }]"
                  :disabled="isLoading"
                  @click="updateVibrationPattern(option.key)"
                >
                  {{ option.label }}
                </button>
              </div>
              <button 
                class="test-vibration-btn"
                :disabled="isLoading"
                @click="testVibration"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
                ทดสอบการสั่น
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Test Notification Section -->
      <!-- Implements Requirements 3.1, 3.4, 3.5 -->
      <div v-if="permissionStatus === 'granted' && isPushEnabled" class="settings-card">
        <div class="section-header">
          <div class="section-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <span class="section-title">ทดสอบการแจ้งเตือน</span>
        </div>

        <div class="setting-content">
          <p class="test-desc">ส่งการแจ้งเตือนทดสอบเพื่อตรวจสอบว่าการตั้งค่าทำงานถูกต้อง</p>
          <button 
            class="btn btn-primary test-notification-btn"
            :disabled="isLoading || isSendingTest"
            @click="sendTestNotification"
          >
            <svg v-if="isSendingTest" class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {{ isSendingTest ? 'กำลังส่ง...' : 'ส่งการแจ้งเตือนทดสอบ' }}
          </button>
        </div>
      </div>

      <!-- Notification Types Section -->
      <div v-if="permissionStatus === 'granted' && isPushEnabled" class="types-section">
        <div class="section-header">
          <div class="section-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <span class="section-title">ประเภทการแจ้งเตือน</span>
        </div>

        <div class="types-list">
          <div 
            v-for="type in notificationTypes" 
            :key="type.key" 
            class="type-item"
          >
            <div class="type-icon">
              <!-- Alert Triangle -->
              <svg v-if="type.icon === 'alert-triangle'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <!-- Megaphone -->
              <svg v-else-if="type.icon === 'megaphone'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
              </svg>
              <!-- Calendar -->
              <svg v-else-if="type.icon === 'calendar'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <!-- Clock -->
              <svg v-else-if="type.icon === 'clock'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <!-- Trophy -->
              <svg v-else-if="type.icon === 'trophy'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
              <!-- File Text -->
              <svg v-else-if="type.icon === 'file-text'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div class="type-info">
              <span class="type-label">{{ type.label }}</span>
              <span class="type-desc">{{ type.description }}</span>
            </div>
            <button 
              :class="['toggle-switch', 'small', { active: preferences?.[type.key] }]"
              :disabled="isLoading"
              @click="toggleNotificationType(type.key)"
            >
              <span class="toggle-knob"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-settings {
  padding: 0;
}

/* Alert */
.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}
.alert-success { background: #D1FAE5; color: #065F46; }
.alert-error { background: #FEE2E2; color: #991B1B; }

/* Warning Card */
.warning-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px;
  background: #FEF3C7;
  border-radius: 16px;
  border: 1px solid #FCD34D;
}
.warning-icon {
  width: 40px;
  height: 40px;
  background: #F59E0B;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.warning-icon svg { color: #fff; }
.warning-content h4 {
  font-size: 15px;
  font-weight: 600;
  color: #92400E;
  margin-bottom: 4px;
}
.warning-content p {
  font-size: 13px;
  color: #A16207;
  line-height: 1.5;
}

/* Settings Section */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Status Card */
.status-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E5E5E5;
  padding: 20px;
}
.status-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.status-icon {
  width: 48px;
  height: 48px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.status-icon svg { color: #fff; }
.status-info h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}
.status-info p {
  font-size: 14px;
  color: #737373;
}

/* Permission Section */
.permission-section {
  padding-top: 16px;
  border-top: 1px solid #E5E5E5;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: 0.15s;
}
.btn-primary {
  background: #171717;
  color: #fff;
}
.btn-primary:hover { background: #404040; }
.btn-primary:disabled {
  background: #D4D4D4;
  cursor: not-allowed;
}
.denied-text {
  font-size: 14px;
  color: #991B1B;
  text-align: center;
  padding: 12px;
  background: #FEE2E2;
  border-radius: 10px;
}

/* Global Toggle */
.global-toggle {
  padding-top: 16px;
  border-top: 1px solid #E5E5E5;
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.toggle-label {
  font-size: 15px;
  font-weight: 600;
  color: #171717;
}
.toggle-desc {
  font-size: 13px;
  color: #737373;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 52px;
  height: 28px;
  background: #D4D4D4;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}
.toggle-switch.active {
  background: #171717;
}
.toggle-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.toggle-switch.small {
  width: 44px;
  height: 24px;
  border-radius: 12px;
}
.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-switch.active .toggle-knob {
  transform: translateX(24px);
}
.toggle-switch.small .toggle-knob {
  width: 20px;
  height: 20px;
}
.toggle-switch.small.active .toggle-knob {
  transform: translateX(20px);
}

/* Device Count */
.device-count {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 14px;
  background: #F5F5F5;
  border-radius: 10px;
  font-size: 14px;
  color: #525252;
}

/* Types Section */
.types-section {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E5E5E5;
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #F5F5F5;
}
.section-icon {
  width: 36px;
  height: 36px;
  background: #171717;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.section-icon svg { color: #fff; }
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #171717;
}

/* Types List */
.types-list {
  padding: 0;
}
.type-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid #F5F5F5;
}
.type-item:last-child {
  border-bottom: none;
}
.type-icon {
  width: 40px;
  height: 40px;
  background: #F5F5F5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.type-icon svg { color: #525252; }
.type-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.type-label {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}
.type-desc {
  font-size: 12px;
  color: #737373;
}

/* Spinner */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner { animation: spin 1s linear infinite; }

/* Settings Card - สำหรับ sections ใหม่ */
.settings-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #E5E5E5;
  overflow: hidden;
}
.setting-content {
  padding: 16px 20px;
}
.setting-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #525252;
  margin-bottom: 10px;
}

/* Time Pickers - Quiet Hours */
.time-pickers {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #F5F5F5;
}
.time-picker-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.time-picker-item {
  flex: 1;
}
.time-label {
  display: block;
  font-size: 12px;
  color: #737373;
  margin-bottom: 6px;
}
.time-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #E5E5E5;
  border-radius: 10px;
  font-size: 15px;
  color: #171717;
  background: #FAFAFA;
  transition: border-color 0.15s;
}
.time-input:focus {
  outline: none;
  border-color: #171717;
  background: #fff;
}
.time-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.time-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 20px;
  color: #A3A3A3;
}
.time-hint {
  font-size: 12px;
  color: #737373;
  margin-top: 10px;
}

/* Sound Options */
.sound-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sound-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #E5E5E5;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.sound-option:hover {
  background: #FAFAFA;
}
.sound-option.active {
  border-color: #171717;
  background: #F5F5F5;
}
.sound-radio {
  width: 20px;
  height: 20px;
  border: 2px solid #D4D4D4;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sound-option.active .sound-radio {
  border-color: #171717;
}
.sound-radio-dot {
  width: 10px;
  height: 10px;
  background: #171717;
  border-radius: 50%;
}
.sound-label {
  flex: 1;
  font-size: 14px;
  color: #171717;
}
.preview-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #F5F5F5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}
.preview-btn:hover {
  background: #E5E5E5;
}
.preview-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.preview-btn svg {
  color: #525252;
}

/* Vibration Settings */
.vibration-settings {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #F5F5F5;
}
.pattern-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.pattern-btn {
  padding: 10px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #525252;
  cursor: pointer;
  transition: all 0.15s;
}
.pattern-btn:hover {
  background: #FAFAFA;
}
.pattern-btn.active {
  border-color: #171717;
  background: #171717;
  color: #fff;
}
.pattern-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.test-vibration-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #525252;
  cursor: pointer;
  transition: all 0.15s;
}
.test-vibration-btn:hover {
  background: #FAFAFA;
  border-color: #D4D4D4;
}
.test-vibration-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Warning Inline */
.warning-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #FEF3C7;
  border-radius: 10px;
  font-size: 13px;
  color: #92400E;
}

/* Test Notification */
.test-desc {
  font-size: 14px;
  color: #737373;
  margin-bottom: 16px;
  line-height: 1.5;
}
.test-notification-btn {
  width: 100%;
}

/* Responsive */
@media (max-width: 480px) {
  .type-desc {
    display: none;
  }
  .time-picker-row {
    flex-direction: column;
    gap: 16px;
  }
  .time-separator {
    padding-top: 0;
    transform: rotate(90deg);
  }
  .pattern-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
