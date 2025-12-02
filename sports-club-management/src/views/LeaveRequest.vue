<template>
  <div class="leave-request">
    <!-- Header -->
    <div class="page-header">
      <h1>ขอลา</h1>
      <p class="subtitle">ส่งคำขอลาล่วงหน้า</p>
    </div>

    <!-- Upcoming Activities -->
    <div v-if="loadingActivities" class="loading-activities">
      <div class="spinner"></div>
      <span>กำลังโหลดกิจกรรม...</span>
    </div>

    <div v-else-if="upcomingActivities.length === 0" class="no-activities">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
      <p>ไม่มีกิจกรรมที่กำลังจะมาถึง</p>
      <span>ไม่สามารถขอลาได้ในขณะนี้</span>
    </div>

    <!-- Leave Form -->
    <form v-else @submit.prevent="submitRequest" class="leave-form">
      <div class="form-group">
        <label>เลือกกิจกรรมที่ต้องการลา</label>
        <div class="activity-list">
          <label 
            v-for="activity in upcomingActivities" 
            :key="activity.id"
            class="activity-option"
            :class="{ active: selectedActivity?.id === activity.id }"
          >
            <input 
              type="radio" 
              :value="activity" 
              v-model="selectedActivity"
              name="activity"
            />
            <div class="activity-date">
              <span class="day">{{ formatDay(activity.date) }}</span>
              <span class="month">{{ formatMonthShort(activity.date) }}</span>
            </div>
            <div class="activity-info">
              <span class="activity-title">{{ activity.title }}</span>
              <span class="activity-meta">
                <span class="activity-type" :class="activity.type">{{ getActivityTypeLabel(activity.type) }}</span>
                <span class="activity-time">{{ activity.time }}</span>
              </span>
            </div>
            <div class="activity-check" v-if="selectedActivity?.id === activity.id">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </label>
        </div>
        <p v-if="!selectedActivity" class="hint">กรุณาเลือกกิจกรรมที่ต้องการลา</p>
      </div>

      <div class="form-group">
        <label>ประเภทการลา</label>
        <div class="leave-types">
          <label class="leave-type-option" :class="{ active: form.leave_type === 'sick' }">
            <input type="radio" v-model="form.leave_type" value="sick" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            <span>ลาป่วย</span>
          </label>
          <label class="leave-type-option" :class="{ active: form.leave_type === 'personal' }">
            <input type="radio" v-model="form.leave_type" value="personal" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>ลากิจ</span>
          </label>
          <label class="leave-type-option" :class="{ active: form.leave_type === 'emergency' }">
            <input type="radio" v-model="form.leave_type" value="emergency" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>ฉุกเฉิน</span>
          </label>
          <label class="leave-type-option" :class="{ active: form.leave_type === 'other' }">
            <input type="radio" v-model="form.leave_type" value="other" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>อื่นๆ</span>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label>เหตุผล</label>
        <textarea 
          v-model="form.leave_reason" 
          rows="4" 
          placeholder="ระบุเหตุผลการลา..."
          required
        ></textarea>
      </div>

      <button type="submit" class="btn-submit" :disabled="submitting">
        {{ submitting ? 'กำลังส่ง...' : 'ส่งคำขอลา' }}
      </button>
    </form>

    <!-- My Leave History -->
    <div class="history-section">
      <h2>ประวัติการลา</h2>
      
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else-if="leaveHistory.length === 0" class="empty-state">
        <p>ยังไม่มีประวัติการลา</p>
      </div>

      <div v-else class="history-list">
        <div 
          v-for="record in leaveHistory" 
          :key="record.id" 
          class="history-item"
        >
          <div class="history-date">
            <span class="day">{{ formatDay(record.record_date) }}</span>
            <span class="month">{{ formatMonth(record.record_date) }}</span>
          </div>
          <div class="history-info">
            <span class="type">{{ getLeaveTypeLabel(record.leave_type) }}</span>
            <span class="reason">{{ record.leave_reason }}</span>
          </div>
          <div class="history-status">
            <span class="status-badge" :class="record.leave_approved ? 'approved' : 'pending'">
              {{ record.leave_approved ? 'อนุมัติแล้ว' : 'รออนุมัติ' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useEvaluationStore } from '../stores/evaluation'
import { useAuthStore } from '../stores/auth'

const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()

const form = reactive({
  leave_type: 'sick',
  leave_reason: ''
})

const leaveHistory = ref([])
const upcomingActivities = ref([])
const selectedActivity = ref(null)
const loading = ref(false)
const loadingActivities = ref(false)
const submitting = ref(false)

function formatDay(dateStr) {
  return new Date(dateStr).getDate()
}

function formatMonth(dateStr) {
  return new Date(dateStr).toLocaleDateString('th-TH', { month: 'short' })
}

function formatMonthShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('th-TH', { month: 'short' })
}

function getActivityTypeLabel(type) {
  const labels = { training: 'ฝึกซ้อม', competition: 'แข่งขัน', meeting: 'ประชุม', other: 'อื่นๆ' }
  return labels[type] || type
}

function getLeaveTypeLabel(type) {
  const labels = { sick: 'ลาป่วย', personal: 'ลากิจ', emergency: 'ฉุกเฉิน', other: 'อื่นๆ' }
  return labels[type] || type
}

async function loadUpcomingActivities() {
  loadingActivities.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)
    const clubId = authStore.profile?.club_id

    // โหลด schedules ที่กำลังจะมาถึง
    let scheduleQuery = supabase
      .from('schedules')
      .select('id, title, date, time, schedule_type, location')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(20)

    if (clubId) {
      scheduleQuery = scheduleQuery.eq('club_id', clubId)
    }

    const { data: schedules } = await scheduleQuery

    // โหลด events ที่กำลังจะมาถึง
    let eventQuery = supabase
      .from('events')
      .select('id, title, event_date, start_time, event_type, location')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(20)

    if (clubId) {
      eventQuery = eventQuery.eq('club_id', clubId)
    }

    const { data: events } = await eventQuery

    // รวมและจัดเรียงตามวันที่
    const activities = [
      ...(schedules || []).map(s => ({
        id: s.id,
        title: s.title,
        date: s.date,
        time: s.time,
        type: s.schedule_type,
        location: s.location,
        source: 'schedule'
      })),
      ...(events || []).map(e => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        time: e.start_time,
        type: e.event_type,
        location: e.location,
        source: 'event'
      }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date))

    upcomingActivities.value = activities
  } catch (err) {
    console.error('Error loading activities:', err)
  } finally {
    loadingActivities.value = false
  }
}

async function loadHistory() {
  loading.value = true
  try {
    // Get athlete ID for current user
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('user_id', authStore.user?.id)
      .single()

    if (athlete) {
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('athlete_id', athlete.id)
        .eq('status', 'leave')
        .order('record_date', { ascending: false })
        .limit(20)

      leaveHistory.value = data || []
    }
  } catch (err) {
    console.error('Error loading history:', err)
  } finally {
    loading.value = false
  }
}

async function submitRequest() {
  if (!selectedActivity.value) {
    alert('กรุณาเลือกกิจกรรมที่ต้องการลา')
    return
  }

  if (!form.leave_reason) {
    alert('กรุณาระบุเหตุผลการลา')
    return
  }

  submitting.value = true
  try {
    // Get athlete ID
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('user_id', authStore.user?.id)
      .single()

    if (!athlete) {
      alert('ไม่พบข้อมูลนักกีฬา')
      return
    }

    const activity = selectedActivity.value
    const result = await evaluationStore.submitLeaveRequest(athlete.id, {
      date: activity.date,
      record_type: activity.type,
      leave_type: form.leave_type,
      leave_reason: form.leave_reason,
      schedule_id: activity.source === 'schedule' ? activity.id : null,
      event_id: activity.source === 'event' ? activity.id : null
    })

    if (result.success) {
      alert(`ส่งคำขอลาสำเร็จ\nกิจกรรม: ${activity.title}\nวันที่: ${new Date(activity.date).toLocaleDateString('th-TH')}`)
      selectedActivity.value = null
      form.leave_reason = ''
      await loadHistory()
      await loadUpcomingActivities()
    } else {
      alert('เกิดข้อผิดพลาด: ' + result.error)
    }
  } catch (err) {
    console.error('Error submitting:', err)
    alert('เกิดข้อผิดพลาด')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadUpcomingActivities()
  loadHistory()
})
</script>

<style scoped>
.leave-request {
  padding: 1.5rem;
  max-width: 600px;
  margin: 0 auto;
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

.loading-activities {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  color: #737373;
}

.no-activities {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  text-align: center;
}

.no-activities svg {
  width: 48px;
  height: 48px;
  color: #D4D4D4;
  margin-bottom: 1rem;
}

.no-activities p {
  font-weight: 500;
  color: #525252;
  margin: 0;
}

.no-activities span {
  font-size: 0.875rem;
  color: #737373;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #E5E5E5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.activity-option:hover {
  border-color: #A3A3A3;
}

.activity-option.active {
  border-color: #171717;
  background: #F5F5F5;
}

.activity-option input {
  display: none;
}

.activity-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 50px;
  padding: 0.5rem;
  background: #171717;
  color: #fff;
  border-radius: 8px;
}

.activity-date .day {
  font-size: 1.25rem;
  font-weight: 700;
}

.activity-date .month {
  font-size: 0.75rem;
  opacity: 0.8;
}

.activity-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.activity-title {
  font-weight: 500;
  color: #171717;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.activity-type {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.activity-type.training { background: #DBEAFE; color: #1E40AF; }
.activity-type.competition { background: #FEE2E2; color: #991B1B; }
.activity-type.meeting { background: #FEF3C7; color: #92400E; }
.activity-type.other { background: #F5F5F5; color: #525252; }

.activity-time {
  color: #737373;
}

.activity-check {
  width: 32px;
  height: 32px;
  background: #171717;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-check svg {
  width: 18px;
  height: 18px;
  color: #fff;
}

.hint {
  font-size: 0.75rem;
  color: #737373;
  margin: 0.5rem 0 0;
}

.leave-form {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #525252;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
}

.leave-types {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.leave-type-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid #E5E5E5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.leave-type-option input {
  display: none;
}

.leave-type-option svg {
  width: 24px;
  height: 24px;
  color: #737373;
}

.leave-type-option span {
  font-size: 0.875rem;
  color: #525252;
}

.leave-type-option.active {
  border-color: #171717;
  background: #F5F5F5;
}

.leave-type-option.active svg {
  color: #171717;
}

.btn-submit {
  width: 100%;
  padding: 0.875rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.5;
}

.history-section {
  margin-top: 2rem;
}

.history-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #737373;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.history-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 50px;
  padding: 0.5rem;
  background: #F5F5F5;
  border-radius: 8px;
}

.history-date .day {
  font-size: 1.25rem;
  font-weight: 700;
}

.history-date .month {
  font-size: 0.75rem;
  color: #737373;
}

.history-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.history-info .type {
  font-weight: 500;
}

.history-info .reason {
  font-size: 0.875rem;
  color: #737373;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.approved {
  background: #D1FAE5;
  color: #065F46;
}

.status-badge.pending {
  background: #FEF3C7;
  color: #92400E;
}

@media (max-width: 480px) {
  .leave-types {
    grid-template-columns: 1fr;
  }
}
</style>
