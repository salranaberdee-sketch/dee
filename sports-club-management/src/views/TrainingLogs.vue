<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'

const auth = useAuthStore()
const data = useDataStore()

const showModal = ref(false)
const editingId = ref(null)
const form = ref({ athlete_id: null, coach_id: null, club_id: null, date: '', duration: 60, activities: '', notes: '', rating: 3 })

onMounted(async () => {
  await Promise.all([data.fetchTrainingLogs(), data.fetchAthletes(), data.fetchCoaches()])
})

const sortedLogs = computed(() => [...data.trainingLogs].sort((a, b) => new Date(b.date) - new Date(a.date)))

const currentCoach = computed(() => {
  if (auth.isCoach) {
    return data.coaches.find(c => c.email === auth.profile?.email)
  }
  return null
})

const currentAthlete = computed(() => {
  if (auth.isAthlete) {
    return data.athletes.find(a => a.email === auth.profile?.email)
  }
  return null
})

const availableAthletes = computed(() => {
  if (auth.isAdmin) return data.athletes
  if (auth.isCoach && currentCoach.value) {
    return data.getAthletesByCoach(currentCoach.value.id)
  }
  return []
})

function openAdd() {
  editingId.value = null
  form.value = { 
    athlete_id: currentAthlete.value?.id || availableAthletes.value[0]?.id || null, 
    coach_id: currentCoach.value?.id || null,
    club_id: currentCoach.value?.club_id || currentAthlete.value?.club_id || null,
    date: new Date().toISOString().split('T')[0], 
    duration: 60, activities: '', notes: '', rating: 3 
  }
  showModal.value = true
}

function openEdit(log) {
  editingId.value = log.id
  form.value = { 
    athlete_id: log.athlete_id,
    coach_id: log.coach_id,
    club_id: log.club_id,
    date: log.date,
    duration: log.duration,
    activities: log.activities,
    notes: log.notes,
    rating: log.rating
  }
  showModal.value = true
}

async function save() {
  if (editingId.value) {
    await data.updateTrainingLog(editingId.value, form.value)
  } else {
    await data.addTrainingLog({ ...form.value })
  }
  showModal.value = false
}

async function remove() {
  if (confirm('ยืนยันการลบบันทึกนี้?')) {
    await data.deleteTrainingLog(editingId.value)
    showModal.value = false
  }
}

function getAthleteName(log) {
  return log.athletes?.name || '—'
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">บันทึก</h1>
      <button v-if="!auth.isAthlete || currentAthlete" class="btn btn-sm btn-primary" @click="openAdd">+ เพิ่ม</button>
    </div>

    <div class="container">
      <!-- Stats -->
      <div class="mini-stats">
        <div class="mini-stat">
          <span class="mini-stat-value">{{ data.trainingLogs.length }}</span>
          <span class="mini-stat-label">บันทึก</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">{{ Math.round(data.trainingLogs.reduce((s, l) => s + l.duration, 0) / 60) }}</span>
          <span class="mini-stat-label">ชั่วโมง</span>
        </div>
      </div>

      <div v-if="sortedLogs.length === 0" class="card">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
          </div>
          <p>ยังไม่มีบันทึก</p>
          <button class="btn btn-primary" @click="openAdd">สร้างบันทึกแรก</button>
        </div>
      </div>

      <div v-else class="logs-list">
        <div v-for="log in sortedLogs" :key="log.id" class="card card-interactive" @click="openEdit(log)">
          <div class="log-row">
            <div class="date-box date-box-success">
              <span class="date-box-day">{{ new Date(log.date).getDate() }}</span>
              <span class="date-box-month">{{ new Date(log.date).toLocaleDateString('th-TH', { month: 'short' }) }}</span>
            </div>
            <div class="log-info">
              <h3>{{ log.activities }}</h3>
              <p class="log-meta">{{ getAthleteName(log) }} · {{ log.duration }} นาที</p>
            </div>
            <div class="rating">
              <span v-for="i in 5" :key="i" :class="['star', { filled: i <= log.rating }]">★</span>
            </div>
          </div>
          <p v-if="log.notes" class="log-notes">{{ log.notes }}</p>
        </div>
      </div>
    </div>

    <button class="fab" @click="openAdd">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <Modal :show="showModal" :title="editingId ? 'แก้ไขบันทึก' : 'บันทึกใหม่'" @close="showModal = false">
      <form @submit.prevent="save">
        <div class="form-group" v-if="!auth.isAthlete">
          <label>นักกีฬา</label>
          <select v-model="form.athlete_id" class="form-control" required>
            <option :value="null" disabled>เลือกนักกีฬา</option>
            <option v-for="a in availableAthletes" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>วันที่</label>
            <input v-model="form.date" type="date" class="form-control" required />
          </div>
          <div class="form-group">
            <label>ระยะเวลา (นาที)</label>
            <input v-model.number="form.duration" type="number" class="form-control" min="1" required />
          </div>
        </div>
        <div class="form-group">
          <label>กิจกรรมที่ฝึก</label>
          <input v-model="form.activities" class="form-control" placeholder="เช่น วิ่ง 5 กม." required />
        </div>
        <div class="form-group">
          <label>บันทึกเพิ่มเติม</label>
          <textarea v-model="form.notes" class="form-control" rows="3" placeholder="สภาพร่างกาย, ความรู้สึก"></textarea>
        </div>
        <div class="form-group">
          <label>คะแนน</label>
          <div class="rating-input">
            <button v-for="i in 5" :key="i" type="button" :class="['star-btn', { active: i <= form.rating }]" @click="form.rating = i">★</button>
          </div>
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
.mini-stats { display: flex; gap: 12px; margin-bottom: 20px; }
.mini-stat { 
  flex: 1; background: var(--white); border-radius: var(--radius-lg);
  padding: 16px; text-align: center; border: 1px solid var(--gray-100);
}
.mini-stat-value { display: block; font-size: 24px; font-weight: 700; color: var(--gray-900); }
.mini-stat-label { font-size: 11px; color: var(--gray-500); text-transform: uppercase; }

.logs-list { display: flex; flex-direction: column; gap: 12px; }
.log-row { display: flex; gap: 14px; align-items: flex-start; }
.log-info { flex: 1; min-width: 0; }
.log-info h3 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.log-meta { font-size: 13px; color: var(--gray-500); }
.log-notes { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gray-100); font-size: 13px; color: var(--gray-600); }
.empty-state-icon { width: 64px; height: 64px; margin: 0 auto 16px; background: var(--gray-100); border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.empty-state-icon svg { width: 32px; height: 32px; color: var(--gray-400); }
</style>