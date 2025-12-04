<template>
  <div class="score-breakdown-card">
    <!-- Header with Overall Score -->
    <div class="card-header">
      <div class="header-info">
        <div class="section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div>
          <h2>{{ title || 'คะแนนประเมิน' }}</h2>
          <p v-if="athleteName">{{ athleteName }}</p>
        </div>
      </div>
      <div class="overall-score" :class="tierClass">
        <span class="score-value">{{ Math.round(scoreResult.overallScore) }}</span>
        <span class="score-label">คะแนน</span>
      </div>
    </div>

    <!-- Performance Tier -->
    <div class="tier-display" :class="tierClass">
      <div class="tier-badge">
        <svg v-if="scoreResult.performanceTier === 'excellent'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <svg v-else-if="scoreResult.performanceTier === 'good'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
        </svg>
        <svg v-else-if="scoreResult.performanceTier === 'average'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
        <span>{{ scoreResult.tierInfo?.display_name || getTierDisplayName(scoreResult.performanceTier) }}</span>
      </div>
      <div class="tier-threshold">
        ≥ {{ scoreResult.tierInfo?.min ?? 0 }}%
      </div>
    </div>

    <!-- Category Breakdown -->
    <div class="categories-breakdown">
      <h3>รายละเอียดคะแนนตามหมวดหมู่</h3>
      
      <div 
        v-for="category in scoreResult.categoryScores" 
        :key="category.categoryId"
        class="category-item"
      >
        <div class="category-header">
          <div class="category-info">
            <span class="category-name">{{ category.categoryName }}</span>
            <span class="category-type">{{ getCategoryTypeLabel(category.categoryType) }}</span>
          </div>
          <div class="category-scores">
            <span class="weighted-score">{{ category.weightedScore.toFixed(1) }}</span>
            <span class="weight-info">({{ category.categoryScore.toFixed(0) }}% × {{ category.weight }}%)</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="score-progress">
          <div 
            class="progress-fill" 
            :style="{ width: Math.min(category.categoryScore, 100) + '%' }"
            :class="getScoreClass(category.categoryScore)"
          ></div>
        </div>

        <!-- Metric Details (Expandable) -->
        <div v-if="showDetails && category.metricScores?.length > 0" class="metric-details">
          <div 
            v-for="metric in category.metricScores" 
            :key="metric.metricId"
            class="metric-item"
          >
            <span class="metric-name">{{ metric.metricName }}</span>
            <span class="metric-value">
              {{ metric.details }}
              <span class="metric-score">({{ metric.score.toFixed(0) }}%)</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Score Summary -->
    <div class="score-summary">
      <div class="summary-row">
        <span>น้ำหนักรวม</span>
        <span :class="{ 'text-error': scoreResult.totalWeight !== 100 }">
          {{ scoreResult.totalWeight }}%
        </span>
      </div>
      <div class="summary-row total">
        <span>คะแนนรวม</span>
        <span>{{ scoreResult.overallScore.toFixed(1) }} / 100</span>
      </div>
    </div>

    <!-- Toggle Details Button -->
    <button 
      v-if="hasMetricDetails" 
      @click="showDetails = !showDetails" 
      class="btn-toggle"
    >
      <svg v-if="showDetails" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
      {{ showDetails ? 'ซ่อนรายละเอียด' : 'แสดงรายละเอียด' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  scoreResult: {
    type: Object,
    required: true
  },
  title: {
    type: String,
    default: 'คะแนนประเมิน'
  },
  athleteName: {
    type: String,
    default: ''
  }
})

// State
const showDetails = ref(false)

// Computed
const tierClass = computed(() => {
  return props.scoreResult?.performanceTier || 'needs_improvement'
})

const hasMetricDetails = computed(() => {
  return props.scoreResult?.categoryScores?.some(c => c.metricScores?.length > 0)
})

// Methods
function getTierDisplayName(tier) {
  const names = {
    excellent: 'ยอดเยี่ยม',
    good: 'ดี',
    average: 'ปานกลาง',
    needs_improvement: 'ต้องปรับปรุง'
  }
  return names[tier] || tier
}

function getCategoryTypeLabel(type) {
  const labels = {
    attendance: 'การเข้าร่วม',
    training: 'การฝึกซ้อม',
    skill: 'ทักษะ',
    competition: 'การแข่งขัน',
    custom: 'กำหนดเอง'
  }
  return labels[type] || type
}

function getScoreClass(score) {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'average'
  return 'needs_improvement'
}
</script>

<style scoped>
.score-breakdown-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  overflow: hidden;
}

/* Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.25rem;
  background: #FAFAFA;
  border-bottom: 1px solid #E5E5E5;
}

.header-info {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
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

.header-info h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.header-info p {
  font-size: 0.875rem;
  color: #737373;
  margin: 0.25rem 0 0;
}

.overall-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #E5E5E5;
}

.overall-score.excellent {
  background: #D1FAE5;
  color: #065F46;
}

.overall-score.good {
  background: #DBEAFE;
  color: #1E40AF;
}

.overall-score.average {
  background: #FEF3C7;
  color: #92400E;
}

.overall-score.needs_improvement {
  background: #FEE2E2;
  color: #991B1B;
}

.score-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.score-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Tier Display */
.tier-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.25rem;
}

.tier-display.excellent {
  background: #D1FAE5;
  color: #065F46;
}

.tier-display.good {
  background: #DBEAFE;
  color: #1E40AF;
}

.tier-display.average {
  background: #FEF3C7;
  color: #92400E;
}

.tier-display.needs_improvement {
  background: #FEE2E2;
  color: #991B1B;
}

.tier-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.tier-badge svg {
  width: 20px;
  height: 20px;
}

.tier-threshold {
  font-size: 0.875rem;
  font-weight: 500;
}

/* Categories Breakdown */
.categories-breakdown {
  padding: 1.25rem;
}

.categories-breakdown h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 1rem;
}

.category-item {
  padding: 1rem;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.category-item:last-child {
  margin-bottom: 0;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.category-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.category-name {
  font-weight: 600;
  color: #171717;
}

.category-type {
  font-size: 0.75rem;
  color: #737373;
}

.category-scores {
  text-align: right;
}

.weighted-score {
  font-size: 1.25rem;
  font-weight: 700;
  color: #171717;
}

.weight-info {
  display: block;
  font-size: 0.75rem;
  color: #737373;
}

/* Progress Bar */
.score-progress {
  height: 8px;
  background: #E5E5E5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-fill.excellent {
  background: #22C55E;
}

.progress-fill.good {
  background: #3B82F6;
}

.progress-fill.average {
  background: #F59E0B;
}

.progress-fill.needs_improvement {
  background: #EF4444;
}

/* Metric Details */
.metric-details {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #E5E5E5;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  font-size: 0.875rem;
}

.metric-name {
  color: #525252;
}

.metric-value {
  color: #171717;
}

.metric-score {
  color: #737373;
  font-size: 0.75rem;
}

/* Score Summary */
.score-summary {
  padding: 1rem 1.25rem;
  background: #FAFAFA;
  border-top: 1px solid #E5E5E5;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0;
  font-size: 0.875rem;
  color: #525252;
}

.summary-row.total {
  padding-top: 0.75rem;
  margin-top: 0.5rem;
  border-top: 1px solid #E5E5E5;
  font-weight: 700;
  font-size: 1rem;
  color: #171717;
}

.text-error {
  color: #991B1B;
}

/* Toggle Button */
.btn-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background: #fff;
  border: none;
  border-top: 1px solid #E5E5E5;
  color: #525252;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-toggle:hover {
  background: #F5F5F5;
}

.btn-toggle svg {
  width: 16px;
  height: 16px;
}

@media (max-width: 640px) {
  .card-header {
    flex-direction: column;
    gap: 1rem;
  }

  .overall-score {
    align-self: flex-end;
  }

  .category-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .category-scores {
    text-align: left;
  }
}
</style>
