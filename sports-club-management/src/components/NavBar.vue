<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineProps({ unread: { type: Number, default: 0 } })

const route = useRoute()
const auth = useAuthStore()

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
        <svg v-else-if="item.icon === 'bell'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <svg v-else-if="item.icon === 'user'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span v-if="item.icon === 'bell' && unread > 0" class="nav-badge">{{ unread > 9 ? '9+' : unread }}</span>
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
</style>
