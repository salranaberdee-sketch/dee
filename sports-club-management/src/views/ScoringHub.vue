<template>
  <div class="scoring-hub">
    <!-- Loading Skeleton -->
    <template v-if="initialLoading">
      <div class="skeleton-banner"></div>
      <div class="skeleton-list">
        <div class="skeleton-item" v-for="i in 5" :key="i"></div>
      </div>
    </template>

    <!-- Main Content -->
    <template v-else>
      <!-- Header -->
      <div class="hub-header">
        <h1>ศูนย์คะแนน</h1>
        <p class="subtitle">คะแนนนักกีฬาประจำเดือน {{ monthLabel }}</p>
      </div>

      <!-- Month Selector -->
      <div class="month-selector">
        <button class="month-btn" @click="prevMonth">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="month-label">{{ monthLabel }}</span>
        <button class="month-btn" @click="nextMonth" :disabled="isCurrentMonth">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <router-link to="/scoring-config" class="action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          ตั้งค่าเกณฑ์
        </router-link>
        <router-link to="/scoring-conditions" class="action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          โบนัส/หัก
        </router-link>
      </div>

      <!-- Summary Stats -->
      <div class="summary-stats" v-if="athleteStats.length > 0">
        <div class="stat-item">
          <span class="stat-value">{{ athleteStats.length }}</span>
          <span class="stat-label">นักกีฬา</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ avgScore }}</span>
          <span class="stat-label">คะแนนเฉลี่ย</span>
        </div>
        <div class="stat-item excellent">
          <span class="stat-value">{{ excellentCount }}</span>
          <span class="stat-label">ดีเยี่ยม</span>
        </div>
        <div class="stat-item needs-improvement">
          <span class="stat-value">{{ needsImprovementCount }}</span>
          <span class="stat-label">ต้องปรับปรุง</span>
        </div>
      </div>

      <!-- Athletes List -->
      <div v-if="statsLoading" class="loading-state">
        <div class="spinner"></div>
        <span>กำลังคำนวณคะแนน...</span>
      </div>

      <div v-else-if="athleteStats.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <p>ยังไม่มีข้อมูลนักกีฬา</p>
        <p class="hint">เพิ่มนักกีฬาและบันทึกการเข้าร่วมเพื่อดูคะแนน</p>
      </div>

      <div v-else class="athletes-list">
        <div 
          v-for="athlete in athleteStats" 
          :key="athlete.athlete_id"
          class="athlete-card"
          @click="viewAthleteDetail(athlete)"
        >
          <!-- Score Circle -->
          <div class="score-circle" :class="athlete.performance_tier">
            <span class="score">{{ Math.round(athlete.overall_score) }}</span>
          </div>

          <!-- Athlete Info -->
          <div class="athlete-info">
            <h3>{{ athlete.athlete_name }}</h3>
            <div class="tier-badge" :class="athlete.performance_tier">
              {{ getTierLabel(athlete.performance_tier) }}
            </div>
          </div>

          <!-- Score Breakdown -->
          <div class="score-breakdown">
            <div class="breakdown-item">
              <span class="label">เข้าร่วม</span>
              <span class="value">{{ Math.round(athlete.attendance_rate) }}%</span>
            </div>
            <div class="breakdown-item">
              <span class="label">ฝึกซ้อม</span>
              <span class="value">{{ athlete.training_sessions }} ครั้ง</span>
            </div>
            <div class="breakdown-item" v-if="athlete.bonus_points > 0">
              <span class="label bonus">โบนัส</span>
              <span class="value bonus">+{{ athlete.bonus_points }}</span>
            </div>
            <div class="breakdown-item" v-if="athlete.penalty_points > 0">
              <span class="label penalty">หัก</span>
              <span class="value penalty">-{{ athlete.penalty_points }}</span>
            </div>
          </div>

          <!-- Arrow -->
          <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEvaluationStore } from '@/stores/evaluation'
import { useAuthStore } from '@/stores/auth'
import { useScoringConfigStore } from '@/stores/scoringConfig'

const router = useRouter()
const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()
const scoringConfigStore = useScoringConfigStore()

// State
const initialLoading = ref(true)
const statsLoading = ref(false)
const selectedMonth = ref(new Date().toISOString().slice(0, 7))

// Computed
const clubId = computed(() => authStore.profile?.club_id)
const athleteStats = computed(() => evaluationStore.athleteStats || [])

const monthLabel = computed(() => {
  const [year, month] = selectedMonth.value.split('-')
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${monthNames[parseInt(month) - 1]} ${parseInt(year) + 543}`
})

const isCurrentMonth = computed(() => {
  return selectedMonth.value === new Date().toISOString().slice(0, 7)
})

const avgScore = computed(() => {
  if (athleteStats.value.length === 0) return 0
  const sum = athleteStats.value.reduce((acc, a) => acc + (a.overall_score || 0), 0)
  return Math.round(sum / athleteStats.value.length)
})

const excellentCount = computed(() => {
  return athleteStats.value.filter(a => a.performance_tier === 'excellent').length
})

const needsImprovementCount = computed(() => {
  return athleteStats.value.filter(a => a.performance_tier === 'needs_improvement').length
})

// Methods
function getTierLabel(tier) {
  return evaluationStore.getTierLabel(tier)
}

function prevMonth() {
  const date = new Date(selectedMonth.value + '-01')
  date.setMonth(date.getMonth() - 1)
  selectedMonth.value = date.toISOString().slice(0, 7)
}

function nextMonth() {
  if (isCurrentMonth.value) return
  const date = new Date(selectedMonth.value + '-01')
  date.setMonth(date.getMonth() + 1)
  selectedMonth.value = date.toISOString().slice(0, 7)
}

function viewAthleteDetail(athlete) {
  router.push(`/evaluation/${athlete.athlete_id}?month=${selectedMonth.value}`)
}

async function loadData() {
  if (!clubId.value) {
    initialLoading.value = false
    return
  }

  try {
    // โหลด config ก่อน
    await scoringConfigStore.fetchClubConfig(clubId.value)
    initialLoading.value = false

    // โหลดคะแนนนักกีฬา
    statsLoading.value = true
    await evaluationStore.calculateAthleteStats(clubId.value, selectedMonth.value)
  } catch (err) {
    console.error('Error loading data:', err)
  } finally {
    initialLoading.value = false
    statsLoading.value = false
  }
}

// Watch เดือนที่เลือก
watch(selectedMonth, async () => {
  if (clubId.value) {
    statsLoading.value = true
    await evaluationStore.calculateAthleteStats(clubId.value, selectedMonth.value)
    statsLoading.value = false
  }
})

// Watch clubId
watch(clubId, (newId) => {
  if (newId) loadData()
})

onMounted(() => {
  loadData()
})
</script>


<style scoped>
.scoring-hub {
  padding: 1rem;
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 5rem;
}

/* Header */
.hub-header {
  margin-bottom: 1rem;
}

.hub-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #171717;
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: #737373;
  margin: 0.25rem 0 0;
}

/* Month Selector */
.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #F5F5F5;
  border-radius: 8px;
}

.month-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  cursor: pointer;
}

.month-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.month-btn svg {
  width: 18px;
  height: 18px;
  color: #525252;
}

.month-label {
  font-weight: 600;
  color: #171717;
  min-width: 100px;
  text-align: center;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #525252;
  text-decoration: none;
  transition: all 0.15s;
}

.action-btn:hover {
  background: #F5F5F5;
  border-color: #D4D4D4;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

/* Summary Stats */
.summary-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0.5rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #171717;
}

.stat-label {
  font-size: 0.7rem;
  color: #737373;
  margin-top: 0.25rem;
}

.stat-item.excellent .stat-value { color: #22C55E; }
.stat-item.needs-improvement .stat-value { color: #EF4444; }

/* Athletes List */
.athletes-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.athlete-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.athlete-card:hover {
  border-color: #D4D4D4;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

/* Score Circle */
.score-circle {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.score-circle.excellent { background: #D1FAE5; }
.score-circle.good { background: #DBEAFE; }
.score-circle.average { background: #FEF3C7; }
.score-circle.needs_improvement { background: #FEE2E2; }

.score-circle .score {
  font-size: 1rem;
  font-weight: 700;
}

.score-circle.excellent .score { color: #065F46; }
.score-circle.good .score { color: #1E40AF; }
.score-circle.average .score { color: #92400E; }
.score-circle.needs_improvement .score { color: #991B1B; }

/* Athlete Info */
.athlete-info {
  flex: 1;
  min-width: 0;
}

.athlete-info h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #171717;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tier-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  margin-top: 0.25rem;
}

.tier-badge.excellent { background: #D1FAE5; color: #065F46; }
.tier-badge.good { background: #DBEAFE; color: #1E40AF; }
.tier-badge.average { background: #FEF3C7; color: #92400E; }
.tier-badge.needs_improvement { background: #FEE2E2; color: #991B1B; }

/* Score Breakdown */
.score-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.7rem;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.breakdown-item .label {
  color: #737373;
}

.breakdown-item .value {
  font-weight: 500;
  color: #171717;
}

.breakdown-item .label.bonus,
.breakdown-item .value.bonus { color: #22C55E; }

.breakdown-item .label.penalty,
.breakdown-item .value.penalty { color: #EF4444; }

/* Arrow Icon */
.arrow-icon {
  width: 20px;
  height: 20px;
  color: #A3A3A3;
  flex-shrink: 0;
}

/* Loading & Empty States */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #737373;
}

.loading-state .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 0.75rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  width: 48px;
  height: 48px;
  color: #D4D4D4;
  margin-bottom: 0.75rem;
}

.empty-state p {
  margin: 0;
  font-size: 0.9rem;
}

.empty-state .hint {
  font-size: 0.8rem;
  color: #A3A3A3;
  margin-top: 0.25rem;
}

/* Skeleton */
.skeleton-banner {
  height: 80px;
  background: linear-gradient(90deg, #F5F5F5 25%, #E5E5E5 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-item {
  height: 80px;
  background: linear-gradient(90deg, #F5F5F5 25%, #E5E5E5 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 12px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Responsive */
@media (max-width: 480px) {
  .summary-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .score-breakdown {
    display: none;
  }
  
  .athlete-card {
    padding: 0.75rem;
  }
}
</style>
