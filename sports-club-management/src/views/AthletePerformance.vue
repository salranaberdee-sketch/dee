<template>
  <div class="athlete-performance">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <template v-else-if="athlete">
      <!-- Hero Section -->
      <div class="hero-section">
        <router-link :to="backRoute" class="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </router-link>

        <div class="hero-content">
          <div class="athlete-info">
            <div class="avatar">{{ athlete.name?.charAt(0) || '?' }}</div>
            <div>
              <h1>{{ athlete.name }}</h1>
              <p>{{ athlete.email }}</p>
            </div>
          </div>

          <div class="score-display">
            <div class="score-main">
              <span class="score-number">{{ stats.overall_score || 0 }}</span>
              <span class="score-text">คะแนน</span>
            </div>
            <div class="tier-badge" :class="stats.performance_tier">
              {{ getTierLabel(stats.performance_tier) }}
            </div>
          </div>

          <!-- Month Selector -->
          <div class="month-selector">
            <button @click="prevMonth" class="month-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span class="month-text">{{ formatMonth(selectedMonth) }}</span>
            <button @click="nextMonth" class="month-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="quick-stats">
          <div class="stat-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <polyline points="16 11 18 13 22 9"/>
            </svg>
            <span class="stat-value">{{ stats.attendance_rate || 0 }}%</span>
            <span class="stat-label">เข้าร่วม</span>
          </div>
          <div class="stat-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/>
              <line x1="10" y1="1" x2="10" y2="4"/>
              <line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
            <span class="stat-value">{{ stats.training_sessions || 0 }}</span>
            <span class="stat-label">ฝึกซ้อม</span>
          </div>
          <div class="stat-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span class="stat-value">{{ stats.training_hours || 0 }}</span>
            <span class="stat-label">ชั่วโมง</span>
          </div>
          <div class="stat-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span class="stat-value">{{ stats.average_rating || 0 }}</span>
            <span class="stat-label">Rating</span>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'overview' }"
          @click="activeTab = 'overview'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          ภาพรวม
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'improve' }"
          @click="activeTab = 'improve'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          เพิ่มคะแนน
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          ประวัติ
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Tab 1: ภาพรวม -->
        <div v-show="activeTab === 'overview'" class="tab-panel">
          <!-- Score Breakdown -->
          <div v-if="scoreBreakdown && scoreBreakdown.categoryScores" class="breakdown-card">
            <h3>รายละเอียดคะแนน</h3>
            <ScoreBreakdownCard 
              :score-result="scoreBreakdown"
              :show-no-conditions-message="true"
            />
          </div>

          <!-- Attendance Summary -->
          <div class="summary-card">
            <h3>สรุปการเข้าร่วม</h3>
            <div class="attendance-grid">
              <div class="attendance-item on-time">
                <span class="count">{{ stats.attended_on_time || 0 }}</span>
                <span class="label">ตรงเวลา</span>
              </div>
              <div class="attendance-item late">
                <span class="count">{{ stats.attended_late || 0 }}</span>
                <span class="label">มาสาย</span>
              </div>
              <div class="attendance-item leave">
                <span class="count">{{ stats.leave_count || 0 }}</span>
                <span class="label">ลา</span>
              </div>
              <div class="attendance-item absent">
                <span class="count">{{ stats.absent_count || 0 }}</span>
                <span class="label">ขาด</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: เพิ่มคะแนน -->
        <div v-show="activeTab === 'improve'" class="tab-panel">
          <!-- Suggestions -->
          <div v-if="suggestions.length > 0" class="suggestions-card">
            <h3>สิ่งที่ควรทำเพื่อเพิ่มคะแนน</h3>
            <div class="suggestion-list">
              <div v-for="(suggestion, index) in suggestions" :key="index" class="suggestion-item">
                <div class="suggestion-icon" :class="suggestion.type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div class="suggestion-content">
                  <span class="suggestion-title">{{ suggestion.title }}</span>
                  <span class="suggestion-desc">{{ suggestion.description }}</span>
                </div>
                <div class="suggestion-points">+{{ suggestion.points }}</div>
              </div>
            </div>
          </div>

          <!-- Tier Requirements -->
          <div class="tier-card">
            <h3>เกณฑ์แต่ละระดับ</h3>
            <div class="tier-grid">
              <div class="tier-item" :class="{ active: stats.performance_tier === 'excellent' }">
                <div class="tier-icon excellent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <span class="tier-name">ดีเยี่ยม</span>
                <span class="tier-req">≥ 85</span>
                <div v-if="stats.overall_score >= 85" class="tier-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
              <div class="tier-item" :class="{ active: stats.performance_tier === 'good' }">
                <div class="tier-icon good">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <span class="tier-name">ดี</span>
                <span class="tier-req">≥ 70</span>
                <div v-if="stats.overall_score >= 70" class="tier-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
              <div class="tier-item" :class="{ active: stats.performance_tier === 'average' }">
                <div class="tier-icon average">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                </div>
                <span class="tier-name">ปานกลาง</span>
                <span class="tier-req">≥ 50</span>
                <div v-if="stats.overall_score >= 50" class="tier-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
              <div class="tier-item" :class="{ active: stats.performance_tier === 'needs_improvement' }">
                <div class="tier-icon needs_improvement">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <span class="tier-name">ต้องปรับปรุง</span>
                <span class="tier-req">&lt; 50</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3: ประวัติ -->
        <div v-show="activeTab === 'history'" class="tab-panel">
          <!-- Filter Tabs -->
          <div class="filter-tabs">
            <button 
              class="filter-btn" 
              :class="{ active: activityFilter === 'all' }"
              @click="activityFilter = 'all'"
            >
              ทั้งหมด ({{ allActivities.length }})
            </button>
            <button 
              class="filter-btn" 
              :class="{ active: activityFilter === 'events' }"
              @click="activityFilter = 'events'"
            >
              กิจกรรม ({{ eventHistory.length }})
            </button>
            <button 
              class="filter-btn" 
              :class="{ active: activityFilter === 'training' }"
              @click="activityFilter = 'training'"
            >
              ฝึกซ้อม ({{ attendanceHistory.length }})
            </button>
          </div>

          <!-- Activity List -->
          <div class="activity-list">
            <div v-if="filteredActivities.length === 0" class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>ไม่มีข้อมูลในเดือนนี้</p>
            </div>

            <div 
              v-for="activity in filteredActivities" 
              :key="activity.id" 
              class="activity-item"
              :class="activity.status"
            >
              <div class="activity-date">
                <span class="day">{{ formatDay(activity.date) }}</span>
                <span class="weekday">{{ formatWeekday(activity.date) }}</span>
              </div>
              <div class="activity-info">
                <span class="activity-title">{{ activity.title }}</span>
                <span v-if="activity.details" class="activity-details">{{ activity.details }}</span>
              </div>
              <div class="activity-status" :class="activity.status">
                {{ activity.statusLabel }}
              </div>
            </div>
          </div>
        </div>
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
import { useScoringCriteriaStore } from '../stores/scoringCriteria'
import { calculateScore } from '../lib/scoreCalculator'
import ScoreBreakdownCard from '../components/ScoreBreakdownCard.vue'

const route = useRoute()
const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()
const scoringCriteriaStore = useScoringCriteriaStore()

// State
const athleteId = ref(null)
const athlete = ref(null)
const stats = ref({})
const attendanceHistory = ref([])
const eventHistory = ref([])
const loading = ref(true)
const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const scoreBreakdown = ref(null)
const activityFilter = ref('all')
const activeTab = ref('overview')

// Computed
const backRoute = computed(() => {
  if (authStore.isAthlete) {
    return '/profile'
  }
  return '/evaluation'
})

function getTierLabel(tier) {
  return evaluationStore.getTierLabel(tier)
}

const criteriaUsed = computed(() => {
  return scoreBreakdown.value?.criteria_used || {
    attendance_weight: 40,
    training_weight: 30,
    rating_weight: 30,
    target_training_sessions: 12
  }
})

const nextTier = computed(() => {
  const score = stats.value.overall_score || 0
  if (score >= 85) return { key: 'excellent', label: 'ดีเยี่ยม', required: 85 }
  if (score >= 70) return { key: 'excellent', label: 'ดีเยี่ยม', required: 85 }
  if (score >= 50) return { key: 'good', label: 'ดี', required: 70 }
  return { key: 'average', label: 'ปานกลาง', required: 50 }
})

const pointsToNextTier = computed(() => {
  const score = stats.value.overall_score || 0
  if (score >= 85) return 0
  return nextTier.value.required - score
})

const allActivities = computed(() => {
  const activities = []
  
  eventHistory.value.forEach(event => {
    activities.push({
      id: `event-${event.id}`,
      type: 'event',
      date: event.event_date,
      title: event.event_title,
      status: event.checkin_status || 'registered',
      statusLabel: event.checkin_status ? getCheckinStatusLabel(event.checkin_status) : 'ลงทะเบียนแล้ว',
      details: event.checkin_time ? `เช็คอิน: ${formatTime(event.checkin_time)}` : null
    })
  })
  
  attendanceHistory.value.forEach(record => {
    let details = null
    if (record.status === 'late') {
      details = `สาย ${record.late_minutes} นาที`
    } else if (record.status === 'leave') {
      details = `${getLeaveTypeLabel(record.leave_type)}: ${record.leave_reason}`
    }
    
    activities.push({
      id: `attendance-${record.id}`,
      type: 'training',
      date: record.record_date,
      title: getTypeLabel(record.record_type),
      status: record.status,
      statusLabel: getStatusLabel(record.status),
      details
    })
  })
  
  return activities.sort((a, b) => new Date(b.date) - new Date(a.date))
})

const filteredActivities = computed(() => {
  if (activityFilter.value === 'events') {
    return allActivities.value.filter(a => a.type === 'event')
  } else if (activityFilter.value === 'training') {
    return allActivities.value.filter(a => a.type === 'training')
  }
  return allActivities.value
})

const suggestions = computed(() => {
  const list = []
  const s = stats.value
  const criteria = criteriaUsed.value
  
  if ((s.attendance_rate || 0) < 90) {
    const currentScore = (s.attendance_rate || 0) * (criteria.attendance_weight / 100)
    const targetScore = 90 * (criteria.attendance_weight / 100)
    const gain = Math.round((targetScore - currentScore) * 10) / 10
    if (gain > 0) {
      list.push({
        type: 'attendance',
        title: 'เข้าร่วมให้ครบ',
        description: `เพิ่มอัตราเข้าร่วมจาก ${s.attendance_rate || 0}% เป็น 90%`,
        points: gain
      })
    }
  }
  
  const targetSessions = criteria.target_training_sessions || 12
  if ((s.training_sessions || 0) < targetSessions) {
    const remaining = targetSessions - (s.training_sessions || 0)
    const gain = Math.round((remaining / targetSessions) * criteria.training_weight * 10) / 10
    list.push({
      type: 'training',
      title: `ฝึกซ้อมเพิ่มอีก ${remaining} ครั้ง`,
      description: `บันทึกการฝึกซ้อมให้ครบ ${targetSessions} ครั้ง/เดือน`,
      points: gain
    })
  }
  
  if ((s.average_rating || 0) < 4) {
    const currentScore = ((s.average_rating || 0) / 5) * criteria.rating_weight
    const targetScore = (4 / 5) * criteria.rating_weight
    const gain = Math.round((targetScore - currentScore) * 10) / 10
    if (gain > 0) {
      list.push({
        type: 'rating',
        title: 'เพิ่ม Rating เป็น 4 ดาว',
        description: 'ตั้งใจฝึกซ้อมและทำตามคำแนะนำโค้ช',
        points: gain
      })
    }
  }
  
  return list.sort((a, b) => b.points - a.points).slice(0, 3)
})

// Helper functions
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

function getCheckinStatusLabel(status) {
  const labels = { on_time: 'ตรงเวลา', late: 'สาย', absent: 'ขาด' }
  return labels[status] || status
}

function formatTime(datetime) {
  return new Date(datetime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
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
    if (route.params.id) {
      athleteId.value = route.params.id
    } else {
      const { data: myAthlete, error: athleteError } = await supabase
        .from('athletes')
        .select('id')
        .eq('user_id', authStore.user?.id)
        .single()
      
      if (athleteError) {
        console.error('ไม่สามารถดึงข้อมูลนักกีฬา:', athleteError)
      }
      
      if (myAthlete) {
        athleteId.value = myAthlete.id
      }
    }

    if (!athleteId.value) {
      loading.value = false
      return
    }

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

    const monthStart = `${selectedMonth.value}-01`
    const monthEnd = new Date(selectedMonth.value + '-01')
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    monthEnd.setDate(0)
    const endDate = monthEnd.toISOString().slice(0, 10)

    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('athlete_id', athleteId.value)
      .gte('record_date', monthStart)
      .lte('record_date', endDate)
      .order('record_date', { ascending: false })

    attendanceHistory.value = attendance || []

    const { data: eventRegistrations } = await supabase
      .from('event_registrations')
      .select(`
        id,
        event_id,
        registered_at,
        events!inner (
          id,
          title,
          event_type,
          event_date,
          start_time
        )
      `)
      .eq('athlete_id', athleteId.value)
      .gte('events.event_date', monthStart)
      .lte('events.event_date', endDate)

    const { data: eventCheckins } = await supabase
      .from('event_checkins')
      .select(`
        id,
        event_id,
        checkin_status,
        checkin_time,
        events!inner (
          id,
          title,
          event_type,
          event_date,
          start_time
        )
      `)
      .eq('athlete_id', athleteId.value)
      .gte('events.event_date', monthStart)
      .lte('events.event_date', endDate)

    const eventMap = new Map()
    
    eventRegistrations?.forEach(reg => {
      if (reg.events) {
        eventMap.set(reg.event_id, {
          id: reg.id,
          event_id: reg.event_id,
          event_title: reg.events.title,
          event_type: reg.events.event_type,
          event_date: reg.events.event_date,
          start_time: reg.events.start_time,
          registered_at: reg.registered_at,
          checkin_status: null,
          checkin_time: null
        })
      }
    })
    
    eventCheckins?.forEach(checkin => {
      if (checkin.events) {
        const existing = eventMap.get(checkin.event_id)
        if (existing) {
          existing.checkin_status = checkin.checkin_status
          existing.checkin_time = checkin.checkin_time
        } else {
          eventMap.set(checkin.event_id, {
            id: checkin.id,
            event_id: checkin.event_id,
            event_title: checkin.events.title,
            event_type: checkin.events.event_type,
            event_date: checkin.events.event_date,
            start_time: checkin.events.start_time,
            registered_at: null,
            checkin_status: checkin.checkin_status,
            checkin_time: checkin.checkin_time
          })
        }
      }
    })
    
    eventHistory.value = Array.from(eventMap.values()).sort((a, b) => 
      new Date(b.event_date) - new Date(a.event_date)
    )

    const { data: training } = await supabase
      .from('training_logs')
      .select('duration, rating')
      .eq('athlete_id', athleteId.value)
      .gte('date', monthStart)
      .lte('date', endDate)

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

    const attendanceScore = attendanceRate * 0.4
    const trainingScore = Math.min((trainingSessions / 12) * 30, 30)
    const ratingScore = (avgRating / 5) * 30
    const overallScore = Math.round(attendanceScore + trainingScore + ratingScore)

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

    if (athleteData?.club_id) {
      await scoringCriteriaStore.fetchCriteria(athleteData.club_id)
      await scoringCriteriaStore.fetchConditions(athleteData.club_id)
      
      const criteria = scoringCriteriaStore.getEffectiveCriteria()
      const conditions = scoringCriteriaStore.activeConditions
      
      scoreBreakdown.value = calculateScore(
        {
          attendance_rate: attendanceRate,
          training_sessions: trainingSessions,
          average_rating: avgRating,
          absent_count: absent,
          training_hours: trainingHours
        },
        criteria,
        conditions
      )
      
      stats.value.overall_score = scoreBreakdown.value.overall_score
      stats.value.performance_tier = scoreBreakdown.value.tier
    } else {
      scoreBreakdown.value = calculateScore(
        {
          attendance_rate: attendanceRate,
          training_sessions: trainingSessions,
          average_rating: avgRating,
          absent_count: absent,
          training_hours: trainingHours
        },
        null,
        []
      )
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
  min-height: 100vh;
  background: #FAFAFA;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: #737373;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Hero Section */
.hero-section {
  background: #171717;
  color: #fff;
  padding: 2rem 1.5rem;
  position: relative;
}

.back-btn {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  text-decoration: none;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.back-btn svg {
  width: 20px;
  height: 20px;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  padding-top: 1rem;
}

.athlete-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff;
  color: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
}

.athlete-info h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.athlete-info p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
}

.score-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.score-main {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-number {
  font-size: 4rem;
  font-weight: 700;
  line-height: 1;
}

.score-text {
  font-size: 0.875rem;
  opacity: 0.7;
  margin-top: 0.5rem;
}

.tier-badge {
  padding: 0.75rem 1.5rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 1rem;
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
  margin-bottom: 2rem;
}

.month-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.month-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.month-btn svg {
  width: 20px;
  height: 20px;
}

.month-text {
  font-size: 1.125rem;
  font-weight: 600;
  min-width: 180px;
  text-align: center;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.stat-item svg {
  width: 24px;
  height: 24px;
  opacity: 0.8;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  gap: 0.5rem;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem 1.5rem 0;
  background: #FAFAFA;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fff;
  border: 2px solid #E5E5E5;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #737373;
  transition: all 0.2s;
}

.tab-btn svg {
  width: 18px;
  height: 18px;
}

.tab-btn:hover {
  border-color: #171717;
  color: #171717;
}

.tab-btn.active {
  background: #171717;
  border-color: #171717;
  color: #fff;
}

/* Tab Content */
.tab-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 1.5rem 2rem;
  background: #FAFAFA;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Cards */
.breakdown-card,
.summary-card,
.suggestions-card,
.tier-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 1.5rem;
}

.breakdown-card h3,
.summary-card h3,
.suggestions-card h3,
.tier-card h3 {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: #171717;
}

/* Attendance Grid */
.attendance-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.attendance-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.25rem;
  border-radius: 12px;
}

.attendance-item .count {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.attendance-item .label {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.attendance-item.on-time { background: #D1FAE5; color: #065F46; }
.attendance-item.late { background: #FEF3C7; color: #92400E; }
.attendance-item.leave { background: #DBEAFE; color: #1E40AF; }
.attendance-item.absent { background: #FEE2E2; color: #991B1B; }

/* Suggestions */
.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: #FAFAFA;
  border: 2px solid #E5E5E5;
  border-radius: 12px;
  transition: all 0.2s;
}

.suggestion-item:hover {
  border-color: #171717;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.suggestion-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.suggestion-icon svg {
  width: 24px;
  height: 24px;
}

.suggestion-icon.attendance { background: #D1FAE5; color: #065F46; }
.suggestion-icon.training { background: #DBEAFE; color: #1E40AF; }
.suggestion-icon.rating { background: #FEF3C7; color: #92400E; }

.suggestion-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.suggestion-title {
  font-weight: 600;
  font-size: 1rem;
  color: #171717;
}

.suggestion-desc {
  font-size: 0.875rem;
  color: #737373;
}

.suggestion-points {
  padding: 0.75rem 1.25rem;
  background: #171717;
  color: #fff;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1.125rem;
  white-space: nowrap;
}

/* Tier Grid */
.tier-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.tier-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.25rem;
  background: #FAFAFA;
  border: 2px solid #E5E5E5;
  border-radius: 12px;
  transition: all 0.2s;
  position: relative;
}

.tier-item.active {
  border-color: #171717;
  background: #fff;
}

.tier-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.tier-icon svg {
  width: 24px;
  height: 24px;
}

.tier-icon.excellent { background: #D1FAE5; color: #065F46; }
.tier-icon.good { background: #DBEAFE; color: #1E40AF; }
.tier-icon.average { background: #FEF3C7; color: #92400E; }
.tier-icon.needs_improvement { background: #FEE2E2; color: #991B1B; }

.tier-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: #171717;
  margin-bottom: 0.25rem;
}

.tier-req {
  font-size: 0.75rem;
  color: #737373;
}

.tier-check {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #22C55E;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tier-check svg {
  width: 14px;
  height: 14px;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.filter-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  background: #fff;
  border: 2px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #737373;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #171717;
  color: #171717;
}

.filter-btn.active {
  background: #171717;
  border-color: #171717;
  color: #fff;
}

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2rem;
  color: #737373;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-left: 4px solid #E5E5E5;
  border-radius: 8px;
  transition: all 0.2s;
}

.activity-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.activity-item.on_time { border-left-color: #22C55E; }
.activity-item.late { border-left-color: #F59E0B; }
.activity-item.leave { border-left-color: #3B82F6; }
.activity-item.absent { border-left-color: #EF4444; }
.activity-item.registered { border-left-color: #A3A3A3; }

.activity-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 48px;
}

.activity-date .day {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.activity-date .weekday {
  font-size: 0.75rem;
  color: #737373;
  margin-top: 0.25rem;
}

.activity-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.activity-title {
  font-weight: 600;
  font-size: 1rem;
  color: #171717;
}

.activity-details {
  font-size: 0.875rem;
  color: #737373;
}

.activity-status {
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.activity-status.on_time { background: #D1FAE5; color: #065F46; }
.activity-status.late { background: #FEF3C7; color: #92400E; }
.activity-status.leave { background: #DBEAFE; color: #1E40AF; }
.activity-status.absent { background: #FEE2E2; color: #991B1B; }
.activity-status.registered { background: #F5F5F5; color: #525252; }

.not-found {
  text-align: center;
  padding: 3rem;
  color: #737373;
}

/* Responsive */
@media (max-width: 768px) {
  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .attendance-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tier-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .score-display {
    flex-direction: column;
    gap: 1rem;
  }

  .tab-btn {
    font-size: 0.75rem;
    padding: 0.75rem 0.5rem;
  }

  .tab-btn svg {
    display: none;
  }

  .suggestion-item {
    flex-wrap: wrap;
  }

  .suggestion-points {
    width: 100%;
    text-align: center;
  }
}
</style>
