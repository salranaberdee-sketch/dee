<template>
  <div class="athlete-performance">
    <!-- Back Button -->
    <router-link to="/evaluation" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
      กลับ
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <template v-else-if="athlete">
      <!-- Athlete Header -->
      <div class="athlete-header">
        <div class="avatar">
          {{ athlete.name?.charAt(0) || '?' }}
        </div>
        <div class="info">
          <h1>{{ athlete.name }}</h1>
          <p>{{ athlete.email }}</p>
        </div>
        <div class="tier-badge" :class="stats.performance_tier">
          {{ getTierLabel(stats.performance_tier) }}
        </div>
      </div>

      <!-- Month Selector -->
      <div class="month-selector">
        <button @click="prevMonth" class="btn-nav">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="month-label">{{ formatMonth(selectedMonth) }}</span>
        <button @click="nextMonth" class="btn-nav">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <!-- Score Overview -->
      <div class="score-section">
        <div class="score-circle" :style="{ '--score': stats.overall_score }">
          <span class="score-value">{{ stats.overall_score || 0 }}</span>
          <span class="score-label">คะแนนรวม</span>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon attendance">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <polyline points="16 11 18 13 22 9"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.attendance_rate || 0 }}%</span>
            <span class="stat-label">อัตราเข้าร่วม</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon training">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/>
              <line x1="10" y1="1" x2="10" y2="4"/>
              <line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.training_sessions || 0 }}</span>
            <span class="stat-label">ครั้งฝึกซ้อม</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon hours">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.training_hours || 0 }}</span>
            <span class="stat-label">ชั่วโมงฝึก</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon rating">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.average_rating || 0 }}</span>
            <span class="stat-label">Rating เฉลี่ย</span>
          </div>
        </div>
      </div>

      <!-- Attendance Breakdown -->
      <div class="section">
        <h2>สรุปการเข้าร่วม</h2>
        <div class="attendance-breakdown">
          <div class="breakdown-item on-time">
            <span class="count">{{ stats.attended_on_time || 0 }}</span>
            <span class="label">ตรงเวลา</span>
          </div>
          <div class="breakdown-item late">
            <span class="count">{{ stats.attended_late || 0 }}</span>
            <span class="label">มาสาย</span>
          </div>
          <div class="breakdown-item leave">
            <span class="count">{{ stats.leave_count || 0 }}</span>
            <span class="label">ลา</span>
          </div>
          <div class="breakdown-item absent">
            <span class="count">{{ stats.absent_count || 0 }}</span>
            <span class="label">ขาด</span>
          </div>
        </div>
      </div>

      <!-- Attendance History -->
      <div class="section">
        <h2>ประวัติการเข้าร่วม</h2>
        <div class="history-list">
          <div v-if="attendanceHistory.length === 0" class="empty-history">
            ไม่มีข้อมูลในเดือนนี้
          </div>
          <div 
            v-for="record in attendanceHistory" 
            :key="record.id" 
            class="history-item"
            :class="record.status"
          >
            <div class="history-date">
              <span class="day">{{ formatDay(record.record_date) }}</span>
              <span class="weekday">{{ formatWeekday(record.record_date) }}</span>
            </div>
            <div class="history-info">
              <span class="type">{{ getTypeLabel(record.record_type) }}</span>
              <span v-if="record.status === 'late'" class="late-note">
                สาย {{ record.late_minutes }} นาที
              </span>
              <span v-if="record.status === 'leave'" class="leave-note">
                {{ getLeaveTypeLabel(record.leave_type) }}: {{ record.leave_reason }}
              </span>
            </div>
            <div class="history-status">
              <span class="status-badge" :class="record.status">
                {{ getStatusLabel(record.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Improvement Tips (for needs_improvement) -->
      <div v-if="stats.performance_tier === 'needs_improvement'" class="tips-section">
        <h2>จุดที่ควรปรับปรุง</h2>
        <ul class="tips-list">
          <li v-if="stats.attendance_rate < 70">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            อัตราการเข้าร่วมต่ำ ({{ stats.attendance_rate }}%) - ควรเข้าร่วมให้มากกว่า 70%
          </li>
          <li v-if="stats.training_sessions < 8">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            ฝึกซ้อมน้อย ({{ stats.training_sessions }} ครั้ง) - ควรฝึกอย่างน้อย 8 ครั้ง/เดือน
          </li>
          <li v-if="stats.absent_count > 3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            ขาดบ่อย ({{ stats.absent_count }} ครั้ง) - ควรลดการขาดให้น้อยกว่า 3 ครั้ง/เดือน
          </li>
        </ul>
      </div>
    </template>

    <div v-else class="not-found">
      <p>ไม่พบข้อมูลนักกีฬา</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useEvaluationStore } from '../stores/evaluation'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()

// ถ้าไม่มี id ใน params แสดงว่าเป็น athlete ดูผลงานตัวเอง
const athleteId = ref(null)
const athlete = ref(null)
const stats = ref({})
const attendanceHistory = ref([])
const loading = ref(true)
const selectedMonth = ref(new Date().toISOString().slice(0, 7))

function getTierLabel(tier) {
  return evaluationStore.getTierLabel(tier)
}

function formatMonth(month) {
  const date = new Date(month + '-01')
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
}

function formatDay(dateStr) {
  return new Date(dateStr).getDate()
}

function formatWeekday(dateStr) {
  return new Date(dateStr).toLocaleDateString('th-TH', { weekday: 'short' })
}

function getTypeLabel(type) {
  const labels = { training: 'ฝึกซ้อม', competition: 'แข่งขัน', meeting: 'ประชุม', other: 'อื่นๆ' }
  return labels[type] || type
}

function getStatusLabel(status) {
  const labels = { on_time: 'ตรงเวลา', late: 'มาสาย', leave: 'ลา', absent: 'ขาด' }
  return labels[status] || status
}

function getLeaveTypeLabel(type) {
  const labels = { sick: 'ลาป่วย', personal: 'ลากิจ', emergency: 'ฉุกเฉิน', other: 'อื่นๆ' }
  return labels[type] || type
}

function prevMonth() {
  const date = new Date(selectedMonth.value + '-01')
  date.setMonth(date.getMonth() - 1)
  selectedMonth.value = date.toISOString().slice(0, 7)
}

function nextMonth() {
  const date = new Date(selectedMonth.value + '-01')
  date.setMonth(date.getMonth() + 1)
  selectedMonth.value = date.toISOString().slice(0, 7)
}

async function loadData() {
  loading.value = true
  try {
    // ถ้าไม่มี id ใน route params ให้หา athlete id จาก user_id
    if (route.params.id) {
      athleteId.value = route.params.id
    } else {
      // หา athlete id จาก user_id (สำหรับ athlete ดูผลงานตัวเอง)
      const { data: myAthlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('user_id', authStore.user?.id)
        .single()
      
      if (myAthlete) {
        athleteId.value = myAthlete.id
      }
    }

    if (!athleteId.value) {
      loading.value = false
      return
    }

    // Load athlete info
    const { data: athleteData } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId.value)
      .single()
    
    athlete.value = athleteData

    if (!athleteData) {
      loading.value = false
      return
    }

    // Calculate stats for selected month
    const monthStart = `${selectedMonth.value}-01`
    const monthEnd = new Date(selectedMonth.value + '-01')
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    monthEnd.setDate(0)
    const endDate = monthEnd.toISOString().slice(0, 10)

    // Attendance records
    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('athlete_id', athleteId.value)
      .gte('record_date', monthStart)
      .lte('record_date', endDate)
      .order('record_date', { ascending: false })

    attendanceHistory.value = attendance || []

    // Training logs
    const { data: training } = await supabase
      .from('training_logs')
      .select('duration, rating')
      .eq('athlete_id', athleteId.value)
      .gte('date', monthStart)
      .lte('date', endDate)

    // Calculate stats
    const totalSessions = attendance?.length || 0
    const onTime = attendance?.filter(a => a.status === 'on_time').length || 0
    const late = attendance?.filter(a => a.status === 'late').length || 0
    const leave = attendance?.filter(a => a.status === 'leave').length || 0
    const absent = attendance?.filter(a => a.status === 'absent').length || 0
    
    const attended = onTime + late
    const attendanceRate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0

    const trainingHours = Math.round((training?.reduce((sum, t) => sum + (t.duration || 0), 0) / 60) * 10) / 10 || 0
    const trainingSessions = training?.length || 0
    const avgRating = training?.length > 0 
      ? Math.round((training.reduce((sum, t) => sum + (t.rating || 0), 0) / training.length) * 10) / 10
      : 0

    // Calculate overall score
    const attendanceScore = attendanceRate * 0.4
    const trainingScore = Math.min((trainingSessions / 12) * 30, 30)
    const ratingScore = (avgRating / 5) * 30
    const overallScore = Math.round(attendanceScore + trainingScore + ratingScore)

    // Determine tier
    let tier = 'needs_improvement'
    if (overallScore >= 85) tier = 'excellent'
    else if (overallScore >= 70) tier = 'good'
    else if (overallScore >= 50) tier = 'average'

    stats.value = {
      total_sessions: totalSessions,
      attended_on_time: onTime,
      attended_late: late,
      leave_count: leave,
      absent_count: absent,
      attendance_rate: attendanceRate,
      training_hours: trainingHours,
      training_sessions: trainingSessions,
      average_rating: avgRating,
      overall_score: overallScore,
      performance_tier: tier
    }
  } catch (err) {
    console.error('Error loading data:', err)
  } finally {
    loading.value = false
  }
}

watch(selectedMonth, () => {
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.athlete-performance {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #525252;
  text-decoration: none;
  margin-bottom: 1.5rem;
}

.back-link svg {
  width: 20px;
  height: 20px;
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

.athlete-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #171717;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
}

.info h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.info p {
  color: #737373;
  margin: 0;
}

.tier-badge {
  margin-left: auto;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-weight: 500;
}

.tier-badge.excellent { background: #D1FAE5; color: #065F46; }
.tier-badge.good { background: #DBEAFE; color: #1E40AF; }
.tier-badge.average { background: #FEF3C7; color: #92400E; }
.tier-badge.needs_improvement { background: #FEE2E2; color: #991B1B; }

.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn-nav {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #E5E5E5;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-nav svg {
  width: 20px;
  height: 20px;
}

.month-label {
  font-size: 1.125rem;
  font-weight: 500;
  min-width: 150px;
  text-align: center;
}

.score-section {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(#171717 calc(var(--score) * 1%), #E5E5E5 0);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.score-circle::before {
  content: '';
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #fff;
}

.score-value {
  position: relative;
  font-size: 2rem;
  font-weight: 700;
}

.score-label {
  position: relative;
  font-size: 0.75rem;
  color: #737373;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-icon.attendance { background: #D1FAE5; color: #065F46; }
.stat-icon.training { background: #DBEAFE; color: #1E40AF; }
.stat-icon.hours { background: #FEF3C7; color: #92400E; }
.stat-icon.rating { background: #FEE2E2; color: #991B1B; }

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.875rem;
  color: #737373;
}

.section {
  margin-bottom: 2rem;
}

.section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

.attendance-breakdown {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 12px;
}

.breakdown-item .count {
  font-size: 1.5rem;
  font-weight: 700;
}

.breakdown-item .label {
  font-size: 0.75rem;
}

.breakdown-item.on-time { background: #D1FAE5; color: #065F46; }
.breakdown-item.late { background: #FEF3C7; color: #92400E; }
.breakdown-item.leave { background: #DBEAFE; color: #1E40AF; }
.breakdown-item.absent { background: #FEE2E2; color: #991B1B; }

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-history {
  text-align: center;
  padding: 2rem;
  color: #737373;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.history-item.on_time { border-left: 4px solid #22C55E; }
.history-item.late { border-left: 4px solid #F59E0B; }
.history-item.leave { border-left: 4px solid #3B82F6; }
.history-item.absent { border-left: 4px solid #EF4444; }

.history-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}

.history-date .day {
  font-size: 1.25rem;
  font-weight: 700;
}

.history-date .weekday {
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

.history-info .late-note,
.history-info .leave-note {
  font-size: 0.75rem;
  color: #737373;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.on_time { background: #D1FAE5; color: #065F46; }
.status-badge.late { background: #FEF3C7; color: #92400E; }
.status-badge.leave { background: #DBEAFE; color: #1E40AF; }
.status-badge.absent { background: #FEE2E2; color: #991B1B; }

.tips-section {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 12px;
  padding: 1.5rem;
}

.tips-section h2 {
  color: #991B1B;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #FECACA;
  color: #991B1B;
}

.tips-list li:last-child {
  border-bottom: none;
}

.tips-list svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.not-found {
  text-align: center;
  padding: 3rem;
  color: #737373;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .attendance-breakdown {
    grid-template-columns: repeat(2, 1fr);
  }

  .athlete-header {
    flex-wrap: wrap;
  }

  .tier-badge {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}
</style>
