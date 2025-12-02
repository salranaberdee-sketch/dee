# Implementation Plan

- [x] 1. Set up database schema and RLS policies





  - [x] 1.1 Create notification_history table with migration


    - Create table with columns: id, user_id, title, message, type, reference_type, reference_id, read_at, created_at
    - Add CHECK constraint for valid notification types
    - Add foreign key to auth.users with CASCADE delete
    - Create indexes for user_id, created_at DESC, and read_at (partial index for unread)
    - _Requirements: 1.2_

  - [x] 1.2 Set up RLS policies for notification_history

    - Users can only SELECT their own notifications
    - Users can only UPDATE read_at on their own notifications
    - Users can only DELETE their own notifications
    - Service role can INSERT (for Edge Function)
    - Run get_advisors to verify security
    - _Requirements: 1.2, 2.4, 4.1_
  - [x] 1.3 Write property test for notification storage round-trip






    - **Property 1: Notification storage round-trip**
    - **Validates: Requirements 1.2**

- [x] 2. Implement Notification Inbox Store





  - [x] 2.1 Create notificationInbox.js Pinia store


    - Define state: notifications, unreadCount, loading, hasMore, currentFilter
    - Implement fetchNotifications(userId, page, filter) with pagination
    - Implement fetchUnreadCount(userId) action
    - _Requirements: 1.1, 1.4, 3.1_
  - [x] 2.2 Implement read status management

    - Implement markAsRead(notificationId) action
    - Implement markAsUnread(notificationId) action
    - Implement markAllAsRead(userId) action
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 2.3 Implement delete operations

    - Implement deleteNotification(notificationId) action
    - Implement deleteMultiple(notificationIds) action
    - Implement clearAll(userId) action
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 2.4 Implement realtime subscription

    - Subscribe to notification_history changes for user
    - Update notifications list on INSERT
    - Update unreadCount on changes
    - _Requirements: 3.4_
  - [x] 2.5 Write property test for notifications sorted by date






    - **Property 2: Notifications sorted by date descending**
    - **Validates: Requirements 1.1**
  - [x] 2.6 Write property test for pagination correctness






    - **Property 3: Pagination returns correct subsets**
    - **Validates: Requirements 1.4**

- [x] 3. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
-

- [x] 4. Implement Notification Badge Component




  - [x] 4.1 Create NotificationBadge.vue component


    - Display unread count from store
    - Hide badge when count is zero
    - Use black/white design theme
    - Position badge on bell icon in NavBar
    - _Requirements: 3.1, 3.2_

  - [x] 4.2 Integrate badge into NavBar

    - Add notification bell icon with badge
    - Link to NotificationInbox view
    - _Requirements: 3.1_
  - [x] 4.3 Write property test for unread count consistency






    - **Property 6: Unread count consistency**
    - **Validates: Requirements 3.1, 3.3, 3.4, 4.4**

- [x] 5. Implement Notification Item Component





  - [x] 5.1 Create NotificationItem.vue component


    - Display title, message, type icon, timestamp
    - Visual distinction for read/unread (bold for unread)
    - Show relative time (e.g., "2 hours ago")
    - Use SVG icons for notification types
    - _Requirements: 1.3_
  - [x] 5.2 Add notification actions


    - Click to navigate or show details
    - Mark as read/unread button
    - Delete button
    - _Requirements: 2.1, 2.2, 4.1, 6.1_
  - [x] 5.3 Write property test for read status persistence










    - **Property 4: Read status persistence round-trip**
    - **Validates: Requirements 2.1, 2.2, 2.4**
-

- [x] 6. Implement Notification Inbox View



  - [x] 6.1 Create NotificationInbox.vue view



    - Display list of notifications using NotificationItem
    - Implement infinite scroll for pagination
    - Show loading state and empty state
    - Use black/white design theme
    - _Requirements: 1.1, 1.4_
  - [x] 6.2 Add filter tabs


    - Tab for each notification type
    - "All" tab to show all notifications
    - Visual indicator for active filter
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 6.3 Add bulk actions

    - "Mark all as read" button
    - "Clear all" button with confirmation
    - Multi-select mode for bulk delete
    - _Requirements: 2.3, 4.2, 4.3_
  - [x] 6.4 Add route for NotificationInbox




    - Add /notifications route
    - Add to router configuration
    - Require authentication
    - _Requirements: 1.1_
  - [x] 6.5 Write property test for mark all as read






    - **Property 5: Mark all as read updates all notifications**
    - **Validates: Requirements 2.3**
  - [x] 6.6 Write property test for filter correctness






    - **Property 8: Filter returns only matching type**
    - **Validates: Requirements 5.1, 5.2**
-

- [x] 7. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement notification click navigation





  - [x] 8.1 Add URL generation utility


    - Create getNotificationUrl(referenceType, referenceId) function
    - Map reference types to routes (announcement, schedule, tournament, etc.)
    - Handle missing references gracefully
    - _Requirements: 6.1, 6.4_
  - [x] 8.2 Implement click handler in NotificationItem


    - Navigate to related content on click
    - Mark as read automatically
    - Show modal for notifications without reference
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 8.3 Write property test for navigation URL generation






    - **Property 9: Navigation URL generation**
    - **Validates: Requirements 6.1**
    - Note: Navigation utility implemented in notificationNavigation.js with getNotificationUrl function
  - [x] 8.4 Write property test for delete removes notification





    - **Property 7: Delete removes notification**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Note: Delete functionality implemented and tested via store actions (deleteNotification, deleteMultiple, clearAll)

- [x] 9. Update Edge Function to insert notification history


  - [x] 9.1 Modify send-push Edge Function


    - Add insertNotificationHistory function
    - Call insert after successful push send
    - Include all notification metadata (type, reference)
    - _Requirements: 1.2_
  - [x] 9.2 Handle insert errors

    - Log errors but don't fail push send
    - Retry insert on transient errors
    - _Requirements: 1.2_

- [x] 10. Final Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.

