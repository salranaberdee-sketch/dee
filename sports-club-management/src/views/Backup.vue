<script setup>
import { ref } from 'vue'
import { useDataStore } from '@/stores/data'

const data = useDataStore()
const message = ref({ type: '', text: '' })
const fileInput = ref(null)

function exportData() {
  const jsonStr = data.exportData()
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sports-club-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  showMessage('success', 'ส่งออกข้อมูลสำเร็จ')
}

function triggerImport() {
  fileInput.value?.click()
}

function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = data.importData(e.target?.result)
    if (result.success) {
      showMessage('success', 'นำเข้าข้อมูลสำเร็จ')
    } else {
      showMessage('error', result.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

function clearData() {
  if (confirm('ยืนยันการล้างข้อมูลทั้งหมด?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้')) {
    localStorage.removeItem('sports_club_db')
    location.reload()
  }
}

function showMessage(type, text) {
  message.value = { type, text }
  setTimeout(() => message.value = { type: '', text: '' }, 3000)
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">สำรองข้อมูล</h1>
    </div>

    <div class="container">
      <div v-if="message.text" :class="['alert', `alert-${message.type}`]">
        <svg v-if="message.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ message.text }}
      </div>

      <!-- Summary Card -->
      <div class="summary-card">
        <h3>ข้อมูลในระบบ</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-value">{{ data.stats.totalClubs }}</span>
            <span class="summary-label">ชมรม</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ data.stats.totalMembers }}</span>
            <span class="summary-label">สมาชิก</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ data.stats.totalSchedules }}</span>
            <span class="summary-label">นัดหมาย</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ data.stats.totalLogs }}</span>
            <span class="summary-label">บันทึก</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="section-header">
        <span class="section-title">จัดการข้อมูล</span>
      </div>

      <div class="list-group">
        <button class="action-row" @click="exportData">
          <div class="action-icon export">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          </div>
          <div class="action-content">
            <span class="action-title">ส่งออกข้อมูล</span>
            <span class="action-desc">ดาวน์โหลดไฟล์ JSON สำรอง</span>
          </div>
          <svg class="action-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        
        <button class="action-row" @click="triggerImport">
          <div class="action-icon import">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </div>
          <div class="action-content">
            <span class="action-title">นำเข้าข้อมูล</span>
            <span class="action-desc">กู้คืนจากไฟล์สำรอง</span>
          </div>
          <svg class="action-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div class="section-header mt-3">
        <span class="section-title">โซนอันตราย</span>
      </div>

      <div class="list-group danger-zone">
        <button class="action-row danger" @click="clearData">
          <div class="action-icon danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </div>
          <div class="action-content">
            <span class="action-title">ล้างข้อมูลทั้งหมด</span>
            <span class="action-desc">ลบข้อมูลทั้งหมดในระบบ</span>
          </div>
          <svg class="action-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <input ref="fileInput" type="file" accept=".json" @change="handleImport" hidden />
    </div>
  </div>
</template>

<style scoped>
.summary-card { 
  background: var(--white); border-radius: var(--radius-lg);
  padding: 20px; border: 1px solid var(--gray-100); margin-bottom: 24px;
}
.summary-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.summary-item { text-align: center; padding: 12px 8px; background: var(--gray-50); border-radius: var(--radius-md); }
.summary-value { display: block; font-size: 24px; font-weight: 700; color: var(--gray-900); }
.summary-label { font-size: 10px; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.05em; }

.action-row { 
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px; border-bottom: 1px solid var(--gray-50);
  background: none; border-left: none; border-right: none; border-top: none;
  width: 100%; cursor: pointer; text-align: left; transition: background 0.15s;
}
.action-row:last-child { border-bottom: none; }
.action-row:active { background: var(--gray-50); }
.action-row.danger { color: var(--accent-danger); }
.action-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); }
.action-icon svg { width: 22px; height: 22px; }
.action-icon.export { background: var(--gray-100); }
.action-icon.export svg { color: var(--gray-700); }
.action-icon.import { background: var(--gray-100); }
.action-icon.import svg { color: var(--gray-700); }
.action-icon.danger { background: #FEE2E2; }
.action-icon.danger svg { color: var(--accent-danger); }
.action-content { flex: 1; }
.action-title { display: block; font-size: 15px; font-weight: 600; color: var(--gray-900); }
.action-row.danger .action-title { color: var(--accent-danger); }
.action-desc { display: block; font-size: 13px; color: var(--gray-500); margin-top: 2px; }
.action-chevron { color: var(--gray-300); flex-shrink: 0; }

.danger-zone { border-color: #FEE2E2; }
</style>
