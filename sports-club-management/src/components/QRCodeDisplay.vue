<script setup>
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  value: { type: String, required: true },
  size: { type: Number, default: 200 },
  title: { type: String, default: '' }
})

const qrDataUrl = ref('')
const canvasRef = ref(null)

async function generateQR() {
  if (!props.value) return
  try {
    qrDataUrl.value = await QRCode.toDataURL(props.value, {
      width: props.size,
      margin: 2,
      color: { dark: '#171717', light: '#ffffff' }
    })
  } catch (err) {
    console.error('QR generation error:', err)
  }
}

function downloadQR() {
  if (!qrDataUrl.value) return
  const link = document.createElement('a')
  link.download = `qr-${props.title || props.value}.png`
  link.href = qrDataUrl.value
  link.click()
}

async function shareQR() {
  if (!navigator.share) {
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(props.value)
      alert('คัดลอกรหัสแล้ว: ' + props.value)
    } catch {
      alert('รหัส: ' + props.value)
    }
    return
  }
  
  try {
    // Convert data URL to blob for sharing
    const response = await fetch(qrDataUrl.value)
    const blob = await response.blob()
    const file = new File([blob], `qr-${props.title || 'checkin'}.png`, { type: 'image/png' })
    
    await navigator.share({
      title: props.title || 'QR Code เช็คอิน',
      text: `รหัสเช็คอิน: ${props.value}`,
      files: [file]
    })
  } catch (err) {
    // Fallback if file sharing not supported
    try {
      await navigator.share({
        title: props.title || 'QR Code เช็คอิน',
        text: `รหัสเช็คอิน: ${props.value}`
      })
    } catch {
      alert('รหัส: ' + props.value)
    }
  }
}

watch(() => props.value, generateQR)
onMounted(generateQR)
</script>

<template>
  <div class="qr-container">
    <div class="qr-image-wrap">
      <img v-if="qrDataUrl" :src="qrDataUrl" :alt="'QR Code: ' + value" class="qr-image" />
      <div v-else class="qr-loading">กำลังสร้าง QR...</div>
    </div>
    <code class="qr-code-text">{{ value }}</code>
    <div class="qr-actions">
      <button type="button" class="btn btn-secondary btn-sm" @click="downloadQR">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        ดาวน์โหลด
      </button>
      <button type="button" class="btn btn-secondary btn-sm" @click="shareQR">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
        แชร์
      </button>
    </div>
  </div>
</template>

<style scoped>
.qr-container { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.qr-image-wrap { background: #fff; padding: 1rem; border-radius: 12px; border: 1px solid #e5e5e5; }
.qr-image { display: block; width: 180px; height: 180px; }
.qr-loading { width: 180px; height: 180px; display: flex; align-items: center; justify-content: center; color: #737373; }
.qr-code-text { font-size: 1.125rem; font-weight: 700; background: #e5e5e5; padding: 0.5rem 1rem; border-radius: 8px; font-family: monospace; }
.qr-actions { display: flex; gap: 0.5rem; }
.btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.75rem; font-weight: 500; border: none; cursor: pointer; }
.btn svg { width: 16px; height: 16px; }
.btn-secondary { background: #f5f5f5; color: #171717; border: 1px solid #e5e5e5; }
.btn-secondary:hover { background: #e5e5e5; }
.btn-sm { padding: 0.375rem 0.625rem; }
</style>
