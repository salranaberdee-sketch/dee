/**
 * Tier Assignment Consistency Property-Based Tests
 * 
 * **Feature: athlete-evaluation, Property 3: Tier Assignment Consistency**
 * **Validates: Requirements 4.5, 4.6, 4.7, 4.8**
 * 
 * For any overall_score value, the assigned tier must be:
 * - 'excellent' if score >= 85
 * - 'good' if score >= 70 and < 85
 * - 'average' if score >= 50 and < 70
 * - 'needs_improvement' if score < 50
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  calculateScore, 
  determineTier, 
  TIER_THRESHOLDS, 
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
 * Arbitrary for generating scores in the 'excellent' tier range [85, 100]
 */
const excellentScoreArbitrary = fc.float({ 
  min: Math.fround(TIER_THRESHOLDS.excellent), 
  max: Math.fround(100), 
  noNaN: true 
})

/**
 * Arbitrary for generating scores in the 'good' tier range [70, 85)
 * Using 84.99 as max to stay below 85 threshold
 */
const goodScoreArbitrary = fc.float({ 
  min: Math.fround(TIER_THRESHOLDS.good), 
  max: Math.fround(84.99), 
  noNaN: true 
})

/**
 * Arbitrary for generating scores in the 'average' tier range [50, 70)
 * Using 69.99 as max to stay below 70 threshold
 */
const averageScoreArbitrary = fc.float({ 
  min: Math.fround(TIER_THRESHOLDS.average), 
  max: Math.fround(69.99), 
  noNaN: true 
})

/**
 * Arbitrary for generating scores in the 'needs_improvement' tier range [0, 50)
 * Using 49.99 as max to stay below 50 threshold
 */
const needsImprovementScoreArbitrary = fc.float({ 
  min: Math.fround(0), 
  max: Math.fround(49.99), 
  noNaN: true 
})

/**
 * Arbitrary for generating any valid score [0, 100]
 */
const anyScoreArbitrary = fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true })

/**
 * Helper function to determine expected tier based on score
 */
function expectedTier(score) {
  if (score >= TIER_THRESHOLDS.excellent) return 'excellent'
  if (score >= TIER_THRESHOLDS.good) return 'good'
  if (score >= TIER_THRESHOLDS.average) return 'average'
  return 'needs_improvement'
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Tier Assignment Consistency Property Tests', () => {

  /**
   * **Feature: athlete-evaluation, Property 3: Tier Assignment Consistency**
   * **Validates: Requirements 4.5, 4.6, 4.7, 4.8**
   */
  describe('Property 3: Tier Assignment Consistency', () => {

    /**
     * Requirement 4.5: WHEN overall_score >= 85 THEN the system SHALL assign tier 'excellent'
     */
    it('should assign tier "excellent" when score >= 85', () => {
      fc.assert(
        fc.property(excellentScoreArbitrary, (score) => {
          const tier = determineTier(score)
          expect(tier).toBe('excellent')
          return tier === 'excellent'
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Requirement 4.6: WHEN overall_score >= 70 AND < 85 THEN the system SHALL assign tier 'good'
     */
    it('should assign tier "good" when score >= 70 and < 85', () => {
      fc.assert(
        fc.property(goodScoreArbitrary, (score) => {
          const tier = determineTier(score)
          expect(tier).toBe('good')
          return tier === 'good'
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Requirement 4.7: WHEN overall_score >= 50 AND < 70 THEN the system SHALL assign tier 'average'
     */
    it('should assign tier "average" when score >= 50 and < 70', () => {
      fc.assert(
        fc.property(averageScoreArbitrary, (score) => {
          const tier = determineTier(score)
          expect(tier).toBe('average')
          return tier === 'average'
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Requirement 4.8: WHEN overall_score < 50 THEN the system SHALL assign tier 'needs_improvement'
     */
    it('should assign tier "needs_improvement" when score < 50', () => {
      fc.assert(
        fc.property(needsImprovementScoreArbitrary, (score) => {
          const tier = determineTier(score)
          expect(tier).toBe('needs_improvement')
          return tier === 'needs_improvement'
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Combined property: For any score, tier assignment must be consistent with thresholds
     */
    it('should consistently assign correct tier for any score in [0, 100]', () => {
      fc.assert(
        fc.property(anyScoreArbitrary, (score) => {
          const tier = determineTier(score)
          const expected = expectedTier(score)
          
          expect(tier).toBe(expected)
          return tier === expected
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Boundary test: Score exactly at threshold boundaries
     */
    it('should correctly assign tier at exact boundary values', () => {
      // Exactly 85 should be 'excellent'
      expect(determineTier(85)).toBe('excellent')
      
      // Exactly 70 should be 'good'
      expect(determineTier(70)).toBe('good')
      
      // Exactly 50 should be 'average'
      expect(determineTier(50)).toBe('average')
      
      // Exactly 0 should be 'needs_improvement'
      expect(determineTier(0)).toBe('needs_improvement')
      
      // Exactly 100 should be 'excellent'
      expect(determineTier(100)).toBe('excellent')
    })

    /**
     * Boundary test: Score just below threshold boundaries
     */
    it('should correctly assign tier just below boundary values', () => {
      // Just below 85 should be 'good'
      expect(determineTier(84.99)).toBe('good')
      
      // Just below 70 should be 'average'
      expect(determineTier(69.99)).toBe('average')
      
      // Just below 50 should be 'needs_improvement'
      expect(determineTier(49.99)).toBe('needs_improvement')
    })

    /**
     * Integration test: Tier from calculateScore is valid for the overall_score
     * Note: calculateScore determines tier before rounding overall_score,
     * so we verify the tier is valid for the score range rather than exact match
     */
    it('should have consistent tier assignment between calculateScore and determineTier', () => {
      fc.assert(
        fc.property(
          athleteStatsArbitrary,
          validCriteriaArbitrary,
          (stats, criteria) => {
            const result = calculateScore(stats, criteria, [])
            
            // The tier should be valid - verify it matches the tier rules
            // based on the overall_score (which is rounded)
            const score = result.overall_score
            const tier = result.tier
            
            // Verify tier is consistent with score thresholds
            // Allow for small floating-point tolerance at boundaries
            if (tier === 'excellent') {
              // Score should be >= 85 (or very close due to rounding)
              expect(score).toBeGreaterThanOrEqual(84.99)
            } else if (tier === 'good') {
              // Score should be >= 70 and < 85
              expect(score).toBeGreaterThanOrEqual(69.99)
              expect(score).toBeLessThan(85.01)
            } else if (tier === 'average') {
              // Score should be >= 50 and < 70
              expect(score).toBeGreaterThanOrEqual(49.99)
              expect(score).toBeLessThan(70.01)
            } else if (tier === 'needs_improvement') {
              // Score should be < 50
              expect(score).toBeLessThan(50.01)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Tier ordering property: Higher scores should never result in lower tiers
     */
    it('should maintain tier ordering - higher scores never result in lower tiers', () => {
      const tierOrder = {
        'needs_improvement': 0,
        'average': 1,
        'good': 2,
        'excellent': 3
      }

      fc.assert(
        fc.property(
          anyScoreArbitrary,
          anyScoreArbitrary,
          (score1, score2) => {
            const tier1 = determineTier(score1)
            const tier2 = determineTier(score2)
            
            // If score1 > score2, then tier1 should be >= tier2
            if (score1 > score2) {
              expect(tierOrder[tier1]).toBeGreaterThanOrEqual(tierOrder[tier2])
              return tierOrder[tier1] >= tierOrder[tier2]
            }
            // If score1 < score2, then tier1 should be <= tier2
            if (score1 < score2) {
              expect(tierOrder[tier1]).toBeLessThanOrEqual(tierOrder[tier2])
              return tierOrder[tier1] <= tierOrder[tier2]
            }
            // If scores are equal, tiers should be equal
            expect(tier1).toBe(tier2)
            return tier1 === tier2
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Determinism property: Same score always produces same tier
     */
    it('should be deterministic - same score always produces same tier', () => {
      fc.assert(
        fc.property(anyScoreArbitrary, (score) => {
          const tier1 = determineTier(score)
          const tier2 = determineTier(score)
          const tier3 = determineTier(score)
          
          expect(tier1).toBe(tier2)
          expect(tier2).toBe(tier3)
          return tier1 === tier2 && tier2 === tier3
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Valid tier values property: Tier must be one of the four valid values
     */
    it('should only return valid tier values', () => {
      const validTiers = ['excellent', 'good', 'average', 'needs_improvement']
      
      fc.assert(
        fc.property(anyScoreArbitrary, (score) => {
          const tier = determineTier(score)
          expect(validTiers).toContain(tier)
          return validTiers.includes(tier)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Threshold constants verification
     */
    it('should use correct threshold constants', () => {
      expect(TIER_THRESHOLDS.excellent).toBe(85)
      expect(TIER_THRESHOLDS.good).toBe(70)
      expect(TIER_THRESHOLDS.average).toBe(50)
    })
  })
})
