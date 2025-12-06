<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'

const auth = useAuthStore()
const data = useDataStore()

const urgentAnnouncements = ref([])
const currentIndex = ref(0)
const showPopup = ref(false)
const currentAnnouncement = ref(null)

// เก็บ ID ของประกาศที่แสดงแล้วใน session นี้ (ป้องกันแสดงซ้ำจาก realtime)
const shownAnnouncementIds = ref(new Set())

// เก็บ ID ของประกาศที่กำลังแสดงอยู่ใน queue
const queuedAnnouncementIds = ref(new Set())

/**
 * โหลดประกาศเร่งด่วนที่ยังไม่ได้อ่าน
 */
async function loadUrgentAnnouncements() {
  if (!auth.user?.id || !auth.profile) return
  
  const unread = await data.getUnreadUrgentAnnouncements(
    auth.user.id,
    auth.profile.role,
    auth.profile.club_id
  )
  
  // กรองเฉพาะประกาศที่ยังไม่ได้แสดงใน session นี้
  const newUnread = unread.filter(a => !shownAnnouncementIds.value.has(a.id))
  
  if (newUnread.length === 0) return
  
  // เพิ่ม ID เข้า tracking sets
  newUnread.forEach(a => {
    shownAnnouncementIds.value.add(a.id)
    queuedAnnouncementIds.value.add(a.id)
  })
  
  urgentAnnouncements.value = newUnread
  currentAnnouncement.value = newUnread[0]
  currentIndex.value = 0
  showPopup.value = true
}

/**
 * ตรวจสอบว่าประกาศนี้เกี่ยวข้องกับ user หรือไม่
 * @param {Object} announcement - ประกาศที่ต้องการตรวจสอบ
 * @returns {boolean} - true ถ้าเกี่ยวข้อง
 */
function isAnnouncementRelevant(announcement) {
  const userRole = auth.profile?.role
  const userClubId = auth.profile?.club_id
  const targetType = announcement.target_type
  
  // ตรวจสอบ target_type
  if (targetType === 'coaches' && userRole !== 'coach') return false
  if (targetType === 'athletes' && userRole !== 'athlete') return false
  
  // ตรวจสอบ club_id (ถ้ามี)
  if (targetType === 'club' && announcement.club_id) {
    return announcement.club_id === userClubId
  }
  
  // target_type === 'all' หรือไม่มี club_id
  return true
}

/**
 * ตรวจสอบและแสดง popup สำหรับประกาศเร่งด่วนใหม่จาก realtime
 * @param {Object} announcement - ประกาศใหม่ที่เข้ามา
 */
function showNewUrgentAnnouncement(announcement) {
  if (!announcement || announcement.priority !== 'urgent') return
  
  // ตรวจสอบว่าแสดงไปแล้วหรืออยู่ใน queue
  if (shownAnnouncementIds.value.has(announcement.id)) return
  if (queuedAnnouncementIds.value.has(announcement.id)) return
  
  // ตรวจสอบว่าประกาศนี้เกี่ยวข้องกับ user หรือไม่
  if (!isAnnouncementRelevant(announcement)) return
  
  // เพิ่มเข้า tracking sets
  shownAnnouncementIds.value.add(announcement.id)
  queuedAnnouncementIds.value.add(announcement.id)
  
  // ถ้ากำลังแสดง popup อยู่ ให้เพิ่มเข้า queue
  if (showPopup.value) {
    // ตรวจสอบว่าไม่มีใน queue อยู่แล้ว
    const exists = urgentAnnouncements.value.some(a => a.id === announcement.id)
    if (!exists) {
      urgentAnnouncements.value.push(announcement)
    }
  } else {
    // แสดง popup ทันที
    urgentAnnouncements.value = [announcement]
    currentAnnouncement.value = announcement
    currentIndex.value = 0
    showPopup.value = true
  }
}

/**
 * กดรับทราบ - บันทึกว่าอ่านแล้วและไปยังประกาศถัดไป
 */
async function markAsReadAndNext() {
  if (!currentAnnouncement.value || !auth.user?.id) return
  
  const currentId = currentAnnouncement.value.id
  
  // บันทึกว่าอ่านแล้ว
  await data.markAnnouncementAsRead(currentId, auth.user.id)
  
  // ลบออกจาก queue
  queuedAnnouncementIds.value.delete(currentId)
  
  // ไปยังประกาศถัดไปหรือปิด
  if (currentIndex.value < urgentAnnouncements.value.length - 1) {
    currentIndex.value++
    currentAnnouncement.value = urgentAnnouncements.value[currentIndex.value]
  } else {
    // ปิด popup และ reset state
    showPopup.value = false
    urgentAnnouncements.value = []
    currentIndex.value = 0
    currentAnnouncement.value = null
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  // โหลดหลังจาก auth initialize
  setTimeout(loadUrgentAnnouncements, 1000)
})

// Watch สำหรับ auth changes
watch([() => auth.user?.id, () => auth.profile?.role], ([newId, newRole]) => {
  if (newId && newRole) {
    loadUrgentAnnouncements()
  }
})

// Watch สำหรับประกาศใหม่จาก realtime
watch(
  () => data.announcements,
  (newAnnouncements, oldAnnouncements) => {
    if (!auth.user?.id || !auth.profile) return
    if (!oldAnnouncements || oldAnnouncements.length === 0) return
    
    // หาประกาศใหม่ที่เพิ่มเข้ามา (ไม่มีใน oldAnnouncements)
    const oldIds = new Set(oldAnnouncements.map(a => a.id))
    const newItems = (newAnnouncements || []).filter(a => !oldIds.has(a.id))
    
    // ตรวจสอบประกาศเร่งด่วนใหม่
    newItems.forEach(announcement => {
      if (announcement.priority === 'urgent') {
        showNewUrgentAnnouncement(announcement)
      }
    })
  },
  { deep: true }
)
</script>

<template>
  <Teleport to="body">
    <div v-if="showPopup && currentAnnouncement" class="urgent-overlay">
      <div class="urgent-popup">
        <div class="urgent-header">
          <div class="urgent-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <span class="urgent-label">ประกาศเร่งด่วน</span>
          <span v-if="urgentAnnouncements.length > 1" class="urgent-count">
            {{ currentIndex + 1 }}/{{ urgentAnnouncements.length }}
          </span>
        </div>
        
        <h2 class="urgent-title">{{ currentAnnouncement.title }}</h2>
        
        <div class="urgent-meta">
          <span>โดย {{ currentAnnouncement.author?.name || 'ไม่ระบุ' }}</span>
          <span class="dot">·</span>
          <span>{{ formatDate(currentAnnouncement.created_at) }}</span>
        </div>
        
        <div class="urgent-content">{{ currentAnnouncement.content }}</div>
        
        <button class="btn btn-primary urgent-btn" @click="markAsReadAndNext">
          {{ currentIndex < urgentAnnouncements.length - 1 ? 'รับทราบ (ถัดไป)' : 'รับทราบ' }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.urgent-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.7);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.urgent-popup {
  width: 100%;
  max-width: 400px;
  background: var(--white);
  border-radius: var(--radius-xl);
  padding: 24px;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.urgent-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.urgent-icon {
  width: 36px;
  height: 36px;
  background: var(--accent-danger);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.urgent-icon svg {
  width: 20px;
  height: 20px;
  color: var(--white);
}

.urgent-label {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-danger);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.urgent-count {
  font-size: 12px;
  color: var(--gray-500);
}

.urgent-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 8px;
}

.urgent-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--gray-500);
  margin-bottom: 16px;
}
.dot {
  color: var(--gray-300);
}

.urgent-content {
  font-size: 15px;
  line-height: 1.7;
  color: var(--gray-700);
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
}

.urgent-btn {
  width: 100%;
}
</style>
