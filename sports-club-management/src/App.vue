<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NavBar from '@/components/NavBar.vue'
import UrgentAnnouncementPopup from '@/components/UrgentAnnouncementPopup.vue'
import InstallPrompt from '@/components/InstallPrompt.vue'

const route = useRoute()
const auth = useAuthStore()
const isOffline = ref(!navigator.onLine)

const showNav = computed(() => auth.isAuthenticated && route.name !== 'Login' && route.name !== 'AthleteRegistration')

function updateOnlineStatus() {
  isOffline.value = !navigator.onLine
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>

<template>
  <div class="app-layout">
    <!-- Offline Banner -->
    <div v-if="isOffline" class="offline-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.58 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
      <span>ออฟไลน์ - ข้อมูลอาจไม่เป็นปัจจุบัน</span>
    </div>

    <!-- Loading state -->
    <div v-if="auth.loading" class="loading-screen">
      <div class="loading-spinner"></div>
    </div>
    
    <template v-else>
      <NavBar v-if="showNav" :unread="0" />
      <main class="main-content">
        <router-view />
      </main>
      
      <!-- Urgent Announcement Popup -->
      <UrgentAnnouncementPopup v-if="auth.isAuthenticated" />
      
      <!-- PWA Install Prompt - บังคับติดตั้งครั้งแรก -->
      <InstallPrompt />
    </template>
  </div>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: var(--gray-900);
  color: var(--white);
  font-size: 13px;
  font-weight: 500;
}
.loading-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-50);
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--gray-200);
  border-top-color: var(--gray-900);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
