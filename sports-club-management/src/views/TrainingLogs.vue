<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'

const auth = useAuthStore()
const data = useDataStore()

const showModal = ref(false)
const editingId = ref(null)
const selectedCategoryFilter = ref(null)
const showStats = ref(true)
const form = ref({ 
  athlete_id: null, 
  coach_id: null, 
  club_id: null, 
  date: '', 
  duration: 60, 
  activities: '', 
  notes: '', 
  rating: 3,
  category_id: null,
  custom_activity: ''
})

// Statistics data - Requirements 2.1, 2.2, 2.3, 2.4
const weeklyChartData = ref([])
const weeklyComparison = ref(null)
const categoryDistribution = ref([])
const statsLoading = ref(false)

// Goal data - Requirements 3.1, 3.3, 3.4, 3.5
const goalProgress = ref(null)
const showGoalModal = ref(false)
const goalForm = ref({ target_value: 3 })

// Streak and achievements data - Requirements 4.1, 4.2, 4.3, 4.4
const currentStreak = ref(0)
const userAchievements = ref([])
const nextMilestone = ref(null)

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
    const [chartData, comparison, distribution, progress, streakResult, achievements] = await Promise.all([
      data.getWeeklyChartData(userId),
      data.getWeeklyComparison(userId),
      data.getCategoryDistribution(userId),
      data.getGoalProgress(userId),
      data.checkAndAwardAchievements(userId),
      data.fetchUserAchievements(userId)
    ])
    
    weeklyChartData.value = chartData
    weeklyComparison.value = comparison
    categoryDistribution.value = distribution
    goalProgress.value = progress
    currentStreak.value = streakResult?.currentStreak || 0
    userAchievements.value = achievements || []
    nextMilestone.value = data.getNextMilestone(currentStreak.value)
    
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

// Get achievement display info - Requirements 4.4
function getAchievementInfo(achievementType) {
  return data.getAchievementInfo(achievementType)
}

// Computed stats from filtered logs - Requirements 2.1
const totalSessions = computed(() => filteredLogs.value.length)
const totalHours = computed(() => {
  const minutes = filteredLogs.value.reduce((sum, log) => sum + (log.duration || 0), 0)
  return Math.round((minutes / 60) * 10) / 10
})
const avgRating = computed(() => {
  if (filteredLogs.value.length === 0) return 0
  const total = filteredLogs.value.reduce((sum, log) => sum + (log.rating || 0), 0)
  return Math.round((total / filteredLogs.value.length) * 10) / 10
})

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

function openAdd() {
  editingId.value = null
  form.value = { 
    athlete_id: currentAthlete.value?.id || availableAthletes.value[0]?.id || null, 
    coach_id: currentCoach.value?.id || null,
    club_id: currentCoach.value?.club_id || currentAthlete.value?.club_id || null,
    date: new Date().toISOString().split('T')[0], 
    duration: 60, 
    activities: '', 
    notes: '', 
    rating: 3,
    category_id: data.activityCategories[0]?.id || null,
    custom_activity: ''
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
    rating: log.rating,
    category_id: log.category_id || null,
    custom_activity: log.custom_activity || ''
  }
  showModal.value = true
}

async function save() {
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
        <button v-if="!auth.isAthlete || currentAthlete" class="btn btn-sm btn-primary" @click="openAdd">+ เพิ่ม</button>
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
            <div class="mini-stat">
              <span class="mini-stat-value">{{ avgRating || '—' }}</span>
              <span class="mini-stat-label">คะแนนเฉลี่ย</span>
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
      
      <!-- Streak and Achievements Section - Requirements 4.1, 4.2, 4.3, 4.4 -->
      <div class="streak-section">
        <!-- Current Streak Display - Requirements 4.3 -->
        <div class="streak-display">
          <div class="streak-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="streak-info">
            <span class="streak-count">{{ currentStreak }}</span>
            <span class="streak-label">วันติดต่อกัน</span>
          </div>
          <div v-if="currentStreak === 0" class="streak-message">
            <span>เริ่มต้นใหม่วันนี้!</span>
          </div>
          <div v-else-if="nextMilestone" class="streak-next">
            <span>อีก {{ nextMilestone.daysRemaining }} วัน ถึง {{ nextMilestone.milestone }} วัน</span>
          </div>
          <div v-else class="streak-max">
            <span>บรรลุทุกเป้าหมายแล้ว!</span>
          </div>
        </div>
        
        <!-- Achievement Badges - Requirements 4.4 -->
        <div class="achievements-section">
          <h3 class="achievements-title">รางวัลที่ได้รับ</h3>
          
          <div v-if="userAchievements.length === 0" class="no-achievements">
            <p>ยังไม่มีรางวัล - ฝึกซ้อมต่อเนื่องเพื่อรับรางวัล!</p>
          </div>
          
          <div v-else class="achievements-grid">
            <div 
              v-for="achievement in userAchievements" 
              :key="achievement.id" 
              class="achievement-badge"
              :title="getAchievementInfo(achievement.achievement_type).description"
            >
              <div class="badge-icon">
                <svg v-if="getAchievementInfo(achievement.achievement_type).icon === 'star'" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <svg v-else-if="getAchievementInfo(achievement.achievement_type).icon === 'fire'" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/>
                </svg>
                <svg v-else-if="getAchievementInfo(achievement.achievement_type).icon === 'trophy'" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
                </svg>
                <svg v-else-if="getAchievementInfo(achievement.achievement_type).icon === 'medal'" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                </svg>
                <svg v-else-if="getAchievementInfo(achievement.achievement_type).icon === 'crown'" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <span class="badge-name">{{ getAchievementInfo(achievement.achievement_type).name }}</span>
            </div>
          </div>
          
          <!-- Next Milestone Preview -->
          <div v-if="nextMilestone" class="next-milestone">
            <span class="milestone-label">เป้าหมายถัดไป:</span>
            <span class="milestone-value">ฝึกซ้อมติดต่อกัน {{ nextMilestone.milestone }} วัน</span>
          </div>
        </div>
      </div>

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

.mini-stats { display: flex; gap: 12px; }
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

/* Streak Section - Requirements 4.1, 4.2, 4.3 */
.streak-section {
  background: var(--white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--gray-100);
  padding: 16px;
  margin-bottom: 20px;
}

.streak-display {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--gray-900);
  border-radius: var(--radius-md);
  color: var(--white);
  margin-bottom: 16px;
}

.streak-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.streak-icon svg {
  color: var(--white);
}

.streak-info {
  flex: 1;
}

.streak-count {
  display: block;
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
}

.streak-label {
  font-size: 13px;
  opacity: 0.8;
}

.streak-message,
.streak-next,
.streak-max {
  font-size: 12px;
  opacity: 0.7;
  text-align: right;
}

/* Achievements Section - Requirements 4.4 */
.achievements-section {
  margin-top: 8px;
}

.achievements-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-700);
  margin: 0 0 12px;
}

.no-achievements {
  text-align: center;
  padding: 16px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
  color: var(--gray-500);
  font-size: 13px;
}

.achievements-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.achievement-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
  min-width: 80px;
  cursor: default;
  transition: transform 0.2s ease;
}

.achievement-badge:hover {
  transform: scale(1.05);
}

.badge-icon {
  width: 40px;
  height: 40px;
  background: var(--gray-900);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-icon svg {
  color: #FFD700;
}

.badge-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--gray-700);
  text-align: center;
}

.next-milestone {
  margin-top: 16px;
  padding: 12px;
  background: var(--gray-50);
  border-radius: var(--radius-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.milestone-label {
  font-size: 12px;
  color: var(--gray-500);
}

.milestone-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-700);
}

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
</style>
