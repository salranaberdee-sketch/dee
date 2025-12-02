/**
 * Goal Progress Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Goal Progress
 * 
 * **Feature: training-logs-enhancement, Property 3: Goal progress calculation**
 * **Validates: Requirements 3.3, 3.4**
 * 
 * For any user with a weekly goal, the progress value should equal the count
 * of training sessions in the current week, and completion indicator should
 * show when progress >= target.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * Valid goal types as defined in the database schema
 */
const VALID_GOAL_TYPES = ['weekly_sessions']

/**
 * Default goal value when no goal is set (Requirement 3.5)
 */
const DEFAULT_TARGET_VALUE = 3

/**
 * Valid target value range (1-7 sessions per week)
 */
const MIN_TARGET_VALUE = 1
const MAX_TARGET_VALUE = 7

/**
 * Arbitrary for generating valid target values (1-7)
 */
const targetValueArbitrary = fc.integer({ min: MIN_TARGET_VALUE, max: MAX_TARGET_VALUE })

/**
 * Calculate week start (Monday) for a given date string (YYYY-MM-DD)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} - Monday of that week in YYYY-MM-DD format
 */
function getWeekStartStr(dateStr) {
  // Parse date parts to avoid timezone issues
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day) // month is 0-indexed
  const dayOfWeek = date.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  date.setDate(date.getDate() - daysToSubtract)
  
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Get dates for a week starting from Monday
 * @param {string} weekStartStr - Monday date string
 * @returns {string[]} - Array of 7 date strings
 */
function getWeekDates(weekStartStr) {
  const [year, month, day] = weekStartStr.split('-').map(Number)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(year, month - 1, day + i)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
  }
  return dates
}

// ============================================================================
// Pure Functions for Testing (simulating goal progress calculation)
// ============================================================================

/**
 * Calculate goal progress from training logs
 * This is a pure function that mirrors the store's getGoalProgress logic
 * 
 * @param {Object} goal - User's goal { target_value }
 * @param {Array} trainingLogs - Array of training logs with dates
 * @param {string} todayStr - Today's date string (YYYY-MM-DD)
 * @returns {Object} - { progress, targetValue, isCompleted, percentage }
 */
function calculateGoalProgress(goal, trainingLogs, todayStr) {
  // Calculate current week start (Monday)
  const weekStartStr = getWeekStartStr(todayStr)
  
  // Count training logs in current week
  const logsInWeek = trainingLogs.filter(log => {
    const logDate = log.date
    return logDate >= weekStartStr && logDate <= todayStr
  })
  
  const progress = logsInWeek.length
  const targetValue = goal?.target_value || DEFAULT_TARGET_VALUE
  const isCompleted = progress >= targetValue
  const percentage = Math.min(Math.round((progress / targetValue) * 100), 100)
  
  return {
    progress,
    targetValue,
    isCompleted,
    percentage
  }
}

/**
 * Validate that progress equals the count of sessions in current week
 * @param {number} progress - Calculated progress
 * @param {Array} trainingLogs - Training logs
 * @param {string} todayStr - Today's date string
 * @returns {boolean}
 */
function validateProgressEqualsSessionCount(progress, trainingLogs, todayStr) {
  const weekStartStr = getWeekStartStr(todayStr)
  
  const expectedCount = trainingLogs.filter(log => {
    return log.date >= weekStartStr && log.date <= todayStr
  }).length
  
  return progress === expectedCount
}

/**
 * Validate completion indicator logic
 * @param {number} progress - Current progress
 * @param {number} targetValue - Target value
 * @param {boolean} isCompleted - Completion flag
 * @returns {boolean}
 */
function validateCompletionIndicator(progress, targetValue, isCompleted) {
  const expectedCompleted = progress >= targetValue
  return isCompleted === expectedCompleted
}

/**
 * Validate percentage calculation
 * @param {number} progress - Current progress
 * @param {number} targetValue - Target value
 * @param {number} percentage - Calculated percentage
 * @returns {boolean}
 */
function validatePercentage(progress, targetValue, percentage) {
  const expectedPercentage = Math.min(Math.round((progress / targetValue) * 100), 100)
  return percentage === expectedPercentage
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Goal Progress Property Tests', () => {

  /**
   * **Feature: training-logs-enhancement, Property 3: Goal progress calculation**
   * **Validates: Requirements 3.3, 3.4**
   */
  describe('Property 3: Goal progress calculation', () => {
    
    // Use a fixed reference date for consistent testing (Monday, Dec 2, 2024)
    const todayStr = '2024-12-02'
    const weekStartStr = getWeekStartStr(todayStr)
    const weekDates = getWeekDates(weekStartStr)
    
    /**
     * Arbitrary for generating training logs within the current week
     */
    const trainingLogArbitrary = fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      date: fc.constantFrom(...weekDates.slice(0, weekDates.indexOf(todayStr) + 1)),
      duration: fc.integer({ min: 15, max: 180 }),
      rating: fc.integer({ min: 1, max: 5 })
    })
    
    /**
     * Arbitrary for generating an array of training logs
     */
    const trainingLogsArbitrary = fc.array(trainingLogArbitrary, { minLength: 0, maxLength: 20 })

    it('progress should equal count of training sessions in current week', () => {
      fc.assert(
        fc.property(
          targetValueArbitrary,
          trainingLogsArbitrary,
          (targetValue, trainingLogs) => {
            const goal = { target_value: targetValue }
            const result = calculateGoalProgress(goal, trainingLogs, todayStr)
            
            // Verify progress equals session count
            expect(validateProgressEqualsSessionCount(
              result.progress, 
              trainingLogs, 
              todayStr
            )).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('isCompleted should be true when progress >= target', () => {
      fc.assert(
        fc.property(
          targetValueArbitrary,
          trainingLogsArbitrary,
          (targetValue, trainingLogs) => {
            const goal = { target_value: targetValue }
            const result = calculateGoalProgress(goal, trainingLogs, todayStr)
            
            // Verify completion indicator
            expect(validateCompletionIndicator(
              result.progress,
              result.targetValue,
              result.isCompleted
            )).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('percentage should be correctly calculated and capped at 100', () => {
      fc.assert(
        fc.property(
          targetValueArbitrary,
          trainingLogsArbitrary,
          (targetValue, trainingLogs) => {
            const goal = { target_value: targetValue }
            const result = calculateGoalProgress(goal, trainingLogs, todayStr)
            
            // Verify percentage calculation
            expect(validatePercentage(
              result.progress,
              result.targetValue,
              result.percentage
            )).toBe(true)
            
            // Verify percentage is capped at 100
            expect(result.percentage).toBeLessThanOrEqual(100)
            expect(result.percentage).toBeGreaterThanOrEqual(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use default target value (3) when no goal is set', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          (trainingLogs) => {
            // No goal set (null)
            const result = calculateGoalProgress(null, trainingLogs, todayStr)
            
            // Should use default target value
            expect(result.targetValue).toBe(DEFAULT_TARGET_VALUE)
            
            // Completion should still be calculated correctly
            expect(validateCompletionIndicator(
              result.progress,
              result.targetValue,
              result.isCompleted
            )).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty training logs', () => {
      fc.assert(
        fc.property(
          targetValueArbitrary,
          (targetValue) => {
            const goal = { target_value: targetValue }
            const result = calculateGoalProgress(goal, [], todayStr)
            
            // Progress should be 0
            expect(result.progress).toBe(0)
            
            // Should not be completed (since target is at least 1)
            expect(result.isCompleted).toBe(false)
            
            // Percentage should be 0
            expect(result.percentage).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should only count logs within current week', () => {
      // Generate logs with dates both inside and outside current week
      const mixedLogsArbitrary = fc.record({
        inWeekLogCount: fc.integer({ min: 0, max: 10 }),
        outsideWeekLogCount: fc.integer({ min: 0, max: 10 })
      }).map(({ inWeekLogCount, outsideWeekLogCount }) => {
        // Create in-week logs with the reference date
        const inWeekLogs = Array.from({ length: inWeekLogCount }, (_, i) => ({
          id: `in-week-${i}`,
          user_id: 'test-user',
          date: todayStr, // Use the reference date (within week)
          duration: 60,
          rating: 4
        }))
        
        // Create outside-week logs with a date before the week
        const outsideWeekLogs = Array.from({ length: outsideWeekLogCount }, (_, i) => ({
          id: `outside-week-${i}`,
          user_id: 'test-user',
          date: '2024-11-25', // A date before the week (Nov 25 is before Dec 2)
          duration: 60,
          rating: 4
        }))
        
        return { inWeekLogs, outsideWeekLogs }
      })

      fc.assert(
        fc.property(
          targetValueArbitrary,
          mixedLogsArbitrary,
          (targetValue, { inWeekLogs, outsideWeekLogs }) => {
            const goal = { target_value: targetValue }
            const allLogs = [...inWeekLogs, ...outsideWeekLogs]
            const result = calculateGoalProgress(goal, allLogs, todayStr)
            
            // Progress should only count in-week logs
            expect(result.progress).toBe(inWeekLogs.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('completion indicator should be consistent with progress and target', () => {
      // Test specific scenarios where progress equals, exceeds, or is below target
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 15 }), // progress
          targetValueArbitrary, // target
          (progressCount, targetValue) => {
            // Create exactly progressCount logs in the current week
            const logs = Array.from({ length: progressCount }, (_, i) => ({
              id: `log-${i}`,
              user_id: 'test-user',
              date: todayStr,
              duration: 60,
              rating: 4
            }))
            
            const goal = { target_value: targetValue }
            const result = calculateGoalProgress(goal, logs, todayStr)
            
            // Verify the relationship
            if (progressCount >= targetValue) {
              expect(result.isCompleted).toBe(true)
            } else {
              expect(result.isCompleted).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('percentage should never exceed 100 even with many sessions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 50 }), // Many sessions
          targetValueArbitrary,
          (sessionCount, targetValue) => {
            // Create many logs
            const logs = Array.from({ length: sessionCount }, (_, i) => ({
              id: `log-${i}`,
              user_id: 'test-user',
              date: todayStr,
              duration: 60,
              rating: 4
            }))
            
            const goal = { target_value: targetValue }
            const result = calculateGoalProgress(goal, logs, todayStr)
            
            // Percentage should be capped at 100
            expect(result.percentage).toBe(100)
            expect(result.isCompleted).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle different days of the week correctly', () => {
      // Test with different reference dates (different days of week)
      const daysOfWeek = [
        '2024-12-02', // Monday
        '2024-12-03', // Tuesday
        '2024-12-04', // Wednesday
        '2024-12-05', // Thursday
        '2024-12-06', // Friday
        '2024-12-07', // Saturday
        '2024-12-08', // Sunday
      ]
      
      fc.assert(
        fc.property(
          fc.constantFrom(...daysOfWeek),
          targetValueArbitrary,
          (testDateStr, targetValue) => {
            const testWeekStartStr = getWeekStartStr(testDateStr)
            
            // Create a log on Monday of that week
            const logs = [{
              id: 'log-1',
              user_id: 'test-user',
              date: testWeekStartStr,
              duration: 60,
              rating: 4
            }]
            
            const goal = { target_value: targetValue }
            const result = calculateGoalProgress(goal, logs, testDateStr)
            
            // Should count the Monday log regardless of which day we're checking
            expect(result.progress).toBe(1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
