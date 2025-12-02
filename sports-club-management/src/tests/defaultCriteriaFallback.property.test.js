/**
 * Default Criteria Fallback Property-Based Tests
 * 
 * **Feature: athlete-evaluation, Property 6: Default Criteria Fallback**
 * **Validates: Requirements 7.7**
 * 
 * For any club without custom scoring criteria, the system must use 
 * default weights (attendance: 40%, training: 30%, rating: 30%).
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateScore, DEFAULT_CRITERIA } from '../lib/scoreCalculator.js'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

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
 * Arbitrary for generating null/undefined criteria values
 * These represent clubs without custom scoring criteria
 */
const nullCriteriaArbitrary = fc.constantFrom(null, undefined)

// ============================================================================
// Property Tests
// ============================================================================

describe('Default Criteria Fallback Property Tests', () => {

  /**
   * **Feature: athlete-evaluation, Property 6: Default Criteria Fallback**
   * **Validates: Requirements 7.7**
   */
  describe('Property 6: Default Criteria Fallback', () => {

    /**
     * Property: When criteria is null, default weights (40, 30, 30) are used
     */
    it('should use default weights (40, 30, 30) when criteria is null', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          (stats) => {
            const result = calculateScore(stats, null, [])
            
            // Verify default weights are used
            expect(result.criteria_used.attendance_weight).toBe(DEFAULT_CRITERIA.attendance_weight)
            expect(result.criteria_used.training_weight).toBe(DEFAULT_CRITERIA.training_weight)
            expect(result.criteria_used.rating_weight).toBe(DEFAULT_CRITERIA.rating_weight)
            
            // Verify default values are 40, 30, 30
            expect(result.criteria_used.attendance_weight).toBe(40)
            expect(result.criteria_used.training_weight).toBe(30)
            expect(result.criteria_used.rating_weight).toBe(30)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: When criteria is undefined, default weights (40, 30, 30) are used
     */
    it('should use default weights (40, 30, 30) when criteria is undefined', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          (stats) => {
            const result = calculateScore(stats, undefined, [])
            
            // Verify default weights are used
            expect(result.criteria_used.attendance_weight).toBe(40)
            expect(result.criteria_used.training_weight).toBe(30)
            expect(result.criteria_used.rating_weight).toBe(30)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Default target_training_sessions should be 12
     */
    it('should use default target_training_sessions of 12 when criteria is null', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          (stats) => {
            const result = calculateScore(stats, null, [])
            
            // Verify default target_training_sessions
            expect(result.criteria_used.target_training_sessions).toBe(DEFAULT_CRITERIA.target_training_sessions)
            expect(result.criteria_used.target_training_sessions).toBe(12)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Score calculation with null criteria should match calculation with explicit defaults
     */
    it('score with null criteria should equal score with explicit default criteria', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          (stats) => {
            // Calculate with null criteria (should use defaults)
            const resultWithNull = calculateScore(stats, null, [])
            
            // Calculate with explicit default criteria
            const resultWithDefaults = calculateScore(stats, DEFAULT_CRITERIA, [])
            
            // Both should produce identical results
            expect(resultWithNull.attendance_score).toBe(resultWithDefaults.attendance_score)
            expect(resultWithNull.training_score).toBe(resultWithDefaults.training_score)
            expect(resultWithNull.rating_score).toBe(resultWithDefaults.rating_score)
            expect(resultWithNull.base_score).toBe(resultWithDefaults.base_score)
            expect(resultWithNull.overall_score).toBe(resultWithDefaults.overall_score)
            expect(resultWithNull.tier).toBe(resultWithDefaults.tier)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Score calculation with undefined criteria should match calculation with explicit defaults
     */
    it('score with undefined criteria should equal score with explicit default criteria', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          (stats) => {
            // Calculate with undefined criteria (should use defaults)
            const resultWithUndefined = calculateScore(stats, undefined, [])
            
            // Calculate with explicit default criteria
            const resultWithDefaults = calculateScore(stats, DEFAULT_CRITERIA, [])
            
            // Both should produce identical results
            expect(resultWithUndefined.attendance_score).toBe(resultWithDefaults.attendance_score)
            expect(resultWithUndefined.training_score).toBe(resultWithDefaults.training_score)
            expect(resultWithUndefined.rating_score).toBe(resultWithDefaults.rating_score)
            expect(resultWithUndefined.base_score).toBe(resultWithDefaults.base_score)
            expect(resultWithUndefined.overall_score).toBe(resultWithDefaults.overall_score)
            expect(resultWithUndefined.tier).toBe(resultWithDefaults.tier)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Default weights should sum to 100
     */
    it('default weights should sum to exactly 100', () => {
      const sum = DEFAULT_CRITERIA.attendance_weight + 
                  DEFAULT_CRITERIA.training_weight + 
                  DEFAULT_CRITERIA.rating_weight
      
      expect(sum).toBe(100)
    })

    /**
     * Property: Attendance score with default criteria should be (rate/100) * 40
     */
    it('attendance_score with default criteria should use 40% weight', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (attendanceRate) => {
            const stats = {
              attendance_rate: attendanceRate,
              training_sessions: 0,
              average_rating: 0
            }
            
            const result = calculateScore(stats, null, [])
            
            // Expected: (attendance_rate / 100) * 40
            const expectedScore = (attendanceRate / 100) * 40
            const roundedExpected = Math.round(expectedScore * 100) / 100
            
            expect(result.attendance_score).toBeCloseTo(roundedExpected, 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Training score with default criteria should use 30% weight and target of 12
     */
    it('training_score with default criteria should use 30% weight and target of 12', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50 }),
          (trainingSessions) => {
            const stats = {
              attendance_rate: 0,
              training_sessions: trainingSessions,
              average_rating: 0
            }
            
            const result = calculateScore(stats, null, [])
            
            // Expected: min(sessions / 12, 1) * 30
            const trainingRatio = Math.min(trainingSessions / 12, 1)
            const expectedScore = trainingRatio * 30
            const roundedExpected = Math.round(expectedScore * 100) / 100
            
            expect(result.training_score).toBeCloseTo(roundedExpected, 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Rating score with default criteria should use 30% weight
     */
    it('rating_score with default criteria should use 30% weight', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 5, noNaN: true }),
          (avgRating) => {
            const stats = {
              attendance_rate: 0,
              training_sessions: 0,
              average_rating: avgRating
            }
            
            const result = calculateScore(stats, null, [])
            
            // Expected: (average_rating / 5) * 30
            const expectedScore = (avgRating / 5) * 30
            const roundedExpected = Math.round(expectedScore * 100) / 100
            
            expect(result.rating_score).toBeCloseTo(roundedExpected, 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Maximum score with default criteria should be 100
     */
    it('maximum score with default criteria should be 100', () => {
      const maxStats = {
        attendance_rate: 100,
        training_sessions: 12, // equals target
        average_rating: 5
      }
      
      const result = calculateScore(maxStats, null, [])
      
      // With max stats and default weights (40 + 30 + 30 = 100)
      expect(result.attendance_score).toBeCloseTo(40, 1)
      expect(result.training_score).toBeCloseTo(30, 1)
      expect(result.rating_score).toBeCloseTo(30, 1)
      expect(result.overall_score).toBeCloseTo(100, 1)
    })

    /**
     * Property: Calling calculateScore without criteria parameter should use defaults
     */
    it('calling calculateScore without criteria parameter should use defaults', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          (stats) => {
            // Call without criteria parameter (relies on default parameter value)
            const resultNoParam = calculateScore(stats)
            
            // Call with explicit null
            const resultWithNull = calculateScore(stats, null, [])
            
            // Both should use default criteria
            expect(resultNoParam.criteria_used.attendance_weight).toBe(40)
            expect(resultNoParam.criteria_used.training_weight).toBe(30)
            expect(resultNoParam.criteria_used.rating_weight).toBe(30)
            expect(resultNoParam.criteria_used.target_training_sessions).toBe(12)
            
            // Results should be identical
            expect(resultNoParam.overall_score).toBe(resultWithNull.overall_score)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
