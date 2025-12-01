<template>
  <div class="athlete-history">
    <div class="section-header">
      <h3>ประวัติการแข่งขัน</h3>
    </div>

    <div v-if="loading" class="loading">กำลังโหลด...</div>
    
    <div v-else-if="history.length === 0" class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0012 0V2z"/>
      </svg>
      <p>ยังไม่มีประวัติการแข่งขัน</p>
    </div>

    <div v-else class="history-list">
      <div v-for="item in history" :key="item.id" class="history-card">
        <div class="card-header">
          <div class="tournament-name">{{ item.tournaments?.name }}</div>
          <span class="sport-type">{{ item.tournaments?.sport_type }}</span>
        </div>
        
        <div class="card-meta">
          <div class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{{ formatDateRange(item.tournaments?.start_date, item.tournaments?.end_date) }}</span>
          </div>
          <div class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{{ item.tournaments?.location }}</span>
          </div>
        </div>

        <!-- Matches -->
        <div v-if="item.tournament_matches?.length" class="matches-section">
          <div class="section-title">ผลการแข่งขัน</div>
          <div class="matches-grid">
            <div v-for="m in item.tournament_matches" :key="m.id" class="match-row">
              <span class="match-date">{{ formatDate(m.match_date) }}</span>
              <span class="opponent">vs {{ m.opponent_name || 'ไม่ระบุ' }}</span>
              <span :class="['result', `result-${m.result}`]">{{ resultLabels[m.result] }}</span>
              <span v-if="m.score" class="score">{{ m.score }}</span>
            </div>
          </div>
        </div>

        <!-- Awards -->
        <div v-if="item.tournament_awards?.length" class="awards-section">
          <div class="section-title">รางวัลที่ได้รับ</div>
          <div class="awards-grid">
            <div v-for="a in item.tournament_awards" :key="a.id" class="award-badge" :class="`award-${a.award_type}`">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="7"/>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
              </svg>
              <span>{{ awardLabels[a.award_type] }}</span>
            </div>
          </div>
        </div>

        <!-- Stats Summary -->
        <div class="stats-row">
          <div class="stat">
            <span class="stat-value">{{ getWinCount(item.tournament_matches) }}</span>
            <span class="stat-label">ชนะ</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ getLoseCount(item.tournament_matches) }}</span>
            <span class="stat-label">แพ้</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ item.tournament_awards?.length || 0 }}</span>
            <span class="stat-label">รางวัล</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="history.length > 0" class="summary-stats">
      <div class="summary-card">
        <div class="summary-value">{{ totalTournaments }}</div>
        <div class="summary-label">รายการแข่งขัน</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">{{ totalWins }}</div>
        <div class="summary-label">ชนะ</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">{{ totalAwards }}</div>
        <div class="summary-label">รางวัล</div>
      </div>
      <div class="summary-card gold">
        <div class="summary-value">{{ goldMedals }}</div>
        <div class="summary-label">เหรียญทอง</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDataStore } from '@/stores/data'

const props = defineProps({
  athleteId: { type: String, required: true }
})

const dataStore = useDataStore()
const loading = ref(false)
const history = ref([])

const resultLabels = { win: 'ชนะ', lose: 'แพ้', draw: 'เสมอ', pending: 'รอผล' }
const awardLabels = { gold: 'เหรียญทอง', silver: 'เหรียญเงิน', bronze: 'เหรียญทองแดง', certificate: 'ประกาศนียบัตร', special: 'รางวัลพิเศษ' }

const totalTournaments = computed(() => history.value.length)
const totalWins = computed(() => history.value.reduce((sum, h) => sum + getWinCount(h.tournament_matches), 0))
const totalAwards = computed(() => history.value.reduce((sum, h) => sum + (h.tournament_awards?.length || 0), 0))
const goldMedals = computed(() => history.value.reduce((sum, h) => sum + (h.tournament_awards?.filter(a => a.award_type === 'gold').length || 0), 0))

function formatDateRange(start, end) {
  if (!start) return '-'
  const s = new Date(start).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  if (!end || start === end) return s
  const e = new Date(end).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${s} - ${e}`
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function getWinCount(matches) {
  return matches?.filter(m => m.result === 'win').length || 0
}

function getLoseCount(matches) {
  return matches?.filter(m => m.result === 'lose').length || 0
}

async function loadHistory() {
  if (!props.athleteId) return
  loading.value = true
  history.value = await dataStore.getAthleteHistory(props.athleteId)
  loading.value = false
}

watch(() => props.athleteId, loadHistory, { immediate: true })
onMounted(loadHistory)
</script>

<style scoped>
.athlete-history {
  padding: 16px 0;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.loading, .empty {
  text-align: center;
  padding: 32px;
  color: #737373;
}

.empty svg {
  width: 48px;
  height: 48px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.tournament-name {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
}

.sport-type {
  background: #F5F5F5;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #525252;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #525252;
}

.meta-item svg {
  width: 14px;
  height: 14px;
  color: #A3A3A3;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #737373;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.matches-section, .awards-section {
  margin-bottom: 12px;
  padding-top: 12px;
  border-top: 1px solid #F5F5F5;
}

.matches-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.match-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.match-date {
  color: #737373;
  min-width: 50px;
}

.opponent {
  flex: 1;
  color: #525252;
}

.result {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.result-win { background: #D1FAE5; color: #065F46; }
.result-lose { background: #FEE2E2; color: #991B1B; }
.result-draw { background: #F3F4F6; color: #374151; }
.result-pending { background: #FEF3C7; color: #92400E; }

.score {
  font-size: 12px;
  color: #737373;
}

.awards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.award-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.award-badge svg {
  width: 14px;
  height: 14px;
}

.award-gold { background: #FEF3C7; color: #D97706; }
.award-silver { background: #F3F4F6; color: #6B7280; }
.award-bronze { background: #FED7AA; color: #C2410C; }
.award-certificate { background: #DBEAFE; color: #2563EB; }
.award-special { background: #E9D5FF; color: #7C3AED; }

.stats-row {
  display: flex;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid #F5F5F5;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #171717;
}

.stat-label {
  font-size: 11px;
  color: #737373;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #E5E5E5;
}

.summary-card {
  background: #F5F5F5;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.summary-card.gold {
  background: #FEF3C7;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: #171717;
}

.summary-label {
  font-size: 11px;
  color: #737373;
}

@media (max-width: 640px) {
  .summary-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
