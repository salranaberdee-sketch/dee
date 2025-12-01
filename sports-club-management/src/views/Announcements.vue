<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'

const auth = useAuthStore()
const data = useDataStore()

const showModal = ref(false)
const showDetailModal = ref(false)
const editingId = ref(null)
const selectedAnnouncement = ref(null)
const form = ref({
  title: '',
  content: '',
  club_id: null,
  target_type: 'all',
  is_pinned: false,
  priority: 'normal'
})

const priorityLabels = {
  normal: 'ปกติ',
  important: 'สำคัญ',
  urgent: 'เร่งด่วน'
}

const priorityColors = {
  normal: '',
  important: 'priority-important',
  urgent: 'priority-urgent'
}

onMounted(async () => {
  await Promise.all([data.fetchAnnouncements(), data.fetchClubs()])
})

const canCreate = computed(() => auth.isAdmin || auth.isCoach)

const sortedAnnouncements = computed(() => {
  return [...data.announcements].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1
    return new Date(b.created_at) - new Date(a.created_at)
  })
})

function openAdd() {
  editingId.value = null
  form.value = {
    title: '',
    content: '',
    club_id: auth.profile?.club_id || null,
    target_type: auth.isAdmin ? 'all' : 'club',
    is_pinned: false,
    priority: 'normal'
  }
  showModal.value = true
}

function openEdit(announcement) {
  editingId.value = announcement.id
  form.value = {
    title: announcement.title,
    content: announcement.content,
    club_id: announcement.club_id,
    target_type: announcement.target_type,
    is_pinned: announcement.is_pinned,
    priority: announcement.priority || 'normal'
  }
  showModal.value = true
}

function openDetail(announcement) {
  selectedAnnouncement.value = announcement
  showDetailModal.value = true
}

async function save() {
  const payload = {
    ...form.value,
    author_id: auth.user?.id
  }
  
  if (editingId.value) {
    await data.updateAnnouncement(editingId.value, payload)
  } else {
    await data.addAnnouncement(payload)
  }
  showModal.value = false
}

async function remove() {
  if (confirm('ยืนยันการลบประกาศนี้?')) {
    await data.deleteAnnouncement(editingId.value)
    showModal.value = false
  }
}

function canEditAnnouncement(announcement) {
  return auth.isAdmin || announcement.author_id === auth.user?.id
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

function getTargetLabel(type) {
  const labels = { all: 'ทุกคน', club: 'ชมรม', coaches: 'โค้ช', athletes: 'นักกีฬา' }
  return labels[type] || type
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">ประกาศ</h1>
      <button v-if="canCreate" class="btn btn-sm btn-primary" @click="openAdd">
        + สร้างประกาศ
      </button>
    </div>

    <div class="container">
      <!-- Empty State -->
      <div v-if="sortedAnnouncements.length === 0" class="card">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 4H5a2 2 0 00-2 2v14l4-4h12a2 2 0 002-2V6a2 2 0 00-2-2z"/>
            </svg>
          </div>
          <p>ยังไม่มีประกาศ</p>
          <button v-if="canCreate" class="btn btn-primary" @click="openAdd">
            สร้างประกาศแรก
          </button>
        </div>
      </div>

      <!-- Announcements List -->
      <div v-else class="announcements-list">
        <div
          v-for="item in sortedAnnouncements"
          :key="item.id"
          :class="['announcement-card', { pinned: item.is_pinned }, priorityColors[item.priority]]"
          @click="openDetail(item)"
        >
          <div class="announcement-header">
            <div :class="['announcement-icon', { 'icon-urgent': item.priority === 'urgent', 'icon-important': item.priority === 'important' }]">
              <svg v-if="item.priority === 'urgent'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <svg v-else-if="item.is_pinned" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v10m0 0l-3-3m3 3l3-3M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 4H5a2 2 0 00-2 2v14l4-4h12a2 2 0 002-2V6a2 2 0 00-2-2z"/>
              </svg>
            </div>
            <div class="announcement-meta">
              <h3>{{ item.title }}</h3>
              <div class="meta-row">
                <span class="author">{{ item.author?.name || 'ไม่ระบุ' }}</span>
                <span class="dot">·</span>
                <span class="date">{{ formatDate(item.created_at) }}</span>
              </div>
            </div>
            <span v-if="item.priority === 'urgent'" class="priority-badge urgent">เร่งด่วน</span>
            <span v-else-if="item.priority === 'important'" class="priority-badge important">สำคัญ</span>
            <span v-else-if="item.is_pinned" class="pin-badge">ปักหมุด</span>
          </div>
          <p class="announcement-preview">{{ item.content.substring(0, 100) }}{{ item.content.length > 100 ? '...' : '' }}</p>
          <div class="announcement-footer">
            <span v-if="item.clubs?.name" class="club-tag">{{ item.clubs.name }}</span>
            <span class="target-tag">{{ getTargetLabel(item.target_type) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <button v-if="canCreate" class="fab" @click="openAdd">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>

    <!-- Detail Modal -->
    <Modal :show="showDetailModal" :title="selectedAnnouncement?.title" @close="showDetailModal = false">
      <div v-if="selectedAnnouncement" class="detail-content">
        <div class="detail-meta">
          <span>โดย {{ selectedAnnouncement.author?.name || 'ไม่ระบุ' }}</span>
          <span class="dot">·</span>
          <span>{{ formatDate(selectedAnnouncement.created_at) }}</span>
        </div>
        <div class="detail-body">{{ selectedAnnouncement.content }}</div>
        <div class="detail-tags">
          <span v-if="selectedAnnouncement.clubs?.name" class="club-tag">{{ selectedAnnouncement.clubs.name }}</span>
          <span class="target-tag">{{ getTargetLabel(selectedAnnouncement.target_type) }}</span>
        </div>
      </div>
      <template #footer>
        <button
          v-if="canEditAnnouncement(selectedAnnouncement)"
          class="btn btn-secondary"
          @click="showDetailModal = false; openEdit(selectedAnnouncement)"
        >
          แก้ไข
        </button>
        <button class="btn btn-primary" @click="showDetailModal = false">ปิด</button>
      </template>
    </Modal>

    <!-- Add/Edit Modal -->
    <Modal :show="showModal" :title="editingId ? 'แก้ไขประกาศ' : 'สร้างประกาศใหม่'" @close="showModal = false">
      <form @submit.prevent="save">
        <div class="form-group">
          <label>หัวข้อ</label>
          <input v-model="form.title" class="form-control" placeholder="หัวข้อประกาศ" required />
        </div>
        <div class="form-group">
          <label>เนื้อหา</label>
          <textarea v-model="form.content" class="form-control" rows="5" placeholder="รายละเอียดประกาศ" required></textarea>
        </div>
        <div class="form-group" v-if="auth.isAdmin">
          <label>ชมรม (ไม่เลือก = ประกาศทั่วไป)</label>
          <select v-model="form.club_id" class="form-control">
            <option :value="null">ทุกชมรม</option>
            <option v-for="c in data.clubs" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>กลุ่มเป้าหมาย</label>
          <select v-model="form.target_type" class="form-control">
            <option value="all">ทุกคน</option>
            <option value="club">เฉพาะชมรม</option>
            <option value="coaches">เฉพาะโค้ช</option>
            <option value="athletes">เฉพาะนักกีฬา</option>
          </select>
        </div>
        <div class="form-group">
          <label>ระดับความสำคัญ</label>
          <div class="priority-options">
            <label :class="['priority-option', { active: form.priority === 'normal' }]">
              <input type="radio" v-model="form.priority" value="normal" />
              <span>ปกติ</span>
            </label>
            <label :class="['priority-option', 'option-important', { active: form.priority === 'important' }]">
              <input type="radio" v-model="form.priority" value="important" />
              <span>สำคัญ</span>
            </label>
            <label :class="['priority-option', 'option-urgent', { active: form.priority === 'urgent' }]">
              <input type="radio" v-model="form.priority" value="urgent" />
              <span>เร่งด่วน</span>
            </label>
          </div>
          <p v-if="form.priority === 'urgent'" class="form-hint">ประกาศเร่งด่วนจะแสดง popup บนหน้าจอนักกีฬา</p>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.is_pinned" />
            <span>ปักหมุดประกาศนี้</span>
          </label>
        </div>
      </form>
      <template #footer>
        <button v-if="editingId" class="btn btn-danger" @click="remove">ลบ</button>
        <button class="btn btn-secondary" @click="showModal = false">ยกเลิก</button>
        <button class="btn btn-primary" @click="save">บันทึก</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.announcements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.announcement-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: 16px;
  border: 1px solid var(--gray-100);
  cursor: pointer;
  transition: all 0.15s;
}
.announcement-card:active {
  background: var(--gray-50);
}
.announcement-card.pinned {
  border-color: var(--gray-300);
  background: var(--gray-50);
}

.announcement-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.announcement-icon {
  width: 40px;
  height: 40px;
  background: var(--gray-900);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.announcement-icon svg {
  width: 20px;
  height: 20px;
  color: var(--white);
}

.announcement-meta {
  flex: 1;
  min-width: 0;
}
.announcement-meta h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--gray-900);
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--gray-500);
}
.dot {
  color: var(--gray-300);
}

.pin-badge {
  background: var(--gray-900);
  color: var(--white);
  font-size: 10px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 100px;
  text-transform: uppercase;
}

.announcement-preview {
  font-size: 14px;
  color: var(--gray-600);
  line-height: 1.5;
  margin-bottom: 12px;
}

.announcement-footer {
  display: flex;
  gap: 8px;
}

.club-tag,
.target-tag {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 100px;
  background: var(--gray-100);
  color: var(--gray-600);
}

.empty-state-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: var(--gray-100);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-state-icon svg {
  width: 32px;
  height: 32px;
  color: var(--gray-400);
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--gray-500);
  margin-bottom: 16px;
}

.detail-body {
  font-size: 15px;
  line-height: 1.7;
  color: var(--gray-700);
  white-space: pre-wrap;
  margin-bottom: 16px;
}

.detail-tags {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--gray-100);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.checkbox-label input {
  width: 18px;
  height: 18px;
}

/* Priority Styles */
.priority-urgent {
  border-color: var(--accent-danger) !important;
  background: #FEF2F2 !important;
}
.priority-important {
  border-color: var(--accent-warning) !important;
  background: #FFFBEB !important;
}

.icon-urgent {
  background: var(--accent-danger) !important;
}
.icon-important {
  background: var(--accent-warning) !important;
}

.priority-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 100px;
  text-transform: uppercase;
}
.priority-badge.urgent {
  background: var(--accent-danger);
  color: var(--white);
}
.priority-badge.important {
  background: var(--accent-warning);
  color: var(--white);
}

.priority-options {
  display: flex;
  gap: 8px;
}
.priority-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
}
.priority-option input {
  display: none;
}
.priority-option.active {
  border-color: var(--gray-900);
  background: var(--gray-50);
}
.priority-option.option-important.active {
  border-color: var(--accent-warning);
  background: #FFFBEB;
}
.priority-option.option-urgent.active {
  border-color: var(--accent-danger);
  background: #FEF2F2;
}

.form-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--accent-danger);
}
</style>
