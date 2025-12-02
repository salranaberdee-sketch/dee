# Implementation Plan

## Profile Picture Feature

- [x] 1. Database and Storage Setup
  - [x] 1.1 Create migration to add avatar_url column to user_profiles
    - Add `avatar_url TEXT` column to user_profiles table
    - _Requirements: 1.5, 2.3_
  - [x] 1.2 Create profile-pictures Storage bucket with policies
    - Create bucket with public read access
    - Add policy for users to upload/update/delete own avatars
    - Path format: `{user_id}/avatar_{timestamp}.{ext}`
    - _Requirements: 1.4, 4.2_
  - [x] 1.3 Run security advisors check
    - Verify RLS policies are correct
    - _Requirements: 1.4_

- [x] 2. Implement Avatar Utility Functions
  - [x] 2.1 Create avatar utility functions in lib/avatar.js
    - `validateAvatarFile(file)` - validate type and size
    - `uploadAvatar(userId, file)` - upload to storage and return URL
    - `deleteAvatar(userId, currentUrl)` - delete from storage
    - `getAvatarFallback(name)` - get first character for fallback
    - _Requirements: 1.2, 1.3, 1.4, 4.2_
  - [x] 2.2 Write property test for file type validation
    - **Property 1: File type validation accepts only allowed types**
    - **Validates: Requirements 1.2**
  - [x] 2.3 Write property test for file size validation
    - **Property 2: File size validation enforces 2MB limit**
    - **Validates: Requirements 1.3**
  - [x] 2.4 Write property test for storage path format
    - **Property 6: Storage path format correctness**
    - **Validates: Requirements 1.4**

- [x] 3. Extend Auth Store
  - [x] 3.1 Add avatar management functions to auth store
    - `updateAvatar(avatarUrl)` - update avatar_url in profile
    - `removeAvatar()` - delete file and set avatar_url to null
    - _Requirements: 1.5, 4.2, 4.3_
  - [x] 3.2 Write property test for avatar URL persistence
    - **Property 3: Avatar URL persistence round-trip**
    - **Validates: Requirements 1.5, 2.3**
  - [x] 3.3 Write property test for avatar removal cleanup
    - **Property 5: Avatar removal cleanup**
    - **Validates: Requirements 4.2, 4.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create UserAvatar Component
  - [x] 5.1 Create UserAvatar.vue component
    - Display avatar image or fallback character
    - Support sizes: sm (32px), md (48px), lg (64px), xl (96px)
    - Handle image load errors with fallback
    - Use black/white design theme
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 5.2 Write property test for fallback display
    - **Property 4: Fallback display when no avatar**
    - **Validates: Requirements 3.3, 4.4**

- [x] 6. Create ProfilePictureModal Component
  - [x] 6.1 Create ProfilePictureModal.vue component
    - Modal with options: upload new, select from album, remove
    - File input with validation feedback
    - Integration with MediaPicker for album selection
    - Loading and error states
    - _Requirements: 1.1, 2.1, 4.1_
  - [x] 6.2 Implement upload flow in modal
    - File selection with drag-and-drop support
    - Preview before upload
    - Progress indicator during upload
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 6.3 Implement album selection flow
    - Open MediaPicker when "select from album" clicked
    - Use selected image URL as avatar
    - _Requirements: 2.1, 2.2_
  - [x] 6.4 Implement remove flow
    - Confirmation dialog before removal
    - Delete from storage and update profile
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Integrate into Profile Page
  - [x] 7.1 Replace avatar div with UserAvatar component in Profile.vue
    - Use xl size in profile hero section
    - Add click handler to open ProfilePictureModal
    - Show edit indicator on hover
    - _Requirements: 1.1, 3.1_
  - [x] 7.2 Add ProfilePictureModal to Profile.vue
    - Handle modal open/close state
    - Update profile after avatar change
    - _Requirements: 1.1_

- [x] 8. Integrate into NavBar
  - [x] 8.1 Replace avatar in NavBar with UserAvatar component
    - Use sm size for NavBar
    - Link to profile page on click
    - _Requirements: 3.2_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Coach and Admin Features
  - [x] 10.1 Display athlete avatars in athlete list views
    - Use UserAvatar in athlete cards/rows
    - _Requirements: 5.2_
  - [x] 10.2 Display avatar when viewing athlete profile
    - Show athlete's avatar in read-only mode
    - _Requirements: 5.1_
  - [x] 10.3 Add admin ability to remove user avatars
    - Add remove button for admin viewing other profiles
    - Call removeAvatar with target user ID
    - _Requirements: 6.2_

- [x] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
