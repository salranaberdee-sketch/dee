/**
 * Notification Navigation Utility
 * Generates URLs for navigating to notification-related content
 * 
 * Feature: notification-inbox
 * Requirements: 6.1, 6.4
 * Property 9: Navigation URL generation
 */

/**
 * Route mapping for reference types to their corresponding routes
 * Maps reference_type values to route patterns
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
 * Generate navigation URL for a notification based on its reference type and ID
 * 
 * @param {string|null} referenceType - The type of content the notification references
 * @param {string|null} referenceId - The ID of the referenced content
 * @returns {string|null} The URL to navigate to, or null if no valid URL can be generated
 * 
 * @example
 * getNotificationUrl('announcement', '123-456') // returns '/announcements'
 * getNotificationUrl('tournament', 'abc-def') // returns '/tournaments'
 * getNotificationUrl(null, null) // returns null
 * getNotificationUrl('unknown_type', '123') // returns null
 */
export function getNotificationUrl(referenceType, referenceId) {
  // Handle missing or invalid reference type
  if (!referenceType || typeof referenceType !== 'string') {
    return null
  }
  
  // Normalize reference type (lowercase, trim)
  const normalizedType = referenceType.toLowerCase().trim()
  
  // Look up the route for this reference type
  const baseRoute = ROUTE_MAP[normalizedType]
  
  // If no route mapping exists, return null
  if (!baseRoute) {
    return null
  }
  
  // Return the base route (we navigate to the list view)
  // The referenceId can be used for highlighting/scrolling to specific item
  return baseRoute
}

/**
 * Check if a notification has a valid navigable reference
 * 
 * @param {Object} notification - The notification object
 * @returns {boolean} True if the notification can be navigated to
 */
export function hasNavigableReference(notification) {
  if (!notification) {
    return false
  }
  
  const url = getNotificationUrl(notification.reference_type, notification.reference_id)
  return url !== null
}

/**
 * Get navigation info for a notification
 * Returns both the URL and whether navigation is possible
 * 
 * @param {Object} notification - The notification object
 * @returns {{url: string|null, canNavigate: boolean, referenceType: string|null, referenceId: string|null}}
 */
export function getNavigationInfo(notification) {
  if (!notification) {
    return {
      url: null,
      canNavigate: false,
      referenceType: null,
      referenceId: null
    }
  }
  
  const url = getNotificationUrl(notification.reference_type, notification.reference_id)
  
  return {
    url,
    canNavigate: url !== null,
    referenceType: notification.reference_type || null,
    referenceId: notification.reference_id || null
  }
}

/**
 * Get all supported reference types
 * Useful for validation and testing
 * 
 * @returns {string[]} Array of supported reference type keys
 */
export function getSupportedReferenceTypes() {
  return Object.keys(ROUTE_MAP)
}
