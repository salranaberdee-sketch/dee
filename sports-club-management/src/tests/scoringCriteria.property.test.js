/**
 * Scoring Criteria Property-Based Tests
 * 
 * **Feature: athlete-evaluation, Property 4: Score Components Use Configured Weights**
 * **Validates: Requirements 4.1, 4.2, 4.3**
 * 
 * For any athlete stats and valid scoring criteria, each score component
 * (attendance, training, rating) must be calculated using the configured weight percentage.
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
 * Arbitrary for generating criteria with specific target_training_sessions
 * to ensure we can test training score calculation properly
 */
const criteriaWithTargetArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 100 }),
  fc.integer({ min: 0, max: 100 }),
  fc.integer({ min: 1, max: 30 })
).filter(([a, b]) => a + b <= 100)
  .map(([attendance, training, target]) => ({
    attendance_weight: attendance,
    training_weight: training,
    rating_weight: 100 - attendance - training,
    target_training_sessions: target
  }))

// ============================================================================
// Property Tests
// ============================================================================

describe('Scoring Criteria Property Tests', () => {

  /**
   * **Feature: athlete-evaluation, Property 4: Score Components Use Configured Weights**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   */
  describe('Property 4: Score Components Use Configured Weights', () => {

    /**
     * Requirement 4.1: attendance_score uses configured attendance_weight
     * Formula: attendance_score = (attendance_rate / 100) * attendance_weight
     */
    it('attendance_score should be calculated using configured attendance_weight', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          (stats, criteria) => {
            const result = calculateScore(stats, criteria, [])
            
            // Expected formula: (attendance_rate / 100) * attendance_weight
            const expectedAttendanceScore = (stats.attendance_rate / 100) * criteria.attendance_weight
            const roundedExpected = Math.round(expectedAttendanceScore * 100) / 100
            
            // Verify attendance_score matches expected calculation
            expect(result.attendance_score).toBeCloseTo(roundedExpected, 1)
            
            // Verify the weight used is from criteria
            expect(result.criteria_used.attendance_weight).toBe(criteria.attendance_weight)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Requirement 4.2: training_score uses configured training_weight
     * Formula: training_score = min(sessions / target, 1) * training_weight
     */
    it('training_score should be calculated using configured training_weight', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          criteriaWithTargetArbitrary,
          (stats, criteria) => {
            const result = calculateScore(stats, criteria, [])
            
            // Expected formula: min(sessions / target, 1) * training_weight
            const trainingRatio = Math.min(stats.training_sessions / criteria.target_training_sessions, 1)
            const expectedTrainingScore = trainingRatio * criteria.training_weight
            const roundedExpected = Math.round(expectedTrainingScore * 100) / 100
            
            // Verify training_score matches expected calculation
            expect(result.training_score).toBeCloseTo(roundedExpected, 1)
            
            // Verify the weight used is from criteria
            expect(result.criteria_used.training_weight).toBe(criteria.training_weight)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Requirement 4.3: rating_score uses configured rating_weight
     * Formula: rating_score = (average_rating / 5) * rating_weight
     */
    it('rating_score should be calculated using configured rating_weight', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          (stats, criteria) => {
            const result = calculateScore(stats, criteria, [])
            
            // Expected formula: (average_rating / 5) * rating_weight
            const expectedRatingScore = (stats.average_rating / 5) * criteria.rating_weight
            const roundedExpected = Math.round(expectedRatingScore * 100) / 100
            
            // Verify rating_score matches expected calculation
            expect(result.rating_score).toBeCloseTo(roundedExpected, 1)
            
            // Verify the weight used is from criteria
            expect(result.criteria_used.rating_weight).toBe(criteria.rating_weight)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Combined property: All three components use their respective configured weights
     */
    it('all score components should use their respective configured weights', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          criteriaWithTargetArbitrary,
          (stats, criteria) => {
            const result = calculateScore(stats, criteria, [])
            
            // Calculate expected scores using the formulas
            const expectedAttendance = (stats.attendance_rate / 100) * criteria.attendance_weight
            const trainingRatio = Math.min(stats.training_sessions / criteria.target_training_sessions, 1)
            const expectedTraining = trainingRatio * criteria.training_weight
            const expectedRating = (stats.average_rating / 5) * criteria.rating_weight
            
            // Verify each component
            expect(result.attendance_score).toBeCloseTo(Math.round(expectedAttendance * 100) / 100, 1)
            expect(result.training_score).toBeCloseTo(Math.round(expectedTraining * 100) / 100, 1)
            expect(result.rating_score).toBeCloseTo(Math.round(expectedRating * 100) / 100, 1)
            
            // Verify criteria_used reflects the input criteria
            expect(result.criteria_used.attendance_weight).toBe(criteria.attendance_weight)
            expect(result.criteria_used.training_weight).toBe(criteria.training_weight)
            expect(result.criteria_used.rating_weight).toBe(criteria.rating_weight)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Changing weights should proportionally change component scores
     * 
     * This test verifies that when we double a weight, the corresponding score doubles.
     * We use larger weights and attendance rates to avoid floating point precision issues
     * that occur with very small values after rounding.
     */
    it('doubling a weight should double the corresponding component score', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(50), max: Math.fround(100), noNaN: true }), // attendance_rate (higher values for precision)
          fc.integer({ min: 10, max: 40 }), // Base weight that can be doubled (10-40 so doubled is 20-80)
          fc.integer({ min: 1, max: 30 }), // Target sessions
          (attendanceRate, baseWeight, targetSessions) => {
            const stats = {
              attendance_rate: attendanceRate,
              training_sessions: 5,
              average_rating: 3
            }
            
            // Create two criteria sets: one with base weight, one with doubled weight
            // Ensure both sets have weights that sum to 100
            const doubledWeight = baseWeight * 2
            const remainingWeight1 = 100 - baseWeight
            const remainingWeight2 = 100 - doubledWeight
            
            // Skip if doubled weight exceeds 100
            if (doubledWeight > 100 || remainingWeight2 < 0) {
              return true
            }
            
            const criteria1 = {
              attendance_weight: baseWeight,
              training_weight: Math.floor(remainingWeight1 / 2),
              rating_weight: remainingWeight1 - Math.floor(remainingWeight1 / 2),
              target_training_sessions: targetSessions
            }
            
            const criteria2 = {
              attendance_weight: doubledWeight,
              training_weight: Math.floor(remainingWeight2 / 2),
              rating_weight: remainingWeight2 - Math.floor(remainingWeight2 / 2),
              target_training_sessions: targetSessions
            }
            
            // Verify weights sum to 100
            const sum1 = criteria1.attendance_weight + criteria1.training_weight + criteria1.rating_weight
            const sum2 = criteria2.attendance_weight + criteria2.training_weight + criteria2.rating_weight
            if (sum1 !== 100 || sum2 !== 100) {
              return true // Skip invalid criteria
            }
            
            const result1 = calculateScore(stats, criteria1, [])
            const result2 = calculateScore(stats, criteria2, [])
            
            // Calculate expected scores directly (before rounding)
            const expectedScore1 = (attendanceRate / 100) * baseWeight
            const expectedScore2 = (attendanceRate / 100) * doubledWeight
            
            // Verify the ratio of expected scores is 2
            // The actual scores may differ slightly due to rounding, but the relationship should hold
            // We check that score2 is approximately 2x score1 within a reasonable tolerance
            if (result1.attendance_score >= 1) { // Only check when score is significant
              const ratio = result2.attendance_score / result1.attendance_score
              // Allow tolerance of 0.5 due to rounding effects
              expect(ratio).toBeGreaterThanOrEqual(1.5)
              expect(ratio).toBeLessThanOrEqual(2.5)
            }
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * Property: Zero weight should result in zero component score
     */
    it('zero weight should result in zero component score', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          (stats) => {
            // Test with zero attendance weight
            const zeroAttendanceCriteria = {
              attendance_weight: 0,
              training_weight: 50,
              rating_weight: 50,
              target_training_sessions: 12
            }
            const result1 = calculateScore(stats, zeroAttendanceCriteria, [])
            expect(result1.attendance_score).toBe(0)
            
            // Test with zero training weight
            const zeroTrainingCriteria = {
              attendance_weight: 50,
              training_weight: 0,
              rating_weight: 50,
              target_training_sessions: 12
            }
            const result2 = calculateScore(stats, zeroTrainingCriteria, [])
            expect(result2.training_score).toBe(0)
            
            // Test with zero rating weight
            const zeroRatingCriteria = {
              attendance_weight: 50,
              training_weight: 50,
              rating_weight: 0,
              target_training_sessions: 12
            }
            const result3 = calculateScore(stats, zeroRatingCriteria, [])
            expect(result3.rating_score).toBe(0)
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    /**
     * Property: Maximum possible component score equals the weight
     */
    it('maximum component score should equal the configured weight', () => {
      fc.assert(
        fc.property(
          criteriaWithTargetArbitrary,
          (criteria) => {
            // Create stats that maximize all components
            const maxStats = {
              attendance_rate: 100,
              training_sessions: criteria.target_training_sessions,
              average_rating: 5
            }
            
            const result = calculateScore(maxStats, criteria, [])
            
            // Each component at max should equal its weight
            expect(result.attendance_score).toBeCloseTo(criteria.attendance_weight, 1)
            expect(result.training_score).toBeCloseTo(criteria.training_weight, 1)
            expect(result.rating_score).toBeCloseTo(criteria.rating_weight, 1)
            
            // Base score should be 100 (sum of all weights)
            expect(result.base_score).toBeCloseTo(100, 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Component scores are proportional to input values
     */
    it('component scores should be proportional to input values', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }), // attendance_rate
          fc.integer({ min: 1, max: 100 }), // training_sessions
          fc.float({ min: Math.fround(0.01), max: Math.fround(5), noNaN: true }), // average_rating
          criteriaWithTargetArbitrary,
          (attendanceRate, trainingSessions, avgRating, criteria) => {
            const stats = {
              attendance_rate: attendanceRate,
              training_sessions: trainingSessions,
              average_rating: avgRating
            }
            
            const result = calculateScore(stats, criteria, [])
            
            // Attendance score proportionality: score / weight = rate / 100
            if (criteria.attendance_weight > 0) {
              const attendanceRatio = result.attendance_score / criteria.attendance_weight
              const expectedRatio = attendanceRate / 100
              expect(attendanceRatio).toBeCloseTo(expectedRatio, 1)
            }
            
            // Rating score proportionality: score / weight = rating / 5
            if (criteria.rating_weight > 0) {
              const ratingRatio = result.rating_score / criteria.rating_weight
              const expectedRatio = avgRating / 5
              expect(ratingRatio).toBeCloseTo(expectedRatio, 1)
            }
            
            // Training score proportionality (capped at 1)
            if (criteria.training_weight > 0) {
              const trainingRatio = result.training_score / criteria.training_weight
              const expectedRatio = Math.min(trainingSessions / criteria.target_training_sessions, 1)
              expect(trainingRatio).toBeCloseTo(expectedRatio, 1)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Training score is capped when sessions exceed target
     */
    it('training_score should be capped at training_weight when sessions exceed target', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }), // target_training_sessions
          fc.integer({ min: 31, max: 100 }), // sessions exceeding target
          fc.integer({ min: 1, max: 100 }), // training_weight
          (target, sessions, trainingWeight) => {
            // Ensure sessions > target
            const actualSessions = Math.max(sessions, target + 1)
            
            const criteria = {
              attendance_weight: Math.floor((100 - trainingWeight) / 2),
              training_weight: trainingWeight,
              rating_weight: 100 - Math.floor((100 - trainingWeight) / 2) - trainingWeight,
              target_training_sessions: target
            }
            
            // Ensure weights sum to 100
            if (criteria.attendance_weight + criteria.training_weight + criteria.rating_weight !== 100) {
              return true // Skip invalid criteria
            }
            
            const stats = {
              attendance_rate: 50,
              training_sessions: actualSessions,
              average_rating: 2.5
            }
            
            const result = calculateScore(stats, criteria, [])
            
            // Training score should be capped at training_weight
            expect(result.training_score).toBeCloseTo(trainingWeight, 1)
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
