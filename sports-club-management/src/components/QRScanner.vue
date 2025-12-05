<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import QrScanner from 'qr-scanner'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['scan', 'error', 'close'])

// Refs
const videoElement = ref(null)
const scanner = ref(null)
const scanning = ref(false)
const error = ref(null)
const hasCamera = ref(true)
const manualInput = ref('')
const mode = ref('camera') // 'camera' | 'manual'

// เริ่มสแกน
async function startScanning() {
  if (!videoElement.value) return
  
  try {
    error.value = null
    scanning.value = true
    
    // สร้าง QR Scanner instance
    scanner.value = new QrScanner(
      videoElement.value,
      result => {
        // เมื่อสแกนสำเร็จ
        emit('scan', result.data)
        stopScanning()
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    )
    
    await scanner.value.start()
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเปิดกล้อง:', err)
    error.value = 'ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้อง'
    hasCamera.value = false
    scanning.value = false
    emit('error', err)
  }
}

// หยุดสแกน
function stopScanning() {
  if (scanner.value) {
    scanner.value.stop()
    scanner.value.destroy()
    scanner.value = null
  }
  scanning.value = false
}

// ส่งรหัสที่กรอกด้วยมือ
function submitManualCode() {
  if (manualInput.value.trim()) {
    emit('scan', manualInput.value.trim())
    manualInput.value = ''
  }
}

// สลับโหมด
function switchMode(newMode) {
  if (newMode === 'camera') {
    mode.value = 'camera'
    error.value = null
    setTimeout(() => {
      startScanning()
    }, 100)
  } else {
    stopScanning()
    mode.value = 'manual'
  }
}

// Watch show prop
watch(() => props.show, (newVal) => {
  if (newVal) {
    // เปิด modal - เริ่มที่โหมดกล้อง
    mode.value = 'camera'
    setTimeout(() => {
      startScanning()
    }, 300)
  } else {
    // ปิด modal - รีเซ็ตทุกอย่าง
    stopScanning()
    error.value = null
    manualInput.value = ''
    mode.value = 'camera'
  }
})

// Cleanup
onBeforeUnmount(() => {
  stopScanning()
})
</script>

<template>
  <div class="qr-scanner">
    <!-- Mode Toggle -->
    <div class="mode-toggle">
      <button 
        :class="['mode-btn', { active: mode === 'camera' }]"
        @click="switchMode('camera')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        สแกนกล้อง
      </button>
      <button 
        :class="['mode-btn', { active: mode === 'manual' }]"
        @click="switchMode('manual')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        กรอกรหัส
      </button>
    </div>

    <!-- Camera Mode -->
    <div v-if="mode === 'camera'" class="camera-mode">
      <!-- Video Preview -->
      <div v-if="hasCamera" class="scanner-video-container">
        <video ref="videoElement" class="scanner-video"></video>
        <div v-if="scanning" class="scanner-overlay">
          <div class="scan-frame">
            <div class="corner corner-tl"></div>
            <div class="corner corner-tr"></div>
            <div class="corner corner-bl"></div>
            <div class="corner corner-br"></div>
          </div>
          <p class="scan-instruction">วางกล้องให้ตรงกับ QR Code</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="scanner-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>{{ error }}</p>
        <button class="btn btn-secondary btn-sm" @click="switchMode('manual')">
          ใช้โหมดกรอกรหัสแทน
        </button>
      </div>

      <div class="camera-actions">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          ยกเลิก
        </button>
      </div>
    </div>

    <!-- Manual Mode -->
    <div v-if="mode === 'manual'" class="manual-mode">
      <div class="form-group">
        <label>รหัสเช็คอิน</label>
        <input 
          v-model="manualInput" 
          type="text" 
          placeholder="เช่น EVT-ABC123"
          @keyup.enter="submitManualCode"
          autofocus
        />
        <span class="form-hint">กรอกรหัสที่ได้จาก QR Code</span>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          ยกเลิก
        </button>
        <button 
          type="button" 
          class="btn btn-primary" 
          @click="submitManualCode"
          :disabled="!manualInput.trim()"
        >
          เช็คอิน
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qr-scanner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Mode Toggle */
.mode-toggle {
  display: flex;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0.25rem;
  gap: 0.25rem;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn svg {
  width: 18px;
  height: 18px;
}

.mode-btn.active {
  background: #fff;
  color: #171717;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.mode-btn:hover:not(.active) {
  color: #171717;
}

/* Camera Mode */
.camera-mode {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.camera-actions {
  display: flex;
  justify-content: flex-end;
}

/* Manual Mode */
.manual-mode {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Video Container */
.scanner-video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.scanner-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Scanner Overlay */
.scanner-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.scan-frame {
  position: relative;
  width: 240px;
  height: 240px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
}

.corner {
  position: absolute;
  width: 24px;
  height: 24px;
  border: 3px solid #fff;
}

.corner-tl {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
  border-radius: 12px 0 0 0;
}

.corner-tr {
  top: -3px;
  right: -3px;
  border-left: none;
  border-bottom: none;
  border-radius: 0 12px 0 0;
}

.corner-bl {
  bottom: -3px;
  left: -3px;
  border-right: none;
  border-top: none;
  border-radius: 0 0 0 12px;
}

.corner-br {
  bottom: -3px;
  right: -3px;
  border-left: none;
  border-top: none;
  border-radius: 0 0 12px 0;
}

.scan-instruction {
  margin-top: 1.5rem;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* Error State */
.scanner-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  text-align: center;
}

.scanner-error svg {
  width: 48px;
  height: 48px;
  color: #ef4444;
}

.scanner-error p {
  font-size: 0.875rem;
  color: #991b1b;
  margin: 0;
}



.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #525252;
}

.form-group input {
  padding: 0.75rem;
  border: 1px solid #d4d4d4;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.15s;
}

.form-group input:focus {
  outline: none;
  border-color: #171717;
}

.form-hint {
  font-size: 0.75rem;
  color: #a3a3a3;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover:not(:disabled) {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #171717;
  color: #fff;
}

.btn-secondary {
  background: #f5f5f5;
  color: #171717;
  border: 1px solid #e5e5e5;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
}

/* Responsive */
@media (max-width: 639px) {
  .scanner-video-container {
    border-radius: 8px;
  }
  
  .scan-frame {
    width: 200px;
    height: 200px;
  }
}
</style>
