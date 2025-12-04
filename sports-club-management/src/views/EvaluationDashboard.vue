<template>
  <div class="evaluation-dashboard">
    <!-- Header -->
    <div class="page-header">
      <div class="header-row">
        <div>
          <h1>ประเมินผลนักกีฬา</h1>
          <p class="subtitle">ติดตามและวัดผลการพัฒนาของนักกีฬา</p>
        </div>
        <div class="header-actions">
          <router-link to="/score-calculator" class="btn-settings primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            คำนวณคะแนน
          </router-link>
          <router-link to="/scoring-config" class="btn-settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            ตั้งค่าเกณฑ์
          </router-link>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-row">
        <div class="filter-group">
          <label>เดือน</label>
          <input 
            type="month" 
            v-model="selectedMonth"
            @change="loadData"
            class="month-input"
          />
        </div>
        <div class="filter-group">
          <label>ระดับผลงาน</label>
          <select v-model="filterTier" class="tier-select">
            <option value="">ทั้งหมด</option>
            <option value="excellent">ดีเยี่ยม</option>
            <option value="good">ดี</option>
            <option value="average">ปานกลาง</option>
            <option value="needs_improvement">ต้องปรับปรุง</option>
          </select>
        </div>
      </div>
      <button @click="loadData" class="btn-refresh" :disabled="loading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
        รีเฟรช
      </button>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card" @click="filterTier = filterTier === 'excellent' ? '' : 'excellent'" :class="{ active: filterTier === 'excellent' }">
        <div class="card-icon excellent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <div class="card-content">
          <span class="card-value">{{ tierCounts.excellent }}</span>
          <span class="card-label">ดีเยี่ยม</span>
        </div>
      </div>

      <div class="summary-card" @click="filterTier = filterTier === 'good' ? '' : 'good'" :class="{ active: filterTier === 'good' }">
        <div class="card-icon good">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="card-content">
          <span class="card-value">{{ tierCounts.good }}</span>
          <span class="card-label">ดี</span>
        </div>
      </div>

      <div class="summary-card" @click="filterTier = filterTier === 'average' ? '' : 'average'" :class="{ active: filterTier === 'average' }">
        <div class="card-icon average">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </div>
        <div class="card-content">
          <span class="card-value">{{ tierCounts.average }}</span>
          <span class="card-label">ปานกลาง</span>
        </div>
      </div>

      <div class="summary-card" @click="filterTier = filterTier === 'needs_improvement' ? '' : 'needs_improvement'" :class="{ active: filterTier === 'needs_improvement' }">
        <div class="card-icon warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="card-content">
          <span class="card-value">{{ tierCounts.needs_improvement }}</span>
          <span class="card-label">ต้องปรับปรุง</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Athletes Table -->
    <div v-else class="athletes-section">
      <div class="section-header">
        <h2>รายชื่อนักกีฬา ({{ filteredAthletes.length }} คน)</h2>
        <button @click="exportReport" class="btn-export">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>

      <div class="table-container">
        <table class="athletes-table">
          <thead>
            <tr>
              <th>อันดับ</th>
              <th>ชื่อ</th>
              <th>ระดับ</th>
              <th>คะแนนรวม</th>
              <th>เข้าร่วม</th>
              <th>ฝึกซ้อม</th>
              <th>Rating</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(athlete, index) in filteredAthletes" :key="athlete.athlete_id">
              <td class="rank-cell">
                <span class="rank" :class="getRankClass(index + 1)">{{ index + 1 }}</span>
              </td>
              <td class="name-cell">
                <div class="athlete-info">
                  <span class="name">{{ athlete.athlete_name }}</span>
                  <span class="email">{{ athlete.athlete_email }}</span>
                </div>
              </td>
              <td>
                <span class="tier-badge" :class="athlete.performance_tier">
                  {{ getTierLabel(athlete.performance_tier) }}
                </span>
              </td>
              <td class="score-cell">
                <div class="score-bar">
                  <div class="score-fill" :style="{ width: athlete.overall_score + '%' }"></div>
                </div>
                <span class="score-value">{{ athlete.overall_score }}</span>
              </td>
              <td>
                <div class="attendance-stats">
                  <span class="stat on-time">{{ athlete.attended_on_time }}</span>
                  <span class="stat late">{{ athlete.attended_late }}</span>
                  <span class="stat leave">{{ athlete.leave_count }}</span>
                  <span class="stat absent">{{ athlete.absent_count }}</span>
                </div>
                <span class="rate">{{ athlete.attendance_rate }}%</span>
              </td>
              <td>
                <span class="training-info">
                  {{ athlete.training_sessions }} ครั้ง
                  <small>({{ athlete.training_hours }} ชม.)</small>
                </span>
              </td>
              <td>
                <div class="rating-stars">
                  <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= Math.round(athlete.average_rating) }">★</span>
                </div>
                <span class="rating-value">{{ athlete.average_rating }}</span>
              </td>
              <td>
                <router-link :to="`/evaluation/athlete/${athlete.athlete_id}`" class="btn-detail">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredAthletes.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <p>ไม่พบข้อมูลนักกีฬา</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEvaluationStore } from '../stores/evaluation'
import { useAuthStore } from '../stores/auth'

const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()

const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const filterTier = ref('')

const loading = computed(() => evaluationStore.loading)

const tierCounts = computed(() => {
  const counts = { excellent: 0, good: 0, average: 0, needs_improvement: 0 }
  evaluationStore.athleteStats.forEach(a => {
    const tier = a.performance_tier || 'needs_improvement'
    if (counts[tier] !== undefined) counts[tier]++
  })
  return counts
})

const filteredAthletes = computed(() => {
  if (!filterTier.value) return evaluationStore.athleteStats
  return evaluationStore.athleteStats.filter(a => a.performance_tier === filterTier.value)
})

function getTierLabel(tier) {
  return evaluationStore.getTierLabel(tier)
}

function getRankClass(rank) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return ''
}

async function loadData() {
  const clubId = authStore.profile?.club_id
  await evaluationStore.calculateAthleteStats(clubId, selectedMonth.value)
}

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
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 1.5rem;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #171717;
  margin: 0;
}

.subtitle {
  color: #737373;
  margin: 0.25rem 0 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-settings {
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
  transition: all 0.15s;
}

.btn-settings:hover {
  background: #F5F5F5;
  color: #171717;
}

.btn-settings.primary {
  background: #171717;
  color: #fff;
  border-color: #171717;
}

.btn-settings.primary:hover {
  opacity: 0.9;
}

.btn-settings svg {
  width: 18px;
  height: 18px;
}

.filters-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.filter-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-group label {
  font-size: 0.875rem;
  color: #525252;
}

.month-input, .tier-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
  background: #fff;
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-refresh:disabled {
  opacity: 0.5;
}

.btn-refresh svg {
  width: 16px;
  height: 16px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: #fff;
  border: 2px solid #E5E5E5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.summary-card:hover {
  border-color: #D4D4D4;
  transform: translateY(-2px);
}

.summary-card.active {
  border-color: #171717;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon svg {
  width: 24px;
  height: 24px;
}

.card-icon.excellent { background: #D1FAE5; color: #065F46; }
.card-icon.good { background: #DBEAFE; color: #1E40AF; }
.card-icon.average { background: #FEF3C7; color: #92400E; }
.card-icon.warning { background: #FEE2E2; color: #991B1B; }

.card-content {
  display: flex;
  flex-direction: column;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #171717;
}

.card-label {
  font-size: 0.875rem;
  color: #737373;
}

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

@keyframes spin {
  to { transform: rotate(360deg); }
}

.athletes-section {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #E5E5E5;
}

.section-header h2 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.btn-export {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-export svg {
  width: 16px;
  height: 16px;
}

.table-container {
  overflow-x: auto;
}

.athletes-table {
  width: 100%;
  border-collapse: collapse;
}

.athletes-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #737373;
  text-transform: uppercase;
  background: #FAFAFA;
  border-bottom: 1px solid #E5E5E5;
}

.athletes-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
}

.rank-cell {
  width: 60px;
}

.rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: 600;
  background: #F5F5F5;
  color: #525252;
}

.rank.gold { background: #FEF3C7; color: #92400E; }
.rank.silver { background: #E5E5E5; color: #404040; }
.rank.bronze { background: #FED7AA; color: #9A3412; }

.athlete-info {
  display: flex;
  flex-direction: column;
}

.athlete-info .name {
  font-weight: 500;
  color: #171717;
}

.athlete-info .email {
  font-size: 0.75rem;
  color: #737373;
}

.tier-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tier-badge.excellent { background: #D1FAE5; color: #065F46; }
.tier-badge.good { background: #DBEAFE; color: #1E40AF; }
.tier-badge.average { background: #FEF3C7; color: #92400E; }
.tier-badge.needs_improvement { background: #FEE2E2; color: #991B1B; }

.score-cell {
  min-width: 120px;
}

.score-bar {
  height: 6px;
  background: #E5E5E5;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.score-fill {
  height: 100%;
  background: #171717;
  border-radius: 3px;
}

.score-value {
  font-size: 0.875rem;
  font-weight: 600;
}

.attendance-stats {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.25rem;
}

.attendance-stats .stat {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.stat.on-time { background: #D1FAE5; color: #065F46; }
.stat.late { background: #FEF3C7; color: #92400E; }
.stat.leave { background: #DBEAFE; color: #1E40AF; }
.stat.absent { background: #FEE2E2; color: #991B1B; }

.rate {
  font-size: 0.75rem;
  color: #737373;
}

.training-info {
  font-size: 0.875rem;
}

.training-info small {
  color: #737373;
}

.rating-stars {
  display: flex;
  gap: 2px;
}

.star {
  color: #E5E5E5;
  font-size: 0.875rem;
}

.star.filled {
  color: #F59E0B;
}

.rating-value {
  font-size: 0.75rem;
  color: #737373;
  margin-left: 0.25rem;
}

.btn-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #F5F5F5;
  color: #525252;
}

.btn-detail:hover {
  background: #E5E5E5;
}

.btn-detail svg {
  width: 16px;
  height: 16px;
}

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

@media (max-width: 768px) {
  .evaluation-dashboard {
    padding: 1rem;
  }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .athletes-table th:nth-child(5),
  .athletes-table td:nth-child(5),
  .athletes-table th:nth-child(6),
  .athletes-table td:nth-child(6) {
    display: none;
  }
}
</style>
