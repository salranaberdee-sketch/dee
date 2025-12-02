/**
 * Score Bounded Range Property-Based Tests
 * 
 * **Feature: athlete-evaluation, Property 2: Score Bounded Range**
 * **Validates: Requirements 4.4**
 * 
 * For any athlete stats and scoring criteria, the calculated overall_score
 * must be between 0 and 100 inclusive.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateScore, DEFAULT_CRITERIA } from '../lib/scoreCalculator.js'

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
 * Arbitrary for generating extreme athlete stats (edge cases)
 */
const extremeAthleteStatsArbitrary = fc.oneof(
  // All zeros
  fc.constant({
    attendance_rate: 0,
    training_sessions: 0,
    average_rating: 0,
    absent_count: 0,
    leave_count: 0,
    attended_on_time: 0,
    attended_late: 0,
    total_sessions: 0,
    training_hours: 0
  }),
  // All maximum values
  fc.constant({
    attendance_rate: 100,
    training_sessions: 100,
    average_rating: 5,
    absent_count: 0,
    leave_count: 0,
    attended_on_time: 100,
    attended_late: 0,
    total_sessions: 100,
    training_hours: 500
  }),
  // Random extreme values
  fc.record({
    attendance_rate: fc.oneof(fc.constant(0), fc.constant(100)),
    training_sessions: fc.oneof(fc.constant(0), fc.integer({ min: 50, max: 100 })),
    average_rating: fc.oneof(fc.constant(0), fc.constant(5)),
    absent_count: fc.integer({ min: 0, max: 100 }),
    leave_count: fc.integer({ min: 0, max: 100 }),
    attended_on_time: fc.integer({ min: 0, max: 100 }),
    attended_late: fc.integer({ min: 0, max: 100 }),
    total_sessions: fc.integer({ min: 0, max: 200 }),
    training_hours: fc.float({ min: 0, max: 1000, noNaN: true })
  })
)

/**
 * Arbitrary for generating bonus conditions
 */
const bonusConditionArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.constantFrom('attendance', 'training', 'rating'),
  condition_type: fc.constant('bonus'),
  threshold_type: fc.constantFrom('percentage', 'count', 'value'),
  comparison_operator: fc.constantFrom('>=', '>', '<=', '<', '='),
  threshold_value: fc.float({ min: 0, max: 100, noNaN: true }),
  points: fc.integer({ min: 1, max: 50 }), // Positive points for bonus
  is_active: fc.boolean()
})

/**
 * Arbitrary for generating penalty conditions
 */
const penaltyConditionArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.constantFrom('attendance', 'training', 'rating'),
  condition_type: fc.constant('penalty'),
  threshold_type: fc.constantFrom('percentage', 'count', 'value'),
  comparison_operator: fc.constantFrom('>=', '>', '<=', '<', '='),
  threshold_value: fc.float({ min: 0, max: 100, noNaN: true }),
  points: fc.integer({ min: -50, max: -1 }), // Negative points for penalty
  is_active: fc.boolean()
})

/**
 * Arbitrary for generating mixed conditions (bonus and penalty)
 */
const mixedConditionsArbitrary = fc.array(
  fc.oneof(bonusConditionArbitrary, penaltyConditionArbitrary),
  { minLength: 0, maxLength: 10 }
)

/**
 * Arbitrary for generating extreme conditions that could push score out of bounds
 */
const extremeConditionsArbitrary = fc.array(
  fc.oneof(
    // Large bonus
    fc.record({
      id: fc.uuid(),
      name: fc.constant('Large Bonus'),
      category: fc.constantFrom('attendance', 'training', 'rating'),
      condition_type: fc.constant('bonus'),
      threshold_type: fc.constant('percentage'),
      comparison_operator: fc.constant('>='),
      threshold_value: fc.constant(0), // Always met
      points: fc.integer({ min: 50, max: 200 }),
      is_active: fc.constant(true)
    }),
    // Large penalty
    fc.record({
      id: fc.uuid(),
      name: fc.constant('Large Penalty'),
      category: fc.constantFrom('attendance', 'training', 'rating'),
      condition_type: fc.constant('penalty'),
      threshold_type: fc.constant('percentage'),
      comparison_operator: fc.constant('>='),
      threshold_value: fc.constant(0), // Always met
      points: fc.integer({ min: -200, max: -50 }),
      is_active: fc.constant(true)
    })
  ),
  { minLength: 1, maxLength: 5 }
)

// ============================================================================
// Property Tests
// ============================================================================

describe('Score Bounded Range Property Tests', () => {

  /**
   * **Feature: athlete-evaluation, Property 2: Score Bounded Range**
   * **Validates: Requirements 4.4**
   */
  describe('Property 2: Score Bounded Range', () => {

    it('overall_score should always be between 0 and 100 for any valid athlete stats and criteria', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          (stats, criteria) => {
            const result = calculateScore(stats, criteria, [])
            
            // Property: overall_score must be in [0, 100]
            expect(result.overall_score).toBeGreaterThanOrEqual(0)
            expect(result.overall_score).toBeLessThanOrEqual(100)
            
            return result.overall_score >= 0 && result.overall_score <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('overall_score should be bounded even with bonus conditions', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          fc.array(bonusConditionArbitrary, { minLength: 1, maxLength: 10 }),
          (stats, criteria, conditions) => {
            const result = calculateScore(stats, criteria, conditions)
            
            // Even with many bonuses, score should not exceed 100
            expect(result.overall_score).toBeGreaterThanOrEqual(0)
            expect(result.overall_score).toBeLessThanOrEqual(100)
            
            return result.overall_score >= 0 && result.overall_score <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('overall_score should be bounded even with penalty conditions', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          fc.array(penaltyConditionArbitrary, { minLength: 1, maxLength: 10 }),
          (stats, criteria, conditions) => {
            const result = calculateScore(stats, criteria, conditions)
            
            // Even with many penalties, score should not go below 0
            expect(result.overall_score).toBeGreaterThanOrEqual(0)
            expect(result.overall_score).toBeLessThanOrEqual(100)
            
            return result.overall_score >= 0 && result.overall_score <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('overall_score should be bounded with mixed bonus and penalty conditions', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          mixedConditionsArbitrary,
          (stats, criteria, conditions) => {
            const result = calculateScore(stats, criteria, conditions)
            
            // Score should always be bounded regardless of condition mix
            expect(result.overall_score).toBeGreaterThanOrEqual(0)
            expect(result.overall_score).toBeLessThanOrEqual(100)
            
            return result.overall_score >= 0 && result.overall_score <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('overall_score should be bounded with extreme athlete stats', () => {
      fc.assert(
        fc.property(
          extremeAthleteStatsArbitrary,
          validCriteriaArbitrary,
          mixedConditionsArbitrary,
          (stats, criteria, conditions) => {
            const result = calculateScore(stats, criteria, conditions)
            
            // Even with extreme stats, score should be bounded
            expect(result.overall_score).toBeGreaterThanOrEqual(0)
            expect(result.overall_score).toBeLessThanOrEqual(100)
            
            return result.overall_score >= 0 && result.overall_score <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('overall_score should be bounded with extreme conditions', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          extremeConditionsArbitrary,
          (stats, criteria, conditions) => {
            const result = calculateScore(stats, criteria, conditions)
            
            // Even with extreme conditions, score should be capped
            expect(result.overall_score).toBeGreaterThanOrEqual(0)
            expect(result.overall_score).toBeLessThanOrEqual(100)
            
            return result.overall_score >= 0 && result.overall_score <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('overall_score should be bounded when using default criteria', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          mixedConditionsArbitrary,
          (stats, conditions) => {
            // Use null criteria to trigger default
            const result = calculateScore(stats, null, conditions)
            
            expect(result.overall_score).toBeGreaterThanOrEqual(0)
            expect(result.overall_score).toBeLessThanOrEqual(100)
            
            // Verify default criteria was used
            expect(result.criteria_used.attendance_weight).toBe(DEFAULT_CRITERIA.attendance_weight)
            expect(result.criteria_used.training_weight).toBe(DEFAULT_CRITERIA.training_weight)
            expect(result.criteria_used.rating_weight).toBe(DEFAULT_CRITERIA.rating_weight)
            
            return result.overall_score >= 0 && result.overall_score <= 100
          }
        ),
        { numRuns: 100 }
      )
    })

    it('overall_score should be 0 when all stats are 0 and no bonus conditions', () => {
      const zeroStats = {
        attendance_rate: 0,
        training_sessions: 0,
        average_rating: 0,
        absent_count: 0,
        leave_count: 0,
        attended_on_time: 0,
        attended_late: 0,
        total_sessions: 0,
        training_hours: 0
      }
      
      const result = calculateScore(zeroStats, DEFAULT_CRITERIA, [])
      
      expect(result.overall_score).toBe(0)
      expect(result.attendance_score).toBe(0)
      expect(result.training_score).toBe(0)
      expect(result.rating_score).toBe(0)
    })

    it('overall_score should be 100 when all stats are maximum and no penalty conditions', () => {
      const maxStats = {
        attendance_rate: 100,
        training_sessions: DEFAULT_CRITERIA.target_training_sessions,
        average_rating: 5,
        absent_count: 0,
        leave_count: 0,
        attended_on_time: 100,
        attended_late: 0,
        total_sessions: 100,
        training_hours: 100
      }
      
      const result = calculateScore(maxStats, DEFAULT_CRITERIA, [])
      
      expect(result.overall_score).toBe(100)
    })

    it('overall_score should be capped at 100 even with excessive bonuses', () => {
      const maxStats = {
        attendance_rate: 100,
        training_sessions: DEFAULT_CRITERIA.target_training_sessions,
        average_rating: 5
      }
      
      // Create conditions that would add 500 bonus points
      const excessiveBonuses = [
        {
          id: '1',
          name: 'Bonus 1',
          category: 'attendance',
          condition_type: 'bonus',
          threshold_type: 'percentage',
          comparison_operator: '>=',
          threshold_value: 0,
          points: 100,
          is_active: true
        },
        {
          id: '2',
          name: 'Bonus 2',
          category: 'training',
          condition_type: 'bonus',
          threshold_type: 'count',
          comparison_operator: '>=',
          threshold_value: 0,
          points: 200,
          is_active: true
        },
        {
          id: '3',
          name: 'Bonus 3',
          category: 'rating',
          condition_type: 'bonus',
          threshold_type: 'value',
          comparison_operator: '>=',
          threshold_value: 0,
          points: 200,
          is_active: true
        }
      ]
      
      const result = calculateScore(maxStats, DEFAULT_CRITERIA, excessiveBonuses)
      
      // Score should be capped at 100
      expect(result.overall_score).toBe(100)
      expect(result.bonus_points).toBeGreaterThan(0)
    })

    it('overall_score should be capped at 0 even with excessive penalties', () => {
      const lowStats = {
        attendance_rate: 10,
        training_sessions: 1,
        average_rating: 1
      }
      
      // Create conditions that would subtract 500 penalty points
      const excessivePenalties = [
        {
          id: '1',
          name: 'Penalty 1',
          category: 'attendance',
          condition_type: 'penalty',
          threshold_type: 'percentage',
          comparison_operator: '<=',
          threshold_value: 100,
          points: -100,
          is_active: true
        },
        {
          id: '2',
          name: 'Penalty 2',
          category: 'training',
          condition_type: 'penalty',
          threshold_type: 'count',
          comparison_operator: '<=',
          threshold_value: 100,
          points: -200,
          is_active: true
        },
        {
          id: '3',
          name: 'Penalty 3',
          category: 'rating',
          condition_type: 'penalty',
          threshold_type: 'value',
          comparison_operator: '<=',
          threshold_value: 5,
          points: -200,
          is_active: true
        }
      ]
      
      const result = calculateScore(lowStats, DEFAULT_CRITERIA, excessivePenalties)
      
      // Score should be capped at 0
      expect(result.overall_score).toBe(0)
      expect(result.penalty_points).toBeLessThan(0)
    })

    it('base_score components should sum correctly before conditions', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          (stats, criteria) => {
            const result = calculateScore(stats, criteria, [])
            
            // Base score should equal sum of components (with tolerance for floating-point rounding)
            // The calculateScore function rounds each component to 2 decimal places,
            // so we use precision 1 (0.05 tolerance) to account for cumulative rounding
            const expectedBaseScore = result.attendance_score + result.training_score + result.rating_score
            expect(result.base_score).toBeCloseTo(expectedBaseScore, 1)
            
            // Without conditions, overall should equal base (capped)
            expect(result.overall_score).toBeCloseTo(Math.min(100, Math.max(0, result.base_score)), 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
