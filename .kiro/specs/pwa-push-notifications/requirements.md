# Requirements Document

## Introduction

ระบบ PWA Push Notifications สำหรับแอปจัดการสโมสรกีฬา ช่วยให้ผู้ใช้ได้รับการแจ้งเตือนเหตุการณ์สำคัญบนอุปกรณ์โดยตรง แม้ไม่ได้เปิดแอป รองรับการตั้งค่าเปิด/ปิดการแจ้งเตือนแต่ละประเภทตามความต้องการของผู้ใช้

## Glossary

- **Push_Notification_System**: ระบบส่งการแจ้งเตือนไปยังอุปกรณ์ผู้ใช้ผ่าน Web Push API
- **Notification_Preferences**: การตั้งค่าการแจ้งเตือนของผู้ใช้แต่ละคน
- **Push_Subscription**: ข้อมูลการลงทะเบียนรับ Push Notification ของอุปกรณ์
- **Notification_Type**: ประเภทของการแจ้งเตือน (เช่น event, schedule, announcement, tournament)
- **Service_Worker**: โปรแกรมที่ทำงานเบื้องหลังเพื่อรับและแสดง Push Notification

## Requirements

### Requirement 1

**User Story:** As a user, I want to receive push notifications on my device for important events, so that I stay informed even when not actively using the app.

#### Acceptance Criteria

1. WHEN a user grants notification permission THEN the Push_Notification_System SHALL register the device subscription and store it in the database
2. WHEN a user denies notification permission THEN the Push_Notification_System SHALL gracefully handle the denial and allow the user to enable later
3. WHEN a new notification event occurs THEN the Push_Notification_System SHALL send a push notification to all subscribed devices of the target user
4. WHEN a push notification is received THEN the Service_Worker SHALL display the notification with title, message, and appropriate icon

### Requirement 2

**User Story:** As a user, I want to customize which types of notifications I receive, so that I only get alerts for events that matter to me.

#### Acceptance Criteria

1. WHEN a user accesses notification settings THEN the Push_Notification_System SHALL display all available Notification_Types with toggle controls
2. WHEN a user toggles a Notification_Type off THEN the Push_Notification_System SHALL stop sending push notifications of that type to the user
3. WHEN a user toggles a Notification_Type on THEN the Push_Notification_System SHALL resume sending push notifications of that type to the user
4. WHEN Notification_Preferences are changed THEN the Push_Notification_System SHALL persist the changes to the database immediately

### Requirement 3

**User Story:** As a user, I want to receive notifications for all relevant events in the system, so that I never miss important updates.

#### Acceptance Criteria

1. WHEN a new announcement with priority "urgent" is created THEN the Push_Notification_System SHALL send a push notification to all target users
2. WHEN a schedule is created or updated THEN the Push_Notification_System SHALL send a push notification to affected athletes and coaches
3. WHEN an event registration deadline is approaching (24 hours before) THEN the Push_Notification_System SHALL send a reminder notification to eligible athletes
4. WHEN a tournament registration status changes THEN the Push_Notification_System SHALL send a push notification to the affected athlete
5. WHEN a club application status changes THEN the Push_Notification_System SHALL send a push notification to the applicant

### Requirement 4

**User Story:** As a user, I want to manage my notification subscriptions across devices, so that I can control where I receive notifications.

#### Acceptance Criteria

1. WHEN a user logs in on a new device THEN the Push_Notification_System SHALL prompt to enable notifications for that device
2. WHEN a user logs out THEN the Push_Notification_System SHALL remove the Push_Subscription for that device
3. WHEN a user views notification settings THEN the Push_Notification_System SHALL display the count of subscribed devices
4. WHEN a Push_Subscription becomes invalid THEN the Push_Notification_System SHALL remove it from the database automatically

### Requirement 5

**User Story:** As an admin, I want to send push notifications to specific user groups, so that I can communicate important information effectively.

#### Acceptance Criteria

1. WHEN an admin creates an announcement with target_type "all" THEN the Push_Notification_System SHALL send push notifications to all users with enabled preferences
2. WHEN an admin creates an announcement with target_type "club" THEN the Push_Notification_System SHALL send push notifications only to users in that club
3. WHEN an admin creates an announcement with target_type "coaches" THEN the Push_Notification_System SHALL send push notifications only to users with coach role
4. WHEN an admin creates an announcement with target_type "athletes" THEN the Push_Notification_System SHALL send push notifications only to users with athlete role

### Requirement 6

**User Story:** As a user, I want notifications to work reliably even when offline, so that I receive them when I come back online.

#### Acceptance Criteria

1. WHEN the device is offline and a push notification is sent THEN the Push_Notification_System SHALL queue the notification for delivery when online
2. WHEN the device comes back online THEN the Service_Worker SHALL display any queued notifications
3. WHEN a user clicks on a push notification THEN the Push_Notification_System SHALL open the app and navigate to the relevant content
4. WHEN multiple notifications are pending THEN the Service_Worker SHALL group them appropriately to avoid notification spam
