/**
 * Notification Inbox Store
 * Manages notification history, read status, and realtime updates
 * 
 * Feature: notification-inbox
 * Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.4, 4.1, 4.2, 4.3
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import {
  cacheNotifications,
  getCachedNotifications,
  addNotificationToCache,
  removeNotificationFromCache,
  updateNotificationInCache
} from '@/lib/indexedDB'

// Page size for pagination
const PAGE_SIZE = 20

export const useNotificationInboxStore = defineStore('notificationInbox', () => {
  // ============ STATE ============
  // Requirements: 1.1, 1.4, 3.1
  const notifications = ref([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const hasMore = ref(true)
  const currentFilter = ref(null)
  const error = ref(null)
  
  // Realtime subscription reference
  let realtimeSubscription = null

  // ============ GETTERS ============
  
  /**
   * Get notifications sorted by date descending
   * Property 2: Notifications sorted by date descending
   */
  const sortedNotifications = computed(() => {
    return [...notifications.value].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    )
  })

  /**
   * Get notifications filtered by current filter
   * Property 8: Filter returns only matching type
   */
  const filteredNotifications = computed(() => {
    if (!currentFilter.value || currentFilter.value === 'all') {
      return sortedNotifications.value
    }
    return sortedNotifications.value.filter(n => n.type === currentFilter.value)
  })

  // ============ ACTIONS ============

  /**
   * Fetch notifications with pagination
   * Requirements: 1.1, 1.4
   * Property 3: Pagination returns correct subsets
   * 
   * @param {string} userId - User ID to fetch notifications for
   * @param {number} page - Page number (1-based)
   * @param {string|null} filter - Optional notification type filter
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async function fetchNotifications(userId, page = 1, filter = null) {
    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    loading.value = true
    error.value = null
    currentFilter.value = filter

    try {
      // Calculate offset for pagination
      const offset = (page - 1) * PAGE_SIZE

      // Build query - ใช้ตาราง notifications แทน notification_history
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      // Apply filter if specified
      if (filter && filter !== 'all') {
        query = query.eq('type', filter)
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) {
        error.value = fetchError.message
        return { success: false, error: fetchError.message }
      }

      // For page 1, replace notifications; otherwise append
      if (page === 1) {
        notifications.value = data || []
        // Cache notifications to IndexedDB for offline access
        cacheNotifications(userId, data || []).catch(err => {
          console.warn('Failed to cache notifications:', err)
        })
      } else {
        // Append new notifications, avoiding duplicates
        const existingIds = new Set(notifications.value.map(n => n.id))
        const newNotifications = (data || []).filter(n => !existingIds.has(n.id))
        notifications.value = [...notifications.value, ...newNotifications]
      }

      // Check if there are more pages
      hasMore.value = count > offset + PAGE_SIZE

      return { success: true, data: data || [] }
    } catch (err) {
      // Try to load from IndexedDB cache when offline
      if (!navigator.onLine) {
        try {
          const cached = await getCachedNotifications(userId)
          if (cached.length > 0) {
            notifications.value = cached
            return { success: true, data: cached, fromCache: true }
          }
        } catch (cacheErr) {
          console.warn('Failed to load cached notifications:', cacheErr)
        }
      }
      error.value = err.message || 'Failed to fetch notifications'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch unread notification count
   * Requirements: 3.1
   * Property 6: Unread count consistency
   * 
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  async function fetchUnreadCount(userId) {
    if (!userId) return 0

    try {
      // ใช้ตาราง notifications และ is_read แทน read_at
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (countError) {
        console.error('Error fetching unread count:', countError)
        return 0
      }

      unreadCount.value = count || 0
      return unreadCount.value
    } catch (err) {
      console.error('Error fetching unread count:', err)
      return 0
    }
  }


  /**
   * Mark a notification as read
   * Requirements: 2.1, 2.4
   * Property 4: Read status persistence round-trip
   * 
   * @param {string} notificationId - Notification ID to mark as read
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function markAsRead(notificationId) {
    if (!notificationId) {
      return { success: false, error: 'Notification ID is required' }
    }

    try {
      // ใช้ is_read แทน read_at
      const { data, error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('is_read', false) // อัพเดทเฉพาะที่ยังไม่อ่าน
        .select()
        .single()

      if (updateError) {
        // PGRST116 means no rows matched (already read)
        if (updateError.code === 'PGRST116') {
          return { success: true } // Already read, not an error
        }
        return { success: false, error: updateError.message }
      }

      // Update local state
      const idx = notifications.value.findIndex(n => n.id === notificationId)
      if (idx !== -1) {
        notifications.value[idx] = data
      }

      // Decrement unread count
      if (unreadCount.value > 0) {
        unreadCount.value--
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Failed to mark as read' }
    }
  }

  /**
   * Mark a notification as unread
   * Requirements: 2.2, 2.4
   * Property 4: Read status persistence round-trip
   * 
   * @param {string} notificationId - Notification ID to mark as unread
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function markAsUnread(notificationId) {
    if (!notificationId) {
      return { success: false, error: 'Notification ID is required' }
    }

    try {
      // ใช้ is_read แทน read_at
      const { data, error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: false })
        .eq('id', notificationId)
        .eq('is_read', true) // อัพเดทเฉพาะที่อ่านแล้ว
        .select()
        .single()

      if (updateError) {
        // PGRST116 means no rows matched (already unread)
        if (updateError.code === 'PGRST116') {
          return { success: true } // Already unread, not an error
        }
        return { success: false, error: updateError.message }
      }

      // Update local state
      const idx = notifications.value.findIndex(n => n.id === notificationId)
      if (idx !== -1) {
        notifications.value[idx] = data
      }

      // Increment unread count
      unreadCount.value++

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Failed to mark as unread' }
    }
  }

  /**
   * Mark all notifications as read for a user
   * Requirements: 2.3, 2.4
   * Property 5: Mark all as read updates all notifications
   * 
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function markAllAsRead(userId) {
    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    try {
      // ใช้ is_read แทน read_at
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      // อัพเดท local state - ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
      notifications.value = notifications.value.map(n => ({
        ...n,
        is_read: true
      }))

      // Reset unread count
      unreadCount.value = 0

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Failed to mark all as read' }
    }
  }

  /**
   * Delete a single notification
   * Requirements: 4.1
   * Property 7: Delete removes notification
   * 
   * @param {string} notificationId - Notification ID to delete
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function deleteNotification(notificationId) {
    if (!notificationId) {
      return { success: false, error: 'Notification ID is required' }
    }

    try {
      // ตรวจสอบว่า notification ยังไม่ได้อ่านก่อนลบ
      const notification = notifications.value.find(n => n.id === notificationId)
      const wasUnread = notification && !notification.is_read

      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      // Update local state
      notifications.value = notifications.value.filter(n => n.id !== notificationId)

      // Update unread count if notification was unread
      if (wasUnread && unreadCount.value > 0) {
        unreadCount.value--
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Failed to delete notification' }
    }
  }

  /**
   * Delete multiple notifications
   * Requirements: 4.2
   * Property 7: Delete removes notification
   * 
   * @param {string[]} notificationIds - Array of notification IDs to delete
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function deleteMultiple(notificationIds) {
    if (!notificationIds || notificationIds.length === 0) {
      return { success: false, error: 'Notification IDs are required' }
    }

    try {
      // นับจำนวน notifications ที่ยังไม่ได้อ่านที่จะถูกลบ
      const unreadBeingDeleted = notifications.value.filter(
        n => notificationIds.includes(n.id) && !n.is_read
      ).length

      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds)

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      // Update local state
      const idsSet = new Set(notificationIds)
      notifications.value = notifications.value.filter(n => !idsSet.has(n.id))

      // Update unread count
      unreadCount.value = Math.max(0, unreadCount.value - unreadBeingDeleted)

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Failed to delete notifications' }
    }
  }

  /**
   * Clear all notifications for a user
   * Requirements: 4.3
   * Property 7: Delete removes notification
   * 
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function clearAll(userId) {
    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      // ล้าง local state
      notifications.value = []
      unreadCount.value = 0
      hasMore.value = false

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'ไม่สามารถล้างการแจ้งเตือนได้' }
    }
  }


  /**
   * Subscribe to realtime notification changes
   * Requirements: 3.4
   * ใช้ Realtime Broadcast แทน postgres_changes เพื่อ scalability ที่ดีกว่า
   * 
   * @param {string} userId - User ID to subscribe for
   */
  async function subscribeToRealtime(userId) {
    if (!userId) return

    // Unsubscribe from existing subscription
    unsubscribeFromRealtime()

    // ตั้งค่า auth สำหรับ Realtime Authorization
    await supabase.realtime.setAuth()

    // สร้าง subscription ใหม่ - ใช้ Broadcast แทน postgres_changes
    realtimeSubscription = supabase
      .channel(`notifications:${userId}`, {
        config: { private: true } // ใช้ private channel สำหรับ security
      })
      .on('broadcast', { event: 'INSERT' }, (payload) => {
        // เพิ่ม notification ใหม่ไว้ด้านบนสุด
        const newNotification = payload.payload?.record || payload.payload
        
        if (!newNotification?.id) return
        
        // ตรวจสอบว่ามีอยู่แล้วหรือไม่ (หลีกเลี่ยง duplicates)
        const exists = notifications.value.some(n => n.id === newNotification.id)
        if (!exists) {
          notifications.value.unshift(newNotification)
          
          // เพิ่ม unread count ถ้ายังไม่ได้อ่าน
          if (!newNotification.is_read) {
            unreadCount.value++
          }
          
          // เพิ่มลง IndexedDB cache
          addNotificationToCache(newNotification).catch(err => {
            console.warn('ไม่สามารถ cache notification ใหม่ได้:', err)
          })
        }
      })
      .on('broadcast', { event: 'UPDATE' }, (payload) => {
        // อัพเดท notification ใน local state
        const data = payload.payload
        const updatedNotification = data?.record || data
        const oldNotification = data?.old_record
        
        if (!updatedNotification?.id) return
        
        const idx = notifications.value.findIndex(n => n.id === updatedNotification.id)
        if (idx !== -1) {
          // ตรวจสอบว่าสถานะการอ่านเปลี่ยนหรือไม่
          const wasUnread = oldNotification ? !oldNotification.is_read : !notifications.value[idx].is_read
          const isNowUnread = !updatedNotification.is_read
          
          if (wasUnread && !isNowUnread) {
            // เดิมยังไม่อ่าน ตอนนี้อ่านแล้ว - ลด count
            unreadCount.value = Math.max(0, unreadCount.value - 1)
          } else if (!wasUnread && isNowUnread) {
            // เดิมอ่านแล้ว ตอนนี้ยังไม่อ่าน - เพิ่ม count
            unreadCount.value++
          }
          
          notifications.value[idx] = updatedNotification
          
          // อัพเดทใน IndexedDB cache
          updateNotificationInCache(updatedNotification).catch(err => {
            console.warn('ไม่สามารถอัพเดท cached notification ได้:', err)
          })
        }
      })
      .on('broadcast', { event: 'DELETE' }, (payload) => {
        // ลบ notification จาก local state
        const data = payload.payload
        const deletedNotification = data?.old_record || data
        
        if (!deletedNotification?.id) return
        
        const idx = notifications.value.findIndex(n => n.id === deletedNotification.id)
        if (idx !== -1) {
          // อัพเดท unread count ถ้า notification ที่ลบยังไม่ได้อ่าน
          if (!deletedNotification.is_read) {
            unreadCount.value = Math.max(0, unreadCount.value - 1)
          }
          
          notifications.value.splice(idx, 1)
          
          // ลบจาก IndexedDB cache
          removeNotificationFromCache(deletedNotification.id).catch(err => {
            console.warn('ไม่สามารถลบ cached notification ได้:', err)
          })
        }
      })
      .subscribe()
  }

  /**
   * Unsubscribe from realtime updates
   */
  function unsubscribeFromRealtime() {
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription)
      realtimeSubscription = null
    }
  }

  /**
   * Reset store state
   * Called on logout to clear user-specific data
   */
  function reset() {
    unsubscribeFromRealtime()
    notifications.value = []
    unreadCount.value = 0
    loading.value = false
    hasMore.value = true
    currentFilter.value = null
    error.value = null
  }

  return {
    // State
    notifications,
    unreadCount,
    loading,
    hasMore,
    currentFilter,
    error,
    // Getters
    sortedNotifications,
    filteredNotifications,
    // Actions
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteMultiple,
    clearAll,
    subscribeToRealtime,
    unsubscribeFromRealtime,
    reset
  }
})
