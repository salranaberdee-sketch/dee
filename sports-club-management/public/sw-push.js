/**
 * Service Worker Push Notification Handlers
 * 
 * Handles push events and notification clicks for PWA push notifications
 * Requirements: 1.3, 1.4, 2.5, 4.5, 6.3, 6.4
 */

// Default notification icon
const DEFAULT_ICON = '/pwa-192x192.png'
const DEFAULT_BADGE = '/pwa-192x192.png'

// IndexedDB configuration for notification preferences
const PREFS_DB_NAME = 'notification-prefs-db'
const PREFS_DB_VERSION = 1
const PREFS_STORE_NAME = 'preferences'

/**
 * รูปแบบการสั่นที่รองรับ
 * ค่าเป็น array ของ milliseconds สำหรับ Vibration API
 */
const VIBRATION_PATTERNS = {
  short: [100],              // สั่นสั้น 100ms
  medium: [200, 100, 200],   // สั่น-หยุด-สั่น
  long: [500],               // สั่นยาว 500ms
  pulse: [100, 50, 100, 50, 100] // สั่นเป็นจังหวะ
}

/**
 * เปิด IndexedDB สำหรับเก็บ notification preferences
 * @returns {Promise<IDBDatabase>}
 */
function openPrefsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PREFS_DB_NAME, PREFS_DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(PREFS_STORE_NAME)) {
        db.createObjectStore(PREFS_STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

/**
 * ดึง notification preferences จาก IndexedDB
 * @returns {Promise<Object>} preferences object
 */
async function getNotificationPreferences() {
  try {
    const db = await openPrefsDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PREFS_STORE_NAME, 'readonly')
      const store = tx.objectStore(PREFS_STORE_NAME)
      const request = store.get('notification_preferences')
      
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.value : getDefaultPreferences())
      }
      request.onerror = () => {
        console.warn('[Service Worker] Error reading preferences:', request.error)
        resolve(getDefaultPreferences())
      }
    })
  } catch (err) {
    console.warn('[Service Worker] Error opening prefs DB:', err)
    return getDefaultPreferences()
  }
}

/**
 * ค่าเริ่มต้นของ notification preferences
 * @returns {Object}
 */
function getDefaultPreferences() {
  return {
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    notification_sound: 'default',
    vibration_enabled: true,
    vibration_pattern: 'short'
  }
}

/**
 * ตรวจสอบว่าเวลาปัจจุบันอยู่ในช่วง Quiet Hours หรือไม่
 * รองรับการข้ามเที่ยงคืน (เช่น 22:00 ถึง 07:00)
 * Implements Requirements 1.3, 1.4
 * @param {Object} prefs - notification preferences
 * @returns {boolean} true ถ้าอยู่ในช่วง Quiet Hours
 */
function isWithinQuietHours(prefs) {
  if (!prefs.quiet_hours_enabled) return false
  
  const now = new Date()
  const [startHour, startMin] = prefs.quiet_hours_start.split(':').map(Number)
  const [endHour, endMin] = prefs.quiet_hours_end.split(':').map(Number)
  
  const currentHour = now.getHours()
  const currentMin = now.getMinutes()
  
  // แปลงเป็นนาทีตั้งแต่เที่ยงคืน
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  const currentMinutes = currentHour * 60 + currentMin
  
  // กรณีข้ามเที่ยงคืน (เช่น 22:00 ถึง 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
  
  // กรณีปกติ (เช่น 09:00 ถึง 17:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * เล่นเสียงแจ้งเตือนโดยใช้ Web Audio API
 * Implements Requirement 2.5
 * @param {string} soundKey - ชื่อเสียง ('default', 'chime', 'bell', 'soft', 'none')
 */
function playNotificationSound(soundKey) {
  if (soundKey === 'none') return
  
  try {
    // Service Worker ไม่สามารถใช้ AudioContext โดยตรงได้
    // ส่ง message ไปยัง client เพื่อเล่นเสียง
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            sound: soundKey
          })
        })
      })
  } catch (err) {
    console.warn('[Service Worker] Error playing sound:', err)
  }
}

/**
 * ทริกเกอร์การสั่นตามรูปแบบที่เลือก
 * Implements Requirement 4.5
 * @param {Object} prefs - notification preferences
 * @returns {Array|undefined} vibration pattern หรือ undefined ถ้าปิดการสั่น
 */
function getVibrationPattern(prefs) {
  if (!prefs.vibration_enabled) return undefined
  
  const pattern = VIBRATION_PATTERNS[prefs.vibration_pattern]
  return pattern || VIBRATION_PATTERNS.short
}

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
 * Requirement 1.3, 1.4: Check quiet hours and suppress if needed
 * Requirement 2.5: Play selected notification sound
 * Requirement 4.5: Trigger selected vibration pattern
 * Requirement 6.4: Group notifications appropriately to avoid spam
 */
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received')

  const promiseChain = (async () => {
    // ดึง notification preferences จาก IndexedDB
    const prefs = await getNotificationPreferences()
    
    // ตรวจสอบ Quiet Hours - ถ้าอยู่ในช่วง Quiet Hours ให้ suppress notification
    // Implements Requirements 1.3, 1.4
    if (isWithinQuietHours(prefs)) {
      console.log('[Service Worker] Notification suppressed - within quiet hours')
      return // ไม่แสดง notification
    }

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
            timestamp: payload.timestamp || Date.now(),
            // เก็บ sound preference สำหรับใช้ตอนแสดง notification
            soundKey: prefs.notification_sound
          },
          // Renotify allows updating existing notification with same tag
          renotify: true,
          // Require interaction for important notifications
          requireInteraction: payload.priority === 'urgent' || payload.requireInteraction || false
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

    // กำหนด vibration pattern ตาม user preference
    // Implements Requirement 4.5
    const vibrationPattern = getVibrationPattern(prefs)

    // เล่นเสียงแจ้งเตือนตาม user preference
    // Implements Requirement 2.5
    if (prefs.notification_sound !== 'none') {
      playNotificationSound(prefs.notification_sound)
    }

    // Show the notification
    await self.registration.showNotification(
      notificationData.title,
      {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        data: notificationData.data,
        renotify: notificationData.renotify,
        requireInteraction: notificationData.requireInteraction,
        vibrate: vibrationPattern,
        // ปิดเสียง default ของ browser เพราะเราจัดการเสียงเอง
        silent: prefs.notification_sound === 'none',
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
  })()

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

/**
 * Handle messages from client (for syncing preferences)
 */
self.addEventListener('message', function(event) {
  console.log('[Service Worker] Message received:', event.data?.type)
  
  if (event.data?.type === 'SYNC_NOTIFICATION_PREFERENCES') {
    // บันทึก preferences ลง IndexedDB
    saveNotificationPreferences(event.data.preferences)
      .then(() => {
        console.log('[Service Worker] Preferences synced successfully')
      })
      .catch(err => {
        console.error('[Service Worker] Error syncing preferences:', err)
      })
  }
})

/**
 * บันทึก notification preferences ลง IndexedDB
 * @param {Object} preferences - notification preferences object
 */
async function saveNotificationPreferences(preferences) {
  try {
    const db = await openPrefsDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PREFS_STORE_NAME, 'readwrite')
      const store = tx.objectStore(PREFS_STORE_NAME)
      
      store.put({
        key: 'notification_preferences',
        value: preferences,
        updated_at: Date.now()
      })
      
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('[Service Worker] Error saving preferences:', err)
    throw err
  }
}
