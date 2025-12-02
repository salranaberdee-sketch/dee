/**
 * Category Filter Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Category Filtering
 * 
 * **Feature: training-logs-enhancement, Property 1: Category filter returns only matching logs**
 * **Validates: Requirements 1.3**
 * 
 * For any set of training logs and any category filter, all returned logs
 * should have category_id matching the filter value.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

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
 * Arbitrary for generating category IDs (including null for uncategorized)
 */
const categoryIdArbitrary = fc.constantFrom(...DEFAULT_CATEGORIES.map(c => c.id), null)

/**
 * Arbitrary for generating valid category IDs only (no null)
 */
const validCategoryIdArbitrary = fc.constantFrom(...DEFAULT_CATEGORIES.map(c => c.id))

/**
 * Generate a date string within a reasonable range
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
  duration: fc.integer({ min: 15, max: 180 }),
  rating: fc.integer({ min: 1, max: 5 }),
  category_id: categoryIdArbitrary
})

/**
 * Arbitrary for generating an array of training logs
 */
const trainingLogsArbitrary = fc.array(trainingLogArbitrary, { minLength: 0, maxLength: 50 })

// ============================================================================
// Pure Functions for Testing (simulating category filtering)
// ============================================================================

/**
 * Filter training logs by category
 * This is a pure function that mirrors the store's filterLogsByCategory logic
 * 
 * @param {Array} trainingLogs - Array of training logs
 * @param {string|null} categoryId - Category ID to filter by (null returns all)
 * @returns {Array} Filtered training logs
 */
function filterLogsByCategory(trainingLogs, categoryId) {
  if (!categoryId) return trainingLogs
  return trainingLogs.filter(log => log.category_id === categoryId)
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Category Filter Property Tests', () => {

  /**
   * **Feature: training-logs-enhancement, Property 1: Category filter returns only matching logs**
   * **Validates: Requirements 1.3**
   */
  describe('Property 1: Category filter returns only matching logs', () => {

    it('all returned logs should have category_id matching the filter value', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          validCategoryIdArbitrary,
          (trainingLogs, filterCategoryId) => {
            const filteredLogs = filterLogsByCategory(trainingLogs, filterCategoryId)
            
            // Property: Every log in the result should have the matching category_id
            filteredLogs.forEach(log => {
              expect(log.category_id).toBe(filterCategoryId)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('no logs with different category_id should be included in results', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          validCategoryIdArbitrary,
          (trainingLogs, filterCategoryId) => {
            const filteredLogs = filterLogsByCategory(trainingLogs, filterCategoryId)
            
            // Count logs that should NOT be in the result
            const excludedLogs = trainingLogs.filter(log => log.category_id !== filterCategoryId)
            
            // Property: None of the excluded logs should appear in filtered results
            excludedLogs.forEach(excludedLog => {
              const found = filteredLogs.some(log => log.id === excludedLog.id)
              expect(found).toBe(false)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('all logs with matching category_id should be included in results', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          validCategoryIdArbitrary,
          (trainingLogs, filterCategoryId) => {
            const filteredLogs = filterLogsByCategory(trainingLogs, filterCategoryId)
            
            // Count logs that SHOULD be in the result
            const expectedLogs = trainingLogs.filter(log => log.category_id === filterCategoryId)
            
            // Property: All expected logs should appear in filtered results
            expectedLogs.forEach(expectedLog => {
              const found = filteredLogs.some(log => log.id === expectedLog.id)
              expect(found).toBe(true)
            })
            
            // Property: Count should match
            expect(filteredLogs.length).toBe(expectedLogs.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filtering with null/undefined should return all logs', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          (trainingLogs) => {
            // Filter with null
            const filteredWithNull = filterLogsByCategory(trainingLogs, null)
            expect(filteredWithNull.length).toBe(trainingLogs.length)
            
            // Filter with undefined
            const filteredWithUndefined = filterLogsByCategory(trainingLogs, undefined)
            expect(filteredWithUndefined.length).toBe(trainingLogs.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filtered result count should be less than or equal to total logs', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          validCategoryIdArbitrary,
          (trainingLogs, filterCategoryId) => {
            const filteredLogs = filterLogsByCategory(trainingLogs, filterCategoryId)
            
            // Property: Filtered count <= total count
            expect(filteredLogs.length).toBeLessThanOrEqual(trainingLogs.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filtering should be idempotent - filtering twice gives same result', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          validCategoryIdArbitrary,
          (trainingLogs, filterCategoryId) => {
            const firstFilter = filterLogsByCategory(trainingLogs, filterCategoryId)
            const secondFilter = filterLogsByCategory(firstFilter, filterCategoryId)
            
            // Property: Filtering twice should give same result (idempotent)
            expect(secondFilter.length).toBe(firstFilter.length)
            
            // All items should be the same
            firstFilter.forEach((log, index) => {
              expect(secondFilter[index].id).toBe(log.id)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filtering empty logs should return empty array', () => {
      fc.assert(
        fc.property(
          validCategoryIdArbitrary,
          (filterCategoryId) => {
            const filteredLogs = filterLogsByCategory([], filterCategoryId)
            
            // Property: Empty input should give empty output
            expect(filteredLogs).toEqual([])
            expect(filteredLogs.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filtering should preserve log data integrity', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          validCategoryIdArbitrary,
          (trainingLogs, filterCategoryId) => {
            const filteredLogs = filterLogsByCategory(trainingLogs, filterCategoryId)
            
            // Property: Each filtered log should have all original properties intact
            filteredLogs.forEach(filteredLog => {
              const originalLog = trainingLogs.find(log => log.id === filteredLog.id)
              expect(originalLog).toBeDefined()
              expect(filteredLog.user_id).toBe(originalLog.user_id)
              expect(filteredLog.date).toBe(originalLog.date)
              expect(filteredLog.duration).toBe(originalLog.duration)
              expect(filteredLog.rating).toBe(originalLog.rating)
              expect(filteredLog.category_id).toBe(originalLog.category_id)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filtering by different categories should partition the logs', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          (trainingLogs) => {
            // Filter by each category
            const partitions = DEFAULT_CATEGORIES.map(cat => 
              filterLogsByCategory(trainingLogs, cat.id)
            )
            
            // Also get uncategorized logs (null category_id)
            const uncategorized = trainingLogs.filter(log => log.category_id === null)
            
            // Sum of all partitions + uncategorized should equal total
            const totalPartitioned = partitions.reduce((sum, p) => sum + p.length, 0) + uncategorized.length
            expect(totalPartitioned).toBe(trainingLogs.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('filtering should be consistent across multiple calls', () => {
      fc.assert(
        fc.property(
          trainingLogsArbitrary,
          validCategoryIdArbitrary,
          (trainingLogs, filterCategoryId) => {
            // Call filter multiple times
            const result1 = filterLogsByCategory(trainingLogs, filterCategoryId)
            const result2 = filterLogsByCategory(trainingLogs, filterCategoryId)
            const result3 = filterLogsByCategory(trainingLogs, filterCategoryId)
            
            // Property: Same input should always produce same output (deterministic)
            expect(result1.length).toBe(result2.length)
            expect(result2.length).toBe(result3.length)
            
            result1.forEach((log, index) => {
              expect(result2[index].id).toBe(log.id)
              expect(result3[index].id).toBe(log.id)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
