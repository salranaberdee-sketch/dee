<template>
  <div class="comparison-table-container">
    <!-- Header -->
    <div class="table-header">
      <h3 class="table-title">{{ title }}</h3>
      <div class="table-actions">
        <!-- Sort Options -->
        <select v-model="sortBy" class="sort-select">
          <option value="name">เรียงตามชื่อ</option>
          <option value="progress">เรียงตามความคืบหน้า</option>
          <option value="status">เรียงตามสถานะ</option>
        </select>
        <!-- Field Filter -->
        <select v-if="fields.length > 1" v-model="selectedFieldId" class="field-select">
          <option value="">ทุกฟิลด์</option>
          <option v-for="field in fields" :key="field.id" :value="field.id">
            {{ field.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="athletes.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
      <p>ยังไม่มีนักกีฬาในแผนนี้</p>
    </div>

    <!-- Comparison Table -->
    <div v-else class="table-wrapper">
      <table class="comparison-table">
        <thead>
          <tr>
            <th class="col-athlete">นักกีฬา</th>
            <th 
              v-for="field in displayFields" 
              :key="field.id" 
              class="col-field"
            >
              <div class="field-header">
                <span class="field-name">{{ field.name }}</span>
                <span v-if="field.unit" class="field-unit">{{ field.unit }}</span>
              </div>
            </th>
            <th class="col-overall">ภาพรวม</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="athlete in sortedAthletes" 
            :key="athlete.athlete_id"
            :class="{ 'row-achieved': athlete.overallStatus === 'achieved' }"
          >
            <!-- Athlete Info -->
            <td class="col-athlete">
              <div class="athlete-cell">
                <div class="avatar">
                  <img 
                    v-if="athlete.athlete?.avatar_url" 
                    :src="athlete.athlete.avatar_url" 
                    :alt="athlete.athlete?.name" 
                  />
                  <span v-else>{{ getInitials(athlete.athlete?.name) }}</span>
                </div>
                <span class="athlete-name">{{ athlete.athlete?.name || 'ไม่ระบุชื่อ' }}</span>
              </div>
            </td>

            <!-- Field Values -->
            <td 
              v-for="field in displayFields" 
              :key="field.id" 
              class="col-field"
            >
              <div class="field-cell">
                <div class="value-row">
                  <span class="current-value">{{ getFieldCurrentValue(athlete, field) }}</span>
                  <span class="target-value">/ {{ getFieldTargetValue(athlete, field) }}</span>
                </div>
                <div class="progress-mini">
                  <div 
                    class="progress-bar-mini" 
                    :style="{ width: getFieldProgress(athlete, field).percentage + '%' }"
                    :class="'bar-' + getFieldProgress(athlete, field).status"
                  ></div>
                </div>
                <span :class="['status-text', 'status-' + getFieldProgress(athlete, field).status]">
                  {{ getFieldProgress(athlete, field).percentage }}%
                </span>
              </div>
            </td>

            <!-- Overall Progress -->
            <td class="col-overall">
              <div class="overall-cell">
                <div class="overall-progress">
                  <svg viewBox="0 0 36 36" class="circular-progress">
                    <path
                      class="circle-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      class="circle-progress"
                      :class="'progress-' + athlete.overallStatus"
                      :stroke-dasharray="`${athlete.overallPercentage}, 100`"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="20.35" class="percentage-text">
                      {{ Math.round(athlete.overallPercentage) }}%
                    </text>
                  </svg>
                </div>
                <span :class="['overall-status', 'status-' + athlete.overallStatus]">
                  {{ getStatusText(athlete.overallStatus) }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Summary Stats -->
    <div v-if="athletes.length > 0" class="summary-stats">
      <div class="stat-item">
        <span class="stat-value achieved">{{ achievedCount }}</span>
        <span class="stat-label">บรรลุเป้าหมาย</span>
      </div>
      <div class="stat-item">
        <span class="stat-value ahead">{{ aheadCount }}</span>
        <span class="stat-label">เร็วกว่ากำหนด</span>
      </div>
      <div class="stat-item">
        <span class="stat-value on_track">{{ onTrackCount }}</span>
        <span class="stat-label">ตามแผน</span>
      </div>
      <div class="stat-item">
        <span class="stat-value behind">{{ behindCount }}</span>
        <span class="stat-label">ช้ากว่ากำหนด</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { calculateProgressPercentage, calculateProgressStatus } from '@/stores/tracking'

/**
 * AthleteComparisonTable Component
 * แสดงตารางเปรียบเทียบความคืบหน้าของนักกีฬาหลายคน
 * Requirements: 5.4
 */
const props = defineProps({
  // ชื่อตาราง
  title: {
    type: String,
    default: 'เปรียบเทียบความคืบหน้า'
  },
  // รายการนักกีฬา [{ athlete_id, athlete: { name, avatar_url }, goals: [...] }]
  athletes: {
    type: Array,
    default: () => []
  },
  // รายการฟิลด์ [{ id, name, unit }]
  fields: {
    type: Array,
    default: () => []
  },
  // ฟังก์ชันดึงค่าล่าสุด (athleteId, fieldId) => number | null
  getLatestValue: {
    type: Function,
    default: () => null
  },
  // วันที่เริ่มต้นแผน (สำหรับคำนวณ expected percentage)
  planStartDate: {
    type: String,
    default: null
  }
})

// State
const sortBy = ref('progress')
const selectedFieldId = ref('')

// Computed
const displayFields = computed(() => {
  if (selectedFieldId.value) {
    return props.fields.filter(f => f.id === selectedFieldId.value)
  }
  return props.fields
})

// คำนวณความคืบหน้าของแต่ละนักกีฬา
const athletesWithProgress = computed(() => {
  return props.athletes.map(athlete => {
    const fieldProgresses = props.fields.map(field => {
      const progress = getFieldProgress(athlete, field)
      return progress
    })

    // คำนวณ overall percentage (เฉลี่ย)
    const validProgresses = fieldProgresses.filter(p => p.percentage !== null)
    const overallPercentage = validProgresses.length > 0
      ? validProgresses.reduce((sum, p) => sum + p.percentage, 0) / validProgresses.length
      : 0

    // คำนวณ overall status
    let overallStatus = 'on_track'
    const achievedCount = fieldProgresses.filter(p => p.status === 'achieved').length
    const behindCount = fieldProgresses.filter(p => p.status === 'behind').length
    
    if (achievedCount === props.fields.length) {
      overallStatus = 'achieved'
    } else if (behindCount > props.fields.length / 2) {
      overallStatus = 'behind'
    } else if (achievedCount > 0 || fieldProgresses.some(p => p.status === 'ahead')) {
      overallStatus = 'ahead'
    }

    return {
      ...athlete,
      fieldProgresses,
      overallPercentage: Math.round(overallPercentage * 100) / 100,
      overallStatus
    }
  })
})

// เรียงลำดับนักกีฬา
const sortedAthletes = computed(() => {
  const athletes = [...athletesWithProgress.value]
  
  switch (sortBy.value) {
    case 'name':
      return athletes.sort((a, b) => 
        (a.athlete?.name || '').localeCompare(b.athlete?.name || '', 'th')
      )
    case 'progress':
      return athletes.sort((a, b) => b.overallPercentage - a.overallPercentage)
    case 'status':
      const statusOrder = { achieved: 0, ahead: 1, on_track: 2, behind: 3 }
      return athletes.sort((a, b) => 
        statusOrder[a.overallStatus] - statusOrder[b.overallStatus]
      )
    default:
      return athletes
  }
})

// Summary counts
const achievedCount = computed(() => 
  athletesWithProgress.value.filter(a => a.overallStatus === 'achieved').length
)
const aheadCount = computed(() => 
  athletesWithProgress.value.filter(a => a.overallStatus === 'ahead').length
)
const onTrackCount = computed(() => 
  athletesWithProgress.value.filter(a => a.overallStatus === 'on_track').length
)
const behindCount = computed(() => 
  athletesWithProgress.value.filter(a => a.overallStatus === 'behind').length
)

// Methods
function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function getFieldCurrentValue(athlete, field) {
  const latestValue = props.getLatestValue(athlete.athlete_id, field.id)
  if (latestValue !== null) return formatValue(latestValue)
  
  const goal = athlete.goals?.find(g => g.field_id === field.id)
  return formatValue(goal?.initial_value)
}

function getFieldTargetValue(athlete, field) {
  const goal = athlete.goals?.find(g => g.field_id === field.id)
  return formatValue(goal?.target_value)
}

function getFieldProgress(athlete, field) {
  const goal = athlete.goals?.find(g => g.field_id === field.id)
  if (!goal) return { percentage: 0, status: 'on_track' }
  
  const currentValue = props.getLatestValue(athlete.athlete_id, field.id)
  const percentage = calculateProgressPercentage(
    currentValue, 
    goal.initial_value, 
    goal.target_value
  )
  
  // คำนวณ expected percentage
  let expectedPercentage = null
  if (goal.target_date && props.planStartDate) {
    const start = new Date(props.planStartDate)
    const target = new Date(goal.target_date)
    const now = new Date()
    
    const totalDays = Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const daysPassed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    if (totalDays > 0) {
      expectedPercentage = Math.min(100, (daysPassed / totalDays) * 100)
    }
  }
  
  const status = calculateProgressStatus(percentage, expectedPercentage)
  
  return { percentage, status }
}

function formatValue(value) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : value.toFixed(1)
  }
  return value
}

function getStatusText(status) {
  const statusTexts = {
    achieved: 'บรรลุเป้าหมาย',
    ahead: 'เร็วกว่ากำหนด',
    on_track: 'ตามแผน',
    behind: 'ช้ากว่ากำหนด'
  }
  return statusTexts[status] || 'ตามแผน'
}
</script>

<style scoped>
.comparison-table-container {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  overflow: hidden;
}

/* Header */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.sort-select,
.field-select {
  padding: 6px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  font-size: 12px;
  color: #525252;
  background: #fff;
  cursor: pointer;
}

.sort-select:focus,
.field-select:focus {
  outline: none;
  border-color: #171717;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: #a3a3a3;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* Table */
.table-wrapper {
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f5f5f5;
}

.comparison-table th {
  background: #fafafa;
  font-size: 12px;
  font-weight: 600;
  color: #525252;
  text-transform: uppercase;
}

.comparison-table tbody tr:hover {
  background: #fafafa;
}

.comparison-table tbody tr.row-achieved {
  background: #f0fdf4;
}

/* Column Widths */
.col-athlete {
  min-width: 180px;
}

.col-field {
  min-width: 140px;
}

.col-overall {
  min-width: 120px;
  text-align: center;
}

/* Field Header */
.field-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field-name {
  font-weight: 600;
}

.field-unit {
  font-size: 10px;
  font-weight: 400;
  color: #737373;
  text-transform: none;
}

/* Athlete Cell */
.athlete-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar span {
  font-size: 12px;
  font-weight: 600;
  color: #525252;
}

.athlete-name {
  font-size: 14px;
  font-weight: 500;
  color: #171717;
}

/* Field Cell */
.field-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.current-value {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.target-value {
  font-size: 12px;
  color: #737373;
}

/* Mini Progress Bar */
.progress-mini {
  height: 4px;
  background: #f5f5f5;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-mini {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.bar-achieved,
.bar-ahead {
  background: #22c55e;
}

.bar-on_track {
  background: #171717;
}

.bar-behind {
  background: #ef4444;
}

/* Status Text */
.status-text {
  font-size: 11px;
  font-weight: 500;
}

.status-achieved,
.status-ahead {
  color: #22c55e;
}

.status-on_track {
  color: #525252;
}

.status-behind {
  color: #ef4444;
}

/* Overall Cell */
.overall-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* Circular Progress */
.circular-progress {
  width: 48px;
  height: 48px;
}

.circle-bg {
  fill: none;
  stroke: #f5f5f5;
  stroke-width: 3;
}

.circle-progress {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
}

.progress-achieved,
.progress-ahead {
  stroke: #22c55e;
}

.progress-on_track {
  stroke: #171717;
}

.progress-behind {
  stroke: #ef4444;
}

.percentage-text {
  font-size: 8px;
  font-weight: 600;
  fill: #171717;
  text-anchor: middle;
}

.overall-status {
  font-size: 10px;
  font-weight: 500;
}

/* Summary Stats */
.summary-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px;
  border-top: 1px solid #e5e5e5;
  background: #fafafa;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-value.achieved {
  color: #22c55e;
}

.stat-value.ahead {
  color: #22c55e;
}

.stat-value.on_track {
  color: #171717;
}

.stat-value.behind {
  color: #ef4444;
}

.stat-label {
  font-size: 11px;
  color: #737373;
}

/* Responsive */
@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .table-actions {
    width: 100%;
  }

  .sort-select,
  .field-select {
    flex: 1;
  }

  .summary-stats {
    flex-wrap: wrap;
    gap: 16px;
  }

  .stat-item {
    flex: 1;
    min-width: 80px;
  }
}
</style>
