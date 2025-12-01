<template>
  <div class="history-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>ประวัติการแข่งขัน</h1>
        <p class="subtitle">รวมประวัติการแข่งขันของนักกีฬาทุกคน</p>
      </div>
      <button class="btn-secondary" @click="exportHistory">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        ส่งออกข้อมูล
      </button>
    </div>

    <!-- Summary Stats -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0012 0V2z"/>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-value">{{ totalTournaments }}</div>
          <div class="card-label">รายการแข่งขัน</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-value">{{ totalParticipants }}</div>
          <div class="card-label">ผู้เข้าแข่งขัน</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="7"/>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-value">{{ totalGoldMedals }}</div>
          <div class="card-label">เหรียญทอง</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="7"/>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-value">{{ totalAwards }}</div>
          <div class="card-label">รางวัลทั้งหมด</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <label>ค้นหานักกีฬา</label>
        <input type="text" v-model="searchQuery" placeholder="ชื่อนักกีฬา...">
      </div>
      <div class="filter-group">
        <label>ทัวนาเมนต์</label>
        <select v-model="filterTournament">
          <option value="">ทั้งหมด</option>
          <option v-for="t in tournaments" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>ประเภทรางวัล</label>
        <select v-model="filterAward">
          <option value="">ทั้งหมด</option>
          <option value="gold">เหรียญทอง</option>
          <option value="silver">เหรียญเงิน</option>
          <option value="bronze">เหรียญทองแดง</option>
          <option value="certificate">ประกาศนียบัตร</option>
          <option value="special">รางวัลพิเศษ</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">กำลังโหลด...</div>

    <!-- History List -->
    <div v-else class="history-list">
      <div v-for="athlete in filteredAthletes" :key="athlete.id" class="athlete-card">
        <div class="athlete-header" @click="toggleExpand(athlete.id)">
          <div class="athlete-info">
            <div class="avatar">{{ athlete.name?.charAt(0) || '?' }}</div>
            <div>
              <div class="athlete-name">{{ athlete.name }}</div>
              <div class="athlete-meta">{{ athlete.clubs?.name || 'ไม่มีชมรม' }}</div>
            </div>
          </div>
          <div class="athlete-stats">
            <div class="stat-item">
              <span class="stat-value">{{ athlete.history?.length || 0 }}</span>
              <span class="stat-label">รายการ</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ getWinCount(athlete) }}</span>
              <span class="stat-label">ชนะ</span>
            </div>
            <div class="stat-item gold">
              <span class="stat-value">{{ getGoldCount(athlete) }}</span>
              <span class="stat-label">ทอง</span>
            </div>
            <svg :class="['expand-icon', { expanded: expandedAthletes.includes(athlete.id) }]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <!-- Expanded History -->
        <div v-if="expandedAthletes.includes(athlete.id)" class="athlete-history">
          <div v-if="!athlete.history?.length" class="empty-history">ยังไม่มีประวัติการแข่งขัน</div>
          
          <div v-for="h in athlete.history" :key="h.id" class="history-item">
            <div class="history-header">
              <div class="tournament-info">
                <div class="tournament-name">{{ h.tournaments?.name }}</div>
                <span class="sport-badge">{{ h.tournaments?.sport_type }}</span>
              </div>
              <div class="tournament-date">{{ formatDateRange(h.tournaments?.start_date, h.tournaments?.end_date) }}</div>
            </div>

            <div class="history-details">
              <div class="detail-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{{ h.tournaments?.location }}</span>
              </div>
              <div v-if="h.category" class="detail-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>รุ่น: {{ h.category }}</span>
              </div>
            </div>

            <!-- Matches -->
            <div v-if="h.tournament_matches?.length" class="matches-section">
              <div class="section-title">ผลการแข่งขัน</div>
              <div class="matches-list">
                <div v-for="m in h.tournament_matches" :key="m.id" class="match-row">
                  <span class="match-date">{{ formatDate(m.match_date) }}</span>
                  <span class="match-vs">vs {{ m.opponent_name || 'ไม่ระบุ' }}</span>
                  <span :class="['result-badge', `result-${m.result}`]">{{ resultLabels[m.result] }}</span>
                  <span v-if="m.score" class="match-score">{{ m.score }}</span>
                </div>
              </div>
            </div>

            <!-- Awards -->
            <div v-if="h.tournament_awards?.length" class="awards-section">
              <div class="section-title">รางวัล</div>
              <div class="awards-list">
                <div v-for="a in h.tournament_awards" :key="a.id" :class="['award-badge', `award-${a.award_type}`]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="8" r="7"/>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                  </svg>
                  <span>{{ awardLabels[a.award_type] }}</span>
                  <span v-if="a.award_name" class="award-name">- {{ a.award_name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredAthletes.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0012 0V2z"/>
        </svg>
        <p>ไม่พบข้อมูลประวัติการแข่งขัน</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'

const dataStore = useDataStore()
const authStore = useAuthStore()

const loading = ref(false)
const athletesWithHistory = ref([])
const expandedAthletes = ref([])
const searchQuery = ref('')
const filterTournament = ref('')
const filterAward = ref('')

const resultLabels = { win: 'ชนะ', lose: 'แพ้', draw: 'เสมอ', pending: 'รอผล' }
const awardLabels = { gold: 'เหรียญทอง', silver: 'เหรียญเงิน', bronze: 'เหรียญทองแดง', certificate: 'ประกาศนียบัตร', special: 'รางวัลพิเศษ' }

const tournaments = computed(() => dataStore.tournaments)

const filteredAthletes = computed(() => {
  let result = athletesWithHistory.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(a => a.name?.toLowerCase().includes(query))
  }

  if (filterTournament.value) {
    result = result.filter(a => 
      a.history?.some(h => h.tournament_id === filterTournament.value)
    ).map(a => ({
      ...a,
      history: a.history?.filter(h => h.tournament_id === filterTournament.value)
    }))
  }

  if (filterAward.value) {
    result = result.filter(a => 
      a.history?.some(h => h.tournament_awards?.some(aw => aw.award_type === filterAward.value))
    ).map(a => ({
      ...a,
      history: a.history?.filter(h => h.tournament_awards?.some(aw => aw.award_type === filterAward.value))
    }))
  }

  return result.filter(a => a.history?.length > 0)
})

const totalTournaments = computed(() => tournaments.value.length)
const totalParticipants = computed(() => athletesWithHistory.value.filter(a => a.history?.length > 0).length)
const totalGoldMedals = computed(() => 
  athletesWithHistory.value.reduce((sum, a) => sum + getGoldCount(a), 0)
)
const totalAwards = computed(() => 
  athletesWithHistory.value.reduce((sum, a) => 
    sum + (a.history?.reduce((s, h) => s + (h.tournament_awards?.length || 0), 0) || 0), 0
  )
)

function getWinCount(athlete) {
  return athlete.history?.reduce((sum, h) => 
    sum + (h.tournament_matches?.filter(m => m.result === 'win').length || 0), 0
  ) || 0
}

function getGoldCount(athlete) {
  return athlete.history?.reduce((sum, h) => 
    sum + (h.tournament_awards?.filter(a => a.award_type === 'gold').length || 0), 0
  ) || 0
}

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

function toggleExpand(athleteId) {
  const idx = expandedAthletes.value.indexOf(athleteId)
  if (idx === -1) {
    expandedAthletes.value.push(athleteId)
  } else {
    expandedAthletes.value.splice(idx, 1)
  }
}

async function loadAllHistory() {
  loading.value = true
  
  await dataStore.fetchAthletes()
  await dataStore.fetchTournaments()
  
  const athletes = dataStore.athletes
  const historyPromises = athletes.map(async (athlete) => {
    const history = await dataStore.getAthleteHistory(athlete.id)
    return { ...athlete, history }
  })
  
  athletesWithHistory.value = await Promise.all(historyPromises)
  loading.value = false
}

function exportHistory() {
  const data = filteredAthletes.value.map(a => ({
    name: a.name,
    club: a.clubs?.name,
    email: a.email,
    phone: a.phone,
    tournaments: a.history?.map(h => ({
      tournament: h.tournaments?.name,
      sport: h.tournaments?.sport_type,
      date: formatDateRange(h.tournaments?.start_date, h.tournaments?.end_date),
      location: h.tournaments?.location,
      category: h.category,
      matches: h.tournament_matches?.map(m => ({
        date: m.match_date,
        opponent: m.opponent_name,
        result: resultLabels[m.result],
        score: m.score
      })),
      awards: h.tournament_awards?.map(aw => ({
        type: awardLabels[aw.award_type],
        name: aw.award_name
      }))
    }))
  }))

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tournament-history-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(loadAllHistory)
</script>


<style scoped>
.history-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.subtitle {
  color: #737373;
  margin: 4px 0 0;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

.btn-secondary svg {
  width: 18px;
  height: 18px;
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.summary-card .card-icon {
  width: 48px;
  height: 48px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-card .card-icon.gold {
  background: #FEF3C7;
}

.summary-card .card-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.summary-card .card-icon.gold svg {
  color: #D97706;
}

.card-content {
  flex: 1;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #171717;
}

.card-label {
  font-size: 13px;
  color: #737373;
}

/* Filters */
.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 12px;
  color: #737373;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
  min-width: 180px;
}

.loading {
  text-align: center;
  padding: 48px;
  color: #737373;
}

/* Athlete Cards */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.athlete-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  overflow: hidden;
}

.athlete-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.athlete-header:hover {
  background: #FAFAFA;
}

.athlete-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 44px;
  height: 44px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.athlete-name {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
}

.athlete-meta {
  font-size: 13px;
  color: #737373;
}

.athlete-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-item .stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #171717;
}

.stat-item.gold .stat-value {
  color: #D97706;
}

.stat-item .stat-label {
  font-size: 11px;
  color: #737373;
}

.expand-icon {
  width: 20px;
  height: 20px;
  color: #A3A3A3;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

/* Expanded History */
.athlete-history {
  border-top: 1px solid #E5E5E5;
  padding: 16px;
  background: #FAFAFA;
}

.empty-history {
  text-align: center;
  padding: 24px;
  color: #737373;
}

.history-item {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.history-item:last-child {
  margin-bottom: 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.tournament-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tournament-name {
  font-size: 15px;
  font-weight: 600;
  color: #171717;
}

.sport-badge {
  background: #F5F5F5;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  color: #525252;
}

.tournament-date {
  font-size: 12px;
  color: #737373;
}

.history-details {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #525252;
}

.detail-row svg {
  width: 14px;
  height: 14px;
  color: #A3A3A3;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #737373;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.matches-section, .awards-section {
  padding-top: 12px;
  border-top: 1px solid #F5F5F5;
  margin-top: 12px;
}

.matches-list {
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

.match-vs {
  flex: 1;
  color: #525252;
}

.result-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.result-win { background: #D1FAE5; color: #065F46; }
.result-lose { background: #FEE2E2; color: #991B1B; }
.result-draw { background: #F3F4F6; color: #374151; }
.result-pending { background: #FEF3C7; color: #92400E; }

.match-score {
  font-size: 12px;
  color: #737373;
}

.awards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.award-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
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

.award-name {
  font-weight: 400;
  opacity: 0.8;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #737373;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .athlete-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .athlete-stats {
    width: 100%;
    justify-content: space-between;
  }

  .filters {
    flex-direction: column;
  }

  .filter-group select,
  .filter-group input {
    width: 100%;
  }
}
</style>
