<!--
  NotificationBadge.vue
  Displays unread notification count badge
  
  Feature: notification-inbox
  Requirements: 3.1, 3.2
-->
<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationInboxStore } from '@/stores/notificationInbox'

const auth = useAuthStore()
const notificationInbox = useNotificationInboxStore()

// Computed property for unread count
const unreadCount = computed(() => notificationInbox.unreadCount)

// Format badge display (show 9+ for counts > 9)
const badgeText = computed(() => {
  if (unreadCount.value > 9) return '9+'
  return unreadCount.value.toString()
})

// Show badge only when count > 0 (Requirement 3.2)
const showBadge = computed(() => unreadCount.value > 0)

// Initialize and subscribe to realtime updates
async function initNotifications() {
  const userId = auth.user?.id
  if (userId) {
    await notificationInbox.fetchUnreadCount(userId)
    notificationInbox.subscribeToRealtime(userId)
  }
}

// Watch for user changes
watch(() => auth.user?.id, async (userId) => {
  if (userId) {
    await initNotifications()
  } else {
    notificationInbox.reset()
  }
}, { immediate: true })

onUnmounted(() => {
  notificationInbox.unsubscribeFromRealtime()
})
</script>

<template>
  <div class="notification-badge-wrapper">
    <!-- Bell Icon -->
    <svg 
      class="bell-icon" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
    
    <!-- Badge (Requirement 3.1: Display count, 3.2: Hide when zero) -->
    <span v-if="showBadge" class="notification-badge">
      {{ badgeText }}
    </span>
  </div>
</template>

<style scoped>
.notification-badge-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bell-icon {
  width: 24px;
  height: 24px;
}

/* Badge styling - black/white theme */
.notification-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  background: var(--gray-900, #171717);
  color: var(--white, #ffffff);
  font-size: 9px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--white, #ffffff);
}
</style>
