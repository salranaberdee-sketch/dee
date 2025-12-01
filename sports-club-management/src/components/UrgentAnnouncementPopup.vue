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

async function loadUrgentAnnouncements() {
  if (!auth.user?.id || !auth.profile) return
  
  const unread = await data.getUnreadUrgentAnnouncements(
    auth.user.id,
    auth.profile.role,
    auth.profile.club_id
  )
  urgentAnnouncements.value = unread
  
  if (unread.length > 0) {
    currentAnnouncement.value = unread[0]
    currentIndex.value = 0
    showPopup.value = true
  }
}

async function markAsReadAndNext() {
  if (!currentAnnouncement.value || !auth.user?.id) return
  
  await data.markAnnouncementAsRead(currentAnnouncement.value.id, auth.user.id)
  
  // Move to next or close
  if (currentIndex.value < urgentAnnouncements.value.length - 1) {
    currentIndex.value++
    currentAnnouncement.value = urgentAnnouncements.value[currentIndex.value]
  } else {
    showPopup.value = false
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
  // Load after a short delay to let auth initialize
  setTimeout(loadUrgentAnnouncements, 1000)
})

// Watch for auth changes (need both user and profile)
watch([() => auth.user?.id, () => auth.profile?.role], ([newId, newRole]) => {
  if (newId && newRole) {
    loadUrgentAnnouncements()
  }
})
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
