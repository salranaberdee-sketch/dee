/**
 * Condition Points Application Property-Based Tests
 * 
 * **Feature: athlete-evaluation, Property 5: Condition Points Application**
 * **Validates: Requirements 7.4, 7.5, 8.1, 8.2, 8.3, 8.4**
 * 
 * For any scoring condition and athlete stats:
 * - If condition_type is 'bonus' and condition is met, points are added
 * - If condition_type is 'penalty' and condition is met, points are subtracted
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  calculateScore, 
  evaluateCondition, 
  compare, 
  DEFAULT_CRITERIA 
} from '../lib/scoreCalculator.js'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * Arbitrary for generating valid scoring criteria where weights sum to 100
 */
const validCriteriaArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 100 }),
  fc.integer({ min: 0, max: 100 })
).filter(([a, b]) => a + b <= 100)
  .map(([attendance, training]) => ({
    attendance_weight: attendance,
    training_weight: training,
    rating_weight: 100 - attendance - training,
    target_training_sessions: fc.sample(fc.integer({ min: 1, max: 30 }), 1)[0]
  }))

/**
 * Arbitrary for generating athlete stats with valid ranges
 */
const athleteStatsArbitrary = fc.record({
  attendance_rate: fc.float({ min: 0, max: 100, noNaN: true }),
  training_sessions: fc.integer({ min: 0, max: 100 }),
  average_rating: fc.float({ min: 0, max: 5, noNaN: true }),
  absent_count: fc.integer({ min: 0, max: 50 }),
  leave_count: fc.integer({ min: 0, max: 50 }),
  attended_on_time: fc.integer({ min: 0, max: 100 }),
  attended_late: fc.integer({ min: 0, max: 50 }),
  total_sessions: fc.integer({ min: 0, max: 200 }),
  training_hours: fc.float({ min: 0, max: 500, noNaN: true })
})

/**
 * Arbitrary for comparison operators
 */
const comparisonOperatorArbitrary = fc.constantFrom('>=', '>', '<=', '<', '=')

/**
 * Generate valid category/threshold_type combinations based on evaluateCondition implementation
 */
const validCategoryThresholdArbitrary = fc.oneof(
  fc.constant({ category: 'attendance', threshold_type: 'percentage' }),
  fc.constant({ category: 'attendance', threshold_type: 'count' }),
  fc.constant({ category: 'training', threshold_type: 'count' }),
  fc.constant({ category: 'training', threshold_type: 'value' }),
  fc.constant({ category: 'rating', threshold_type: 'value' })
)

/**
 * Arbitrary for generating bonus conditions with valid category/threshold combinations
 */
const bonusConditionArbitrary = validCategoryThresholdArbitrary.chain(({ category, threshold_type }) => 
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    category: fc.constant(category),
    condition_type: fc.constant('bonus'),
    threshold_type: fc.constant(threshold_type),
    comparison_operator: comparisonOperatorArbitrary,
    threshold_value: fc.float({ min: 0, max: 100, noNaN: true }),
    points: fc.integer({ min: 1, max: 50 }),
    is_active: fc.constant(true)
  })
)

/**
 * Arbitrary for generating penalty conditions with valid category/threshold combinations
 */
const penaltyConditionArbitrary = validCategoryThresholdArbitrary.chain(({ category, threshold_type }) => 
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    category: fc.constant(category),
    condition_type: fc.constant('penalty'),
    threshold_type: fc.constant(threshold_type),
    comparison_operator: comparisonOperatorArbitrary,
    threshold_value: fc.float({ min: 0, max: 100, noNaN: true }),
    points: fc.integer({ min: -50, max: -1 }),
    is_active: fc.constant(true)
  })
)

/**
 * Arbitrary for generating attendance-specific bonus conditions (Requirement 8.1)
 */
const attendanceBonusConditionArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.constant('Perfect Attendance Bonus'),
  category: fc.constant('attendance'),
  condition_type: fc.constant('bonus'),
  threshold_type: fc.constant('percentage'),
  comparison_operator: fc.constantFrom('>=', '='),
  threshold_value: fc.float({ min: 90, max: 100, noNaN: true }),
  points: fc.integer({ min: 1, max: 20 }),
  is_active: fc.constant(true)
})

/**
 * Arbitrary for generating attendance-specific penalty conditions (Requirement 8.2)
 */
const attendancePenaltyConditionArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.constant('Excessive Absences Penalty'),
  category: fc.constant('attendance'),
  condition_type: fc.constant('penalty'),
  threshold_type: fc.constant('count'),
  comparison_operator: fc.constantFrom('>', '>='),
  threshold_value: fc.integer({ min: 1, max: 10 }),
  points: fc.integer({ min: -20, max: -1 }),
  is_active: fc.constant(true)
})

/**
 * Arbitrary for generating training-specific bonus conditions (Requirement 8.3)
 */
const trainingBonusConditionArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.constant('Training Consistency Bonus'),
  category: fc.constant('training'),
  condition_type: fc.constant('bonus'),
  threshold_type: fc.constant('count'),
  comparison_operator: fc.constantFrom('>=', '>'),
  threshold_value: fc.integer({ min: 1, max: 20 }),
  points: fc.integer({ min: 1, max: 15 }),
  is_active: fc.constant(true)
})

/**
 * Arbitrary for generating rating-specific bonus conditions (Requirement 8.4)
 */
const ratingBonusConditionArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.constant('High Rating Bonus'),
  category: fc.constant('rating'),
  condition_type: fc.constant('bonus'),
  threshold_type: fc.constant('value'),
  comparison_operator: fc.constantFrom('>=', '>'),
  threshold_value: fc.float({ min: 3.5, max: 5, noNaN: true }),
  points: fc.integer({ min: 1, max: 15 }),
  is_active: fc.constant(true)
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine the actual value from athlete stats based on condition category and threshold type
 */
function getActualValue(condition, athleteStats) {
  switch (condition.category) {
    case 'attendance':
      if (condition.threshold_type === 'percentage') {
        return athleteStats.attendance_rate ?? 0
      } else if (condition.threshold_type === 'count') {
        return athleteStats.absent_count ?? 0
      }
      break
    case 'training':
      if (condition.threshold_type === 'count') {
        return athleteStats.training_sessions ?? 0
      } else if (condition.threshold_type === 'value') {
        return athleteStats.training_hours ?? 0
      }
      break
    case 'rating':
      return athleteStats.average_rating ?? 0
    default:
      return 0
  }
  return 0
}

/**
 * Manually evaluate if a condition is met
 */
function isConditionMet(condition, athleteStats) {
  const actualValue = getActualValue(condition, athleteStats)
  return compare(actualValue, condition.comparison_operator, condition.threshold_value)
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Condition Points Application Property Tests', () => {

  /**
   * **Feature: athlete-evaluation, Property 5: Condition Points Application**
   * **Validates: Requirements 7.4, 7.5, 8.1, 8.2, 8.3, 8.4**
   */
  describe('Property 5: Condition Points Application', () => {

    /**
     * Requirement 7.4: When condition_type is 'bonus' and condition is met, points are added
     */
    it('bonus points should be added when bonus condition is met', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          bonusConditionArbitrary,
          (stats, condition) => {
            const result = evaluateCondition(condition, stats)
            const conditionMet = isConditionMet(condition, stats)
            
            if (conditionMet) {
              expect(result.condition_met).toBe(true)
              expect(result.points_applied).toBe(condition.points)
              expect(result.points_applied).toBeGreaterThan(0)
            } else {
              expect(result.condition_met).toBe(false)
              expect(result.points_applied).toBe(0)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Requirement 7.5: When condition_type is 'penalty' and condition is met, points are subtracted
     */
    it('penalty points should be subtracted when penalty condition is met', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          penaltyConditionArbitrary,
          (stats, condition) => {
            const result = evaluateCondition(condition, stats)
            const conditionMet = isConditionMet(condition, stats)
            
            if (conditionMet) {
              expect(result.condition_met).toBe(true)
              expect(result.points_applied).toBe(condition.points)
              expect(result.points_applied).toBeLessThan(0)
            } else {
              expect(result.condition_met).toBe(false)
              expect(result.points_applied).toBe(0)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Requirement 8.1: Perfect attendance bonus
     */
    it('perfect attendance bonus should add points when attendance rate meets threshold', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          attendanceBonusConditionArbitrary,
          (attendanceRate, condition) => {
            const stats = { attendance_rate: attendanceRate, training_sessions: 10, average_rating: 3, absent_count: 0 }
            const result = evaluateCondition(condition, stats)
            const shouldMeet = compare(attendanceRate, condition.comparison_operator, condition.threshold_value)
            
            expect(result.condition_met).toBe(shouldMeet)
            if (shouldMeet) {
              expect(result.points_applied).toBe(condition.points)
            } else {
              expect(result.points_applied).toBe(0)
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Requirement 8.2: Excessive absences penalty
     */
    it('excessive absences penalty should subtract points when absent count exceeds threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          attendancePenaltyConditionArbitrary,
          (absentCount, condition) => {
            const stats = { attendance_rate: 80, training_sessions: 10, average_rating: 3, absent_count: absentCount }
            const result = evaluateCondition(condition, stats)
            const shouldMeet = compare(absentCount, condition.comparison_operator, condition.threshold_value)
            
            expect(result.condition_met).toBe(shouldMeet)
            if (shouldMeet) {
              expect(result.points_applied).toBe(condition.points)
              expect(result.points_applied).toBeLessThan(0)
            } else {
              expect(result.points_applied).toBe(0)
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Requirement 8.3: Training consistency bonus
     */
    it('training consistency bonus should add points when training sessions meet threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 30 }),
          trainingBonusConditionArbitrary,
          (trainingSessions, condition) => {
            const stats = { attendance_rate: 80, training_sessions: trainingSessions, average_rating: 3, absent_count: 0 }
            const result = evaluateCondition(condition, stats)
            const shouldMeet = compare(trainingSessions, condition.comparison_operator, condition.threshold_value)
            
            expect(result.condition_met).toBe(shouldMeet)
            if (shouldMeet) {
              expect(result.points_applied).toBe(condition.points)
            } else {
              expect(result.points_applied).toBe(0)
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Requirement 8.4: High rating bonus
     */
    it('high rating bonus should add points when average rating meets threshold', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 5, noNaN: true }),
          ratingBonusConditionArbitrary,
          (avgRating, condition) => {
            const stats = { attendance_rate: 80, training_sessions: 10, average_rating: avgRating, absent_count: 0 }
            const result = evaluateCondition(condition, stats)
            const shouldMeet = compare(avgRating, condition.comparison_operator, condition.threshold_value)
            
            expect(result.condition_met).toBe(shouldMeet)
            if (shouldMeet) {
              expect(result.points_applied).toBe(condition.points)
            } else {
              expect(result.points_applied).toBe(0)
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Bonus points should increase overall score when condition is met
     */
    it('bonus points should increase overall score when condition is met', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          bonusConditionArbitrary,
          (stats, criteria, condition) => {
            const resultWithout = calculateScore(stats, criteria, [])
            const resultWith = calculateScore(stats, criteria, [condition])
            const conditionMet = isConditionMet(condition, stats)
            
            if (conditionMet) {
              const expectedScore = Math.min(100, resultWithout.overall_score + condition.points)
              expect(resultWith.overall_score).toBeCloseTo(expectedScore, 1)
              expect(resultWith.bonus_points).toBe(condition.points)
            } else {
              expect(resultWith.overall_score).toBeCloseTo(resultWithout.overall_score, 1)
              expect(resultWith.bonus_points).toBe(0)
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Penalty points should decrease overall score when condition is met
     */
    it('penalty points should decrease overall score when condition is met', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          penaltyConditionArbitrary,
          (stats, criteria, condition) => {
            const resultWithout = calculateScore(stats, criteria, [])
            const resultWith = calculateScore(stats, criteria, [condition])
            const conditionMet = isConditionMet(condition, stats)
            
            if (conditionMet) {
              const expectedScore = Math.max(0, resultWithout.overall_score + condition.points)
              expect(resultWith.overall_score).toBeCloseTo(expectedScore, 1)
              expect(resultWith.penalty_points).toBe(condition.points)
            } else {
              expect(resultWith.overall_score).toBeCloseTo(resultWithout.overall_score, 1)
              expect(resultWith.penalty_points).toBe(0)
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Multiple bonus conditions should accumulate points
     */
    it('multiple bonus conditions should accumulate points when met', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          fc.array(bonusConditionArbitrary, { minLength: 2, maxLength: 5 }),
          (stats, criteria, conditions) => {
            const result = calculateScore(stats, criteria, conditions)
            
            let expectedBonus = 0
            for (const condition of conditions) {
              if (isConditionMet(condition, stats)) {
                expectedBonus += condition.points
              }
            }
            
            expect(result.bonus_points).toBe(expectedBonus)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Multiple penalty conditions should accumulate points
     */
    it('multiple penalty conditions should accumulate points when met', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          fc.array(penaltyConditionArbitrary, { minLength: 2, maxLength: 5 }),
          (stats, criteria, conditions) => {
            const result = calculateScore(stats, criteria, conditions)
            
            let expectedPenalty = 0
            for (const condition of conditions) {
              if (isConditionMet(condition, stats)) {
                expectedPenalty += condition.points
              }
            }
            
            expect(result.penalty_points).toBe(expectedPenalty)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Inactive conditions should not apply points
     */
    it('inactive conditions should not apply points', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          fc.oneof(bonusConditionArbitrary, penaltyConditionArbitrary),
          (stats, criteria, condition) => {
            const inactiveCondition = { ...condition, is_active: false }
            const result = calculateScore(stats, criteria, [inactiveCondition])
            
            expect(result.bonus_points).toBe(0)
            expect(result.penalty_points).toBe(0)
            
            const appliedCondition = result.applied_conditions.find(c => c.condition_id === inactiveCondition.id)
            expect(appliedCondition).toBeUndefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Applied conditions should be tracked correctly
     */
    it('applied conditions should be tracked with correct details', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          fc.oneof(bonusConditionArbitrary, penaltyConditionArbitrary),
          (stats, criteria, condition) => {
            const result = calculateScore(stats, criteria, [condition])
            
            expect(result.applied_conditions).toHaveLength(1)
            
            const applied = result.applied_conditions[0]
            expect(applied.condition_id).toBe(condition.id)
            expect(applied.condition_name).toBe(condition.name)
            expect(applied.category).toBe(condition.category)
            expect(applied.condition_type).toBe(condition.condition_type)
            expect(applied.threshold_value).toBe(condition.threshold_value)
            expect(applied.comparison_operator).toBe(condition.comparison_operator)
            
            const expectedActualValue = getActualValue(condition, stats)
            expect(applied.actual_value).toBeCloseTo(expectedActualValue, 5)
            
            const shouldMeet = isConditionMet(condition, stats)
            expect(applied.condition_met).toBe(shouldMeet)
            
            if (shouldMeet) {
              expect(applied.points_applied).toBe(condition.points)
            } else {
              expect(applied.points_applied).toBe(0)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Mixed bonus and penalty conditions should be applied correctly
     */
    it('mixed bonus and penalty conditions should be applied correctly', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          bonusConditionArbitrary,
          penaltyConditionArbitrary,
          (stats, criteria, bonusCondition, penaltyCondition) => {
            const conditions = [bonusCondition, penaltyCondition]
            const result = calculateScore(stats, criteria, conditions)
            
            const bonusMet = isConditionMet(bonusCondition, stats)
            const penaltyMet = isConditionMet(penaltyCondition, stats)
            
            if (bonusMet) {
              expect(result.bonus_points).toBe(bonusCondition.points)
            } else {
              expect(result.bonus_points).toBe(0)
            }
            
            if (penaltyMet) {
              expect(result.penalty_points).toBe(penaltyCondition.points)
            } else {
              expect(result.penalty_points).toBe(0)
            }
            
            const baseScore = result.base_score
            const expectedScore = Math.max(0, Math.min(100, baseScore + result.bonus_points + result.penalty_points))
            expect(result.overall_score).toBeCloseTo(expectedScore, 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Condition evaluation should be deterministic
     */
    it('same condition and stats should always produce same result', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          fc.oneof(bonusConditionArbitrary, penaltyConditionArbitrary),
          (stats, condition) => {
            const result1 = evaluateCondition(condition, stats)
            const result2 = evaluateCondition(condition, stats)
            const result3 = evaluateCondition(condition, stats)
            
            expect(result1.condition_met).toBe(result2.condition_met)
            expect(result2.condition_met).toBe(result3.condition_met)
            expect(result1.points_applied).toBe(result2.points_applied)
            expect(result2.points_applied).toBe(result3.points_applied)
            expect(result1.actual_value).toBe(result2.actual_value)
            expect(result2.actual_value).toBe(result3.actual_value)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Null or undefined condition should return safe defaults
     */
    it('null or undefined condition should return safe defaults', () => {
      const stats = { attendance_rate: 80, training_sessions: 10, average_rating: 3 }
      
      const nullResult = evaluateCondition(null, stats)
      expect(nullResult.condition_met).toBe(false)
      expect(nullResult.points_applied).toBe(0)
      expect(nullResult.actual_value).toBeNull()
      
      const undefinedResult = evaluateCondition(undefined, stats)
      expect(undefinedResult.condition_met).toBe(false)
      expect(undefinedResult.points_applied).toBe(0)
      expect(undefinedResult.actual_value).toBeNull()
    })

    /**
     * Property: Null or undefined stats should return safe defaults
     */
    it('null or undefined stats should return safe defaults', () => {
      const condition = {
        id: '1',
        name: 'Test',
        category: 'attendance',
        condition_type: 'bonus',
        threshold_type: 'percentage',
        comparison_operator: '>=',
        threshold_value: 80,
        points: 5,
        is_active: true
      }
      
      const nullResult = evaluateCondition(condition, null)
      expect(nullResult.condition_met).toBe(false)
      expect(nullResult.points_applied).toBe(0)
      expect(nullResult.actual_value).toBeNull()
      
      const undefinedResult = evaluateCondition(condition, undefined)
      expect(undefinedResult.condition_met).toBe(false)
      expect(undefinedResult.points_applied).toBe(0)
      expect(undefinedResult.actual_value).toBeNull()
    })
  })
})
