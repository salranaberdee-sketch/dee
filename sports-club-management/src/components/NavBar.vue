<script setup>
// ==================== Imports ====================
// Vue Core
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

// Stores
import { useAuthStore } from '@/stores/auth'
import { useNotificationInboxStore } from '@/stores/notificationInbox'
import { useOfflineSyncStore } from '@/stores/offlineSync'

// Components
import NotificationBadge from '@/components/NotificationBadge.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import OnlineIndicator from '@/components/OnlineIndicator.vue'

// ==================== Stores & Router ====================
const route = useRoute()
const auth = useAuthStore()
const notificationInbox = useNotificationInboxStore()
const offlineSync = useOfflineSyncStore()

// ==================== Computed Properties ====================
// จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
const unreadCount = computed(() => notificationInbox.unreadCount)

// ข้อมูล Avatar และชื่อผู้ใช้สำหรับแสดงใน Navigation
const userAvatarUrl = computed(() => auth.profile?.avatar_url || null)
const userName = computed(() => auth.profile?.full_name || auth.profile?.email || '')

// รายการเมนู Navigation ที่กรองตาม Role ของผู้ใช้
const navItems = computed(() => {
  const items = [
    { to: '/', icon: 'home', label: 'หน้าหลัก', roles: ['admin', 'coach', 'athlete'] },
    { to: '/events', icon: 'event', label: 'กิจกรรม', roles: ['admin', 'coach', 'athlete'] },
    { to: '/facilities', icon: 'facility', label: 'สถานที่', roles: ['admin', 'coach', 'athlete'] },
    { to: '/albums', icon: 'album', label: 'จัดการอัลบั้ม', roles: ['admin', 'coach'] },
    { to: '/notifications', icon: 'bell', label: 'แจ้งเตือน', roles: ['admin', 'coach', 'athlete'] },
    { to: '/profile', icon: 'user', label: 'โปรไฟล์', roles: ['admin', 'coach', 'athlete'] },
  ]
  
  // ถ้ายังไม่มี profile ให้แสดงเมนูพื้นฐาน
  const userRole = auth.profile?.role || 'athlete'
  
  // กรองเฉพาะเมนูที่ Role ปัจจุบันเข้าถึงได้
  return items.filter(item => item.roles.includes(userRole))
})

// ==================== Methods ====================
/**
 * ตรวจสอบว่าเมนูนี้เป็นหน้าที่ active อยู่หรือไม่
 * @param {string} to - path ของเมนู
 * @returns {boolean}
 */
function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

// ==================== Lifecycle Hooks ====================
// เริ่มต้น offline sync listeners เมื่อ component mount
onMounted(() => {
  offlineSync.initListeners()
})

// ทำความสะอาด listeners เมื่อ component unmount
onUnmounted(() => {
  offlineSync.cleanupListeners()
})
</script>

<template>
  <!-- ตัวบอกสถานะ Online/Offline ติดด้านบน -->
  <OnlineIndicator class="online-indicator-fixed" />
  
  <!-- Bottom Navigation Bar -->
  <nav class="nav-bottom">
    <router-link 
      v-for="item in navItems" 
      :key="item.to" 
      :to="item.to" 
      class="nav-item" 
      :class="{ active: isActive(item.to) }"
    >
      <div class="nav-icon-wrap">
        <!-- Home Icon -->
        <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        
        <!-- Event Icon (Star/Trophy) -->
        <svg v-else-if="item.icon === 'event'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        
        <!-- Album Icon (Image Gallery) -->
        <svg v-else-if="item.icon === 'album'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        
        <!-- Facility Icon (Building) -->
        <svg v-else-if="item.icon === 'facility'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        
        <!-- Notification Icon with Badge -->
        <NotificationBadge v-else-if="item.icon === 'bell'" />
        
        <!-- User Profile Avatar -->
        <UserAvatar 
          v-else-if="item.icon === 'user'"
          :avatar-url="userAvatarUrl"
          :user-name="userName"
          size="sm"
          class="nav-avatar"
        />
      </div>
      
      <!-- Label ของเมนู -->
      <span class="nav-label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
/* ==================== Navigation Icon Wrapper ==================== */
.nav-icon-wrap { 
  position: relative; 
}

/* ==================== Navigation Badge ==================== */
.nav-badge { 
  position: absolute; 
  top: -4px; 
  right: -8px;
  background: var(--accent-danger); 
  color: var(--white);
  font-size: 9px; 
  font-weight: 700;
  min-width: 16px; 
  height: 16px; 
  padding: 0 4px;
  border-radius: 100px; 
  display: flex; 
  align-items: center; 
  justify-content: center;
}

/* ==================== Navigation Label ==================== */
.nav-label { 
  margin-top: 2px; 
}

/* ==================== User Avatar in Navigation ==================== */
/* ปรับขนาด Avatar ให้เหมาะกับ Bottom Navigation */
.nav-avatar {
  width: 24px !important;
  height: 24px !important;
  border-width: 1.5px !important;
  font-size: 11px !important;
}

/* ==================== Online Indicator ==================== */
/* ตำแหน่งตัวบอกสถานะ Online/Offline ด้านบนจอ */
.online-indicator-fixed {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
