/**
 * Streak Calculation Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Streak Calculation
 * 
 * **Feature: training-logs-enhancement, Property 4: Streak calculation correctness**
 * **Validates: Requirements 4.1, 4.2**
 * 
 * For any sequence of training log dates for a user, the streak counter should
 * equal the number of consecutive days ending with today (or yesterday if no log today),
 * and should reset to zero when there's a gap of more than one day.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Test Helpers and Arbitraries
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
 * Parse a date string to Date object (avoiding timezone issues)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} - Date object
 */
function parseDateStr(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get date string for N days before a reference date
 * @param {string} refDateStr - Reference date string
 * @param {number} daysBack - Number of days to go back
 * @returns {string} - Date string
 */
function getDateNDaysBack(refDateStr, daysBack) {
  const date = parseDateStr(refDateStr)
  date.setDate(date.getDate() - daysBack)
  return formatDateStr(date)
}

// ============================================================================
// Pure Functions for Testing (simulating streak calculation)
// ============================================================================

/**
 * Calculate consecutive training days streak
 * This is a pure function that mirrors the store's calculateStreak logic
 * 
 * Property 4: Streak calculation correctness
 * - Streak equals consecutive days ending with today or yesterday
 * - Resets to zero when there's a gap of more than one day
 * 
 * @param {Array} trainingLogs - Array of training logs with dates
 * @param {string} todayStr - Today's date string (YYYY-MM-DD)
 * @returns {number} - Number of consecutive days
 */
function calculateStreak(trainingLogs, todayStr) {
  if (!trainingLogs || trainingLogs.length === 0) {
    return 0
  }

  // Get unique dates sorted in descending order (most recent first)
  const uniqueDates = [...new Set(trainingLogs.map(log => log.date))].sort().reverse()
  
  const today = parseDateStr(todayStr)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = formatDateStr(yesterday)

  // Check if the most recent log is today or yesterday
  const mostRecentDate = uniqueDates[0]
  if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
    // Streak is broken - gap of more than one day
    return 0
  }

  // Count consecutive days
  let streak = 0
  let checkDate = mostRecentDate === todayStr ? today : yesterday

  for (const dateStr of uniqueDates) {
    const expectedDateStr = formatDateStr(checkDate)
    
    if (dateStr === expectedDateStr) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (dateStr < expectedDateStr) {
      // Gap found, streak ends
      break
    }
    // If dateStr > expectedDateStr, skip (duplicate date handling)
  }

  return streak
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Streak Calculation Property Tests', () => {

  /**
   * **Feature: training-logs-enhancement, Property 4: Streak calculation correctness**
   * **Validates: Requirements 4.1, 4.2**
   */
  describe('Property 4: Streak calculation correctness', () => {
    
    // Use a fixed reference date for consistent testing (Monday, Dec 2, 2024)
    const todayStr = '2024-12-02'
    const yesterdayStr = getDateNDaysBack(todayStr, 1)


    /**
     * Arbitrary for generating consecutive day sequences starting from today or yesterday
     * @param {number} maxDays - Maximum number of consecutive days
     * @param {string} startDateStr - Starting date (today or yesterday)
     * @returns {fc.Arbitrary} - Arbitrary that generates arrays of date strings
     */
    function consecutiveDaysArbitrary(maxDays, startDateStr) {
      return fc.integer({ min: 0, max: maxDays }).map(numDays => {
        const dates = []
        for (let i = 0; i < numDays; i++) {
          dates.push(getDateNDaysBack(startDateStr, i))
        }
        return dates
      })
    }

    /**
     * Create training logs from date strings
     * @param {string[]} dates - Array of date strings
     * @returns {Array} - Array of training log objects
     */
    function createLogsFromDates(dates) {
      return dates.map((date, i) => ({
        id: `log-${i}`,
        user_id: 'test-user',
        date,
        duration: 60,
        rating: 4
      }))
    }

    it('streak should equal consecutive days when starting from today', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }), // Number of consecutive days
          (numDays) => {
            // Create consecutive days starting from today
            const dates = []
            for (let i = 0; i < numDays; i++) {
              dates.push(getDateNDaysBack(todayStr, i))
            }
            const logs = createLogsFromDates(dates)
            
            const streak = calculateStreak(logs, todayStr)
            
            // Property: streak should equal the number of consecutive days
            expect(streak).toBe(numDays)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('streak should equal consecutive days when starting from yesterday', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }), // Number of consecutive days
          (numDays) => {
            // Create consecutive days starting from yesterday (no log today)
            const dates = []
            for (let i = 0; i < numDays; i++) {
              dates.push(getDateNDaysBack(yesterdayStr, i))
            }
            const logs = createLogsFromDates(dates)
            
            const streak = calculateStreak(logs, todayStr)
            
            // Property: streak should equal the number of consecutive days
            expect(streak).toBe(numDays)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('streak should reset to zero when most recent log is more than 1 day ago', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 30 }), // Days since last log (at least 2 days ago)
          fc.integer({ min: 1, max: 10 }), // Number of consecutive days in old streak
          (daysAgo, oldStreakLength) => {
            // Create logs starting from daysAgo (more than 1 day ago)
            const startDate = getDateNDaysBack(todayStr, daysAgo)
            const dates = []
            for (let i = 0; i < oldStreakLength; i++) {
              dates.push(getDateNDaysBack(startDate, i))
            }
            const logs = createLogsFromDates(dates)
            
            const streak = calculateStreak(logs, todayStr)
            
            // Property: streak should be 0 when gap > 1 day
            expect(streak).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('streak should stop counting when a gap is found', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Days before gap
          fc.integer({ min: 2, max: 5 }),  // Gap size (at least 2 days)
          fc.integer({ min: 1, max: 10 }), // Days after gap
          (daysBeforeGap, gapSize, daysAfterGap) => {
            // Create consecutive days from today
            const recentDates = []
            for (let i = 0; i < daysBeforeGap; i++) {
              recentDates.push(getDateNDaysBack(todayStr, i))
            }
            
            // Create older dates with a gap
            const gapStartDay = daysBeforeGap + gapSize - 1
            const olderDates = []
            for (let i = 0; i < daysAfterGap; i++) {
              olderDates.push(getDateNDaysBack(todayStr, gapStartDay + i))
            }
            
            const logs = createLogsFromDates([...recentDates, ...olderDates])
            
            const streak = calculateStreak(logs, todayStr)
            
            // Property: streak should only count days before the gap
            expect(streak).toBe(daysBeforeGap)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('streak should be zero for empty logs', () => {
      const streak = calculateStreak([], todayStr)
      expect(streak).toBe(0)
    })

    it('streak should be zero for null/undefined logs', () => {
      expect(calculateStreak(null, todayStr)).toBe(0)
      expect(calculateStreak(undefined, todayStr)).toBe(0)
    })

    it('multiple logs on same day should count as one day', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),  // Number of consecutive days
          fc.integer({ min: 2, max: 5 }),  // Number of logs per day
          (numDays, logsPerDay) => {
            // Create multiple logs per day for consecutive days
            const logs = []
            for (let day = 0; day < numDays; day++) {
              const dateStr = getDateNDaysBack(todayStr, day)
              for (let logNum = 0; logNum < logsPerDay; logNum++) {
                logs.push({
                  id: `log-${day}-${logNum}`,
                  user_id: 'test-user',
                  date: dateStr,
                  duration: 60,
                  rating: 4
                })
              }
            }
            
            const streak = calculateStreak(logs, todayStr)
            
            // Property: streak should equal number of unique days, not total logs
            expect(streak).toBe(numDays)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('streak should handle unsorted logs correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Number of consecutive days
          (numDays) => {
            // Create consecutive days and shuffle them
            const dates = []
            for (let i = 0; i < numDays; i++) {
              dates.push(getDateNDaysBack(todayStr, i))
            }
            
            // Shuffle the dates
            const shuffledDates = [...dates].sort(() => Math.random() - 0.5)
            const logs = createLogsFromDates(shuffledDates)
            
            const streak = calculateStreak(logs, todayStr)
            
            // Property: streak should be correct regardless of log order
            expect(streak).toBe(numDays)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('streak should be 1 when only today has a log', () => {
      const logs = createLogsFromDates([todayStr])
      const streak = calculateStreak(logs, todayStr)
      expect(streak).toBe(1)
    })

    it('streak should be 1 when only yesterday has a log', () => {
      const logs = createLogsFromDates([yesterdayStr])
      const streak = calculateStreak(logs, todayStr)
      expect(streak).toBe(1)
    })

    it('streak should increment when logging on consecutive days (Requirement 4.1)', () => {
      // Test the property that logging on consecutive days increments streak
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 29 }), // Current streak length
          (currentStreakLength) => {
            // Create current streak
            const dates = []
            for (let i = 0; i < currentStreakLength; i++) {
              dates.push(getDateNDaysBack(yesterdayStr, i))
            }
            const logsBeforeToday = createLogsFromDates(dates)
            
            // Calculate streak before adding today's log
            const streakBefore = calculateStreak(logsBeforeToday, todayStr)
            
            // Add today's log
            const logsWithToday = [...logsBeforeToday, { 
              id: 'today-log', 
              user_id: 'test-user', 
              date: todayStr, 
              duration: 60, 
              rating: 4 
            }]
            
            // Calculate streak after adding today's log
            const streakAfter = calculateStreak(logsWithToday, todayStr)
            
            // Property: adding a log on the next consecutive day should increment streak by 1
            expect(streakAfter).toBe(streakBefore + 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('streak should reset when missing a day (Requirement 4.2)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // Old streak length
          (oldStreakLength) => {
            // Create an old streak that ended 2 days ago
            const twoDaysAgo = getDateNDaysBack(todayStr, 2)
            const dates = []
            for (let i = 0; i < oldStreakLength; i++) {
              dates.push(getDateNDaysBack(twoDaysAgo, i))
            }
            const oldLogs = createLogsFromDates(dates)
            
            // Streak should be 0 because there's a gap
            const streakWithGap = calculateStreak(oldLogs, todayStr)
            expect(streakWithGap).toBe(0)
            
            // Now add today's log - streak should start fresh at 1
            const logsWithToday = [...oldLogs, {
              id: 'today-log',
              user_id: 'test-user',
              date: todayStr,
              duration: 60,
              rating: 4
            }]
            
            const newStreak = calculateStreak(logsWithToday, todayStr)
            
            // Property: after missing a day, new log starts streak at 1
            expect(newStreak).toBe(1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('streak should be non-negative', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              user_id: fc.uuid(),
              date: fc.integer({ min: 0, max: 100 }).map(daysBack => 
                getDateNDaysBack(todayStr, daysBack)
              ),
              duration: fc.integer({ min: 15, max: 180 }),
              rating: fc.integer({ min: 1, max: 5 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (logs) => {
            const streak = calculateStreak(logs, todayStr)
            
            // Property: streak should always be >= 0
            expect(streak).toBeGreaterThanOrEqual(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('streak should not exceed total number of unique log dates', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              user_id: fc.uuid(),
              date: fc.integer({ min: 0, max: 30 }).map(daysBack => 
                getDateNDaysBack(todayStr, daysBack)
              ),
              duration: fc.integer({ min: 15, max: 180 }),
              rating: fc.integer({ min: 1, max: 5 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (logs) => {
            const streak = calculateStreak(logs, todayStr)
            const uniqueDates = new Set(logs.map(log => log.date))
            
            // Property: streak should not exceed number of unique dates
            expect(streak).toBeLessThanOrEqual(uniqueDates.size)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
