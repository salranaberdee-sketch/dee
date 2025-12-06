import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'

/**
 * แม่แบบแผนติดตามสำเร็จรูป
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export const PLAN_TEMPLATES = {
  weight_control: {
    name: 'ควบคุมน้ำหนัก',
    fields: [
      { name: 'น้ำหนัก', field_type: 'number', unit: 'kg', is_required: true },
      { name: 'เปอร์เซ็นต์ไขมัน', field_type: 'number', unit: '%', is_required: false },
      { name: 'รอบเอว', field_type: 'number', unit: 'cm', is_required: false },
      { name: 'ปริมาณน้ำดื่ม', field_type: 'number', unit: 'ลิตร', is_required: false }
    ]
  },
  timing: {
    name: 'จับเวลา',
    fields: [
      { name: 'เวลา', field_type: 'time', unit: 'min:sec', is_required: true },
      { name: 'ระยะทาง', field_type: 'distance', unit: 'm', is_required: true }
    ]
  },
  strength: {
    name: 'ความแข็งแรง',
    fields: [
      { name: 'Squat 1RM', field_type: 'number', unit: 'kg', is_required: false },
      { name: 'Deadlift 1RM', field_type: 'number', unit: 'kg', is_required: false },
      { name: 'Bench Press 1RM', field_type: 'number', unit: 'kg', is_required: false }
    ]
  },
  general: {
    name: 'ค่าร่างกายทั่วไป',
    fields: [
      { name: 'น้ำหนัก', field_type: 'number', unit: 'kg', is_required: true },
      { name: 'ส่วนสูง', field_type: 'number', unit: 'cm', is_required: false },
      { name: 'BMI', field_type: 'number', unit: '', is_required: false }
    ]
  }
}

/**
 * ประเภทฟิลด์ที่รองรับ
 * Requirements: 1.3
 */
export const VALID_FIELD_TYPES = ['number', 'time', 'reps', 'distance', 'text', 'select']

/**
 * จำนวนวันที่อนุญาตให้แก้ไข log
 * Requirements: 4.4
 */
export const LOG_EDIT_LIMIT_DAYS = 7

/**
 * Milestone thresholds
 * Requirements: 7.1, 7.2
 */
export const MILESTONE_THRESHOLDS = {
  HALFWAY: 50,
  COMPLETE: 100
}

/**
 * ตรวจสอบว่า progress ข้าม milestone หรือไม่ (Pure function สำหรับ testing)
 * Requirements: 7.1, 7.2
 * Property 10: Milestone notification triggers at correct thresholds (50%, 100%)
 * 
 * @param {number} previousPercentage - เปอร์เซ็นต์ก่อนหน้า
 * @param {number} currentPercentage - เปอร์เซ็นต์ปัจจุบัน
 * @returns {{ crossed50: boolean, crossed100: boolean }} milestone ที่ข้าม
 */
export function detectMilestonesCrossing(previousPercentage, currentPercentage) {
  const prev = previousPercentage ?? 0
  const curr = currentPercentage ?? 0
  
  return {
    // ข้าม 50% เมื่อ: ก่อนหน้า < 50 และ ปัจจุบัน >= 50
    crossed50: prev < MILESTONE_THRESHOLDS.HALFWAY && curr >= MILESTONE_THRESHOLDS.HALFWAY,
    // ข้าม 100% เมื่อ: ก่อนหน้า < 100 และ ปัจจุบัน >= 100
    crossed100: prev < MILESTONE_THRESHOLDS.COMPLETE && curr >= MILESTONE_THRESHOLDS.COMPLETE
  }
}

/**
 * ตรวจสอบค่าตาม field type
 * Requirements: 4.2
 * @param {string} fieldType - ประเภทฟิลด์
 * @param {any} value - ค่าที่ต้องการตรวจสอบ
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateFieldValue(fieldType, value) {
  // ค่าว่างหรือ null ถือว่าผ่าน (ไม่บังคับกรอก)
  if (value === null || value === undefined || value === '') {
    return { valid: true }
  }

  switch (fieldType) {
    case 'number':
    case 'reps':
    case 'distance': {
      // ต้องเป็นตัวเลข
      const numValue = Number(value)
      if (isNaN(numValue)) {
        return { valid: false, message: 'กรุณากรอกตัวเลขที่ถูกต้อง' }
      }
      if (numValue < 0) {
        return { valid: false, message: 'ค่าต้องไม่ติดลบ' }
      }
      return { valid: true }
    }

    case 'time': {
      // รองรับรูปแบบ: mm:ss, m:ss, hh:mm:ss, หรือตัวเลขวินาที
      const timeStr = String(value)
      
      // ถ้าเป็นตัวเลขล้วน ถือว่าเป็นวินาที
      if (/^\d+(\.\d+)?$/.test(timeStr)) {
        const seconds = Number(timeStr)
        if (seconds < 0) {
          return { valid: false, message: 'เวลาต้องไม่ติดลบ' }
        }
        return { valid: true }
      }
      
      // ตรวจสอบรูปแบบ mm:ss หรือ hh:mm:ss
      const timePattern = /^(\d{1,2}:)?\d{1,2}:\d{2}$/
      if (!timePattern.test(timeStr)) {
        return { valid: false, message: 'รูปแบบเวลาไม่ถูกต้อง (ใช้ mm:ss หรือ hh:mm:ss)' }
      }
      
      // ตรวจสอบค่าวินาทีและนาที
      const parts = timeStr.split(':').map(Number)
      const seconds = parts[parts.length - 1]
      const minutes = parts[parts.length - 2]
      
      if (seconds >= 60) {
        return { valid: false, message: 'วินาทีต้องน้อยกว่า 60' }
      }
      if (minutes >= 60 && parts.length === 3) {
        return { valid: false, message: 'นาทีต้องน้อยกว่า 60' }
      }
      
      return { valid: true }
    }

    case 'text': {
      // text รับค่าได้ทุกอย่าง
      return { valid: true }
    }

    case 'select': {
      // select ต้องเป็น string
      if (typeof value !== 'string') {
        return { valid: false, message: 'กรุณาเลือกค่าที่ถูกต้อง' }
      }
      return { valid: true }
    }

    default:
      return { valid: false, message: `ประเภทฟิลด์ไม่รองรับ: ${fieldType}` }
  }
}

/**
 * ตรวจสอบว่า log สามารถแก้ไขได้หรือไม่ (ภายใน 7 วัน)
 * Requirements: 4.4
 * @param {string} createdAt - วันที่สร้าง log (ISO string)
 * @returns {boolean}
 */
export function canEditLog(createdAt) {
  if (!createdAt) return false
  
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  
  return diffDays <= LOG_EDIT_LIMIT_DAYS
}

/**
 * คำนวณเปอร์เซ็นต์ความคืบหน้า (Pure function สำหรับ testing)
 * Requirements: 5.2
 * Property 7: Progress percentage = ((current - initial) / (target - initial)) * 100, clamped to 0-100
 * 
 * @param {number} currentValue - ค่าปัจจุบัน
 * @param {number} initialValue - ค่าเริ่มต้น
 * @param {number} targetValue - ค่าเป้าหมาย
 * @returns {number} เปอร์เซ็นต์ความคืบหน้า (0-100)
 */
export function calculateProgressPercentage(currentValue, initialValue, targetValue) {
  const current = currentValue ?? initialValue
  const initial = initialValue ?? 0
  const target = targetValue ?? 0
  
  const denominator = target - initial
  
  if (denominator === 0) {
    // ถ้า initial = target และ current = target ถือว่าบรรลุเป้าหมาย
    return current === target ? 100 : 0
  }
  
  const percentage = ((current - initial) / denominator) * 100
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(percentage * 100) / 100))
}

/**
 * คำนวณสถานะความคืบหน้า (Pure function สำหรับ testing)
 * Requirements: 5.3
 * Property 8: Status = 'achieved' if >= 100%, 'ahead' if actual > expected, 'behind' if actual < expected, else 'on_track'
 * 
 * @param {number} percentage - เปอร์เซ็นต์ความคืบหน้า
 * @param {number} expectedPercentage - เปอร์เซ็นต์ที่คาดหวังตามเวลา (optional)
 * @param {number} tolerance - ค่าความคลาดเคลื่อนที่ยอมรับได้ (default: 5%)
 * @returns {'achieved' | 'ahead' | 'behind' | 'on_track'} สถานะความคืบหน้า
 */
export function calculateProgressStatus(percentage, expectedPercentage = null, tolerance = 5) {
  // ถ้าบรรลุเป้าหมายแล้ว
  if (percentage >= 100) {
    return 'achieved'
  }
  
  // ถ้าไม่มี expected percentage ถือว่า on_track
  if (expectedPercentage === null || expectedPercentage === undefined) {
    return 'on_track'
  }
  
  // เปรียบเทียบกับ expected percentage
  if (percentage > expectedPercentage + tolerance) {
    return 'ahead'
  } else if (percentage < expectedPercentage - tolerance) {
    return 'behind'
  }
  
  return 'on_track'
}

/**
 * คำนวณจำนวนวันที่เหลือ
 * @param {string|Date} targetDate - วันที่เป้าหมาย
 * @param {Date} fromDate - วันที่เริ่มนับ (default: วันนี้)
 * @returns {number|null} จำนวนวันที่เหลือ หรือ null ถ้าไม่มี targetDate
 */
export function calculateDaysRemaining(targetDate, fromDate = new Date()) {
  if (!targetDate) return null
  
  const target = new Date(targetDate)
  const from = new Date(fromDate)
  
  target.setHours(0, 0, 0, 0)
  from.setHours(0, 0, 0, 0)
  
  return Math.ceil((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * คำนวณ expected percentage ตามเวลาที่ผ่านไป
 * @param {string|Date} startDate - วันที่เริ่มต้น
 * @param {string|Date} targetDate - วันที่เป้าหมาย
 * @param {Date} currentDate - วันที่ปัจจุบัน (default: วันนี้)
 * @returns {number|null} expected percentage หรือ null ถ้าข้อมูลไม่ครบ
 */
export function calculateExpectedPercentage(startDate, targetDate, currentDate = new Date()) {
  if (!startDate || !targetDate) return null
  
  const start = new Date(startDate)
  const target = new Date(targetDate)
  const current = new Date(currentDate)
  
  start.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  current.setHours(0, 0, 0, 0)
  
  const totalDays = Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysPassed = Math.ceil((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  if (totalDays <= 0) return null
  if (daysPassed < 0) return 0
  if (daysPassed >= totalDays) return 100
  
  return Math.round((daysPassed / totalDays) * 100 * 100) / 100
}

export const useTrackingStore = defineStore('tracking', () => {
  // ============ STATE ============
  // Requirements: 1.1, 3.1
  const plans = ref([])
  const currentPlan = ref(null)
  const athletes = ref([])
  const logs = ref([])
  const loading = ref(false)
  const error = ref(null)

  // ============ GETTERS ============
  
  /**
   * แผนที่ active เท่านั้น
   * Requirements: 1.6
   */
  const activePlans = computed(() => plans.value.filter(p => p.is_active))

  /**
   * ค้นหาแผนตาม ID
   */
  const planById = computed(() => (id) => plans.value.find(p => p.id === id))

  // ============ PROGRESS CALCULATION ============

  /**
   * คำนวณความคืบหน้าของนักกีฬาในแต่ละฟิลด์
   * Requirements: 5.2, 5.3
   * Property 7: Progress percentage = ((current - initial) / (target - initial)) * 100, clamped to 0-100
   * Property 8: Status = 'achieved' if >= 100%, 'ahead' if actual > expected, 'behind' if actual < expected, else 'on_track'
   * 
   * @param {string} athleteId - รหัสนักกีฬา
   * @param {string} fieldId - รหัสฟิลด์
   * @param {Object} goal - ข้อมูลเป้าหมาย { initial_value, target_value, target_date }
   * @param {number|null} currentValue - ค่าปัจจุบัน (จาก log ล่าสุด)
   * @returns {Object} ProgressData { current_value, initial_value, target_value, percentage, status, days_remaining }
   */
  function calculateProgress(athleteId, fieldId, goal, currentValue = null) {
    // ค่าเริ่มต้น
    const initialValue = goal?.initial_value ?? 0
    const targetValue = goal?.target_value ?? 0
    const targetDate = goal?.target_date ? new Date(goal.target_date) : null
    const current = currentValue ?? initialValue

    // คำนวณ days_remaining
    let daysRemaining = null
    if (targetDate) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      targetDate.setHours(0, 0, 0, 0)
      daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    // คำนวณ percentage
    // Property 7: ((current - initial) / (target - initial)) * 100, clamped to 0-100
    let percentage = 0
    const denominator = targetValue - initialValue
    
    if (denominator !== 0) {
      percentage = ((current - initialValue) / denominator) * 100
      // Clamp to 0-100 range
      percentage = Math.max(0, Math.min(100, percentage))
    } else if (current === targetValue) {
      // ถ้า initial = target และ current = target ถือว่าบรรลุเป้าหมาย
      percentage = 100
    }

    // คำนวณ status
    // Property 8: 'achieved' if >= 100%, 'ahead' if actual > expected, 'behind' if actual < expected, else 'on_track'
    let status = 'on_track'
    
    if (percentage >= 100) {
      status = 'achieved'
    } else if (targetDate && daysRemaining !== null) {
      // คำนวณ expected progress ตามเวลาที่ผ่านไป
      const startDate = goal?.created_at ? new Date(goal.created_at) : new Date()
      startDate.setHours(0, 0, 0, 0)
      
      const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysPassed = totalDays - daysRemaining
      
      if (totalDays > 0 && daysPassed >= 0) {
        const expectedPercentage = (daysPassed / totalDays) * 100
        
        if (percentage > expectedPercentage + 5) {
          // ahead ถ้าเกินกว่าที่คาดไว้ 5%
          status = 'ahead'
        } else if (percentage < expectedPercentage - 5) {
          // behind ถ้าน้อยกว่าที่คาดไว้ 5%
          status = 'behind'
        }
      }
    }

    return {
      current_value: current,
      initial_value: initialValue,
      target_value: targetValue,
      percentage: Math.round(percentage * 100) / 100, // ปัดเศษ 2 ตำแหน่ง
      status,
      days_remaining: daysRemaining
    }
  }

  /**
   * ดึงข้อมูลสำหรับแสดงกราฟ line chart
   * Requirements: 5.1
   * @param {string} planId - รหัสแผน
   * @param {string} athleteId - รหัสนักกีฬา
   * @param {string} fieldId - รหัสฟิลด์
   * @returns {Object} ChartData { labels: string[], datasets: [{ data: number[] }] }
   */
  function getChartData(planId, athleteId, fieldId) {
    // กรอง logs ตาม plan, athlete, และเรียงตามวันที่
    const filteredLogs = logs.value
      .filter(log => 
        log.plan_id === planId && 
        log.athlete_id === athleteId &&
        log.values && 
        log.values[fieldId] !== undefined
      )
      .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())

    // สร้าง labels (วันที่) และ data (ค่า)
    const labels = filteredLogs.map(log => {
      const date = new Date(log.log_date)
      return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    })

    const data = filteredLogs.map(log => {
      const value = log.values[fieldId]
      // แปลงเป็นตัวเลข (สำหรับ time format ต้องแปลงเป็นวินาที)
      if (typeof value === 'string' && value.includes(':')) {
        // แปลง mm:ss หรือ hh:mm:ss เป็นวินาที
        const parts = value.split(':').map(Number)
        if (parts.length === 2) {
          return parts[0] * 60 + parts[1]
        } else if (parts.length === 3) {
          return parts[0] * 3600 + parts[1] * 60 + parts[2]
        }
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

  /**
   * ดึงค่าล่าสุดของนักกีฬาในฟิลด์
   * @param {string} planId - รหัสแผน
   * @param {string} athleteId - รหัสนักกีฬา
   * @param {string} fieldId - รหัสฟิลด์
   * @returns {number|null} ค่าล่าสุด หรือ null ถ้าไม่มี
   */
  function getLatestValue(planId, athleteId, fieldId) {
    const athleteLogs = logs.value
      .filter(log => 
        log.plan_id === planId && 
        log.athlete_id === athleteId &&
        log.values && 
        log.values[fieldId] !== undefined
      )
      .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())

    if (athleteLogs.length === 0) return null

    const value = athleteLogs[0].values[fieldId]
    
    // แปลงเป็นตัวเลข
    if (typeof value === 'string' && value.includes(':')) {
      const parts = value.split(':').map(Number)
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1]
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
      }
    }
    return Number(value) || null
  }

  /**
   * ดึงข้อมูลความคืบหน้าทั้งหมดของนักกีฬาในแผน
   * @param {string} planId - รหัสแผน
   * @param {string} athleteId - รหัสนักกีฬา
   * @returns {Array} รายการความคืบหน้าแต่ละฟิลด์
   */
  function getAthleteProgress(planId, athleteId) {
    if (!currentPlan.value || currentPlan.value.id !== planId) {
      return []
    }

    const athlete = currentPlan.value.athletes?.find(a => a.athlete_id === athleteId)
    if (!athlete) return []

    return currentPlan.value.fields?.map(field => {
      const goal = athlete.goals?.find(g => g.field_id === field.id)
      const currentValue = getLatestValue(planId, athleteId, field.id)
      const progress = calculateProgress(athleteId, field.id, goal, currentValue)

      return {
        field,
        goal,
        ...progress
      }
    }) || []
  }

  // ============ ACTIONS ============

  /**
   * ดึงรายการแผนติดตามทั้งหมด
   * Requirements: 1.1, 3.1
   * - Admin: ดูทั้งหมด
   * - Coach: ดูในชมรมเดียวกัน
   * - Athlete: ดูแผนที่ตัวเองอยู่
   */
  async function fetchPlans() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('tracking_plans')
        .select(`
          *,
          fields:tracking_fields(count),
          goals:tracking_athlete_goals(count)
        `)
        .order('created_at', { ascending: false })

      // กรองตาม club_id สำหรับ coach (RLS จะกรองให้อัตโนมัติ แต่เพิ่มเพื่อความชัดเจน)
      if (authStore.isCoach && authStore.profile?.club_id) {
        query = query.eq('club_id', authStore.profile.club_id)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // แปลงข้อมูล count และคำนวณจำนวนนักกีฬา (unique athlete_id)
      plans.value = data.map(plan => ({
        ...plan,
        field_count: plan.fields?.[0]?.count || 0,
        athlete_count: plan.goals?.[0]?.count || 0
      }))

      return { success: true, data: plans.value }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching tracking plans:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * ดึงรายละเอียดแผนพร้อมฟิลด์และนักกีฬา
   * Requirements: 1.1, 3.1
   */
  async function fetchPlanDetail(planId) {
    loading.value = true
    error.value = null

    try {
      // ดึงข้อมูลแผน
      const { data: planData, error: planError } = await supabase
        .from('tracking_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (planError) throw planError

      // ดึงฟิลด์ทั้งหมด
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('tracking_fields')
        .select('*')
        .eq('plan_id', planId)
        .order('sort_order', { ascending: true })

      if (fieldsError) throw fieldsError

      // ดึงเป้าหมายนักกีฬาพร้อมข้อมูลนักกีฬา
      const { data: goalsData, error: goalsError } = await supabase
        .from('tracking_athlete_goals')
        .select(`
          *,
          athlete:user_profiles(id, name, avatar_url)
        `)
        .eq('plan_id', planId)

      if (goalsError) throw goalsError

      // จัดกลุ่มเป้าหมายตามนักกีฬา
      const athleteMap = new Map()
      goalsData?.forEach(goal => {
        if (!athleteMap.has(goal.athlete_id)) {
          athleteMap.set(goal.athlete_id, {
            athlete_id: goal.athlete_id,
            athlete: goal.athlete,
            goals: []
          })
        }
        athleteMap.get(goal.athlete_id).goals.push(goal)
      })

      currentPlan.value = {
        ...planData,
        fields: fieldsData || [],
        athletes: Array.from(athleteMap.values())
      }

      return { success: true, plan: currentPlan.value }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching plan detail:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * สร้างแผนติดตามใหม่
   * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1-2.5
   * @param {Object} planData - ข้อมูลแผน
   * @param {string} template - ชื่อ template (optional)
   */
  async function createPlan(planData, template = null) {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!planData.name || !planData.plan_type || !planData.start_date || !planData.end_date) {
        throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน: ชื่อแผน, ประเภท, วันเริ่มต้น, วันสิ้นสุด')
      }

      // สร้างแผน
      const { data: newPlan, error: createError } = await supabase
        .from('tracking_plans')
        .insert({
          club_id: authStore.profile?.club_id,
          name: planData.name,
          description: planData.description || '',
          plan_type: planData.plan_type,
          start_date: planData.start_date,
          end_date: planData.end_date,
          is_active: true,
          created_by: authStore.user?.id
        })
        .select()
        .single()

      if (createError) throw createError

      // กำหนดฟิลด์จาก template หรือจากข้อมูลที่ส่งมา
      let fieldsToInsert = []
      
      if (template && PLAN_TEMPLATES[template]) {
        // ใช้ฟิลด์จาก template
        fieldsToInsert = PLAN_TEMPLATES[template].fields.map((field, index) => ({
          plan_id: newPlan.id,
          name: field.name,
          field_type: field.field_type,
          unit: field.unit || '',
          is_required: field.is_required || false,
          options: field.options || null,
          sort_order: index
        }))
      } else if (planData.fields && planData.fields.length > 0) {
        // ใช้ฟิลด์ที่กำหนดเอง
        fieldsToInsert = planData.fields.map((field, index) => {
          // ตรวจสอบ field_type
          if (!VALID_FIELD_TYPES.includes(field.field_type)) {
            throw new Error(`ประเภทฟิลด์ไม่ถูกต้อง: ${field.field_type}`)
          }
          return {
            plan_id: newPlan.id,
            name: field.name,
            field_type: field.field_type,
            unit: field.unit || '',
            is_required: field.is_required || false,
            options: field.options || null,
            sort_order: index
          }
        })
      }

      // สร้างฟิลด์
      if (fieldsToInsert.length > 0) {
        const { error: fieldsError } = await supabase
          .from('tracking_fields')
          .insert(fieldsToInsert)

        if (fieldsError) throw fieldsError
      }

      // เพิ่มเข้า state
      plans.value.unshift({
        ...newPlan,
        field_count: fieldsToInsert.length,
        athlete_count: 0
      })

      return { success: true, data: newPlan }
    } catch (err) {
      error.value = err.message
      console.error('Error creating tracking plan:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * อัพเดทแผนติดตาม
   * Requirements: 1.5
   */
  async function updatePlan(planId, updates) {
    loading.value = true
    error.value = null

    try {
      const updateData = {
        updated_at: new Date().toISOString()
      }

      // อัพเดทเฉพาะฟิลด์ที่ส่งมา
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.plan_type !== undefined) updateData.plan_type = updates.plan_type
      if (updates.start_date !== undefined) updateData.start_date = updates.start_date
      if (updates.end_date !== undefined) updateData.end_date = updates.end_date
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active

      const { data, error: updateError } = await supabase
        .from('tracking_plans')
        .update(updateData)
        .eq('id', planId)
        .select()
        .single()

      if (updateError) throw updateError

      // อัพเดท state
      const index = plans.value.findIndex(p => p.id === planId)
      if (index !== -1) {
        plans.value[index] = { ...plans.value[index], ...data }
      }

      if (currentPlan.value?.id === planId) {
        currentPlan.value = { ...currentPlan.value, ...data }
      }

      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error updating tracking plan:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * ลบแผนติดตาม (soft delete - set is_active = false)
   * Requirements: 1.6 - เก็บ logs ไว้แต่ซ่อนจากรายการ active
   */
  async function deletePlan(planId) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('tracking_plans')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)

      if (deleteError) throw deleteError

      // อัพเดท state
      const index = plans.value.findIndex(p => p.id === planId)
      if (index !== -1) {
        plans.value[index].is_active = false
      }

      return { success: true }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting tracking plan:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * เพิ่มนักกีฬาเข้าแผนพร้อมตั้งเป้าหมาย
   * Requirements: 3.2
   * @param {string} planId - รหัสแผน
   * @param {string} athleteId - รหัสนักกีฬา
   * @param {Array} goals - เป้าหมายสำหรับแต่ละฟิลด์ [{ field_id, initial_value, target_value, target_date }]
   */
  async function addAthleteToPlan(planId, athleteId, goals = []) {
    loading.value = true
    error.value = null

    try {
      // ตรวจสอบว่ามีแผนอยู่จริง
      if (!planId || !athleteId) {
        throw new Error('กรุณาระบุรหัสแผนและรหัสนักกีฬา')
      }

      // ดึงฟิลด์ทั้งหมดของแผน
      const { data: fields, error: fieldsError } = await supabase
        .from('tracking_fields')
        .select('id, name, is_required')
        .eq('plan_id', planId)

      if (fieldsError) throw fieldsError

      if (!fields || fields.length === 0) {
        throw new Error('แผนนี้ยังไม่มีฟิลด์ที่ต้องติดตาม')
      }

      // สร้างเป้าหมายสำหรับแต่ละฟิลด์
      const goalsToInsert = fields.map(field => {
        // หาเป้าหมายที่ส่งมาสำหรับฟิลด์นี้
        const goalData = goals.find(g => g.field_id === field.id) || {}
        
        return {
          plan_id: planId,
          athlete_id: athleteId,
          field_id: field.id,
          initial_value: goalData.initial_value ?? null,
          target_value: goalData.target_value ?? null,
          target_date: goalData.target_date ?? null
        }
      })

      // บันทึกเป้าหมายทั้งหมด
      const { data: insertedGoals, error: insertError } = await supabase
        .from('tracking_athlete_goals')
        .insert(goalsToInsert)
        .select(`
          *,
          athlete:user_profiles(id, name, avatar_url)
        `)

      if (insertError) {
        // ตรวจสอบว่าเป็น unique constraint error หรือไม่
        if (insertError.code === '23505') {
          throw new Error('นักกีฬาคนนี้อยู่ในแผนนี้แล้ว')
        }
        throw insertError
      }

      // อัพเดท currentPlan ถ้ากำลังดูแผนนี้อยู่
      if (currentPlan.value?.id === planId) {
        const athleteData = {
          athlete_id: athleteId,
          athlete: insertedGoals[0]?.athlete || null,
          goals: insertedGoals
        }
        
        if (!currentPlan.value.athletes) {
          currentPlan.value.athletes = []
        }
        currentPlan.value.athletes.push(athleteData)
      }

      // อัพเดท athlete_count ใน plans
      const planIndex = plans.value.findIndex(p => p.id === planId)
      if (planIndex !== -1) {
        plans.value[planIndex].athlete_count = (plans.value[planIndex].athlete_count || 0) + 1
      }

      return { success: true, data: insertedGoals }
    } catch (err) {
      error.value = err.message
      console.error('Error adding athlete to plan:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * อัพเดทเป้าหมายของนักกีฬา
   * Requirements: 3.4
   * @param {string} planId - รหัสแผน
   * @param {string} athleteId - รหัสนักกีฬา
   * @param {Array} goals - เป้าหมายที่ต้องการอัพเดท [{ field_id, initial_value, target_value, target_date }]
   */
  async function updateAthleteGoals(planId, athleteId, goals = []) {
    loading.value = true
    error.value = null

    try {
      if (!planId || !athleteId || !goals.length) {
        throw new Error('กรุณาระบุข้อมูลให้ครบถ้วน')
      }

      // อัพเดททีละเป้าหมาย
      const updatePromises = goals.map(async (goal) => {
        const updateData = {
          updated_at: new Date().toISOString()
        }

        if (goal.initial_value !== undefined) updateData.initial_value = goal.initial_value
        if (goal.target_value !== undefined) updateData.target_value = goal.target_value
        if (goal.target_date !== undefined) updateData.target_date = goal.target_date

        return supabase
          .from('tracking_athlete_goals')
          .update(updateData)
          .eq('plan_id', planId)
          .eq('athlete_id', athleteId)
          .eq('field_id', goal.field_id)
          .select()
      })

      const results = await Promise.all(updatePromises)

      // ตรวจสอบ errors
      const errors = results.filter(r => r.error)
      if (errors.length > 0) {
        throw new Error(errors[0].error.message)
      }

      // รวบรวมข้อมูลที่อัพเดทแล้ว
      const updatedGoals = results.flatMap(r => r.data || [])

      // อัพเดท currentPlan ถ้ากำลังดูแผนนี้อยู่
      if (currentPlan.value?.id === planId) {
        const athleteIndex = currentPlan.value.athletes?.findIndex(a => a.athlete_id === athleteId)
        if (athleteIndex !== -1 && athleteIndex !== undefined) {
          // อัพเดทเป้าหมายใน state
          updatedGoals.forEach(updatedGoal => {
            const goalIndex = currentPlan.value.athletes[athleteIndex].goals.findIndex(
              g => g.field_id === updatedGoal.field_id
            )
            if (goalIndex !== -1) {
              currentPlan.value.athletes[athleteIndex].goals[goalIndex] = {
                ...currentPlan.value.athletes[athleteIndex].goals[goalIndex],
                ...updatedGoal
              }
            }
          })
        }
      }

      return { success: true, data: updatedGoals }
    } catch (err) {
      error.value = err.message
      console.error('Error updating athlete goals:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * ลบนักกีฬาออกจากแผน (เก็บ logs ไว้)
   * Requirements: 3.5 - ลบเฉพาะ goals แต่เก็บ logs ไว้
   * @param {string} planId - รหัสแผน
   * @param {string} athleteId - รหัสนักกีฬา
   */
  async function removeAthleteFromPlan(planId, athleteId) {
    loading.value = true
    error.value = null

    try {
      if (!planId || !athleteId) {
        throw new Error('กรุณาระบุรหัสแผนและรหัสนักกีฬา')
      }

      // ลบเฉพาะ goals (ไม่ลบ logs เพื่อเก็บประวัติ)
      const { error: deleteError } = await supabase
        .from('tracking_athlete_goals')
        .delete()
        .eq('plan_id', planId)
        .eq('athlete_id', athleteId)

      if (deleteError) throw deleteError

      // อัพเดท currentPlan ถ้ากำลังดูแผนนี้อยู่
      if (currentPlan.value?.id === planId) {
        currentPlan.value.athletes = currentPlan.value.athletes?.filter(
          a => a.athlete_id !== athleteId
        ) || []
      }

      // อัพเดท athlete_count ใน plans
      const planIndex = plans.value.findIndex(p => p.id === planId)
      if (planIndex !== -1 && plans.value[planIndex].athlete_count > 0) {
        plans.value[planIndex].athlete_count -= 1
      }

      return { success: true }
    } catch (err) {
      error.value = err.message
      console.error('Error removing athlete from plan:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // ============ TRACKING LOG ACTIONS ============

  /**
   * ดึง logs ของแผน
   * @param {string} planId - รหัสแผน
   * @param {string} athleteId - รหัสนักกีฬา (optional)
   */
  async function fetchLogs(planId, athleteId = null) {
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('tracking_logs')
        .select('*')
        .eq('plan_id', planId)
        .order('log_date', { ascending: false })

      if (athleteId) {
        query = query.eq('athlete_id', athleteId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      logs.value = data || []
      return { success: true, data: logs.value }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching tracking logs:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * สร้าง/อัพเดท log (upsert behavior)
   * Requirements: 4.3, 4.5
   * - ถ้ามี log สำหรับ (plan_id, athlete_id, log_date) อยู่แล้ว จะอัพเดทแทน
   * @param {Object} logData - ข้อมูล log
   * @param {string} logData.plan_id - รหัสแผน
   * @param {string} logData.athlete_id - รหัสนักกีฬา
   * @param {string} logData.log_date - วันที่บันทึก (YYYY-MM-DD)
   * @param {Object} logData.values - ค่าที่บันทึก { field_id: value }
   * @param {string} logData.notes - หมายเหตุ (optional)
   * @param {Array} fields - ข้อมูลฟิลด์สำหรับ validation (optional)
   */
  async function createLog(logData, fields = []) {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!logData.plan_id || !logData.athlete_id || !logData.log_date) {
        throw new Error('กรุณาระบุข้อมูลให้ครบถ้วน: plan_id, athlete_id, log_date')
      }

      if (!logData.values || typeof logData.values !== 'object') {
        throw new Error('กรุณาระบุค่าที่ต้องการบันทึก')
      }

      // ตรวจสอบค่าตาม field type (ถ้ามีข้อมูล fields)
      if (fields.length > 0) {
        for (const field of fields) {
          const value = logData.values[field.id]
          const validation = validateFieldValue(field.field_type, value)
          
          if (!validation.valid) {
            throw new Error(`${field.name}: ${validation.message}`)
          }
        }
      }

      // ใช้ upsert เพื่อสร้างหรืออัพเดท
      // ON CONFLICT (plan_id, athlete_id, log_date) DO UPDATE
      const { data, error: upsertError } = await supabase
        .from('tracking_logs')
        .upsert({
          plan_id: logData.plan_id,
          athlete_id: logData.athlete_id,
          log_date: logData.log_date,
          values: logData.values,
          notes: logData.notes || null,
          created_by: authStore.user?.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'plan_id,athlete_id,log_date',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (upsertError) throw upsertError

      // อัพเดท state
      const existingIndex = logs.value.findIndex(
        l => l.plan_id === logData.plan_id && 
             l.athlete_id === logData.athlete_id && 
             l.log_date === logData.log_date
      )

      // เก็บค่าก่อนหน้าสำหรับตรวจสอบ milestone
      let previousValues = {}
      if (existingIndex !== -1) {
        previousValues = logs.value[existingIndex].values || {}
        // อัพเดท log ที่มีอยู่
        logs.value[existingIndex] = data
      } else {
        // เพิ่ม log ใหม่
        logs.value.unshift(data)
      }

      // ตรวจสอบและสร้าง milestone notifications (Requirements: 7.1, 7.2)
      // ทำแบบ async โดยไม่ block การ return
      if (currentPlan.value?.id === logData.plan_id) {
        const athlete = currentPlan.value.athletes?.find(a => a.athlete_id === logData.athlete_id)
        if (athlete?.goals) {
          checkAndCreateMilestoneNotifications(
            logData.plan_id,
            logData.athlete_id,
            previousValues,
            logData.values,
            currentPlan.value.fields || fields,
            athlete.goals
          ).catch(err => {
            console.error('Error checking milestones:', err)
          })
        }
      }

      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error creating/updating tracking log:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * อัพเดท log (ต้องอยู่ภายใน 7 วัน)
   * Requirements: 4.4
   * @param {string} logId - รหัส log
   * @param {Object} updates - ข้อมูลที่ต้องการอัพเดท
   * @param {Object} updates.values - ค่าที่บันทึก { field_id: value }
   * @param {string} updates.notes - หมายเหตุ (optional)
   * @param {Array} fields - ข้อมูลฟิลด์สำหรับ validation (optional)
   */
  async function updateLog(logId, updates, fields = []) {
    loading.value = true
    error.value = null

    try {
      if (!logId) {
        throw new Error('กรุณาระบุรหัส log')
      }

      // ดึงข้อมูล log เดิมเพื่อตรวจสอบวันที่สร้าง
      const { data: existingLog, error: fetchError } = await supabase
        .from('tracking_logs')
        .select('*')
        .eq('id', logId)
        .single()

      if (fetchError) throw fetchError

      if (!existingLog) {
        throw new Error('ไม่พบ log ที่ต้องการแก้ไข')
      }

      // ตรวจสอบว่าอยู่ภายใน 7 วันหรือไม่
      if (!canEditLog(existingLog.created_at)) {
        throw new Error(`ไม่สามารถแก้ไข log ที่สร้างเกิน ${LOG_EDIT_LIMIT_DAYS} วันได้`)
      }

      // ตรวจสอบค่าตาม field type (ถ้ามีข้อมูล fields)
      if (updates.values && fields.length > 0) {
        for (const field of fields) {
          const value = updates.values[field.id]
          const validation = validateFieldValue(field.field_type, value)
          
          if (!validation.valid) {
            throw new Error(`${field.name}: ${validation.message}`)
          }
        }
      }

      // สร้างข้อมูลที่จะอัพเดท
      const updateData = {
        updated_at: new Date().toISOString()
      }

      if (updates.values !== undefined) updateData.values = updates.values
      if (updates.notes !== undefined) updateData.notes = updates.notes

      // อัพเดท log
      const { data, error: updateError } = await supabase
        .from('tracking_logs')
        .update(updateData)
        .eq('id', logId)
        .select()
        .single()

      if (updateError) throw updateError

      // อัพเดท state
      const index = logs.value.findIndex(l => l.id === logId)
      if (index !== -1) {
        logs.value[index] = data
      }

      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error updating tracking log:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * รีเซ็ต state
   */
  function reset() {
    plans.value = []
    currentPlan.value = null
    athletes.value = []
    logs.value = []
    error.value = null
  }

  // ============ MILESTONE DETECTION ============

  /**
   * ตรวจสอบว่า progress ข้าม milestone หรือไม่
   * Requirements: 7.1, 7.2
   * Property 10: Milestone notification triggers at correct thresholds (50%, 100%)
   * 
   * @param {number} previousPercentage - เปอร์เซ็นต์ก่อนหน้า
   * @param {number} currentPercentage - เปอร์เซ็นต์ปัจจุบัน
   * @returns {{ crossed50: boolean, crossed100: boolean }} milestone ที่ข้าม
   */
  function detectMilestones(previousPercentage, currentPercentage) {
    // ใช้ pure function ที่ export ไว้
    return detectMilestonesCrossing(previousPercentage, currentPercentage)
  }

  /**
   * ดึง milestones ที่นักกีฬาบรรลุแล้ว
   * @param {string} planId - รหัสแผน
   * @param {string} athleteId - รหัสนักกีฬา
   * @param {string} fieldId - รหัสฟิลด์
   * @returns {{ has50: boolean, has100: boolean }} milestones ที่บรรลุ
   */
  function getAchievedMilestones(planId, athleteId, fieldId) {
    // หา goal และคำนวณ progress ปัจจุบัน
    const athlete = currentPlan.value?.athletes?.find(a => a.athlete_id === athleteId)
    const goal = athlete?.goals?.find(g => g.field_id === fieldId)
    const currentValue = getLatestValue(planId, athleteId, fieldId)
    
    if (!goal) {
      return { has50: false, has100: false }
    }
    
    const progress = calculateProgress(athleteId, fieldId, goal, currentValue)
    
    return {
      has50: progress.percentage >= 50,
      has100: progress.percentage >= 100
    }
  }

  /**
   * ตรวจสอบและสร้าง milestone notifications หลังบันทึก log
   * Requirements: 7.1, 7.2
   * 
   * @param {string} planId - รหัสแผน
   * @param {string} athleteId - รหัสนักกีฬา
   * @param {Object} previousValues - ค่าก่อนหน้า { fieldId: value }
   * @param {Object} newValues - ค่าใหม่ { fieldId: value }
   * @param {Array} fields - ข้อมูลฟิลด์
   * @param {Array} goals - ข้อมูลเป้าหมาย
   * @returns {Promise<Array>} รายการ milestones ที่ถูกสร้าง
   */
  async function checkAndCreateMilestoneNotifications(planId, athleteId, previousValues, newValues, fields, goals) {
    const authStore = useAuthStore()
    const milestones = []
    
    if (!fields || !goals) return milestones
    
    for (const field of fields) {
      const goal = goals.find(g => g.field_id === field.id)
      if (!goal || goal.target_value === null || goal.target_value === undefined) continue
      
      // คำนวณ progress ก่อนและหลัง
      const prevValue = previousValues?.[field.id] ?? goal.initial_value ?? 0
      const newValue = newValues?.[field.id]
      
      if (newValue === undefined || newValue === null) continue
      
      const prevProgress = calculateProgress(athleteId, field.id, goal, prevValue)
      const newProgress = calculateProgress(athleteId, field.id, goal, newValue)
      
      // ตรวจสอบ milestone
      const detected = detectMilestones(prevProgress.percentage, newProgress.percentage)
      
      if (detected.crossed50 || detected.crossed100) {
        milestones.push({
          fieldId: field.id,
          fieldName: field.name,
          crossed50: detected.crossed50,
          crossed100: detected.crossed100,
          percentage: newProgress.percentage
        })
      }
    }
    
    // สร้าง notifications สำหรับ milestones ที่ตรวจพบ
    if (milestones.length > 0) {
      await createMilestoneNotifications(planId, athleteId, milestones)
    }
    
    return milestones
  }

  /**
   * สร้าง notifications สำหรับ milestones
   * Requirements: 7.1, 7.2
   * 
   * @param {string} planId - รหัสแผน
   * @param {string} athleteId - รหัสนักกีฬา
   * @param {Array} milestones - รายการ milestones
   */
  async function createMilestoneNotifications(planId, athleteId, milestones) {
    try {
      const plan = currentPlan.value || plans.value.find(p => p.id === planId)
      const planName = plan?.name || 'แผนติดตาม'
      
      const notificationsToInsert = []
      
      for (const milestone of milestones) {
        if (milestone.crossed100) {
          // บรรลุเป้าหมาย 100%
          notificationsToInsert.push({
            user_id: athleteId,
            title: '🎉 บรรลุเป้าหมาย!',
            message: `ยินดีด้วย! คุณบรรลุเป้าหมาย "${milestone.fieldName}" ในแผน "${planName}" แล้ว`,
            type: 'success',
            reference_type: 'tracking_milestone',
            reference_id: planId
          })
        } else if (milestone.crossed50) {
          // ผ่านครึ่งทาง 50%
          notificationsToInsert.push({
            user_id: athleteId,
            title: '🏃 ผ่านครึ่งทางแล้ว!',
            message: `เยี่ยมมาก! คุณผ่าน 50% ของเป้าหมาย "${milestone.fieldName}" ในแผน "${planName}" แล้ว`,
            type: 'info',
            reference_type: 'tracking_milestone',
            reference_id: planId
          })
        }
      }
      
      if (notificationsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notificationsToInsert)
        
        if (insertError) {
          console.error('Error creating milestone notifications:', insertError)
        }
      }
    } catch (err) {
      console.error('Error in createMilestoneNotifications:', err)
    }
  }

  return {
    // State
    plans,
    currentPlan,
    athletes,
    logs,
    loading,
    error,
    // Getters
    activePlans,
    planById,
    // Progress Calculation (Requirements: 5.1, 5.2, 5.3)
    calculateProgress,
    getChartData,
    getLatestValue,
    getAthleteProgress,
    // Actions
    fetchPlans,
    fetchPlanDetail,
    createPlan,
    updatePlan,
    deletePlan,
    addAthleteToPlan,
    updateAthleteGoals,
    removeAthleteFromPlan,
    // Log Actions (Requirements: 4.3, 4.4, 4.5)
    fetchLogs,
    createLog,
    updateLog,
    reset,
    // Milestone Detection (Requirements: 7.1, 7.2)
    detectMilestones,
    getAchievedMilestones,
    checkAndCreateMilestoneNotifications,
    createMilestoneNotifications
  }
})
