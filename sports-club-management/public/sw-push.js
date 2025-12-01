/**
 * Service Worker Push Notification Handlers
 * 
 * Handles push events and notification clicks for PWA push notifications
 * Requirements: 1.4, 6.3, 6.4
 */

// Default notification icon
const DEFAULT_ICON = '/pwa-192x192.png'
const DEFAULT_BADGE = '/pwa-192x192.png'

/**
 * Generate URL path based on notification reference type and ID
 * @param {string} referenceType - Type of reference (announcement, schedule, tournament, etc.)
 * @param {string} referenceId - ID of the referenced item
 * @returns {string} URL path to navigate to
 */
function getNavigationUrl(referenceType, referenceId) {
  const routes = {
    announcement: '/announcements',
    schedule: '/schedules',
    tournament: `/tournaments`,
    tournament_detail: `/tournaments/${referenceId}`,
    club_application: '/my-applications',
    event: '/events',
    athlete: '/athletes',
    training: '/training-logs'
  }

  // If we have a specific ID and a detail route pattern
  if (referenceId && referenceType) {
    // For types that support detail views
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

  return routes[referenceType] || '/'
}

/**
 * Handle incoming push events
 * Requirement 1.4: Display notification with title, message, and appropriate icon
 * Requirement 6.4: Group notifications appropriately to avoid spam
 */
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received')

  let notificationData = {
    title: 'สโมสรกีฬา',
    body: 'คุณมีการแจ้งเตือนใหม่',
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: 'default',
    data: {}
  }

  // Parse push payload if available
  if (event.data) {
    try {
      const payload = event.data.json()
      
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.message || payload.body || notificationData.body,
        icon: payload.icon || DEFAULT_ICON,
        badge: payload.badge || DEFAULT_BADGE,
        // Use tag for grouping similar notifications (Requirement 6.4)
        tag: payload.type || payload.tag || 'general',
        data: {
          referenceType: payload.reference_type || payload.referenceType || null,
          referenceId: payload.reference_id || payload.referenceId || null,
          url: payload.url || null,
          type: payload.type || 'general',
          timestamp: payload.timestamp || Date.now()
        },
        // Renotify allows updating existing notification with same tag
        renotify: true,
        // Require interaction for important notifications
        requireInteraction: payload.priority === 'urgent' || payload.requireInteraction || false,
        // Vibration pattern for mobile devices
        vibrate: payload.priority === 'urgent' ? [200, 100, 200] : [100]
      }
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e)
      // Try to get text data as fallback
      try {
        notificationData.body = event.data.text()
      } catch (textError) {
        console.error('[Service Worker] Error getting text data:', textError)
      }
    }
  }

  // Show the notification
  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      renotify: notificationData.renotify,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      // Actions for notification (optional)
      actions: [
        {
          action: 'open',
          title: 'เปิดดู'
        },
        {
          action: 'close',
          title: 'ปิด'
        }
      ]
    }
  )

  event.waitUntil(promiseChain)
})

/**
 * Handle notification click events
 * Requirement 6.3: Open app and navigate to relevant content
 */
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked')

  // Close the notification
  event.notification.close()

  // Handle action buttons
  if (event.action === 'close') {
    return
  }

  // Determine the URL to open
  let urlToOpen = '/'
  const notificationData = event.notification.data || {}

  if (notificationData.url) {
    // Use explicit URL if provided
    urlToOpen = notificationData.url
  } else if (notificationData.referenceType) {
    // Generate URL from reference type and ID
    urlToOpen = getNavigationUrl(
      notificationData.referenceType,
      notificationData.referenceId
    )
  }

  // Ensure URL is absolute
  const fullUrl = new URL(urlToOpen, self.location.origin).href

  // Focus existing window or open new one
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(windowClients) {
    // Check if there's already a window open
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i]
      // If we find an existing window, focus it and navigate
      if ('focus' in client) {
        return client.focus().then(function(focusedClient) {
          // Navigate to the target URL
          if ('navigate' in focusedClient) {
            return focusedClient.navigate(fullUrl)
          }
          return focusedClient
        })
      }
    }
    // No existing window, open a new one
    if (clients.openWindow) {
      return clients.openWindow(fullUrl)
    }
  })

  event.waitUntil(promiseChain)
})

/**
 * Handle notification close events (for analytics/tracking if needed)
 */
self.addEventListener('notificationclose', function(event) {
  console.log('[Service Worker] Notification closed', event.notification.tag)
})
