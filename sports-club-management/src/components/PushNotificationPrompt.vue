<script setup>
/**
 * Push Notification Prompt Component
 * Shows a prompt to enable push notifications on login for new devices
 * 
 * Requirements: 4.1 - WHEN a user logs in on a new device THEN the Push_Notification_System 
 * SHALL prompt to enable notifications for that device
 */
import { ref, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  isPushSupported, 
  getPermissionStatus, 
  requestPermission, 
  subscribeToPush,
  isDeviceSubscribed 
} from '@/lib/pushNotification'
import Modal from './Modal.vue'

const auth = useAuthStore()

// Local storage key for storing user's choice to not show again
const DISMISS_KEY = 'push_notification_prompt_dismissed'

const showPrompt = ref(false)
const loading = ref(false)
const error = ref('')

/**
 * Check if user has dismissed the prompt before
 */
function isDismissed() {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (!dismissed) return false
    const data = JSON.parse(dismissed)
    // Check if dismissed for current user
    return data.userId === auth.user?.id
  } catch {
    return false
  }
}

/**
 * Store user's choice to not show again
 */
function setDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({
      userId: auth.user?.id,
      dismissedAt: new Date().toISOString()
    }))
  } catch (e) {
    console.error('Error saving dismiss preference:', e)
  }
}

/**
 * Check if we should show the notification prompt
 */
async function checkAndShowPrompt() {
  // Don't show if not authenticated
  if (!auth.user?.id) {
    showPrompt.value = false
    return
  }

  // Don't show if push not supported
  if (!isPushSupported()) {
    showPrompt.value = false
    return
  }

  // Don't show if permission already denied
  const permission = getPermissionStatus()
  if (permission === 'denied') {
    showPrompt.value = false
    return
  }

  // Don't show if user dismissed before
  if (isDismissed()) {
    showPrompt.value = false
    return
  }

  // Don't show if already subscribed on this device
  const subscribed = await isDeviceSubscribed(auth.user.id)
  if (subscribed) {
    showPrompt.value = false
    return
  }

  // Show the prompt
  showPrompt.value = true
}

/**
 * Handle user clicking "Enable Notifications"
 */
async function handleEnable() {
  loading.value = true
  error.value = ''

  try {
    // Request permission first
    const permission = await requestPermission()
    
    if (permission !== 'granted') {
      error.value = 'กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์'
      loading.value = false
      return
    }

    // Subscribe to push notifications
    const result = await subscribeToPush(auth.user.id)
    
    if (!result.success) {
      error.value = result.error || 'ไม่สามารถเปิดการแจ้งเตือนได้'
      loading.value = false
      return
    }

    // Success - close the prompt
    showPrompt.value = false
  } catch (e) {
    console.error('Error enabling notifications:', e)
    error.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    loading.value = false
  }
}

/**
 * Handle user clicking "Not Now" - dismiss and don't show again
 */
function handleDismiss() {
  setDismissed()
  showPrompt.value = false
}

/**
 * Handle user clicking close button - just close without remembering
 */
function handleClose() {
  showPrompt.value = false
}

// Watch for user login to show prompt
watch(() => auth.user?.id, async (userId, oldUserId) => {
  // Only check when user logs in (userId changes from null/undefined to a value)
  if (userId && !oldUserId) {
    // Small delay to let the app settle after login
    setTimeout(() => {
      checkAndShowPrompt()
    }, 1500)
  } else if (!userId) {
    showPrompt.value = false
  }
}, { immediate: false })

// Also check on mount if user is already logged in
onMounted(async () => {
  if (auth.user?.id && !auth.loading) {
    // Check after a delay to not interfere with initial load
    setTimeout(() => {
      checkAndShowPrompt()
    }, 2000)
  }
})
</script>

<template>
  <Modal 
    :show="showPrompt" 
    title="เปิดการแจ้งเตือน"
    @close="handleClose"
  >
    <template #body>
      <div class="prompt-content">
        <!-- Icon -->
        <div class="prompt-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>

        <!-- Message -->
        <p class="prompt-message">
          รับการแจ้งเตือนเมื่อมีประกาศสำคัญ นัดหมายใหม่ หรือการอัปเดตสถานะต่างๆ
        </p>

        <!-- Benefits list -->
        <ul class="prompt-benefits">
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>ประกาศด่วนจากสโมสร</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>การเปลี่ยนแปลงตารางนัดหมาย</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>สถานะการสมัครและการแข่งขัน</span>
          </li>
        </ul>

        <!-- Error message -->
        <div v-if="error" class="prompt-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="prompt-actions">
        <button 
          type="button" 
          class="btn btn-secondary" 
          @click="handleDismiss"
          :disabled="loading"
        >
          ไม่ต้องการ
        </button>
        <button 
          type="button" 
          class="btn btn-primary" 
          @click="handleEnable"
          :disabled="loading"
        >
          <svg v-if="loading" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
          </svg>
          <span v-else>เปิดการแจ้งเตือน</span>
        </button>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.prompt-content {
  text-align: center;
  padding: 8px 0;
}

.prompt-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: var(--gray-900);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.prompt-icon svg {
  width: 32px;
  height: 32px;
  color: var(--white);
}

.prompt-message {
  font-size: 15px;
  color: var(--gray-600);
  line-height: 1.5;
  margin-bottom: 20px;
}

.prompt-benefits {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  text-align: left;
}

.prompt-benefits li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  color: var(--gray-700);
}

.prompt-benefits li svg {
  width: 18px;
  height: 18px;
  color: var(--accent-success);
  flex-shrink: 0;
}

.prompt-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #FEE2E2;
  border-radius: var(--radius-md);
  color: #DC2626;
  font-size: 13px;
}

.prompt-error svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.prompt-actions {
  display: flex;
  gap: 12px;
}

.prompt-actions .btn {
  flex: 1;
}

.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
