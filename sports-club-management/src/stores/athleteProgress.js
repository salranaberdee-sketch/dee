import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'

export const useAthleteProgressStore = defineStore('athleteProgress', () => {
  // State
  const progressList = ref([])
  const history = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const progressByPlan = computed(() => (planId) => 
    progressList.value.filter(p => p.plan_id === planId)
  )

  const progressByAthlete = computed(() => (athleteId) => 
    progressList.value.filter(p => p.athlete_id === athleteId)
  )

  // ดึงความคืบหน้าทั้งหมดของแผน
  async function fetchProgressByPlan(planId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('athlete_progress')
        .select(`
          *,
          athlete:athletes(id, name, email),
          plan:training_plans(id, name, total_levels)
        `)
        .eq('plan_id', planId)
        .order('current_level', { ascending: false })

      if (fetchError) throw fetchError

      progressList.value = data
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching progress:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // ดึงความคืบหน้าของนักกีฬาคนเดียว
  async function fetchProgressByAthlete(athleteId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('athlete_progress')
        .select(`
          *,
          plan:training_plans(
            id, 
            name, 
            description,
            total_levels,
            levels:plan_levels(*)
          )
        `)
        .eq('athlete_id', athleteId)
        .order('last_updated_at', { ascending: false })

      if (fetchError) throw fetchError

      progressList.value = data
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching athlete progress:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // ดึงความคืบหน้าของตัวเอง (สำหรับ athlete)
  async function fetchMyProgress() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      // หา athlete_id จาก user_id
      const { data: athleteData, error: athleteError } = await supabase
        .from('athletes')
        .select('id')
        .eq('user_id', authStore.user?.id)
        .single()

      if (athleteError) throw athleteError

      return await fetchProgressByAthlete(athleteData.id)
    } catch (err) {
      error.value = err.message
      console.error('Error fetching my progress:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // Assign นักกีฬาเข้าแผน
  async function assignAthlete(athleteId, planId, initialLevel = 1) {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      const { data, error: insertError } = await supabase
        .from('athlete_progress')
        .insert({
          athlete_id: athleteId,
          plan_id: planId,
          current_level: initialLevel,
          updated_by: authStore.user?.id,
          notes: 'เริ่มต้นแผนพัฒนา'
        })
        .select(`
          *,
          athlete:athletes(id, name, email),
          plan:training_plans(id, name, total_levels)
        `)
        .single()

      if (insertError) {
        // ตรวจสอบว่าซ้ำหรือไม่
        if (insertError.code === '23505') {
          throw new Error('นักกีฬานี้ถูก assign แผนนี้แล้ว')
        }
        throw insertError
      }

      progressList.value.push(data)
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error assigning athlete:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // อัพเดทระดับนักกีฬา
  async function updateLevel(progressId, newLevel, notes = '') {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('athlete_progress')
        .update({
          current_level: newLevel,
          updated_by: authStore.user?.id,
          notes: notes
        })
        .eq('id', progressId)
        .select(`
          *,
          athlete:athletes(id, name, email),
          plan:training_plans(id, name, total_levels)
        `)
        .single()

      if (updateError) throw updateError

      // อัพเดท state
      const index = progressList.value.findIndex(p => p.id === progressId)
      if (index !== -1) {
        progressList.value[index] = data
      }

      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error updating level:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // ลบ assignment
  async function removeAssignment(progressId) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('athlete_progress')
        .delete()
        .eq('id', progressId)

      if (deleteError) throw deleteError

      // อัพเดท state
      progressList.value = progressList.value.filter(p => p.id !== progressId)

      return { success: true }
    } catch (err) {
      error.value = err.message
      console.error('Error removing assignment:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // ดึงประวัติการเลื่อนระดับ
  async function fetchHistory(progressId) {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('progress_history')
        .select(`
          *,
          changed_by_user:auth.users!changed_by(email)
        `)
        .eq('progress_id', progressId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      history.value = data
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching history:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // ดึงประวัติของนักกีฬา
  async function fetchAthleteHistory(athleteId, planId = null) {
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('progress_history')
        .select(`
          *,
          plan:training_plans(id, name)
        `)
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false })

      if (planId) {
        query = query.eq('plan_id', planId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      history.value = data
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching athlete history:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // รีเซ็ต state
  function reset() {
    progressList.value = []
    history.value = []
    error.value = null
  }

  return {
    // State
    progressList,
    history,
    loading,
    error,
    // Getters
    progressByPlan,
    progressByAthlete,
    // Actions
    fetchProgressByPlan,
    fetchProgressByAthlete,
    fetchMyProgress,
    assignAthlete,
    updateLevel,
    removeAssignment,
    fetchHistory,
    fetchAthleteHistory,
    reset
  }
})
