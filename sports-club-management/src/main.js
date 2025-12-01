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
}
