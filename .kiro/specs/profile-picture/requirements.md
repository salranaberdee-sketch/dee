# Requirements Document

## Introduction

ฟีเจอร์เปลี่ยนรูปโปรไฟล์ช่วยให้ผู้ใช้สามารถอัปโหลดและจัดการรูปภาพโปรไฟล์ของตนเองได้ รูปโปรไฟล์จะแสดงในหน้า Profile และ NavBar แทนที่ตัวอักษรตัวแรกของชื่อ ผู้ใช้สามารถเลือกรูปจากอัลบั้มที่มีอยู่หรืออัปโหลดรูปใหม่ได้

## Glossary

- **Profile_Picture_System**: ระบบจัดการรูปโปรไฟล์ที่รับผิดชอบการอัปโหลด จัดเก็บ และแสดงผลรูปภาพโปรไฟล์ของผู้ใช้
- **Avatar**: รูปภาพหรือตัวแทนที่แสดงตัวตนของผู้ใช้ในระบบ
- **User_Profile**: ข้อมูลโปรไฟล์ของผู้ใช้ที่เก็บในตาราง user_profiles
- **Storage_Bucket**: พื้นที่จัดเก็บไฟล์ใน Supabase Storage
- **Thumbnail**: รูปภาพขนาดย่อที่ใช้แสดงผลในส่วนต่างๆ ของแอป

## Requirements

### Requirement 1

**User Story:** As a user, I want to upload a profile picture, so that I can personalize my account and be easily recognized by others.

#### Acceptance Criteria

1. WHEN a user clicks on the avatar area in the Profile page THEN the Profile_Picture_System SHALL display options to upload a new picture or select from existing albums
2. WHEN a user selects an image file THEN the Profile_Picture_System SHALL validate that the file type is JPG, PNG, or WebP
3. WHEN a user selects an image file THEN the Profile_Picture_System SHALL validate that the file size does not exceed 2MB
4. WHEN a user uploads a valid image THEN the Profile_Picture_System SHALL store the image in the profile-pictures Storage_Bucket
5. WHEN a user uploads a valid image THEN the Profile_Picture_System SHALL update the avatar_url field in User_Profile

### Requirement 2

**User Story:** As a user, I want to select a picture from my existing albums, so that I can reuse photos I have already uploaded.

#### Acceptance Criteria

1. WHEN a user chooses to select from albums THEN the Profile_Picture_System SHALL display the MediaPicker component with available albums
2. WHEN a user selects an image from MediaPicker THEN the Profile_Picture_System SHALL use that image URL as the profile picture
3. WHEN a user confirms the selection THEN the Profile_Picture_System SHALL update the avatar_url field in User_Profile

### Requirement 3

**User Story:** As a user, I want to see my profile picture displayed throughout the app, so that I have a consistent visual identity.

#### Acceptance Criteria

1. WHEN a user has a profile picture set THEN the Profile_Picture_System SHALL display the Avatar in the Profile page hero section
2. WHEN a user has a profile picture set THEN the Profile_Picture_System SHALL display the Avatar in the NavBar
3. WHEN a user has no profile picture THEN the Profile_Picture_System SHALL display the first character of the user name as fallback
4. WHEN the profile picture fails to load THEN the Profile_Picture_System SHALL display the fallback character avatar

### Requirement 4

**User Story:** As a user, I want to remove my profile picture, so that I can return to the default avatar if desired.

#### Acceptance Criteria

1. WHEN a user has a profile picture set THEN the Profile_Picture_System SHALL display a remove option
2. WHEN a user confirms removal THEN the Profile_Picture_System SHALL delete the image from Storage_Bucket
3. WHEN a user confirms removal THEN the Profile_Picture_System SHALL set avatar_url to null in User_Profile
4. WHEN removal is complete THEN the Profile_Picture_System SHALL display the fallback character avatar

### Requirement 5

**User Story:** As a coach, I want to see profile pictures of athletes in my club, so that I can easily identify them.

#### Acceptance Criteria

1. WHEN a coach views an athlete's profile THEN the Profile_Picture_System SHALL display the athlete's Avatar
2. WHEN a coach views the athlete list THEN the Profile_Picture_System SHALL display each athlete's Avatar

### Requirement 6

**User Story:** As an admin, I want to manage profile pictures for all users, so that I can maintain appropriate content.

#### Acceptance Criteria

1. WHEN an admin views any user's profile THEN the Profile_Picture_System SHALL display the user's Avatar
2. WHEN an admin removes a user's profile picture THEN the Profile_Picture_System SHALL delete the image and reset avatar_url

