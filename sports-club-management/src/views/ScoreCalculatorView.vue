<template>
  <div class="score-calculator-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <router-link to="/evaluation" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </router-link>
        <div>
          <h1>คำนวณคะแนนนักกีฬา</h1>
          <p class="subtitle">ดูรายละเอียดคะแนนตามเกณฑ์ที่กำหนด</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- No Config Warning -->
    <div v-else-if="!hasConfig" class="warning-card">
      <div class="warning-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h3>ยังไม่มีการตั้งค่าเกณฑ์</h3>
      <p>กรุณาตั้งค่าเกณฑ์การให้คะแนนก่อนใช้งาน</p>
      <router-link to="/scoring-config" class="btn-primary">
        ไปตั้งค่าเกณฑ์
      </router-link>
    </div>

    <!-- Main Content -->
    <div v-else class="content-wrapper">
      <!-- Athlete Selection -->
      <section class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h2>เลือกนักกีฬา</h2>
            <p>เลือกนักกีฬาที่ต้องการดูคะแนน</p>
          </div>
        </div>

        <div class="athlete-selector">
          <select v-model="selectedAthleteId" class="select-input">
            <option value="">-- เลือกนักกีฬา --</option>
            <option 
              v-for="athlete in athletes" 
              :key="athlete.id" 
              :value="athlete.id"
            >
              {{ athlete.full_name || athlete.name }}
            </option>
          </select>
        </div>
      </section>

      <!-- Metric Values Input -->
      <section v-if="selectedAthleteId" class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div>
            <h2>ข้อมูลตัวชี้วัด</h2>
            <p>กรอกค่าตัวชี้วัดสำหรับการคำนวณ</p>
          </div>
        </div>

        <div class="metrics-input-grid">
          <div 
            v-for="category in categories" 
            :key="category.id"
            class="category-inputs"
          >
            <h3 class="category-title">{{ category.display_name }}</h3>
            <div class="metrics-list">
              <div 
                v-for="metric in getCategoryMetrics(category.id)" 
                :key="metric.id"
                class="metric-input-row"
              >
                <label :for="'metric-' + metric.id">
                  {{ metric.display_name }}
                  <span class="metric-type">({{ getMetricTypeLabel(metric.measurement_type) }})</span>
                </label>
                <div class="input-with-unit">
                  <input
                    :id="'metric-' + metric.id"
                    type="number"
                    :value="metricValues[metric.id]"
                    :placeholder="getPlaceholder(metric)"
                    :min="metric.min_value || 0"
                    :max="metric.max_value || 100"
                    :step="metric.measurement_type === 'rating' ? 0.5 : 1"
                    @input="updateMetricValue(metric.id, $event.target.value)"
                    class="metric-input"
                  />
                  <span class="unit">{{ getMetricUnit(metric) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="calculate-actions">
          <button @click="calculateScore" class="btn-primary" :disabled="calculating">
            <span v-if="calculating" class="spinner-small"></span>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            {{ calculating ? 'กำลังคำนวณ...' : 'คำนวณคะแนน' }}
          </button>
        </div>
      </section>

      <!-- Score Result -->
      <section v-if="scoreResult" class="settings-section result-section">
        <ScoreBreakdownCard
          :score-result="scoreResult"
          :athlete-name="selectedAthleteName"
          title="ผลการคำนวณคะแนน"
        />
      </section>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">
        <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useScoringConfigStore } from '@/stores/scoringConfig'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import { calculateOverallScore, createTierThresholdsFromConfig } from '@/lib/scoreCalculator'
import ScoreBreakdownCard from '@/components/ScoreBreakdownCard.vue'

const scoringConfigStore = useScoringConfigStore()
const authStore = useAuthStore()
const dataStore = useDataStore()

// State
const loading = ref(true)
const calculating = ref(false)
const selectedAthleteId = ref('')
const metricValues = ref({})
const scoreResult = ref(null)

// Toast notification
const toast = ref({
  show: false,
  type: 'success',
  message: ''
})

// Computed
const clubId = computed(() => authStore.profile?.club_id)
const hasConfig = computed(() => !!scoringConfigStore.clubConfig)
const categories = computed(() => scoringConfigStore.categories.filter(c => c.is_active !== false))
const metrics = computed(() => scoringConfigStore.metrics.filter(m => m.is_active !== false))
const athletes = computed(() => dataStore.athletes || [])

const selectedAthleteName = computed(() => {
  if (!selectedAthleteId.value) return ''
  const athlete = athletes.value.find(a => a.id === selectedAthleteId.value)
  return athlete?.full_name || athlete?.name || ''
})

// Methods
function getCategoryMetrics(categoryId) {
  return metrics.value.filter(m => m.category_id === categoryId)
}

function getMetricTypeLabel(type) {
  const labels = {
    count: 'จำนวน',
    percentage: 'เปอร์เซ็นต์',
    rating: 'คะแนน',
    time: 'เวลา',
    distance: 'ระยะทาง'
  }
  return labels[type] || type
}

function getMetricUnit(metric) {
  switch (metric.measurement_type) {
    case 'percentage':
      return '%'
    case 'count':
      return 'ครั้ง'
    case 'rating':
      return `/ ${metric.rating_scale_max || 5}`
    case 'time':
      return 'นาที'
    case 'distance':
      return 'เมตร'
    default:
      return ''
  }
}

function getPlaceholder(metric) {
  if (metric.target_value) {
    return `เป้าหมาย: ${metric.target_value}`
  }
  return metric.default_value?.toString() || '0'
}

function updateMetricValue(metricId, value) {
  const numValue = parseFloat(value)
  if (!isNaN(numValue)) {
    metricValues.value[metricId] = numValue
  } else {
    delete metricValues.value[metricId]
  }
}

function calculateScore() {
  if (!hasConfig.value || categories.value.length === 0) {
    showToast('error', 'ไม่มีการตั้งค่าเกณฑ์')
    return
  }

  calculating.value = true

  try {
    // จัดกลุ่ม metrics ตาม category
    const metricsByCategory = {}
    for (const metric of metrics.value) {
      if (!metricsByCategory[metric.category_id]) {
        metricsByCategory[metric.category_id] = []
      }
      metricsByCategory[metric.category_id].push(metric)
    }

    // สร้าง tier thresholds จาก config
    const tierThresholds = createTierThresholdsFromConfig(scoringConfigStore.clubConfig)

    // คำนวณคะแนน
    const result = calculateOverallScore({
      categories: categories.value,
      metricsByCategory,
      metricValues: metricValues.value,
      tierThresholds,
      allowBonus: false
    })

    scoreResult.value = result
    showToast('success', 'คำนวณคะแนนเรียบร้อย')
  } catch (err) {
    console.error('Error calculating score:', err)
    showToast('error', 'เกิดข้อผิดพลาดในการคำนวณ')
  } finally {
    calculating.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    // โหลดข้อมูลพร้อมกัน
    await Promise.all([
      clubId.value ? scoringConfigStore.fetchClubConfig(clubId.value) : Promise.resolve(),
      dataStore.fetchAthletes ? dataStore.fetchAthletes() : Promise.resolve()
    ])

    // ตั้งค่าเริ่มต้นสำหรับ metric values
    initializeMetricValues()
  } catch (error) {
    console.error('Error loading data:', error)
    showToast('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
  } finally {
    loading.value = false
  }
}

function initializeMetricValues() {
  // ตั้งค่าเริ่มต้นจาก default_value ของแต่ละ metric
  const values = {}
  for (const metric of metrics.value) {
    if (metric.default_value !== null && metric.default_value !== undefined) {
      values[metric.id] = metric.default_value
    }
  }
  metricValues.value = values
}

function showToast(type, message) {
  toast.value = { show: true, type, message }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// Watch for club changes
watch(clubId, (newClubId) => {
  if (newClubId) {
    loadData()
  }
})

// Watch for athlete selection changes
watch(selectedAthleteId, () => {
  // รีเซ็ตผลลัพธ์เมื่อเปลี่ยนนักกีฬา
  scoreResult.value = null
})

onMounted(() => {
  loadData()
})
</script>


<style scoped>
.score-calculator-view {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 2rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #F5F5F5;
  color: #525252;
  flex-shrink: 0;
}

.back-link:hover {
  background: #E5E5E5;
}

.back-link svg {
  width: 20px;
  height: 20px;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #171717;
  margin: 0;
}

.subtitle {
  color: #737373;
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: #737373;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Warning Card */
.warning-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 12px;
  text-align: center;
}

.warning-icon {
  width: 64px;
  height: 64px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.warning-icon svg {
  width: 32px;
  height: 32px;
  color: #92400E;
}

.warning-card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #92400E;
  margin: 0 0 0.5rem;
}

.warning-card p {
  color: #92400E;
  margin: 0 0 1rem;
  font-size: 0.875rem;
}

/* Content Wrapper */
.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 1.25rem;
}

.result-section {
  padding: 0;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.section-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.section-header p {
  font-size: 0.875rem;
  color: #737373;
  margin: 0.25rem 0 0;
}

/* Athlete Selector */
.athlete-selector {
  max-width: 400px;
}

.select-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 1rem;
  color: #171717;
  background: #fff;
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: #171717;
}

/* Metrics Input Grid */
.metrics-input-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.category-inputs {
  padding: 1rem;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.category-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 1rem;
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.metric-input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.metric-input-row label {
  flex: 1;
  font-size: 0.875rem;
  color: #171717;
}

.metric-type {
  color: #737373;
  font-size: 0.75rem;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.metric-input {
  width: 100px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 0.875rem;
  text-align: right;
}

.metric-input:focus {
  outline: none;
  border-color: #171717;
}

.unit {
  font-size: 0.75rem;
  color: #737373;
  min-width: 40px;
}

/* Calculate Actions */
.calculate-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: opacity 0.15s;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary svg {
  width: 20px;
  height: 20px;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.toast.success {
  background: #D1FAE5;
  color: #065F46;
}

.toast.error {
  background: #FEE2E2;
  color: #991B1B;
}

.toast svg {
  width: 18px;
  height: 18px;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (max-width: 640px) {
  .score-calculator-view {
    padding: 1rem;
  }

  .metric-input-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .input-with-unit {
    justify-content: flex-end;
  }
}
</style>
