/**
 * Scoring Criteria Store
 * 
 * Manages scoring criteria and conditions for athlete evaluation.
 * Implements Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import { DEFAULT_CRITERIA, validateCriteriaWeights } from '@/lib/scoreCalculator'

export const useScoringCriteriaStore = defineStore('scoringCriteria', () => {
  // ============ STATE ============
  // Requirement 7.1: Display current criteria configuration
  
  /** @type {import('vue').Ref<Object|null>} Current scoring criteria for the club */
  const criteria = ref(null)
  
  /** @type {import('vue').Ref<Array>} List of scoring conditions for the club */
  const conditions = ref([])
  
  /** @type {import('vue').Ref<boolean>} Loading state */
  const loading = ref(false)
  
  /** @type {import('vue').Ref<string|null>} Error message */
  const error = ref(null)

  // ============ GETTERS ============
  // Requirements 7.4, 7.5: Filter conditions by type
  
  /**
   * Get only active conditions
   * @returns {Array} Active conditions
   */
  const activeConditions = computed(() => {
    return conditions.value.filter(c => c.is_active !== false)
  })

  /**
   * Get bonus conditions (condition_type = 'bonus')
   * Requirement 7.4: Bonus conditions add points
   * @returns {Array} Bonus conditions
   */
  const bonusConditions = computed(() => {
    return conditions.value.filter(c => c.condition_type === 'bonus')
  })

  /**
   * Get penalty conditions (condition_type = 'penalty')
   * Requirement 7.5: Penalty conditions subtract points
   * @returns {Array} Penalty conditions
   */
  const penaltyConditions = computed(() => {
    return conditions.value.filter(c => c.condition_type === 'penalty')
  })

  /**
   * Calculate total weights from current criteria
   * Requirement 7.2, 7.6: Total must equal 100%
   * @returns {number} Sum of all weights
   */
  const totalWeights = computed(() => {
    if (!criteria.value) return 100 // Default weights sum to 100
    return (
      (criteria.value.attendance_weight || 0) +
      (criteria.value.training_weight || 0) +
      (criteria.value.rating_weight || 0)
    )
  })

  /**
   * Check if current weights are valid (sum to 100)
   * Requirement 7.6: Validate weights sum
   * @returns {boolean} True if weights sum to 100
   */
  const isValidWeights = computed(() => {
    return totalWeights.value === 100
  })


  // ============ ACTIONS ============

  /**
   * Fetch scoring criteria for a club
   * Returns default criteria if none exists
   * Requirements 7.1, 7.7
   * 
   * @param {string} clubId - The club ID to fetch criteria for
   * @returns {Promise<Object>} The criteria (custom or default)
   */
  async function fetchCriteria(clubId) {
    if (!clubId) {
      // Return defaults if no club specified
      criteria.value = { ...DEFAULT_CRITERIA }
      return criteria.value
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('scoring_criteria')
        .select('*')
        .eq('club_id', clubId)
        .single()

      if (err) {
        // If no criteria found, use defaults (Requirement 7.7)
        if (err.code === 'PGRST116') {
          criteria.value = { 
            ...DEFAULT_CRITERIA,
            club_id: clubId 
          }
          return criteria.value
        }
        throw err
      }

      criteria.value = data
      return data
    } catch (err) {
      error.value = err.message
      console.error('Error fetching criteria:', err)
      // Return defaults on error (Requirement 7.7)
      criteria.value = { 
        ...DEFAULT_CRITERIA,
        club_id: clubId 
      }
      return criteria.value
    } finally {
      loading.value = false
    }
  }

  /**
   * Save scoring criteria for a club
   * Validates weights sum to 100 before saving
   * Requirements 7.2, 7.6
   * 
   * @param {Object} criteriaData - The criteria to save
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async function saveCriteria(criteriaData) {
    // Validate weights sum to 100 (Requirement 7.6)
    const validation = validateCriteriaWeights(criteriaData)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    loading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()
      const userId = authStore.user?.id

      const payload = {
        club_id: criteriaData.club_id,
        attendance_weight: criteriaData.attendance_weight,
        training_weight: criteriaData.training_weight,
        rating_weight: criteriaData.rating_weight,
        target_training_sessions: criteriaData.target_training_sessions || DEFAULT_CRITERIA.target_training_sessions,
        updated_by: userId,
        updated_at: new Date().toISOString()
      }

      // If no id, this is a new criteria - add created_by
      if (!criteriaData.id) {
        payload.created_by = userId
      } else {
        payload.id = criteriaData.id
      }

      const { data, error: err } = await supabase
        .from('scoring_criteria')
        .upsert(payload, { onConflict: 'club_id' })
        .select()
        .single()

      if (err) throw err

      criteria.value = data
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error saving criteria:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch all scoring conditions for a club
   * Requirement 7.3
   * 
   * @param {string} clubId - The club ID
   * @returns {Promise<Array>} List of conditions
   */
  async function fetchConditions(clubId) {
    if (!clubId) {
      conditions.value = []
      return []
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('scoring_conditions')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })

      if (err) throw err

      conditions.value = data || []
      return conditions.value
    } catch (err) {
      error.value = err.message
      console.error('Error fetching conditions:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Add a new scoring condition
   * Requirement 7.3
   * 
   * @param {Object} conditionData - The condition to add
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async function addCondition(conditionData) {
    loading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()
      
      // Ensure criteria exists for this club
      if (!criteria.value?.id && conditionData.club_id) {
        // Create default criteria first
        const criteriaResult = await saveCriteria({
          club_id: conditionData.club_id,
          ...DEFAULT_CRITERIA
        })
        if (!criteriaResult.success) {
          throw new Error('Failed to create criteria for condition')
        }
      }

      const payload = {
        club_id: conditionData.club_id,
        criteria_id: criteria.value?.id,
        name: conditionData.name,
        description: conditionData.description || null,
        category: conditionData.category,
        condition_type: conditionData.condition_type,
        threshold_type: conditionData.threshold_type,
        comparison_operator: conditionData.comparison_operator,
        threshold_value: conditionData.threshold_value,
        points: conditionData.points,
        is_active: conditionData.is_active !== false,
        created_by: authStore.user?.id
      }

      const { data, error: err } = await supabase
        .from('scoring_conditions')
        .insert(payload)
        .select()
        .single()

      if (err) throw err

      conditions.value.unshift(data)
      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error adding condition:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing scoring condition
   * Requirement 7.8
   * 
   * @param {string} id - The condition ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async function updateCondition(id, updates) {
    loading.value = true
    error.value = null

    try {
      const payload = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Remove fields that shouldn't be updated
      delete payload.id
      delete payload.club_id
      delete payload.criteria_id
      delete payload.created_by
      delete payload.created_at

      const { data, error: err } = await supabase
        .from('scoring_conditions')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err

      // Update local state
      const idx = conditions.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        conditions.value[idx] = data
      }

      return { success: true, data }
    } catch (err) {
      error.value = err.message
      console.error('Error updating condition:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a scoring condition
   * Requirement 7.8
   * 
   * @param {string} id - The condition ID to delete
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function deleteCondition(id) {
    loading.value = true
    error.value = null

    try {
      const { error: err } = await supabase
        .from('scoring_conditions')
        .delete()
        .eq('id', id)

      if (err) throw err

      // Remove from local state
      conditions.value = conditions.value.filter(c => c.id !== id)

      return { success: true }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting condition:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggle a condition's active status
   * Requirement 7.8
   * 
   * @param {string} id - The condition ID
   * @param {boolean} isActive - The new active status
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function toggleCondition(id, isActive) {
    return updateCondition(id, { is_active: isActive })
  }

  /**
   * Reset criteria to defaults
   * Requirement 7.7
   * 
   * @param {string} clubId - The club ID
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async function resetToDefaults(clubId) {
    return saveCriteria({
      club_id: clubId,
      ...DEFAULT_CRITERIA
    })
  }

  /**
   * Get effective criteria (custom or default)
   * Requirement 7.7
   * 
   * @returns {Object} The effective criteria
   */
  function getEffectiveCriteria() {
    if (criteria.value && criteria.value.id) {
      return criteria.value
    }
    return { ...DEFAULT_CRITERIA }
  }

  /**
   * Clear store state
   */
  function clearState() {
    criteria.value = null
    conditions.value = []
    error.value = null
  }

  return {
    // State
    criteria,
    conditions,
    loading,
    error,
    
    // Getters
    activeConditions,
    bonusConditions,
    penaltyConditions,
    totalWeights,
    isValidWeights,
    
    // Actions
    fetchCriteria,
    saveCriteria,
    fetchConditions,
    addCondition,
    updateCondition,
    deleteCondition,
    toggleCondition,
    resetToDefaults,
    getEffectiveCriteria,
    clearState
  }
})
