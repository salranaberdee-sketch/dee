<template>
  <div class="attendance-manager">
    <!-- Header -->
    <div class="page-header">
      <h1>บันทึกการเข้าร่วม</h1>
      <p class="subtitle">บันทึกสถานะการเข้าร่วมกิจกรรมของนักกีฬา</p>
    </div>

    <!-- Date & Schedule Selection -->
    <div class="selection-section">
      <div class="date-picker">
        <label>วันที่</label>
        <input type="date" v-model="selectedDate" @change="loadAthletes" />
      </div>

      <div class="schedule-picker" v-if="schedules.length > 0">
        <label>กิจกรรม</label>
        <select v-model="selectedScheduleId">
          <option value="">-- เลือกกิจกรรม --</option>
          <option v-for="s in schedules" :key="s.id" :value="s.id">
            {{ s.title }} ({{ s.time }})
          </option>
        </select>
      </div>

      <div class="type-picker">
        <label>ประเภท</label>
        <select v-model="recordType">
          <option value="training">ฝึกซ้อม</option>
          <option value="competition">แข่งขัน</option>
          <option value="meeting">ประชุม</option>
          <option value="other">อื่นๆ</option>
        </select>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <button @click="markAll('on_time')" class="btn-quick on-time">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        ทั้งหมดมาตรงเวลา
      </button>
      <button @click="markAll('absent')" class="btn-quick absent">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        ทั้งหมดขาด
      </button>
      <button @click="clearAll" class="btn-quick clear">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        ล้างทั้งหมด
      </button>
    </div>

    <!-- Athletes List -->
    <div class="athletes-list">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <div v-else-if="athletes.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
        <p>ไม่พบนักกีฬาในชมรม</p>
      </div>

      <div v-else class="athlete-cards">
        <div 
          v-for="athlete in athletes" 
          :key="athlete.id" 
          class="athlete-card"
          :class="getStatusClass(attendanceData[athlete.id]?.status)"
        >
          <div class="athlete-info">
            <span class="name">{{ athlete.name }}</span>
            <span class="email">{{ athlete.email }}</span>
          </div>

          <div class="status-buttons">
            <button 
              @click="setStatus(athlete.id, 'on_time')"
              class="status-btn on-time"
              :class="{ active: attendanceData[athlete.id]?.status === 'on_time' }"
              title="มาตรงเวลา"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>

            <button 
              @click="setStatus(athlete.id, 'late')"
              class="status-btn late"
              :class="{ active: attendanceData[athlete.id]?.status === 'late' }"
              title="มาสาย"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </button>

            <button 
              @click="openLeaveModal(athlete)"
              class="status-btn leave"
              :class="{ active: attendanceData[athlete.id]?.status === 'leave' }"
              title="ลา"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </button>

            <button 
              @click="setStatus(athlete.id, 'absent')"
              class="status-btn absent"
              :class="{ active: attendanceData[athlete.id]?.status === 'absent' }"
              title="ขาด"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Late Minutes Input -->
          <div v-if="attendanceData[athlete.id]?.status === 'late'" class="late-input">
            <label>สายกี่นาที:</label>
            <input 
              type="number" 
              v-model.number="attendanceData[athlete.id].late_minutes"
              min="1"
              max="120"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="save-section" v-if="hasChanges">
      <div class="summary">
        <span class="count on-time">{{ statusCounts.on_time }} มาตรงเวลา</span>
        <span class="count late">{{ statusCounts.late }} มาสาย</span>
        <span class="count leave">{{ statusCounts.leave }} ลา</span>
        <span class="count absent">{{ statusCounts.absent }} ขาด</span>
      </div>
      <button @click="saveAttendance" class="btn-save" :disabled="saving">
        {{ saving ? 'กำลังบันทึก...' : 'บันทึกการเข้าร่วม' }}
      </button>
    </div>

    <!-- Leave Modal -->
    <div v-if="showLeaveModal" class="modal-overlay" @click.self="showLeaveModal = false">
      <div class="modal-content">
        <h3>บันทึกการลา - {{ selectedAthlete?.name }}</h3>
        
        <div class="form-group">
          <label>ประเภทการลา</label>
          <select v-model="leaveForm.leave_type">
            <option value="sick">ลาป่วย</option>
            <option value="personal">ลากิจ</option>
            <option value="emergency">ฉุกเฉิน</option>
            <option value="other">อื่นๆ</option>
          </select>
        </div>

        <div class="form-group">
          <label>เหตุผล</label>
          <textarea v-model="leaveForm.leave_reason" rows="3" placeholder="ระบุเหตุผล..."></textarea>
        </div>

        <div class="modal-actions">
          <button @click="showLeaveModal = false" class="btn-cancel">ยกเลิก</button>
          <button @click="confirmLeave" class="btn-confirm">ยืนยัน</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { supabase } from '../lib/supabase'
import { useEvaluationStore } from '../stores/evaluation'
import { useAuthStore } from '../stores/auth'

const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const selectedScheduleId = ref('')
const recordType = ref('training')
const athletes = ref([])
const schedules = ref([])
const attendanceData = reactive({})
const loading = ref(false)
const saving = ref(false)
const showLeaveModal = ref(false)
const selectedAthlete = ref(null)
const leaveForm = reactive({
  leave_type: 'sick',
  leave_reason: ''
})

const hasChanges = computed(() => {
  return Object.keys(attendanceData).some(id => attendanceData[id]?.status)
})

const statusCounts = computed(() => {
  const counts = { on_time: 0, late: 0, leave: 0, absent: 0 }
  Object.values(attendanceData).forEach(data => {
    if (data?.status && counts[data.status] !== undefined) {
      counts[data.status]++
    }
  })
  return counts
})

function getStatusClass(status) {
  if (!status) return ''
  return `status-${status.replace('_', '-')}`
}

async function loadAthletes() {
  loading.value = true
  try {
    const clubId = authStore.profile?.club_id
    
    // Load athletes
    let query = supabase.from('athletes').select('*')
    if (clubId) query = query.eq('club_id', clubId)
    const { data: athleteData } = await query
    athletes.value = athleteData || []

    // Load schedules for the date
    const { data: scheduleData } = await supabase
      .from('schedules')
      .select('*')
      .eq('date', selectedDate.value)
      .eq('club_id', clubId)
    schedules.value = scheduleData || []

    // Load existing attendance records
    const { data: existingRecords } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('record_date', selectedDate.value)
      .in('athlete_id', athletes.value.map(a => a.id))

    // Populate attendanceData
    Object.keys(attendanceData).forEach(key => delete attendanceData[key])
    existingRecords?.forEach(record => {
      attendanceData[record.athlete_id] = {
        status: record.status,
        late_minutes: record.late_minutes || 0,
        leave_type: record.leave_type,
        leave_reason: record.leave_reason,
        id: record.id
      }
    })
  } catch (err) {
    console.error('Error loading athletes:', err)
  } finally {
    loading.value = false
  }
}

function setStatus(athleteId, status) {
  if (!attendanceData[athleteId]) {
    attendanceData[athleteId] = {}
  }
  attendanceData[athleteId].status = status
  if (status !== 'late') {
    attendanceData[athleteId].late_minutes = 0
  } else {
    attendanceData[athleteId].late_minutes = 15
  }
}

function markAll(status) {
  athletes.value.forEach(athlete => {
    setStatus(athlete.id, status)
  })
}

function clearAll() {
  Object.keys(attendanceData).forEach(key => {
    delete attendanceData[key]
  })
}

function openLeaveModal(athlete) {
  selectedAthlete.value = athlete
  leaveForm.leave_type = 'sick'
  leaveForm.leave_reason = ''
  showLeaveModal.value = true
}

function confirmLeave() {
  if (selectedAthlete.value) {
    const athleteId = selectedAthlete.value.id
    if (!attendanceData[athleteId]) {
      attendanceData[athleteId] = {}
    }
    attendanceData[athleteId].status = 'leave'
    attendanceData[athleteId].leave_type = leaveForm.leave_type
    attendanceData[athleteId].leave_reason = leaveForm.leave_reason
  }
  showLeaveModal.value = false
}

async function saveAttendance() {
  saving.value = true
  try {
    const clubId = authStore.profile?.club_id
    const records = []

    Object.entries(attendanceData).forEach(([athleteId, data]) => {
      if (data?.status) {
        records.push({
          athlete_id: athleteId,
          schedule_id: selectedScheduleId.value || null,
          club_id: clubId,
          record_date: selectedDate.value,
          record_type: recordType.value,
          status: data.status,
          late_minutes: data.late_minutes || 0,
          leave_type: data.status === 'leave' ? data.leave_type : null,
          leave_reason: data.status === 'leave' ? data.leave_reason : null,
          leave_approved: data.status === 'leave' ? false : null
        })
      }
    })

    const result = await evaluationStore.recordAttendance(records)
    if (result.success) {
      alert('บันทึกสำเร็จ!')
      await loadAthletes()
    } else {
      alert('เกิดข้อผิดพลาด: ' + result.error)
    }
  } catch (err) {
    console.error('Error saving:', err)
    alert('เกิดข้อผิดพลาด')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadAthletes()
})
</script>

<style scoped>
.attendance-manager {
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 100px;
}

.page-header {
  margin-bottom: 1.5rem;
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

.selection-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.selection-section > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.selection-section label {
  font-size: 0.875rem;
  color: #525252;
}

.selection-section input,
.selection-section select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
}

.quick-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.btn-quick {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-quick svg {
  width: 16px;
  height: 16px;
}

.btn-quick.on-time:hover { background: #D1FAE5; border-color: #22C55E; }
.btn-quick.absent:hover { background: #FEE2E2; border-color: #EF4444; }
.btn-quick.clear:hover { background: #F5F5F5; }

.loading-state, .empty-state {
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

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.athlete-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.athlete-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #fff;
  border: 2px solid #E5E5E5;
  border-radius: 12px;
  flex-wrap: wrap;
  gap: 1rem;
}

.athlete-card.status-on-time { border-color: #22C55E; background: #F0FDF4; }
.athlete-card.status-late { border-color: #F59E0B; background: #FFFBEB; }
.athlete-card.status-leave { border-color: #3B82F6; background: #EFF6FF; }
.athlete-card.status-absent { border-color: #EF4444; background: #FEF2F2; }

.athlete-info {
  display: flex;
  flex-direction: column;
  min-width: 150px;
}

.athlete-info .name {
  font-weight: 500;
  color: #171717;
}

.athlete-info .email {
  font-size: 0.75rem;
  color: #737373;
}

.status-buttons {
  display: flex;
  gap: 0.5rem;
}

.status-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 2px solid #E5E5E5;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.status-btn svg {
  width: 20px;
  height: 20px;
}

.status-btn.on-time:hover, .status-btn.on-time.active {
  border-color: #22C55E;
  background: #D1FAE5;
  color: #065F46;
}

.status-btn.late:hover, .status-btn.late.active {
  border-color: #F59E0B;
  background: #FEF3C7;
  color: #92400E;
}

.status-btn.leave:hover, .status-btn.leave.active {
  border-color: #3B82F6;
  background: #DBEAFE;
  color: #1E40AF;
}

.status-btn.absent:hover, .status-btn.absent.active {
  border-color: #EF4444;
  background: #FEE2E2;
  color: #991B1B;
}

.late-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.late-input input {
  width: 60px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #E5E5E5;
  border-radius: 4px;
}

.save-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: #fff;
  border-top: 1px solid #E5E5E5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
}

.summary {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.summary .count {
  font-size: 0.875rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.count.on-time { background: #D1FAE5; color: #065F46; }
.count.late { background: #FEF3C7; color: #92400E; }
.count.leave { background: #DBEAFE; color: #1E40AF; }
.count.absent { background: #FEE2E2; color: #991B1B; }

.btn-save {
  padding: 0.75rem 2rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.5;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
}

.modal-content h3 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: #525252;
  margin-bottom: 0.25rem;
}

.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
}

.btn-confirm {
  padding: 0.5rem 1rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

@media (max-width: 640px) {
  .attendance-manager {
    padding: 1rem;
  }

  .selection-section {
    flex-direction: column;
  }

  .athlete-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .save-section {
    flex-direction: column;
    gap: 1rem;
  }

  .btn-save {
    width: 100%;
  }
}
</style>
