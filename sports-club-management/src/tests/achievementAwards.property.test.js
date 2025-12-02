/**
 * Achievement Awards Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Achievement Awards
 * 
 * **Feature: training-logs-enhancement, Property 5: Achievement milestone awards**
 * **Validates: Requirements 4.4, 4.5**
 * 
 * For any user reaching streak milestones (7, 14, 30, 60, 90 days), an achievement
 * record should exist with the correct achievement_type and earned_at timestamp.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Constants (matching data.js implementation)
// ============================================================================

/**
 * Streak milestones that trigger achievements (Requirement 4.4)
 */
const STREAK_MILESTONES = [7, 14, 30, 60, 90]

/**
 * Achievement type mapping for each milestone
 */
const ACHIEVEMENT_TYPES = {
  7: 'streak_7_days',
  14: 'streak_14_days',
  30: 'streak_30_days',
  60: 'streak_60_days',
  90: 'streak_90_days'
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Format a Date object to YYYY-MM-DD string
 * @param {Date} date - Date object
 * @returns {string} - Date string in YYYY-MM-DD format
 */
function formatDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Get date string for N days before a reference date
 * @param {string} refDateStr - Reference date string
 * @param {number} daysBack - Number of days to go back
 * @returns {string} - Date string
 */
function getDateNDaysBack(refDateStr, daysBack) {
  const [year, month, day] = refDateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - daysBack)
  return formatDateStr(date)
}

/**
 * Create training logs for consecutive days starting from today
 * @param {number} numDays - Number of consecutive days
 * @param {string} todayStr - Today's date string
 * @returns {Array} - Array of training log objects
 */
function createConsecutiveLogs(numDays, todayStr) {
  const logs = []
  for (let i = 0; i < numDays; i++) {
    logs.push({
      id: `log-${i}`,
      user_id: 'test-user',
      date: getDateNDaysBack(todayStr, i),
      duration: 60,
      rating: 4
    })
  }
  return logs
}

// ============================================================================
// Pure Functions for Testing (simulating achievement logic)
// ============================================================================

/**
 * Determine which achievements should be awarded for a given streak
 * This is a pure function that mirrors the store's checkAndAwardAchievements logic
 * 
 * @param {number} currentStreak - Current streak count
 * @param {Array} existingAchievements - Array of existing achievement objects
 * @returns {Array} - Array of achievement types that should be awarded
 */
function determineNewAchievements(currentStreak, existingAchievements) {
  const existingTypes = new Set(existingAchievements.map(a => a.achievement_type))
  const newAchievements = []

  for (const milestone of STREAK_MILESTONES) {
    const achievementType = ACHIEVEMENT_TYPES[milestone]
    
    // Award if streak >= milestone and not already earned
    if (currentStreak >= milestone && !existingTypes.has(achievementType)) {
      newAchievements.push(achievementType)
    }
  }

  return newAchievements
}

/**
 * Get all achievements that should exist for a given streak
 * @param {number} currentStreak - Current streak count
 * @returns {Array} - Array of achievement types that should exist
 */
function getExpectedAchievements(currentStreak) {
  const expected = []
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone) {
      expected.push(ACHIEVEMENT_TYPES[milestone])
    }
  }
  return expected
}

/**
 * Validate that an achievement record has the correct structure
 * @param {Object} achievement - Achievement object
 * @param {string} expectedType - Expected achievement type
 * @returns {boolean}
 */
function validateAchievementRecord(achievement, expectedType) {
  return (
    achievement.achievement_type === expectedType &&
    achievement.user_id !== undefined &&
    achievement.earned_at !== undefined
  )
}

/**
 * Simulate the full achievement check and award process
 * @param {number} currentStreak - Current streak count
 * @param {Array} existingAchievements - Existing achievements
 * @param {string} userId - User ID
 * @returns {Object} - { newAchievements, allAchievements }
 */
function simulateCheckAndAward(currentStreak, existingAchievements, userId) {
  const newTypes = determineNewAchievements(currentStreak, existingAchievements)
  const now = new Date().toISOString()
  
  const newAchievements = newTypes.map(type => ({
    id: `achievement-${type}`,
    user_id: userId,
    achievement_type: type,
    earned_at: now
  }))
  
  const allAchievements = [...existingAchievements, ...newAchievements]
  
  return { newAchievements, allAchievements }
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Achievement Awards Property Tests', () => {

  /**
   * **Feature: training-logs-enhancement, Property 5: Achievement milestone awards**
   * **Validates: Requirements 4.4, 4.5**
   */
  describe('Property 5: Achievement milestone awards', () => {
    
    const userId = 'test-user-id'

    /**
     * Arbitrary for generating existing achievements (subset of all possible)
     */
    const existingAchievementsArbitrary = fc.subarray(
      STREAK_MILESTONES.map(m => ({
        id: `existing-${m}`,
        user_id: userId,
        achievement_type: ACHIEVEMENT_TYPES[m],
        earned_at: '2024-01-01T00:00:00.000Z'
      })),
      { minLength: 0 }
    )


    it('should award correct achievements when streak reaches milestones', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...STREAK_MILESTONES), // Test each milestone
          (milestone) => {
            const existingAchievements = []
            const result = simulateCheckAndAward(milestone, existingAchievements, userId)
            
            // Should award all achievements up to and including this milestone
            const expectedTypes = getExpectedAchievements(milestone)
            const awardedTypes = result.newAchievements.map(a => a.achievement_type)
            
            // All expected achievements should be awarded
            for (const expectedType of expectedTypes) {
              expect(awardedTypes).toContain(expectedType)
            }
            
            // Number of new achievements should match expected
            expect(result.newAchievements.length).toBe(expectedTypes.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not award achievements already earned', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 7, max: 100 }), // Streak that qualifies for at least one achievement
          existingAchievementsArbitrary,
          (currentStreak, existingAchievements) => {
            const result = simulateCheckAndAward(currentStreak, existingAchievements, userId)
            
            // New achievements should not include any existing ones
            const existingTypes = new Set(existingAchievements.map(a => a.achievement_type))
            const newTypes = result.newAchievements.map(a => a.achievement_type)
            
            for (const newType of newTypes) {
              expect(existingTypes.has(newType)).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should award achievements for all milestones at or below current streak', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 120 }), // Any streak value
          (currentStreak) => {
            const existingAchievements = []
            const result = simulateCheckAndAward(currentStreak, existingAchievements, userId)
            
            // Check each milestone
            for (const milestone of STREAK_MILESTONES) {
              const achievementType = ACHIEVEMENT_TYPES[milestone]
              const wasAwarded = result.newAchievements.some(
                a => a.achievement_type === achievementType
              )
              
              if (currentStreak >= milestone) {
                // Should be awarded
                expect(wasAwarded).toBe(true)
              } else {
                // Should not be awarded
                expect(wasAwarded).toBe(false)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('achievement records should have correct structure (Requirement 4.5)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 7, max: 100 }), // Streak that qualifies for achievements
          fc.uuid(), // Random user ID
          (currentStreak, testUserId) => {
            const existingAchievements = []
            const result = simulateCheckAndAward(currentStreak, existingAchievements, testUserId)
            
            // Each new achievement should have correct structure
            for (const achievement of result.newAchievements) {
              // Should have user_id
              expect(achievement.user_id).toBe(testUserId)
              
              // Should have achievement_type
              expect(achievement.achievement_type).toBeDefined()
              expect(Object.values(ACHIEVEMENT_TYPES)).toContain(achievement.achievement_type)
              
              // Should have earned_at timestamp
              expect(achievement.earned_at).toBeDefined()
              expect(typeof achievement.earned_at).toBe('string')
              
              // earned_at should be a valid ISO date string
              const parsedDate = new Date(achievement.earned_at)
              expect(parsedDate.toString()).not.toBe('Invalid Date')
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not award any achievements when streak is below minimum milestone', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 6 }), // Streak below 7 days
          (currentStreak) => {
            const existingAchievements = []
            const result = simulateCheckAndAward(currentStreak, existingAchievements, userId)
            
            // No achievements should be awarded
            expect(result.newAchievements.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should award exactly one achievement per milestone', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 7, max: 100 }),
          (currentStreak) => {
            const existingAchievements = []
            const result = simulateCheckAndAward(currentStreak, existingAchievements, userId)
            
            // Count occurrences of each achievement type
            const typeCounts = new Map()
            for (const achievement of result.newAchievements) {
              const count = typeCounts.get(achievement.achievement_type) || 0
              typeCounts.set(achievement.achievement_type, count + 1)
            }
            
            // Each type should appear at most once
            for (const [type, count] of typeCounts) {
              expect(count).toBe(1)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('total achievements should equal milestones reached after awarding', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 120 }),
          existingAchievementsArbitrary,
          (currentStreak, existingAchievements) => {
            const result = simulateCheckAndAward(currentStreak, existingAchievements, userId)
            
            // Count milestones reached
            const milestonesReached = STREAK_MILESTONES.filter(m => currentStreak >= m).length
            
            // All achievements (existing + new) should cover all reached milestones
            const allTypes = new Set(result.allAchievements.map(a => a.achievement_type))
            
            for (const milestone of STREAK_MILESTONES) {
              const achievementType = ACHIEVEMENT_TYPES[milestone]
              if (currentStreak >= milestone) {
                expect(allTypes.has(achievementType)).toBe(true)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle incremental streak growth correctly', () => {
      // Simulate a user's streak growing over time
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 1, maxLength: 10 }),
          (streakIncrements) => {
            let currentStreak = 0
            let allAchievements = []
            
            for (const increment of streakIncrements) {
              currentStreak += increment
              const result = simulateCheckAndAward(currentStreak, allAchievements, userId)
              
              // New achievements should only be for newly reached milestones
              const previouslyReached = STREAK_MILESTONES.filter(m => 
                allAchievements.some(a => a.achievement_type === ACHIEVEMENT_TYPES[m])
              )
              const nowReached = STREAK_MILESTONES.filter(m => currentStreak >= m)
              const newlyReached = nowReached.filter(m => !previouslyReached.includes(m))
              
              // New achievements should match newly reached milestones
              expect(result.newAchievements.length).toBe(newlyReached.length)
              
              allAchievements = result.allAchievements
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('achievement types should match milestone values', () => {
      // Verify the mapping between milestones and achievement types
      for (const milestone of STREAK_MILESTONES) {
        const expectedType = `streak_${milestone}_days`
        expect(ACHIEVEMENT_TYPES[milestone]).toBe(expectedType)
      }
    })

    it('should award 7-day achievement at exactly 7 days (Requirement 4.4)', () => {
      const existingAchievements = []
      
      // At 6 days - should not award
      const result6 = simulateCheckAndAward(6, existingAchievements, userId)
      expect(result6.newAchievements.some(a => a.achievement_type === 'streak_7_days')).toBe(false)
      
      // At 7 days - should award
      const result7 = simulateCheckAndAward(7, existingAchievements, userId)
      expect(result7.newAchievements.some(a => a.achievement_type === 'streak_7_days')).toBe(true)
    })

    it('should award all milestones at 90+ days', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 90, max: 200 }),
          (currentStreak) => {
            const existingAchievements = []
            const result = simulateCheckAndAward(currentStreak, existingAchievements, userId)
            
            // Should have all 5 achievements
            expect(result.newAchievements.length).toBe(5)
            
            // Verify all milestone types are present
            const awardedTypes = new Set(result.newAchievements.map(a => a.achievement_type))
            for (const milestone of STREAK_MILESTONES) {
              expect(awardedTypes.has(ACHIEVEMENT_TYPES[milestone])).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('idempotency: running check twice should not duplicate achievements', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 7, max: 100 }),
          (currentStreak) => {
            // First check
            const result1 = simulateCheckAndAward(currentStreak, [], userId)
            
            // Second check with achievements from first check
            const result2 = simulateCheckAndAward(currentStreak, result1.allAchievements, userId)
            
            // Second check should not award any new achievements
            expect(result2.newAchievements.length).toBe(0)
            
            // Total achievements should remain the same
            expect(result2.allAchievements.length).toBe(result1.allAchievements.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
