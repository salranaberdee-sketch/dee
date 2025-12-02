/**
 * IndexedDB Helper for PWA Offline Support
 * Provides caching for notifications and offline queue for training logs
 */

const DB_NAME = 'sports-club-db'
const DB_VERSION = 1

// Store names
const STORES = {
  NOTIFICATIONS: 'notifications',
  OFFLINE_QUEUE: 'offline_queue',
  CACHE_META: 'cache_meta'
}

let dbInstance = null

/**
 * Open/create IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export async function openDB() {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Notifications store
      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notifStore = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' })
        notifStore.createIndex('user_id', 'user_id', { unique: false })
        notifStore.createIndex('created_at', 'created_at', { unique: false })
      }

      // Offline queue store
      if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'queueId', autoIncrement: true })
        queueStore.createIndex('type', 'type', { unique: false })
        queueStore.createIndex('created_at', 'created_at', { unique: false })
      }

      // Cache metadata store
      if (!db.objectStoreNames.contains(STORES.CACHE_META)) {
        db.createObjectStore(STORES.CACHE_META, { keyPath: 'key' })
      }
    }
  })
}


// ============ NOTIFICATIONS CACHE ============

/**
 * Save notifications to IndexedDB
 * @param {string} userId - User ID
 * @param {Array} notifications - Notifications array
 */
export async function cacheNotifications(userId, notifications) {
  const db = await openDB()
  const tx = db.transaction(STORES.NOTIFICATIONS, 'readwrite')
  const store = tx.objectStore(STORES.NOTIFICATIONS)

  // Clear old notifications for this user first
  const index = store.index('user_id')
  const range = IDBKeyRange.only(userId)
  let cursor = await promisifyRequest(index.openCursor(range))
  
  while (cursor) {
    cursor.delete()
    cursor = await promisifyRequest(cursor.continue())
  }

  // Add new notifications
  for (const notif of notifications) {
    store.put({ ...notif, user_id: userId })
  }

  // Update cache metadata
  await setCacheMeta(`notifications_${userId}`, {
    lastUpdated: Date.now(),
    count: notifications.length
  })

  return promisifyTransaction(tx)
}

/**
 * Get cached notifications from IndexedDB
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Cached notifications
 */
export async function getCachedNotifications(userId) {
  const db = await openDB()
  const tx = db.transaction(STORES.NOTIFICATIONS, 'readonly')
  const store = tx.objectStore(STORES.NOTIFICATIONS)
  const index = store.index('user_id')

  const notifications = await promisifyRequest(index.getAll(userId))
  
  // Sort by created_at descending
  return notifications.sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  )
}

/**
 * Add single notification to cache
 * @param {Object} notification - Notification object
 */
export async function addNotificationToCache(notification) {
  const db = await openDB()
  const tx = db.transaction(STORES.NOTIFICATIONS, 'readwrite')
  const store = tx.objectStore(STORES.NOTIFICATIONS)
  store.put(notification)
  return promisifyTransaction(tx)
}

/**
 * Remove notification from cache
 * @param {string} notificationId - Notification ID
 */
export async function removeNotificationFromCache(notificationId) {
  const db = await openDB()
  const tx = db.transaction(STORES.NOTIFICATIONS, 'readwrite')
  const store = tx.objectStore(STORES.NOTIFICATIONS)
  store.delete(notificationId)
  return promisifyTransaction(tx)
}

/**
 * Update notification in cache
 * @param {Object} notification - Updated notification object
 */
export async function updateNotificationInCache(notification) {
  const db = await openDB()
  const tx = db.transaction(STORES.NOTIFICATIONS, 'readwrite')
  const store = tx.objectStore(STORES.NOTIFICATIONS)
  store.put(notification)
  return promisifyTransaction(tx)
}

// ============ OFFLINE QUEUE ============

/**
 * Add item to offline queue
 * @param {string} type - Action type (e.g., 'training_log_add', 'training_log_update')
 * @param {Object} data - Data to sync
 * @returns {Promise<number>} Queue item ID
 */
export async function addToOfflineQueue(type, data) {
  const db = await openDB()
  const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.OFFLINE_QUEUE)

  const item = {
    type,
    data,
    created_at: new Date().toISOString(),
    retries: 0
  }

  const request = store.add(item)
  await promisifyTransaction(tx)
  return request.result
}

/**
 * Get all items from offline queue
 * @returns {Promise<Array>} Queue items
 */
export async function getOfflineQueue() {
  const db = await openDB()
  const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readonly')
  const store = tx.objectStore(STORES.OFFLINE_QUEUE)
  return promisifyRequest(store.getAll())
}

/**
 * Remove item from offline queue
 * @param {number} queueId - Queue item ID
 */
export async function removeFromOfflineQueue(queueId) {
  const db = await openDB()
  const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.OFFLINE_QUEUE)
  store.delete(queueId)
  return promisifyTransaction(tx)
}

/**
 * Update retry count for queue item
 * @param {number} queueId - Queue item ID
 */
export async function incrementQueueRetry(queueId) {
  const db = await openDB()
  const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.OFFLINE_QUEUE)
  
  const item = await promisifyRequest(store.get(queueId))
  if (item) {
    item.retries = (item.retries || 0) + 1
    store.put(item)
  }
  return promisifyTransaction(tx)
}

/**
 * Get offline queue count
 * @returns {Promise<number>}
 */
export async function getOfflineQueueCount() {
  const db = await openDB()
  const tx = db.transaction(STORES.OFFLINE_QUEUE, 'readonly')
  const store = tx.objectStore(STORES.OFFLINE_QUEUE)
  return promisifyRequest(store.count())
}

// ============ CACHE METADATA ============

/**
 * Set cache metadata
 * @param {string} key - Cache key
 * @param {Object} value - Metadata value
 */
async function setCacheMeta(key, value) {
  const db = await openDB()
  const tx = db.transaction(STORES.CACHE_META, 'readwrite')
  const store = tx.objectStore(STORES.CACHE_META)
  store.put({ key, ...value })
  return promisifyTransaction(tx)
}

/**
 * Get cache metadata
 * @param {string} key - Cache key
 * @returns {Promise<Object|null>}
 */
export async function getCacheMeta(key) {
  const db = await openDB()
  const tx = db.transaction(STORES.CACHE_META, 'readonly')
  const store = tx.objectStore(STORES.CACHE_META)
  return promisifyRequest(store.get(key))
}

// ============ HELPERS ============

/**
 * Promisify IDBRequest
 */
function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Promisify IDBTransaction
 */
function promisifyTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

/**
 * Clear all cached data for a user (on logout)
 * @param {string} userId - User ID
 */
export async function clearUserCache(userId) {
  const db = await openDB()
  
  // Clear notifications
  const notifTx = db.transaction(STORES.NOTIFICATIONS, 'readwrite')
  const notifStore = notifTx.objectStore(STORES.NOTIFICATIONS)
  const index = notifStore.index('user_id')
  const range = IDBKeyRange.only(userId)
  let cursor = await promisifyRequest(index.openCursor(range))
  
  while (cursor) {
    cursor.delete()
    cursor = await promisifyRequest(cursor.continue())
  }

  // Clear offline queue
  const queueTx = db.transaction(STORES.OFFLINE_QUEUE, 'readwrite')
  const queueStore = queueTx.objectStore(STORES.OFFLINE_QUEUE)
  await promisifyRequest(queueStore.clear())
}
