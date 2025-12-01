<script setup>
import { onMounted } from 'vue'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'

const data = useDataStore()
const auth = useAuthStore()

onMounted(async () => {
  if (auth.user?.id) {
    await data.fetchNotifications(auth.user.id)
  }
})

function markRead(id) {
  data.markNotificationRead(id)
}

function markAllRead() {
  if (auth.user?.id) {
    data.markAllNotificationsRead(auth.user.id)
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'วันนี้'
  if (diff === 1) return 'เมื่อวาน'
  if (diff < 7) return `${diff} วันที่แล้ว`
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function getNotificationIcon(type) {
  const icons = {
    event_registration: 'clipboard',
    event_checkin: 'check-circle',
    info: 'bell',
    success: 'check',
    warning: 'alert'
  }
  return icons[type] || 'bell'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>แจ้งเตือน</h1>
      <button v-if="data.unreadNotificationsCount > 0" class="btn btn-secondary" @click="markAllRead">
        อ่านทั้งหมด
      </button>
    </div>

    <div v-if="data.notifications.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
      </div>
      <p>ไม่มีการแจ้งเตือน</p>
    </div>

    <div v-else class="notif-list">
      <div 
        v-for="n in data.notifications" 
        :key="n.id" 
        :class="['notif-item', { unread: !n.is_read }]"
        @click="markRead(n.id)"
      >
        <div class="notif-indicator" v-if="!n.is_read"></div>
        <div :class="['notif-icon', `notif-icon-${n.type}`]">
          <svg v-if="n.type === 'event_registration'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1"/>
            <path d="M9 14l2 2 4-4"/>
          </svg>
          <svg v-else-if="n.type === 'event_checkin'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>
        <div class="notif-content">
          <div class="notif-title">{{ n.title }}</div>
          <div class="notif-message">{{ n.message }}</div>
          <div class="notif-time">{{ formatDate(n.created_at) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 1rem; padding-bottom: 80px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: #171717; }

.btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; border: none; cursor: pointer; }
.btn-secondary { background: #f5f5f5; color: #171717; border: 1px solid #e5e5e5; }

.empty-state { text-align: center; padding: 3rem 1rem; color: #737373; }
.empty-icon { width: 64px; height: 64px; margin: 0 auto 1rem; background: #f5f5f5; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.empty-icon svg { width: 32px; height: 32px; color: #a3a3a3; }

.notif-list { display: flex; flex-direction: column; gap: 0.5rem; }
.notif-item { 
  display: flex; gap: 0.875rem; padding: 1rem;
  background: #fff; border: 1px solid #e5e5e5; border-radius: 12px;
  position: relative; cursor: pointer; transition: background 0.15s;
}
.notif-item:hover { background: #fafafa; }
.notif-item.unread { background: #f0f9ff; border-color: #bae6fd; }

.notif-indicator { 
  position: absolute; left: 0.5rem; top: 50%; transform: translateY(-50%);
  width: 8px; height: 8px; background: #0ea5e9; border-radius: 50%;
}

.notif-icon { 
  width: 40px; height: 40px; background: #171717; border-radius: 10px; 
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; 
}
.notif-icon svg { width: 20px; height: 20px; color: #fff; }
.notif-icon-event_registration { background: #0ea5e9; }
.notif-icon-event_checkin { background: #22c55e; }

.notif-content { flex: 1; min-width: 0; }
.notif-title { font-weight: 600; font-size: 0.9375rem; margin-bottom: 0.125rem; color: #171717; }
.notif-message { font-size: 0.875rem; color: #525252; margin-bottom: 0.25rem; }
.notif-time { font-size: 0.75rem; color: #a3a3a3; }
</style>
