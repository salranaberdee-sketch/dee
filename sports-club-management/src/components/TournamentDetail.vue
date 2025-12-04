<template>
  <div class="tournament-detail">
    <!-- Tournament Info Section -->
    <div class="info-section">
      <div class="section-header">
        <div class="section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <h3>ข้อมูลทัวนาเมนต์</h3>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">ประเภทกีฬา</span>
          <span class="value">{{ tournament.sport_type }}</span>
        </div>
        <div class="info-item">
          <span class="label">วันที่แข่งขัน</span>
          <span class="value">{{ formatDateRange(tournament.start_date, tournament.end_date) }}</span>
        </div>
        <div class="info-item">
          <span class="label">สถานที่</span>
          <span class="value">{{ tournament.location }}</span>
        </div>
        <div class="info-item" v-if="tournament.venue">
          <span class="label">สนาม</span>
          <span class="value">{{ tournament.venue }}</span>
        </div>
        <div class="info-item" v-if="tournament.organizer">
          <span class="label">ผู้จัดงาน</span>
          <span class="value">{{ tournament.organizer }}</span>
        </div>
        <div class="info-item">
          <span class="label">สถานะ</span>
          <span :class="['status-badge', `status-${tournament.status}`]">{{ statusLabels[tournament.status] }}</span>
        </div>
      </div>
      <p v-if="tournament.description" class="description">{{ tournament.description }}</p>
    </div>

    <!-- Tabs Navigation -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'participants' }]" @click="activeTab = 'participants'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
        ผู้เข้าแข่งขัน ({{ participants.length }})
      </button>
      <button :class="['tab', { active: activeTab === 'matches' }]" @click="activeTab = 'matches'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        ผลการแข่งขัน ({{ matches.length }})
      </button>
      <button :class="['tab', { active: activeTab === 'awards' }]" @click="activeTab = 'awards'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="7"/>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
        </svg>
        รางวัล ({{ awards.length }})
      </button>
    </div>

    <!-- Participants Tab -->
    <div v-if="activeTab === 'participants'" class="tab-content">
      <!-- Loading State -->
      <div v-if="dataLoading" class="tab-loading">
        <div class="loading-spinner"></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
      
      <!-- Error State -->
      <div v-else-if="dataError" class="tab-error">
        <div class="error-icon-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p>{{ dataError }}</p>
        <button class="btn-secondary btn-sm" @click="retryLoad">ลองใหม่</button>
      </div>
      
      <!-- Content -->
      <template v-else>
        <!-- Section Header with Add Button -->
        <div class="tab-header">
          <div class="header-left">
            <div class="section-icon-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <h3>รายชื่อผู้เข้าแข่งขัน</h3>
          </div>
          <button v-if="canAddParticipant" class="btn-primary btn-sm" @click="showBulkAddModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            เพิ่มนักกีฬา
          </button>
        </div>

        <!-- Registration Statistics -->
        <RegistrationStats 
          :participants="participants" 
          :max-participants="tournament.max_participants"
        />

        <!-- Grouped Participant List -->
        <GroupedParticipantList
          :participants="participants"
          :coach-club-id="coachClubId"
          @remove="removeParticipantConfirm"
          @refresh="loadData"
        />
      </template>
    </div>

    <!-- Matches Tab -->
    <div v-if="activeTab === 'matches'" class="tab-content">
      <MatchTimeline
        :matches="matches"
        :participants="participants"
        :tournament-id="tournament.id"
        :coach-club-id="coachClubId"
        @refresh="loadData"
      />
    </div>

    <!-- Awards Tab -->
    <div v-if="activeTab === 'awards'" class="tab-content">
      <div class="tab-header">
        <div class="header-left">
          <div class="section-icon-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="7"/>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
            </svg>
          </div>
          <h3>รางวัลที่ได้รับ</h3>
        </div>
        <button v-if="canAddAward" class="btn-primary btn-sm" @click="showAddAward = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          เพิ่มรางวัล
        </button>
      </div>

      <div v-if="awards.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="7"/>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
        </svg>
        <p>ยังไม่มีรางวัล</p>
      </div>
      
      <!-- Awards Grouped by Type -->
      <div v-else class="awards-grouped">
        <div 
          v-for="group in groupedAwards" 
          :key="group.type" 
          class="award-group"
        >
          <div class="award-group-header">
            <div :class="['award-icon-header', `award-${group.type}`]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="7"/>
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
              </svg>
            </div>
            <span class="award-group-name">{{ awardLabels[group.type] }}</span>
            <span class="award-group-count">{{ group.awards.length }}</span>
          </div>
          <div class="award-group-list">
            <div v-for="a in group.awards" :key="a.id" class="award-item">
              <div class="award-athlete-info">
                <div class="avatar">{{ a.tournament_participants?.athletes?.name?.charAt(0) || '?' }}</div>
                <div class="award-details">
                  <div class="award-athlete-name">{{ a.tournament_participants?.athletes?.name }}</div>
                  <div v-if="a.award_name" class="award-name">{{ a.award_name }}</div>
                </div>
              </div>
              <button v-if="canManageAward(a)" class="btn-icon btn-sm" @click="removeAwardConfirm(a)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Add Modal -->
    <BulkAddModal
      :show="showBulkAddModal"
      :tournament-id="tournament.id"
      :athletes="availableAthletes"
      :existing-participant-ids="existingParticipantIds"
      :clubs="clubs"
      @close="showBulkAddModal = false"
      @success="handleBulkAddSuccess"
    />

    <!-- Add Award Modal -->
    <Modal v-if="showAddAward" @close="showAddAward = false">
      <template #header><h2>เพิ่มรางวัล</h2></template>
      <template #body>
        <form class="form" @submit.prevent="addAward">
          <div class="form-group">
            <label>นักกีฬา *</label>
            <select v-model="awardForm.participant_id" required>
              <option value="">-- เลือกนักกีฬา --</option>
              <option v-for="p in participants" :key="p.id" :value="p.id">
                {{ p.athletes?.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>ประเภทรางวัล *</label>
            <select v-model="awardForm.award_type" required>
              <option value="gold">เหรียญทอง</option>
              <option value="silver">เหรียญเงิน</option>
              <option value="bronze">เหรียญทองแดง</option>
              <option value="certificate">ประกาศนียบัตร</option>
              <option value="special">รางวัลพิเศษ</option>
            </select>
          </div>
          <div class="form-group">
            <label>ชื่อรางวัล</label>
            <input type="text" v-model="awardForm.award_name" placeholder="เช่น ชนะเลิศรุ่นเยาวชน">
          </div>
          <div class="form-group">
            <label>วันที่ได้รับ</label>
            <input type="date" v-model="awardForm.awarded_date">
          </div>
          <div class="form-group">
            <label>รายละเอียด</label>
            <textarea v-model="awardForm.description" rows="2"></textarea>
          </div>
        </form>
      </template>
      <template #footer>
        <button class="btn-secondary" @click="showAddAward = false">ยกเลิก</button>
        <button class="btn-primary" @click="addAward" :disabled="saving">บันทึก</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDataStore } from '@/stores/data'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'
import GroupedParticipantList from '@/components/GroupedParticipantList.vue'
import RegistrationStats from '@/components/RegistrationStats.vue'
import MatchTimeline from '@/components/MatchTimeline.vue'
import BulkAddModal from '@/components/BulkAddModal.vue'
import { logTournamentActivity, ACTIONS, LOG_LEVELS } from '@/lib/tournamentLogger'

const props = defineProps({
  tournament: { type: Object, required: true }
})

const emit = defineEmits(['refresh'])

const dataStore = useDataStore()
const authStore = useAuthStore()

// State
const activeTab = ref('participants')
const participants = ref([])
const matches = ref([])
const awards = ref([])
const saving = ref(false)

// Loading และ Error states สำหรับ bulk operations
const dataLoading = ref(false)
const dataError = ref(null)

// Modal states
const showBulkAddModal = ref(false)
const showAddAward = ref(false)

// Labels
const statusLabels = { 
  upcoming: 'กำลังจะมาถึง', 
  ongoing: 'กำลังแข่งขัน', 
  completed: 'เสร็จสิ้น', 
  cancelled: 'ยกเลิก' 
}
const awardLabels = { 
  gold: 'เหรียญทอง', 
  silver: 'เหรียญเงิน', 
  bronze: 'เหรียญทองแดง', 
  certificate: 'ประกาศนียบัตร', 
  special: 'รางวัลพิเศษ' 
}

// Award form
const awardForm = ref({ 
  participant_id: '', 
  award_type: 'gold', 
  award_name: '', 
  awarded_date: '', 
  description: '' 
})

// Computed
const isAdmin = computed(() => authStore.isAdmin)
const isCoach = computed(() => authStore.isCoach)

const coachClubId = computed(() => {
  if (!isCoach.value) return null
  const coach = dataStore.coaches.find(c => c.user_id === authStore.user?.id)
  return coach?.club_id
})

const canAddParticipant = computed(() => isAdmin.value || isCoach.value)
const canAddAward = computed(() => (isAdmin.value || isCoach.value) && participants.value.length > 0)

// รายการ ID ของนักกีฬาที่ลงทะเบียนแล้ว
const existingParticipantIds = computed(() => {
  return participants.value.map(p => p.athlete_id)
})

// รายการนักกีฬาที่สามารถเพิ่มได้
const availableAthletes = computed(() => {
  let athletes = dataStore.athletes
  // โค้ชเห็นเฉพาะนักกีฬาในชมรม
  if (isCoach.value && coachClubId.value) {
    athletes = athletes.filter(a => a.club_id === coachClubId.value)
  }
  return athletes
})

// รายการชมรม
const clubs = computed(() => dataStore.clubs)

/**
 * จัดกลุ่มรางวัลตามประเภท
 * Requirements 5.5: แสดงรางวัลจัดกลุ่มตามประเภท
 */
const groupedAwards = computed(() => {
  const groups = new Map()
  const typeOrder = ['gold', 'silver', 'bronze', 'certificate', 'special']
  
  // จัดกลุ่มรางวัล
  for (const award of awards.value) {
    const type = award.award_type || 'special'
    if (!groups.has(type)) {
      groups.set(type, [])
    }
    groups.get(type).push(award)
  }
  
  // แปลงเป็น Array และเรียงตามลำดับ
  const result = []
  for (const type of typeOrder) {
    if (groups.has(type)) {
      result.push({
        type,
        awards: groups.get(type)
      })
    }
  }
  
  return result
})

// Methods
function canManageAward(a) {
  if (isAdmin.value) return true
  const participant = participants.value.find(p => p.id === a.participant_id)
  if (isCoach.value && participant?.club_id === coachClubId.value) return true
  return false
}

function formatDateRange(start, end) {
  const s = new Date(start).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  const e = new Date(end).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  return start === end ? s : `${s} - ${e}`
}

/**
 * โหลดข้อมูลทั้งหมดของทัวนาเมนต์
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
async function loadData() {
  dataLoading.value = true
  dataError.value = null
  
  try {
    // โหลดข้อมูลพร้อมกัน
    const [participantsData, matchesData, awardsData] = await Promise.all([
      dataStore.fetchTournamentParticipants(props.tournament.id),
      dataStore.fetchTournamentMatches(props.tournament.id),
      dataStore.fetchTournamentAwards(props.tournament.id)
    ])
    
    participants.value = participantsData
    matches.value = matchesData
    awards.value = awardsData
  } catch (err) {
    dataError.value = 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่'
    console.error('Error loading tournament data:', err)
  } finally {
    dataLoading.value = false
  }
}

/**
 * ลองโหลดข้อมูลใหม่
 */
async function retryLoad() {
  await loadData()
}

// จัดการเมื่อเพิ่มนักกีฬาสำเร็จ
function handleBulkAddSuccess(result) {
  loadData()
}

async function removeParticipantConfirm(p) {
  if (confirm(`ต้องการลบ ${p.athletes?.name} ออกจากรายการแข่งขันหรือไม่?`)) {
    await dataStore.removeParticipant(p.id)
    await loadData()
  }
}

async function addAward() {
  if (!awardForm.value.participant_id || !awardForm.value.award_type) return
  saving.value = true
  
  const result = await dataStore.addTournamentAward({
    tournament_id: props.tournament.id,
    participant_id: awardForm.value.participant_id,
    award_type: awardForm.value.award_type,
    award_name: awardForm.value.award_name || null,
    description: awardForm.value.description || null,
    awarded_date: awardForm.value.awarded_date || null,
    recorded_by: authStore.user?.id
  })
  
  saving.value = false
  if (result.success) {
    logTournamentActivity({
      action: ACTIONS.AWARD_CREATE,
      userId: authStore.user?.id,
      userRole: authStore.profile?.role,
      tournamentId: props.tournament.id,
      details: { participantId: awardForm.value.participant_id, awardType: awardForm.value.award_type },
      level: LOG_LEVELS.SUCCESS
    })
    showAddAward.value = false
    awardForm.value = { participant_id: '', award_type: 'gold', award_name: '', awarded_date: '', description: '' }
    await loadData()
  } else {
    alert(result.message)
  }
}

async function removeAwardConfirm(a) {
  if (confirm('ต้องการลบรางวัลนี้หรือไม่?')) {
    await dataStore.deleteTournamentAward(a.id)
    await loadData()
  }
}

watch(() => props.tournament.id, loadData, { immediate: true })
onMounted(loadData)
</script>


<style scoped>
.tournament-detail {
  min-height: 400px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Section Header */
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #171717;
}

.section-icon {
  width: 40px;
  height: 40px;
  background: #171717;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.section-icon-sm {
  width: 32px;
  height: 32px;
  background: #171717;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon-sm svg {
  width: 16px;
  height: 16px;
  color: #fff;
}

/* Info Section */
.info-section {
  background: #FAFAFA;
  border-radius: 12px;
  padding: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #737373;
}

.info-item .value {
  font-size: 14px;
  color: #171717;
  font-weight: 500;
}

.description {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E5E5E5;
  color: #525252;
  font-size: 14px;
  line-height: 1.5;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-upcoming { background: #DBEAFE; color: #1E40AF; }
.status-ongoing { background: #D1FAE5; color: #065F46; }
.status-completed { background: #F3F4F6; color: #374151; }
.status-cancelled { background: #FEE2E2; color: #991B1B; }

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #E5E5E5;
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #737373;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: -1px;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tab svg {
  width: 18px;
  height: 18px;
}

.tab.active {
  color: #171717;
  border-bottom-color: #171717;
}

.tab:hover {
  color: #171717;
}

/* Tab Content */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 200px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tab-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #171717;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #737373;
  text-align: center;
  background: #FAFAFA;
  border-radius: 12px;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Awards Grouped */
.awards-grouped {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.award-group {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  overflow: hidden;
}

.award-group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #FAFAFA;
  border-bottom: 1px solid #E5E5E5;
}

.award-icon-header {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.award-icon-header svg {
  width: 18px;
  height: 18px;
}

.award-gold { background: #FEF3C7; }
.award-gold svg { stroke: #D97706; }
.award-silver { background: #F3F4F6; }
.award-silver svg { stroke: #6B7280; }
.award-bronze { background: #FED7AA; }
.award-bronze svg { stroke: #C2410C; }
.award-certificate { background: #DBEAFE; }
.award-certificate svg { stroke: #2563EB; }
.award-special { background: #E9D5FF; }
.award-special svg { stroke: #7C3AED; }

.award-group-name {
  font-weight: 600;
  font-size: 14px;
  color: #171717;
  flex: 1;
}

.award-group-count {
  background: #171717;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
}

.award-group-list {
  display: flex;
  flex-direction: column;
}

.award-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #F5F5F5;
}

.award-item:last-child {
  border-bottom: none;
}

.award-athlete-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.award-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.award-athlete-name {
  font-weight: 500;
  font-size: 14px;
  color: #171717;
}

.award-name {
  font-size: 12px;
  color: #737373;
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #171717;
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-primary:hover {
  background: #262626;
}

.btn-primary svg {
  width: 16px;
  height: 16px;
}

.btn-primary.btn-sm {
  padding: 8px 14px;
  font-size: 12px;
}

.btn-secondary {
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-icon {
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon svg {
  width: 14px;
  height: 14px;
  color: #737373;
}

.btn-icon.btn-sm {
  padding: 4px;
}

.btn-icon:hover {
  background: #FEE2E2;
  border-color: #EF4444;
}

.btn-icon:hover svg {
  color: #EF4444;
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #171717;
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .tournament-detail {
    gap: 16px;
  }
  
  /* Section Header */
  .section-header {
    margin-bottom: 14px;
  }
  
  .section-header h3 {
    font-size: 15px;
  }
  
  .section-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }
  
  .section-icon svg {
    width: 22px;
    height: 22px;
  }
  
  /* Info Section */
  .info-section {
    padding: 16px;
    border-radius: 14px;
  }
  
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  
  .info-item .label {
    font-size: 12px;
  }
  
  .info-item .value {
    font-size: 14px;
  }
  
  .description {
    font-size: 14px;
    margin-top: 14px;
    padding-top: 14px;
  }
  
  .status-badge {
    font-size: 12px;
    padding: 4px 10px;
  }
  
  /* Tabs - Scrollable */
  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 0;
    margin: 0 -16px;
    padding: 0 16px;
  }
  
  .tab {
    padding: 12px 16px;
    font-size: 13px;
    min-height: 48px;
    gap: 6px;
  }
  
  .tab svg {
    width: 18px;
    height: 18px;
  }
  
  /* Tab Content */
  .tab-content {
    gap: 16px;
  }
  
  .tab-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .header-left {
    gap: 10px;
  }
  
  .section-icon-sm {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
  
  .section-icon-sm svg {
    width: 18px;
    height: 18px;
  }
  
  .tab-header h3 {
    font-size: 15px;
  }
  
  /* Buttons - Touch-friendly */
  .btn-primary.btn-sm {
    width: 100%;
    justify-content: center;
    min-height: 48px;
    font-size: 14px;
    border-radius: 10px;
  }
  
  .btn-primary.btn-sm svg {
    width: 18px;
    height: 18px;
  }
  
  /* Empty State */
  .empty-state {
    padding: 40px 20px;
    border-radius: 14px;
  }
  
  .empty-state svg {
    width: 52px;
    height: 52px;
  }
  
  .empty-state p {
    font-size: 15px;
  }
  
  /* Awards Grouped */
  .awards-grouped {
    gap: 12px;
  }
  
  .award-group {
    border-radius: 14px;
  }
  
  .award-group-header {
    padding: 14px;
    gap: 10px;
  }
  
  .award-icon-header {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }
  
  .award-icon-header svg {
    width: 20px;
    height: 20px;
  }
  
  .award-group-name {
    font-size: 15px;
  }
  
  .award-group-count {
    font-size: 12px;
    padding: 4px 10px;
  }
  
  .award-item {
    padding: 14px;
    flex-wrap: wrap;
    gap: 10px;
    min-height: 60px;
  }
  
  .award-athlete-info {
    flex: 1;
    min-width: 0;
  }
  
  .avatar {
    width: 40px;
    height: 40px;
    font-size: 15px;
  }
  
  .award-athlete-name {
    font-size: 15px;
  }
  
  .award-name {
    font-size: 13px;
  }
  
  /* Touch-friendly action buttons */
  .btn-icon {
    min-width: 44px;
    min-height: 44px;
    padding: 10px;
    border-radius: 8px;
  }
  
  .btn-icon svg {
    width: 18px;
    height: 18px;
  }
  
  /* Form - full width inputs */
  .form {
    gap: 16px;
  }
  
  .form-group label {
    font-size: 14px;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 12px 14px;
    font-size: 16px; /* ป้องกัน zoom บน iOS */
    min-height: 48px;
    border-radius: 8px;
  }
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .info-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .tab {
    padding: 12px 18px;
  }
  
  .btn-icon {
    min-width: 40px;
    min-height: 40px;
  }
}

/* Loading State */
.tab-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  min-height: 200px;
}

.tab-loading p {
  margin: 16px 0 0;
  color: #737373;
  font-size: 14px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.tab-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  min-height: 200px;
  text-align: center;
  background: #FAFAFA;
  border-radius: 12px;
}

.error-icon-sm {
  width: 48px;
  height: 48px;
  background: #FEE2E2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.error-icon-sm svg {
  width: 24px;
  height: 24px;
  color: #991B1B;
}

.tab-error p {
  margin: 0 0 16px;
  color: #525252;
  font-size: 14px;
}

/* Mobile Responsive for Loading/Error */
@media (max-width: 640px) {
  .tab-loading,
  .tab-error {
    padding: 40px 20px;
    min-height: 180px;
  }
  
  .loading-spinner {
    width: 28px;
    height: 28px;
  }
  
  .error-icon-sm {
    width: 44px;
    height: 44px;
  }
  
  .error-icon-sm svg {
    width: 22px;
    height: 22px;
  }
}
</style>
