<template>
  <div class="athlete-tracking-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>ติดตามความคืบหน้าของฉัน</h1>
        <p class="subtitle">ดูความคืบหน้าและบันทึกค่าตัวเลขของคุณ</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button class="btn-secondary" @click="loadMyPlans">ลองใหม่</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="myPlans.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
      <p>คุณยังไม่ได้อยู่ในแผนติดตามใดๆ</p>
      <span class="empty-hint">โค้ชจะเพิ่มคุณเข้าแผนติดตามเมื่อพร้อม</span>
    </div>

    <!-- Plans List (Task 13.1) -->
    <template v-else>
      <div class="plans-list">
        <div 
          v-for="plan in myPlans" 
          :key="plan.id" 
          class="plan-card"
          :class="{ expanded: expandedPlanId === plan.id }"
        >
          <!-- Plan Header -->
          <div class="plan-header" @click="togglePlan(plan.id)">
            <div class="plan-info">
              <div class="plan-icon">
                <svg v-if="plan.plan_type === 'weight_control'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13"/>
                </svg>
                <svg v-else-if="plan.plan_type === 'timing'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <svg v-else-if="plan.plan_type === 'strength'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6.5 6.5h11M6.5 17.5h11M4 10h2v4H4zM18 10h2v4h-2zM6 12h12"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <div>
                <h3>{{ plan.name }}</h3>
                <span class="plan-type">{{ getPlanTypeName(plan.plan_type) }}</span>
              </div>
            </div>
            <div class="plan-meta">
              <span class="date-range">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {{ formatDate(plan.start_date) }} - {{ formatDate(plan.end_date) }}
              </span>
              <span class="overall-progress">
                {{ getOverallProgress(plan) }}%
              </span>
              <svg 
                class="expand-icon" 
                :class="{ rotated: expandedPlanId === plan.id }"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          <!-- Expanded Content (Task 13.2 & 13.3) -->
          <div v-if="expandedPlanId === plan.id" class="plan-content">
            <!-- Inner Tabs Navigation -->
            <div class="inner-tabs">
              <button 
                class="inner-tab" 
                :class="{ active: activeInnerTab[plan.id] === 'progress' }"
                @click="setInnerTab(plan.id, 'progress')"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                ความคืบหน้า
              </button>
              <button 
                class="inner-tab" 
                :class="{ active: activeInnerTab[plan.id] === 'log' }"
                @click="setInnerTab(plan.id, 'log')"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                บันทึกค่า
              </button>
              <button 
                class="inner-tab" 
                :class="{ active: activeInnerTab[plan.id] === 'history' }"
                @click="setInnerTab(plan.id, 'history')"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                ประวัติ
                <span v-if="getPlanLogs(plan.id).length > 0" class="tab-badge">
                  {{ getPlanLogs(plan.id).length }}
                </span>
              </button>
            </div>

            <!-- Tab Content: ความคืบหน้า -->
            <div v-if="activeInnerTab[plan.id] === 'progress'" class="tab-content">
              <!-- Progress Cards for each field -->
              <div class="progress-section">
                <div class="progress-grid">
                  <ProgressCard
                    v-for="field in plan.fields"
                    :key="field.id"
                    :field-name="field.name"
                    :unit="field.unit"
                    :current-value="getFieldCurrentValue(plan, field)"
                    :initial-value="getFieldInitialValue(plan, field)"
                    :target-value="getFieldTargetValue(plan, field)"
                    :percentage="getFieldProgress(plan, field)"
                    :status="getFieldStatus(plan, field)"
                    :days-remaining="getFieldDaysRemaining(plan, field)"
                  />
                </div>
              </div>

              <!-- Chart Section -->
              <div v-if="selectedFieldForChart && getPlanLogs(plan.id).length > 0" class="chart-section">
                <div class="chart-header">
                  <h4>กราฟความคืบหน้า</h4>
                  <select v-model="selectedFieldForChart" class="field-select">
                    <option v-for="field in plan.fields" :key="field.id" :value="field.id">
                      {{ field.name }}
                    </option>
                  </select>
                </div>
                <ProgressChart
                  :title="getSelectedFieldName(plan)"
                  :unit="getSelectedFieldUnit(plan)"
                  :chart-data="getChartDataForField(plan, selectedFieldForChart)"
                  :target-value="getFieldTargetValue(plan, getFieldById(plan, selectedFieldForChart))"
                  :initial-value="getFieldInitialValue(plan, getFieldById(plan, selectedFieldForChart))"
                  :show-initial="true"
                />
              </div>
              <div v-else-if="getPlanLogs(plan.id).length === 0" class="empty-chart-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
                </svg>
                <p>บันทึกค่าเพื่อดูกราฟความคืบหน้า</p>
              </div>
            </div>

            <!-- Tab Content: บันทึกค่า -->
            <div v-if="activeInnerTab[plan.id] === 'log'" class="tab-content">
              <div class="log-section">
                <form @submit.prevent="submitLog(plan)" class="log-form">
                  <div class="form-row">
                    <div class="form-group">
                      <label>วันที่</label>
                      <input 
                        type="date" 
                        v-model="logForms[plan.id].log_date" 
                        :max="today"
                        required
                      />
                    </div>
                  </div>

                  <div class="fields-grid">
                    <div 
                      v-for="field in plan.fields" 
                      :key="field.id" 
                      class="form-group"
                    >
                      <label>
                        {{ field.name }}
                        <span v-if="field.unit" class="unit-label">({{ field.unit }})</span>
                        <span v-if="field.is_required" class="required">*</span>
                      </label>
                      <input 
                        v-if="field.field_type === 'number' || field.field_type === 'reps' || field.field_type === 'distance'"
                        type="number" 
                        step="0.01"
                        v-model="logForms[plan.id].values[field.id]"
                        :placeholder="getFieldPlaceholder(field)"
                        :required="field.is_required"
                      />
                      <input 
                        v-else-if="field.field_type === 'time'"
                        type="text" 
                        v-model="logForms[plan.id].values[field.id]"
                        placeholder="mm:ss"
                        :required="field.is_required"
                      />
                      <select 
                        v-else-if="field.field_type === 'select'"
                        v-model="logForms[plan.id].values[field.id]"
                        :required="field.is_required"
                      >
                        <option value="">เลือก...</option>
                        <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                      </select>
                      <input 
                        v-else
                        type="text" 
                        v-model="logForms[plan.id].values[field.id]"
                        :placeholder="getFieldPlaceholder(field)"
                        :required="field.is_required"
                      />
                    </div>
                  </div>

                  <div class="form-group">
                    <label>หมายเหตุ</label>
                    <textarea 
                      v-model="logForms[plan.id].notes" 
                      rows="2" 
                      placeholder="หมายเหตุเพิ่มเติม..."
                    ></textarea>
                  </div>

                  <div class="form-actions">
                    <button type="button" class="btn-secondary" @click="resetLogForm(plan.id)">
                      ล้างข้อมูล
                    </button>
                    <button type="submit" class="btn-primary" :disabled="savingLog">
                      {{ savingLog ? 'กำลังบันทึก...' : 'บันทึก' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Tab Content: ประวัติ -->
            <div v-if="activeInnerTab[plan.id] === 'history'" class="tab-content">
              <div class="recent-logs-section">
                <div v-if="getPlanLogs(plan.id).length > 0" class="logs-list">
                  <div 
                    v-for="log in getPlanLogs(plan.id)" 
                    :key="log.id" 
                    class="log-item"
                  >
                    <div class="log-header">
                      <span class="log-date">{{ formatDate(log.log_date) }}</span>
                      <button 
                        v-if="canEditLogItem(log)" 
                        class="btn-icon-sm" 
                        @click="editLogAndSwitchTab(plan, log)"
                        title="แก้ไข"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </div>
                    <div class="log-values">
                      <span 
                        v-for="field in plan.fields" 
                        :key="field.id" 
                        class="log-value"
                      >
                        <span class="value-label">{{ field.name }}:</span>
                        <span class="value-data">{{ log.values?.[field.id] || '-' }} {{ field.unit }}</span>
                      </span>
                    </div>
                    <p v-if="log.notes" class="log-notes">{{ log.notes }}</p>
                  </div>
                </div>
                <div v-else class="empty-logs">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p>ยังไม่มีประวัติการบันทึก</p>
                  <button class="btn-secondary" @click="setInnerTab(plan.id, 'log')">
                    บันทึกค่าตอนนี้
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useTrackingStore, canEditLog, calculateProgressPercentage, calculateProgressStatus, calculateDaysRemaining, calculateExpectedPercentage } from '@/stores/tracking'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import ProgressCard from '@/components/ProgressCard.vue'
import ProgressChart from '@/components/ProgressChart.vue'

/**
 * AthleteTrackingView - มุมมองนักกีฬาสำหรับดูและบันทึกค่าติดตาม
 * Requirements: 4.1, 5.2, 6.3
 */

const trackingStore = useTrackingStore()
const authStore = useAuthStore()

// State
const loading = ref(false)
const error = ref(null)
const savingLog = ref(false)
const expandedPlanId = ref(null)
const selectedFieldForChart = ref(null)
const myPlans = ref([])
const planLogs = ref({}) // { planId: logs[] }
const logForms = reactive({}) // { planId: { log_date, values, notes } }
const activeInnerTab = ref({}) // { planId: 'progress' | 'log' | 'history' }

// Computed
const today = computed(() => new Date().toISOString().split('T')[0])

// Helper Functions
function getPlanTypeName(type) {
  const types = {
    weight_control: 'ควบคุมน้ำหนัก',
    timing: 'จับเวลา',
    strength: 'ความแข็งแรง',
    general: 'ค่าร่างกายทั่วไป'
  }
  return types[type] || type
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })
}

function getFieldPlaceholder(field) {
  const placeholders = {
    number: '0',
    time: 'mm:ss',
    reps: '0',
    distance: '0',
    text: 'ข้อความ'
  }
  return placeholders[field.field_type] || ''
}

// ดึงเป้าหมายของนักกีฬาในฟิลด์
function getAthleteGoal(plan, field) {
  return plan.myGoals?.find(g => g.field_id === field.id)
}

// ดึงค่าเริ่มต้น
function getFieldInitialValue(plan, field) {
  const goal = getAthleteGoal(plan, field)
  return goal?.initial_value ?? 0
}

// ดึงค่าเป้าหมาย
function getFieldTargetValue(plan, field) {
  const goal = getAthleteGoal(plan, field)
  return goal?.target_value ?? 0
}

// ดึงค่าปัจจุบัน (จาก log ล่าสุด)
function getFieldCurrentValue(plan, field) {
  const logs = planLogs.value[plan.id] || []
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
  )
  
  for (const log of sortedLogs) {
    if (log.values && log.values[field.id] !== undefined && log.values[field.id] !== '') {
      const value = log.values[field.id]
      // แปลงเป็นตัวเลข
      if (typeof value === 'string' && value.includes(':')) {
        const parts = value.split(':').map(Number)
        if (parts.length === 2) return parts[0] * 60 + parts[1]
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
      }
      return Number(value) || 0
    }
  }
  
  return getFieldInitialValue(plan, field)
}

// คำนวณความคืบหน้าของฟิลด์
function getFieldProgress(plan, field) {
  const current = getFieldCurrentValue(plan, field)
  const initial = getFieldInitialValue(plan, field)
  const target = getFieldTargetValue(plan, field)
  return calculateProgressPercentage(current, initial, target)
}

// คำนวณสถานะความคืบหน้า
function getFieldStatus(plan, field) {
  const percentage = getFieldProgress(plan, field)
  const goal = getAthleteGoal(plan, field)
  const expectedPercentage = calculateExpectedPercentage(plan.start_date, goal?.target_date || plan.end_date)
  return calculateProgressStatus(percentage, expectedPercentage)
}

// คำนวณวันที่เหลือ
function getFieldDaysRemaining(plan, field) {
  const goal = getAthleteGoal(plan, field)
  return calculateDaysRemaining(goal?.target_date || plan.end_date)
}

// คำนวณความคืบหน้ารวมของแผน
function getOverallProgress(plan) {
  if (!plan.fields || plan.fields.length === 0) return 0
  
  let totalPercentage = 0
  plan.fields.forEach(field => {
    totalPercentage += getFieldProgress(plan, field)
  })
  
  return Math.round(totalPercentage / plan.fields.length)
}

// ดึง logs ของแผน
function getPlanLogs(planId) {
  return planLogs.value[planId] || []
}

// ตรวจสอบว่าสามารถแก้ไข log ได้หรือไม่
function canEditLogItem(log) {
  return canEditLog(log.created_at)
}

// ดึงฟิลด์ตาม ID
function getFieldById(plan, fieldId) {
  return plan.fields?.find(f => f.id === fieldId)
}

// ดึงชื่อฟิลด์ที่เลือก
function getSelectedFieldName(plan) {
  const field = getFieldById(plan, selectedFieldForChart.value)
  return field?.name || ''
}

// ดึงหน่วยของฟิลด์ที่เลือก
function getSelectedFieldUnit(plan) {
  const field = getFieldById(plan, selectedFieldForChart.value)
  return field?.unit || ''
}

// ดึงข้อมูลกราฟสำหรับฟิลด์
function getChartDataForField(plan, fieldId) {
  const logs = planLogs.value[plan.id] || []
  const sortedLogs = [...logs]
    .filter(log => log.values && log.values[fieldId] !== undefined && log.values[fieldId] !== '')
    .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
  
  const labels = sortedLogs.map(log => {
    const date = new Date(log.log_date)
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  })
  
  const data = sortedLogs.map(log => {
    const value = log.values[fieldId]
    if (typeof value === 'string' && value.includes(':')) {
      const parts = value.split(':').map(Number)
      if (parts.length === 2) return parts[0] * 60 + parts[1]
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    return Number(value) || 0
  })
  
  return {
    labels,
    datasets: [{
      label: 'ค่าที่บันทึก',
      data,
      borderColor: '#171717',
      backgroundColor: 'rgba(23, 23, 23, 0.1)',
      tension: 0.3,
      fill: true
    }]
  }
}

// Toggle แผน
function togglePlan(planId) {
  if (expandedPlanId.value === planId) {
    expandedPlanId.value = null
    selectedFieldForChart.value = null
  } else {
    expandedPlanId.value = planId
    // ตั้งค่า tab เริ่มต้น
    if (!activeInnerTab.value[planId]) {
      activeInnerTab.value[planId] = 'progress'
    }
    // ตั้งค่าฟิลด์แรกสำหรับกราฟ
    const plan = myPlans.value.find(p => p.id === planId)
    if (plan?.fields?.length > 0) {
      selectedFieldForChart.value = plan.fields[0].id
    }
    // โหลด logs ของแผน
    loadPlanLogs(planId)
  }
}

// เปลี่ยน tab ภายใน plan card
function setInnerTab(planId, tab) {
  activeInnerTab.value[planId] = tab
}

// เริ่มต้น log form สำหรับแผน
function initLogForm(planId, fields) {
  if (!logForms[planId]) {
    logForms[planId] = {
      log_date: today.value,
      values: {},
      notes: ''
    }
  }
  
  // เริ่มต้นค่าสำหรับแต่ละฟิลด์
  fields?.forEach(field => {
    if (logForms[planId].values[field.id] === undefined) {
      logForms[planId].values[field.id] = ''
    }
  })
}

// รีเซ็ต log form
function resetLogForm(planId) {
  const plan = myPlans.value.find(p => p.id === planId)
  logForms[planId] = {
    log_date: today.value,
    values: {},
    notes: ''
  }
  plan?.fields?.forEach(field => {
    logForms[planId].values[field.id] = ''
  })
}

// แก้ไข log
function editLog(plan, log) {
  logForms[plan.id] = {
    log_date: log.log_date,
    values: { ...log.values },
    notes: log.notes || ''
  }
}

// แก้ไข log และสลับไปแท็บบันทึก
function editLogAndSwitchTab(plan, log) {
  editLog(plan, log)
  setInnerTab(plan.id, 'log')
}

// บันทึก log
async function submitLog(plan) {
  const form = logForms[plan.id]
  if (!form || !form.log_date) {
    alert('กรุณาเลือกวันที่')
    return
  }
  
  savingLog.value = true
  
  const result = await trackingStore.createLog({
    plan_id: plan.id,
    athlete_id: authStore.user?.id,
    log_date: form.log_date,
    values: form.values,
    notes: form.notes
  }, plan.fields)
  
  savingLog.value = false
  
  if (result.success) {
    // รีโหลด logs
    await loadPlanLogs(plan.id)
    // รีเซ็ตฟอร์ม
    resetLogForm(plan.id)
  } else {
    alert(result.message || 'ไม่สามารถบันทึกได้')
  }
}

// โหลด logs ของแผน
async function loadPlanLogs(planId) {
  try {
    const { data, error: fetchError } = await supabase
      .from('tracking_logs')
      .select('*')
      .eq('plan_id', planId)
      .eq('athlete_id', authStore.user?.id)
      .order('log_date', { ascending: false })
    
    if (fetchError) throw fetchError
    
    planLogs.value[planId] = data || []
  } catch (err) {
    console.error('Error loading plan logs:', err)
  }
}

// โหลดแผนที่นักกีฬาอยู่
async function loadMyPlans() {
  loading.value = true
  error.value = null
  
  try {
    const userId = authStore.user?.id
    if (!userId) {
      throw new Error('กรุณาเข้าสู่ระบบ')
    }
    
    // ดึงเป้าหมายของนักกีฬา (เพื่อหาแผนที่อยู่)
    const { data: goalsData, error: goalsError } = await supabase
      .from('tracking_athlete_goals')
      .select(`
        *,
        plan:tracking_plans(
          id, name, description, plan_type, start_date, end_date, is_active,
          fields:tracking_fields(*)
        )
      `)
      .eq('athlete_id', userId)
    
    if (goalsError) throw goalsError
    
    // จัดกลุ่มตามแผน
    const planMap = new Map()
    goalsData?.forEach(goal => {
      if (!goal.plan || !goal.plan.is_active) return
      
      if (!planMap.has(goal.plan.id)) {
        planMap.set(goal.plan.id, {
          ...goal.plan,
          myGoals: []
        })
      }
      planMap.get(goal.plan.id).myGoals.push(goal)
    })
    
    myPlans.value = Array.from(planMap.values())
    
    // เริ่มต้น log forms
    myPlans.value.forEach(plan => {
      initLogForm(plan.id, plan.fields)
    })
    
    // ถ้ามีแผนเดียว ให้ขยายอัตโนมัติ
    if (myPlans.value.length === 1) {
      togglePlan(myPlans.value[0].id)
    }
    
  } catch (err) {
    error.value = err.message
    console.error('Error loading my plans:', err)
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadMyPlans()
})
</script>


<style scoped>
.athlete-tracking-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
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
  font-size: 14px;
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #737373;
  gap: 12px;
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
.error-state {
  text-align: center;
  padding: 48px;
  color: #737373;
}

.error-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.error-state p {
  margin: 0 0 16px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: #737373;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 8px;
  font-size: 16px;
  color: #525252;
}

.empty-hint {
  font-size: 14px;
  color: #A3A3A3;
}

/* Plans List */
.plans-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.plan-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.plan-card.expanded {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* Plan Header */
.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.plan-header:hover {
  background: #FAFAFA;
}

.plan-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plan-icon {
  width: 48px;
  height: 48px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plan-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.plan-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
}

.plan-type {
  font-size: 12px;
  color: #737373;
  padding: 2px 8px;
  background: #F5F5F5;
  border-radius: 4px;
}

.plan-meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #525252;
}

.date-range svg {
  width: 14px;
  height: 14px;
  color: #A3A3A3;
}

.overall-progress {
  font-size: 18px;
  font-weight: 600;
  color: #171717;
  min-width: 50px;
  text-align: right;
}

.expand-icon {
  width: 20px;
  height: 20px;
  color: #A3A3A3;
  transition: transform 0.2s;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

/* Plan Content */
.plan-content {
  padding: 0 20px 20px;
  border-top: 1px solid #F5F5F5;
}

/* Inner Tabs */
.inner-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 0;
  border-bottom: 1px solid #E5E5E5;
  margin-bottom: 16px;
}

.inner-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s;
}

.inner-tab svg {
  width: 16px;
  height: 16px;
}

.inner-tab:hover {
  background: #F5F5F5;
  color: #171717;
}

.inner-tab.active {
  background: #171717;
  border-color: #171717;
  color: #fff;
}

.inner-tab.active svg {
  color: #fff;
}

.tab-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.inner-tab:not(.active) .tab-badge {
  background: #E5E5E5;
  color: #525252;
}

/* Tab Content */
.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Empty Chart Hint */
.empty-chart-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: #FAFAFA;
  border-radius: 12px;
  color: #A3A3A3;
  margin-top: 16px;
}

.empty-chart-hint svg {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.empty-chart-hint p {
  margin: 0;
  font-size: 14px;
}

/* Progress Section */
.progress-section {
  margin-top: 0;
}

.chart-section h4,
.log-section h4,
.recent-logs-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 12px;
}

.progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* Chart Section */
.chart-section {
  margin-top: 24px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.field-select {
  padding: 6px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
}

/* Log Section */
.log-section {
  padding: 20px;
  background: #FAFAFA;
  border-radius: 12px;
}

.log-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
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

.unit-label {
  font-weight: 400;
  color: #737373;
}

.required {
  color: #EF4444;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
}

.form-group textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 8px;
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #171717;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover {
  background: #262626;
}

.btn-primary:disabled {
  background: #A3A3A3;
  cursor: not-allowed;
}

.btn-secondary {
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

.btn-icon-sm {
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-sm svg {
  width: 14px;
  height: 14px;
}

.btn-icon-sm:hover {
  background: #F5F5F5;
}

/* Recent Logs Section */
.recent-logs-section {
  margin-top: 0;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.log-date {
  font-size: 13px;
  font-weight: 500;
  color: #171717;
}

.log-values {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.log-value {
  font-size: 13px;
}

.value-label {
  color: #737373;
}

.value-data {
  color: #171717;
  font-weight: 500;
}

.log-notes {
  margin: 8px 0 0;
  font-size: 13px;
  color: #525252;
  font-style: italic;
}

.empty-logs {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 24px;
  color: #A3A3A3;
  font-size: 14px;
  background: #FAFAFA;
  border-radius: 12px;
}

.empty-logs svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.4;
}

.empty-logs p {
  margin: 0 0 16px;
}

.empty-logs .btn-secondary {
  margin-top: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .athlete-tracking-page {
    padding: 16px;
  }

  .plan-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .plan-meta {
    width: 100%;
    justify-content: space-between;
  }

  .date-range {
    font-size: 12px;
  }

  .inner-tabs {
    overflow-x: auto;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }

  .inner-tab {
    padding: 8px 12px;
    font-size: 12px;
    white-space: nowrap;
  }

  .inner-tab svg {
    width: 14px;
    height: 14px;
  }

  .progress-grid {
    grid-template-columns: 1fr;
  }

  .fields-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
  }

  .log-values {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
