<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'
import TimerModal from '@/components/TimerModal.vue'

const auth = useAuthStore()
const data = useDataStore()

const showTimerModal = ref(false)
const showModal = ref(false)
const editingId = ref(null)
const selectedCategoryFilter = ref(null)
const showStats = ref(false) // ซ่อน Stats section เป็น default
const form = ref({ 
  athlete_id: null, 
  coach_id: null, 
  club_id: null, 
  date: '', 
  duration: 60, 
  activities: '', 
  notes: '', 
  category_id: null,
  custom_activity: ''
})
const validationError = ref('') // สำหรับแสดง error message

// Statistics data - Requirements 2.1, 2.2, 2.3, 2.4
const weeklyChartData = ref([])
const weeklyComparison = ref(null)
const categoryDistribution = ref([])
const statsLoading = ref(false)

// Goal data - Requirements 3.1, 3.3, 3.4, 3.5
const goalProgress = ref(null)
const showGoalModal = ref(false)
const goalForm = ref({ target_value: 3 })

// Streak และ achievements ถูกลบ - ลดความซับซ้อน

// Find the "อื่นๆ" category for custom activity input
const otherCategory = computed(() => {
  return data.activityCategories.find(c => c.name === 'อื่นๆ')
})

const isOtherCategorySelected = computed(() => {
  return form.value.category_id && otherCategory.value && form.value.category_id === otherCategory.value.id
})

onMounted(async () => {
  await Promise.all([
    data.fetchTrainingLogs(), 
    data.fetchAthletes(), 
    data.fetchCoaches(),
    data.fetchActivityCategories()
  ])
  
  // Load statistics after initial data
  await loadStatistics()
})

// Load statistics data - Requirements 2.1, 2.2, 2.3, 2.4, 2.5
async function loadStatistics() {
  const userId = auth.profile?.id
  if (!userId) return
  
  statsLoading.value = true
  try {
    const [chartData, comparison, distribution, progress] = await Promise.all([
      data.getWeeklyChartData(userId),
      data.getWeeklyComparison(userId),
      data.getCategoryDistribution(userId),
      data.getGoalProgress(userId)
    ])
    
    weeklyChartData.value = chartData
    weeklyComparison.value = comparison
    categoryDistribution.value = distribution
    goalProgress.value = progress
    
    // Set goal form with current goal value
    if (progress?.goal) {
      goalForm.value.target_value = progress.goal.target_value || 3
    }
  } catch (err) {
    console.error('Failed to load statistics:', err)
  } finally {
    statsLoading.value = false
  }
}

// Goal functions - Requirements 3.1, 3.2
function openGoalSettings() {
  if (goalProgress.value?.goal) {
    goalForm.value.target_value = goalProgress.value.goal.target_value || 3
  }
  showGoalModal.value = true
}

async function saveGoal() {
  const userId = auth.profile?.id
  if (!userId) return
  
  const result = await data.setUserGoal(userId, goalForm.value)
  if (result.success) {
    // Reload goal progress
    goalProgress.value = await data.getGoalProgress(userId)
    showGoalModal.value = false
  } else {
    alert(result.message || 'ไม่สามารถบันทึกเป้าหมายได้')
  }
}

// getAchievementInfo ถูกลบ - ลดความซับซ้อน

// Computed stats from filtered logs - Requirements 2.1
const totalSessions = computed(() => filteredLogs.value.length)
const totalHours = computed(() => {
  const minutes = filteredLogs.value.reduce((sum, log) => sum + (log.duration || 0), 0)
  return Math.round((minutes / 60) * 10) / 10
})
// avgRating ถูกลบ - ไม่ใช้ระบบคะแนน

// Get max sessions for chart scaling
const maxChartSessions = computed(() => {
  if (!weeklyChartData.value.length) return 1
  return Math.max(...weeklyChartData.value.map(d => d.sessions), 1)
})

// Filter logs by selected category
const filteredLogs = computed(() => {
  if (!selectedCategoryFilter.value) {
    return data.trainingLogs
  }
  return data.filterLogsByCategory(selectedCategoryFilter.value)
})

const sortedLogs = computed(() => [...filteredLogs.value].sort((a, b) => new Date(b.date) - new Date(a.date)))

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

function getCategoryName(log) {
  if (log.activity_categories?.name) {
    return log.activity_categories.name
  }
  if (log.category_id) {
    const cat = data.getCategoryById(log.category_id)
    return cat?.name || null
  }
  return null
}

function getCategoryIcon(log) {
  if (log.activity_categories?.icon) {
    return log.activity_categories.icon
  }
  if (log.category_id) {
    const cat = data.getCategoryById(log.category_id)
    return cat?.icon || null
  }
  return null
}

// เปิด Timer Modal
function openTimer() {
  showTimerModal.value = true
}

// เปิด Manual Entry Modal
function openAdd() {
  editingId.value = null
  validationError.value = '' // Clear validation error
  form.value = { 
    athlete_id: currentAthlete.value?.id || availableAthletes.value[0]?.id || null, 
    coach_id: currentCoach.value?.id || null,
    club_id: currentCoach.value?.club_id || currentAthlete.value?.club_id || null,
    date: new Date().toISOString().split('T')[0], 
    duration: 60, 
    activities: '', 
    notes: '', 
    category_id: data.activityCategories[0]?.id || null,
    custom_activity: ''
  }
  showModal.value = true
}

function openEdit(log) {
  editingId.value = log.id
  validationError.value = '' // Clear validation error
  form.value = { 
    athlete_id: log.athlete_id,
    coach_id: log.coach_id,
    club_id: log.club_id,
    date: log.date,
    duration: log.duration,
    activities: log.activities,
    notes: log.notes,
    category_id: log.category_id || null,
    custom_activity: log.custom_activity || ''
  }
  showModal.value = true
}

// บันทึกจาก Timer Modal
async function saveFromTimer(logData) {
  const payload = {
    ...logData,
    coach_id: currentCoach.value?.id || null,
    club_id: currentCoach.value?.club_id || currentAthlete.value?.club_id || null
  }
  
  // ถ้าเป็น Athlete ใช้ athlete_id ของตัวเอง
  if (auth.isAthlete) {
    payload.athlete_id = currentAthlete.value?.id
  }
  
  await data.addTrainingLog(payload)
  showTimerModal.value = false
  
  // Reload statistics
  await loadStatistics()
}

// Validate form - Requirements 3.3
function validateForm() {
  validationError.value = ''
  
  // ตรวจสอบนักกีฬา (สำหรับ Coach/Admin)
  if (!auth.isAthlete && !form.value.athlete_id) {
    validationError.value = 'กรุณาเลือกนักกีฬา'
    return false
  }
  
  // ตรวจสอบวันที่
  if (!form.value.date) {
    validationError.value = 'กรุณาระบุวันที่'
    return false
  }
  
  // ตรวจสอบระยะเวลา
  if (!form.value.duration || form.value.duration <= 0) {
    validationError.value = 'ระยะเวลาต้องมากกว่า 0 นาที'
    return false
  }
  
  // ตรวจสอบกิจกรรม
  if (!form.value.activities || form.value.activities.trim() === '') {
    validationError.value = 'กรุณากรอกกิจกรรมที่ฝึก'
    return false
  }
  
  return true
}

// บันทึกจาก Manual Entry Modal
async function save() {
  // Validate form - Requirements 3.3
  if (!validateForm()) {
    return
  }
  
  const payload = { ...form.value }
  
  // Clear custom_activity if not "อื่นๆ" category
  if (!isOtherCategorySelected.value) {
    payload.custom_activity = null
  }
  
  if (editingId.value) {
    await data.updateTrainingLog(editingId.value, payload)
  } else {
    await data.addTrainingLog(payload)
  }
  
  // Clear validation error
  validationError.value = ''
  showModal.value = false
  
  // Reload statistics
  await loadStatistics()
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

function clearCategoryFilter() {
  selectedCategoryFilter.value = null
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">บันทึก</h1>
      <div class="header-actions">
        <router-link v-if="auth.isAdmin" to="/category-management" class="btn btn-sm btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          จัดการหมวดหมู่
        </router-link>
        <button v-if="!auth.isAthlete || currentAthlete" class="btn btn-sm btn-secondary" @click="openAdd">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          บันทึกด้วยตนเอง
        </button>
        <button v-if="!auth.isAthlete || currentAthlete" class="btn btn-sm btn-primary" @click="openTimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          เริ่มฝึก
        </button>
      </div>
    </div>

    <div class="container">
      <!-- Category Filter -->
      <div class="filter-section">
        <label class="filter-label">กรองตามหมวดหมู่</label>
        <div class="filter-row">
          <select v-model="selectedCategoryFilter" class="form-control filter-select">
            <option :value="null">ทั้งหมด</option>
            <option v-for="cat in data.activityCategories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <button v-if="selectedCategoryFilter" class="btn btn-sm btn-secondary" @click="clearCategoryFilter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Statistics Section - Requirements 2.1, 2.2, 2.3, 2.4, 2.5 -->
      <div class="stats-section">
        <div class="stats-header" @click="showStats = !showStats">
          <h2 class="stats-title">สถิติการฝึกซ้อม</h2>
          <svg :class="['chevron', { rotated: !showStats }]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        
        <div v-show="showStats" class="stats-content">
          <!-- Summary Stats - Requirements 2.1 -->
          <div class="mini-stats">
            <div class="mini-stat">
              <span class="mini-stat-value">{{ totalSessions }}</span>
              <span class="mini-stat-label">บันทึก</span>
            </div>
            <div class="mini-stat">
              <span class="mini-stat-value">{{ totalHours }}</span>
              <span class="mini-stat-label">ชั่วโมง</span>
            </div>
          </div>
          
          <!-- Week-over-Week Comparison - Requirements 2.4 -->
          <div v-if="weeklyComparison" class="comparison-section">
            <h3 class="section-subtitle">เปรียบเทียบรายสัปดาห์</h3>
            <div class="comparison-grid">
              <div class="comparison-item">
                <span class="comparison-label">สัปดาห์นี้</span>
                <span class="comparison-value">{{ weeklyComparison.currentWeek?.totalSessions || 0 }} ครั้ง</span>
              </div>
              <div class="comparison-item">
                <span class="comparison-label">สัปดาห์ก่อน</span>
                <span class="comparison-value">{{ weeklyComparison.previousWeek?.totalSessions || 0 }} ครั้ง</span>
              </div>
              <div class="comparison-item">
                <span class="comparison-label">เปลี่ยนแปลง</span>
                <span :class="['comparison-value', 'change', { positive: weeklyComparison.change?.sessions > 0, negative: weeklyComparison.change?.sessions < 0 }]">
                  {{ weeklyComparison.change?.sessions > 0 ? '+' : '' }}{{ weeklyComparison.change?.sessions || 0 }}%
                </span>
              </div>
            </div>
          </div>
          
          <!-- Weekly Bar Chart - Requirements 2.2 -->
          <div v-if="weeklyChartData.length" class="chart-section">
            <h3 class="section-subtitle">กราฟรายสัปดาห์</h3>
            <div class="bar-chart">
              <div v-for="day in weeklyChartData" :key="day.date" class="bar-item">
                <div class="bar-container">
                  <div 
                    class="bar" 
                    :style="{ height: `${(day.sessions / maxChartSessions) * 100}%` }"
                    :title="`${day.sessions} ครั้ง`"
                  >
                    <span v-if="day.sessions > 0" class="bar-value">{{ day.sessions }}</span>
                  </div>
                </div>
                <span class="bar-label">{{ day.dayName }}</span>
              </div>
            </div>
          </div>
          
          <!-- Category Distribution - Requirements 2.3 -->
          <div v-if="categoryDistribution.length" class="distribution-section">
            <h3 class="section-subtitle">การกระจายตามหมวดหมู่</h3>
            <div class="distribution-list">
              <div v-for="cat in categoryDistribution" :key="cat.categoryId" class="distribution-item">
                <div class="distribution-info">
                  <span class="distribution-name">{{ cat.categoryName }}</span>
                  <span class="distribution-count">{{ cat.count }} ครั้ง</span>
                </div>
                <div class="distribution-bar-bg">
                  <div class="distribution-bar" :style="{ width: `${cat.percentage}%` }"></div>
                </div>
                <span class="distribution-percent">{{ cat.percentage }}%</span>
              </div>
            </div>
          </div>
          
          <!-- No Data State - Requirements 2.5 -->
          <div v-if="!statsLoading && totalSessions === 0" class="no-stats">
            <p>ยังไม่มีข้อมูลสถิติ</p>
          </div>
        </div>
      </div>
      
      <!-- Goal Progress Section - Requirements 3.1, 3.3, 3.4, 3.5 -->
      <div class="goal-section">
        <div class="goal-header">
          <h2 class="goal-title">เป้าหมายรายสัปดาห์</h2>
          <button class="btn btn-sm btn-secondary" @click="openGoalSettings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            ตั้งค่า
          </button>
        </div>
        
        <div class="goal-content">
          <div class="goal-info">
            <span class="goal-target">
              เป้าหมาย: {{ goalProgress?.targetValue || 3 }} ครั้ง/สัปดาห์
            </span>
            <span class="goal-current">
              ฝึกแล้ว: {{ goalProgress?.progress || 0 }} ครั้ง
            </span>
          </div>
          
          <!-- Progress Bar -->
          <div class="progress-bar-container">
            <div 
              class="progress-bar" 
              :style="{ width: `${goalProgress?.percentage || 0}%` }"
              :class="{ completed: goalProgress?.isCompleted }"
            ></div>
          </div>
          
          <!-- Completion Indicator - Requirements 3.4 -->
          <div v-if="goalProgress?.isCompleted" class="goal-completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>บรรลุเป้าหมายแล้ว!</span>
          </div>
          
          <div v-else class="goal-remaining">
            <span>เหลืออีก {{ (goalProgress?.targetValue || 3) - (goalProgress?.progress || 0) }} ครั้ง</span>
          </div>
        </div>
      </div>
      
      <!-- Streak Section ถูกลบ - ลดความซับซ้อน -->

      <div v-if="sortedLogs.length === 0" class="card">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
          </div>
          <p v-if="selectedCategoryFilter">ไม่มีบันทึกในหมวดหมู่นี้</p>
          <p v-else>ยังไม่มีบันทึก</p>
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
              <div class="log-header">
                <h3>{{ log.activities }}</h3>
                <!-- Category Badge -->
                <span v-if="getCategoryName(log)" class="category-badge">
                  {{ getCategoryName(log) }}
                </span>
              </div>
              <p class="log-meta">{{ getAthleteName(log) }} · {{ log.duration }} นาที</p>
              <!-- Show custom activity if "อื่นๆ" category -->
              <p v-if="log.custom_activity" class="log-custom-activity">{{ log.custom_activity }}</p>
            </div>
          </div>
          <p v-if="log.notes" class="log-notes">{{ log.notes }}</p>
        </div>
      </div>
    </div>

    <button class="fab" @click="openAdd">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <!-- Timer Modal -->
    <TimerModal
      :show="showTimerModal"
      :is-coach="auth.isCoach"
      :is-admin="auth.isAdmin"
      :athletes="availableAthletes"
      :activity-categories="data.activityCategories"
      @close="showTimerModal = false"
      @save="saveFromTimer"
    />

    <!-- Manual Entry Modal -->
    <Modal :show="showModal" :title="editingId ? 'แก้ไขบันทึก' : 'บันทึกด้วยตนเอง'" @close="showModal = false">
      <!-- Validation Error Message - Requirements 3.3 -->
      <div v-if="validationError" class="validation-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ validationError }}</span>
      </div>
      
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
        
        <!-- Category Dropdown - Requirements 1.1 -->
        <div class="form-group">
          <label>หมวดหมู่กิจกรรม</label>
          <select v-model="form.category_id" class="form-control">
            <option :value="null">ไม่ระบุหมวดหมู่</option>
            <option v-for="cat in data.activityCategories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
        
        <!-- Custom Activity Input - Requirements 1.5 -->
        <div v-if="isOtherCategorySelected" class="form-group">
          <label>ระบุกิจกรรม (อื่นๆ)</label>
          <input 
            v-model="form.custom_activity" 
            class="form-control" 
            placeholder="ระบุกิจกรรมที่ฝึก"
          />
        </div>
        
        <div class="form-group">
          <label>กิจกรรมที่ฝึก</label>
          <input v-model="form.activities" class="form-control" placeholder="เช่น วิ่ง 5 กม." required />
        </div>
        <div class="form-group">
          <label>บันทึกเพิ่มเติม</label>
          <textarea v-model="form.notes" class="form-control" rows="3" placeholder="สภาพร่างกาย, ความรู้สึก"></textarea>
        </div>
      </form>
      <template #footer>
        <button v-if="editingId" class="btn btn-danger" @click="remove">ลบ</button>
        <button class="btn btn-secondary" @click="showModal = false">ยกเลิก</button>
        <button class="btn btn-primary" @click="save">บันทึก</button>
      </template>
    </Modal>
    
    <!-- Goal Settings Modal - Requirements 3.1, 3.2 -->
    <Modal :show="showGoalModal" title="ตั้งเป้าหมายการฝึก" @close="showGoalModal = false">
      <form @submit.prevent="saveGoal">
        <div class="form-group">
          <label>จำนวนครั้งต่อสัปดาห์</label>
          <select v-model.number="goalForm.target_value" class="form-control">
            <option v-for="n in 7" :key="n" :value="n">{{ n }} ครั้ง</option>
          </select>
          <p class="form-hint">เลือกจำนวนครั้งที่ต้องการฝึกซ้อมต่อสัปดาห์ (1-7 ครั้ง)</p>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-secondary" @click="showGoalModal = false">ยกเลิก</button>
        <button class="btn btn-primary" @click="saveGoal">บันทึก</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filter-section {
  margin-bottom: 16px;
}

.filter-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-600);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filter-select {
  flex: 1;
  max-width: 200px;
}

/* Statistics Section - Requirements 2.1, 2.2, 2.3, 2.4 */
.stats-section {
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-100);
  margin-bottom: 20px;
  overflow: hidden;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  user-select: none;
}

.stats-header:hover {
  background: var(--gray-50);
}

.stats-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--gray-900);
}

.chevron {
  transition: transform 0.2s ease;
  color: var(--gray-500);
}

.chevron.rotated {
  transform: rotate(-90deg);
}

.stats-content {
  padding: 0 16px 16px;
}

.section-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--gray-700);
  margin: 16px 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mini-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.mini-stat { 
  flex: 1; background: var(--gray-50); border-radius: var(--radius-md);
  padding: 12px; text-align: center;
}
.mini-stat-value { display: block; font-size: 20px; font-weight: 700; color: var(--gray-900); }
.mini-stat-label { font-size: 10px; color: var(--gray-500); text-transform: uppercase; }

/* Week Comparison - Requirements 2.4 */
.comparison-section {
  margin-top: 16px;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.comparison-item {
  text-align: center;
  padding: 8px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
}

.comparison-label {
  display: block;
  font-size: 11px;
  color: var(--gray-500);
  margin-bottom: 4px;
}

.comparison-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
}

.comparison-value.change.positive {
  color: #22C55E;
}

.comparison-value.change.negative {
  color: #EF4444;
}

/* Bar Chart - Requirements 2.2 */
.chart-section {
  margin-top: 16px;
}

.bar-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 120px;
  padding: 8px 0;
  gap: 8px;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-container {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  max-width: 32px;
  background: var(--gray-900);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  position: relative;
  transition: height 0.3s ease;
}

.bar-value {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  color: var(--gray-700);
}

.bar-label {
  font-size: 11px;
  color: var(--gray-500);
  margin-top: 6px;
}

/* Category Distribution - Requirements 2.3 */
.distribution-section {
  margin-top: 16px;
}

.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.distribution-info {
  width: 100px;
  flex-shrink: 0;
}

.distribution-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-900);
}

.distribution-count {
  font-size: 11px;
  color: var(--gray-500);
}

.distribution-bar-bg {
  flex: 1;
  height: 8px;
  background: var(--gray-100);
  border-radius: 4px;
  overflow: hidden;
}

.distribution-bar {
  height: 100%;
  background: var(--gray-900);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.distribution-percent {
  width: 40px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-700);
}

.no-stats {
  text-align: center;
  padding: 24px;
  color: var(--gray-500);
  font-size: 14px;
}

/* Goal Section - Requirements 3.1, 3.3, 3.4 */
.goal-section {
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-100);
  padding: 16px;
  margin-bottom: 20px;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.goal-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--gray-900);
}

.goal-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goal-target {
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-700);
}

.goal-current {
  font-size: 14px;
  color: var(--gray-600);
}

.progress-bar-container {
  height: 12px;
  background: var(--gray-100);
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--gray-900);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.progress-bar.completed {
  background: #22C55E;
}

.goal-completed {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #D1FAE5;
  border-radius: var(--radius-md);
  color: #065F46;
  font-weight: 500;
  font-size: 14px;
}

.goal-completed svg {
  color: #22C55E;
}

.goal-remaining {
  text-align: center;
  font-size: 13px;
  color: var(--gray-500);
}

.form-hint {
  font-size: 12px;
  color: var(--gray-500);
  margin-top: 6px;
}

/* Streak และ Achievements styles ถูกลบ - ลดความซับซ้อน */

.logs-list { display: flex; flex-direction: column; gap: 12px; }
.log-row { display: flex; gap: 14px; align-items: flex-start; }
.log-info { flex: 1; min-width: 0; }
.log-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.log-info h3 { font-size: 15px; font-weight: 600; margin: 0; }
.log-meta { font-size: 13px; color: var(--gray-500); }
.log-custom-activity { font-size: 12px; color: var(--gray-600); font-style: italic; margin-top: 2px; }
.log-notes { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gray-100); font-size: 13px; color: var(--gray-600); }

/* Category Badge - Requirements 1.2 */
.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--gray-900);
  color: var(--white);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.empty-state-icon { width: 64px; height: 64px; margin: 0 auto 16px; background: var(--gray-100); border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.empty-state-icon svg { width: 32px; height: 32px; color: var(--gray-400); }

/* Validation Error - Requirements 3.3 */
.validation-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #FEE2E2;
  border: 1px solid #FCA5A5;
  border-radius: var(--radius-md);
  color: #991B1B;
  font-size: 14px;
  margin-bottom: 16px;
}

.validation-error svg {
  flex-shrink: 0;
  color: #DC2626;
}
</style>
