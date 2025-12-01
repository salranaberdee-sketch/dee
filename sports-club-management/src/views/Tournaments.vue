<template>
  <div class="tournaments-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>ทัวนาเมนต์</h1>
        <p class="subtitle">จัดการรายการแข่งขันและผู้เข้าร่วม</p>
      </div>
      <div class="header-actions">
        <router-link v-if="isAdmin" to="/tournament-history" class="btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          ประวัติการแข่งขัน
        </router-link>
        <button v-if="canCreateTournament" class="btn-primary" @click="openModal('add')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          เพิ่มทัวนาเมนต์
        </button>
      </div>
    </div>

    <!-- Rules Panel -->
    <TournamentRules />

    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <label>สถานะ</label>
        <select v-model="filterStatus">
          <option value="">ทั้งหมด</option>
          <option value="upcoming">กำลังจะมาถึง</option>
          <option value="ongoing">กำลังแข่งขัน</option>
          <option value="completed">เสร็จสิ้น</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
      </div>
      <div class="filter-group">
        <label>ค้นหา</label>
        <input type="text" v-model="searchQuery" placeholder="ชื่อทัวนาเมนต์...">
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">กำลังโหลด...</div>

    <!-- Tournament List -->
    <div v-else class="tournament-grid">
      <div v-for="tournament in filteredTournaments" :key="tournament.id" class="tournament-card">
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0012 0V2z"/>
            </svg>
          </div>
          <span :class="['status-badge', `status-${tournament.status}`]">
            {{ statusLabels[tournament.status] }}
          </span>
        </div>
        
        <h3>{{ tournament.name }}</h3>
        <p class="sport-type">{{ tournament.sport_type }}</p>
        
        <div class="card-info">
          <div class="info-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{{ formatDateRange(tournament.start_date, tournament.end_date) }}</span>
          </div>
          <div class="info-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{{ tournament.location }}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-secondary" @click="viewTournament(tournament)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            รายละเอียด
          </button>
          <button v-if="canEditTournament(tournament)" class="btn-icon" @click="openModal('edit', tournament)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button v-if="canDeleteTournament(tournament)" class="btn-icon btn-danger" @click="confirmDelete(tournament)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="filteredTournaments.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0012 0V2z"/>
        </svg>
        <p>ไม่พบทัวนาเมนต์</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Modal v-if="showModal" @close="closeModal">
      <template #header>
        <h2>{{ modalMode === 'add' ? 'เพิ่มทัวนาเมนต์' : 'แก้ไขทัวนาเมนต์' }}</h2>
      </template>
      <template #body>
        <form @submit.prevent="saveTournament" class="form">
          <div class="form-group">
            <label>ชื่อทัวนาเมนต์ *</label>
            <input type="text" v-model="form.name" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>ประเภทกีฬา *</label>
              <input type="text" v-model="form.sport_type" required placeholder="เช่น มวยไทย, ว่ายน้ำ">
            </div>
            <div class="form-group">
              <label>สถานะ</label>
              <select v-model="form.status">
                <option value="upcoming">กำลังจะมาถึง</option>
                <option value="ongoing">กำลังแข่งขัน</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>วันเริ่ม *</label>
              <input type="date" v-model="form.start_date" required>
            </div>
            <div class="form-group">
              <label>วันสิ้นสุด *</label>
              <input type="date" v-model="form.end_date" required>
            </div>
          </div>
          <div class="form-group">
            <label>สถานที่ *</label>
            <input type="text" v-model="form.location" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>สนามแข่งขัน</label>
              <input type="text" v-model="form.venue" placeholder="ชื่อสนาม/อาคาร">
            </div>
            <div class="form-group">
              <label>ผู้จัดงาน</label>
              <input type="text" v-model="form.organizer">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>วันปิดรับสมัคร</label>
              <input type="datetime-local" v-model="form.registration_deadline">
            </div>
            <div class="form-group">
              <label>จำนวนผู้เข้าแข่งขันสูงสุด</label>
              <input type="number" v-model="form.max_participants" min="1">
            </div>
          </div>
          <div class="form-group">
            <label>รายละเอียด</label>
            <textarea v-model="form.description" rows="3"></textarea>
          </div>
        </form>
      </template>
      <template #footer>
        <button type="button" class="btn-secondary" @click="closeModal">ยกเลิก</button>
        <button type="button" class="btn-primary" @click="saveTournament" :disabled="saving">
          {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
        </button>
      </template>
    </Modal>

    <!-- Detail Modal -->
    <Modal v-if="showDetailModal" @close="closeDetailModal" size="large">
      <template #header>
        <h2>{{ selectedTournament?.name }}</h2>
      </template>
      <template #body>
        <TournamentDetail 
          :tournament="selectedTournament" 
          @refresh="refreshTournament"
        />
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'
import TournamentDetail from '@/components/TournamentDetail.vue'
import TournamentRules from '@/components/TournamentRules.vue'

const dataStore = useDataStore()
const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const showDetailModal = ref(false)
const modalMode = ref('add')
const selectedTournament = ref(null)
const filterStatus = ref('')
const searchQuery = ref('')

const isAdmin = computed(() => authStore.isAdmin)
const isCoach = computed(() => authStore.isCoach)

// Role-based permissions
const canCreateTournament = computed(() => isAdmin.value || isCoach.value)

function canEditTournament(tournament) {
  if (isAdmin.value) return true
  if (isCoach.value && tournament.created_by === authStore.user?.id) return true
  return false
}

function canDeleteTournament(tournament) {
  if (isAdmin.value) return true
  if (isCoach.value && tournament.created_by === authStore.user?.id) return true
  return false
}

const statusLabels = {
  upcoming: 'กำลังจะมาถึง',
  ongoing: 'กำลังแข่งขัน',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก'
}

const form = ref({
  name: '',
  description: '',
  sport_type: '',
  start_date: '',
  end_date: '',
  location: '',
  venue: '',
  organizer: '',
  status: 'upcoming',
  registration_deadline: '',
  max_participants: null
})

const filteredTournaments = computed(() => {
  let result = dataStore.tournaments
  
  if (filterStatus.value) {
    result = result.filter(t => t.status === filterStatus.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.sport_type?.toLowerCase().includes(query) ||
      t.location?.toLowerCase().includes(query)
    )
  }
  
  return result
})

function formatDateRange(start, end) {
  const startDate = new Date(start).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  const endDate = new Date(end).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  return start === end ? startDate : `${startDate} - ${endDate}`
}

function openModal(mode, tournament = null) {
  modalMode.value = mode
  if (mode === 'edit' && tournament) {
    form.value = { ...tournament }
  } else {
    form.value = {
      name: '',
      description: '',
      sport_type: '',
      start_date: '',
      end_date: '',
      location: '',
      venue: '',
      organizer: '',
      status: 'upcoming',
      registration_deadline: '',
      max_participants: null
    }
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveTournament() {
  saving.value = true
  
  const payload = {
    ...form.value,
    max_participants: form.value.max_participants || null,
    registration_deadline: form.value.registration_deadline || null,
    created_by: authStore.user?.id
  }
  
  let result
  if (modalMode.value === 'add') {
    result = await dataStore.addTournament(payload)
  } else {
    result = await dataStore.updateTournament(form.value.id, payload)
  }
  
  saving.value = false
  if (result.success) {
    closeModal()
  } else {
    alert(result.message || 'เกิดข้อผิดพลาด')
  }
}

async function confirmDelete(tournament) {
  if (confirm(`ต้องการลบทัวนาเมนต์ "${tournament.name}" หรือไม่?`)) {
    const result = await dataStore.deleteTournament(tournament.id)
    if (!result.success) {
      alert(result.message || 'ไม่สามารถลบได้')
    }
  }
}

function viewTournament(tournament) {
  selectedTournament.value = tournament
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  selectedTournament.value = null
}

async function refreshTournament() {
  await dataStore.fetchTournaments()
  if (selectedTournament.value) {
    selectedTournament.value = dataStore.getTournamentById(selectedTournament.value.id)
  }
}

onMounted(async () => {
  loading.value = true
  await dataStore.fetchTournaments()
  loading.value = false
})
</script>

<style scoped>
.tournaments-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.subtitle {
  color: #737373;
  margin: 4px 0 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #171717;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #262626;
}

.btn-primary svg {
  width: 18px;
  height: 18px;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

.btn-secondary svg {
  width: 16px;
  height: 16px;
}

.btn-icon {
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}

.btn-icon:hover {
  background: #F5F5F5;
}

.btn-icon.btn-danger:hover {
  background: #FEE2E2;
  border-color: #EF4444;
}

.btn-icon.btn-danger:hover svg {
  stroke: #EF4444;
}

.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 12px;
  color: #737373;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
  min-width: 160px;
}

.loading {
  text-align: center;
  padding: 48px;
  color: #737373;
}

.tournament-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.tournament-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-icon {
  width: 48px;
  height: 48px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-upcoming {
  background: #DBEAFE;
  color: #1E40AF;
}

.status-ongoing {
  background: #D1FAE5;
  color: #065F46;
}

.status-completed {
  background: #F3F4F6;
  color: #374151;
}

.status-cancelled {
  background: #FEE2E2;
  color: #991B1B;
}

.tournament-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
}

.sport-type {
  color: #737373;
  font-size: 14px;
  margin: 0 0 16px;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #525252;
  font-size: 13px;
}

.info-row svg {
  width: 16px;
  height: 16px;
  color: #A3A3A3;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #F5F5F5;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px;
  color: #737373;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .tournament-grid {
    grid-template-columns: 1fr;
  }
}
</style>
