<template>
  <div class="progress-card" :class="[`status-${status}`]">
    <!-- Header -->
    <div class="card-header">
      <div class="field-info">
        <span class="field-name">{{ fieldName }}</span>
        <span v-if="unit" class="field-unit">({{ unit }})</span>
      </div>
      <div class="header-badges">
        <!-- Milestone badges (Requirements: 7.4) -->
        <span v-if="percentage >= 50 && percentage < 100" class="milestone-badge halfway">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon">
            <path d="M12 2v20M2 12h20"/>
          </svg>
          50%
        </span>
        <span v-if="percentage >= 100" class="milestone-badge complete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          100%
        </span>
        <span :class="['status-badge', `badge-${status}`]">
          {{ statusText }}
        </span>
      </div>
    </div>

    <!-- Values Display -->
    <div class="values-section">
      <div class="current-value-display">
        <span class="value-number">{{ formatValue(currentValue) }}</span>
        <span v-if="unit" class="value-unit">{{ unit }}</span>
      </div>
      <div class="value-range">
        <span class="range-item">
          <span class="range-label">เริ่มต้น</span>
          <span class="range-value">{{ formatValue(initialValue) }}</span>
        </span>
        <span class="range-separator">→</span>
        <span class="range-item">
          <span class="range-label">เป้าหมาย</span>
          <span class="range-value">{{ formatValue(targetValue) }}</span>
        </span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="progress-section">
      <div class="progress-bar-container">
        <div 
          class="progress-bar" 
          :style="{ width: clampedPercentage + '%' }"
          :class="[`bar-${status}`]"
        ></div>
        <!-- Milestone markers -->
        <div class="milestone-marker" style="left: 50%">
          <div v-if="percentage >= 50" class="milestone-dot achieved"></div>
          <div v-else class="milestone-dot"></div>
        </div>
        <div class="milestone-marker" style="left: 100%">
          <div v-if="percentage >= 100" class="milestone-dot achieved"></div>
          <div v-else class="milestone-dot"></div>
        </div>
      </div>
      <div class="progress-info">
        <span class="percentage">{{ Math.round(percentage) }}%</span>
        <span v-if="daysRemaining !== null" class="days-remaining">
          {{ daysRemainingText }}
        </span>
      </div>
    </div>

    <!-- Achievement Badge (Requirements: 7.4) -->
    <div v-if="percentage >= 100" class="achievement-badge complete-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>บรรลุเป้าหมาย!</span>
    </div>
    
    <!-- Halfway Badge (Requirements: 7.4) -->
    <div v-else-if="percentage >= 50" class="achievement-badge halfway-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      <span>ผ่านครึ่งทางแล้ว!</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * ProgressCard Component
 * แสดงความคืบหน้าของนักกีฬาในแต่ละฟิลด์
 * Requirements: 5.2, 5.3
 */
const props = defineProps({
  // ชื่อฟิลด์ที่ติดตาม
  fieldName: {
    type: String,
    required: true
  },
  // หน่วยวัด
  unit: {
    type: String,
    default: ''
  },
  // ค่าปัจจุบัน
  currentValue: {
    type: [Number, String],
    default: 0
  },
  // ค่าเริ่มต้น
  initialValue: {
    type: [Number, String],
    default: 0
  },
  // ค่าเป้าหมาย
  targetValue: {
    type: [Number, String],
    default: 0
  },
  // เปอร์เซ็นต์ความคืบหน้า (0-100+)
  percentage: {
    type: Number,
    default: 0
  },
  // สถานะ: 'achieved', 'ahead', 'on_track', 'behind'
  status: {
    type: String,
    default: 'on_track',
    validator: (value) => ['achieved', 'ahead', 'on_track', 'behind'].includes(value)
  },
  // จำนวนวันที่เหลือ
  daysRemaining: {
    type: Number,
    default: null
  }
})

// Computed
const clampedPercentage = computed(() => {
  return Math.min(100, Math.max(0, props.percentage))
})

const statusText = computed(() => {
  const statusTexts = {
    achieved: 'บรรลุเป้าหมาย',
    ahead: 'เร็วกว่ากำหนด',
    on_track: 'ตามแผน',
    behind: 'ช้ากว่ากำหนด'
  }
  return statusTexts[props.status] || 'ตามแผน'
})

const daysRemainingText = computed(() => {
  if (props.daysRemaining === null) return ''
  if (props.daysRemaining < 0) return 'เลยกำหนด'
  if (props.daysRemaining === 0) return 'วันสุดท้าย'
  return `เหลือ ${props.daysRemaining} วัน`
})

// Methods
function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') {
    // ปัดเศษ 2 ตำแหน่ง
    return Number.isInteger(value) ? value : value.toFixed(2)
  }
  return value
}
</script>

<style scoped>
.progress-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
}

.progress-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Status border colors */
.progress-card.status-achieved {
  border-color: #22c55e;
}

.progress-card.status-ahead {
  border-color: #22c55e;
}

.progress-card.status-behind {
  border-color: #ef4444;
}

/* Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.field-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.field-name {
  font-weight: 600;
  color: #171717;
  font-size: 14px;
}

.field-unit {
  font-size: 12px;
  color: #737373;
}

.header-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.milestone-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.milestone-badge .badge-icon {
  width: 12px;
  height: 12px;
}

.milestone-badge.halfway {
  background: #fef3c7;
  color: #92400e;
}

.milestone-badge.complete {
  background: #d1fae5;
  color: #065f46;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.badge-achieved {
  background: #d1fae5;
  color: #065f46;
}

.badge-ahead {
  background: #d1fae5;
  color: #065f46;
}

.badge-on_track {
  background: #f5f5f5;
  color: #525252;
}

.badge-behind {
  background: #fee2e2;
  color: #991b1b;
}

/* Values Section */
.values-section {
  margin-bottom: 12px;
}

.current-value-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.value-number {
  font-size: 28px;
  font-weight: 700;
  color: #171717;
  line-height: 1;
}

.value-unit {
  font-size: 14px;
  color: #737373;
}

.value-range {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.range-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.range-label {
  color: #a3a3a3;
  font-size: 10px;
  text-transform: uppercase;
}

.range-value {
  color: #525252;
  font-weight: 500;
}

.range-separator {
  color: #d4d4d4;
  font-size: 14px;
}

/* Progress Section */
.progress-section {
  margin-bottom: 8px;
}

.progress-bar-container {
  position: relative;
  height: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: visible;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  border-radius: 4px;
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

/* Milestone markers */
.milestone-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
}

.milestone-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #d4d4d4;
}

.milestone-dot.achieved {
  background: #22c55e;
  border-color: #22c55e;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.percentage {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.days-remaining {
  font-size: 12px;
  color: #737373;
}

/* Achievement Badge (Requirements: 7.4) */
.achievement-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  margin-top: 12px;
}

.achievement-badge svg {
  width: 16px;
  height: 16px;
}

.achievement-badge span {
  font-size: 12px;
  font-weight: 600;
}

/* Complete badge - 100% */
.achievement-badge.complete-badge {
  background: #d1fae5;
}

.achievement-badge.complete-badge svg {
  color: #22c55e;
}

.achievement-badge.complete-badge span {
  color: #065f46;
}

/* Halfway badge - 50% */
.achievement-badge.halfway-badge {
  background: #fef3c7;
}

.achievement-badge.halfway-badge svg {
  color: #f59e0b;
}

.achievement-badge.halfway-badge span {
  color: #92400e;
}
</style>
