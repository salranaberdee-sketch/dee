<script setup>
import { ref, onMounted } from 'vue'

const showPrompt = ref(false)
const deferredPrompt = ref(null)
const isInstalled = ref(false)

// ตรวจสอบว่าติดตั้งแล้วหรือยัง
function checkIfInstalled() {
  // ตรวจสอบจาก display-mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }
  // ตรวจสอบจาก navigator.standalone (iOS)
  if (window.navigator.standalone === true) {
    return true
  }
  // ตรวจสอบจาก localStorage
  if (localStorage.getItem('pwa-installed') === 'true') {
    return true
  }
  return false
}

onMounted(() => {
  isInstalled.value = checkIfInstalled()
  
  // ถ้าติดตั้งแล้วไม่ต้องแสดง
  if (isInstalled.value) {
    showPrompt.value = false
    return
  }

  // แสดง prompt ทันทีถ้ายังไม่ติดตั้ง
  showPrompt.value = true

  // จับ event beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
  })

  // จับ event เมื่อติดตั้งสำเร็จ
  window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwa-installed', 'true')
    showPrompt.value = false
    isInstalled.value = true
  })
})

async function installApp() {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true')
      showPrompt.value = false
    }
    deferredPrompt.value = null
  } else {
    // สำหรับ iOS หรือ browser ที่ไม่รองรับ
    alert('กรุณาติดตั้งแอปโดย:\n\niOS: กดปุ่ม Share → Add to Home Screen\n\nAndroid: กดเมนู ⋮ → Install App')
  }
}

function skipForNow() {
  // ไม่อนุญาตให้ข้าม - บังคับติดตั้ง
  alert('กรุณาติดตั้งแอปเพื่อใช้งาน')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="showPrompt && !isInstalled" class="install-overlay">
      <div class="install-modal">
        <div class="install-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        
        <h2 class="install-title">ติดตั้งแอป</h2>
        <p class="install-desc">
          ติดตั้งแอป "ระบบจัดการสโมสรกีฬา" เพื่อประสบการณ์ใช้งานที่ดีที่สุด
        </p>
        
        <ul class="install-benefits">
          <li>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            ใช้งานได้แม้ไม่มีอินเทอร์เน็ต
          </li>
          <li>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            เปิดได้เร็วจากหน้าจอหลัก
          </li>
          <li>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            รับการแจ้งเตือนสำคัญ
          </li>
        </ul>

        <button class="btn-install" @click="installApp">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ติดตั้งแอปตอนนี้
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.install-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  padding: 20px;
}

.install-modal {
  background: #fff;
  border-radius: 16px;
  padding: 32px 24px;
  max-width: 360px;
  width: 100%;
  text-align: center;
}

.install-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: #171717;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.install-icon svg {
  color: #fff;
}

.install-title {
  font-size: 22px;
  font-weight: 700;
  color: #171717;
  margin: 0 0 12px;
}

.install-desc {
  font-size: 14px;
  color: #525252;
  margin: 0 0 24px;
  line-height: 1.5;
}

.install-benefits {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  text-align: left;
}

.install-benefits li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  color: #404040;
}

.install-benefits svg {
  color: #22C55E;
  flex-shrink: 0;
}

.btn-install {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-install:hover {
  background: #404040;
}
</style>
