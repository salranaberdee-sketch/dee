# Requirements Document

## Introduction

ระบบ Notification Inbox สำหรับแอปจัดการสโมสรกีฬา ช่วยให้ผู้ใช้สามารถดูประวัติการแจ้งเตือนย้อนหลัง จัดการสถานะอ่าน/ยังไม่อ่าน และลบการแจ้งเตือนที่ไม่ต้องการได้ ทำงานร่วมกับระบบ PWA Push Notifications ที่มีอยู่

## Related Specs

| Spec | ความสัมพันธ์ |
|------|-------------|
| `pwa-push-notifications` | ระบบส่ง Push Notifications (ต้นทาง) |
| `notification-settings-enhancement` | ตั้งค่า Quiet Hours, เสียง, Vibration |

> **หมายเหตุ:** Specs ทั้ง 3 ตัวนี้ทำงานร่วมกันเป็นระบบ Notification ที่สมบูรณ์

## Glossary

- **Notification_Inbox**: ระบบเก็บและแสดงประวัติการแจ้งเตือนของผู้ใช้
- **Notification_History**: ตารางเก็บประวัติการแจ้งเตือนทั้งหมดที่ส่งไปยังผู้ใช้
- **Read_Status**: สถานะการอ่านของการแจ้งเตือน (read/unread)
- **Notification_Badge**: ตัวเลขแสดงจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน

## Requirements

### Requirement 1

**User Story:** As a user, I want to view my notification history, so that I can review past notifications I may have missed.

#### Acceptance Criteria

1. WHEN a user navigates to the Notification Inbox THEN the Notification_Inbox SHALL display a list of all notifications sorted by date descending
2. WHEN a notification is sent to a user THEN the Notification_Inbox SHALL store the notification in the Notification_History table
3. WHEN displaying notifications THEN the Notification_Inbox SHALL show title, message, type, and timestamp for each notification
4. WHEN a user scrolls to the bottom of the list THEN the Notification_Inbox SHALL load more notifications using pagination

### Requirement 2

**User Story:** As a user, I want to mark notifications as read or unread, so that I can track which notifications I have reviewed.

#### Acceptance Criteria

1. WHEN a user opens a notification THEN the Notification_Inbox SHALL automatically mark it as read
2. WHEN a user manually marks a notification as unread THEN the Notification_Inbox SHALL update the Read_Status to unread
3. WHEN a user clicks "Mark all as read" THEN the Notification_Inbox SHALL update all unread notifications to read status
4. WHEN Read_Status changes THEN the Notification_Inbox SHALL persist the change to the database immediately

### Requirement 3

**User Story:** As a user, I want to see a badge showing unread notification count, so that I know when I have new notifications.

#### Acceptance Criteria

1. WHEN there are unread notifications THEN the Notification_Inbox SHALL display a Notification_Badge with the count on the navigation icon
2. WHEN the unread count is zero THEN the Notification_Inbox SHALL hide the Notification_Badge
3. WHEN a notification is marked as read THEN the Notification_Inbox SHALL decrement the Notification_Badge count
4. WHEN a new notification arrives THEN the Notification_Inbox SHALL increment the Notification_Badge count in real-time

### Requirement 4

**User Story:** As a user, I want to delete notifications I no longer need, so that I can keep my inbox organized.

#### Acceptance Criteria

1. WHEN a user deletes a single notification THEN the Notification_Inbox SHALL remove it from the list and database
2. WHEN a user selects multiple notifications and clicks delete THEN the Notification_Inbox SHALL remove all selected notifications
3. WHEN a user clicks "Clear all" THEN the Notification_Inbox SHALL remove all notifications from the inbox
4. WHEN a notification is deleted THEN the Notification_Inbox SHALL update the Notification_Badge count accordingly

### Requirement 5

**User Story:** As a user, I want to filter notifications by type, so that I can find specific notifications quickly.

#### Acceptance Criteria

1. WHEN a user selects a notification type filter THEN the Notification_Inbox SHALL display only notifications of that type
2. WHEN a user selects "All" filter THEN the Notification_Inbox SHALL display all notifications
3. WHEN filtering is applied THEN the Notification_Inbox SHALL update the displayed list without page reload
4. WHEN a filter is active THEN the Notification_Inbox SHALL indicate the current filter selection visually

### Requirement 6

**User Story:** As a user, I want to click on a notification to navigate to the related content, so that I can take action on the notification.

#### Acceptance Criteria

1. WHEN a user clicks on a notification with a reference THEN the Notification_Inbox SHALL navigate to the related content page
2. WHEN a notification has no reference THEN the Notification_Inbox SHALL display the notification details in a modal
3. WHEN navigating from a notification THEN the Notification_Inbox SHALL mark the notification as read automatically
4. WHEN the related content no longer exists THEN the Notification_Inbox SHALL display a message indicating the content is unavailable

