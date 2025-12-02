<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationInboxStore } from '@/stores/notificationInbox'
import { useOfflineSyncStore } from '@/stores/offlineSync'
import NotificationBadge from '@/components/NotificationBadge.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import OnlineIndicator from '@/components/OnlineIndicator.vue'

const route = useRoute()
const auth = useAuthStore()
const notificationInbox = useNotificationInboxStore()
const offlineSync = useOfflineSyncStore()

// Initialize offline sync listeners
onMounted(() => {
  offlineSync.initListeners()
})

onUnmounted(() => {
  offlineSync.cleanupListeners()
})

// Get unread count from notification inbox store
const unreadCount = computed(() => notificationInbox.unreadCount)

// Get user avatar URL and name for profile nav item (Requirement 3.2)
const userAvatarUrl = computed(() => auth.profile?.avatar_url || null)
const userName = computed(() => auth.profile?.full_name || auth.profile?.email || '')

const navItems = computed(() => {
  const items = [
    { to: '/', icon: 'home', label: 'หน้าหลัก', roles: ['admin', 'coach', 'athlete'] },
    { to: '/events', icon: 'event', label: 'กิจกรรม', roles: ['admin', 'coach', 'athlete'] },
    { to: '/tournaments', icon: 'trophy', label: 'ทัวนาเมนต์', roles: ['admin', 'coach', 'athlete'] },
    { to: '/notifications', icon: 'bell', label: 'แจ้งเตือน', roles: ['admin', 'coach', 'athlete'] },
    { to: '/profile', icon: 'user', label: 'โปรไฟล์', roles: ['admin', 'coach', 'athlete'] },
  ]
  return items.filter(item => item.roles.includes(auth.profile?.role))
})

function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <!-- Online/Offline Indicator - Fixed at top -->
  <OnlineIndicator class="online-indicator-fixed" />
  
  <nav class="nav-bottom">
    <router-link 
      v-for="item in navItems" 
      :key="item.to" 
      :to="item.to" 
      class="nav-item" 
      :class="{ active: isActive(item.to) }"
    >
      <div class="nav-icon-wrap">
        <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <svg v-else-if="item.icon === 'event'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <svg v-else-if="item.icon === 'calendar'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <svg v-else-if="item.icon === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>
        </svg>
        <svg v-else-if="item.icon === 'trophy'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0012 0V2z"/>
        </svg>
        <!-- Use NotificationBadge component for bell icon (Requirements 3.1) -->
        <NotificationBadge v-else-if="item.icon === 'bell'" />
        <!-- Use UserAvatar component for profile (Requirement 3.2) -->
        <UserAvatar 
          v-else-if="item.icon === 'user'"
          :avatar-url="userAvatarUrl"
          :user-name="userName"
          size="sm"
          class="nav-avatar"
        />
      </div>
      <span class="nav-label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.nav-icon-wrap { position: relative; }
.nav-badge { 
  position: absolute; top: -4px; right: -8px;
  background: var(--accent-danger); color: white;
  font-size: 9px; font-weight: 700;
  min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 100px; display: flex; align-items: center; justify-content: center;
}
.nav-label { margin-top: 2px; }

/* UserAvatar styling for NavBar (Requirement 3.2) */
.nav-avatar {
  width: 24px !important;
  height: 24px !important;
  border-width: 1.5px !important;
  font-size: 11px !important;
}

/* Online Indicator positioning */
.online-indicator-fixed {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
