<!--
  NotificationInbox.vue
  Main view for notification history with filtering, pagination, and bulk actions
  
  Feature: notification-inbox
  Requirements: 1.1, 1.4, 2.3, 4.2, 4.3, 5.1, 5.2, 5.4
-->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationInboxStore } from '@/stores/notificationInbox'
import { getNotificationUrl, hasNavigableReference } from '@/lib/notificationNavigation'
import NotificationItem from '@/components/NotificationItem.vue'
import Modal from '@/components/Modal.vue'

const router = useRouter()
const auth = useAuthStore()
const notificationInbox = useNotificationInboxStore()

const currentPage = ref(1)
const selectedIds = ref(new Set())
const isSelectMode = ref(false)
const showClearConfirm = ref(false)
const showDeleteConfirm = ref(false)
const showDetailModal = ref(false)
const showUnavailableModal = ref(false)
const selectedNotification = ref(null)

const filterTabs = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'announcement_urgent', label: 'เร่งด่วน' },
  { value: 'announcement_normal', label: 'ประกาศ' },
  { value: 'schedule_updates', label: 'ตาราง' },
  { value: 'event_reminders', label: 'กิจกรรม' },
  { value: 'tournament_updates', label: 'การแข่งขัน' },
  { value: 'club_application', label: 'ใบสมัคร' }
]

const activeFilter = computed(() => notificationInbox.currentFilter || 'all')
const notifications = computed(() => notificationInbox.filteredNotifications)
const loading = computed(() => notificationInbox.loading)
const hasMore = computed(() => notificationInbox.hasMore)
const hasNotifications = computed(() => notifications.value.length > 0)
const hasUnread = computed(() => notificationInbox.unreadCount > 0)
const selectedCount = computed(() => selectedIds.value.size)
const allSelected = computed(() => 
  notifications.value.length > 0 && selectedIds.value.size === notifications.value.length
)

onMounted(async () => {
  if (auth.user?.id) {
    await loadNotifications()
    notificationInbox.subscribeToRealtime(auth.user.id)
  }
})

onUnmounted(() => {
  notificationInbox.unsubscribeFromRealtime()
})

watch(() => auth.user?.id, async (userId) => {
  if (userId) {
    currentPage.value = 1
    await loadNotifications()
  }
})

async function loadNotifications(page = 1) {
  if (!auth.user?.id) return
  currentPage.value = page
  await notificationInbox.fetchNotifications(
    auth.user.id, page, activeFilter.value === 'all' ? null : activeFilter.value
  )
}

async function setFilter(filter) {
  currentPage.value = 1
  selectedIds.value = new Set()
  isSelectMode.value = false
  await notificationInbox.fetchNotifications(
    auth.user.id, 1, filter === 'all' ? null : filter
  )
}

async function loadMore() {
  if (loading.value || !hasMore.value || !auth.user?.id) return
  const nextPage = currentPage.value + 1
  await notificationInbox.fetchNotifications(
    auth.user.id, nextPage, activeFilter.value === 'all' ? null : activeFilter.value
  )
  currentPage.value = nextPage
}

function handleScroll(e) {
  const { scrollTop, scrollHeight, clientHeight } = e.target
  if (scrollHeight - scrollTop - clientHeight < 100) loadMore()
}

function toggleSelect(id) {
  const newSet = new Set(selectedIds.value)
  if (newSet.has(id)) newSet.delete(id)
  else newSet.add(id)
  selectedIds.value = newSet
}

function toggleSelectAll() {
  if (allSelected.value) selectedIds.value = new Set()
  else selectedIds.value = new Set(notifications.value.map(n => n.id))
}

/**
 * Handle notification click - navigate to related content or show modal
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * @param {Object} notification - The clicked notification
 */
async function handleNotificationClick(notification) {
  // In select mode, toggle selection instead of navigating
  if (isSelectMode.value) { 
    toggleSelect(notification.id)
    return 
  }
  
  // Mark as read automatically (Requirement 6.3)
  if (!notification.read_at) {
    await notificationInbox.markAsRead(notification.id)
  }
  
  // Check if notification has a navigable reference (Requirement 6.1)
  if (hasNavigableReference(notification)) {
    // Handle club_application specially based on user role
    let url
    if (notification.reference_type === 'club_application') {
      url = auth.isAdmin || auth.isCoach ? '/club-applications' : '/my-applications'
    } else {
      url = getNotificationUrl(notification.reference_type, notification.reference_id)
    }
    
    if (url) {
      router.push(url)
      return
    }
  }
  
  // No reference - show notification details in modal (Requirement 6.2)
  selectedNotification.value = notification
  showDetailModal.value = true
}

async function handleMarkRead(id) { await notificationInbox.markAsRead(id) }
async function handleMarkUnread(id) { await notificationInbox.markAsUnread(id) }
async function handleDelete(id) { await notificationInbox.deleteNotification(id) }

async function handleMarkAllAsRead() {
  if (auth.user?.id) await notificationInbox.markAllAsRead(auth.user.id)
}

async function handleClearAll() {
  if (auth.user?.id) {
    await notificationInbox.clearAll(auth.user.id)
    showClearConfirm.value = false
  }
}

async function handleDeleteSelected() {
  await notificationInbox.deleteMultiple(Array.from(selectedIds.value))
  selectedIds.value = new Set()
  isSelectMode.value = false
  showDeleteConfirm.value = false
}

/**
 * Handle deleting a notification when content is unavailable
 * Requirement 6.4
 */
async function handleDeleteUnavailable() {
  if (selectedNotification.value) {
    await notificationInbox.deleteNotification(selectedNotification.value.id)
    showUnavailableModal.value = false
    selectedNotification.value = null
  }
}

function toggleSelectMode() {
  isSelectMode.value = !isSelectMode.value
  selectedIds.value = new Set()
}

function getTypeLabel(type) {
  const labels = {
    'announcement_urgent': 'ประกาศเร่งด่วน',
    'announcement_normal': 'ประกาศ',
    'schedule_updates': 'ตารางนัดหมาย',
    'event_reminders': 'เตือนกิจกรรม',
    'tournament_updates': 'การแข่งขัน',
    'club_application': 'ใบสมัคร'
  }
  return labels[type] || 'การแจ้งเตือน'
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>กล่องแจ้งเตือน</h1>
      <div class="header-actions">
        <button v-if="hasUnread && !isSelectMode" class="btn btn-secondary" @click="handleMarkAllAsRead">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
          </svg>
          <span>อ่านทั้งหมด</span>
        </button>
        <button v-if="hasNotifications" :class="['btn', isSelectMode ? 'btn-primary' : 'btn-secondary']" @click="toggleSelectMode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path v-if="isSelectMode" d="M9 12l2 2 4-4"/>
          </svg>
          <span>{{ isSelectMode ? 'ยกเลิก' : 'เลือก' }}</span>
        </button>
        <button v-if="hasNotifications && !isSelectMode" class="btn btn-icon" title="ลบทั้งหมด" @click="showClearConfirm = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="filter-tabs">
      <button v-for="tab in filterTabs" :key="tab.value" :class="['filter-tab', { active: activeFilter === tab.value }]" @click="setFilter(tab.value)">
        {{ tab.label }}
      </button>
    </div>

    <div v-if="isSelectMode && hasNotifications" class="select-actions">
      <button class="select-all-btn" @click="toggleSelectAll">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path v-if="allSelected" d="M9 12l2 2 4-4"/>
        </svg>
        {{ allSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด' }}
      </button>
      <span class="selected-count">เลือก {{ selectedCount }} รายการ</span>
      <button v-if="selectedCount > 0" class="btn btn-danger btn-sm" @click="showDeleteConfirm = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        ลบที่เลือก
      </button>
    </div>

    <div v-if="loading && notifications.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <div v-else-if="!hasNotifications" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
      </div>
      <p class="empty-title">ไม่มีการแจ้งเตือน</p>
      <p class="empty-desc">{{ activeFilter === 'all' ? 'เมื่อมีการแจ้งเตือนใหม่จะแสดงที่นี่' : 'ไม่มีรายการที่ตรงกับตัวกรอง' }}</p>
    </div>

    <div v-else class="notification-list" @scroll="handleScroll">
      <div v-for="notification in notifications" :key="notification.id" class="notification-wrapper">
        <label v-if="isSelectMode" class="select-checkbox">
          <input type="checkbox" :checked="selectedIds.has(notification.id)" @change="toggleSelect(notification.id)"/>
          <span class="checkmark"></span>
        </label>
        <NotificationItem :notification="notification" :class="{ 'selectable': isSelectMode }" @click="handleNotificationClick(notification)" @markRead="handleMarkRead" @markUnread="handleMarkUnread" @delete="handleDelete"/>
      </div>
      <div v-if="loading && notifications.length > 0" class="load-more"><div class="spinner spinner-sm"></div></div>
      <div v-if="!hasMore && notifications.length > 0" class="end-of-list"><span>แสดงทั้งหมด {{ notifications.length }} รายการ</span></div>
    </div>

    <Modal v-if="showClearConfirm" @close="showClearConfirm = false">
      <div class="confirm-modal">
        <div class="modal-icon modal-icon--danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </div>
        <h3>ลบการแจ้งเตือนทั้งหมด?</h3>
        <p>การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showClearConfirm = false">ยกเลิก</button>
          <button class="btn btn-danger" @click="handleClearAll">ลบทั้งหมด</button>
        </div>
      </div>
    </Modal>

    <Modal v-if="showDeleteConfirm" @close="showDeleteConfirm = false">
      <div class="confirm-modal">
        <div class="modal-icon modal-icon--danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </div>
        <h3>ลบ {{ selectedCount }} รายการที่เลือก?</h3>
        <p>การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showDeleteConfirm = false">ยกเลิก</button>
          <button class="btn btn-danger" @click="handleDeleteSelected">ลบที่เลือก</button>
        </div>
      </div>
    </Modal>

    <Modal v-if="showDetailModal && selectedNotification" @close="showDetailModal = false">
      <div class="detail-modal">
        <div class="detail-header">
          <span class="detail-type">{{ getTypeLabel(selectedNotification.type) }}</span>
          <span class="detail-time">{{ formatDateTime(selectedNotification.created_at) }}</span>
        </div>
        <h3>{{ selectedNotification.title }}</h3>
        <p>{{ selectedNotification.message }}</p>
        <div class="modal-actions"><button class="btn btn-primary" @click="showDetailModal = false">ปิด</button></div>
      </div>
    </Modal>

    <!-- Content Unavailable Modal (Requirement 6.4) -->
    <Modal v-if="showUnavailableModal" @close="showUnavailableModal = false">
      <div class="confirm-modal">
        <div class="modal-icon modal-icon--warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3>เนื้อหาไม่พร้อมใช้งาน</h3>
        <p>เนื้อหาที่เกี่ยวข้องกับการแจ้งเตือนนี้ถูกลบหรือไม่สามารถเข้าถึงได้แล้ว</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showUnavailableModal = false">ปิด</button>
          <button v-if="selectedNotification" class="btn btn-danger" @click="handleDeleteUnavailable">ลบการแจ้งเตือน</button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.page { padding: 1rem; padding-bottom: 80px; height: 100vh; display: flex; flex-direction: column; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-shrink: 0; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: #171717; margin: 0; }
.header-actions { display: flex; gap: 0.5rem; }

.btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.875rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; border: none; cursor: pointer; transition: all 0.15s; }
.btn svg { width: 16px; height: 16px; }
.btn-primary { background: #171717; color: #fff; }
.btn-primary:hover { background: #000; }
.btn-secondary { background: #f5f5f5; color: #171717; border: 1px solid #e5e5e5; }
.btn-secondary:hover { background: #e5e5e5; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover { background: #dc2626; }
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8125rem; }
.btn-icon { background: #f5f5f5; color: #737373; padding: 0.5rem; border: 1px solid #e5e5e5; }
.btn-icon:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }

.filter-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; overflow-x: auto; padding-bottom: 0.25rem; flex-shrink: 0; }
.filter-tab { padding: 0.5rem 0.875rem; border-radius: 100px; font-size: 0.8125rem; font-weight: 500; background: #fff; color: #525252; border: 1px solid #e5e5e5; white-space: nowrap; cursor: pointer; transition: all 0.15s; }
.filter-tab:hover { background: #fafafa; border-color: #d4d4d4; }
.filter-tab.active { background: #171717; color: #fff; border-color: #171717; }

.select-actions { display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: #fafafa; border-radius: 8px; margin-bottom: 1rem; flex-shrink: 0; }
.select-all-btn { display: flex; align-items: center; gap: 0.5rem; background: none; border: none; font-size: 0.875rem; color: #404040; cursor: pointer; }
.select-all-btn svg { width: 18px; height: 18px; }
.selected-count { font-size: 0.875rem; color: #737373; flex: 1; }

.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; flex: 1; }
.loading-state p { margin-top: 1rem; color: #737373; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #171717; border-radius: 50%; animation: spin 0.8s linear infinite; }
.spinner-sm { width: 20px; height: 20px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 3rem 1rem; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.empty-icon { width: 72px; height: 72px; margin-bottom: 1rem; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.empty-icon svg { width: 36px; height: 36px; color: #a3a3a3; }
.empty-title { font-size: 1rem; font-weight: 600; color: #171717; margin-bottom: 0.25rem; }
.empty-desc { font-size: 0.875rem; color: #737373; }

.notification-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
.notification-wrapper { display: flex; align-items: flex-start; gap: 0.75rem; }
.select-checkbox { display: flex; align-items: center; justify-content: center; padding-top: 1.25rem; cursor: pointer; }
.select-checkbox input { display: none; }
.checkmark { width: 20px; height: 20px; border: 2px solid #d4d4d4; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.select-checkbox input:checked + .checkmark { background: #171717; border-color: #171717; }
.select-checkbox input:checked + .checkmark::after { content: ''; width: 6px; height: 10px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); margin-bottom: 2px; }
.notification-wrapper :deep(.notification-item) { flex: 1; }
.notification-wrapper :deep(.notification-item.selectable) { cursor: pointer; }

.load-more { display: flex; justify-content: center; padding: 1rem; }
.end-of-list { text-align: center; padding: 1rem; font-size: 0.8125rem; color: #a3a3a3; }

.confirm-modal { text-align: center; padding: 0.5rem; }
.modal-icon { width: 56px; height: 56px; margin: 0 auto 1rem; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.modal-icon svg { width: 28px; height: 28px; color: #404040; }
.modal-icon--danger { background: #fef2f2; }
.modal-icon--danger svg { color: #ef4444; }
.modal-icon--warning { background: #fffbeb; }
.modal-icon--warning svg { color: #f59e0b; }
.confirm-modal h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: #171717; }
.confirm-modal p { font-size: 0.875rem; color: #737373; margin-bottom: 1.25rem; }
.modal-actions { display: flex; gap: 0.75rem; }
.modal-actions .btn { flex: 1; justify-content: center; }

.detail-modal { padding: 0.5rem; }
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.detail-type { font-size: 0.75rem; font-weight: 600; color: #737373; text-transform: uppercase; }
.detail-time { font-size: 0.75rem; color: #a3a3a3; }
.detail-modal h3 { font-size: 1.125rem; font-weight: 600; color: #171717; margin-bottom: 0.5rem; }
.detail-modal p { font-size: 0.9375rem; color: #525252; line-height: 1.5; margin-bottom: 1.5rem; }

@media (max-width: 480px) {
  .page-header h1 { font-size: 1.25rem; }
  .header-actions .btn:not(.btn-icon) span { display: none; }
  .filter-tabs { margin-left: -1rem; margin-right: -1rem; padding-left: 1rem; padding-right: 1rem; }
  .select-actions { flex-wrap: wrap; }
  .selected-count { order: -1; width: 100%; margin-bottom: 0.5rem; }
}
</style>
