/**
 * Notification Inbox Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Notification Inbox
 * 
 * Tests for:
 * - Property 1: Notification storage round-trip
 * - Property 2: Notifications sorted by date descending
 * - Property 3: Pagination returns correct subsets
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * Valid notification types as defined in the database schema
 */
const VALID_NOTIFICATION_TYPES = [
  'announcement_urgent',
  'announcement_normal',
  'schedule_updates',
  'event_reminders',
  'tournament_updates',
  'club_application'
]

/**
 * Valid reference types for notifications
 */
const VALID_REFERENCE_TYPES = [
  'announcement',
  'schedule',
  'tournament',
  'club_application',
  'event',
  'athlete',
  'training'
]

/**
 * Arbitrary for generating valid notification types
 */
const notificationTypeArbitrary = fc.constantFrom(...VALID_NOTIFICATION_TYPES)

/**
 * Arbitrary for generating valid reference types
 */
const referenceTypeArbitrary = fc.constantFrom(...VALID_REFERENCE_TYPES)

/**
 * Arbitrary for generating valid notification data
 * Matches the notification_history table schema
 */
const notificationDataArbitrary = fc.record({
  user_id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  message: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
  type: notificationTypeArbitrary,
  reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
  reference_id: fc.option(fc.uuid(), { nil: null })
})

// ============================================================================
// Pure Functions for Testing (simulating database operations)
// ============================================================================

/**
 * Simulate storing a notification to the database
 * This represents what the Edge Function does when inserting a notification
 * 
 * @param {Object} notificationData - The notification data to store
 * @returns {Object} - The stored notification with generated fields
 */
function simulateStoreNotification(notificationData) {
  // Simulate database INSERT behavior
  // The database adds: id, created_at, and read_at defaults to null
  return {
    id: crypto.randomUUID(),
    user_id: notificationData.user_id,
    title: notificationData.title,
    message: notificationData.message,
    type: notificationData.type,
    reference_type: notificationData.reference_type,
    reference_id: notificationData.reference_id,
    read_at: null,
    created_at: new Date().toISOString()
  }
}

/**
 * Simulate retrieving a notification from the database
 * This represents what the Pinia store does when fetching notifications
 * 
 * @param {Object} storedNotification - The notification as stored in DB
 * @returns {Object} - The retrieved notification
 */
function simulateRetrieveNotification(storedNotification) {
  // Simulate database SELECT behavior
  // Returns the exact same data (no transformation)
  return {
    id: storedNotification.id,
    user_id: storedNotification.user_id,
    title: storedNotification.title,
    message: storedNotification.message,
    type: storedNotification.type,
    reference_type: storedNotification.reference_type,
    reference_id: storedNotification.reference_id,
    read_at: storedNotification.read_at,
    created_at: storedNotification.created_at
  }
}

/**
 * Compare two notification objects for equivalence
 * Checks that all user-provided fields match
 * 
 * @param {Object} original - Original notification data
 * @param {Object} retrieved - Retrieved notification data
 * @returns {boolean} - True if equivalent
 */
function areNotificationsEquivalent(original, retrieved) {
  return (
    original.user_id === retrieved.user_id &&
    original.title === retrieved.title &&
    original.message === retrieved.message &&
    original.type === retrieved.type &&
    original.reference_type === retrieved.reference_type &&
    original.reference_id === retrieved.reference_id
  )
}

/**
 * Validate notification type is one of the allowed values
 * 
 * @param {string} type - The notification type to validate
 * @returns {boolean} - True if valid
 */
function isValidNotificationType(type) {
  return VALID_NOTIFICATION_TYPES.includes(type)
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Notification Inbox Property Tests', () => {

  /**
   * **Feature: notification-inbox, Property 1: Notification storage round-trip**
   * **Validates: Requirements 1.2**
   * 
   * For any valid notification data (title, message, type, reference),
   * storing it in the notification_history table and then retrieving it
   * should return equivalent notification data.
   */
  describe('Property 1: Notification storage round-trip', () => {
    
    it('should preserve all user-provided fields after store and retrieve', () => {
      fc.assert(
        fc.property(
          notificationDataArbitrary,
          (notificationData) => {
            // Store the notification
            const stored = simulateStoreNotification(notificationData)
            
            // Retrieve the notification
            const retrieved = simulateRetrieveNotification(stored)
            
            // Verify all user-provided fields are preserved
            expect(retrieved.user_id).toBe(notificationData.user_id)
            expect(retrieved.title).toBe(notificationData.title)
            expect(retrieved.message).toBe(notificationData.message)
            expect(retrieved.type).toBe(notificationData.type)
            expect(retrieved.reference_type).toBe(notificationData.reference_type)
            expect(retrieved.reference_id).toBe(notificationData.reference_id)
            
            // Verify equivalence using helper function
            expect(areNotificationsEquivalent(notificationData, retrieved)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate valid id and created_at on store', () => {
      fc.assert(
        fc.property(
          notificationDataArbitrary,
          (notificationData) => {
            const stored = simulateStoreNotification(notificationData)
            
            // Verify id is generated (UUID format)
            expect(stored.id).toBeDefined()
            expect(typeof stored.id).toBe('string')
            expect(stored.id.length).toBe(36) // UUID length
            
            // Verify created_at is generated
            expect(stored.created_at).toBeDefined()
            expect(typeof stored.created_at).toBe('string')
            
            // Verify read_at defaults to null
            expect(stored.read_at).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should only accept valid notification types', () => {
      fc.assert(
        fc.property(
          notificationDataArbitrary,
          (notificationData) => {
            // Verify the type is valid
            expect(isValidNotificationType(notificationData.type)).toBe(true)
            
            // Store and verify type is preserved
            const stored = simulateStoreNotification(notificationData)
            expect(isValidNotificationType(stored.type)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle notifications with and without references', () => {
      fc.assert(
        fc.property(
          notificationDataArbitrary,
          (notificationData) => {
            const stored = simulateStoreNotification(notificationData)
            const retrieved = simulateRetrieveNotification(stored)
            
            // If original has reference, retrieved should have same reference
            if (notificationData.reference_type !== null) {
              expect(retrieved.reference_type).toBe(notificationData.reference_type)
            } else {
              expect(retrieved.reference_type).toBeNull()
            }
            
            if (notificationData.reference_id !== null) {
              expect(retrieved.reference_id).toBe(notificationData.reference_id)
            } else {
              expect(retrieved.reference_id).toBeNull()
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve various string content in title and message', () => {
      // Test with strings containing various characters
      const variedStringArbitrary = fc.record({
        user_id: fc.uuid(),
        title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        type: notificationTypeArbitrary,
        reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
        reference_id: fc.option(fc.uuid(), { nil: null })
      })

      fc.assert(
        fc.property(
          variedStringArbitrary,
          (notificationData) => {
            const stored = simulateStoreNotification(notificationData)
            const retrieved = simulateRetrieveNotification(stored)
            
            // String content should be preserved exactly
            expect(retrieved.title).toBe(notificationData.title)
            expect(retrieved.message).toBe(notificationData.message)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-inbox, Property 2: Notifications sorted by date descending**
   * **Validates: Requirements 1.1**
   * 
   * For any list of notifications returned from the inbox, each notification's
   * created_at timestamp should be greater than or equal to the next notification's timestamp.
   */
  describe('Property 2: Notifications sorted by date descending', () => {
    
    /**
     * Sort notifications by created_at descending (same logic as store)
     * @param {Array} notifications - Array of notifications
     * @returns {Array} - Sorted notifications
     */
    function sortNotificationsByDateDescending(notifications) {
      return [...notifications].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )
    }

    /**
     * Check if notifications are sorted by date descending
     * @param {Array} notifications - Array of notifications
     * @returns {boolean} - True if sorted correctly
     */
    function isSortedByDateDescending(notifications) {
      if (notifications.length <= 1) return true
      
      for (let i = 0; i < notifications.length - 1; i++) {
        const currentDate = new Date(notifications[i].created_at)
        const nextDate = new Date(notifications[i + 1].created_at)
        if (currentDate < nextDate) {
          return false
        }
      }
      return true
    }

    /**
     * Generate a valid ISO date string from a timestamp in a reasonable range
     * Using integer timestamps to avoid invalid date issues
     */
    const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00.000Z').getTime()
    const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59.999Z').getTime()
    
    const validISODateArbitrary = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP })
      .map(ts => new Date(ts).toISOString())

    /**
     * Arbitrary for generating a notification with a specific timestamp
     */
    const notificationWithTimestampArbitrary = fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      type: notificationTypeArbitrary,
      reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
      reference_id: fc.option(fc.uuid(), { nil: null }),
      read_at: fc.option(validISODateArbitrary, { nil: null }),
      created_at: validISODateArbitrary
    })

    /**
     * Arbitrary for generating an array of notifications with various timestamps
     */
    const notificationArrayArbitrary = fc.array(notificationWithTimestampArbitrary, { minLength: 0, maxLength: 50 })

    it('should sort notifications by created_at in descending order', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          (notifications) => {
            // Apply the sorting function (same as store's sortedNotifications getter)
            const sorted = sortNotificationsByDateDescending(notifications)
            
            // Verify the result is sorted correctly
            expect(isSortedByDateDescending(sorted)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have each notification created_at >= next notification created_at', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          (notifications) => {
            const sorted = sortNotificationsByDateDescending(notifications)
            
            // For each consecutive pair, verify ordering
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentDate = new Date(sorted[i].created_at)
              const nextDate = new Date(sorted[i + 1].created_at)
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all notifications after sorting (no data loss)', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          (notifications) => {
            const sorted = sortNotificationsByDateDescending(notifications)
            
            // Same length
            expect(sorted.length).toBe(notifications.length)
            
            // All original IDs should be present
            const originalIds = new Set(notifications.map(n => n.id))
            const sortedIds = new Set(sorted.map(n => n.id))
            expect(sortedIds.size).toBe(originalIds.size)
            
            for (const id of originalIds) {
              expect(sortedIds.has(id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty notification list', () => {
      const emptyList = []
      const sorted = sortNotificationsByDateDescending(emptyList)
      
      expect(sorted).toEqual([])
      expect(isSortedByDateDescending(sorted)).toBe(true)
    })

    it('should handle single notification', () => {
      fc.assert(
        fc.property(
          notificationWithTimestampArbitrary,
          (notification) => {
            const sorted = sortNotificationsByDateDescending([notification])
            
            expect(sorted.length).toBe(1)
            expect(sorted[0].id).toBe(notification.id)
            expect(isSortedByDateDescending(sorted)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly sort notifications with same timestamp', () => {
      // Generate notifications with potentially same timestamps
      const sameTimestampArbitrary = fc.array(
        fc.record({
          id: fc.uuid(),
          user_id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          type: notificationTypeArbitrary,
          reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
          reference_id: fc.option(fc.uuid(), { nil: null }),
          read_at: fc.constant(null),
          // Use a small set of timestamps to increase chance of duplicates
          created_at: fc.constantFrom(
            '2024-01-01T10:00:00.000Z',
            '2024-01-01T11:00:00.000Z',
            '2024-01-01T12:00:00.000Z'
          )
        }),
        { minLength: 2, maxLength: 20 }
      )

      fc.assert(
        fc.property(
          sameTimestampArbitrary,
          (notifications) => {
            const sorted = sortNotificationsByDateDescending(notifications)
            
            // Should still be sorted (equal timestamps are allowed)
            expect(isSortedByDateDescending(sorted)).toBe(true)
            
            // All notifications should be preserved
            expect(sorted.length).toBe(notifications.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-inbox, Property 3: Pagination returns correct subsets**
   * **Validates: Requirements 1.4**
   * 
   * For any page number N and page size S, the returned notifications should be
   * exactly the items from index (N-1)*S to N*S-1 of the full sorted list,
   * and hasMore should be true if more items exist.
   */
  describe('Property 3: Pagination returns correct subsets', () => {
    
    /**
     * Generate a valid ISO date string from a timestamp in a reasonable range
     */
    const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00.000Z').getTime()
    const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59.999Z').getTime()
    
    const validISODateArbitrary = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP })
      .map(ts => new Date(ts).toISOString())

    /**
     * Arbitrary for generating a notification with a specific timestamp
     */
    const notificationWithTimestampArbitrary = fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      type: notificationTypeArbitrary,
      reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
      reference_id: fc.option(fc.uuid(), { nil: null }),
      read_at: fc.option(validISODateArbitrary, { nil: null }),
      created_at: validISODateArbitrary
    })

    /**
     * Sort notifications by created_at descending (same logic as store)
     * @param {Array} notifications - Array of notifications
     * @returns {Array} - Sorted notifications
     */
    function sortNotificationsByDateDescending(notifications) {
      return [...notifications].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )
    }

    /**
     * Simulate pagination logic (same as store's fetchNotifications)
     * Returns the correct subset for a given page and page size
     * 
     * @param {Array} allNotifications - Full sorted list of notifications
     * @param {number} page - Page number (1-based)
     * @param {number} pageSize - Number of items per page
     * @returns {{data: Array, hasMore: boolean}} - Paginated result
     */
    function paginateNotifications(allNotifications, page, pageSize) {
      // Sort first (same as store behavior)
      const sorted = sortNotificationsByDateDescending(allNotifications)
      
      // Calculate offset (0-based index)
      const offset = (page - 1) * pageSize
      
      // Get the slice for this page
      const data = sorted.slice(offset, offset + pageSize)
      
      // Check if there are more items after this page
      const hasMore = sorted.length > offset + pageSize
      
      return { data, hasMore }
    }

    /**
     * Verify that paginated data matches expected subset from full list
     * 
     * @param {Array} fullSortedList - Full sorted list
     * @param {Array} paginatedData - Data returned from pagination
     * @param {number} page - Page number (1-based)
     * @param {number} pageSize - Page size
     * @returns {boolean} - True if pagination is correct
     */
    function verifyPaginationSubset(fullSortedList, paginatedData, page, pageSize) {
      const offset = (page - 1) * pageSize
      const expectedSlice = fullSortedList.slice(offset, offset + pageSize)
      
      // Check length matches
      if (paginatedData.length !== expectedSlice.length) {
        return false
      }
      
      // Check each item matches by ID
      for (let i = 0; i < paginatedData.length; i++) {
        if (paginatedData[i].id !== expectedSlice[i].id) {
          return false
        }
      }
      
      return true
    }

    it('should return correct subset for any page and page size', () => {
      fc.assert(
        fc.property(
          // Generate array of notifications (0-100 items)
          fc.array(notificationWithTimestampArbitrary, { minLength: 0, maxLength: 100 }),
          // Generate page size (1-50)
          fc.integer({ min: 1, max: 50 }),
          // Generate page number (1-20)
          fc.integer({ min: 1, max: 20 }),
          (notifications, pageSize, page) => {
            const sorted = sortNotificationsByDateDescending(notifications)
            const { data, hasMore } = paginateNotifications(notifications, page, pageSize)
            
            // Verify the returned data is the correct subset
            expect(verifyPaginationSubset(sorted, data, page, pageSize)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return items from index (N-1)*S to N*S-1', () => {
      fc.assert(
        fc.property(
          fc.array(notificationWithTimestampArbitrary, { minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (notifications, pageSize, page) => {
            const sorted = sortNotificationsByDateDescending(notifications)
            const { data } = paginateNotifications(notifications, page, pageSize)
            
            const startIndex = (page - 1) * pageSize
            const endIndex = Math.min(startIndex + pageSize, sorted.length)
            const expectedLength = Math.max(0, endIndex - startIndex)
            
            // Verify correct number of items
            expect(data.length).toBe(expectedLength)
            
            // Verify each item is at the correct position
            for (let i = 0; i < data.length; i++) {
              expect(data[i].id).toBe(sorted[startIndex + i].id)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set hasMore to true if more items exist after current page', () => {
      fc.assert(
        fc.property(
          fc.array(notificationWithTimestampArbitrary, { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (notifications, pageSize, page) => {
            const sorted = sortNotificationsByDateDescending(notifications)
            const { hasMore } = paginateNotifications(notifications, page, pageSize)
            
            const offset = (page - 1) * pageSize
            const expectedHasMore = sorted.length > offset + pageSize
            
            expect(hasMore).toBe(expectedHasMore)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array for pages beyond available data', () => {
      fc.assert(
        fc.property(
          fc.array(notificationWithTimestampArbitrary, { minLength: 0, maxLength: 50 }),
          fc.integer({ min: 5, max: 20 }),
          (notifications, pageSize) => {
            // Calculate a page number that's definitely beyond the data
            const totalPages = Math.ceil(notifications.length / pageSize) || 1
            const beyondPage = totalPages + 5
            
            const { data, hasMore } = paginateNotifications(notifications, beyondPage, pageSize)
            
            // Should return empty array
            expect(data.length).toBe(0)
            
            // Should have no more items
            expect(hasMore).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle page 1 correctly', () => {
      fc.assert(
        fc.property(
          fc.array(notificationWithTimestampArbitrary, { minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 50 }),
          (notifications, pageSize) => {
            const sorted = sortNotificationsByDateDescending(notifications)
            const { data, hasMore } = paginateNotifications(notifications, 1, pageSize)
            
            // Page 1 should start from index 0
            const expectedLength = Math.min(pageSize, sorted.length)
            expect(data.length).toBe(expectedLength)
            
            // First item should be the first in sorted list
            if (data.length > 0) {
              expect(data[0].id).toBe(sorted[0].id)
            }
            
            // hasMore should be true if there are more items than pageSize
            expect(hasMore).toBe(sorted.length > pageSize)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle last page correctly', () => {
      fc.assert(
        fc.property(
          fc.array(notificationWithTimestampArbitrary, { minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 20 }),
          (notifications, pageSize) => {
            const sorted = sortNotificationsByDateDescending(notifications)
            const totalPages = Math.ceil(sorted.length / pageSize)
            
            const { data, hasMore } = paginateNotifications(notifications, totalPages, pageSize)
            
            // Last page should have remaining items
            const expectedStartIndex = (totalPages - 1) * pageSize
            const expectedLength = sorted.length - expectedStartIndex
            expect(data.length).toBe(expectedLength)
            
            // Last page should have hasMore = false
            expect(hasMore).toBe(false)
            
            // Verify items are from the end of the sorted list
            for (let i = 0; i < data.length; i++) {
              expect(data[i].id).toBe(sorted[expectedStartIndex + i].id)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty notification list', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 10 }),
          (pageSize, page) => {
            const { data, hasMore } = paginateNotifications([], page, pageSize)
            
            expect(data.length).toBe(0)
            expect(hasMore).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve notification data integrity through pagination', () => {
      fc.assert(
        fc.property(
          fc.array(notificationWithTimestampArbitrary, { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 20 }),
          (notifications, pageSize) => {
            const sorted = sortNotificationsByDateDescending(notifications)
            
            // Collect all items from all pages
            const allPaginatedItems = []
            let page = 1
            let hasMore = true
            
            while (hasMore && page <= 100) { // Safety limit
              const result = paginateNotifications(notifications, page, pageSize)
              allPaginatedItems.push(...result.data)
              hasMore = result.hasMore
              page++
            }
            
            // All items should be collected
            expect(allPaginatedItems.length).toBe(sorted.length)
            
            // All items should match the sorted list
            for (let i = 0; i < allPaginatedItems.length; i++) {
              expect(allPaginatedItems[i].id).toBe(sorted[i].id)
              expect(allPaginatedItems[i].title).toBe(sorted[i].title)
              expect(allPaginatedItems[i].message).toBe(sorted[i].message)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain consistent results for same page/size combination', () => {
      fc.assert(
        fc.property(
          fc.array(notificationWithTimestampArbitrary, { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 5 }),
          (notifications, pageSize, page) => {
            // Call pagination twice with same parameters
            const result1 = paginateNotifications(notifications, page, pageSize)
            const result2 = paginateNotifications(notifications, page, pageSize)
            
            // Results should be identical
            expect(result1.data.length).toBe(result2.data.length)
            expect(result1.hasMore).toBe(result2.hasMore)
            
            for (let i = 0; i < result1.data.length; i++) {
              expect(result1.data[i].id).toBe(result2.data[i].id)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-inbox, Property 4: Read status persistence round-trip**
   * **Validates: Requirements 2.1, 2.2, 2.4**
   * 
   * For any notification, marking it as read and then fetching it should return
   * read_at as non-null; marking it as unread and fetching should return read_at as null.
   */
  describe('Property 4: Read status persistence round-trip', () => {
    
    /**
     * Generate a valid ISO date string from a timestamp in a reasonable range
     */
    const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00.000Z').getTime()
    const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59.999Z').getTime()
    
    const validISODateArbitrary = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP })
      .map(ts => new Date(ts).toISOString())

    /**
     * Arbitrary for generating a notification with read/unread status
     */
    const notificationArbitrary = fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      type: notificationTypeArbitrary,
      reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
      reference_id: fc.option(fc.uuid(), { nil: null }),
      read_at: fc.option(validISODateArbitrary, { nil: null }),
      created_at: validISODateArbitrary
    })

    /**
     * Simulate marking a notification as read
     * Returns the updated notification with read_at set to current timestamp
     * 
     * @param {Object} notification - The notification to mark as read
     * @returns {Object} - Updated notification with read_at set
     */
    function simulateMarkAsRead(notification) {
      if (notification.read_at !== null) {
        // Already read, return as-is (idempotent operation)
        return { ...notification }
      }
      return {
        ...notification,
        read_at: new Date().toISOString()
      }
    }

    /**
     * Simulate marking a notification as unread
     * Returns the updated notification with read_at set to null
     * 
     * @param {Object} notification - The notification to mark as unread
     * @returns {Object} - Updated notification with read_at set to null
     */
    function simulateMarkAsUnread(notification) {
      if (notification.read_at === null) {
        // Already unread, return as-is (idempotent operation)
        return { ...notification }
      }
      return {
        ...notification,
        read_at: null
      }
    }

    /**
     * Simulate fetching a notification (returns the same notification)
     * This represents retrieving the notification from the database
     * 
     * @param {Object} notification - The notification to fetch
     * @returns {Object} - The fetched notification
     */
    function simulateFetchNotification(notification) {
      // Simulate database SELECT - returns exact same data
      return { ...notification }
    }

    it('should have read_at as non-null after marking as read and fetching', () => {
      fc.assert(
        fc.property(
          // Generate notification that is initially unread
          fc.record({
            id: fc.uuid(),
            user_id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            type: notificationTypeArbitrary,
            reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
            reference_id: fc.option(fc.uuid(), { nil: null }),
            read_at: fc.constant(null), // Initially unread
            created_at: validISODateArbitrary
          }),
          (notification) => {
            // Mark as read
            const markedAsRead = simulateMarkAsRead(notification)
            
            // Fetch the notification
            const fetched = simulateFetchNotification(markedAsRead)
            
            // read_at should be non-null
            expect(fetched.read_at).not.toBeNull()
            expect(typeof fetched.read_at).toBe('string')
            
            // Verify it's a valid ISO date string
            const parsedDate = new Date(fetched.read_at)
            expect(parsedDate.toString()).not.toBe('Invalid Date')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have read_at as null after marking as unread and fetching', () => {
      fc.assert(
        fc.property(
          // Generate notification that is initially read
          fc.record({
            id: fc.uuid(),
            user_id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            type: notificationTypeArbitrary,
            reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
            reference_id: fc.option(fc.uuid(), { nil: null }),
            read_at: validISODateArbitrary, // Initially read
            created_at: validISODateArbitrary
          }),
          (notification) => {
            // Mark as unread
            const markedAsUnread = simulateMarkAsUnread(notification)
            
            // Fetch the notification
            const fetched = simulateFetchNotification(markedAsUnread)
            
            // read_at should be null
            expect(fetched.read_at).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve read status through mark as read -> fetch round-trip', () => {
      fc.assert(
        fc.property(
          notificationArbitrary,
          (notification) => {
            // Mark as read
            const markedAsRead = simulateMarkAsRead(notification)
            
            // Fetch
            const fetched = simulateFetchNotification(markedAsRead)
            
            // read_at should be non-null after marking as read
            expect(fetched.read_at).not.toBeNull()
            
            // All other fields should be preserved
            expect(fetched.id).toBe(notification.id)
            expect(fetched.user_id).toBe(notification.user_id)
            expect(fetched.title).toBe(notification.title)
            expect(fetched.message).toBe(notification.message)
            expect(fetched.type).toBe(notification.type)
            expect(fetched.reference_type).toBe(notification.reference_type)
            expect(fetched.reference_id).toBe(notification.reference_id)
            expect(fetched.created_at).toBe(notification.created_at)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve unread status through mark as unread -> fetch round-trip', () => {
      fc.assert(
        fc.property(
          notificationArbitrary,
          (notification) => {
            // Mark as unread
            const markedAsUnread = simulateMarkAsUnread(notification)
            
            // Fetch
            const fetched = simulateFetchNotification(markedAsUnread)
            
            // read_at should be null after marking as unread
            expect(fetched.read_at).toBeNull()
            
            // All other fields should be preserved
            expect(fetched.id).toBe(notification.id)
            expect(fetched.user_id).toBe(notification.user_id)
            expect(fetched.title).toBe(notification.title)
            expect(fetched.message).toBe(notification.message)
            expect(fetched.type).toBe(notification.type)
            expect(fetched.reference_type).toBe(notification.reference_type)
            expect(fetched.reference_id).toBe(notification.reference_id)
            expect(fetched.created_at).toBe(notification.created_at)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent: marking as read twice should have same result', () => {
      fc.assert(
        fc.property(
          notificationArbitrary,
          (notification) => {
            // Mark as read once
            const markedOnce = simulateMarkAsRead(notification)
            
            // Mark as read again
            const markedTwice = simulateMarkAsRead(markedOnce)
            
            // Both should have non-null read_at
            expect(markedOnce.read_at).not.toBeNull()
            expect(markedTwice.read_at).not.toBeNull()
            
            // The read_at value should be the same (idempotent)
            expect(markedTwice.read_at).toBe(markedOnce.read_at)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent: marking as unread twice should have same result', () => {
      fc.assert(
        fc.property(
          notificationArbitrary,
          (notification) => {
            // Mark as unread once
            const markedOnce = simulateMarkAsUnread(notification)
            
            // Mark as unread again
            const markedTwice = simulateMarkAsUnread(markedOnce)
            
            // Both should have null read_at
            expect(markedOnce.read_at).toBeNull()
            expect(markedTwice.read_at).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should toggle read status correctly: read -> unread -> read', () => {
      fc.assert(
        fc.property(
          // Start with unread notification
          fc.record({
            id: fc.uuid(),
            user_id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            type: notificationTypeArbitrary,
            reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
            reference_id: fc.option(fc.uuid(), { nil: null }),
            read_at: fc.constant(null),
            created_at: validISODateArbitrary
          }),
          (notification) => {
            // Initial state: unread
            expect(notification.read_at).toBeNull()
            
            // Mark as read
            const afterRead = simulateMarkAsRead(notification)
            expect(afterRead.read_at).not.toBeNull()
            
            // Mark as unread
            const afterUnread = simulateMarkAsUnread(afterRead)
            expect(afterUnread.read_at).toBeNull()
            
            // Mark as read again
            const afterReadAgain = simulateMarkAsRead(afterUnread)
            expect(afterReadAgain.read_at).not.toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should toggle read status correctly: unread -> read -> unread', () => {
      fc.assert(
        fc.property(
          // Start with read notification
          fc.record({
            id: fc.uuid(),
            user_id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            type: notificationTypeArbitrary,
            reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
            reference_id: fc.option(fc.uuid(), { nil: null }),
            read_at: validISODateArbitrary,
            created_at: validISODateArbitrary
          }),
          (notification) => {
            // Initial state: read
            expect(notification.read_at).not.toBeNull()
            
            // Mark as unread
            const afterUnread = simulateMarkAsUnread(notification)
            expect(afterUnread.read_at).toBeNull()
            
            // Mark as read
            const afterRead = simulateMarkAsRead(afterUnread)
            expect(afterRead.read_at).not.toBeNull()
            
            // Mark as unread again
            const afterUnreadAgain = simulateMarkAsUnread(afterRead)
            expect(afterUnreadAgain.read_at).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist read status through multiple fetch operations', () => {
      fc.assert(
        fc.property(
          notificationArbitrary,
          fc.integer({ min: 1, max: 10 }),
          (notification, fetchCount) => {
            // Mark as read
            let current = simulateMarkAsRead(notification)
            
            // Fetch multiple times
            for (let i = 0; i < fetchCount; i++) {
              current = simulateFetchNotification(current)
              
              // read_at should remain non-null
              expect(current.read_at).not.toBeNull()
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist unread status through multiple fetch operations', () => {
      fc.assert(
        fc.property(
          notificationArbitrary,
          fc.integer({ min: 1, max: 10 }),
          (notification, fetchCount) => {
            // Mark as unread
            let current = simulateMarkAsUnread(notification)
            
            // Fetch multiple times
            for (let i = 0; i < fetchCount; i++) {
              current = simulateFetchNotification(current)
              
              // read_at should remain null
              expect(current.read_at).toBeNull()
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-inbox, Property 6: Unread count consistency**
   * **Validates: Requirements 3.1, 3.3, 3.4, 4.4**
   * 
   * For any set of notifications, the unread count should equal the number of
   * notifications where read_at is null. After marking one as read, the count
   * should decrease by 1. After adding a new notification, the count should
   * increase by 1.
   */
  describe('Property 6: Unread count consistency', () => {
    
    /**
     * Generate a valid ISO date string from a timestamp in a reasonable range
     */
    const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00.000Z').getTime()
    const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59.999Z').getTime()
    
    const validISODateArbitrary = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP })
      .map(ts => new Date(ts).toISOString())

    /**
     * Arbitrary for generating a notification with read/unread status
     */
    const notificationWithReadStatusArbitrary = fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      type: notificationTypeArbitrary,
      reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
      reference_id: fc.option(fc.uuid(), { nil: null }),
      read_at: fc.option(validISODateArbitrary, { nil: null }),
      created_at: validISODateArbitrary
    })

    /**
     * Arbitrary for generating an array of notifications with various read statuses
     */
    const notificationArrayArbitrary = fc.array(notificationWithReadStatusArbitrary, { minLength: 0, maxLength: 50 })

    /**
     * Calculate unread count from a list of notifications
     * This is the core logic that should be consistent
     * 
     * @param {Array} notifications - Array of notifications
     * @returns {number} - Count of unread notifications
     */
    function calculateUnreadCount(notifications) {
      return notifications.filter(n => n.read_at === null).length
    }

    /**
     * Simulate marking a notification as read
     * Returns updated notifications array and new unread count
     * 
     * @param {Array} notifications - Array of notifications
     * @param {string} notificationId - ID of notification to mark as read
     * @returns {{notifications: Array, unreadCount: number}}
     */
    function simulateMarkAsRead(notifications, notificationId) {
      const updated = notifications.map(n => {
        if (n.id === notificationId && n.read_at === null) {
          return { ...n, read_at: new Date().toISOString() }
        }
        return n
      })
      return {
        notifications: updated,
        unreadCount: calculateUnreadCount(updated)
      }
    }

    /**
     * Simulate marking a notification as unread
     * Returns updated notifications array and new unread count
     * 
     * @param {Array} notifications - Array of notifications
     * @param {string} notificationId - ID of notification to mark as unread
     * @returns {{notifications: Array, unreadCount: number}}
     */
    function simulateMarkAsUnread(notifications, notificationId) {
      const updated = notifications.map(n => {
        if (n.id === notificationId && n.read_at !== null) {
          return { ...n, read_at: null }
        }
        return n
      })
      return {
        notifications: updated,
        unreadCount: calculateUnreadCount(updated)
      }
    }

    /**
     * Simulate adding a new notification (always unread initially)
     * Returns updated notifications array and new unread count
     * 
     * @param {Array} notifications - Array of notifications
     * @param {Object} newNotification - New notification to add
     * @returns {{notifications: Array, unreadCount: number}}
     */
    function simulateAddNotification(notifications, newNotification) {
      // New notifications are always unread (read_at = null)
      const notificationToAdd = {
        ...newNotification,
        id: crypto.randomUUID(),
        read_at: null,
        created_at: new Date().toISOString()
      }
      const updated = [notificationToAdd, ...notifications]
      return {
        notifications: updated,
        unreadCount: calculateUnreadCount(updated)
      }
    }

    /**
     * Simulate deleting a notification
     * Returns updated notifications array and new unread count
     * 
     * @param {Array} notifications - Array of notifications
     * @param {string} notificationId - ID of notification to delete
     * @returns {{notifications: Array, unreadCount: number}}
     */
    function simulateDeleteNotification(notifications, notificationId) {
      const updated = notifications.filter(n => n.id !== notificationId)
      return {
        notifications: updated,
        unreadCount: calculateUnreadCount(updated)
      }
    }

    it('should have unread count equal to notifications where read_at is null', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          (notifications) => {
            const unreadCount = calculateUnreadCount(notifications)
            const actualUnread = notifications.filter(n => n.read_at === null).length
            
            expect(unreadCount).toBe(actualUnread)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should decrease unread count by 1 when marking an unread notification as read', () => {
      fc.assert(
        fc.property(
          // Generate at least one notification that is unread
          fc.array(notificationWithReadStatusArbitrary, { minLength: 1, maxLength: 50 })
            .filter(arr => arr.some(n => n.read_at === null)),
          (notifications) => {
            const initialUnreadCount = calculateUnreadCount(notifications)
            
            // Find an unread notification
            const unreadNotification = notifications.find(n => n.read_at === null)
            
            // Mark it as read
            const { unreadCount: newUnreadCount } = simulateMarkAsRead(notifications, unreadNotification.id)
            
            // Unread count should decrease by 1
            expect(newUnreadCount).toBe(initialUnreadCount - 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should increase unread count by 1 when marking a read notification as unread', () => {
      fc.assert(
        fc.property(
          // Generate at least one notification that is read
          fc.array(notificationWithReadStatusArbitrary, { minLength: 1, maxLength: 50 })
            .filter(arr => arr.some(n => n.read_at !== null)),
          (notifications) => {
            const initialUnreadCount = calculateUnreadCount(notifications)
            
            // Find a read notification
            const readNotification = notifications.find(n => n.read_at !== null)
            
            // Mark it as unread
            const { unreadCount: newUnreadCount } = simulateMarkAsUnread(notifications, readNotification.id)
            
            // Unread count should increase by 1
            expect(newUnreadCount).toBe(initialUnreadCount + 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should increase unread count by 1 when adding a new notification', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          fc.record({
            user_id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            type: notificationTypeArbitrary,
            reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
            reference_id: fc.option(fc.uuid(), { nil: null })
          }),
          (notifications, newNotificationData) => {
            const initialUnreadCount = calculateUnreadCount(notifications)
            
            // Add new notification (always unread)
            const { unreadCount: newUnreadCount } = simulateAddNotification(notifications, newNotificationData)
            
            // Unread count should increase by 1
            expect(newUnreadCount).toBe(initialUnreadCount + 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should decrease unread count by 1 when deleting an unread notification', () => {
      fc.assert(
        fc.property(
          // Generate at least one notification that is unread
          fc.array(notificationWithReadStatusArbitrary, { minLength: 1, maxLength: 50 })
            .filter(arr => arr.some(n => n.read_at === null)),
          (notifications) => {
            const initialUnreadCount = calculateUnreadCount(notifications)
            
            // Find an unread notification
            const unreadNotification = notifications.find(n => n.read_at === null)
            
            // Delete it
            const { unreadCount: newUnreadCount } = simulateDeleteNotification(notifications, unreadNotification.id)
            
            // Unread count should decrease by 1
            expect(newUnreadCount).toBe(initialUnreadCount - 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not change unread count when deleting a read notification', () => {
      fc.assert(
        fc.property(
          // Generate at least one notification that is read
          fc.array(notificationWithReadStatusArbitrary, { minLength: 1, maxLength: 50 })
            .filter(arr => arr.some(n => n.read_at !== null)),
          (notifications) => {
            const initialUnreadCount = calculateUnreadCount(notifications)
            
            // Find a read notification
            const readNotification = notifications.find(n => n.read_at !== null)
            
            // Delete it
            const { unreadCount: newUnreadCount } = simulateDeleteNotification(notifications, readNotification.id)
            
            // Unread count should remain the same
            expect(newUnreadCount).toBe(initialUnreadCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not change unread count when marking an already read notification as read', () => {
      fc.assert(
        fc.property(
          // Generate at least one notification that is read
          fc.array(notificationWithReadStatusArbitrary, { minLength: 1, maxLength: 50 })
            .filter(arr => arr.some(n => n.read_at !== null)),
          (notifications) => {
            const initialUnreadCount = calculateUnreadCount(notifications)
            
            // Find a read notification
            const readNotification = notifications.find(n => n.read_at !== null)
            
            // Try to mark it as read again
            const { unreadCount: newUnreadCount } = simulateMarkAsRead(notifications, readNotification.id)
            
            // Unread count should remain the same
            expect(newUnreadCount).toBe(initialUnreadCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not change unread count when marking an already unread notification as unread', () => {
      fc.assert(
        fc.property(
          // Generate at least one notification that is unread
          fc.array(notificationWithReadStatusArbitrary, { minLength: 1, maxLength: 50 })
            .filter(arr => arr.some(n => n.read_at === null)),
          (notifications) => {
            const initialUnreadCount = calculateUnreadCount(notifications)
            
            // Find an unread notification
            const unreadNotification = notifications.find(n => n.read_at === null)
            
            // Try to mark it as unread again
            const { unreadCount: newUnreadCount } = simulateMarkAsUnread(notifications, unreadNotification.id)
            
            // Unread count should remain the same
            expect(newUnreadCount).toBe(initialUnreadCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain consistency through multiple operations', () => {
      fc.assert(
        fc.property(
          // Generate notifications with mix of read/unread
          fc.array(notificationWithReadStatusArbitrary, { minLength: 3, maxLength: 30 }),
          // Generate sequence of operations
          fc.array(
            fc.oneof(
              fc.constant({ type: 'markRead' }),
              fc.constant({ type: 'markUnread' }),
              fc.constant({ type: 'add' }),
              fc.constant({ type: 'delete' })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (initialNotifications, operations) => {
            let notifications = [...initialNotifications]
            
            for (const op of operations) {
              // Always verify consistency before operation
              const expectedUnread = notifications.filter(n => n.read_at === null).length
              expect(calculateUnreadCount(notifications)).toBe(expectedUnread)
              
              if (op.type === 'markRead') {
                const unread = notifications.find(n => n.read_at === null)
                if (unread) {
                  const result = simulateMarkAsRead(notifications, unread.id)
                  notifications = result.notifications
                }
              } else if (op.type === 'markUnread') {
                const read = notifications.find(n => n.read_at !== null)
                if (read) {
                  const result = simulateMarkAsUnread(notifications, read.id)
                  notifications = result.notifications
                }
              } else if (op.type === 'add') {
                const result = simulateAddNotification(notifications, {
                  user_id: crypto.randomUUID(),
                  title: 'Test',
                  message: 'Test message',
                  type: 'announcement_normal',
                  reference_type: null,
                  reference_id: null
                })
                notifications = result.notifications
              } else if (op.type === 'delete') {
                if (notifications.length > 0) {
                  const toDelete = notifications[0]
                  const result = simulateDeleteNotification(notifications, toDelete.id)
                  notifications = result.notifications
                }
              }
              
              // Verify consistency after operation
              const newExpectedUnread = notifications.filter(n => n.read_at === null).length
              expect(calculateUnreadCount(notifications)).toBe(newExpectedUnread)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty notification list', () => {
      const emptyList = []
      const unreadCount = calculateUnreadCount(emptyList)
      
      expect(unreadCount).toBe(0)
    })

    it('should handle all notifications being read', () => {
      fc.assert(
        fc.property(
          // Generate notifications that are all read
          fc.array(
            fc.record({
              id: fc.uuid(),
              user_id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: validISODateArbitrary, // Always has a read_at value
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (notifications) => {
            const unreadCount = calculateUnreadCount(notifications)
            
            expect(unreadCount).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle all notifications being unread', () => {
      fc.assert(
        fc.property(
          // Generate notifications that are all unread
          fc.array(
            fc.record({
              id: fc.uuid(),
              user_id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: fc.constant(null), // Always null (unread)
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (notifications) => {
            const unreadCount = calculateUnreadCount(notifications)
            
            expect(unreadCount).toBe(notifications.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-inbox, Property 5: Mark all as read updates all notifications**
   * **Validates: Requirements 2.3**
   * 
   * For any set of notifications belonging to a user, after calling markAllAsRead,
   * all notifications should have read_at as non-null.
   */
  describe('Property 5: Mark all as read updates all notifications', () => {
    
    /**
     * Generate a valid ISO date string from a timestamp in a reasonable range
     */
    const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00.000Z').getTime()
    const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59.999Z').getTime()
    
    const validISODateArbitrary = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP })
      .map(ts => new Date(ts).toISOString())

    /**
     * Arbitrary for generating a notification with read/unread status
     */
    const notificationWithReadStatusArbitrary = fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      type: notificationTypeArbitrary,
      reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
      reference_id: fc.option(fc.uuid(), { nil: null }),
      read_at: fc.option(validISODateArbitrary, { nil: null }),
      created_at: validISODateArbitrary
    })

    /**
     * Simulate marking all notifications as read for a user
     * Returns updated notifications array where all have read_at set
     * 
     * @param {Array} notifications - Array of notifications
     * @param {string} userId - User ID to mark all as read for
     * @returns {Array} - Updated notifications with all read_at set
     */
    function simulateMarkAllAsRead(notifications, userId) {
      const now = new Date().toISOString()
      return notifications.map(n => {
        if (n.user_id === userId) {
          return {
            ...n,
            read_at: n.read_at || now // Only update if currently unread
          }
        }
        return n
      })
    }

    /**
     * Calculate unread count from a list of notifications for a specific user
     * 
     * @param {Array} notifications - Array of notifications
     * @param {string} userId - User ID to count for
     * @returns {number} - Count of unread notifications
     */
    function calculateUnreadCountForUser(notifications, userId) {
      return notifications.filter(n => n.user_id === userId && n.read_at === null).length
    }

    it('should mark all notifications as read for a user', () => {
      fc.assert(
        fc.property(
          // Generate a user ID
          fc.uuid(),
          // Generate notifications for that user (some read, some unread)
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: fc.option(validISODateArbitrary, { nil: null }),
              created_at: validISODateArbitrary
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (userId, notificationData) => {
            // Add user_id to all notifications
            const notifications = notificationData.map(n => ({ ...n, user_id: userId }))
            
            // Mark all as read
            const updated = simulateMarkAllAsRead(notifications, userId)
            
            // All notifications should have read_at as non-null
            for (const notification of updated) {
              expect(notification.read_at).not.toBeNull()
              expect(typeof notification.read_at).toBe('string')
            }
            
            // Unread count should be 0
            expect(calculateUnreadCountForUser(updated, userId)).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should only affect notifications belonging to the specified user', () => {
      fc.assert(
        fc.property(
          // Generate two different user IDs
          fc.uuid(),
          fc.uuid(),
          // Generate notifications
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: fc.constant(null), // All unread initially
              created_at: validISODateArbitrary
            }),
            { minLength: 2, maxLength: 50 }
          ),
          (userId1, userId2, notificationData) => {
            // Skip if user IDs are the same
            if (userId1 === userId2) return true
            
            // Assign half to user1, half to user2
            const notifications = notificationData.map((n, i) => ({
              ...n,
              user_id: i % 2 === 0 ? userId1 : userId2
            }))
            
            const user1UnreadBefore = calculateUnreadCountForUser(notifications, userId1)
            const user2UnreadBefore = calculateUnreadCountForUser(notifications, userId2)
            
            // Mark all as read for user1 only
            const updated = simulateMarkAllAsRead(notifications, userId1)
            
            // User1's notifications should all be read
            expect(calculateUnreadCountForUser(updated, userId1)).toBe(0)
            
            // User2's notifications should be unchanged
            expect(calculateUnreadCountForUser(updated, userId2)).toBe(user2UnreadBefore)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve already read notifications (idempotent)', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          // Generate notifications that are already read
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: validISODateArbitrary, // All already read
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (userId, notificationData) => {
            const notifications = notificationData.map(n => ({ ...n, user_id: userId }))
            
            // Store original read_at values
            const originalReadAtValues = notifications.map(n => n.read_at)
            
            // Mark all as read (should be idempotent)
            const updated = simulateMarkAllAsRead(notifications, userId)
            
            // Original read_at values should be preserved
            for (let i = 0; i < updated.length; i++) {
              expect(updated[i].read_at).toBe(originalReadAtValues[i])
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty notification list', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (userId) => {
            const notifications = []
            
            // Mark all as read on empty list
            const updated = simulateMarkAllAsRead(notifications, userId)
            
            // Should return empty array
            expect(updated.length).toBe(0)
            expect(calculateUnreadCountForUser(updated, userId)).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle all notifications already read', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: validISODateArbitrary, // All read
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (userId, notificationData) => {
            const notifications = notificationData.map(n => ({ ...n, user_id: userId }))
            
            // All should already be read
            expect(calculateUnreadCountForUser(notifications, userId)).toBe(0)
            
            // Mark all as read
            const updated = simulateMarkAllAsRead(notifications, userId)
            
            // Should still all be read
            expect(calculateUnreadCountForUser(updated, userId)).toBe(0)
            
            // All should have non-null read_at
            for (const notification of updated) {
              expect(notification.read_at).not.toBeNull()
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle all notifications unread', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: fc.constant(null), // All unread
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (userId, notificationData) => {
            const notifications = notificationData.map(n => ({ ...n, user_id: userId }))
            
            // All should be unread initially
            expect(calculateUnreadCountForUser(notifications, userId)).toBe(notifications.length)
            
            // Mark all as read
            const updated = simulateMarkAllAsRead(notifications, userId)
            
            // All should now be read
            expect(calculateUnreadCountForUser(updated, userId)).toBe(0)
            
            // All should have non-null read_at
            for (const notification of updated) {
              expect(notification.read_at).not.toBeNull()
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle mixed read/unread notifications', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: fc.option(validISODateArbitrary, { nil: null }), // Mixed
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (userId, notificationData) => {
            const notifications = notificationData.map(n => ({ ...n, user_id: userId }))
            
            // Mark all as read
            const updated = simulateMarkAllAsRead(notifications, userId)
            
            // All should now be read
            expect(calculateUnreadCountForUser(updated, userId)).toBe(0)
            
            // All should have non-null read_at
            for (const notification of updated) {
              expect(notification.read_at).not.toBeNull()
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve other notification fields after marking all as read', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: fc.constant(null), // All unread
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (userId, notificationData) => {
            const notifications = notificationData.map(n => ({ ...n, user_id: userId }))
            
            // Mark all as read
            const updated = simulateMarkAllAsRead(notifications, userId)
            
            // All other fields should be preserved
            for (let i = 0; i < notifications.length; i++) {
              expect(updated[i].id).toBe(notifications[i].id)
              expect(updated[i].user_id).toBe(notifications[i].user_id)
              expect(updated[i].title).toBe(notifications[i].title)
              expect(updated[i].message).toBe(notifications[i].message)
              expect(updated[i].type).toBe(notifications[i].type)
              expect(updated[i].reference_type).toBe(notifications[i].reference_type)
              expect(updated[i].reference_id).toBe(notifications[i].reference_id)
              expect(updated[i].created_at).toBe(notifications[i].created_at)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent: calling markAllAsRead twice should have same result', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: fc.option(validISODateArbitrary, { nil: null }),
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (userId, notificationData) => {
            const notifications = notificationData.map(n => ({ ...n, user_id: userId }))
            
            // Mark all as read once
            const afterFirst = simulateMarkAllAsRead(notifications, userId)
            
            // Mark all as read again
            const afterSecond = simulateMarkAllAsRead(afterFirst, userId)
            
            // Results should be the same
            expect(afterSecond.length).toBe(afterFirst.length)
            
            for (let i = 0; i < afterFirst.length; i++) {
              expect(afterSecond[i].read_at).toBe(afterFirst[i].read_at)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-inbox, Property 7: Delete removes notification**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   * 
   * For any notification that is deleted, attempting to fetch it should return null or not found.
   * For bulk delete, all selected notifications should be removed.
   * For clear all, the user's notification list should be empty.
   */
  describe('Property 7: Delete removes notification', () => {
    
    /**
     * Generate a valid ISO date string from a timestamp in a reasonable range
     */
    const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00.000Z').getTime()
    const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59.999Z').getTime()
    
    const validISODateArbitrary = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP })
      .map(ts => new Date(ts).toISOString())

    /**
     * Arbitrary for generating a notification
     */
    const notificationArbitrary = fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      type: notificationTypeArbitrary,
      reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
      reference_id: fc.option(fc.uuid(), { nil: null }),
      read_at: fc.option(validISODateArbitrary, { nil: null }),
      created_at: validISODateArbitrary
    })

    /**
     * Arbitrary for generating an array of notifications
     */
    const notificationArrayArbitrary = fc.array(notificationArbitrary, { minLength: 0, maxLength: 50 })

    /**
     * Simulate deleting a single notification
     * Returns updated notifications array
     * 
     * @param {Array} notifications - Array of notifications
     * @param {string} notificationId - ID of notification to delete
     * @returns {Array} - Updated notifications array
     */
    function simulateDeleteNotification(notifications, notificationId) {
      return notifications.filter(n => n.id !== notificationId)
    }

    /**
     * Simulate deleting multiple notifications
     * Returns updated notifications array
     * 
     * @param {Array} notifications - Array of notifications
     * @param {string[]} notificationIds - Array of notification IDs to delete
     * @returns {Array} - Updated notifications array
     */
    function simulateDeleteMultiple(notifications, notificationIds) {
      const idsSet = new Set(notificationIds)
      return notifications.filter(n => !idsSet.has(n.id))
    }

    /**
     * Simulate clearing all notifications for a user
     * Returns empty array
     * 
     * @param {Array} notifications - Array of notifications
     * @param {string} userId - User ID to clear notifications for
     * @returns {Array} - Empty array
     */
    function simulateClearAll(notifications, userId) {
      return notifications.filter(n => n.user_id !== userId)
    }

    /**
     * Find a notification by ID
     * Returns the notification or null if not found
     * 
     * @param {Array} notifications - Array of notifications
     * @param {string} notificationId - ID to search for
     * @returns {Object|null} - Found notification or null
     */
    function findNotificationById(notifications, notificationId) {
      return notifications.find(n => n.id === notificationId) || null
    }

    it('should remove notification from list after single delete', () => {
      fc.assert(
        fc.property(
          fc.array(notificationArbitrary, { minLength: 1, maxLength: 50 }),
          (notifications) => {
            // Pick a random notification to delete
            const toDelete = notifications[Math.floor(Math.random() * notifications.length)]
            
            // Delete the notification
            const afterDelete = simulateDeleteNotification(notifications, toDelete.id)
            
            // Notification should not be found
            expect(findNotificationById(afterDelete, toDelete.id)).toBeNull()
            
            // Length should decrease by 1
            expect(afterDelete.length).toBe(notifications.length - 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return null when fetching deleted notification', () => {
      fc.assert(
        fc.property(
          fc.array(notificationArbitrary, { minLength: 1, maxLength: 50 }),
          (notifications) => {
            // Pick a random notification to delete
            const toDelete = notifications[Math.floor(Math.random() * notifications.length)]
            
            // Delete the notification
            const afterDelete = simulateDeleteNotification(notifications, toDelete.id)
            
            // Attempting to fetch should return null
            const fetched = findNotificationById(afterDelete, toDelete.id)
            expect(fetched).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove all selected notifications in bulk delete', () => {
      fc.assert(
        fc.property(
          fc.array(notificationArbitrary, { minLength: 2, maxLength: 50 }),
          fc.integer({ min: 1, max: 10 }),
          (notifications, deleteCount) => {
            // Select random notifications to delete (up to available count)
            const actualDeleteCount = Math.min(deleteCount, notifications.length)
            const toDeleteIds = notifications
              .slice(0, actualDeleteCount)
              .map(n => n.id)
            
            // Bulk delete
            const afterDelete = simulateDeleteMultiple(notifications, toDeleteIds)
            
            // All deleted notifications should not be found
            for (const id of toDeleteIds) {
              expect(findNotificationById(afterDelete, id)).toBeNull()
            }
            
            // Length should decrease by number of deleted
            expect(afterDelete.length).toBe(notifications.length - actualDeleteCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve non-deleted notifications in bulk delete', () => {
      fc.assert(
        fc.property(
          fc.array(notificationArbitrary, { minLength: 3, maxLength: 50 }),
          fc.integer({ min: 1, max: 5 }),
          (notifications, deleteCount) => {
            // Select some notifications to delete
            const actualDeleteCount = Math.min(deleteCount, notifications.length - 1)
            const toDeleteIds = new Set(
              notifications.slice(0, actualDeleteCount).map(n => n.id)
            )
            
            // Get IDs that should remain
            const remainingIds = notifications
              .filter(n => !toDeleteIds.has(n.id))
              .map(n => n.id)
            
            // Bulk delete
            const afterDelete = simulateDeleteMultiple(notifications, [...toDeleteIds])
            
            // All remaining notifications should still be found
            for (const id of remainingIds) {
              expect(findNotificationById(afterDelete, id)).not.toBeNull()
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should result in empty list after clear all for user', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: notificationTypeArbitrary,
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: fc.option(validISODateArbitrary, { nil: null }),
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (userId, notificationData) => {
            // Create notifications for the user
            const notifications = notificationData.map(n => ({ ...n, user_id: userId }))
            
            // Clear all for user
            const afterClear = simulateClearAll(notifications, userId)
            
            // List should be empty
            expect(afterClear.length).toBe(0)
            
            // No notifications should be found for this user
            const userNotifications = afterClear.filter(n => n.user_id === userId)
            expect(userNotifications.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not affect other users notifications in clear all', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.array(notificationArbitrary, { minLength: 1, maxLength: 25 }),
          fc.array(notificationArbitrary, { minLength: 1, maxLength: 25 }),
          (userId1, userId2, user1Data, user2Data) => {
            // Ensure different users
            if (userId1 === userId2) return true
            
            // Create notifications for both users
            const user1Notifications = user1Data.map(n => ({ ...n, user_id: userId1 }))
            const user2Notifications = user2Data.map(n => ({ ...n, user_id: userId2 }))
            const allNotifications = [...user1Notifications, ...user2Notifications]
            
            // Clear all for user1
            const afterClear = simulateClearAll(allNotifications, userId1)
            
            // User1's notifications should be gone
            const user1Remaining = afterClear.filter(n => n.user_id === userId1)
            expect(user1Remaining.length).toBe(0)
            
            // User2's notifications should remain
            const user2Remaining = afterClear.filter(n => n.user_id === userId2)
            expect(user2Remaining.length).toBe(user2Notifications.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle deleting non-existent notification gracefully', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          fc.uuid(),
          (notifications, nonExistentId) => {
            // Ensure the ID doesn't exist
            const exists = notifications.some(n => n.id === nonExistentId)
            if (exists) return true // Skip if ID happens to exist
            
            // Try to delete non-existent notification
            const afterDelete = simulateDeleteNotification(notifications, nonExistentId)
            
            // List should remain unchanged
            expect(afterDelete.length).toBe(notifications.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle bulk delete with empty ID array', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          (notifications) => {
            // Bulk delete with empty array
            const afterDelete = simulateDeleteMultiple(notifications, [])
            
            // List should remain unchanged
            expect(afterDelete.length).toBe(notifications.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle clear all on empty list', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (userId) => {
            // Clear all on empty list
            const afterClear = simulateClearAll([], userId)
            
            // List should remain empty
            expect(afterClear.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent: deleting same notification twice should have same result', () => {
      fc.assert(
        fc.property(
          fc.array(notificationArbitrary, { minLength: 1, maxLength: 50 }),
          (notifications) => {
            // Pick a notification to delete
            const toDelete = notifications[0]
            
            // Delete once
            const afterFirst = simulateDeleteNotification(notifications, toDelete.id)
            
            // Delete again (should have no effect)
            const afterSecond = simulateDeleteNotification(afterFirst, toDelete.id)
            
            // Results should be the same
            expect(afterSecond.length).toBe(afterFirst.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain data integrity of remaining notifications after delete', () => {
      fc.assert(
        fc.property(
          fc.array(notificationArbitrary, { minLength: 2, maxLength: 50 }),
          (notifications) => {
            // Pick first notification to delete
            const toDelete = notifications[0]
            const remaining = notifications.slice(1)
            
            // Delete the notification
            const afterDelete = simulateDeleteNotification(notifications, toDelete.id)
            
            // Verify remaining notifications have same data
            for (const original of remaining) {
              const found = findNotificationById(afterDelete, original.id)
              expect(found).not.toBeNull()
              expect(found.title).toBe(original.title)
              expect(found.message).toBe(original.message)
              expect(found.type).toBe(original.type)
              expect(found.user_id).toBe(original.user_id)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-inbox, Property 8: Filter returns only matching type**
   * **Validates: Requirements 5.1, 5.2**
   * 
   * For any notification type filter, all returned notifications should have a type
   * matching the filter. When filter is "all" or null, all notifications should be returned.
   */
  describe('Property 8: Filter returns only matching type', () => {
    
    /**
     * Generate a valid ISO date string from a timestamp in a reasonable range
     */
    const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00.000Z').getTime()
    const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59.999Z').getTime()
    
    const validISODateArbitrary = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP })
      .map(ts => new Date(ts).toISOString())

    /**
     * Arbitrary for generating a notification with a specific type
     */
    const notificationWithTypeArbitrary = fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
      type: notificationTypeArbitrary,
      reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
      reference_id: fc.option(fc.uuid(), { nil: null }),
      read_at: fc.option(validISODateArbitrary, { nil: null }),
      created_at: validISODateArbitrary
    })

    /**
     * Arbitrary for generating an array of notifications with various types
     */
    const notificationArrayArbitrary = fc.array(notificationWithTypeArbitrary, { minLength: 0, maxLength: 50 })

    /**
     * Filter notifications by type
     * This simulates the filteredNotifications getter in the store
     * 
     * @param {Array} notifications - Array of notifications
     * @param {string|null} filter - Notification type filter or null/'all' for all
     * @returns {Array} - Filtered notifications
     */
    function filterNotificationsByType(notifications, filter) {
      if (!filter || filter === 'all') {
        return notifications
      }
      return notifications.filter(n => n.type === filter)
    }

    it('should return only notifications matching the filter type', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          notificationTypeArbitrary,
          (notifications, filterType) => {
            const filtered = filterNotificationsByType(notifications, filterType)
            
            // All returned notifications should have the matching type
            for (const notification of filtered) {
              expect(notification.type).toBe(filterType)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all notifications when filter is null', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          (notifications) => {
            const filtered = filterNotificationsByType(notifications, null)
            
            // Should return all notifications
            expect(filtered.length).toBe(notifications.length)
            
            // All original notifications should be present
            const originalIds = new Set(notifications.map(n => n.id))
            const filteredIds = new Set(filtered.map(n => n.id))
            
            for (const id of originalIds) {
              expect(filteredIds.has(id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all notifications when filter is "all"', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          (notifications) => {
            const filtered = filterNotificationsByType(notifications, 'all')
            
            // Should return all notifications
            expect(filtered.length).toBe(notifications.length)
            
            // All original notifications should be present
            const originalIds = new Set(notifications.map(n => n.id))
            const filteredIds = new Set(filtered.map(n => n.id))
            
            for (const id of originalIds) {
              expect(filteredIds.has(id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return correct count of matching notifications', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          notificationTypeArbitrary,
          (notifications, filterType) => {
            const filtered = filterNotificationsByType(notifications, filterType)
            
            // Count should match manual count
            const expectedCount = notifications.filter(n => n.type === filterType).length
            expect(filtered.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when no notifications match the filter', () => {
      fc.assert(
        fc.property(
          // Generate notifications of one type
          fc.array(
            fc.record({
              id: fc.uuid(),
              user_id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              type: fc.constant('announcement_urgent'), // All same type
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: fc.option(validISODateArbitrary, { nil: null }),
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (notifications) => {
            // Filter by a different type
            const filtered = filterNotificationsByType(notifications, 'schedule_updates')
            
            // Should return empty array
            expect(filtered.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty notification list', () => {
      fc.assert(
        fc.property(
          notificationTypeArbitrary,
          (filterType) => {
            const filtered = filterNotificationsByType([], filterType)
            
            expect(filtered.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve notification data integrity after filtering', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          notificationTypeArbitrary,
          (notifications, filterType) => {
            const filtered = filterNotificationsByType(notifications, filterType)
            
            // Each filtered notification should have all its original data
            for (const filteredNotification of filtered) {
              const original = notifications.find(n => n.id === filteredNotification.id)
              
              expect(original).toBeDefined()
              expect(filteredNotification.user_id).toBe(original.user_id)
              expect(filteredNotification.title).toBe(original.title)
              expect(filteredNotification.message).toBe(original.message)
              expect(filteredNotification.type).toBe(original.type)
              expect(filteredNotification.reference_type).toBe(original.reference_type)
              expect(filteredNotification.reference_id).toBe(original.reference_id)
              expect(filteredNotification.read_at).toBe(original.read_at)
              expect(filteredNotification.created_at).toBe(original.created_at)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter correctly for each notification type', () => {
      // Test each valid notification type
      for (const type of VALID_NOTIFICATION_TYPES) {
        fc.assert(
          fc.property(
            // Generate notifications with mixed types
            fc.array(notificationWithTypeArbitrary, { minLength: 5, maxLength: 30 }),
            (notifications) => {
              const filtered = filterNotificationsByType(notifications, type)
              
              // All filtered should match the type
              for (const notification of filtered) {
                expect(notification.type).toBe(type)
              }
              
              // Count should be correct
              const expectedCount = notifications.filter(n => n.type === type).length
              expect(filtered.length).toBe(expectedCount)
              
              return true
            }
          ),
          { numRuns: 20 } // Fewer runs since we're testing each type
        )
      }
    })

    it('should not include notifications of other types', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          notificationTypeArbitrary,
          (notifications, filterType) => {
            const filtered = filterNotificationsByType(notifications, filterType)
            
            // No notification should have a different type
            for (const notification of filtered) {
              expect(notification.type).not.toBe(
                VALID_NOTIFICATION_TYPES.find(t => t !== filterType)
              )
            }
            
            // More specifically, all should match exactly
            const nonMatchingTypes = filtered.filter(n => n.type !== filterType)
            expect(nonMatchingTypes.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be consistent: filtering twice should give same result', () => {
      fc.assert(
        fc.property(
          notificationArrayArbitrary,
          notificationTypeArbitrary,
          (notifications, filterType) => {
            const filtered1 = filterNotificationsByType(notifications, filterType)
            const filtered2 = filterNotificationsByType(notifications, filterType)
            
            // Same length
            expect(filtered1.length).toBe(filtered2.length)
            
            // Same IDs
            const ids1 = filtered1.map(n => n.id).sort()
            const ids2 = filtered2.map(n => n.id).sort()
            
            expect(ids1).toEqual(ids2)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle notifications with all same type', () => {
      fc.assert(
        fc.property(
          notificationTypeArbitrary,
          fc.array(
            fc.record({
              id: fc.uuid(),
              user_id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              message: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              reference_type: fc.option(referenceTypeArbitrary, { nil: null }),
              reference_id: fc.option(fc.uuid(), { nil: null }),
              read_at: fc.option(validISODateArbitrary, { nil: null }),
              created_at: validISODateArbitrary
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (type, notificationData) => {
            // All notifications have the same type
            const notifications = notificationData.map(n => ({ ...n, type }))
            
            // Filter by that type should return all
            const filteredSame = filterNotificationsByType(notifications, type)
            expect(filteredSame.length).toBe(notifications.length)
            
            // Filter by different type should return none
            const differentType = VALID_NOTIFICATION_TYPES.find(t => t !== type)
            if (differentType) {
              const filteredDifferent = filterNotificationsByType(notifications, differentType)
              expect(filteredDifferent.length).toBe(0)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: notification-inbox, Property 9: Navigation URL generation**
   * **Validates: Requirements 6.1**
   * 
   * For any notification with reference_type and reference_id, the generated
   * navigation URL should follow the appropriate route for that content type.
   */
  describe('Property 9: Navigation URL generation', () => {
    
    /**
     * Route mapping for reference types to their corresponding routes
     * This mirrors the ROUTE_MAP in notificationNavigation.js
     */
    const ROUTE_MAP = {
      // Announcements
      announcement: '/announcements',
      announcement_urgent: '/announcements',
      announcement_normal: '/announcements',
      
      // Schedules
      schedule: '/schedules',
      schedule_updates: '/schedules',
      
      // Events
      event: '/events',
      event_reminders: '/events',
      
      // Tournaments
      tournament: '/tournaments',
      tournament_updates: '/tournaments',
      
      // Club applications
      club_application: '/club-applications',
      application: '/club-applications',
      
      // Athletes
      athlete: '/athletes',
      
      // Training logs
      training_log: '/training-logs',
      training: '/training-logs'
    }

    /**
     * Get all supported reference types
     */
    const SUPPORTED_REFERENCE_TYPES = Object.keys(ROUTE_MAP)

    /**
     * Simulate the getNotificationUrl function
     * This mirrors the implementation in notificationNavigation.js
     * 
     * @param {string|null} referenceType - The type of content the notification references
     * @param {string|null} referenceId - The ID of the referenced content
     * @returns {string|null} The URL to navigate to, or null if no valid URL can be generated
     */
    function getNotificationUrl(referenceType, referenceId) {
      // Handle missing or invalid reference type
      if (!referenceType || typeof referenceType !== 'string') {
        return null
      }
      
      // Normalize reference type (lowercase, trim)
      const normalizedType = referenceType.toLowerCase().trim()
      
      // Look up the route for this reference type using hasOwnProperty to avoid prototype pollution
      if (!Object.prototype.hasOwnProperty.call(ROUTE_MAP, normalizedType)) {
        return null
      }
      
      const baseRoute = ROUTE_MAP[normalizedType]
      
      // If no route mapping exists, return null
      if (!baseRoute) {
        return null
      }
      
      // Return the base route
      return baseRoute
    }

    /**
     * Arbitrary for generating supported reference types
     */
    const supportedReferenceTypeArbitrary = fc.constantFrom(...SUPPORTED_REFERENCE_TYPES)

    /**
     * Arbitrary for generating unsupported reference types
     */
    const unsupportedReferenceTypeArbitrary = fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0 && !SUPPORTED_REFERENCE_TYPES.includes(s.toLowerCase().trim()))

    it('should generate valid URL for all supported reference types', () => {
      fc.assert(
        fc.property(
          supportedReferenceTypeArbitrary,
          fc.uuid(),
          (referenceType, referenceId) => {
            const url = getNotificationUrl(referenceType, referenceId)
            
            // URL should not be null for supported types
            expect(url).not.toBeNull()
            
            // URL should be a string
            expect(typeof url).toBe('string')
            
            // URL should start with /
            expect(url.startsWith('/')).toBe(true)
            
            // URL should match the expected route for this type
            const expectedRoute = ROUTE_MAP[referenceType.toLowerCase().trim()]
            expect(url).toBe(expectedRoute)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return null for null or undefined reference type', () => {
      fc.assert(
        fc.property(
          fc.option(fc.uuid(), { nil: null }),
          (referenceId) => {
            // Test with null
            expect(getNotificationUrl(null, referenceId)).toBeNull()
            
            // Test with undefined
            expect(getNotificationUrl(undefined, referenceId)).toBeNull()
            
            // Test with empty string
            expect(getNotificationUrl('', referenceId)).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return null for unsupported reference types', () => {
      fc.assert(
        fc.property(
          unsupportedReferenceTypeArbitrary,
          fc.uuid(),
          (referenceType, referenceId) => {
            const url = getNotificationUrl(referenceType, referenceId)
            
            // URL should be null for unsupported types
            expect(url).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle case-insensitive reference types', () => {
      fc.assert(
        fc.property(
          supportedReferenceTypeArbitrary,
          fc.uuid(),
          fc.constantFrom('upper', 'lower', 'mixed'),
          (referenceType, referenceId, caseType) => {
            let modifiedType
            switch (caseType) {
              case 'upper':
                modifiedType = referenceType.toUpperCase()
                break
              case 'lower':
                modifiedType = referenceType.toLowerCase()
                break
              case 'mixed':
                modifiedType = referenceType.split('').map((c, i) => 
                  i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
                ).join('')
                break
              default:
                modifiedType = referenceType
            }
            
            const url = getNotificationUrl(modifiedType, referenceId)
            const expectedUrl = ROUTE_MAP[referenceType.toLowerCase().trim()]
            
            // Should return the same URL regardless of case
            expect(url).toBe(expectedUrl)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle reference types with leading/trailing whitespace', () => {
      fc.assert(
        fc.property(
          supportedReferenceTypeArbitrary,
          fc.uuid(),
          fc.string({ minLength: 0, maxLength: 5 }).filter(s => s.trim() === ''),
          (referenceType, referenceId, whitespace) => {
            // Add whitespace before and after
            const paddedType = whitespace + referenceType + whitespace
            
            const url = getNotificationUrl(paddedType, referenceId)
            const expectedUrl = ROUTE_MAP[referenceType.toLowerCase().trim()]
            
            // Should return the same URL after trimming
            expect(url).toBe(expectedUrl)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map announcement types to /announcements route', () => {
      const announcementTypes = ['announcement', 'announcement_urgent', 'announcement_normal']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...announcementTypes),
          fc.uuid(),
          (referenceType, referenceId) => {
            const url = getNotificationUrl(referenceType, referenceId)
            
            expect(url).toBe('/announcements')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map schedule types to /schedules route', () => {
      const scheduleTypes = ['schedule', 'schedule_updates']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...scheduleTypes),
          fc.uuid(),
          (referenceType, referenceId) => {
            const url = getNotificationUrl(referenceType, referenceId)
            
            expect(url).toBe('/schedules')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map event types to /events route', () => {
      const eventTypes = ['event', 'event_reminders']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...eventTypes),
          fc.uuid(),
          (referenceType, referenceId) => {
            const url = getNotificationUrl(referenceType, referenceId)
            
            expect(url).toBe('/events')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map tournament types to /tournaments route', () => {
      const tournamentTypes = ['tournament', 'tournament_updates']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...tournamentTypes),
          fc.uuid(),
          (referenceType, referenceId) => {
            const url = getNotificationUrl(referenceType, referenceId)
            
            expect(url).toBe('/tournaments')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map club application types to /club-applications route', () => {
      const clubAppTypes = ['club_application', 'application']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...clubAppTypes),
          fc.uuid(),
          (referenceType, referenceId) => {
            const url = getNotificationUrl(referenceType, referenceId)
            
            expect(url).toBe('/club-applications')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map training types to /training-logs route', () => {
      const trainingTypes = ['training_log', 'training']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...trainingTypes),
          fc.uuid(),
          (referenceType, referenceId) => {
            const url = getNotificationUrl(referenceType, referenceId)
            
            expect(url).toBe('/training-logs')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should map athlete type to /athletes route', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (referenceId) => {
            const url = getNotificationUrl('athlete', referenceId)
            
            expect(url).toBe('/athletes')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle non-string reference types gracefully', () => {
      // Test with various non-string types
      expect(getNotificationUrl(123, 'some-id')).toBeNull()
      expect(getNotificationUrl({}, 'some-id')).toBeNull()
      expect(getNotificationUrl([], 'some-id')).toBeNull()
      expect(getNotificationUrl(true, 'some-id')).toBeNull()
    })

    it('should generate consistent URLs for same reference type', () => {
      fc.assert(
        fc.property(
          supportedReferenceTypeArbitrary,
          fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
          (referenceType, referenceIds) => {
            // Generate URLs for multiple reference IDs with same type
            const urls = referenceIds.map(id => getNotificationUrl(referenceType, id))
            
            // All URLs should be the same (since we navigate to list view)
            const firstUrl = urls[0]
            for (const url of urls) {
              expect(url).toBe(firstUrl)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
