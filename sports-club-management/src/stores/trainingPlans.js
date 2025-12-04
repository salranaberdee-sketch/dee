import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'

export const useTrainingPlansStore = defineStore('trainingPlans', () => {
  // State
  const plans = ref([])
  const currentPlan = ref(null)
  const levels = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const activePlans = computed(() => plans.value.filter(p => p.is_active))
  
  const planById = computed(() => (id) => plans.value.find(p => p.id === id))

  // ดึงรายการแผนพัฒนาทั้งหมด
  async function fetchPlans() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('training_plans')
        .select(`
          *,
          levels:plan_levels(count),
          progress:athlete_progress(count)
        `)
        .order('created_at', { ascending: false })

      // กรองตาม club_id สำหรับ coach
      if (authStore.isCoach && authStore.profile?.club_id) {
        query = query.eq('club_id', authStore.profile.club_id)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // แปลงข้อมูล count
      plans.value = data.map(plan => ({
        ...plan,
        level_count: plan.levels?.[0]?.count || 0,
        athlete_count: plan.progress?.[0]?.count || 0
      }))

      return { success: true, data: plans.value }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching plans:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // ดึงรายละเอียดแผนพร้อมระดับ
  async function fetchPlanDetail(planId) {
    loading.value = true
    error.value = null

    try {
      // ดึงข้อมูลแผน
      const { data: planData, error: planError } = await supabase
        .from('training_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (planError) throw planError

      // ดึงระดับทั้งหมด
      const { data: levelsData, error: levelsError } = await supabase
        .from('plan_levels')
        .select('*')
        .eq('plan_id', planId)
        .order('level_number', { ascending: true })

      if (levelsError) throw levelsError

      currentPlan.value = planData
      levels.value = levelsData

      return { success: true, plan: planData, levels: levelsData }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching plan detail:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // สร้างแผนพัฒนาใหม่
  async function createPlan(planData) {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      // สร้างแผน
      const { data: newPlan, error: createError } = await supabase
        .from('training_plans')
        .insert({
          club_id: authStore.profile?.club_id,
          name: planData.name,
          description: planData.description,
          total_levels: planData.total_levels,
          is_active: true,
          created_by: authStore.user?.id
        })
        .select()
        .single()

      if (createError) throw createError

      // สร้างระดับเริ่มต้น
      if (planData.levels && planData.levels.length > 0) {
        const levelsToInsert = planData.levels.map((level, index) => ({
          plan_id: newPlan.id,
          level_number: index + 1,
          name: level.name || `ระดับ ${index + 1}`,
          description: level.description || '',
          requirements: level.requirements || [],
          sort_order: index
        }))

        const { error: levelsError } = await supabase
          .from('plan_levels')
          .insert(levelsToInsert)

        if (levelsError) throw levelsError
      } else {
        // สร้างระดับเริ่มต้นอัตโนมัติ
        const defaultLevels = Array.from({ length: planData.total_levels }, (_, i) => ({
          plan_id: newPlan.id,
          level_number: i + 1,
          name: `ระดับ ${i + 1}`,
          description: '',
          requirements: [],
          sort_order: i
        }))

        const { error: levelsError } = await supabase
          .from('plan_levels')
          .insert(defaultLevels)

        if (levelsError) throw levelsError
      }

      // เพิ่มเข้า state
      plans.value.unshift({ ...newPlan, level_count: planData.total_levels, athlete_count: 0 })

      return { success: true, data: newPlan }
    } catch (err) {
      error.value = err.message
      console.error('Error creating plan:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // อัพเดทแผนพัฒนา
  async function updatePlan(planId, updates) {
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('training_plans')
        .update({
          name: updates.name,
          description: updates.description,
          is_active: updates.is_active
        })
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
      console.error('Error updating plan:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // ลบแผนพัฒนา (soft delete - set is_active = false)
  async function deletePlan(planId) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('training_plans')
        .update({ is_active: false })
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
      console.error('Error deleting plan:', err)
      return { success: false, message: err.message }
    } finally {
      loading.value = false
    }
  }

  // อัพเดทระดับ
  async function updateLevel(levelId, updates) {
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('plan_levels')
        .update({
          name: updates.name,
          description: updates.description,
          requirements: updates.requirements
        })
        .eq('id', levelId)
        .select()
        .single()

      if (updateError) throw updateError

      // อัพเดท state
      const index = levels.value.findIndex(l => l.id === levelId)
      if (index !== -1) {
        levels.value[index] = data
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

  // รีเซ็ต state
  function reset() {
    plans.value = []
    currentPlan.value = null
    levels.value = []
    error.value = null
  }

  return {
    // State
    plans,
    currentPlan,
    levels,
    loading,
    error,
    // Getters
    activePlans,
    planById,
    // Actions
    fetchPlans,
    fetchPlanDetail,
    createPlan,
    updatePlan,
    deletePlan,
    updateLevel,
    reset
  }
})
