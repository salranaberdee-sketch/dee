/**
 * Category Deactivation Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับการ Deactivate หมวดหมู่กิจกรรม
 * 
 * **Feature: training-logs-enhancement, Property 7: Category deactivation preserves existing logs**
 * **Validates: Requirements 6.3**
 * 
 * For any category that is deactivated, existing training logs with that category
 * should retain their category_id, but the category should not appear in the
 * active categories list for new entries.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * Generate a category object
 */
const categoryArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.constantFrom('run', 'swim', 'weight', 'stretch', 'sport', 'other'),
  is_active: fc.boolean(),
  sort_order: fc.integer({ min: 0, max: 100 })
})

/**
 * Generate an array of categories with at least one active
 */
const categoriesArbitrary = fc.array(categoryArbitrary, { minLength: 1, maxLength: 10 })
  .filter(cats => cats.some(c => c.is_active)) // Ensure at least one active

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
 * Generate a training log with a category reference
 */
const trainingLogArbitrary = (categoryIds) => fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  date: dateArbitrary,
  duration: fc.integer({ min: 15, max: 180 }),
  rating: fc.integer({ min: 1, max: 5 }),
  category_id: fc.constantFrom(...categoryIds, null),
  custom_activity: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null })
})

// ============================================================================
// Pure Functions for Testing (simulating category deactivation behavior)
// ============================================================================

/**
 * Get active categories from a list
 * This mirrors the store's fetchActivityCategories logic
 * 
 * @param {Array} categories - All categories
 * @returns {Array} Active categories only
 */
function getActiveCategories(categories) {
  return categories.filter(cat => cat.is_active === true)
}

/**
 * Deactivate a category (set is_active to false)
 * This mirrors the store's updateActivityCategory logic
 * 
 * @param {Array} categories - All categories
 * @param {string} categoryId - Category ID to deactivate
 * @returns {Array} Updated categories array
 */
function deactivateCategory(categories, categoryId) {
  return categories.map(cat => 
    cat.id === categoryId 
      ? { ...cat, is_active: false }
      : cat
  )
}

/**
 * Check if training logs preserve their category_id after deactivation
 * 
 * @param {Array} logsBeforeDeactivation - Training logs before category deactivation
 * @param {Array} logsAfterDeactivation - Training logs after category deactivation
 * @returns {boolean} True if all category_ids are preserved
 */
function logsPreserveCategoryId(logsBeforeDeactivation, logsAfterDeactivation) {
  if (logsBeforeDeactivation.length !== logsAfterDeactivation.length) {
    return false
  }
  
  return logsBeforeDeactivation.every((logBefore, index) => {
    const logAfter = logsAfterDeactivation.find(l => l.id === logBefore.id)
    return logAfter && logAfter.category_id === logBefore.category_id
  })
}

/**
 * Simulate the full deactivation process
 * Returns the state after deactivation
 * 
 * @param {Array} categories - All categories
 * @param {Array} trainingLogs - All training logs
 * @param {string} categoryIdToDeactivate - Category ID to deactivate
 * @returns {Object} { categories, trainingLogs, activeCategories }
 */
function simulateDeactivation(categories, trainingLogs, categoryIdToDeactivate) {
  // Deactivate the category
  const updatedCategories = deactivateCategory(categories, categoryIdToDeactivate)
  
  // Training logs remain unchanged (category_id preserved)
  const updatedLogs = [...trainingLogs]
  
  // Active categories list excludes deactivated category
  const activeCategories = getActiveCategories(updatedCategories)
  
  return {
    categories: updatedCategories,
    trainingLogs: updatedLogs,
    activeCategories
  }
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Category Deactivation Property Tests', () => {

  /**
   * **Feature: training-logs-enhancement, Property 7: Category deactivation preserves existing logs**
   * **Validates: Requirements 6.3**
   */
  describe('Property 7: Category deactivation preserves existing logs', () => {

    it('existing training logs should retain their category_id after category deactivation', () => {
      fc.assert(
        fc.property(
          categoriesArbitrary,
          fc.context(),
          (categories, ctx) => {
            // Get category IDs for generating logs
            const categoryIds = categories.map(c => c.id)
            
            // Generate training logs with these categories
            const logsArbitrary = fc.array(
              trainingLogArbitrary(categoryIds),
              { minLength: 1, maxLength: 20 }
            )
            
            return fc.assert(
              fc.property(logsArbitrary, (trainingLogs) => {
                // Pick a category to deactivate (prefer active ones)
                const activeCategories = getActiveCategories(categories)
                if (activeCategories.length === 0) return true // Skip if no active categories
                
                const categoryToDeactivate = activeCategories[0]
                
                // Store original category_ids
                const originalCategoryIds = trainingLogs.map(log => ({
                  id: log.id,
                  category_id: log.category_id
                }))
                
                // Simulate deactivation
                const result = simulateDeactivation(
                  categories,
                  trainingLogs,
                  categoryToDeactivate.id
                )
                
                // Property: All logs should preserve their original category_id
                result.trainingLogs.forEach(log => {
                  const original = originalCategoryIds.find(o => o.id === log.id)
                  expect(log.category_id).toBe(original.category_id)
                })
                
                return true
              }),
              { numRuns: 10 } // Inner property runs
            )
          }
        ),
        { numRuns: 10 } // Outer property runs (total ~100 combinations)
      )
    })

    it('deactivated category should not appear in active categories list', () => {
      fc.assert(
        fc.property(
          categoriesArbitrary,
          (categories) => {
            // Get active categories before deactivation
            const activeBefore = getActiveCategories(categories)
            if (activeBefore.length === 0) return true // Skip if no active categories
            
            // Pick a category to deactivate
            const categoryToDeactivate = activeBefore[0]
            
            // Deactivate the category
            const updatedCategories = deactivateCategory(categories, categoryToDeactivate.id)
            const activeAfter = getActiveCategories(updatedCategories)
            
            // Property: Deactivated category should not be in active list
            const deactivatedInActiveList = activeAfter.some(
              cat => cat.id === categoryToDeactivate.id
            )
            expect(deactivatedInActiveList).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('logs with deactivated category should still be queryable', () => {
      fc.assert(
        fc.property(
          categoriesArbitrary,
          fc.context(),
          (categories, ctx) => {
            const categoryIds = categories.map(c => c.id)
            const logsArbitrary = fc.array(
              trainingLogArbitrary(categoryIds),
              { minLength: 1, maxLength: 20 }
            )
            
            return fc.assert(
              fc.property(logsArbitrary, (trainingLogs) => {
                const activeCategories = getActiveCategories(categories)
                if (activeCategories.length === 0) return true
                
                const categoryToDeactivate = activeCategories[0]
                
                // Count logs with this category before deactivation
                const logsWithCategory = trainingLogs.filter(
                  log => log.category_id === categoryToDeactivate.id
                )
                
                // Simulate deactivation
                const result = simulateDeactivation(
                  categories,
                  trainingLogs,
                  categoryToDeactivate.id
                )
                
                // Count logs with this category after deactivation
                const logsWithCategoryAfter = result.trainingLogs.filter(
                  log => log.category_id === categoryToDeactivate.id
                )
                
                // Property: Same number of logs should have the deactivated category
                expect(logsWithCategoryAfter.length).toBe(logsWithCategory.length)
                
                return true
              }),
              { numRuns: 10 }
            )
          }
        ),
        { numRuns: 10 }
      )
    })

    it('other categories should remain unaffected by deactivation', () => {
      fc.assert(
        fc.property(
          categoriesArbitrary,
          (categories) => {
            const activeBefore = getActiveCategories(categories)
            if (activeBefore.length <= 1) return true // Need at least 2 active categories
            
            // Pick first category to deactivate
            const categoryToDeactivate = activeBefore[0]
            
            // Deactivate the category
            const updatedCategories = deactivateCategory(categories, categoryToDeactivate.id)
            
            // Property: Other categories should have same is_active status
            categories.forEach(originalCat => {
              if (originalCat.id !== categoryToDeactivate.id) {
                const updatedCat = updatedCategories.find(c => c.id === originalCat.id)
                expect(updatedCat.is_active).toBe(originalCat.is_active)
              }
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('active categories count should decrease by exactly 1 after deactivation', () => {
      fc.assert(
        fc.property(
          categoriesArbitrary,
          (categories) => {
            const activeBefore = getActiveCategories(categories)
            if (activeBefore.length === 0) return true
            
            // Pick an active category to deactivate
            const categoryToDeactivate = activeBefore[0]
            
            // Deactivate the category
            const updatedCategories = deactivateCategory(categories, categoryToDeactivate.id)
            const activeAfter = getActiveCategories(updatedCategories)
            
            // Property: Active count should decrease by exactly 1
            expect(activeAfter.length).toBe(activeBefore.length - 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('deactivation should be idempotent - deactivating twice has same effect', () => {
      fc.assert(
        fc.property(
          categoriesArbitrary,
          (categories) => {
            const activeBefore = getActiveCategories(categories)
            if (activeBefore.length === 0) return true
            
            const categoryToDeactivate = activeBefore[0]
            
            // Deactivate once
            const afterFirstDeactivation = deactivateCategory(categories, categoryToDeactivate.id)
            
            // Deactivate again
            const afterSecondDeactivation = deactivateCategory(afterFirstDeactivation, categoryToDeactivate.id)
            
            // Property: Both results should be identical
            expect(getActiveCategories(afterFirstDeactivation).length)
              .toBe(getActiveCategories(afterSecondDeactivation).length)
            
            // The deactivated category should still be inactive
            const catAfterFirst = afterFirstDeactivation.find(c => c.id === categoryToDeactivate.id)
            const catAfterSecond = afterSecondDeactivation.find(c => c.id === categoryToDeactivate.id)
            expect(catAfterFirst.is_active).toBe(false)
            expect(catAfterSecond.is_active).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('training log data integrity should be preserved after deactivation', () => {
      fc.assert(
        fc.property(
          categoriesArbitrary,
          fc.context(),
          (categories, ctx) => {
            const categoryIds = categories.map(c => c.id)
            const logsArbitrary = fc.array(
              trainingLogArbitrary(categoryIds),
              { minLength: 1, maxLength: 20 }
            )
            
            return fc.assert(
              fc.property(logsArbitrary, (trainingLogs) => {
                const activeCategories = getActiveCategories(categories)
                if (activeCategories.length === 0) return true
                
                const categoryToDeactivate = activeCategories[0]
                
                // Simulate deactivation
                const result = simulateDeactivation(
                  categories,
                  trainingLogs,
                  categoryToDeactivate.id
                )
                
                // Property: All log properties should be preserved
                trainingLogs.forEach(originalLog => {
                  const resultLog = result.trainingLogs.find(l => l.id === originalLog.id)
                  expect(resultLog).toBeDefined()
                  expect(resultLog.user_id).toBe(originalLog.user_id)
                  expect(resultLog.date).toBe(originalLog.date)
                  expect(resultLog.duration).toBe(originalLog.duration)
                  expect(resultLog.rating).toBe(originalLog.rating)
                  expect(resultLog.category_id).toBe(originalLog.category_id)
                  expect(resultLog.custom_activity).toBe(originalLog.custom_activity)
                })
                
                return true
              }),
              { numRuns: 10 }
            )
          }
        ),
        { numRuns: 10 }
      )
    })

    it('category can be reactivated and appear in active list again', () => {
      fc.assert(
        fc.property(
          categoriesArbitrary,
          (categories) => {
            const activeBefore = getActiveCategories(categories)
            if (activeBefore.length === 0) return true
            
            const categoryToToggle = activeBefore[0]
            
            // Deactivate
            const afterDeactivation = deactivateCategory(categories, categoryToToggle.id)
            expect(getActiveCategories(afterDeactivation).some(c => c.id === categoryToToggle.id)).toBe(false)
            
            // Reactivate (simulate by setting is_active back to true)
            const afterReactivation = afterDeactivation.map(cat =>
              cat.id === categoryToToggle.id
                ? { ...cat, is_active: true }
                : cat
            )
            
            // Property: Category should be back in active list
            expect(getActiveCategories(afterReactivation).some(c => c.id === categoryToToggle.id)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
