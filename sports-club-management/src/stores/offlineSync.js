/**
 * Offline Sync Store
 * Manages online/offline status and background sync for training logs
 * 
 * PWA Feature: Offline queue for training logs
 */

import { defineStore } from 'pinia'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import {
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  incrementQueueRetry,
  getOfflineQueueCount
} from '@/lib/indexedDB'

const MAX_RETRIES = 3

export const useOfflineSyncStore = defineStore('offlineSync', () => {
  // ============ STATE ============
  const isOnline = ref(navigator.onLine)
  const isSyncing = ref(false)
  const pendingCount = ref(0)
  const lastSyncTime = ref(null)
  const syncError = ref(null)

  // ============ GETTERS ============
  const hasPendingItems = computed(() => pendingCount.value > 0)
  
  const syncStatus = computed(() => {
    if (isSyncing.value) return 'syncing'
    if (!isOnline.value) return 'offline'
    if (pendingCount.value > 0) return 'pending'
    return 'synced'
  })

  // ============ ACTIONS ============

  /**
   * Initialize online/offline listeners
   */
  function initListeners() {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    updatePendingCount()
  }

  /**
   * Cleanup listeners
   */
  function cleanupListeners() {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }

  /**
   * Handle coming online
   */
  async function handleOnline() {
    isOnline.value = true
    // Auto-sync when coming back online
    await syncOfflineQueue()
  }

  /**
   * Handle going offline
   */
  function handleOffline() {
    isOnline.value = false
  }

  /**
   * Update pending items count
   */
  async function updatePendingCount() {
    try {
      pendingCount.value = await getOfflineQueueCount()
    } catch (err) {
      console.error('Error getting pending count:', err)
    }
  }

  /**
   * Queue a training log for offline sync
   * @param {string} action - 'add', 'update', 'delete'
   * @param {Object} data - Training log data
   * @returns {Promise<{success: boolean, queueId?: number}>}
   */
  async function queueTrainingLog(action, data) {
    try {
      const queueId = await addToOfflineQueue(`training_log_${action}`, data)
      await updatePendingCount()
      
      // If online, try to sync immediately
      if (isOnline.value) {
        syncOfflineQueue()
      }
      
      return { success: true, queueId }
    } catch (err) {
      console.error('Error queuing training log:', err)
      return { success: false, error: err.message }
    }
  }

  /**
   * Sync all items in offline queue
   * @returns {Promise<{success: boolean, synced: number, failed: number}>}
   */
  async function syncOfflineQueue() {
    if (!isOnline.value || isSyncing.value) {
      return { success: false, synced: 0, failed: 0 }
    }

    isSyncing.value = true
    syncError.value = null
    let synced = 0
    let failed = 0

    try {
      const queue = await getOfflineQueue()
      
      for (const item of queue) {
        try {
          const result = await processQueueItem(item)
          
          if (result.success) {
            await removeFromOfflineQueue(item.queueId)
            synced++
          } else {
            await incrementQueueRetry(item.queueId)
            
            // Remove if max retries exceeded
            if (item.retries >= MAX_RETRIES) {
              await removeFromOfflineQueue(item.queueId)
              console.warn('Queue item removed after max retries:', item)
            }
            failed++
          }
        } catch (err) {
          console.error('Error processing queue item:', err)
          failed++
        }
      }

      lastSyncTime.value = new Date().toISOString()
      await updatePendingCount()
      
      return { success: true, synced, failed }
    } catch (err) {
      syncError.value = err.message
      return { success: false, synced, failed, error: err.message }
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Process a single queue item
   * @param {Object} item - Queue item
   * @returns {Promise<{success: boolean}>}
   */
  async function processQueueItem(item) {
    const { type, data } = item

    switch (type) {
      case 'training_log_add':
        return await syncAddTrainingLog(data)
      case 'training_log_update':
        return await syncUpdateTrainingLog(data)
      case 'training_log_delete':
        return await syncDeleteTrainingLog(data)
      default:
        console.warn('Unknown queue item type:', type)
        return { success: false }
    }
  }

  /**
   * Sync add training log
   */
  async function syncAddTrainingLog(data) {
    const { error } = await supabase
      .from('training_logs')
      .insert(data)
    
    return { success: !error }
  }

  /**
   * Sync update training log
   */
  async function syncUpdateTrainingLog(data) {
    const { id, ...updates } = data
    const { error } = await supabase
      .from('training_logs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    return { success: !error }
  }

  /**
   * Sync delete training log
   */
  async function syncDeleteTrainingLog(data) {
    const { error } = await supabase
      .from('training_logs')
      .delete()
      .eq('id', data.id)
    
    return { success: !error }
  }

  /**
   * Reset store state
   */
  function reset() {
    pendingCount.value = 0
    lastSyncTime.value = null
    syncError.value = null
    isSyncing.value = false
  }

  return {
    // State
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncError,
    // Getters
    hasPendingItems,
    syncStatus,
    // Actions
    initListeners,
    cleanupListeners,
    queueTrainingLog,
    syncOfflineQueue,
    updatePendingCount,
    reset
  }
})
