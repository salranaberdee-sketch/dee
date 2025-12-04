<template>
  <div class="evaluation-dashboard">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>ประเมินผลนักกีฬา</h1>
        <div class="month-selector">
          <input 
            type="month" 
            v-model="selectedMonth"
            @change="loadData"
            class="month-input"
          />
          <button @click="loadData" class="btn-refresh" :disabled="loading">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="header-actions">
        <router-link to="/score-calculator" class="btn-action primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          คำนวณคะแนน
        </router-link>
        <router-link to="/scoring-config" class="btn-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          ตั้งค่า
        </router-link>
      </div>
    </div>

    <!-- Quick Stats Bar -->
    <div class="quick-stats">
      <div class="stat-item" :class="{ active: filterTier === '' }" @click="filterTier = ''">
        <span class="stat-count">{{ evaluationStore.athleteStats.length }}</span>
        <span class="stat-label">ทั้งหมด</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item excellent" :class="{ active: filterTier === 'excellent' }" @click="toggleFilter('excellent')">
        <span class="stat-count">{{ tierCounts.excellent }}</span>
        <span class="stat-label">ดีเยี่ยม</span>
      </div>
      <div class="stat-item good" :class="{ active: filterTier === 'good' }" @click="toggleFilter('good')">
        <span class="stat-count">{{ tierCounts.good }}</span>
        <span class="stat-label">ดี</span>
      </div>
      <div class="stat-item average" :class="{ active: filterTier === 'average' }" @click="toggleFilter('average')">
        <span class="stat-count">{{ tierCounts.average }}</span>
        <span class="stat-label">ปานกลาง</span>
      </div>
      <div class="stat-item warning" :class="{ active: filterTier === 'needs_improvement' }" @click="toggleFilter('needs_improvement')">
        <span class="stat-count">{{ tierCounts.needs_improvement }}</span>
        <span class="stat-label">ต้องปรับปรุง</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Ranking Grid -->
    <div v-else class="ranking-section">
      <!-- Top 3 Podium -->
      <div v-if="filteredAthletes.length >= 3 && !filterTier" class="podium">
        <div class="podium-item second" @click="goToDetail(filteredAthletes[1])">
          <div class="podium-rank">2</div>
          <div class="podium-avatar">
            <span>{{ getInitials(filteredAthletes[1].athlete_name) }}</span>
          </div>
          <div class="podium-name">{{ filteredAthletes[1].athlete_name }}</div>
          <div class="podium-score">{{ filteredAthletes[1].overall_score }}</div>
          <div class="podium-bar"></div>
        </div>
        <div class="podium-item first" @click="goToDetail(filteredAthletes[0])">
          <div class="podium-crown">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
            </svg>
          </div>
          <div class="podium-rank">1</div>
          <div class="podium-avatar gold">
            <span>{{ getInitials(filteredAthletes[0].athlete_name) }}</span>
          </div>
          <div class="podium-name">{{ filteredAthletes[0].athlete_name }}</div>
          <div class="podium-score">{{ filteredAthletes[0].overall_score }}</div>
          <div class="podium-bar"></div>
        </div>
        <div class="podium-item third" @click="goToDetail(filteredAthletes[2])">
          <div class="podium-rank">3</div>
          <div class="podium-avatar">
            <span>{{ getInitials(filteredAthletes[2].athlete_name) }}</span>
          </div>
          <div class="podium-name">{{ filteredAthletes[2].athlete_name }}</div>
          <div class="podium-score">{{ filteredAthletes[2].overall_score }}</div>
          <div class="podium-bar"></div>
        </div>
      </div>

      <!-- Ranking List -->
      <div class="ranking-list">
        <div class="list-header">
          <span>อันดับ</span>
          <span>นักกีฬา</span>
          <span>คะแนน</span>
          <span>สถานะ</span>
        </div>
        
        <div 
          v-for="(athlete, index) in displayAthletes" 
          :key="athlete.athlete_id"
          class="ranking-item"
          :class="{ 
            'top-three': getRealRank(index) <= 3 && !filterTier,
            'needs-attention': athlete.performance_tier === 'needs_improvement'
          }"
          @click="goToDetail(athlete)"
        >
          <div class="rank-badge" :class="getRankClass(getRealRank(index))">
            {{ getRealRank(index) }}
          </div>
          
          <div class="athlete-info">
            <div class="athlete-avatar" :class="athlete.performance_tier">
              {{ getInitials(athlete.athlete_name) }}
            </div>
            <div class="athlete-details">
              <span class="athlete-name">{{ athlete.athlete_name }}</span>
              <span class="athlete-meta">
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  {{ athlete.attendance_rate }}%
                </span>
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                  </svg>
                  {{ athlete.training_sessions }}
                </span>
              </span>
            </div>
          </div>
          
          <div class="score-display">
            <div class="score-circle" :class="athlete.performance_tier">
              <svg viewBox="0 0 36 36">
                <path
                  class="score-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  class="score-fill"
                  :stroke-dasharray="`${athlete.overall_score}, 100`"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span class="score-value">{{ athlete.overall_score }}</span>
            </div>
          </div>
          
          <div class="tier-indicator">
            <span class="tier-badge" :class="athlete.performance_tier">
              {{ getTierLabel(athlete.performance_tier) }}
            </span>
            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredAthletes.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <p>ไม่พบข้อมูลนักกีฬา</p>
        </div>
      </div>

      <!-- Export Button -->
      <div v-if="filteredAthletes.length > 0" class="export-section">
        <button @click="exportReport" class="btn-export">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          ดาวน์โหลดรายงาน
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEvaluationStore } from '../stores/evaluation'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()

const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const filterTier = ref('')

const loading = computed(() => evaluationStore.loading)

// นับจำนวนแต่ละระดับ
const tierCounts = computed(() => {
  const counts = { excellent: 0, good: 0, average: 0, needs_improvement: 0 }
  evaluationStore.athleteStats.forEach(a => {
    const tier = a.performance_tier || 'needs_improvement'
    if (counts[tier] !== undefined) counts[tier]++
  })
  return counts
})

// กรองตามระดับ
const filteredAthletes = computed(() => {
  if (!filterTier.value) return evaluationStore.athleteStats
  return evaluationStore.athleteStats.filter(a => a.performance_tier === filterTier.value)
})

// แสดงรายการ (ข้าม 3 อันดับแรกถ้าไม่ได้กรอง)
const displayAthletes = computed(() => {
  if (filterTier.value || filteredAthletes.value.length < 3) {
    return filteredAthletes.value
  }
  return filteredAthletes.value.slice(3)
})

// คำนวณอันดับจริง
function getRealRank(index) {
  if (filterTier.value || filteredAthletes.value.length < 3) {
    return index + 1
  }
  return index + 4
}

// สลับ filter
function toggleFilter(tier) {
  filterTier.value = filterTier.value === tier ? '' : tier
}

// ดึงตัวอักษรย่อ
function getInitials(name) {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// แปลงระดับเป็นข้อความ
function getTierLabel(tier) {
  return evaluationStore.getTierLabel(tier)
}

// class สำหรับอันดับ
function getRankClass(rank) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return ''
}

// ไปหน้ารายละเอียด
function goToDetail(athlete) {
  router.push(`/evaluation/athlete/${athlete.athlete_id}`)
}

// โหลดข้อมูล
async function loadData() {
  const clubId = authStore.profile?.club_id
  await evaluationStore.calculateAthleteStats(clubId, selectedMonth.value)
}

// Export รายงาน
function exportReport() {
  const data = filteredAthletes.value.map((a, i) => ({
    อันดับ: i + 1,
    ชื่อ: a.athlete_name,
    อีเมล: a.athlete_email,
    ระดับ: getTierLabel(a.performance_tier),
    คะแนนรวม: a.overall_score,
    'เข้าร่วม(%)': a.attendance_rate,
    'ฝึกซ้อม(ครั้ง)': a.training_sessions,
    'ฝึกซ้อม(ชม.)': a.training_hours,
    Rating: a.average_rating
  }))

  const csv = [
    Object.keys(data[0] || {}).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `athlete-evaluation-${selectedMonth.value}.csv`
  link.click()
}

onMounted(() => {
  loadData()
})
</script>


<style scoped>
.evaluation-dashboard {
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #171717;
  margin: 0 0 0.5rem;
}

.month-selector {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.month-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
}

.btn-refresh {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-refresh:disabled {
  opacity: 0.5;
}

.btn-refresh svg {
  width: 18px;
  height: 18px;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #525252;
  text-decoration: none;
}

.btn-action:hover {
  background: #F5F5F5;
}

.btn-action.primary {
  background: #171717;
  color: #fff;
  border-color: #171717;
}

.btn-action svg {
  width: 16px;
  height: 16px;
}

/* Quick Stats */
.quick-stats {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 60px;
}

.stat-item:hover {
  background: #F5F5F5;
}

.stat-item.active {
  background: #171717;
}

.stat-item.active .stat-count,
.stat-item.active .stat-label {
  color: #fff;
}

.stat-count {
  font-size: 1.25rem;
  font-weight: 700;
  color: #171717;
}

.stat-label {
  font-size: 0.7rem;
  color: #737373;
}

.stat-item.excellent .stat-count { color: #059669; }
.stat-item.good .stat-count { color: #2563EB; }
.stat-item.average .stat-count { color: #D97706; }
.stat-item.warning .stat-count { color: #DC2626; }

.stat-item.excellent.active,
.stat-item.good.active,
.stat-item.average.active,
.stat-item.warning.active {
  background: #171717;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: #E5E5E5;
  margin: 0 0.5rem;
}

/* Loading */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 3rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Podium */
.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 1rem 0;
}

.podium-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.15s;
}

.podium-item:hover {
  transform: translateY(-4px);
}

.podium-item.first {
  order: 2;
}

.podium-item.second {
  order: 1;
}

.podium-item.third {
  order: 3;
}

.podium-crown {
  color: #F59E0B;
  margin-bottom: -8px;
}

.podium-crown svg {
  width: 28px;
  height: 28px;
}

.podium-rank {
  font-size: 0.75rem;
  font-weight: 700;
  color: #737373;
  margin-bottom: 0.25rem;
}

.podium-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #E5E5E5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  color: #525252;
  margin-bottom: 0.5rem;
}

.podium-avatar.gold {
  background: #FEF3C7;
  color: #92400E;
  border: 3px solid #F59E0B;
}

.podium-item.second .podium-avatar {
  width: 48px;
  height: 48px;
  background: #F3F4F6;
  border: 2px solid #9CA3AF;
}

.podium-item.third .podium-avatar {
  width: 44px;
  height: 44px;
  background: #FED7AA;
  border: 2px solid #F97316;
}

.podium-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #171717;
  text-align: center;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.podium-score {
  font-size: 1.5rem;
  font-weight: 700;
  color: #171717;
}

.podium-item.first .podium-score {
  font-size: 2rem;
}

.podium-bar {
  width: 80px;
  background: #171717;
  border-radius: 4px 4px 0 0;
  margin-top: 0.5rem;
}

.podium-item.first .podium-bar {
  height: 80px;
  width: 90px;
}

.podium-item.second .podium-bar {
  height: 60px;
}

.podium-item.third .podium-bar {
  height: 40px;
}

/* Ranking List */
.ranking-list {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  overflow: hidden;
}

.list-header {
  display: grid;
  grid-template-columns: 60px 1fr 80px 120px;
  padding: 0.75rem 1rem;
  background: #FAFAFA;
  border-bottom: 1px solid #E5E5E5;
  font-size: 0.75rem;
  font-weight: 600;
  color: #737373;
  text-transform: uppercase;
}

.ranking-item {
  display: grid;
  grid-template-columns: 60px 1fr 80px 120px;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #F5F5F5;
  cursor: pointer;
  transition: background 0.15s;
}

.ranking-item:hover {
  background: #FAFAFA;
}

.ranking-item:last-child {
  border-bottom: none;
}

.ranking-item.top-three {
  display: none;
}

.ranking-item.needs-attention {
  background: #FEF2F2;
}

.ranking-item.needs-attention:hover {
  background: #FEE2E2;
}

.rank-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  background: #F5F5F5;
  color: #525252;
}

.rank-badge.gold {
  background: #FEF3C7;
  color: #92400E;
}

.rank-badge.silver {
  background: #F3F4F6;
  color: #4B5563;
}

.rank-badge.bronze {
  background: #FED7AA;
  color: #9A3412;
}

.athlete-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.athlete-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.athlete-avatar.excellent {
  background: #D1FAE5;
  color: #065F46;
}

.athlete-avatar.good {
  background: #DBEAFE;
  color: #1E40AF;
}

.athlete-avatar.average {
  background: #FEF3C7;
  color: #92400E;
}

.athlete-avatar.needs_improvement {
  background: #FEE2E2;
  color: #991B1B;
}

.athlete-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.athlete-name {
  font-weight: 500;
  color: #171717;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.athlete-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #737373;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-item svg {
  width: 12px;
  height: 12px;
}

/* Score Circle */
.score-display {
  display: flex;
  justify-content: center;
}

.score-circle {
  position: relative;
  width: 48px;
  height: 48px;
}

.score-circle svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-bg {
  fill: none;
  stroke: #E5E5E5;
  stroke-width: 3;
}

.score-fill {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
}

.score-circle.excellent .score-fill { stroke: #059669; }
.score-circle.good .score-fill { stroke: #2563EB; }
.score-circle.average .score-fill { stroke: #D97706; }
.score-circle.needs_improvement .score-fill { stroke: #DC2626; }

.score-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.875rem;
  font-weight: 700;
  color: #171717;
}

/* Tier Indicator */
.tier-indicator {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.tier-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tier-badge.excellent {
  background: #D1FAE5;
  color: #065F46;
}

.tier-badge.good {
  background: #DBEAFE;
  color: #1E40AF;
}

.tier-badge.average {
  background: #FEF3C7;
  color: #92400E;
}

.tier-badge.needs_improvement {
  background: #FEE2E2;
  color: #991B1B;
}

.arrow-icon {
  width: 16px;
  height: 16px;
  color: #A3A3A3;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: #737373;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* Export */
.export-section {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.btn-export {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #525252;
}

.btn-export:hover {
  background: #F5F5F5;
}

.btn-export svg {
  width: 18px;
  height: 18px;
}

/* Responsive */
@media (max-width: 640px) {
  .evaluation-dashboard {
    padding: 0.75rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .btn-action {
    flex: 1;
    justify-content: center;
  }

  .quick-stats {
    padding: 0.5rem;
  }

  .stat-item {
    padding: 0.5rem 0.75rem;
    min-width: 50px;
  }

  .stat-count {
    font-size: 1rem;
  }

  .podium {
    gap: 0.25rem;
  }

  .podium-avatar {
    width: 44px;
    height: 44px;
  }

  .podium-item.first .podium-avatar {
    width: 52px;
    height: 52px;
  }

  .podium-item.second .podium-avatar,
  .podium-item.third .podium-avatar {
    width: 40px;
    height: 40px;
  }

  .podium-bar {
    width: 60px;
  }

  .podium-item.first .podium-bar {
    width: 70px;
    height: 60px;
  }

  .podium-item.second .podium-bar {
    height: 45px;
  }

  .podium-item.third .podium-bar {
    height: 30px;
  }

  .list-header {
    display: none;
  }

  .ranking-item {
    grid-template-columns: 40px 1fr 60px 80px;
    padding: 0.5rem 0.75rem;
  }

  .rank-badge {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }

  .athlete-avatar {
    width: 32px;
    height: 32px;
    font-size: 0.75rem;
  }

  .athlete-name {
    font-size: 0.875rem;
  }

  .athlete-meta {
    display: none;
  }

  .score-circle {
    width: 40px;
    height: 40px;
  }

  .score-value {
    font-size: 0.75rem;
  }

  .tier-badge {
    padding: 0.2rem 0.5rem;
    font-size: 0.65rem;
  }
}
</style>
