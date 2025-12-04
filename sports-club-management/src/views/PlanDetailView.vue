<template>
  <div class="plan-detail-page">
    <!-- Loading -->
    <div v-if="loading" class="loading">กำลังโหลด...</div>

    <template v-else-if="plan">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <router-link to="/training-plans" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            กลับ
          </router-link>
          <div>
            <h1>{{ plan.name }}</h1>
            <p class="subtitle">{{ plan.description || 'ไม่มีคำอธิบาย' }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="canManage" class="btn-secondary" @click="showAssignModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            เพิ่มนักกีฬา
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ plan.total_levels }}</span>
            <span class="stat-label">ระดับทั้งหมด</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ progressList.length }}</span>
            <span class="stat-label">นักกีฬาในแผน</span>
          </div>
        </div>
      </div>

      <!-- Levels Section -->
      <div class="section">
        <h2>ระดับในแผน</h2>
        <div class="levels-grid">
          <div 
            v-for="level in levels" 
            :key="level.id" 
            class="level-card"
            :class="{ 'has-athletes': getAthletesAtLevel(level.level_number).length > 0 }"
          >
            <div class="level-header">
              <span class="level-number">{{ level.level_number }}</span>
              <span class="level-name">{{ level.name }}</span>
            </div>
            <p class="level-description">{{ level.description || '-' }}</p>
            <div class="level-athletes">
              <span class="athlete-count">
                {{ getAthletesAtLevel(level.level_number).length }} คน
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Athletes Progress Section -->
      <div class="section">
        <div class="section-header">
          <h2>ความคืบหน้านักกีฬา</h2>
          <div class="filter-group">
            <select v-model="filterLevel">
              <option value="">ทุกระดับ</option>
              <option v-for="i in plan.total_levels" :key="i" :value="i">ระดับ {{ i }}</option>
            </select>
          </div>
        </div>

        <div v-if="filteredProgress.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <p>ยังไม่มีนักกีฬาในแผนนี้</p>
          <button v-if="canManage" class="btn-primary" @click="showAssignModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            เพิ่มนักกีฬาคนแรก
          </button>
        </div>

        <div v-else class="athletes-list">
          <div v-for="progress in filteredProgress" :key="progress.id" class="athlete-card">
            <div class="athlete-info">
              <div class="avatar">
                {{ progress.athlete?.name?.charAt(0) || '?' }}
              </div>
              <div class="athlete-details">
                <h4>{{ progress.athlete?.name || 'ไม่ทราบชื่อ' }}</h4>
                <p>{{ progress.athlete?.email }}</p>
              </div>
            </div>

            <div class="progress-section">
              <div class="progress-info">
                <span class="current-level">ระดับ {{ progress.current_level }}</span>
                <span class="level-name">{{ getLevelName(progress.current_level) }}</span>
              </div>
              <div class="progress-bar-container">
                <div 
                  class="progress-bar" 
                  :style="{ width: `${(progress.current_level / plan.total_levels) * 100}%` }"
                ></div>
              </div>
              <span class="progress-text">{{ progress.current_level }}/{{ plan.total_levels }}</span>
            </div>

            <div class="athlete-actions" v-if="canManage">
              <button class="btn-icon" @click="openUpdateModal(progress)" title="อัพเดทระดับ">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
              <button class="btn-icon" @click="viewHistory(progress)" title="ดูประวัติ">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </button>
              <button class="btn-icon btn-danger" @click="confirmRemove(progress)" title="ลบออกจากแผน">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Assign Athlete Modal -->
    <Modal v-if="showAssignModal" @close="closeAssignModal" size="large">
      <template #header>
        <h2>เพิ่มนักกีฬาเข้าแผน</h2>
      </template>
      <template #body>
        <div class="assign-modal-content">
          <!-- ค้นหานักกีฬา -->
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              v-model="searchAthlete" 
              placeholder="ค้นหาชื่อหรืออีเมลนักกีฬา..."
            >
          </div>

          <!-- ระดับเริ่มต้น -->
          <div class="form-group">
            <label>ระดับเริ่มต้นสำหรับนักกีฬาที่เลือก</label>
            <select v-model.number="assignForm.initialLevel">
              <option v-for="i in plan?.total_levels" :key="i" :value="i">
                ระดับ {{ i }} - {{ getLevelName(i) }}
              </option>
            </select>
          </div>

          <!-- รายการนักกีฬาที่เลือกแล้ว -->
          <div v-if="selectedAthleteIds.length > 0" class="selected-athletes">
            <label>นักกีฬาที่เลือก ({{ selectedAthleteIds.length }} คน)</label>
            <div class="selected-list">
              <div v-for="id in selectedAthleteIds" :key="id" class="selected-chip">
                <span>{{ getAthleteName(id) }}</span>
                <button @click="toggleAthleteSelection(id)" class="chip-remove">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- รายการนักกีฬาที่ยังไม่ได้ assign -->
          <div class="athletes-selection">
            <label>เลือกนักกีฬา ({{ filteredAvailableAthletes.length }} คน)</label>
            <div v-if="filteredAvailableAthletes.length === 0" class="no-athletes">
              <p v-if="searchAthlete">ไม่พบนักกีฬาที่ค้นหา</p>
              <p v-else>นักกีฬาทั้งหมดถูก assign แผนนี้แล้ว</p>
            </div>
            <div v-else class="athletes-grid">
              <div 
                v-for="athlete in filteredAvailableAthletes" 
                :key="athlete.id" 
                class="athlete-select-card"
                :class="{ selected: selectedAthleteIds.includes(athlete.id) }"
                @click="toggleAthleteSelection(athlete.id)"
              >
                <div class="select-checkbox">
                  <svg v-if="selectedAthleteIds.includes(athlete.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div class="athlete-avatar">{{ athlete.name?.charAt(0) || '?' }}</div>
                <div class="athlete-select-info">
                  <span class="athlete-select-name">{{ athlete.name }}</span>
                  <span class="athlete-select-email">{{ athlete.email }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <button class="btn-secondary" @click="closeAssignModal">ยกเลิก</button>
        <button 
          class="btn-primary" 
          @click="assignMultipleAthletes" 
          :disabled="selectedAthleteIds.length === 0 || saving"
        >
          {{ saving ? 'กำลังบันทึก...' : `เพิ่ม ${selectedAthleteIds.length} คน` }}
        </button>
      </template>
    </Modal>

    <!-- Update Level Modal -->
    <Modal v-if="showUpdateModal" @close="showUpdateModal = false">
      <template #header>
        <h2>อัพเดทระดับ</h2>
      </template>
      <template #body>
        <div class="form">
          <div class="athlete-preview">
            <div class="avatar">{{ selectedProgress?.athlete?.name?.charAt(0) || '?' }}</div>
            <div>
              <h4>{{ selectedProgress?.athlete?.name }}</h4>
              <p>ระดับปัจจุบัน: {{ selectedProgress?.current_level }}</p>
            </div>
          </div>
          <div class="form-group">
            <label>ระดับใหม่ *</label>
            <select v-model.number="updateForm.newLevel">
              <option v-for="i in plan?.total_levels" :key="i" :value="i">
                ระดับ {{ i }} - {{ getLevelName(i) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>หมายเหตุ</label>
            <textarea v-model="updateForm.notes" rows="2" placeholder="เหตุผลในการเลื่อนระดับ..."></textarea>
          </div>
        </div>
      </template>
      <template #footer>
        <button class="btn-secondary" @click="showUpdateModal = false">ยกเลิก</button>
        <button class="btn-primary" @click="updateLevel" :disabled="saving">
          {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
        </button>
      </template>
    </Modal>

    <!-- History Modal -->
    <Modal v-if="showHistoryModal" @close="showHistoryModal = false" size="medium">
      <template #header>
        <h2>ประวัติการเลื่อนระดับ</h2>
      </template>
      <template #body>
        <div class="history-list">
          <div v-if="history.length === 0" class="empty-state small">
            <p>ยังไม่มีประวัติ</p>
          </div>
          <div v-for="item in history" :key="item.id" class="history-item">
            <div class="history-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <div class="history-content">
              <div class="history-levels">
                <span v-if="item.previous_level">ระดับ {{ item.previous_level }}</span>
                <span v-else>เริ่มต้น</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                <span>ระดับ {{ item.new_level }}</span>
              </div>
              <p class="history-notes" v-if="item.notes">{{ item.notes }}</p>
              <span class="history-date">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTrainingPlansStore } from '@/stores/trainingPlans'
import { useAthleteProgressStore } from '@/stores/athleteProgress'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const plansStore = useTrainingPlansStore()
const progressStore = useAthleteProgressStore()
const dataStore = useDataStore()
const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const showAssignModal = ref(false)
const showUpdateModal = ref(false)
const showHistoryModal = ref(false)
const filterLevel = ref('')
const selectedProgress = ref(null)

// Data
const plan = computed(() => plansStore.currentPlan)
const levels = computed(() => plansStore.levels)
const progressList = computed(() => progressStore.progressList)
const history = computed(() => progressStore.history)

// ตรวจสอบสิทธิ์
const canManage = computed(() => authStore.isAdmin || authStore.isCoach)

// นักกีฬาที่ยังไม่ได้ assign
const availableAthletes = computed(() => {
  const assignedIds = progressList.value.map(p => p.athlete_id)
  return dataStore.athletes.filter(a => !assignedIds.includes(a.id))
})

// ค้นหานักกีฬา
const searchAthlete = ref('')
const selectedAthleteIds = ref([])

// กรองนักกีฬาตามการค้นหา
const filteredAvailableAthletes = computed(() => {
  if (!searchAthlete.value) return availableAthletes.value
  const query = searchAthlete.value.toLowerCase()
  return availableAthletes.value.filter(a => 
    a.name?.toLowerCase().includes(query) ||
    a.email?.toLowerCase().includes(query)
  )
})

// กรองตามระดับ
const filteredProgress = computed(() => {
  if (!filterLevel.value) return progressList.value
  return progressList.value.filter(p => p.current_level === parseInt(filterLevel.value))
})

// Forms
const assignForm = ref({
  athleteId: '',
  initialLevel: 1
})

const updateForm = ref({
  newLevel: 1,
  notes: ''
})

// Helpers
function getLevelName(levelNumber) {
  const level = levels.value.find(l => l.level_number === levelNumber)
  return level?.name || `ระดับ ${levelNumber}`
}

function getAthletesAtLevel(levelNumber) {
  return progressList.value.filter(p => p.current_level === levelNumber)
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

// Actions
async function assignAthlete() {
  if (!assignForm.value.athleteId) return
  
  saving.value = true
  const result = await progressStore.assignAthlete(
    assignForm.value.athleteId,
    route.params.id,
    assignForm.value.initialLevel
  )
  saving.value = false

  if (result.success) {
    showAssignModal.value = false
    assignForm.value = { athleteId: '', initialLevel: 1 }
  } else {
    alert(result.message || 'เกิดข้อผิดพลาด')
  }
}

function openUpdateModal(progress) {
  selectedProgress.value = progress
  updateForm.value = {
    newLevel: progress.current_level,
    notes: ''
  }
  showUpdateModal.value = true
}

async function updateLevel() {
  if (!selectedProgress.value) return

  saving.value = true
  const result = await progressStore.updateLevel(
    selectedProgress.value.id,
    updateForm.value.newLevel,
    updateForm.value.notes
  )
  saving.value = false

  if (result.success) {
    showUpdateModal.value = false
    selectedProgress.value = null
  } else {
    alert(result.message || 'เกิดข้อผิดพลาด')
  }
}

async function viewHistory(progress) {
  selectedProgress.value = progress
  await progressStore.fetchHistory(progress.id)
  showHistoryModal.value = true
}

async function confirmRemove(progress) {
  if (confirm(`ต้องการลบ "${progress.athlete?.name}" ออกจากแผนนี้หรือไม่?`)) {
    const result = await progressStore.removeAssignment(progress.id)
    if (!result.success) {
      alert(result.message || 'ไม่สามารถลบได้')
    }
  }
}

// ฟังก์ชันสำหรับ assign หลายคน
function getAthleteName(athleteId) {
  const athlete = dataStore.athletes.find(a => a.id === athleteId)
  return athlete?.name || 'ไม่ทราบชื่อ'
}

function toggleAthleteSelection(athleteId) {
  const index = selectedAthleteIds.value.indexOf(athleteId)
  if (index === -1) {
    selectedAthleteIds.value.push(athleteId)
  } else {
    selectedAthleteIds.value.splice(index, 1)
  }
}

function closeAssignModal() {
  showAssignModal.value = false
  selectedAthleteIds.value = []
  searchAthlete.value = ''
  assignForm.value.initialLevel = 1
}

async function assignMultipleAthletes() {
  if (selectedAthleteIds.value.length === 0) return

  saving.value = true
  let successCount = 0
  let errorMessages = []

  // Assign ทีละคน
  for (const athleteId of selectedAthleteIds.value) {
    const result = await progressStore.assignAthlete(
      athleteId,
      route.params.id,
      assignForm.value.initialLevel
    )
    if (result.success) {
      successCount++
    } else {
      errorMessages.push(result.message || 'เกิดข้อผิดพลาด')
    }
  }

  saving.value = false

  if (successCount > 0) {
    // รีโหลดข้อมูล
    await progressStore.fetchProgressByPlan(route.params.id)
  }

  if (errorMessages.length > 0) {
    alert(`เพิ่มสำเร็จ ${successCount} คน, ล้มเหลว ${errorMessages.length} คน`)
  }

  closeAssignModal()
}

onMounted(async () => {
  loading.value = true
  
  await Promise.all([
    plansStore.fetchPlanDetail(route.params.id),
    progressStore.fetchProgressByPlan(route.params.id),
    dataStore.fetchAthletes()
  ])
  
  loading.value = false
})
</script>

<style scoped>
.plan-detail-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: 48px;
  color: #737373;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #737373;
  text-decoration: none;
  font-size: 14px;
}

.back-link:hover {
  color: #171717;
}

.back-link svg {
  width: 16px;
  height: 16px;
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

.btn-primary:disabled {
  background: #A3A3A3;
  cursor: not-allowed;
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

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #171717;
}

.stat-label {
  font-size: 13px;
  color: #737373;
}

/* Sections */
.section {
  margin-bottom: 32px;
}

.section h2 {
  font-size: 18px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  margin: 0;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
}

/* Levels Grid */
.levels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.level-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 16px;
}

.level-card.has-athletes {
  border-color: #171717;
}

.level-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.level-number {
  width: 24px;
  height: 24px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.level-name {
  font-weight: 500;
  color: #171717;
}

.level-description {
  font-size: 13px;
  color: #737373;
  margin: 0 0 8px;
}

.level-athletes {
  font-size: 12px;
  color: #737373;
}

/* Athletes List */
.athletes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.athlete-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.athlete-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.athlete-details h4 {
  font-size: 14px;
  font-weight: 500;
  color: #171717;
  margin: 0;
}

.athlete-details p {
  font-size: 12px;
  color: #737373;
  margin: 2px 0 0;
}

.progress-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-info {
  min-width: 100px;
}

.current-level {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  display: block;
}

.progress-info .level-name {
  font-size: 12px;
  color: #737373;
  font-weight: normal;
}

.progress-bar-container {
  flex: 1;
  height: 8px;
  background: #E5E5E5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #171717;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 13px;
  color: #737373;
  min-width: 50px;
  text-align: right;
}

.athlete-actions {
  display: flex;
  gap: 8px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px;
  color: #737373;
  background: #FAFAFA;
  border-radius: 12px;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state.small {
  padding: 24px;
}

/* Form */
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

.athlete-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #FAFAFA;
  border-radius: 8px;
}

.athlete-preview h4 {
  margin: 0;
  font-size: 14px;
}

.athlete-preview p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #737373;
}

/* History */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  display: flex;
  gap: 12px;
}

.history-icon {
  width: 32px;
  height: 32px;
  background: #D1FAE5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-icon svg {
  width: 16px;
  height: 16px;
  color: #065F46;
}

.history-content {
  flex: 1;
}

.history-levels {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #171717;
}

.history-levels svg {
  width: 16px;
  height: 16px;
  color: #737373;
}

.history-notes {
  font-size: 13px;
  color: #525252;
  margin: 4px 0;
}

.history-date {
  font-size: 12px;
  color: #A3A3A3;
}

/* Assign Modal */
.assign-modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  background: #FAFAFA;
}

.search-box svg {
  width: 18px;
  height: 18px;
  color: #737373;
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.selected-athletes {
  background: #F5F5F5;
  border-radius: 8px;
  padding: 12px;
}

.selected-athletes label {
  font-size: 12px;
  color: #737373;
  display: block;
  margin-bottom: 8px;
}

.selected-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #171717;
  color: #fff;
  padding: 4px 8px 4px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.chip-remove {
  background: transparent;
  border: none;
  padding: 2px;
  cursor: pointer;
  display: flex;
}

.chip-remove svg {
  width: 14px;
  height: 14px;
  color: #fff;
}

.athletes-selection label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  display: block;
  margin-bottom: 8px;
}

.no-athletes {
  text-align: center;
  padding: 24px;
  color: #737373;
  background: #FAFAFA;
  border-radius: 8px;
}

.athletes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.athlete-select-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.athlete-select-card:hover {
  background: #F5F5F5;
}

.athlete-select-card.selected {
  border-color: #171717;
  background: #F5F5F5;
}

.select-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #D4D4D4;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.athlete-select-card.selected .select-checkbox {
  background: #171717;
  border-color: #171717;
}

.select-checkbox svg {
  width: 14px;
  height: 14px;
  color: #fff;
}

.athlete-avatar {
  width: 32px;
  height: 32px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.athlete-select-info {
  flex: 1;
  min-width: 0;
}

.athlete-select-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #171717;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.athlete-select-email {
  display: block;
  font-size: 11px;
  color: #737373;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .athlete-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .athlete-info {
    min-width: auto;
  }

  .progress-section {
    width: 100%;
  }

  .athlete-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .athletes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
