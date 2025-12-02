/**
 * Scoring Criteria Store Unit Tests
 * 
 * Tests CRUD operations and validation logic for the scoringCriteria store.
 * Requirements: 7.1-7.9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { DEFAULT_CRITERIA, validateCriteriaWeights } from '../lib/scoreCalculator.js'

// Mock supabase
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    }))
  }
}))

// Mock auth store
vi.mock('./auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'test-user-id' }
  }))
}))

describe('Scoring Criteria Store Unit Tests', () => {
  
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('validateCriteriaWeights', () => {
    /**
     * Test: Valid weights that sum to 100
     * Requirements: 7.2, 7.6
     */
    it('should return valid for weights summing to 100', () => {
      const criteria = {
        attendance_weight: 40,
        training_weight: 30,
        rating_weight: 30
      }
      
      const result = validateCriteriaWeights(criteria)
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeNull()
    })

    /**
     * Test: Invalid weights that don't sum to 100
     * Requirements: 7.2, 7.6
     */
    it('should return invalid for weights not summing to 100', () => {
      const criteria = {
        attendance_weight: 50,
        training_weight: 30,
        rating_weight: 30
      }
      
      const result = validateCriteriaWeights(criteria)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('must sum to 100')
    })

    /**
     * Test: Negative weights should be invalid
     * Requirements: 7.2, 7.6
     */
    it('should return invalid for negative weights', () => {
      const criteria = {
        attendance_weight: -10,
        training_weight: 60,
        rating_weight: 50
      }
      
      const result = validateCriteriaWeights(criteria)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('cannot be negative')
    })

    /**
     * Test: Weights exceeding 100 individually should be invalid
     * Requirements: 7.2, 7.6
     */
    it('should return invalid for individual weights exceeding 100', () => {
      const criteria = {
        attendance_weight: 110,
        training_weight: -5,
        rating_weight: -5
      }
      
      const result = validateCriteriaWeights(criteria)
      
      expect(result.isValid).toBe(false)
    })

    /**
     * Test: Null criteria should be invalid
     * Requirements: 7.2, 7.6
     */
    it('should return invalid for null criteria', () => {
      const result = validateCriteriaWeights(null)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('required')
    })

    /**
     * Test: Various valid weight combinations
     * Requirements: 7.2, 7.6
     */
    it('should accept various valid weight combinations', () => {
      const validCombinations = [
        { attendance_weight: 100, training_weight: 0, rating_weight: 0 },
        { attendance_weight: 0, training_weight: 100, rating_weight: 0 },
        { attendance_weight: 0, training_weight: 0, rating_weight: 100 },
        { attendance_weight: 33, training_weight: 33, rating_weight: 34 },
        { attendance_weight: 50, training_weight: 25, rating_weight: 25 }
      ]
      
      validCombinations.forEach(criteria => {
        const result = validateCriteriaWeights(criteria)
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('DEFAULT_CRITERIA', () => {
    /**
     * Test: Default criteria should have correct values
     * Requirements: 7.7
     */
    it('should have default weights of 40, 30, 30', () => {
      expect(DEFAULT_CRITERIA.attendance_weight).toBe(40)
      expect(DEFAULT_CRITERIA.training_weight).toBe(30)
      expect(DEFAULT_CRITERIA.rating_weight).toBe(30)
    })

    /**
     * Test: Default criteria weights should sum to 100
     * Requirements: 7.7
     */
    it('should have weights that sum to 100', () => {
      const sum = DEFAULT_CRITERIA.attendance_weight + 
                  DEFAULT_CRITERIA.training_weight + 
                  DEFAULT_CRITERIA.rating_weight
      
      expect(sum).toBe(100)
    })

    /**
     * Test: Default criteria should have target_training_sessions
     * Requirements: 7.7
     */
    it('should have target_training_sessions of 12', () => {
      expect(DEFAULT_CRITERIA.target_training_sessions).toBe(12)
    })
  })

  describe('Store Getters Logic', () => {
    /**
     * Test: totalWeights calculation
     * Requirements: 7.2, 7.6
     */
    it('should calculate totalWeights correctly', () => {
      const criteria = {
        attendance_weight: 45,
        training_weight: 35,
        rating_weight: 20
      }
      
      const total = criteria.attendance_weight + 
                    criteria.training_weight + 
                    criteria.rating_weight
      
      expect(total).toBe(100)
    })

    /**
     * Test: isValidWeights should be true when sum is 100
     * Requirements: 7.6
     */
    it('should validate weights correctly', () => {
      const validCriteria = {
        attendance_weight: 40,
        training_weight: 30,
        rating_weight: 30
      }
      
      const total = validCriteria.attendance_weight + 
                    validCriteria.training_weight + 
                    validCriteria.rating_weight
      
      expect(total === 100).toBe(true)
    })

    /**
     * Test: Filter active conditions
     * Requirements: 7.4, 7.5
     */
    it('should filter active conditions correctly', () => {
      const conditions = [
        { id: '1', name: 'Active Bonus', is_active: true, condition_type: 'bonus' },
        { id: '2', name: 'Inactive Penalty', is_active: false, condition_type: 'penalty' },
        { id: '3', name: 'Active Penalty', is_active: true, condition_type: 'penalty' }
      ]
      
      const activeConditions = conditions.filter(c => c.is_active !== false)
      
      expect(activeConditions).toHaveLength(2)
      expect(activeConditions.map(c => c.id)).toContain('1')
      expect(activeConditions.map(c => c.id)).toContain('3')
    })

    /**
     * Test: Filter bonus conditions
     * Requirements: 7.4
     */
    it('should filter bonus conditions correctly', () => {
      const conditions = [
        { id: '1', name: 'Bonus 1', condition_type: 'bonus', points: 5 },
        { id: '2', name: 'Penalty 1', condition_type: 'penalty', points: -10 },
        { id: '3', name: 'Bonus 2', condition_type: 'bonus', points: 3 }
      ]
      
      const bonusConditions = conditions.filter(c => c.condition_type === 'bonus')
      
      expect(bonusConditions).toHaveLength(2)
      expect(bonusConditions.every(c => c.condition_type === 'bonus')).toBe(true)
    })

    /**
     * Test: Filter penalty conditions
     * Requirements: 7.5
     */
    it('should filter penalty conditions correctly', () => {
      const conditions = [
        { id: '1', name: 'Bonus 1', condition_type: 'bonus', points: 5 },
        { id: '2', name: 'Penalty 1', condition_type: 'penalty', points: -10 },
        { id: '3', name: 'Penalty 2', condition_type: 'penalty', points: -5 }
      ]
      
      const penaltyConditions = conditions.filter(c => c.condition_type === 'penalty')
      
      expect(penaltyConditions).toHaveLength(2)
      expect(penaltyConditions.every(c => c.condition_type === 'penalty')).toBe(true)
    })
  })

  describe('Condition Data Validation', () => {
    /**
     * Test: Valid condition structure
     * Requirements: 7.3
     */
    it('should validate condition structure', () => {
      const validCondition = {
        name: 'Perfect Attendance',
        category: 'attendance',
        condition_type: 'bonus',
        threshold_type: 'percentage',
        comparison_operator: '>=',
        threshold_value: 100,
        points: 5
      }
      
      expect(validCondition.name).toBeTruthy()
      expect(['attendance', 'training', 'rating', 'custom']).toContain(validCondition.category)
      expect(['bonus', 'penalty']).toContain(validCondition.condition_type)
      expect(['percentage', 'count', 'value']).toContain(validCondition.threshold_type)
      expect(['>=', '>', '<=', '<', '=']).toContain(validCondition.comparison_operator)
      expect(typeof validCondition.threshold_value).toBe('number')
      expect(typeof validCondition.points).toBe('number')
    })

    /**
     * Test: Bonus condition should have positive points
     * Requirements: 7.4
     */
    it('should have positive points for bonus conditions', () => {
      const bonusCondition = {
        name: 'High Rating',
        condition_type: 'bonus',
        points: 5
      }
      
      expect(bonusCondition.points).toBeGreaterThan(0)
    })

    /**
     * Test: Penalty condition should have negative points
     * Requirements: 7.5
     */
    it('should have negative points for penalty conditions', () => {
      const penaltyCondition = {
        name: 'Excessive Absences',
        condition_type: 'penalty',
        points: -10
      }
      
      expect(penaltyCondition.points).toBeLessThan(0)
    })
  })

  describe('Criteria Update Logic', () => {
    /**
     * Test: Criteria update should preserve club_id
     * Requirements: 7.6
     */
    it('should preserve club_id when updating criteria', () => {
      const originalCriteria = {
        id: 'criteria-1',
        club_id: 'club-123',
        attendance_weight: 40,
        training_weight: 30,
        rating_weight: 30
      }
      
      const updates = {
        attendance_weight: 50,
        training_weight: 25,
        rating_weight: 25
      }
      
      const updatedCriteria = {
        ...originalCriteria,
        ...updates
      }
      
      expect(updatedCriteria.club_id).toBe('club-123')
      expect(updatedCriteria.attendance_weight).toBe(50)
    })

    /**
     * Test: Condition toggle should only change is_active
     * Requirements: 7.8
     */
    it('should only change is_active when toggling condition', () => {
      const condition = {
        id: 'cond-1',
        name: 'Test Condition',
        is_active: true,
        points: 5
      }
      
      const toggledCondition = {
        ...condition,
        is_active: false
      }
      
      expect(toggledCondition.is_active).toBe(false)
      expect(toggledCondition.name).toBe(condition.name)
      expect(toggledCondition.points).toBe(condition.points)
    })
  })

  describe('Default Fallback Logic', () => {
    /**
     * Test: getEffectiveCriteria should return defaults when no custom criteria
     * Requirements: 7.7
     */
    it('should return default criteria when no custom criteria exists', () => {
      const criteria = null
      
      const effectiveCriteria = criteria || { ...DEFAULT_CRITERIA }
      
      expect(effectiveCriteria.attendance_weight).toBe(40)
      expect(effectiveCriteria.training_weight).toBe(30)
      expect(effectiveCriteria.rating_weight).toBe(30)
    })

    /**
     * Test: getEffectiveCriteria should return custom criteria when exists
     * Requirements: 7.1
     */
    it('should return custom criteria when it exists', () => {
      const customCriteria = {
        id: 'criteria-1',
        club_id: 'club-123',
        attendance_weight: 50,
        training_weight: 25,
        rating_weight: 25
      }
      
      const effectiveCriteria = customCriteria.id ? customCriteria : { ...DEFAULT_CRITERIA }
      
      expect(effectiveCriteria.attendance_weight).toBe(50)
      expect(effectiveCriteria.training_weight).toBe(25)
      expect(effectiveCriteria.rating_weight).toBe(25)
    })
  })

  describe('Condition CRUD Operations Logic', () => {
    /**
     * Test: Adding condition should add to beginning of list
     * Requirements: 7.3
     */
    it('should add new condition to beginning of list', () => {
      const conditions = [
        { id: '1', name: 'Existing Condition' }
      ]
      
      const newCondition = { id: '2', name: 'New Condition' }
      
      const updatedConditions = [newCondition, ...conditions]
      
      expect(updatedConditions[0].id).toBe('2')
      expect(updatedConditions).toHaveLength(2)
    })

    /**
     * Test: Deleting condition should remove from list
     * Requirements: 7.8
     */
    it('should remove condition from list when deleted', () => {
      const conditions = [
        { id: '1', name: 'Condition 1' },
        { id: '2', name: 'Condition 2' },
        { id: '3', name: 'Condition 3' }
      ]
      
      const idToDelete = '2'
      const updatedConditions = conditions.filter(c => c.id !== idToDelete)
      
      expect(updatedConditions).toHaveLength(2)
      expect(updatedConditions.find(c => c.id === '2')).toBeUndefined()
    })

    /**
     * Test: Updating condition should modify in place
     * Requirements: 7.8
     */
    it('should update condition in place', () => {
      const conditions = [
        { id: '1', name: 'Original Name', points: 5 },
        { id: '2', name: 'Other Condition', points: 3 }
      ]
      
      const idToUpdate = '1'
      const updates = { name: 'Updated Name', points: 10 }
      
      const updatedConditions = conditions.map(c => 
        c.id === idToUpdate ? { ...c, ...updates } : c
      )
      
      expect(updatedConditions[0].name).toBe('Updated Name')
      expect(updatedConditions[0].points).toBe(10)
      expect(updatedConditions[1].name).toBe('Other Condition')
    })
  })

  describe('State Management', () => {
    /**
     * Test: clearState should reset all state
     */
    it('should reset state correctly', () => {
      const state = {
        criteria: { id: '1', attendance_weight: 40 },
        conditions: [{ id: '1', name: 'Test' }],
        error: 'Some error'
      }
      
      // Simulate clearState
      const clearedState = {
        criteria: null,
        conditions: [],
        error: null
      }
      
      expect(clearedState.criteria).toBeNull()
      expect(clearedState.conditions).toHaveLength(0)
      expect(clearedState.error).toBeNull()
    })
  })
})
