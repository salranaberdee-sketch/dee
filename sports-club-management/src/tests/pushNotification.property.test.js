/**
 * Push Notification Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Push Notifications
 * 
 * Tests for:
 * - Property 2: Notification delivery to all subscribed devices
 * - Property 3: Notification display format completeness
 * - Property 4: Preference filtering correctness
 * - Property 6: Target type filtering correctness
 * - Property 7: Status change notification delivery
 * - Property 8: Logout subscription cleanup
 * - Property 9: Invalid subscription cleanup
 * - Property 10: Notification click navigation
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * Arbitrary for generating valid user IDs (UUID format)
 */
const userIdArbitrary = fc.uuid()

/**
 * Arbitrary for generating push subscription data
 */
const subscriptionArbitrary = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  endpoint: fc.webUrl().map(url => `${url}/push/v1/${Math.random().toString(36).substring(7)}`),
  p256dh: fc.string({ minLength: 65, maxLength: 100 }),
  auth: fc.string({ minLength: 16, maxLength: 24 }),
  device_info: fc.record({
    userAgent: fc.constantFrom('Mozilla/5.0 (Windows)', 'Mozilla/5.0 (iPhone)', 'Mozilla/5.0 (Android)'),
    platform: fc.constantFrom('Win32', 'iPhone', 'Android')
  })
})

/**
 * Arbitrary for generating notification preferences
 */
const preferencesArbitrary = fc.record({
  push_enabled: fc.boolean(),
  announcement_urgent: fc.boolean(),
  announcement_normal: fc.boolean(),
  schedule_updates: fc.boolean(),
  event_reminders: fc.boolean(),
  tournament_updates: fc.boolean(),
  club_application: fc.boolean()
})

/**
 * Arbitrary for notification types
 */
const notificationTypeArbitrary = fc.constantFrom(
  'announcement_urgent',
  'announcement_normal',
  'schedule_updates',
  'event_reminders',
  'tournament_updates',
  'club_application'
)

/**
 * Arbitrary for target types
 */
const targetTypeArbitrary = fc.constantFrom('all', 'club', 'coaches', 'athletes')

/**
 * Arbitrary for user roles
 */
const userRoleArbitrary = fc.constantFrom('admin', 'coach', 'athlete')

/**
 * Arbitrary for reference types (for notification navigation)
 */
const referenceTypeArbitrary = fc.constantFrom(
  'announcement',
  'schedule',
  'tournament',
  'club_application',
  'event',
  'athlete',
  'training'
)

/**
 * Arbitrary for push notification payload
 */
const pushPayloadArbitrary = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  message: fc.string({ minLength: 1, maxLength: 500 }),
  type: notificationTypeArbitrary,
  reference_type: fc.option(referenceTypeArbitrary, { nil: undefined }),
  reference_id: fc.option(fc.uuid(), { nil: undefined }),
  priority: fc.constantFrom('normal', 'urgent')
})


// ============================================================================
// Pure Functions for Testing (extracted from service worker and edge function)
// ============================================================================

/**
 * Generate URL path based on notification reference type and ID
 * (Extracted from sw-push.js for testing)
 */
function getNavigationUrl(referenceType, referenceId) {
  const routes = {
    announcement: '/announcements',
    schedule: '/schedules',
    tournament: '/tournaments',
    tournament_detail: `/tournaments/${referenceId}`,
    club_application: '/my-applications',
    event: '/events',
    athlete: '/athletes',
    training: '/training-logs'
  }

  if (referenceId && referenceType) {
    if (referenceType === 'tournament' && referenceId) {
      return `/tournaments?id=${referenceId}`
    }
    if (referenceType === 'schedule' && referenceId) {
      return `/schedules?id=${referenceId}`
    }
    if (referenceType === 'announcement' && referenceId) {
      return `/announcements?id=${referenceId}`
    }
  }

  // Use hasOwnProperty to avoid prototype chain issues (e.g., 'constructor')
  const route = Object.prototype.hasOwnProperty.call(routes, referenceType) 
    ? routes[referenceType] 
    : null
  return route || '/'
}

/**
 * Check if notification should be sent based on user preferences
 * (Logic extracted from edge function)
 */
function shouldSendNotification(preferences, notificationType) {
  if (!preferences.push_enabled) {
    return false
  }
  
  const typeMapping = {
    'announcement_urgent': 'announcement_urgent',
    'announcement_normal': 'announcement_normal',
    'schedule_updates': 'schedule_updates',
    'event_reminders': 'event_reminders',
    'tournament_updates': 'tournament_updates',
    'club_application': 'club_application'
  }
  
  const preferenceKey = typeMapping[notificationType]
  if (!preferenceKey) {
    return preferences.push_enabled // Default to push_enabled for unknown types
  }
  
  return preferences[preferenceKey] === true
}

/**
 * Filter users by target type
 * (Logic extracted from edge function)
 */
function filterUsersByTargetType(users, targetType, targetClubId = null) {
  switch (targetType) {
    case 'all':
      return users
    case 'club':
      return users.filter(u => u.club_id === targetClubId)
    case 'coaches':
      return users.filter(u => u.role === 'coach')
    case 'athletes':
      return users.filter(u => u.role === 'athlete')
    default:
      return users
  }
}

/**
 * Count notifications to send for a user with N subscriptions
 */
function countNotificationsToSend(subscriptions, preferences, notificationType) {
  if (!shouldSendNotification(preferences, notificationType)) {
    return 0
  }
  return subscriptions.length
}

/**
 * Format notification for display
 */
function formatNotification(payload) {
  return {
    title: payload.title || 'สโมสรกีฬา',
    body: payload.message || payload.body || 'คุณมีการแจ้งเตือนใหม่',
    tag: payload.type || 'general',
    data: {
      referenceType: payload.reference_type || null,
      referenceId: payload.reference_id || null,
      url: payload.url || null
    }
  }
}


// ============================================================================
// Property Tests
// ============================================================================

describe('Push Notification Property Tests', () => {

  /**
   * **Feature: pwa-push-notifications, Property 2: Notification delivery to all subscribed devices**
   * **Validates: Requirements 1.3**
   * 
   * For any notification event and any user with N active subscriptions,
   * the system should attempt to send exactly N push notifications (one per subscription).
   */
  describe('Property 2: Notification delivery to all subscribed devices', () => {
    
    it('should attempt to send exactly N notifications for N subscriptions when preferences allow', () => {
      fc.assert(
        fc.property(
          fc.array(subscriptionArbitrary, { minLength: 1, maxLength: 10 }),
          notificationTypeArbitrary,
          (subscriptions, notificationType) => {
            // Create preferences with the notification type enabled
            const preferences = {
              push_enabled: true,
              announcement_urgent: true,
              announcement_normal: true,
              schedule_updates: true,
              event_reminders: true,
              tournament_updates: true,
              club_application: true
            }
            
            const count = countNotificationsToSend(subscriptions, preferences, notificationType)
            
            // Should send exactly N notifications for N subscriptions
            expect(count).toBe(subscriptions.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should send zero notifications when push is disabled', () => {
      fc.assert(
        fc.property(
          fc.array(subscriptionArbitrary, { minLength: 1, maxLength: 10 }),
          notificationTypeArbitrary,
          (subscriptions, notificationType) => {
            const preferences = {
              push_enabled: false,
              announcement_urgent: true,
              announcement_normal: true,
              schedule_updates: true,
              event_reminders: true,
              tournament_updates: true,
              club_application: true
            }
            
            const count = countNotificationsToSend(subscriptions, preferences, notificationType)
            
            // Should send zero notifications when push is disabled
            expect(count).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should send zero notifications when specific type is disabled', () => {
      fc.assert(
        fc.property(
          fc.array(subscriptionArbitrary, { minLength: 1, maxLength: 10 }),
          notificationTypeArbitrary,
          (subscriptions, notificationType) => {
            // Create preferences with push enabled but specific type disabled
            const preferences = {
              push_enabled: true,
              announcement_urgent: false,
              announcement_normal: false,
              schedule_updates: false,
              event_reminders: false,
              tournament_updates: false,
              club_application: false
            }
            
            const count = countNotificationsToSend(subscriptions, preferences, notificationType)
            
            // Should send zero notifications when type is disabled
            expect(count).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: pwa-push-notifications, Property 3: Notification display format completeness**
   * **Validates: Requirements 1.4**
   * 
   * For any push notification payload containing title and message,
   * the displayed notification should include both the title and message fields.
   */
  describe('Property 3: Notification display format completeness', () => {
    
    it('should include title and message in formatted notification', () => {
      fc.assert(
        fc.property(
          pushPayloadArbitrary,
          (payload) => {
            const formatted = formatNotification(payload)
            
            // Title should be present (either from payload or default)
            expect(formatted.title).toBeTruthy()
            expect(typeof formatted.title).toBe('string')
            expect(formatted.title.length).toBeGreaterThan(0)
            
            // Body should be present (either from payload or default)
            expect(formatted.body).toBeTruthy()
            expect(typeof formatted.body).toBe('string')
            expect(formatted.body.length).toBeGreaterThan(0)
            
            // If payload has title, it should be used
            if (payload.title) {
              expect(formatted.title).toBe(payload.title)
            }
            
            // If payload has message, it should be used
            if (payload.message) {
              expect(formatted.body).toBe(payload.message)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve reference data in notification', () => {
      fc.assert(
        fc.property(
          pushPayloadArbitrary,
          (payload) => {
            const formatted = formatNotification(payload)
            
            // Data object should exist
            expect(formatted.data).toBeDefined()
            
            // Reference type should match if provided
            if (payload.reference_type) {
              expect(formatted.data.referenceType).toBe(payload.reference_type)
            }
            
            // Reference ID should match if provided
            if (payload.reference_id) {
              expect(formatted.data.referenceId).toBe(payload.reference_id)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use default values when payload fields are missing', () => {
      const emptyPayload = {}
      const formatted = formatNotification(emptyPayload)
      
      expect(formatted.title).toBe('สโมสรกีฬา')
      expect(formatted.body).toBe('คุณมีการแจ้งเตือนใหม่')
      expect(formatted.tag).toBe('general')
    })
  })


  /**
   * **Feature: pwa-push-notifications, Property 4: Preference filtering correctness**
   * **Validates: Requirements 2.2, 2.3**
   * 
   * For any notification type and user preference setting, if the preference
   * for that type is disabled, no push notification of that type should be sent;
   * if enabled, the notification should be sent.
   */
  describe('Property 4: Preference filtering correctness', () => {
    
    it('should correctly filter notifications based on preferences', () => {
      fc.assert(
        fc.property(
          preferencesArbitrary,
          notificationTypeArbitrary,
          (preferences, notificationType) => {
            const shouldSend = shouldSendNotification(preferences, notificationType)
            
            // If push is disabled globally, should not send
            if (!preferences.push_enabled) {
              expect(shouldSend).toBe(false)
              return true
            }
            
            // Check specific type preference
            const expectedResult = preferences[notificationType] === true
            expect(shouldSend).toBe(expectedResult)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should always block notifications when push_enabled is false', () => {
      fc.assert(
        fc.property(
          notificationTypeArbitrary,
          (notificationType) => {
            // All type preferences enabled, but push_enabled is false
            const preferences = {
              push_enabled: false,
              announcement_urgent: true,
              announcement_normal: true,
              schedule_updates: true,
              event_reminders: true,
              tournament_updates: true,
              club_application: true
            }
            
            const shouldSend = shouldSendNotification(preferences, notificationType)
            expect(shouldSend).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow notifications when both push_enabled and type preference are true', () => {
      fc.assert(
        fc.property(
          notificationTypeArbitrary,
          (notificationType) => {
            // All preferences enabled
            const preferences = {
              push_enabled: true,
              announcement_urgent: true,
              announcement_normal: true,
              schedule_updates: true,
              event_reminders: true,
              tournament_updates: true,
              club_application: true
            }
            
            const shouldSend = shouldSendNotification(preferences, notificationType)
            expect(shouldSend).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: pwa-push-notifications, Property 6: Target type filtering correctness**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   * 
   * For any announcement with a specific target_type, push notifications
   * should only be sent to users matching that target criteria.
   */
  describe('Property 6: Target type filtering correctness', () => {
    
    /**
     * Arbitrary for generating users with roles and club membership
     */
    const userArbitrary = fc.record({
      id: fc.uuid(),
      role: userRoleArbitrary,
      club_id: fc.option(fc.uuid(), { nil: null })
    })

    it('should return all users when target_type is "all"', () => {
      fc.assert(
        fc.property(
          fc.array(userArbitrary, { minLength: 1, maxLength: 20 }),
          (users) => {
            const filtered = filterUsersByTargetType(users, 'all')
            
            expect(filtered.length).toBe(users.length)
            expect(filtered).toEqual(users)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return only users in specified club when target_type is "club"', () => {
      fc.assert(
        fc.property(
          fc.array(userArbitrary, { minLength: 1, maxLength: 20 }),
          fc.uuid(),
          (users, targetClubId) => {
            // Ensure some users have the target club
            const usersWithClub = users.map((u, i) => ({
              ...u,
              club_id: i % 3 === 0 ? targetClubId : u.club_id
            }))
            
            const filtered = filterUsersByTargetType(usersWithClub, 'club', targetClubId)
            
            // All filtered users should have the target club_id
            filtered.forEach(user => {
              expect(user.club_id).toBe(targetClubId)
            })
            
            // Count should match users with target club
            const expectedCount = usersWithClub.filter(u => u.club_id === targetClubId).length
            expect(filtered.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return only coaches when target_type is "coaches"', () => {
      fc.assert(
        fc.property(
          fc.array(userArbitrary, { minLength: 1, maxLength: 20 }),
          (users) => {
            const filtered = filterUsersByTargetType(users, 'coaches')
            
            // All filtered users should be coaches
            filtered.forEach(user => {
              expect(user.role).toBe('coach')
            })
            
            // Count should match coaches in original list
            const expectedCount = users.filter(u => u.role === 'coach').length
            expect(filtered.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return only athletes when target_type is "athletes"', () => {
      fc.assert(
        fc.property(
          fc.array(userArbitrary, { minLength: 1, maxLength: 20 }),
          (users) => {
            const filtered = filterUsersByTargetType(users, 'athletes')
            
            // All filtered users should be athletes
            filtered.forEach(user => {
              expect(user.role).toBe('athlete')
            })
            
            // Count should match athletes in original list
            const expectedCount = users.filter(u => u.role === 'athlete').length
            expect(filtered.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: pwa-push-notifications, Property 7: Status change notification delivery**
   * **Validates: Requirements 3.4, 3.5**
   * 
   * For any status change (tournament registration or club application),
   * the affected user should receive exactly one push notification about the change.
   */
  describe('Property 7: Status change notification delivery', () => {
    
    /**
     * Simulate status change notification logic
     */
    function generateStatusChangeNotifications(statusChange, userSubscriptions) {
      const { userId, changeType, newStatus } = statusChange
      
      // Get subscriptions for the affected user
      const userSubs = userSubscriptions.filter(s => s.user_id === userId)
      
      // Generate one notification per subscription for the user
      return userSubs.map(sub => ({
        subscription: sub,
        notification: {
          title: changeType === 'tournament' ? 'สถานะการลงทะเบียนแข่งขัน' : 'สถานะการสมัครชมรม',
          message: `สถานะของคุณเปลี่ยนเป็น: ${newStatus}`,
          type: changeType === 'tournament' ? 'tournament_updates' : 'club_application'
        }
      }))
    }

    const statusChangeArbitrary = fc.record({
      userId: fc.uuid(),
      changeType: fc.constantFrom('tournament', 'club_application'),
      newStatus: fc.constantFrom('approved', 'rejected', 'pending', 'confirmed')
    })

    it('should generate exactly one notification per subscription for status changes', () => {
      fc.assert(
        fc.property(
          statusChangeArbitrary,
          fc.array(subscriptionArbitrary, { minLength: 0, maxLength: 10 }),
          (statusChange, allSubscriptions) => {
            // Ensure some subscriptions belong to the affected user
            const userSubscriptions = allSubscriptions.map((sub, i) => ({
              ...sub,
              user_id: i % 2 === 0 ? statusChange.userId : sub.user_id
            }))
            
            const notifications = generateStatusChangeNotifications(statusChange, userSubscriptions)
            
            // Count subscriptions for the affected user
            const userSubCount = userSubscriptions.filter(s => s.user_id === statusChange.userId).length
            
            // Should generate exactly one notification per subscription
            expect(notifications.length).toBe(userSubCount)
            
            // Each notification should be for the correct user
            notifications.forEach(n => {
              expect(n.subscription.user_id).toBe(statusChange.userId)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include correct notification type based on change type', () => {
      fc.assert(
        fc.property(
          statusChangeArbitrary,
          (statusChange) => {
            const mockSubscription = {
              id: 'test-id',
              user_id: statusChange.userId,
              endpoint: 'https://test.com/push',
              p256dh: 'test-key',
              auth: 'test-auth'
            }
            
            const notifications = generateStatusChangeNotifications(statusChange, [mockSubscription])
            
            if (notifications.length > 0) {
              const expectedType = statusChange.changeType === 'tournament' 
                ? 'tournament_updates' 
                : 'club_application'
              
              expect(notifications[0].notification.type).toBe(expectedType)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: pwa-push-notifications, Property 8: Logout subscription cleanup**
   * **Validates: Requirements 4.2**
   * 
   * For any user logout action, all push subscriptions for that device
   * should be removed from the database.
   */
  describe('Property 8: Logout subscription cleanup', () => {
    
    /**
     * Simulate logout cleanup logic
     */
    function simulateLogoutCleanup(subscriptions, userId, deviceEndpoint) {
      // Remove subscriptions matching user and device
      return subscriptions.filter(sub => 
        !(sub.user_id === userId && sub.endpoint === deviceEndpoint)
      )
    }

    it('should remove subscription for logged out device', () => {
      fc.assert(
        fc.property(
          fc.array(subscriptionArbitrary, { minLength: 1, maxLength: 10 }),
          fc.nat({ max: 9 }),
          (subscriptions, targetIndex) => {
            if (subscriptions.length === 0) return true
            
            const idx = targetIndex % subscriptions.length
            const targetSub = subscriptions[idx]
            
            const remaining = simulateLogoutCleanup(
              subscriptions, 
              targetSub.user_id, 
              targetSub.endpoint
            )
            
            // Target subscription should be removed
            const targetStillExists = remaining.some(
              s => s.user_id === targetSub.user_id && s.endpoint === targetSub.endpoint
            )
            expect(targetStillExists).toBe(false)
            
            // Other subscriptions should remain
            expect(remaining.length).toBe(subscriptions.length - 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not affect other users subscriptions', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 10, maxLength: 50 }),
          (userId1, userId2, endpoint) => {
            // Ensure different users
            if (userId1 === userId2) return true
            
            const subscriptions = [
              { user_id: userId1, endpoint: `https://push.com/${endpoint}/1` },
              { user_id: userId2, endpoint: `https://push.com/${endpoint}/2` }
            ]
            
            // Logout user1
            const remaining = simulateLogoutCleanup(
              subscriptions, 
              userId1, 
              subscriptions[0].endpoint
            )
            
            // User2's subscription should remain
            const user2SubExists = remaining.some(s => s.user_id === userId2)
            expect(user2SubExists).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: pwa-push-notifications, Property 9: Invalid subscription cleanup**
   * **Validates: Requirements 4.4**
   * 
   * For any push subscription that returns an error (410 Gone or similar),
   * the subscription should be removed from the database.
   */
  describe('Property 9: Invalid subscription cleanup', () => {
    
    /**
     * Simulate push send result and cleanup
     */
    function simulatePushSendWithCleanup(subscriptions, sendResults) {
      // sendResults is an array of { subscriptionId, statusCode }
      const invalidIds = sendResults
        .filter(r => r.statusCode === 410 || r.statusCode === 404)
        .map(r => r.subscriptionId)
      
      // Remove invalid subscriptions
      return subscriptions.filter(sub => !invalidIds.includes(sub.id))
    }

    const sendResultArbitrary = fc.record({
      subscriptionId: fc.uuid(),
      statusCode: fc.constantFrom(200, 201, 400, 404, 410, 429, 500)
    })

    it('should remove subscriptions that return 410 Gone', () => {
      fc.assert(
        fc.property(
          fc.array(subscriptionArbitrary, { minLength: 1, maxLength: 10 }),
          (subscriptions) => {
            // Mark first subscription as invalid (410)
            const sendResults = subscriptions.map((sub, i) => ({
              subscriptionId: sub.id,
              statusCode: i === 0 ? 410 : 200
            }))
            
            const remaining = simulatePushSendWithCleanup(subscriptions, sendResults)
            
            // First subscription should be removed
            const firstStillExists = remaining.some(s => s.id === subscriptions[0].id)
            expect(firstStillExists).toBe(false)
            
            // Other subscriptions should remain
            expect(remaining.length).toBe(subscriptions.length - 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove subscriptions that return 404 Not Found', () => {
      fc.assert(
        fc.property(
          fc.array(subscriptionArbitrary, { minLength: 1, maxLength: 10 }),
          (subscriptions) => {
            // Mark all subscriptions as 404
            const sendResults = subscriptions.map(sub => ({
              subscriptionId: sub.id,
              statusCode: 404
            }))
            
            const remaining = simulatePushSendWithCleanup(subscriptions, sendResults)
            
            // All subscriptions should be removed
            expect(remaining.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should keep subscriptions with successful responses', () => {
      fc.assert(
        fc.property(
          fc.array(subscriptionArbitrary, { minLength: 1, maxLength: 10 }),
          (subscriptions) => {
            // All successful responses
            const sendResults = subscriptions.map(sub => ({
              subscriptionId: sub.id,
              statusCode: 200
            }))
            
            const remaining = simulatePushSendWithCleanup(subscriptions, sendResults)
            
            // All subscriptions should remain
            expect(remaining.length).toBe(subscriptions.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should keep subscriptions with rate limit errors (429)', () => {
      fc.assert(
        fc.property(
          fc.array(subscriptionArbitrary, { minLength: 1, maxLength: 10 }),
          (subscriptions) => {
            // All rate limited
            const sendResults = subscriptions.map(sub => ({
              subscriptionId: sub.id,
              statusCode: 429
            }))
            
            const remaining = simulatePushSendWithCleanup(subscriptions, sendResults)
            
            // All subscriptions should remain (rate limit is temporary)
            expect(remaining.length).toBe(subscriptions.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: pwa-push-notifications, Property 10: Notification click navigation**
   * **Validates: Requirements 6.3**
   * 
   * For any push notification with a reference_type and reference_id,
   * clicking the notification should navigate to the corresponding URL path.
   */
  describe('Property 10: Notification click navigation', () => {
    
    it('should generate correct URL for announcement references', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (referenceId) => {
            const url = getNavigationUrl('announcement', referenceId)
            
            expect(url).toBe(`/announcements?id=${referenceId}`)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate correct URL for schedule references', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (referenceId) => {
            const url = getNavigationUrl('schedule', referenceId)
            
            expect(url).toBe(`/schedules?id=${referenceId}`)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate correct URL for tournament references', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (referenceId) => {
            const url = getNavigationUrl('tournament', referenceId)
            
            expect(url).toBe(`/tournaments?id=${referenceId}`)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return base route when no reference ID provided', () => {
      fc.assert(
        fc.property(
          referenceTypeArbitrary,
          (referenceType) => {
            const url = getNavigationUrl(referenceType, null)
            
            // Should return base route without query params
            expect(url).not.toContain('?id=')
            expect(url.startsWith('/')).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return root path for unknown reference types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 20 }).filter(s => 
            !['announcement', 'schedule', 'tournament', 'club_application', 'event', 'athlete', 'training'].includes(s)
          ),
          fc.uuid(),
          (unknownType, referenceId) => {
            const url = getNavigationUrl(unknownType, referenceId)
            
            // Unknown types should return root
            expect(url).toBe('/')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate valid URL paths for all known reference types', () => {
      fc.assert(
        fc.property(
          referenceTypeArbitrary,
          fc.uuid(),
          (referenceType, referenceId) => {
            const url = getNavigationUrl(referenceType, referenceId)
            
            // URL should start with /
            expect(url.startsWith('/')).toBe(true)
            
            // URL should not be empty
            expect(url.length).toBeGreaterThan(0)
            
            // URL should be a valid path (no double slashes except in query)
            const pathPart = url.split('?')[0]
            expect(pathPart).not.toMatch(/\/\//)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

})
