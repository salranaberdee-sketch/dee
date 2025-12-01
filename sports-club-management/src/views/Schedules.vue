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
const selectedSchedule = ref(null)
const filterStatus = ref('upcoming')
const form = ref({ 
  club_id: null, 
  coach_id: null, 
  title: '', 
  date: '', 
  time: '', 
  end_time: '',
  location: '', 
  description: '',
  schedule_type: 'training'
})

const scheduleTypes = {
  training: { label: 'ฝึกซ้อม', color: 'type-training' },
  competition: { label: 'แข่งขัน', color: 'type-competition' },
  meeting: { label: 'ประชุม', color: 'type-meeting' },
  other: { label: 'อื่นๆ', color: 'type-other' }
}

onMounted(async () => {
  await Promise.all([data.fetchSchedules(), data.fetchClubs(), data.fetchCoaches()])
})

const canEdit = computed(() => auth.isAdmin || auth.isCoach)

const currentCoach = computed(() => {
  if (auth.isCoach) {
    return data.coaches.find(c => c.email === auth.profile?.email)
  }
  return null
})

const filteredSchedules = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const sorted = [...data.schedules].sort((a, b) => new Date(a.date) - new Date(b.date))
  
  if (filterStatus.value === 'upcoming') {
    return sorted.filter(s => s.date >= today)
  } else if (filterStatus.value === 'past') {
    return sorted.filter(s => s.date < today).reverse()
  }
  return sorted
})

const schedulesByMonth = computed(() => {
  const groups = {}
  filteredSchedules.value.forEach(s => {
    const monthKey = new Date(s.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
    if (!groups[monthKey]) groups[monthKey] = []
    groups[monthKey].push(s)
  })
  return groups
})

function openAdd() {
  editingId.value = null
  const today = new Date()
  form.value = { 
    club_id: currentCoach.value?.club_id || data.clubs[0]?.id || null,
    coach_id: currentCoach.value?.id || null,
    title: '', 
    date: today.toISOString().split('T')[0], 
    time: '09:00',
    end_time: '11:00',
    location: '', 
    description: '',
    schedule_type: 'training'
  }
  showModal.value = true
}

function openEdit(schedule) {
  editingId.value = schedule.id
  form.value = { 
    club_id: schedule.club_id,
    coach_id: schedule.coach_id,
    title: schedule.title,
    date: schedule.date,
    time: schedule.time,
    end_time: schedule.end_time || '',
    location: schedule.location,
    description: schedule.description,
    schedule_type: schedule.schedule_type || 'training'
  }
  showModal.value = true
}

function openDetail(schedule) {
  selectedSchedule.value = schedule
  showDetailModal.value = true
}

async function save() {
  if (editingId.value) {
    await data.updateSchedule(editingId.value, form.value)
  } else {
    await data.addSchedule({ ...form.value })
  }
  showModal.value = false
}

async function remove() {
  if (confirm('ยืนยันการลบนัดหมายนี้?')) {
    await data.deleteSchedule(editingId.value)
    showModal.value = false
  }
}

function getClubName(schedule) {
  return schedule.clubs?.name || ''
}

function getCoachName(schedule) {
  return schedule.coaches?.name || ''
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().split('T')[0]
}

function isPast(dateStr) {
  return dateStr < new Date().toISOString().split('T')[0]
}

function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString('th-TH', { weekday: 'short' })
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">นัดหมาย</h1>
      <button v-if="canEdit" class="btn btn-sm btn-primary" @click="openAdd">+ เพิ่ม</button>
    </div>

    <div class="container">
      <!-- Filter Tabs -->
      <div class="filter-tabs">
        <button 
          :class="['filter-tab', { active: filterStatus === 'upcoming' }]" 
          @click="filterStatus = 'upcoming'"
        >
          กำลังจะมาถึง
        </button>
        <button 
          :class="['filter-tab', { active: filterStatus === 'past' }]" 
          @click="filterStatus = 'past'"
        >
          ผ่านไปแล้ว
        </button>
        <button 
          :class="['filter-tab', { active: filterStatus === 'all' }]" 
          @click="filterStatus = 'all'"
        >
          ทั้งหมด
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="filteredSchedules.length === 0" class="card">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
          <p>{{ filterStatus === 'upcoming' ? 'ไม่มีนัดหมายที่กำลังจะมาถึง' : 'ไม่มีนัดหมาย' }}</p>
          <button v-if="canEdit" class="btn btn-primary" @click="openAdd">สร้างนัดหมายใหม่</button>
        </div>
      </div>

      <!-- Schedule List by Month -->
      <template v-else>
        <div v-for="(schedules, month) in schedulesByMonth" :key="month" class="month-group">
          <div class="month-header">{{ month }}</div>
          
          <div class="schedule-list">
            <div 
              v-for="s in schedules" 
              :key="s.id" 
              :class="['schedule-card', { 'is-today': isToday(s.date), 'is-past': isPast(s.date) }, scheduleTypes[s.schedule_type || 'training']?.color]"
              @click="openDetail(s)"
            >
              <div class="schedule-date">
                <span class="schedule-day">{{ new Date(s.date).getDate() }}</span>
                <span class="schedule-weekday">{{ getDayName(s.date) }}</span>
              </div>
              <div class="schedule-content">
                <div class="schedule-time">
                  {{ s.time }}{{ s.end_time ? ' - ' + s.end_time : '' }}
                </div>
                <h3 class="schedule-title">{{ s.title }}</h3>
                <div class="schedule-location">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {{ s.location }}
                </div>
                <div class="schedule-tags">
                  <span :class="['type-tag', scheduleTypes[s.schedule_type || 'training']?.color]">
                    {{ scheduleTypes[s.schedule_type || 'training']?.label }}
                  </span>
                  <span v-if="auth.isAdmin && getClubName(s)" class="schedule-club">{{ getClubName(s) }}</span>
                </div>
              </div>
              <div v-if="isToday(s.date)" class="today-badge">วันนี้</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- FAB -->
    <button v-if="canEdit" class="fab" @click="openAdd">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <!-- Detail Modal -->
    <Modal :show="showDetailModal" :title="selectedSchedule?.title" @close="showDetailModal = false">
      <div v-if="selectedSchedule" class="detail-content">
        <div class="detail-row">
          <span class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span>
          <div>
            <span class="detail-label">วันที่</span>
            <span class="detail-value">{{ new Date(selectedSchedule.date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</span>
          </div>
        </div>
        <div class="detail-row">
          <span class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
          <div>
            <span class="detail-label">เวลา</span>
            <span class="detail-value">
              {{ selectedSchedule.time }} น.
              <template v-if="selectedSchedule.end_time"> - {{ selectedSchedule.end_time }} น.</template>
            </span>
          </div>
        </div>
        <div class="detail-row">
          <span :class="['detail-icon', scheduleTypes[selectedSchedule.schedule_type || 'training']?.color]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </span>
          <div>
            <span class="detail-label">ประเภท</span>
            <span class="detail-value">{{ scheduleTypes[selectedSchedule.schedule_type || 'training']?.label }}</span>
          </div>
        </div>
        <div class="detail-row">
          <span class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
          <div>
            <span class="detail-label">สถานที่</span>
            <span class="detail-value">{{ selectedSchedule.location }}</span>
          </div>
        </div>
        <div v-if="getClubName(selectedSchedule)" class="detail-row">
          <span class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg></span>
          <div>
            <span class="detail-label">ชมรม</span>
            <span class="detail-value">{{ getClubName(selectedSchedule) }}</span>
          </div>
        </div>
        <div v-if="getCoachName(selectedSchedule)" class="detail-row">
          <span class="detail-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg></span>
          <div>
            <span class="detail-label">โค้ช</span>
            <span class="detail-value">{{ getCoachName(selectedSchedule) }}</span>
          </div>
        </div>
        <div v-if="selectedSchedule.description" class="detail-description">
          <span class="detail-label">รายละเอียด</span>
          <p>{{ selectedSchedule.description }}</p>
        </div>
      </div>
      <template #footer>
        <button v-if="canEdit" class="btn btn-secondary" @click="showDetailModal = false; openEdit(selectedSchedule)">แก้ไข</button>
        <button class="btn btn-primary" @click="showDetailModal = false">ปิด</button>
      </template>
    </Modal>

    <!-- Add/Edit Modal -->
    <Modal :show="showModal" :title="editingId ? 'แก้ไขนัดหมาย' : 'นัดหมายใหม่'" @close="showModal = false">
      <form @submit.prevent="save">
        <div class="form-group">
          <label>ประเภท</label>
          <div class="type-options">
            <label v-for="(type, key) in scheduleTypes" :key="key" :class="['type-option', type.color, { active: form.schedule_type === key }]">
              <input type="radio" v-model="form.schedule_type" :value="key" />
              <span>{{ type.label }}</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>หัวข้อ</label>
          <input v-model="form.title" class="form-control" placeholder="ชื่อนัดหมาย" required />
        </div>
        <div class="form-group">
          <label>วันที่</label>
          <input v-model="form.date" type="date" class="form-control" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>เวลาเริ่ม</label>
            <input v-model="form.time" type="time" class="form-control" required />
          </div>
          <div class="form-group">
            <label>เวลาสิ้นสุด</label>
            <input v-model="form.end_time" type="time" class="form-control" />
          </div>
        </div>
        <div class="form-group">
          <label>สถานที่</label>
          <input v-model="form.location" class="form-control" placeholder="สถานที่จัดกิจกรรม" required />
        </div>
        <div class="form-group" v-if="auth.isAdmin">
          <label>ชมรม</label>
          <select v-model="form.club_id" class="form-control" required>
            <option v-for="c in data.clubs" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>รายละเอียด</label>
          <textarea v-model="form.description" class="form-control" rows="3" placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"></textarea>
        </div>
      </form>
      <template #footer>
        <button v-if="editingId && canEdit" class="btn btn-danger" @click="remove">ลบ</button>
        <button class="btn btn-secondary" @click="showModal = false">ยกเลิก</button>
        <button class="btn btn-primary" @click="save">บันทึก</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.filter-tabs { display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; }
.filter-tab { 
  padding: 8px 16px; border: none; background: var(--white);
  border-radius: 100px; font-size: 13px; font-weight: 500;
  color: var(--gray-500); cursor: pointer; white-space: nowrap;
  border: 1px solid var(--gray-200); transition: all 0.15s;
}
.filter-tab.active { background: var(--gray-900); color: var(--white); border-color: var(--gray-900); }

.month-group { margin-bottom: 24px; }
.month-header { 
  font-size: 13px; font-weight: 600; color: var(--gray-500);
  text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 12px; padding-left: 4px;
}

.schedule-list { display: flex; flex-direction: column; gap: 10px; }
.schedule-card { 
  display: flex; gap: 14px; padding: 16px;
  background: var(--white); border-radius: var(--radius-lg);
  border: 1px solid var(--gray-100); cursor: pointer;
  transition: all 0.15s; position: relative;
}
.schedule-card:active { background: var(--gray-50); }
.schedule-card.is-today { border-color: var(--accent-primary); background: #F0F9FF; }
.schedule-card.is-past { opacity: 0.6; }

.schedule-date { 
  width: 48px; text-align: center; flex-shrink: 0;
  display: flex; flex-direction: column; justify-content: center;
}
.schedule-day { font-size: 24px; font-weight: 700; color: var(--gray-900); line-height: 1; }
.schedule-weekday { font-size: 11px; color: var(--gray-500); text-transform: uppercase; margin-top: 2px; }

.schedule-content { flex: 1; min-width: 0; }
.schedule-time { font-size: 12px; font-weight: 600; color: var(--accent-primary); margin-bottom: 4px; }
.schedule-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; color: var(--gray-900); }
.schedule-location { 
  display: flex; align-items: center; gap: 4px;
  font-size: 13px; color: var(--gray-500);
}
.schedule-club { 
  display: inline-block; margin-top: 8px;
  font-size: 11px; padding: 3px 8px;
  background: var(--gray-100); border-radius: 100px;
  color: var(--gray-600);
}

.today-badge { 
  position: absolute; top: 12px; right: 12px;
  background: var(--accent-primary); color: white;
  font-size: 10px; font-weight: 600; padding: 3px 8px;
  border-radius: 100px; text-transform: uppercase;
}

.detail-content { }
.detail-row { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--gray-100); }
.detail-row:last-child { border-bottom: none; }
.detail-icon { width: 40px; height: 40px; background: var(--gray-100); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.detail-icon svg { width: 20px; height: 20px; color: var(--gray-600); }
.empty-state-icon { width: 64px; height: 64px; margin: 0 auto 16px; background: var(--gray-100); border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.empty-state-icon svg { width: 32px; height: 32px; color: var(--gray-400); }
.detail-label { display: block; font-size: 12px; color: var(--gray-500); margin-bottom: 2px; }
.detail-value { font-size: 15px; font-weight: 500; color: var(--gray-900); }
.detail-description { padding-top: 14px; border-top: 1px solid var(--gray-100); margin-top: 14px; }
.detail-description p { margin-top: 8px; font-size: 14px; color: var(--gray-600); line-height: 1.6; }

/* Schedule Type Styles */
.schedule-tags { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.type-tag {
  font-size: 10px; font-weight: 600; padding: 3px 8px;
  border-radius: 100px; text-transform: uppercase;
}
.type-tag.type-training { background: #D1FAE5; color: #065F46; }
.type-tag.type-competition { background: #FEE2E2; color: #991B1B; }
.type-tag.type-meeting { background: #DBEAFE; color: #1E40AF; }
.type-tag.type-other { background: var(--gray-100); color: var(--gray-600); }

.schedule-card.type-training { border-left: 3px solid #10B981; }
.schedule-card.type-competition { border-left: 3px solid #EF4444; }
.schedule-card.type-meeting { border-left: 3px solid #3B82F6; }
.schedule-card.type-other { border-left: 3px solid var(--gray-400); }

/* Type Options in Form */
.type-options { display: flex; gap: 8px; flex-wrap: wrap; }
.type-option {
  flex: 1; min-width: 70px;
  display: flex; align-items: center; justify-content: center;
  padding: 10px 8px; border: 2px solid var(--gray-200);
  border-radius: var(--radius-md); cursor: pointer;
  font-size: 12px; font-weight: 500; transition: all 0.15s;
}
.type-option input { display: none; }
.type-option.active { border-width: 2px; }
.type-option.type-training.active { border-color: #10B981; background: #D1FAE5; }
.type-option.type-competition.active { border-color: #EF4444; background: #FEE2E2; }
.type-option.type-meeting.active { border-color: #3B82F6; background: #DBEAFE; }
.type-option.type-other.active { border-color: var(--gray-500); background: var(--gray-100); }

/* Detail icon colors */
.detail-icon.type-training { background: #D1FAE5; }
.detail-icon.type-training svg { color: #065F46; }
.detail-icon.type-competition { background: #FEE2E2; }
.detail-icon.type-competition svg { color: #991B1B; }
.detail-icon.type-meeting { background: #DBEAFE; }
.detail-icon.type-meeting svg { color: #1E40AF; }
.detail-icon.type-other { background: var(--gray-100); }
.detail-icon.type-other svg { color: var(--gray-600); }
</style>
