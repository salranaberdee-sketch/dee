import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize auth before mounting
import { useAuthStore } from './stores/auth'
const auth = useAuthStore()
auth.init().then(() => {
  app.mount('#app')
})

// Register Service Worker with update prompt
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (confirm('มีเวอร์ชันใหม่! ต้องการอัพเดทหรือไม่?')) {
          updateSW(true)
        }
      },
      onOfflineReady() {
        console.log('แอปพร้อมใช้งานแบบออฟไลน์')
      }
    })
  })
  
  // รับ message จาก Service Worker เพื่อเล่นเสียงแจ้งเตือน
  // Implements Requirement 2.5
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
      try {
        const { playNotificationSound } = await import('@/lib/notificationSounds')
        playNotificationSound(event.data.sound)
      } catch (err) {
        console.warn('ไม่สามารถเล่นเสียงแจ้งเตือนได้:', err)
      }
    }
  })
}
