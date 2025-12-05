import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './auth'
import { useScoringCriteriaStore } from './scoringCriteria'
import { useScoringConfigStore } from './scoringConfig'
import { calculateScore, calculateOverallScore, createTierThresholdsFromConfig, DEFAULT_CRITERIA } from '../lib/scoreCalculator'

export const useEvaluationStore = defineStore('evaluation', () => {
  // State
  const attendanceRecords = ref([])
  const evaluations = ref([])
  const athleteStats = ref([])
  const loading = ref(false)
  const error = ref(null)
  const selectedMonth = ref(new Date().toISOString().slice(0, 7)) // YYYY-MM

  // Getters
  const athletesByTier = computed(() => {
    const grouped = { excellent: [], good: [], average: [], needs_improvement: [] }
    athleteStats.value.forEach(athlete => {
      const tier = athlete.performance_tier || 'needs_improvement'
      if (grouped[tier]) grouped[tier].push(athlete)
    })
    return grouped
  })

  const topPerformers = computed(() => {
    return [...athleteStats.value]
      .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
      .slice(0, 10)
  })

  const needsAttention = computed(() => {
    return athleteStats.value.filter(a => 
      a.performance_tier === 'needs_improvement' || a.attendance_rate < 50
    )
  })

  const attendanceSummary = computed(() => {
    const total = attendanceRecords.value.length
    if (total === 0) return { on_time: 0, late: 0, leave: 0, absent: 0 }
    
    const counts = { on_time: 0, late: 0, leave: 0, absent: 0 }
    attendanceRecords.value.forEach(r => {
      if (counts[r.status] !== undefined) counts[r.status]++
    })
    return counts
  })

  // Actions
  async function fetchAttendanceRecords(clubId, startDate, endDate) {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          athlete:athletes(id, name, email),
          schedule:schedules(id, title),
          event:events(id, title)
        `)
        .gte('record_date', startDate)
        .lte('record_date', endDate)
        .order('record_date', { ascending: false })

      if (clubId) query = query.eq('club_id', clubId)

      const { data, error: err } = await query
      if (err) throw err
      attendanceRecords.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching attendance:', err)
    } finally {
      loading.value = false
    }
  }

  async function recordAttendance(records) {
    loading.value = true
    error.value = null
    try {
      const authStore = useAuthStore()
      const recordsWithMeta = records.map(r => ({
        ...r,
        recorded_by: authStore.user?.id,
        club_id: r.club_id || authStore.profile?.club_id
      }))

      const { data, error: err } = await supabase
        .from('attendance_records')
        .upsert(recordsWithMeta, { 
          onConflict: 'athlete_id,record_date,schedule_id',
          ignoreDuplicates: false 
        })
        .select()

      if (err) throw err
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error recording attendance:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  async function submitLeaveRequest(athleteId, data) {
    loading.value = true
    error.value = null
    try {
      const authStore = useAuthStore()
      const athlete = await supabase
        .from('athletes')
        .select('club_id')
        .eq('id', athleteId)
        .single()

      const { data: result, error: err } = await supabase
        .from('attendance_records')
        .insert({
          athlete_id: athleteId,
          record_date: data.date,
          record_type: data.record_type || 'training',
          status: 'leave',
          leave_type: data.leave_type,
          leave_reason: data.leave_reason,
          leave_approved: false,
          club_id: athlete.data?.club_id,
          schedule_id: data.schedule_id || null,
          event_id: data.event_id || null,
          recorded_by: authStore.user?.id
        })
        .select()
        .single()

      if (err) throw err
      return { success: true, data: result }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  async function approveLeave(recordId, approved = true) {
    loading.value = true
    try {
      const authStore = useAuthStore()
      const { error: err } = await supabase
        .from('attendance_records')
        .update({
          leave_approved: approved,
          approved_by: authStore.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)

      if (err) throw err
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  async function fetchAthleteEvaluations(clubId, month) {
    loading.value = true
    error.value = null
    try {
      const monthStart = `${month}-01`
      
      let query = supabase
        .from('athlete_evaluations')
        .select(`
          *,
          athlete:athletes(id, name, email, user_id)
        `)
        .eq('evaluation_month', monthStart)
        .order('overall_score', { ascending: false })

      if (clubId) query = query.eq('club_id', clubId)

      const { data, error: err } = await query
      if (err) throw err
      evaluations.value = data || []
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * คำนวณสถิตินักกีฬาด้วย Batch Query (Performance Optimized)
   * แก้ไข N+1 Query Problem - ดึงข้อมูลทั้งหมดในครั้งเดียว
   * 
   * @param {string} clubId - รหัสชมรม
   * @param {string} month - เดือนในรูปแบบ YYYY-MM
   */
  async function calculateAthleteStats(clubId, month) {
    loading.value = true
    error.value = null
    try {
      const monthStart = `${month}-01`
      const monthEnd = new Date(month + '-01')
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      monthEnd.setDate(0)
      const endDate = monthEnd.toISOString().slice(0, 10)

      // ดึง scoring config (Flexible Scoring System)
      const scoringConfigStore = useScoringConfigStore()
      await scoringConfigStore.fetchClubConfig(clubId)
      const hasFlexibleConfig = scoringConfigStore.clubConfig?.is_active

      // ดึง scoring criteria แบบเดิม (ถ้าไม่มี flexible config)
      let criteria = null
      let conditions = []
      if (!hasFlexibleConfig) {
        const scoringCriteriaStore = useScoringCriteriaStore()
        await scoringCriteriaStore.fetchCriteria(clubId)
        await scoringCriteriaStore.fetchConditions(clubId)
        criteria = scoringCriteriaStore.getEffectiveCriteria()
        conditions = scoringCriteriaStore.activeConditions
      }

      // ===== BATCH QUERIES - ดึงข้อมูลทั้งหมดในครั้งเดียว =====
      
      // 1. ดึงนักกีฬาทั้งหมด
      let athleteQuery = supabase.from('athletes').select('id, name, email, club_id')
      if (clubId) athleteQuery = athleteQuery.eq('club_id', clubId)
      const { data: athletes } = await athleteQuery

      if (!athletes?.length) {
        athleteStats.value = []
        return
      }

      const athleteIds = athletes.map(a => a.id)

      // 2. ดึง attendance records ทั้งหมดในครั้งเดียว
      let attendanceQuery = supabase
        .from('attendance_records')
        .select('athlete_id, status')
        .in('athlete_id', athleteIds)
        .gte('record_date', monthStart)
        .lte('record_date', endDate)
      
      // 3. ดึง training logs ทั้งหมดในครั้งเดียว
      let trainingQuery = supabase
        .from('training_logs')
        .select('athlete_id, duration, rating')
        .in('athlete_id', athleteIds)
        .gte('date', monthStart)
        .lte('date', endDate)

      // รัน queries พร้อมกัน (Parallel)
      const [attendanceResult, trainingResult] = await Promise.all([
        attendanceQuery,
        trainingQuery
      ])

      const allAttendance = attendanceResult.data || []
      const allTraining = trainingResult.data || []

      // ===== จัดกลุ่มข้อมูลตาม athlete_id (O(n)) =====
      const attendanceByAthlete = {}
      const trainingByAthlete = {}

      for (const record of allAttendance) {
        if (!attendanceByAthlete[record.athlete_id]) {
          attendanceByAthlete[record.athlete_id] = []
        }
        attendanceByAthlete[record.athlete_id].push(record)
      }

      for (const log of allTraining) {
        if (!trainingByAthlete[log.athlete_id]) {
          trainingByAthlete[log.athlete_id] = []
        }
        trainingByAthlete[log.athlete_id].push(log)
      }

      // เตรียม Flexible Scoring data (ถ้ามี)
      let flexibleCategories, flexibleMetrics, metricsByCategory, tierThresholds
      if (hasFlexibleConfig) {
        flexibleCategories = scoringConfigStore.activeCategories
        flexibleMetrics = scoringConfigStore.metrics
        metricsByCategory = {}
        for (const metric of flexibleMetrics) {
          if (!metricsByCategory[metric.category_id]) {
            metricsByCategory[metric.category_id] = []
          }
          metricsByCategory[metric.category_id].push(metric)
        }
        tierThresholds = createTierThresholdsFromConfig(scoringConfigStore.clubConfig)
      }

      // ===== คำนวณสถิติแต่ละนักกีฬา (ไม่มี query เพิ่ม) =====
      const stats = athletes.map(athlete => {
        const attendance = attendanceByAthlete[athlete.id] || []
        const training = trainingByAthlete[athlete.id] || []

        // คำนวณสถิติพื้นฐาน
        const totalSessions = attendance.length
        const onTime = attendance.filter(a => a.status === 'on_time').length
        const late = attendance.filter(a => a.status === 'late').length
        const leave = attendance.filter(a => a.status === 'leave').length
        const absent = attendance.filter(a => a.status === 'absent').length
        const attended = onTime + late
        const attendanceRate = totalSessions > 0 ? (attended / totalSessions) * 100 : 0

        const trainingHours = training.reduce((sum, t) => sum + (t.duration || 0), 0) / 60
        const trainingSessions = training.length
        const avgRating = training.length > 0 
          ? training.reduce((sum, t) => sum + (t.rating || 0), 0) / training.length 
          : 0

        // เตรียมข้อมูลสำหรับคำนวณคะแนน
        const athleteStatsData = {
          total_sessions: totalSessions,
          attended_on_time: onTime,
          attended_late: late,
          leave_count: leave,
          absent_count: absent,
          attendance_rate: attendanceRate,
          training_hours: trainingHours,
          training_sessions: trainingSessions,
          average_rating: avgRating
        }

        let scoreBreakdown

        if (hasFlexibleConfig) {
          // คำนวณด้วย Flexible Scoring System
          const metricValues = {}
          for (const metric of flexibleMetrics) {
            switch (metric.name) {
              case 'attendance_rate':
                metricValues[metric.id] = attendanceRate
                break
              case 'training_hours':
                metricValues[metric.id] = trainingHours
                break
              case 'coach_rating':
              case 'average_rating':
                metricValues[metric.id] = avgRating
                break
              case 'training_sessions':
                metricValues[metric.id] = trainingSessions
                break
              default:
                metricValues[metric.id] = metric.default_value || 0
            }
          }

          const flexibleResult = calculateOverallScore({
            categories: flexibleCategories,
            metricsByCategory,
            metricValues,
            tierThresholds,
            allowBonus: false
          })

          scoreBreakdown = {
            attendance_score: flexibleResult.category_scores?.find(c => c.category_type === 'attendance')?.raw_score || 0,
            training_score: flexibleResult.category_scores?.find(c => c.category_type === 'training')?.raw_score || 0,
            rating_score: flexibleResult.category_scores?.find(c => c.category_type === 'skill')?.raw_score || 0,
            base_score: flexibleResult.overall_score,
            bonus_points: 0,
            penalty_points: 0,
            overall_score: flexibleResult.overall_score,
            tier: flexibleResult.performance_tier,
            applied_conditions: [],
            criteria_used: 'flexible_scoring_system',
            category_scores: flexibleResult.category_scores,
            calculation_details: flexibleResult.calculation_details
          }
        } else {
          // คำนวณด้วยระบบเดิม
          scoreBreakdown = calculateScore(athleteStatsData, criteria, conditions)
        }

        return {
          athlete_id: athlete.id,
          athlete_name: athlete.name,
          athlete_email: athlete.email,
          club_id: athlete.club_id,
          total_sessions: totalSessions,
          attended_on_time: onTime,
          attended_late: late,
          leave_count: leave,
          absent_count: absent,
          attendance_rate: Math.round(attendanceRate * 100) / 100,
          training_hours: Math.round(trainingHours * 100) / 100,
          training_sessions: trainingSessions,
          average_rating: Math.round(avgRating * 100) / 100,
          attendance_score: scoreBreakdown.attendance_score,
          training_score: scoreBreakdown.training_score,
          rating_score: scoreBreakdown.rating_score,
          base_score: scoreBreakdown.base_score,
          bonus_points: scoreBreakdown.bonus_points,
          penalty_points: scoreBreakdown.penalty_points,
          overall_score: scoreBreakdown.overall_score,
          performance_tier: scoreBreakdown.tier,
          applied_conditions: scoreBreakdown.applied_conditions,
          criteria_used: scoreBreakdown.criteria_used,
          category_scores: scoreBreakdown.category_scores,
          calculation_details: scoreBreakdown.calculation_details
        }
      })

      athleteStats.value = stats.sort((a, b) => b.overall_score - a.overall_score)
    } catch (err) {
      error.value = err.message
      console.error('Error calculating stats:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Save evaluation and applied conditions to database
   * Requirements: 8.6
   * 
   * @param {Object} evaluation - The evaluation data to save
   * @param {Array} appliedConditions - Array of applied conditions from score calculation
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async function saveEvaluation(evaluation, appliedConditions = []) {
    loading.value = true
    try {
      const authStore = useAuthStore()
      
      // Prepare evaluation data (exclude applied_conditions from the main record)
      const { applied_conditions, criteria_used, ...evaluationData } = evaluation
      
      const { data, error: err } = await supabase
        .from('athlete_evaluations')
        .upsert({
          ...evaluationData,
          evaluated_by: authStore.user?.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'athlete_id,evaluation_month' })
        .select()
        .single()

      if (err) throw err

      // Save applied conditions if provided (Requirement 8.6)
      const conditionsToSave = appliedConditions.length > 0 ? appliedConditions : (applied_conditions || [])
      if (conditionsToSave.length > 0 && data?.id) {
        await saveAppliedConditions(data.id, conditionsToSave)
      }

      return { success: true, data }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Save applied conditions to database
   * Records which conditions affected each evaluation
   * Requirement 8.6
   * 
   * @param {string} evaluationId - The evaluation ID
   * @param {Array} appliedConditions - Array of applied conditions
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function saveAppliedConditions(evaluationId, appliedConditions) {
    try {
      // First, delete existing applied conditions for this evaluation
      await supabase
        .from('applied_conditions')
        .delete()
        .eq('evaluation_id', evaluationId)

      // Filter conditions that have a valid condition_id
      const validConditions = appliedConditions.filter(c => c.condition_id)

      if (validConditions.length === 0) {
        return { success: true }
      }

      // Prepare records for insertion
      const records = validConditions.map(condition => ({
        evaluation_id: evaluationId,
        condition_id: condition.condition_id,
        actual_value: condition.actual_value ?? 0,
        threshold_value: condition.threshold_value ?? 0,
        condition_met: condition.condition_met ?? false,
        points_applied: condition.points_applied ?? 0
      }))

      const { error: insertErr } = await supabase
        .from('applied_conditions')
        .insert(records)

      if (insertErr) throw insertErr

      return { success: true }
    } catch (err) {
      console.error('Error saving applied conditions:', err)
      return { success: false, error: err.message }
    }
  }

  /**
   * Fetch applied conditions for an evaluation
   * Requirement 8.5
   * 
   * @param {string} evaluationId - The evaluation ID
   * @returns {Promise<Array>} Array of applied conditions with condition details
   */
  async function fetchAppliedConditions(evaluationId) {
    try {
      const { data, error: err } = await supabase
        .from('applied_conditions')
        .select(`
          *,
          condition:scoring_conditions(
            id, name, category, condition_type, 
            threshold_type, comparison_operator, points
          )
        `)
        .eq('evaluation_id', evaluationId)

      if (err) throw err
      return data || []
    } catch (err) {
      console.error('Error fetching applied conditions:', err)
      return []
    }
  }

  function getTierLabel(tier) {
    const labels = {
      excellent: 'ดีเยี่ยม',
      good: 'ดี',
      average: 'ปานกลาง',
      needs_improvement: 'ต้องปรับปรุง'
    }
    return labels[tier] || tier
  }

  function getTierColor(tier) {
    const colors = {
      excellent: '#22C55E',
      good: '#3B82F6',
      average: '#F59E0B',
      needs_improvement: '#EF4444'
    }
    return colors[tier] || '#737373'
  }

  return {
    // State
    attendanceRecords,
    evaluations,
    athleteStats,
    loading,
    error,
    selectedMonth,
    // Getters
    athletesByTier,
    topPerformers,
    needsAttention,
    attendanceSummary,
    // Actions
    fetchAttendanceRecords,
    recordAttendance,
    submitLeaveRequest,
    approveLeave,
    fetchAthleteEvaluations,
    calculateAthleteStats,
    saveEvaluation,
    saveAppliedConditions,
    fetchAppliedConditions,
    getTierLabel,
    getTierColor
  }
})
