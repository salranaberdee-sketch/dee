<template>
  <div class="match-timeline">
    <!-- Header with Add Button -->
    <div class="timeline-header">
      <div class="header-info">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="header-text">
          <h3>ผลการแข่งขัน</h3>
          <span class="match-count">{{ matches.length }} รายการ</span>
        </div>
      </div>
      <button v-if="canAddMatch" class="btn-primary btn-sm" @click="openAddModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        บันทึกผล
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="matches.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
      <p>ยังไม่มีผลการแข่งขัน</p>
      <button v-if="canAddMatch" class="btn-secondary" @click="openAddModal">
        บันทึกผลการแข่งขันแรก
      </button>
    </div>

    <!-- Timeline by Round -->
    <div v-else class="rounds-container">
      <div 
        v-for="(group, index) in sortedRoundGroups" 
        :key="group.round" 
        class="round-group"
      >
        <!-- Round Header -->
        <div class="round-header">
          <div class="round-indicator">
            <div class="round-dot"></div>
            <div v-if="index < sortedRoundGroups.length - 1" class="round-line"></div>
          </div>
          <div class="round-info">
            <span class="round-name">{{ group.displayName }}</span>
            <span class="round-count">{{ group.matches.length }} แมตช์</span>
          </div>
        </div>

        <!-- Matches in Round -->
        <div class="matches-container">
          <div 
            v-for="match in group.matches" 
            :key="match.id" 
            class="match-card"
            :class="{ 'match-pending': match.result === 'pending' }"
          >
            <!-- Match Time -->
            <div class="match-time">
              <span class="match-date">{{ formatDate(match.match_date) }}</span>
              <span v-if="match.match_time" class="match-hour">{{ formatTime(match.match_time) }}</span>
            </div>

            <!-- Match Content -->
            <div class="match-content">
              <!-- Athlete Side -->
              <div class="match-athlete">
                <div class="athlete-avatar">
                  {{ getAthleteInitial(match) }}
                </div>
                <div class="athlete-info">
                  <span class="athlete-name">{{ getAthleteName(match) }}</span>
                  <span class="athlete-club">{{ getAthleteClub(match) }}</span>
                </div>
              </div>

              <!-- Result Indicator -->
              <div class="match-result-indicator">
                <div :class="['result-badge', `result-${match.result}`]">
                  {{ resultLabels[match.result] }}
                </div>
                <span v-if="match.score" class="match-score">{{ match.score }}</span>
              </div>

              <!-- Opponent Side -->
              <div class="match-opponent">
                <div class="opponent-info">
                  <span class="opponent-name">{{ match.opponent_name || 'ไม่ระบุคู่แข่ง' }}</span>
                  <span v-if="match.opponent_club" class="opponent-club">{{ match.opponent_club }}</span>
                </div>
                <div class="opponent-avatar">
                  {{ getOpponentInitial(match) }}
                </div>
              </div>
            </div>

            <!-- Match Notes -->
            <div v-if="match.notes" class="match-notes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>{{ match.notes }}</span>
            </div>

            <!-- Match Actions -->
            <div v-if="canManageMatch(match)" class="match-actions">
              <button class="btn-icon btn-sm" @click="openEditModal(match)" title="แก้ไข">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon btn-sm btn-danger-icon" @click="confirmDelete(match)" title="ลบ">
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

    <!-- Add/Edit Match Modal -->
    <Modal v-if="showModal" @close="closeModal">
      <template #header>
        <h2>{{ isEditMode ? 'แก้ไขผลการแข่งขัน' : 'บันทึกผลการแข่งขัน' }}</h2>
      </template>
      <template #body>
        <form class="form" @submit.prevent="saveMatch">
          <!-- Participant Selection -->
          <div class="form-group">
            <label>นักกีฬา *</label>
            <select v-model="matchForm.participant_id" required>
              <option value="">-- เลือกนักกีฬา --</option>
              <option v-for="p in participants" :key="p.id" :value="p.id">
                {{ p.athletes?.name }} ({{ p.clubs?.name || 'ไม่มีชมรม' }})
              </option>
            </select>
          </div>

          <!-- Date and Time -->
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

          <!-- Round -->
          <div class="form-group">
            <label>รอบ</label>
            <input 
              type="text" 
              v-model="matchForm.round" 
              placeholder="เช่น รอบแรก, รอบรองชนะเลิศ, รอบชิง"
              list="round-suggestions"
            >
            <datalist id="round-suggestions">
              <option value="รอบแรก"/>
              <option value="รอบสอง"/>
              <option value="รอบรองชนะเลิศ"/>
              <option value="รอบชิงชนะเลิศ"/>
              <option value="รอบชิงที่ 3"/>
            </datalist>
          </div>

          <!-- Opponent Info -->
          <div class="form-row">
            <div class="form-group">
              <label>ชื่อคู่แข่ง</label>
              <input type="text" v-model="matchForm.opponent_name" placeholder="ชื่อคู่แข่ง">
            </div>
            <div class="form-group">
              <label>ชมรมคู่แข่ง</label>
              <input type="text" v-model="matchForm.opponent_club" placeholder="ชมรมคู่แข่ง">
            </div>
          </div>

          <!-- Result and Score -->
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
              <input type="text" v-model="matchForm.score" placeholder="เช่น 3-2, TKO, 10-8">
            </div>
          </div>

          <!-- Notes -->
          <div class="form-group">
            <label>หมายเหตุ</label>
            <textarea 
              v-model="matchForm.notes" 
              rows="2" 
              placeholder="รายละเอียดเพิ่มเติม"
            ></textarea>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeModal">ยกเลิก</button>
          <button class="btn-primary" @click="saveMatch" :disabled="saving">
            {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'
import { groupMatchesByRound, sortMatchesChronologically } from '@/lib/tournamentUtils'
import { logTournamentActivity, ACTIONS, LOG_LEVELS } from '@/lib/tournamentLogger'

/**
 * MatchTimeline Component
 * 
 * แสดงผลการแข่งขันแบบ Timeline จัดกลุ่มตามรอบ
 * - Property 13: Match round grouping correctness
 * - Property 14: Match chronological sorting
 * Validates: Requirements 5.4, 7.1, 7.2, 7.4
 */

const props = defineProps({
  // รายการการแข่งขัน
  matches: {
    type: Array,
    required: true,
    default: () => []
  },
  // รายการผู้เข้าแข่งขัน (สำหรับ dropdown)
  participants: {
    type: Array,
    required: true,
    default: () => []
  },
  // ID ของทัวนาเมนต์
  tournamentId: {
    type: String,
    required: true
  },
  // Club ID ของโค้ช (สำหรับตรวจสอบสิทธิ์)
  coachClubId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['refresh'])

const authStore = useAuthStore()
const dataStore = useDataStore()

// State
const showModal = ref(false)
const isEditMode = ref(false)
const saving = ref(false)
const editingMatchId = ref(null)

// Form state
const matchForm = ref({
  participant_id: '',
  match_date: '',
  match_time: '',
  round: '',
  opponent_name: '',
  opponent_club: '',
  result: 'pending',
  score: '',
  notes: ''
})

// Labels
const resultLabels = {
  win: 'ชนะ',
  lose: 'แพ้',
  draw: 'เสมอ',
  pending: 'รอผล'
}

// Computed
const isAdmin = computed(() => authStore.isAdmin)
const isCoach = computed(() => authStore.isCoach)
const canAddMatch = computed(() => (isAdmin.value || isCoach.value) && props.participants.length > 0)

/**
 * จัดกลุ่มและเรียงลำดับการแข่งขันตามรอบ
 * Property 13: Match round grouping correctness - แต่ละการแข่งขันจะอยู่ในรอบเดียว
 * Property 14: Match chronological sorting - เรียงตามวันเวลาภายในแต่ละรอบ
 */
const sortedRoundGroups = computed(() => {
  const grouped = groupMatchesByRound(props.matches)
  const groups = []

  // แปลง Map เป็น Array และเรียงลำดับการแข่งขันในแต่ละรอบ
  for (const [round, matches] of grouped) {
    groups.push({
      round,
      displayName: round === 'ไม่ระบุรอบ' ? 'ไม่ระบุรอบ' : round,
      matches: sortMatchesChronologically(matches)
    })
  }

  // เรียงลำดับรอบ: รอบที่มีชื่อก่อน, ไม่ระบุรอบไว้ท้าย
  // และเรียงตามลำดับรอบที่พบบ่อย
  const roundOrder = ['รอบแรก', 'รอบสอง', 'รอบรองชนะเลิศ', 'รอบชิงที่ 3', 'รอบชิงชนะเลิศ']
  
  groups.sort((a, b) => {
    if (a.round === 'ไม่ระบุรอบ') return 1
    if (b.round === 'ไม่ระบุรอบ') return -1
    
    const indexA = roundOrder.indexOf(a.round)
    const indexB = roundOrder.indexOf(b.round)
    
    // ถ้าทั้งคู่อยู่ใน roundOrder ให้เรียงตามลำดับ
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    
    // ถ้ามีแค่ตัวเดียวอยู่ใน roundOrder ให้ตัวนั้นมาก่อน
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    
    // ถ้าไม่มีใน roundOrder ให้เรียงตามตัวอักษร
    return a.round.localeCompare(b.round, 'th')
  })

  return groups
})

// Methods
function getAthleteInitial(match) {
  const name = match.tournament_participants?.athletes?.name || ''
  return name.charAt(0) || '?'
}

function getAthleteName(match) {
  return match.tournament_participants?.athletes?.name || 'ไม่ระบุ'
}

function getAthleteClub(match) {
  return match.tournament_participants?.clubs?.name || 
         match.tournament_participants?.athletes?.clubs?.name || 
         'ไม่มีชมรม'
}

function getOpponentInitial(match) {
  const name = match.opponent_name || ''
  return name.charAt(0) || '?'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  // แปลง HH:MM:SS เป็น HH:MM
  return timeStr.substring(0, 5)
}

function canManageMatch(match) {
  if (isAdmin.value) return true
  if (isCoach.value && props.coachClubId) {
    const participant = props.participants.find(p => p.id === match.participant_id)
    return participant?.club_id === props.coachClubId
  }
  return false
}

function resetForm() {
  matchForm.value = {
    participant_id: '',
    match_date: '',
    match_time: '',
    round: '',
    opponent_name: '',
    opponent_club: '',
    result: 'pending',
    score: '',
    notes: ''
  }
}

function openAddModal() {
  isEditMode.value = false
  editingMatchId.value = null
  resetForm()
  // ตั้งค่าวันที่เริ่มต้นเป็นวันนี้
  matchForm.value.match_date = new Date().toISOString().split('T')[0]
  showModal.value = true
}

function openEditModal(match) {
  isEditMode.value = true
  editingMatchId.value = match.id
  matchForm.value = {
    participant_id: match.participant_id || '',
    match_date: match.match_date || '',
    match_time: match.match_time || '',
    round: match.round || '',
    opponent_name: match.opponent_name || '',
    opponent_club: match.opponent_club || '',
    result: match.result || 'pending',
    score: match.score || '',
    notes: match.notes || ''
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  resetForm()
}

async function saveMatch() {
  if (!matchForm.value.participant_id || !matchForm.value.match_date) {
    alert('กรุณากรอกข้อมูลที่จำเป็น')
    return
  }

  saving.value = true

  const payload = {
    tournament_id: props.tournamentId,
    participant_id: matchForm.value.participant_id,
    match_date: matchForm.value.match_date,
    match_time: matchForm.value.match_time || null,
    round: matchForm.value.round.trim() || null,
    opponent_name: matchForm.value.opponent_name.trim() || null,
    opponent_club: matchForm.value.opponent_club.trim() || null,
    result: matchForm.value.result,
    score: matchForm.value.score.trim() || null,
    notes: matchForm.value.notes.trim() || null,
    recorded_by: authStore.user?.id
  }

  let result
  const action = isEditMode.value ? ACTIONS.MATCH_UPDATE : ACTIONS.MATCH_CREATE

  if (isEditMode.value) {
    result = await dataStore.updateTournamentMatch(editingMatchId.value, payload)
  } else {
    result = await dataStore.addTournamentMatch(payload)
  }

  saving.value = false

  if (result.success) {
    // Log activity
    logTournamentActivity({
      action,
      userId: authStore.user?.id,
      userRole: authStore.profile?.role,
      tournamentId: props.tournamentId,
      details: { 
        participantId: matchForm.value.participant_id, 
        result: matchForm.value.result,
        round: matchForm.value.round
      },
      level: LOG_LEVELS.SUCCESS
    })
    closeModal()
    emit('refresh')
  } else {
    alert(result.message || 'เกิดข้อผิดพลาดในการบันทึก')
  }
}

async function confirmDelete(match) {
  const athleteName = getAthleteName(match)
  if (!confirm(`ต้องการลบผลการแข่งขันของ ${athleteName} หรือไม่?`)) {
    return
  }

  const result = await dataStore.deleteTournamentMatch(match.id)
  
  if (result.success) {
    logTournamentActivity({
      action: ACTIONS.MATCH_DELETE,
      userId: authStore.user?.id,
      userRole: authStore.profile?.role,
      tournamentId: props.tournamentId,
      details: { matchId: match.id, athleteName },
      level: LOG_LEVELS.SUCCESS
    })
    emit('refresh')
  } else {
    alert(result.message || 'เกิดข้อผิดพลาดในการลบ')
  }
}
</script>


<style scoped>
.match-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #FAFAFA;
  border-radius: 12px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 48px;
  height: 48px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.header-text h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #171717;
}

.match-count {
  font-size: 13px;
  color: #737373;
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
  margin: 0 0 16px 0;
  font-size: 14px;
}

/* Rounds Container */
.rounds-container {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Round Group */
.round-group {
  position: relative;
}

/* Round Header */
.round-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.round-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
}

.round-dot {
  width: 12px;
  height: 12px;
  background: #171717;
  border-radius: 50%;
  flex-shrink: 0;
}

.round-line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  background: #E5E5E5;
  margin-top: 4px;
}

.round-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 0;
}

.round-name {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.round-count {
  font-size: 12px;
  color: #737373;
  background: #F5F5F5;
  padding: 2px 8px;
  border-radius: 10px;
}

/* Matches Container */
.matches-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 36px;
  padding-bottom: 16px;
}

/* Match Card */
.match-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  position: relative;
}

.match-card.match-pending {
  border-style: dashed;
  background: #FAFAFA;
}

/* Match Time */
.match-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #737373;
}

.match-date {
  font-weight: 500;
}

.match-hour {
  padding: 2px 6px;
  background: #F5F5F5;
  border-radius: 4px;
}

/* Match Content */
.match-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Athlete Side */
.match-athlete {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.athlete-avatar {
  width: 40px;
  height: 40px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.athlete-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.athlete-name {
  font-weight: 500;
  color: #171717;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.athlete-club {
  font-size: 12px;
  color: #737373;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Result Indicator */
.match-result-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 60px;
}

.result-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.result-win {
  background: #D1FAE5;
  color: #065F46;
}

.result-lose {
  background: #FEE2E2;
  color: #991B1B;
}

.result-draw {
  background: #F3F4F6;
  color: #374151;
}

.result-pending {
  background: #FEF3C7;
  color: #92400E;
}

.match-score {
  font-size: 11px;
  color: #525252;
  font-weight: 500;
}

/* Opponent Side */
.match-opponent {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.opponent-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
}

.opponent-name {
  font-weight: 500;
  color: #525252;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opponent-club {
  font-size: 12px;
  color: #A3A3A3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opponent-avatar {
  width: 40px;
  height: 40px;
  background: #E5E5E5;
  color: #737373;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

/* Match Notes */
.match-notes {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #FAFAFA;
  border-radius: 8px;
  font-size: 13px;
  color: #525252;
}

.match-notes svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
  color: #A3A3A3;
}

/* Match Actions */
.match-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.match-card:hover .match-actions {
  opacity: 1;
}

/* Buttons */
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

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-primary svg {
  width: 16px;
  height: 16px;
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-icon {
  background: #fff;
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
  background: #F5F5F5;
  border-color: #D4D4D4;
}

.btn-icon.btn-danger-icon:hover {
  background: #FEE2E2;
  border-color: #EF4444;
}

.btn-icon.btn-danger-icon:hover svg {
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Mobile Responsive - Timeline Accordion */
@media (max-width: 640px) {
  .match-timeline {
    gap: 12px;
  }
  
  /* Header - full width */
  .timeline-header {
    flex-direction: column;
    gap: 14px;
    align-items: stretch;
    padding: 16px;
    border-radius: 16px;
  }

  .header-info {
    justify-content: center;
  }
  
  .header-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
  }
  
  .header-icon svg {
    width: 26px;
    height: 26px;
  }
  
  .header-text h3 {
    font-size: 17px;
  }
  
  .match-count {
    font-size: 14px;
  }

  .btn-primary.btn-sm {
    width: 100%;
    justify-content: center;
    min-height: 48px;
    font-size: 15px;
    border-radius: 10px;
  }
  
  .btn-primary.btn-sm svg {
    width: 18px;
    height: 18px;
  }
  
  /* Empty state */
  .empty-state {
    padding: 40px 20px;
    border-radius: 16px;
  }
  
  .empty-state svg {
    width: 56px;
    height: 56px;
  }
  
  .empty-state p {
    font-size: 15px;
    margin-bottom: 20px;
  }
  
  .empty-state .btn-secondary {
    min-height: 48px;
    font-size: 15px;
    padding: 12px 20px;
  }
  
  /* Round Header - Accordion style */
  .round-header {
    padding: 10px 0;
  }
  
  .round-indicator {
    width: 28px;
  }
  
  .round-dot {
    width: 14px;
    height: 14px;
  }
  
  .round-name {
    font-size: 15px;
  }
  
  .round-count {
    font-size: 13px;
    padding: 4px 10px;
  }

  /* Matches Container */
  .matches-container {
    margin-left: 28px;
    gap: 10px;
    padding-bottom: 20px;
  }

  /* Match Card - Card style */
  .match-card {
    padding: 16px;
    border-radius: 14px;
    gap: 14px;
  }
  
  /* Match Time */
  .match-time {
    font-size: 13px;
    gap: 10px;
  }
  
  .match-date {
    font-size: 14px;
  }
  
  .match-hour {
    padding: 4px 8px;
    font-size: 13px;
  }

  /* Match Content - Vertical layout */
  .match-content {
    flex-direction: column;
    gap: 14px;
  }

  .match-athlete,
  .match-opponent {
    width: 100%;
    justify-content: flex-start;
  }
  
  .athlete-avatar,
  .opponent-avatar {
    width: 44px;
    height: 44px;
    font-size: 17px;
  }
  
  .athlete-name,
  .opponent-name {
    font-size: 15px;
  }
  
  .athlete-club,
  .opponent-club {
    font-size: 13px;
  }

  .opponent-info {
    align-items: flex-start;
  }

  /* Result Indicator - Horizontal on mobile */
  .match-result-indicator {
    width: 100%;
    flex-direction: row;
    justify-content: center;
    gap: 14px;
    padding: 10px 0;
    border-top: 1px solid #F5F5F5;
    border-bottom: 1px solid #F5F5F5;
  }
  
  .result-badge {
    padding: 6px 16px;
    font-size: 13px;
  }
  
  .match-score {
    font-size: 13px;
  }
  
  /* Match Notes */
  .match-notes {
    padding: 12px 14px;
    font-size: 14px;
    border-radius: 10px;
  }
  
  .match-notes svg {
    width: 16px;
    height: 16px;
  }

  /* Match Actions - Always visible on mobile */
  .match-actions {
    opacity: 1;
    position: static;
    justify-content: flex-end;
    padding-top: 10px;
    border-top: 1px solid #F5F5F5;
    gap: 8px;
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
  
  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  /* Modal Actions */
  .modal-actions {
    flex-direction: column-reverse;
    gap: 10px;
  }
  
  .modal-actions .btn-primary,
  .modal-actions .btn-secondary {
    width: 100%;
    min-height: 48px;
    font-size: 15px;
    border-radius: 8px;
  }
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .timeline-header {
    padding: 18px;
  }
  
  .match-card {
    padding: 18px;
  }
  
  .btn-icon {
    min-width: 40px;
    min-height: 40px;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    min-height: 44px;
  }
}
</style>
