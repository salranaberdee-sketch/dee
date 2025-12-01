<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const data = useDataStore()
const auth = useAuthStore()

const filterType = ref('all')
const showClearConfirm = ref(false)

const filterOptions = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'unread', label: 'ยังไม่อ่าน' },
  { value: 'event_registration', label: 'ลงทะเบียน' },
  { value: 'event_checkin', label: 'เช็คอิน' },
  { value: 'club_application', label: 'ใบสมัคร' }
]

// จัดกลุ่มตามวันที่
const groupedNotifications = computed(() => {
  let list = data.notifications
  if (filterType.value === 'unread') {
    list = list.filter(n => !n.is_read)
  } else if (filterType.value !== 'all') {
    list = list.filter(n => n.type === filterType.value)
  }

  const groups = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  list.forEach(n => {
    const date = new Date(n.created_at)
    date.setHours(0, 0, 0, 0)
    
    let groupKey
    if (date.getTime() === today.getTime()) {
      groupKey = 'วันนี้'
    } else if (date.getTime() === yesterday.getTime()) {
      groupKey = 'เมื่อวาน'
    } else if (date > weekAgo) {
      groupKey = 'สัปดาห์นี้'
    } else {
      groupKey = 'ก่อนหน้านี้'
    }

    if (!groups[groupKey]) groups[groupKey] = []
    groups[groupKey].push(n)
  })

  return groups
})

const hasNotifications = computed(() => Object.keys(groupedNotifications.value).length > 0)

onMounted(async () => {
  if (auth.user?.id) {
    await data.fetchNotifications(auth.user.id)
    data.subscribeToNotifications(auth.user.id)
  }
})

onUnmounted(() => {
  data.unsubscribeFromNotifications()
})

function markRead(notification) {
  if (!notification.is_read) {
    data.markNotificationRead(notification.id)
  }
}

function markAllRead() {
  if (auth.user?.id) {
    data.markAllNotificationsRead(auth.user.id)
  }
}

async function deleteNotif(e, id) {
  e.stopPropagation()
  await data.deleteNotification(id)
}

async function clearAll() {
  if (auth.user?.id) {
    await data.clearAllNotifications(auth.user.id)
    showClearConfirm.value = false
  }
}

function goToReference(notification) {
  markRead(notification)
  if (notification.reference_type === 'event' && notification.reference_id) {
    router.push('/events')
  } else if (notification.reference_type === 'club_application' && notification.reference_id) {
    router.push(auth.isAdmin || auth.isCoach ? '/club-applications' : '/my-applications')
  }
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (diffMins < 1) return 'เมื่อสักครู่'
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

// ข้อมูล notification types
const notifTypes = {
  event_registration: { label: 'ลงทะเบียนกิจกรรม', color: 'blue' },
  event_checkin: { label: 'เช็คอินกิจกรรม', color: 'green' },
  club_application: { label: 'ใบสมัครชมรม', color: 'purple' },
  info: { label: 'ข้อมูลทั่วไป', color: 'gray' },
  success: { label: 'ดำเนินการสำเร็จ', color: 'green' },
  warning: { label: 'แจ้งเตือนสำคัญ', color: 'amber' }
}

function getTypeInfo(type) {
  return notifTypes[type] || notifTypes.info
}
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <h1>การแจ้งเตือน</h1>
      <div class="header-actions">
        <button v-if="data.unreadNotificationsCount > 0" class="btn btn-secondary" @click="markAllRead">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
          </svg>
          อ่านทั้งหมด
        </button>
        <button v-if="data.notifications.length > 0" class="btn btn-icon" @click="showClearConfirm = true" title="ลบทั้งหมด">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-bar">
      <button 
        v-for="opt in filterOptions" 
        :key="opt.value"
        :class="['filter-btn', { active: filterType === opt.value }]"
        @click="filterType = opt.value"
      >
        {{ opt.label }}
        <span v-if="opt.value === 'unread' && data.unreadNotificationsCount > 0" class="badge">
          {{ data.unreadNotificationsCount }}
        </span>
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="!hasNotifications" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
      </div>
      <p class="empty-title">ไม่มีการแจ้งเตือน</p>
      <p class="empty-desc">{{ filterType === 'all' ? 'เมื่อมีการแจ้งเตือนใหม่จะแสดงที่นี่' : 'ไม่มีรายการที่ตรงกับตัวกรอง' }}</p>
    </div>

    <!-- Grouped Notification List -->
    <div v-else class="notif-groups">
      <div v-for="(items, groupName) in groupedNotifications" :key="groupName" class="notif-group">
        <div class="group-header">
          <span class="group-title">{{ groupName }}</span>
          <span class="group-count">{{ items.length }} รายการ</span>
        </div>
        
        <div class="notif-list">
          <div 
            v-for="n in items" 
            :key="n.id" 
            :class="['notif-item', { unread: !n.is_read }]"
            @click="goToReference(n)"
          >
            <div class="notif-indicator" v-if="!n.is_read"></div>
            
            <!-- Icon -->
            <div :class="['notif-icon', `icon-${getTypeInfo(n.type).color}`]">
              <svg v-if="n.type === 'event_registration'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>
              </svg>
              <svg v-else-if="n.type === 'event_checkin'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
              <svg v-else-if="n.type === 'club_application'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
                <path d="M20 8v6M23 11h-6"/>
              </svg>
              <svg v-else-if="n.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
              <svg v-else-if="n.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <path d="M12 9v4M12 17h.01"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>

            <!-- Content -->
            <div class="notif-content">
              <div class="notif-top">
                <span :class="['type-badge', `badge-${getTypeInfo(n.type).color}`]">
                  {{ getTypeInfo(n.type).label }}
                </span>
                <span class="notif-time">{{ formatTime(n.created_at) }}</span>
              </div>
              <div class="notif-title">{{ n.title }}</div>
              <div class="notif-message">{{ n.message }}</div>
            </div>

            <!-- Delete Button -->
            <button class="notif-delete" @click="deleteNotif($event, n.id)" title="ลบ">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Clear Confirm Modal -->
    <div v-if="showClearConfirm" class="modal-overlay" @click="showClearConfirm = false">
      <div class="modal-content" @click.stop>
        <div class="modal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </div>
        <h3>ลบการแจ้งเตือนทั้งหมด?</h3>
        <p>การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showClearConfirm = false">ยกเลิก</button>
          <button class="btn btn-danger" @click="clearAll">ลบทั้งหมด</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 1rem; padding-bottom: 80px; }

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: #171717; margin: 0; }
.header-actions { display: flex; gap: 0.5rem; }

/* Buttons */
.btn { 
  display: inline-flex; align-items: center; gap: 0.375rem; 
  padding: 0.5rem 0.875rem; border-radius: 8px; 
  font-size: 0.875rem; font-weight: 500; 
  border: none; cursor: pointer; transition: all 0.15s; 
}
.btn svg { width: 16px; height: 16px; }
.btn-secondary { background: #f5f5f5; color: #171717; border: 1px solid #e5e5e5; }
.btn-secondary:hover { background: #e5e5e5; }
.btn-icon { background: #f5f5f5; color: #737373; padding: 0.5rem; border: 1px solid #e5e5e5; }
.btn-icon:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
.btn-danger { background: #171717; color: #fff; }
.btn-danger:hover { background: #000; }

/* Filter Bar */
.filter-bar { 
  display: flex; gap: 0.5rem; margin-bottom: 1.25rem; 
  overflow-x: auto; padding-bottom: 0.25rem; 
}
.filter-btn { 
  display: inline-flex; align-items: center; gap: 0.375rem;
  padding: 0.5rem 0.875rem; border-radius: 100px; 
  font-size: 0.8125rem; font-weight: 500;
  background: #fff; color: #525252; 
  border: 1px solid #e5e5e5;
  white-space: nowrap; cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover { background: #f5f5f5; border-color: #d4d4d4; }
.filter-btn.active { background: #171717; color: #fff; border-color: #171717; }
.badge { 
  background: #ef4444; color: #fff; 
  font-size: 0.6875rem; font-weight: 700;
  padding: 0.125rem 0.375rem; border-radius: 100px; 
  min-width: 18px; text-align: center;
}
.filter-btn.active .badge { background: #fff; color: #171717; }

/* Empty State */
.empty-state { text-align: center; padding: 3rem 1rem; }
.empty-icon { 
  width: 72px; height: 72px; margin: 0 auto 1rem; 
  background: #f5f5f5; border-radius: 50%; 
  display: flex; align-items: center; justify-content: center; 
}
.empty-icon svg { width: 36px; height: 36px; color: #a3a3a3; }
.empty-title { font-size: 1rem; font-weight: 600; color: #171717; margin-bottom: 0.25rem; }
.empty-desc { font-size: 0.875rem; color: #737373; }

/* Notification Groups */
.notif-groups { display: flex; flex-direction: column; gap: 1.5rem; }
.notif-group { }
.group-header { 
  display: flex; justify-content: space-between; align-items: center; 
  margin-bottom: 0.75rem; padding: 0 0.25rem;
}
.group-title { font-size: 0.8125rem; font-weight: 600; color: #171717; }
.group-count { font-size: 0.75rem; color: #a3a3a3; }

/* Notification List */
.notif-list { display: flex; flex-direction: column; gap: 0.5rem; }
.notif-item { 
  display: flex; gap: 0.75rem; padding: 0.875rem;
  background: #fff; border: 1px solid #e5e5e5; border-radius: 12px;
  position: relative; cursor: pointer; transition: all 0.15s;
}
.notif-item:hover { background: #fafafa; border-color: #d4d4d4; }
.notif-item.unread { background: #fafafa; border-color: #171717; border-width: 1.5px; }

.notif-indicator { 
  position: absolute; left: -4px; top: 50%; transform: translateY(-50%);
  width: 8px; height: 8px; background: #171717; border-radius: 50%;
}

/* Icon */
.notif-icon { 
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; 
}
.notif-icon svg { width: 20px; height: 20px; }
.icon-blue { background: #171717; }
.icon-blue svg { color: #fff; }
.icon-green { background: #171717; }
.icon-green svg { color: #fff; }
.icon-purple { background: #171717; }
.icon-purple svg { color: #fff; }
.icon-amber { background: #171717; }
.icon-amber svg { color: #fff; }
.icon-gray { background: #171717; }
.icon-gray svg { color: #fff; }

/* Content */
.notif-content { flex: 1; min-width: 0; }
.notif-top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
.type-badge { 
  font-size: 0.6875rem; font-weight: 500; 
  padding: 0.125rem 0.5rem; border-radius: 4px;
}
.badge-blue { background: #f5f5f5; color: #171717; }
.badge-green { background: #f5f5f5; color: #171717; }
.badge-purple { background: #f5f5f5; color: #171717; }
.badge-amber { background: #f5f5f5; color: #171717; }
.badge-gray { background: #f5f5f5; color: #171717; }

.notif-time { font-size: 0.6875rem; color: #a3a3a3; margin-left: auto; }
.notif-title { font-weight: 600; font-size: 0.875rem; color: #171717; margin-bottom: 0.125rem; }
.notif-message { font-size: 0.8125rem; color: #525252; line-height: 1.4; }

/* Delete Button */
.notif-delete { 
  background: transparent; border: none; padding: 0.25rem; cursor: pointer;
  color: #d4d4d4; border-radius: 6px; transition: all 0.15s;
  align-self: flex-start; flex-shrink: 0;
}
.notif-delete:hover { background: #fef2f2; color: #ef4444; }
.notif-delete svg { width: 16px; height: 16px; }

/* Modal */
.modal-overlay { 
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); 
  display: flex; align-items: center; justify-content: center; 
  z-index: 100; padding: 1rem;
}
.modal-content { 
  background: #fff; border-radius: 16px; padding: 1.5rem; 
  max-width: 320px; width: 100%; text-align: center;
}
.modal-icon { 
  width: 56px; height: 56px; margin: 0 auto 1rem; 
  background: #f5f5f5; border-radius: 50%; 
  display: flex; align-items: center; justify-content: center;
}
.modal-icon svg { width: 28px; height: 28px; color: #171717; }
.modal-content h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: #171717; }
.modal-content p { font-size: 0.875rem; color: #737373; margin-bottom: 1.25rem; }
.modal-actions { display: flex; gap: 0.75rem; }
.modal-actions .btn { flex: 1; justify-content: center; }
</style>
