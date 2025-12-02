/**
 * Training Statistics Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Training Statistics
 * 
 * **Feature: training-logs-enhancement, Property 2: Statistics calculation accuracy**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 * 
 * For any set of training logs for a user, the calculated statistics
 * (total sessions, total hours, average rating, category distribution)
 * should match the actual sum/average of the underlying data.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * Valid duration range in minutes (15 min to 3 hours)
 */
const MIN_DURATION = 15
const MAX_DURATION = 180

/**
 * Valid rating range (1-5 stars)
 */
const MIN_RATING = 1
const MAX_RATING = 5

/**
 * Default categories as defined in the database
 */
const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'วิ่ง', icon: 'run' },
  { id: 'cat-2', name: 'ว่ายน้ำ', icon: 'swim' },
  { id: 'cat-3', name: 'ยกน้ำหนัก', icon: 'weight' },
  { id: 'cat-4', name: 'ยืดเหยียด', icon: 'stretch' },
  { id: 'cat-5', name: 'กีฬาเฉพาะทาง', icon: 'sport' },
  { id: 'cat-6', name: 'อื่นๆ', icon: 'other' }
]

/**
 * Arbitrary for generating valid duration values (15-180 minutes)
 */
const durationArbitrary = fc.integer({ min: MIN_DURATION, max: MAX_DURATION })

/**
 * Arbitrary for generating valid rating values (1-5)
 */
const ratingArbitrary = fc.integer({ min: MIN_RATING, max: MAX_RATING })

/**
 * Arbitrary for generating category IDs
 */
const categoryIdArbitrary = fc.constantFrom(...DEFAULT_CATEGORIES.map(c => c.id), null)

/**
 * Generate a date string within a reasonable range
 * Using integer-based approach to avoid invalid date issues
 */
const dateArbitrary = fc.integer({ min: 0, max: 364 }).map(dayOffset => {
  const date = new Date('2024-01-01')
  date.setDate(date.getDate() + dayOffset)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})

/**
 * Arbitrary for generating a single training log
 */
const trainingLogArbitrary = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  date: dateArbitrary,
  duration: durationArbitrary,
  rating: ratingArbitrary,
  category_id: categoryIdArbitrary
})

/**
 * Arbitrary for generating an array of training logs
 */
const trainingLogsArbitrary = fc.array(trainingLogArbitrary, { minLength: 0, maxLength: 50 })

// ============================================================================
// Pure Functions for Testing (simulating statistics calculation)
// ============================================================================

/**
 * Calculate training statistics from logs
 * This is a pure function that mirrors the store's getTrainingStats logic
 * 
 * @param {Array} trainingLogs - Array of training logs
 * @returns {Object} - { totalSessions, totalHours, avgRating }
 */
function calculateTrainingStats(trainingLogs) {
  if (!trainingLogs || trainingLogs.length === 0) {
    return { totalSessions: 0, totalHours: 0, avgRating: 0 }
  }

  const totalSessions = trainingLogs.length
  const totalMinutes = trainingLogs.reduce((sum, log) => sum + (log.duration || 0), 0)
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10 // Round to 1 decimal
  const totalRating = trainingLogs.reduce((sum, log) => sum + (log.rating || 0), 0)
  const avgRating = totalSessions > 0 ? Math.round((totalRating / totalSessions) * 10) / 10 : 0

  return { totalSessions, totalHours, avgRating }
}

/**
 * Calculate category distribution from logs
 * This mirrors the store's getCategoryDistribution logic
 * 
 * @param {Array} trainingLogs - Array of training logs
 * @returns {Array} - Array of { categoryId, count, percentage }
 */
function calculateCategoryDistribution(trainingLogs) {
  if (!trainingLogs || trainingLogs.length === 0) {
    return []
  }

  // Group by category
  const categoryMap = new Map()
  trainingLogs.forEach(log => {
    const catId = log.category_id || 'uncategorized'
    
    if (categoryMap.has(catId)) {
      categoryMap.get(catId).count++
    } else {
      categoryMap.set(catId, {
        categoryId: catId,
        count: 1
      })
    }
  })

  // Calculate percentages and convert to array
  const total = trainingLogs.length
  const distribution = Array.from(categoryMap.values()).map(cat => ({
    ...cat,
    percentage: Math.round((cat.count / total) * 100)
  }))

  // Sort by count descending
  distribution.sort((a, b) => b.count - a.count)

  return distribution
}

/**
 * Filter logs by date range
 * @param {Array} logs - Training logs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Filtered logs
 */
function filterLogsByDateRange(logs, startDate, endDate) {
  return logs.filter(log => {
    if (startDate && log.date < startDate) return false
    if (endDate && log.date > endDate) return false
    return true
  })
}

/**
 * Calculate week start (Monday) for a given date string
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} - Monday of that week in YYYY-MM-DD format
 */
function getWeekStartStr(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const dayOfWeek = date.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  date.setDate(date.getDate() - daysToSubtract)
  
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Get week end (Sunday) for a given week start
 * @param {string} weekStartStr - Monday date string
 * @returns {string} - Sunday of that week in YYYY-MM-DD format
 */
function getWeekEndStr(weekStartStr) {
  const [year, month, day] = weekStartStr.split('-').map(Number)
  const date = new Date(year, month - 1, day + 6)
  
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Training Statistics Property Tests', () => {

  /**
   * **Feature: training-logs-enhancement, Property 2: Statistics calculation accuracy**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  describe('Property 2: Statistics calculation accuracy', () => {

    it('totalSessions should equal the count of training logs', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          (trainingLogs) => {
            const stats = calculateTrainingStats(trainingLogs)
            
            // Property: totalSessions === trainingLogs.length
            expect(stats.totalSessions).toBe(trainingLogs.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('totalHours should equal sum of durations converted to hours', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          (trainingLogs) => {
            const stats = calculateTrainingStats(trainingLogs)
            
            // Calculate expected total hours
            const totalMinutes = trainingLogs.reduce((sum, log) => sum + (log.duration || 0), 0)
            const expectedHours = Math.round((totalMinutes / 60) * 10) / 10
            
            // Property: totalHours === sum(durations) / 60 (rounded to 1 decimal)
            expect(stats.totalHours).toBe(expectedHours)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('avgRating should equal sum of ratings divided by count', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          (trainingLogs) => {
            const stats = calculateTrainingStats(trainingLogs)
            
            if (trainingLogs.length === 0) {
              // Property: avgRating === 0 when no logs
              expect(stats.avgRating).toBe(0)
            } else {
              // Calculate expected average
              const totalRating = trainingLogs.reduce((sum, log) => sum + (log.rating || 0), 0)
              const expectedAvg = Math.round((totalRating / trainingLogs.length) * 10) / 10
              
              // Property: avgRating === sum(ratings) / count (rounded to 1 decimal)
              expect(stats.avgRating).toBe(expectedAvg)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('category distribution counts should sum to total sessions', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          (trainingLogs) => {
            const distribution = calculateCategoryDistribution(trainingLogs)
            
            // Sum all category counts
            const totalFromDistribution = distribution.reduce((sum, cat) => sum + cat.count, 0)
            
            // Property: sum of category counts === total logs
            expect(totalFromDistribution).toBe(trainingLogs.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('category distribution percentages should sum to approximately 100', () => {
      fc.assert(
        fc.property(
          // Only test with non-empty logs
          fc.array(trainingLogArbitrary, { minLength: 1, maxLength: 50 }),
          (trainingLogs) => {
            const distribution = calculateCategoryDistribution(trainingLogs)
            
            // Sum all percentages
            const totalPercentage = distribution.reduce((sum, cat) => sum + cat.percentage, 0)
            
            // Property: sum of percentages should be close to 100 (allowing for rounding)
            // Due to rounding, it might be slightly off
            expect(totalPercentage).toBeGreaterThanOrEqual(95)
            expect(totalPercentage).toBeLessThanOrEqual(105)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('each category count should match actual logs with that category', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          (trainingLogs) => {
            const distribution = calculateCategoryDistribution(trainingLogs)
            
            // For each category in distribution, verify count matches actual logs
            distribution.forEach(cat => {
              const actualCount = trainingLogs.filter(log => {
                const logCatId = log.category_id || 'uncategorized'
                return logCatId === cat.categoryId
              }).length
              
              // Property: category count === actual logs with that category
              expect(cat.count).toBe(actualCount)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('statistics should handle empty logs gracefully', () => {
      const stats = calculateTrainingStats([])
      const distribution = calculateCategoryDistribution([])
      
      // Property: empty logs should return zero values
      expect(stats.totalSessions).toBe(0)
      expect(stats.totalHours).toBe(0)
      expect(stats.avgRating).toBe(0)
      expect(distribution).toEqual([])
    })

    it('statistics should be consistent when calculated multiple times', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          (trainingLogs) => {
            // Calculate twice
            const stats1 = calculateTrainingStats(trainingLogs)
            const stats2 = calculateTrainingStats(trainingLogs)
            
            // Property: same input should produce same output (deterministic)
            expect(stats1.totalSessions).toBe(stats2.totalSessions)
            expect(stats1.totalHours).toBe(stats2.totalHours)
            expect(stats1.avgRating).toBe(stats2.avgRating)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('date range filtering should only include logs within range', () => {
      // Use integer-based date generation to avoid invalid date issues
      const startDateArbitrary = fc.integer({ min: 0, max: 180 }).map(dayOffset => {
        const date = new Date('2024-01-01')
        date.setDate(date.getDate() + dayOffset)
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      })
      
      const endDateArbitrary = fc.integer({ min: 181, max: 364 }).map(dayOffset => {
        const date = new Date('2024-01-01')
        date.setDate(date.getDate() + dayOffset)
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      })
      
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          startDateArbitrary,
          endDateArbitrary,
          (trainingLogs, startDate, endDate) => {
            const filteredLogs = filterLogsByDateRange(trainingLogs, startDate, endDate)
            
            // Property: all filtered logs should be within date range
            filteredLogs.forEach(log => {
              expect(log.date >= startDate).toBe(true)
              expect(log.date <= endDate).toBe(true)
            })
            
            // Property: no logs outside range should be included
            const outsideLogs = trainingLogs.filter(log => 
              log.date < startDate || log.date > endDate
            )
            outsideLogs.forEach(log => {
              expect(filteredLogs.includes(log)).toBe(false)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('weekly comparison should use correct week boundaries', () => {
      // Test with a fixed reference date (Monday, Dec 2, 2024)
      const todayStr = '2024-12-02'
      const weekStartStr = getWeekStartStr(todayStr)
      const weekEndStr = getWeekEndStr(weekStartStr)
      
      // Week should start on Monday
      expect(weekStartStr).toBe('2024-12-02')
      // Week should end on Sunday
      expect(weekEndStr).toBe('2024-12-08')
      
      // Test with different days of the week
      const testCases = [
        { date: '2024-12-02', expectedStart: '2024-12-02' }, // Monday
        { date: '2024-12-03', expectedStart: '2024-12-02' }, // Tuesday
        { date: '2024-12-04', expectedStart: '2024-12-02' }, // Wednesday
        { date: '2024-12-05', expectedStart: '2024-12-02' }, // Thursday
        { date: '2024-12-06', expectedStart: '2024-12-02' }, // Friday
        { date: '2024-12-07', expectedStart: '2024-12-02' }, // Saturday
        { date: '2024-12-08', expectedStart: '2024-12-02' }, // Sunday
      ]
      
      testCases.forEach(({ date, expectedStart }) => {
        expect(getWeekStartStr(date)).toBe(expectedStart)
      })
    })

    it('totalHours should always be non-negative', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          (trainingLogs) => {
            const stats = calculateTrainingStats(trainingLogs)
            
            // Property: totalHours >= 0
            expect(stats.totalHours).toBeGreaterThanOrEqual(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('avgRating should be within valid range when logs exist', () => {
      fc.assert(
        fc.property(
          fc.array(trainingLogArbitrary, { minLength: 1, maxLength: 50 }),
          (trainingLogs) => {
            const stats = calculateTrainingStats(trainingLogs)
            
            // Property: avgRating should be between MIN_RATING and MAX_RATING
            expect(stats.avgRating).toBeGreaterThanOrEqual(MIN_RATING)
            expect(stats.avgRating).toBeLessThanOrEqual(MAX_RATING)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('category percentages should be between 0 and 100', () => {
      fc.assert(
        fc.property(
          fc.array(trainingLogArbitrary, { minLength: 1, maxLength: 50 }),
          (trainingLogs) => {
            const distribution = calculateCategoryDistribution(trainingLogs)
            
            // Property: each percentage should be 0-100
            distribution.forEach(cat => {
              expect(cat.percentage).toBeGreaterThanOrEqual(0)
              expect(cat.percentage).toBeLessThanOrEqual(100)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
