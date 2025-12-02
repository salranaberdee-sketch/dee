<template>
  <div class="score-breakdown-card">
    <!-- Header with Overall Score -->
    <div class="breakdown-header">
      <div class="score-circle" :style="{ '--score': scoreBreakdown.overall_score }">
        <span class="score-value">{{ Math.round(scoreBreakdown.overall_score) }}</span>
        <span class="score-label">คะแนนรวม</span>
      </div>
      <div class="tier-info">
        <span class="tier-badge" :class="scoreBreakdown.tier">
          {{ getTierLabel(scoreBreakdown.tier) }}
        </span>
        <span class="tier-desc">{{ getTierDescription(scoreBreakdown.tier) }}</span>
      </div>
    </div>

    <!-- Base Scores Section -->
    <div class="section">
      <h3 class="section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20V10"/>
          <path d="M18 20V4"/>
          <path d="M6 20v-4"/>
        </svg>
        คะแนนพื้นฐาน
      </h3>
      <div class="base-scores">
        <!-- Attendance Score -->
        <div class="score-item">
          <div class="score-item-header">
            <div class="score-icon attendance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <polyline points="16 11 18 13 22 9"/>
              </svg>
            </div>
            <div class="score-item-info">
              <span class="score-item-name">การเข้าร่วม</span>
              <span class="score-item-weight">{{ criteriaUsed.attendance_weight }}%</span>
            </div>
          </div>
          <div class="score-item-bar">
            <div class="bar-bg">
              <div 
                class="bar-fill attendance" 
                :style="{ width: getBarWidth(scoreBreakdown.attendance_score, criteriaUsed.attendance_weight) }"
              ></div>
            </div>
            <span class="score-item-value">{{ formatScore(scoreBreakdown.attendance_score) }}</span>
          </div>
        </div>

        <!-- Training Score -->
        <div class="score-item">
          <div class="score-item-header">
            <div class="score-icon training">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
                <line x1="6" y1="1" x2="6" y2="4"/>
                <line x1="10" y1="1" x2="10" y2="4"/>
                <line x1="14" y1="1" x2="14" y2="4"/>
              </svg>
            </div>
            <div class="score-item-info">
              <span class="score-item-name">การฝึกซ้อม</span>
              <span class="score-item-weight">{{ criteriaUsed.training_weight }}%</span>
            </div>
          </div>
          <div class="score-item-bar">
            <div class="bar-bg">
              <div 
                class="bar-fill training" 
                :style="{ width: getBarWidth(scoreBreakdown.training_score, criteriaUsed.training_weight) }"
              ></div>
            </div>
            <span class="score-item-value">{{ formatScore(scoreBreakdown.training_score) }}</span>
          </div>
        </div>

        <!-- Rating Score -->
        <div class="score-item">
          <div class="score-item-header">
            <div class="score-icon rating">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div class="score-item-info">
              <span class="score-item-name">Rating</span>
              <span class="score-item-weight">{{ criteriaUsed.rating_weight }}%</span>
            </div>
          </div>
          <div class="score-item-bar">
            <div class="bar-bg">
              <div 
                class="bar-fill rating" 
                :style="{ width: getBarWidth(scoreBreakdown.rating_score, criteriaUsed.rating_weight) }"
              ></div>
            </div>
            <span class="score-item-value">{{ formatScore(scoreBreakdown.rating_score) }}</span>
          </div>
        </div>

        <!-- Base Score Total -->
        <div class="base-total">
          <span class="base-total-label">คะแนนพื้นฐานรวม</span>
          <span class="base-total-value">{{ formatScore(scoreBreakdown.base_score) }}</span>
        </div>
      </div>
    </div>

    <!-- Applied Conditions Section -->
    <div class="section" v-if="hasConditions">
      <h3 class="section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        เงื่อนไขพิเศษ
      </h3>
      
      <!-- Bonus Conditions -->
      <div v-if="bonusConditions.length > 0" class="conditions-group">
        <span class="conditions-group-label bonus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          โบนัส
        </span>
        <div class="conditions-list">
          <div 
            v-for="condition in bonusConditions" 
            :key="condition.condition_id"
            class="condition-item"
            :class="{ met: condition.condition_met }"
          >
            <div class="condition-info">
              <span class="condition-name">{{ condition.condition_name }}</span>
              <span class="condition-detail">
                {{ formatConditionDetail(condition) }}
              </span>
            </div>
            <div class="condition-points" :class="{ met: condition.condition_met }">
              <span v-if="condition.condition_met">+{{ condition.points_applied }}</span>
              <span v-else class="not-met">-</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Penalty Conditions -->
      <div v-if="penaltyConditions.length > 0" class="conditions-group">
        <span class="conditions-group-label penalty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          หักคะแนน
        </span>
        <div class="conditions-list">
          <div 
            v-for="condition in penaltyConditions" 
            :key="condition.condition_id"
            class="condition-item penalty"
            :class="{ met: condition.condition_met }"
          >
            <div class="condition-info">
              <span class="condition-name">{{ condition.condition_name }}</span>
              <span class="condition-detail">
                {{ formatConditionDetail(condition) }}
              </span>
            </div>
            <div class="condition-points penalty" :class="{ met: condition.condition_met }">
              <span v-if="condition.condition_met">{{ condition.points_applied }}</span>
              <span v-else class="not-met">-</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Conditions Summary -->
      <div class="conditions-summary">
        <div class="summary-row bonus" v-if="scoreBreakdown.bonus_points !== 0">
          <span>โบนัสรวม</span>
          <span>+{{ formatScore(scoreBreakdown.bonus_points) }}</span>
        </div>
        <div class="summary-row penalty" v-if="scoreBreakdown.penalty_points !== 0">
          <span>หักคะแนนรวม</span>
          <span>{{ formatScore(scoreBreakdown.penalty_points) }}</span>
        </div>
      </div>
    </div>

    <!-- No Conditions Message -->
    <div class="section" v-else-if="showNoConditionsMessage">
      <div class="no-conditions">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>ไม่มีเงื่อนไขพิเศษ</span>
      </div>
    </div>

    <!-- Final Score -->
    <div class="final-score">
      <div class="final-score-row">
        <span class="final-label">คะแนนสุทธิ</span>
        <span class="final-value">{{ formatScore(scoreBreakdown.overall_score) }}</span>
      </div>
      <div class="final-tier">
        <span class="tier-badge large" :class="scoreBreakdown.tier">
          {{ getTierLabel(scoreBreakdown.tier) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /**
   * Score breakdown object from calculateScore function
   */
  scoreBreakdown: {
    type: Object,
    required: true,
    default: () => ({
      attendance_score: 0,
      training_score: 0,
      rating_score: 0,
      base_score: 0,
      bonus_points: 0,
      penalty_points: 0,
      overall_score: 0,
      tier: 'needs_improvement',
      applied_conditions: [],
      criteria_used: {
        attendance_weight: 40,
        training_weight: 30,
        rating_weight: 30,
        target_training_sessions: 12
      }
    })
  },
  /**
   * Whether to show message when no conditions exist
   */
  showNoConditionsMessage: {
    type: Boolean,
    default: false
  }
})

// Computed properties
const criteriaUsed = computed(() => {
  return props.scoreBreakdown.criteria_used || {
    attendance_weight: 40,
    training_weight: 30,
    rating_weight: 30,
    target_training_sessions: 12
  }
})

const appliedConditions = computed(() => {
  return props.scoreBreakdown.applied_conditions || []
})

const bonusConditions = computed(() => {
  return appliedConditions.value.filter(c => c.condition_type === 'bonus')
})

const penaltyConditions = computed(() => {
  return appliedConditions.value.filter(c => c.condition_type === 'penalty')
})

const hasConditions = computed(() => {
  return appliedConditions.value.length > 0
})

// Helper functions
function getTierLabel(tier) {
  const labels = {
    excellent: 'ดีเยี่ยม',
    good: 'ดี',
    average: 'ปานกลาง',
    needs_improvement: 'ต้องปรับปรุง'
  }
  return labels[tier] || tier
}

function getTierDescription(tier) {
  const descriptions = {
    excellent: 'ผลงานยอดเยี่ยม!',
    good: 'ผลงานดี ทำต่อไป!',
    average: 'พอใช้ได้ ยังพัฒนาได้อีก',
    needs_improvement: 'ต้องปรับปรุง'
  }
  return descriptions[tier] || ''
}

function formatScore(score) {
  if (score === null || score === undefined) return '0'
  return Number(score).toFixed(1)
}

function getBarWidth(score, maxWeight) {
  if (!maxWeight || maxWeight === 0) return '0%'
  const percentage = (score / maxWeight) * 100
  return `${Math.min(percentage, 100)}%`
}

function formatConditionDetail(condition) {
  const operatorLabels = {
    '>=': '≥',
    '>': '>',
    '<=': '≤',
    '<': '<',
    '=': '='
  }
  const operator = operatorLabels[condition.comparison_operator] || condition.comparison_operator
  const actual = condition.actual_value !== null ? condition.actual_value : '-'
  const threshold = condition.threshold_value
  
  return `ค่าจริง: ${actual} ${operator} ${threshold}`
}
</script>

<style scoped>
.score-breakdown-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E5E5E5;
  overflow: hidden;
}

/* Header */
.breakdown-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #FAFAFA;
  border-bottom: 1px solid #E5E5E5;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: conic-gradient(
    #171717 calc(var(--score, 0) * 1%),
    #E5E5E5 0
  );
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.score-circle::before {
  content: '';
  position: absolute;
  width: 64px;
  height: 64px;
  background: #fff;
  border-radius: 50%;
}

.score-value {
  position: relative;
  font-size: 1.5rem;
  font-weight: 700;
  color: #171717;
}

.score-label {
  position: relative;
  font-size: 0.625rem;
  color: #737373;
}

.tier-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tier-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.tier-badge.excellent { background: #D1FAE5; color: #065F46; }
.tier-badge.good { background: #DBEAFE; color: #1E40AF; }
.tier-badge.average { background: #FEF3C7; color: #92400E; }
.tier-badge.needs_improvement { background: #FEE2E2; color: #991B1B; }

.tier-badge.large {
  padding: 0.5rem 1rem;
  font-size: 1rem;
}

.tier-desc {
  font-size: 0.75rem;
  color: #737373;
}

/* Sections */
.section {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #E5E5E5;
}

.section:last-of-type {
  border-bottom: none;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #171717;
  margin: 0 0 1rem 0;
}

.section-title svg {
  width: 18px;
  height: 18px;
}

/* Base Scores */
.base-scores {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.score-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.score-item-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.score-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #171717;
}

.score-icon svg {
  width: 16px;
  height: 16px;
  color: #fff;
}

.score-item-info {
  display: flex;
  flex-direction: column;
}

.score-item-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #171717;
}

.score-item-weight {
  font-size: 0.75rem;
  color: #737373;
}

.score-item-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-left: 44px;
}

.bar-bg {
  flex: 1;
  height: 8px;
  background: #E5E5E5;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.bar-fill.attendance { background: #171717; }
.bar-fill.training { background: #525252; }
.bar-fill.rating { background: #737373; }

.score-item-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #171717;
  min-width: 40px;
  text-align: right;
}

.base-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  margin-top: 0.5rem;
  border-top: 1px dashed #D4D4D4;
}

.base-total-label {
  font-size: 0.875rem;
  color: #525252;
}

.base-total-value {
  font-size: 1rem;
  font-weight: 700;
  color: #171717;
}

/* Conditions */
.conditions-group {
  margin-bottom: 1rem;
}

.conditions-group:last-child {
  margin-bottom: 0;
}

.conditions-group-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.conditions-group-label svg {
  width: 12px;
  height: 12px;
}

.conditions-group-label.bonus {
  background: #D1FAE5;
  color: #065F46;
}

.conditions-group-label.penalty {
  background: #FEE2E2;
  color: #991B1B;
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.condition-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #FAFAFA;
  border-radius: 8px;
  border: 1px solid #E5E5E5;
}

.condition-item.met {
  background: #F0FDF4;
  border-color: #BBF7D0;
}

.condition-item.penalty.met {
  background: #FEF2F2;
  border-color: #FECACA;
}

.condition-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.condition-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #171717;
}

.condition-detail {
  font-size: 0.75rem;
  color: #737373;
}

.condition-points {
  font-size: 0.875rem;
  font-weight: 600;
  color: #22C55E;
}

.condition-points.penalty {
  color: #EF4444;
}

.condition-points .not-met {
  color: #A3A3A3;
}

.conditions-summary {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #D4D4D4;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  padding: 0.25rem 0;
}

.summary-row.bonus {
  color: #22C55E;
}

.summary-row.penalty {
  color: #EF4444;
}

/* No Conditions */
.no-conditions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: #737373;
  font-size: 0.875rem;
}

.no-conditions svg {
  width: 18px;
  height: 18px;
}

/* Final Score */
.final-score {
  padding: 1.5rem;
  background: #171717;
  color: #fff;
}

.final-score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.final-label {
  font-size: 1rem;
  color: #A3A3A3;
}

.final-value {
  font-size: 2rem;
  font-weight: 700;
}

.final-tier {
  display: flex;
  justify-content: center;
}

/* Responsive */
@media (max-width: 480px) {
  .breakdown-header {
    flex-direction: column;
    text-align: center;
  }
  
  .score-item-bar {
    padding-left: 0;
  }
}
</style>
