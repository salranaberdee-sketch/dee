<script setup>
import { ref, onMounted } from 'vue'

const showPrompt = ref(false)
const deferredPrompt = ref(null)
const isInstalled = ref(false)
const isIOS = ref(false)
const installing = ref(false)

// ตรวจสอบว่าติดตั้งแล้วหรือยัง
function checkIfInstalled() {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.navigator.standalone === true) return true
  if (localStorage.getItem('pwa-installed') === 'true') return true
  return false
}

// ตรวจสอบว่าเป็น iOS หรือไม่
function checkIsIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

onMounted(() => {
  isInstalled.value = checkIfInstalled()
  isIOS.value = checkIsIOS()
  
  if (isInstalled.value) {
    showPrompt.value = false
    return
  }

  // จับ event beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    
    // Android: เรียก prompt อัตโนมัติทันที!
    autoInstall()
  })

  // จับ event เมื่อติดตั้งสำเร็จ
  window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwa-installed', 'true')
    showPrompt.value = false
    isInstalled.value = true
    installing.value = false
  })

  // แสดง prompt สำหรับ iOS (ต้องทำเอง)
  if (isIOS.value) {
    showPrompt.value = true
  } else {
    // รอ beforeinstallprompt event
    setTimeout(() => {
      if (!isInstalled.value && !deferredPrompt.value) {
        showPrompt.value = true
      }
    }, 1000)
  }
})

// Auto install สำหรับ Android - เรียก prompt ทันที
async function autoInstall() {
  if (deferredPrompt.value && !installing.value) {
    installing.value = true
    
    try {
      deferredPrompt.value.prompt()
      const { outcome } = await deferredPrompt.value.userChoice
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true')
        showPrompt.value = false
      } else {
        // ถ้าปฏิเสธ แสดง modal บังคับ
        showPrompt.value = true
      }
    } catch (err) {
      showPrompt.value = true
    }
    
    installing.value = false
    deferredPrompt.value = null
  }
}

// กดปุ่มติดตั้งอีกครั้ง
async function installApp() {
  if (deferredPrompt.value) {
    autoInstall()
  } else if (!isIOS.value) {
    // Reload เพื่อให้ได้ prompt ใหม่
    window.location.reload()
  }
}
</script>

<template>
  <Teleport to="body">
    <!-- iOS: แสดงวิธีติดตั้ง -->
    <div v-if="showPrompt && !isInstalled && isIOS" class="install-overlay">
      <div class="install-modal">
        <div class="install-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
        </div>
        
        <h2 class="install-title">ติดตั้งแอป</h2>
        
        <div class="ios-steps">
          <div class="step">
            <span class="step-num">1</span>
            <span>กดปุ่ม</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            <span>Share</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>เลือก "Add to Home Screen"</span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span>กด "Add"</span>
          </div>
        </div>

        <p class="ios-note">หลังติดตั้งแล้ว เปิดแอปจากหน้าจอหลัก</p>
      </div>
    </div>

    <!-- Android: แสดงเมื่อปฏิเสธการติดตั้ง -->
    <div v-else-if="showPrompt && !isInstalled && !isIOS" class="install-overlay">
      <div class="install-modal">
        <div class="install-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        
        <h2 class="install-title">กรุณาติดตั้งแอป</h2>
        <p class="install-desc">
          ต้องติดตั้งแอปเพื่อใช้งานระบบ
        </p>

        <button class="btn-install" @click="installApp">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ติดตั้งแอป
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
  background: rgba(0, 0, 0, 0.95);
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
  margin: 0 0 16px;
}

.install-desc {
  font-size: 14px;
  color: #525252;
  margin: 0 0 24px;
}

.ios-steps {
  text-align: left;
  margin-bottom: 20px;
}

.step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #E5E5E5;
  font-size: 15px;
  color: #171717;
}

.step:last-child {
  border-bottom: none;
}

.step-num {
  width: 24px;
  height: 24px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.step svg {
  color: #171717;
}

.ios-note {
  font-size: 13px;
  color: #737373;
  margin: 0;
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
}

.btn-install:active {
  background: #404040;
}
</style>
