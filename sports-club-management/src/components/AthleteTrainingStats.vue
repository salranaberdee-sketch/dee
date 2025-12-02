<script setup>
/**
 * AthleteTrainingStats Component
 * Displays athlete's training statistics in read-only mode for coaches
 * Requirements: 5.1, 5.2 - Coach can view athlete training stats
 */
import { ref, onMounted, computed } from 'vue'
import { useDataStore } from '@/stores/data'

const props = defineProps({
  athleteId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  }
})

const data = useDataStore()

// Statistics data
const loading = ref(true)
const weeklyChartData = ref([])
const weeklyComparison = ref(null)
const categoryDistribution = ref([])
const goalProgress = ref(null)
const currentStreak = ref(0)
const userAchievements = ref([])
const nextMilestone = ref(null)
const trainingStats = ref({ totalSessions: 0, totalHours: 0, avgRating: 0 })

// Get max sessions for chart scaling
const maxChartSessions = computed(() => {
  if (!weeklyChartData.value.length) return 1
  return Math.max(...weeklyChartData.value.map(d => d.sessions), 1)
})

onMounted(async () => {
  await loadStatistics()
})

async function loadStatistics() {
  if (!props.userId) {
    loading.value = false
    return
  }
  
  loading.value = true
  try {
    const [chartData, comparison, distribution, progress, streakResult, achievements] = await Promise.all([
      data.getWeeklyChartData(props.userId),
      data.getWeeklyComparison(props.userId),
      data.getCategoryDistribution(props.userId),
      data.getGoalProgress(props.userId),
      data.checkAndAwardAchievements(props.userId),
      data.fetchUserAchievements(props.userId)
    ])

    weeklyChartData.value = chartData
    weeklyComparison.value = comparison
    categoryDistribution.value = distribution
    goalProgress.value = progress
    currentStreak.value = streakResult?.currentStreak || 0
    userAchievements.value = achievements || []
    nextMilestone.value = data.getNextMilestone(currentStreak.value)
    
    // Calculate overall stats
    trainingStats.value = {
      totalSessions: progress?.progress || 0,
      totalHours: comparison?.currentWeek?.totalHours || 0,
      avgRating: comparison?.currentWeek?.avgRating || 0
    }
  } catch (err) {
    console.error('Failed to load athlete statistics:', err)
  } finally {
    loading.value = false
  }
}

function getAchievementInfo(achievementType) {
  return data.getAchievementInfo(achievementType)
}
</script>

<template>
  <div class="athlete-stats">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดสถิติ...</p>
    </div>

    <!-- No User ID -->
    <div v-else-if="!userId" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1"/>
      </svg>
      <p>ไม่พบข้อมูลผู้ใช้</p>
    </div>

    <!-- Statistics Content -->
    <div v-else class="stats-content">
      <!-- Read-only Notice -->
      <div class="readonly-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span>โหมดดูอย่างเดียว - ข้อมูลสถิติการฝึกซ้อมของนักกีฬา</span>
      </div>

      <!-- Streak Display - Requirements 4.3 -->
      <div class="streak-section">
        <div class="streak-display">
          <div class="streak-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="streak-info">
            <span class="streak-count">{{ currentStreak }}</span>
            <span class="streak-label">วันติดต่อกัน</span>
          </div>
        </div>
      </div>

      <!-- Goal Progress - Requirements 3.3, 3.4 -->
      <div class="goal-section">
        <h3 class="section-title">เป้าหมายรายสัปดาห์</h3>
        <div class="goal-content">
          <div class="goal-info">
            <span class="goal-target">เป้าหมาย: {{ goalProgress?.targetValue || 3 }} ครั้ง/สัปดาห์</span>
            <span class="goal-current">ฝึกแล้ว: {{ goalProgress?.progress || 0 }} ครั้ง</span>
          </div>
          <div class="progress-bar-container">
            <div 
              class="progress-bar" 
              :style="{ width: `${goalProgress?.percentage || 0}%` }"
              :class="{ completed: goalProgress?.isCompleted }"
            ></div>
          </div>
          <div v-if="goalProgress?.isCompleted" class="goal-completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>บรรลุเป้าหมายแล้ว!</span>
          </div>
        </div>
      </div>

      <!-- Week Comparison - Requirements 2.4 -->
      <div v-if="weeklyComparison" class="comparison-section">
        <h3 class="section-title">เปรียบเทียบรายสัปดาห์</h3>
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
        <h3 class="section-title">กราฟรายสัปดาห์</h3>
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
        <h3 class="section-title">การกระจายตามหมวดหมู่</h3>
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

      <!-- Achievements - Requirements 4.4 -->
      <div class="achievements-section">
        <h3 class="section-title">รางวัลที่ได้รับ</h3>
        <div v-if="userAchievements.length === 0" class="no-achievements">
          <p>ยังไม่มีรางวัล</p>
        </div>
        <div v-else class="achievements-grid">
          <div 
            v-for="achievement in userAchievements" 
            :key="achievement.id" 
            class="achievement-badge"
            :title="getAchievementInfo(achievement.achievement_type).description"
          >
            <div class="badge-icon">
              <svg v-if="getAchievementInfo(achievement.achievement_type).icon === 'star'" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <svg v-else-if="getAchievementInfo(achievement.achievement_type).icon === 'fire'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/>
              </svg>
              <svg v-else-if="getAchievementInfo(achievement.achievement_type).icon === 'trophy'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
              </svg>
              <svg v-else-if="getAchievementInfo(achievement.achievement_type).icon === 'medal'" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
              <svg v-else-if="getAchievementInfo(achievement.achievement_type).icon === 'crown'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <span class="badge-name">{{ getAchievementInfo(achievement.achievement_type).name }}</span>
          </div>
        </div>
      </div>

      <!-- No Data State -->
      <div v-if="!loading && !weeklyChartData.length && !categoryDistribution.length && currentStreak === 0" class="no-data">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1"/>
        </svg>
        <p>ยังไม่มีข้อมูลการฝึกซ้อม</p>
      </div>
    </div>
  </div>
</template>


<style scoped>
.athlete-stats {
  min-height: 200px;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #737373;
}

.loading-state svg, .empty-state svg {
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.readonly-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #F5F5F5;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 13px;
  color: #525252;
}

.readonly-notice svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 12px;
}

/* Streak Section */
.streak-section {
  margin-bottom: 20px;
}

.streak-display {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #171717 0%, #404040 100%);
  border-radius: 12px;
  color: #fff;
}

.streak-icon {
  width: 48px;
  height: 48px;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.streak-icon svg {
  width: 24px;
  height: 24px;
}

.streak-info {
  display: flex;
  flex-direction: column;
}

.streak-count {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.streak-label {
  font-size: 13px;
  opacity: 0.8;
  margin-top: 4px;
}

/* Goal Section */
.goal-section {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
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
  color: #525252;
}

.goal-current {
  font-size: 14px;
  color: #737373;
}

.progress-bar-container {
  height: 10px;
  background: #E5E5E5;
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #171717;
  border-radius: 5px;
  transition: width 0.3s ease;
}

.progress-bar.completed {
  background: #22C55E;
}

.goal-completed {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #22C55E;
  font-size: 13px;
  font-weight: 500;
}

.goal-completed svg {
  width: 16px;
  height: 16px;
}

/* Comparison Section */
.comparison-section {
  margin-bottom: 20px;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.comparison-item {
  text-align: center;
  padding: 12px;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.comparison-label {
  display: block;
  font-size: 11px;
  color: #737373;
  margin-bottom: 4px;
}

.comparison-value {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
}

.comparison-value.change.positive { color: #22C55E; }
.comparison-value.change.negative { color: #EF4444; }

/* Chart Section */
.chart-section {
  margin-bottom: 20px;
}

.bar-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 100px;
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
  max-width: 28px;
  background: #171717;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  position: relative;
  transition: height 0.3s ease;
}

.bar-value {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  color: #525252;
}

.bar-label {
  font-size: 10px;
  color: #737373;
  margin-top: 6px;
}

/* Distribution Section */
.distribution-section {
  margin-bottom: 20px;
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
  width: 90px;
  flex-shrink: 0;
}

.distribution-name {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #171717;
}

.distribution-count {
  font-size: 10px;
  color: #737373;
}

.distribution-bar-bg {
  flex: 1;
  height: 6px;
  background: #E5E5E5;
  border-radius: 3px;
  overflow: hidden;
}

.distribution-bar {
  height: 100%;
  background: #171717;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.distribution-percent {
  width: 36px;
  text-align: right;
  font-size: 11px;
  font-weight: 600;
  color: #525252;
}

/* Achievements Section */
.achievements-section {
  margin-bottom: 20px;
}

.no-achievements {
  text-align: center;
  padding: 20px;
  color: #737373;
  font-size: 13px;
  background: #FAFAFA;
  border-radius: 8px;
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
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 10px;
  min-width: 80px;
}

.badge-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.badge-icon svg {
  width: 18px;
  height: 18px;
}

.badge-name {
  font-size: 11px;
  font-weight: 500;
  color: #525252;
  text-align: center;
}

/* No Data State */
.no-data {
  text-align: center;
  padding: 32px;
  color: #737373;
}

.no-data svg {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
  opacity: 0.5;
}

@media (max-width: 640px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
  
  .achievements-grid {
    justify-content: center;
  }
}
</style>
