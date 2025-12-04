# Implementation Plan

- [x] 1. Update database schema for new settings
  - [x] 1.1 Create migration to add new columns to notification_preferences
    - Add quiet_hours_enabled (BOOLEAN DEFAULT false)
    - Add quiet_hours_start (TIME DEFAULT '22:00')
    - Add quiet_hours_end (TIME DEFAULT '07:00')
    - Add notification_sound (TEXT DEFAULT 'default')
    - Add vibration_enabled (BOOLEAN DEFAULT true)
    - Add vibration_pattern (TEXT DEFAULT 'short')
    - Add CHECK constraints for valid values
    - Run get_advisors to verify security
    - _Requirements: 1.2, 2.3, 4.3, 5.1_

  - [x] 1.2 Write property test for preferences persistence round-trip
    - **Property 2: Preferences persistence round-trip**
    - **Validates: Requirements 1.2, 2.3, 4.3, 5.1**

- [x] 2. Update Notification Preferences Store
  - [x] 2.1 Add new state fields to notificationPreferences.js
    - Add quietHoursEnabled, quietHoursStart, quietHoursEnd
    - Add notificationSound
    - Add vibrationEnabled, vibrationPattern
    - Update fetchPreferences to load new fields
    - _Requirements: 5.2, 5.4_

  - [x] 2.2 Implement Quiet Hours actions
    - Implement updateQuietHours(enabled, start, end) action
    - Implement isWithinQuietHours(time) helper function
    - Handle midnight crossing (e.g., 22:00 to 07:00)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.3 Implement Sound and Vibration actions
    - Implement updateNotificationSound(sound) action
    - Implement updateVibrationSettings(enabled, pattern) action
    - Implement testVibration() action using Vibration API
    - _Requirements: 2.3, 4.3_

  - [x] 2.4 Implement Test Notification action
    - Implement sendTestNotification() action
    - Call Edge Function to send test push
    - Handle success/error responses
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.5 Write property test for Quiet Hours time filtering
    - **Property 1: Quiet Hours time filtering**
    - **Validates: Requirements 1.3, 1.4, 1.5**

  - [x] 2.6 Write property test for preferences loading completeness
    - **Property 3: Preferences loading completeness**
    - **Validates: Requirements 5.2, 5.4**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add Sound Assets
  - [x] 4.1 Create sound generation using Web Audio API
    - Create notificationSounds.js library
    - Implement playDefaultSound() - standard notification
    - Implement playChimeSound() - gentle chime
    - Implement playBellSound() - bell sound
    - Implement playSoftSound() - soft notification
    - Use Web Audio API for offline support (no MP3 files needed)
    - _Requirements: 2.1, 2.2_

  - [x] 4.2 Write property test for sound selection validity
    - **Property 5: Sound selection validity**
    - **Validates: Requirements 2.1, 2.3**

- [x] 5. Update NotificationSettings UI Component
  - [x] 5.1 Add Quiet Hours section
    - Add toggle to enable/disable Quiet Hours
    - Add time picker for start time
    - Add time picker for end time
    - Show/hide time pickers based on toggle state
    - Use black/white design theme
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 5.2 Add Sound Settings section
    - Add sound selector dropdown
    - Add preview button to play selected sound
    - Implement sound preview using Audio API
    - Handle "No Sound" option
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 5.3 Add Vibration Settings section
    - Add toggle to enable/disable vibration
    - Add vibration pattern selector
    - Add "Test Vibration" button
    - Show/hide pattern selector based on toggle state
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 5.4 Add Test Notification button
    - Add prominent "Test Notification" button
    - Show loading state while sending
    - Display success/error message
    - Check online status before sending
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 5.5 Write property test for vibration pattern validity
    - **Property 4: Vibration pattern validity**
    - **Validates: Requirements 4.2, 4.3**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update Service Worker for Sound and Vibration
  - [x] 7.1 Update sw-push.js to handle sound
    - Load user's sound preference
    - Play selected sound when notification received
    - Handle "No Sound" option
    - _Requirements: 2.5_

  - [x] 7.2 Update sw-push.js to handle vibration
    - Load user's vibration preference
    - Trigger vibration pattern when notification received
    - Handle vibration disabled
    - _Requirements: 4.5_

  - [x] 7.3 Update sw-push.js to check Quiet Hours
    - Load user's quiet hours settings
    - Check if current time is within quiet hours
    - Suppress notification if within quiet hours
    - _Requirements: 1.3, 1.4_

- [x] 8. Create Test Notification Edge Function
  - [x] 8.1 Create send-test-notification Edge Function
    - Create new Edge Function for test notifications
    - Accept userId parameter
    - Send push notification with test title and message
    - Return success/error response
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 8.2 Handle test notification errors
    - Check if user has valid push subscription
    - Return appropriate error messages
    - Handle offline scenarios
    - _Requirements: 3.4, 3.5_

- [x] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
