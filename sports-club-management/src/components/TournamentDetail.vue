<template>
  <div class="tournament-detail">
    <!-- Tournament Info -->
    <div class="info-section">
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

    <!-- Tabs -->
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
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
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
      <div class="tab-header">
        <h3>รายชื่อผู้เข้าแข่งขัน</h3>
        <button v-if="canAddParticipant" class="btn-primary btn-sm" @click="showAddParticipant = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          เพิ่มนักกีฬา
        </button>
      </div>

      <div v-if="participants.length === 0" class="empty">ยังไม่มีผู้เข้าแข่งขัน</div>
      
      <div v-else class="participants-list">
        <div v-for="p in participants" :key="p.id" class="participant-item">
          <div class="participant-info">
            <div class="avatar">{{ p.athletes?.name?.charAt(0) || '?' }}</div>
            <div>
              <div class="name">{{ p.athletes?.name }}</div>
              <div class="meta">{{ p.clubs?.name }} | {{ p.category || '-' }}</div>
            </div>
          </div>
          <div class="participant-actions">
            <span :class="['reg-status', `reg-${p.registration_status}`]">
              {{ regStatusLabels[p.registration_status] }}
            </span>
            <button v-if="canManageParticipant(p)" class="btn-icon btn-sm" @click="removeParticipantConfirm(p)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Matches Tab -->
    <div v-if="activeTab === 'matches'" class="tab-content">
      <div class="tab-header">
        <h3>ผลการแข่งขัน</h3>
        <button v-if="canAddMatch" class="btn-primary btn-sm" @click="openMatchModal('add')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          บันทึกผล
        </button>
      </div>

      <div v-if="matches.length === 0" class="empty">ยังไม่มีผลการแข่งขัน</div>
      
      <div v-else class="matches-list">
        <div v-for="m in matches" :key="m.id" class="match-item">
          <div class="match-date">{{ formatDate(m.match_date) }}</div>
          <div class="match-info">
            <div class="athlete-name">{{ m.tournament_participants?.athletes?.name }}</div>
            <div class="vs">VS</div>
            <div class="opponent">{{ m.opponent_name || 'ไม่ระบุ' }}</div>
          </div>
          <div class="match-result">
            <span :class="['result-badge', `result-${m.result}`]">
              {{ resultLabels[m.result] }}
            </span>
            <span v-if="m.score" class="score">{{ m.score }}</span>
          </div>
          <div v-if="canManageMatch(m)" class="match-actions">
            <button class="btn-icon btn-sm" @click="openMatchModal('edit', m)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Awards Tab -->
    <div v-if="activeTab === 'awards'" class="tab-content">
      <div class="tab-header">
        <h3>รางวัลที่ได้รับ</h3>
        <button v-if="canAddAward" class="btn-primary btn-sm" @click="showAddAward = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          เพิ่มรางวัล
        </button>
      </div>

      <div v-if="awards.length === 0" class="empty">ยังไม่มีรางวัล</div>
      
      <div v-else class="awards-list">
        <div v-for="a in awards" :key="a.id" class="award-item">
          <div :class="['award-icon', `award-${a.award_type}`]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="7"/>
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
            </svg>
          </div>
          <div class="award-info">
            <div class="award-type">{{ awardLabels[a.award_type] }}</div>
            <div class="award-athlete">{{ a.tournament_participants?.athletes?.name }}</div>
            <div v-if="a.award_name" class="award-name">{{ a.award_name }}</div>
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

    <!-- Add Participant Modal -->
    <Modal v-if="showAddParticipant" @close="showAddParticipant = false">
      <template #header><h2>เพิ่มนักกีฬาเข้าแข่งขัน</h2></template>
      <template #body>
        <form class="form" @submit.prevent="addParticipant">
          <div class="form-group">
            <label>เลือกนักกีฬา *</label>
            <select v-model="participantForm.athlete_id" required>
              <option value="">-- เลือกนักกีฬา --</option>
              <option v-for="a in availableAthletes" :key="a.id" :value="a.id">
                {{ a.name }} ({{ a.clubs?.name || 'ไม่มีชมรม' }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>รุ่น/ประเภท</label>
            <input type="text" v-model="participantForm.category" placeholder="เช่น รุ่นเยาวชน, 50-55 กก.">
          </div>
          <div class="form-group">
            <label>รุ่นน้ำหนัก</label>
            <input type="text" v-model="participantForm.weight_class" placeholder="เช่น 55 กก.">
          </div>
        </form>
      </template>
      <template #footer>
        <button class="btn-secondary" @click="showAddParticipant = false">ยกเลิก</button>
        <button class="btn-primary" @click="addParticipant" :disabled="saving">บันทึก</button>
      </template>
    </Modal>

    <!-- Match Modal -->
    <Modal v-if="showMatchModal" @close="showMatchModal = false">
      <template #header><h2>{{ matchMode === 'add' ? 'บันทึกผลการแข่งขัน' : 'แก้ไขผลการแข่งขัน' }}</h2></template>
      <template #body>
        <form class="form" @submit.prevent="saveMatch">
          <div class="form-group">
            <label>นักกีฬา *</label>
            <select v-model="matchForm.participant_id" required>
              <option value="">-- เลือกนักกีฬา --</option>
              <option v-for="p in participants" :key="p.id" :value="p.id">
                {{ p.athletes?.name }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>วันที่แข่ง *</label>
              <input type="date" v-model="matchForm.match_date" required>
            </div>
            <div class="form-group">
              <label>เวลา</label>
              <input type="time" v-model="matchForm.match_time">
            </div>
          </div>
          <div class="form-group">
            <label>รอบ</label>
            <input type="text" v-model="matchForm.round" placeholder="เช่น รอบแรก, รอบชิง">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>คู่แข่ง</label>
              <input type="text" v-model="matchForm.opponent_name">
            </div>
            <div class="form-group">
              <label>ชมรมคู่แข่ง</label>
              <input type="text" v-model="matchForm.opponent_club">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>ผลการแข่งขัน</label>
              <select v-model="matchForm.result">
                <option value="pending">รอผล</option>
                <option value="win">ชนะ</option>
                <option value="lose">แพ้</option>
                <option value="draw">เสมอ</option>
              </select>
            </div>
            <div class="form-group">
              <label>คะแนน</label>
              <input type="text" v-model="matchForm.score" placeholder="เช่น 3-2, TKO">
            </div>
          </div>
          <div class="form-group">
            <label>หมายเหตุ</label>
            <textarea v-model="matchForm.notes" rows="2"></textarea>
          </div>
        </form>
      </template>
      <template #footer>
        <button class="btn-secondary" @click="showMatchModal = false">ยกเลิก</button>
        <button class="btn-primary" @click="saveMatch" :disabled="saving">บันทึก</button>
      </template>
    </Modal>

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
import { logTournamentActivity, ACTIONS, LOG_LEVELS } from '@/lib/tournamentLogger'

const props = defineProps({
  tournament: { type: Object, required: true }
})

const emit = defineEmits(['refresh'])

const dataStore = useDataStore()
const authStore = useAuthStore()

const activeTab = ref('participants')
const participants = ref([])
const matches = ref([])
const awards = ref([])
const saving = ref(false)

const showAddParticipant = ref(false)
const showMatchModal = ref(false)
const showAddAward = ref(false)
const matchMode = ref('add')

const statusLabels = { upcoming: 'กำลังจะมาถึง', ongoing: 'กำลังแข่งขัน', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก' }
const regStatusLabels = { pending: 'รอยืนยัน', approved: 'อนุมัติ', rejected: 'ปฏิเสธ', withdrawn: 'ถอนตัว' }
const resultLabels = { win: 'ชนะ', lose: 'แพ้', draw: 'เสมอ', pending: 'รอผล' }
const awardLabels = { gold: 'เหรียญทอง', silver: 'เหรียญเงิน', bronze: 'เหรียญทองแดง', certificate: 'ประกาศนียบัตร', special: 'รางวัลพิเศษ' }

const participantForm = ref({ athlete_id: '', category: '', weight_class: '' })
const matchForm = ref({ participant_id: '', match_date: '', match_time: '', round: '', opponent_name: '', opponent_club: '', result: 'pending', score: '', notes: '' })
const awardForm = ref({ participant_id: '', award_type: 'gold', award_name: '', awarded_date: '', description: '' })

const isAdmin = computed(() => authStore.isAdmin)
const isCoach = computed(() => authStore.isCoach)
const coachClubId = computed(() => {
  if (!isCoach.value) return null
  const coach = dataStore.coaches.find(c => c.user_id === authStore.user?.id)
  return coach?.club_id
})

const canAddParticipant = computed(() => isAdmin.value || isCoach.value)
const canAddMatch = computed(() => (isAdmin.value || isCoach.value) && participants.value.length > 0)
const canAddAward = computed(() => (isAdmin.value || isCoach.value) && participants.value.length > 0)

const availableAthletes = computed(() => {
  const registeredIds = participants.value.map(p => p.athlete_id)
  let athletes = dataStore.athletes.filter(a => !registeredIds.includes(a.id))
  if (isCoach.value && coachClubId.value) {
    athletes = athletes.filter(a => a.club_id === coachClubId.value)
  }
  return athletes
})

function canManageParticipant(p) {
  if (isAdmin.value) return true
  if (isCoach.value && p.club_id === coachClubId.value) return true
  return false
}

function canManageMatch(m) {
  if (isAdmin.value) return true
  const participant = participants.value.find(p => p.id === m.participant_id)
  if (isCoach.value && participant?.club_id === coachClubId.value) return true
  return false
}

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

function formatDate(date) {
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

async function loadData() {
  participants.value = await dataStore.fetchTournamentParticipants(props.tournament.id)
  matches.value = await dataStore.fetchTournamentMatches(props.tournament.id)
  awards.value = await dataStore.fetchTournamentAwards(props.tournament.id)
}

async function addParticipant() {
  if (!participantForm.value.athlete_id) return
  saving.value = true
  
  const athlete = dataStore.athletes.find(a => a.id === participantForm.value.athlete_id)
  const result = await dataStore.addTournamentParticipant({
    tournament_id: props.tournament.id,
    athlete_id: participantForm.value.athlete_id,
    club_id: athlete?.club_id,
    coach_id: athlete?.coach_id,
    category: participantForm.value.category || null,
    weight_class: participantForm.value.weight_class || null,
    registered_by: authStore.user?.id,
    registration_status: 'approved'
  })
  
  saving.value = false
  if (result.success) {
    // Log activity
    logTournamentActivity({
      action: ACTIONS.PARTICIPANT_ADD,
      userId: authStore.user?.id,
      userRole: authStore.profile?.role,
      tournamentId: props.tournament.id,
      details: { athleteId: participantForm.value.athlete_id, athleteName: athlete?.name },
      level: LOG_LEVELS.SUCCESS
    })
    showAddParticipant.value = false
    participantForm.value = { athlete_id: '', category: '', weight_class: '' }
    await loadData()
  } else {
    logTournamentActivity({
      action: ACTIONS.PARTICIPANT_ADD,
      userId: authStore.user?.id,
      userRole: authStore.profile?.role,
      tournamentId: props.tournament.id,
      details: { error: result.message },
      level: LOG_LEVELS.ERROR
    })
    alert(result.message)
  }
}

async function removeParticipantConfirm(p) {
  if (confirm(`ต้องการลบ ${p.athletes?.name} ออกจากรายการแข่งขันหรือไม่?`)) {
    await dataStore.removeParticipant(p.id)
    await loadData()
  }
}

function openMatchModal(mode, match = null) {
  matchMode.value = mode
  if (mode === 'edit' && match) {
    matchForm.value = { ...match }
  } else {
    matchForm.value = { participant_id: '', match_date: '', match_time: '', round: '', opponent_name: '', opponent_club: '', result: 'pending', score: '', notes: '' }
  }
  showMatchModal.value = true
}

async function saveMatch() {
  if (!matchForm.value.participant_id || !matchForm.value.match_date) return
  saving.value = true
  
  const payload = {
    ...matchForm.value,
    tournament_id: props.tournament.id,
    recorded_by: authStore.user?.id
  }
  
  let result
  const action = matchMode.value === 'add' ? ACTIONS.MATCH_CREATE : ACTIONS.MATCH_UPDATE
  if (matchMode.value === 'add') {
    result = await dataStore.addTournamentMatch(payload)
  } else {
    result = await dataStore.updateTournamentMatch(matchForm.value.id, payload)
  }
  
  saving.value = false
  if (result.success) {
    logTournamentActivity({
      action,
      userId: authStore.user?.id,
      userRole: authStore.profile?.role,
      tournamentId: props.tournament.id,
      details: { participantId: matchForm.value.participant_id, result: matchForm.value.result },
      level: LOG_LEVELS.SUCCESS
    })
    showMatchModal.value = false
    await loadData()
  } else {
    alert(result.message)
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
}

.info-section {
  background: #FAFAFA;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E5E5E5;
  color: #525252;
  font-size: 14px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-upcoming { background: #DBEAFE; color: #1E40AF; }
.status-ongoing { background: #D1FAE5; color: #065F46; }
.status-completed { background: #F3F4F6; color: #374151; }
.status-cancelled { background: #FEE2E2; color: #991B1B; }

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #E5E5E5;
  margin-bottom: 20px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #737373;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: -1px;
}

.tab svg {
  width: 16px;
  height: 16px;
}

.tab.active {
  color: #171717;
  border-bottom-color: #171717;
}

.tab:hover {
  color: #171717;
}

.tab-content {
  min-height: 200px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tab-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #171717;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary svg {
  width: 16px;
  height: 16px;
}

.btn-primary.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-secondary {
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 8px 16px;
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
}

.btn-icon svg {
  width: 14px;
  height: 14px;
}

.btn-icon.btn-sm {
  padding: 4px;
}

.btn-icon:hover {
  background: #FEE2E2;
  border-color: #EF4444;
}

.btn-icon:hover svg {
  stroke: #EF4444;
}

.empty {
  text-align: center;
  padding: 32px;
  color: #737373;
}

/* Participants */
.participants-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.participant-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.participant-info {
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
}

.participant-info .name {
  font-weight: 500;
  color: #171717;
}

.participant-info .meta {
  font-size: 12px;
  color: #737373;
}

.participant-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reg-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
}

.reg-pending { background: #FEF3C7; color: #92400E; }
.reg-approved { background: #D1FAE5; color: #065F46; }
.reg-rejected { background: #FEE2E2; color: #991B1B; }
.reg-withdrawn { background: #F3F4F6; color: #374151; }

/* Matches */
.matches-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.match-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.match-date {
  font-size: 12px;
  color: #737373;
  min-width: 60px;
}

.match-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.athlete-name {
  font-weight: 500;
}

.vs {
  color: #A3A3A3;
  font-size: 12px;
}

.opponent {
  color: #525252;
}

.match-result {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.result-win { background: #D1FAE5; color: #065F46; }
.result-lose { background: #FEE2E2; color: #991B1B; }
.result-draw { background: #F3F4F6; color: #374151; }
.result-pending { background: #FEF3C7; color: #92400E; }

.score {
  font-size: 13px;
  color: #525252;
}

.match-actions {
  display: flex;
  gap: 4px;
}

/* Awards */
.awards-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.award-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.award-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.award-icon svg {
  width: 20px;
  height: 20px;
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

.award-info {
  flex: 1;
  min-width: 0;
}

.award-type {
  font-weight: 600;
  font-size: 14px;
  color: #171717;
}

.award-athlete {
  font-size: 13px;
  color: #525252;
}

.award-name {
  font-size: 12px;
  color: #737373;
  margin-top: 2px;
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
  padding: 8px 10px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 640px) {
  .tabs {
    overflow-x: auto;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .match-item {
    flex-wrap: wrap;
  }
  
  .awards-list {
    grid-template-columns: 1fr;
  }
}
</style>
