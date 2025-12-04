# Requirements Document

## Introduction

ฟีเจอร์ Profile Album เป็นระบบจัดเก็บรูปภาพและเอกสารส่วนตัวสำหรับผู้ใช้ในระบบ Sports Club Management โดยเฉพาะนักกีฬาที่ต้องการเก็บรูปภาพจากการแข่งขัน เอกสารสำคัญ และหลักฐานต่างๆ ไว้ในโปรไฟล์ส่วนตัว เพื่อให้สามารถเรียกใช้งานได้ง่ายเมื่อต้องการส่งเอกสารจบการแข่งขันหรือสมัครรายการใหม่

## Related Specs

| Spec | ความสัมพันธ์ |
|------|-------------|
| `album-individual-view` | มุมมองอัลบั้มแยกตามรายบุคคลสำหรับ Coach/Admin |
| `profile-picture` | เลือกรูปโปรไฟล์จากอัลบั้ม |

> **หมายเหตุ:** `profile-album` = ผู้ใช้จัดการอัลบั้มตัวเอง, `album-individual-view` = Coach/Admin ดูอัลบั้มของนักกีฬา

## Glossary

- **Profile Album**: ระบบจัดเก็บรูปภาพและเอกสารส่วนตัวของผู้ใช้
- **Album**: กลุ่มของรูปภาพที่จัดหมวดหมู่ตามประเภท เช่น รูปแข่งขัน, รูปฝึกซ้อม, เอกสาร
- **Media Item**: รูปภาพหรือเอกสารแต่ละรายการในอัลบั้ม
- **Competition Album**: อัลบั้มที่เก็บรูปภาพและเอกสารจากการแข่งขัน
- **User**: ผู้ใช้ระบบ (Admin, Coach, Athlete)
- **Supabase Storage**: ระบบจัดเก็บไฟล์บน Cloud ที่ใช้ในโปรเจค

## Requirements

### Requirement 1

**User Story:** As an athlete, I want to create albums to organize my photos and documents, so that I can easily find and access them when needed for competition registration.

#### Acceptance Criteria

1. WHEN an athlete accesses the profile page THEN the system SHALL display an "Albums" section with options to view and create albums
2. WHEN an athlete creates a new album THEN the system SHALL require a name and optional description for the album
3. WHEN an album is created THEN the system SHALL store the album with athlete_id, name, description, and created_at timestamp
4. WHEN an athlete views their albums THEN the system SHALL display albums sorted by most recently updated
5. IF an athlete attempts to create an album with an empty name THEN the system SHALL prevent creation and display a validation message

### Requirement 2

**User Story:** As an athlete, I want to upload photos and documents to my albums, so that I can store important competition materials in my profile.

#### Acceptance Criteria

1. WHEN an athlete selects an album THEN the system SHALL display options to upload new media items
2. WHEN uploading a file THEN the system SHALL accept image formats (JPG, PNG, WebP) and document formats (PDF)
3. WHEN uploading a file THEN the system SHALL validate file size with maximum 10MB per file
4. WHEN a file is uploaded THEN the system SHALL store the file in Supabase Storage under the user's directory
5. WHEN a file is uploaded THEN the system SHALL create a media_item record with album_id, file_url, file_name, file_type, and uploaded_at
6. IF an upload fails THEN the system SHALL display an error message and allow retry

### Requirement 3

**User Story:** As an athlete, I want to view and manage my uploaded media, so that I can organize my competition photos and documents effectively.

#### Acceptance Criteria

1. WHEN an athlete opens an album THEN the system SHALL display all media items in a grid layout with thumbnails
2. WHEN an athlete clicks on a media item THEN the system SHALL display the full-size image or document preview
3. WHEN an athlete deletes a media item THEN the system SHALL remove the file from storage and delete the database record
4. WHEN an athlete deletes an album THEN the system SHALL remove all associated media items and the album record
5. WHEN viewing media items THEN the system SHALL display file name, upload date, and file size

### Requirement 4

**User Story:** As an athlete, I want to quickly access my photos when registering for competitions, so that I can easily attach required documents.

#### Acceptance Criteria

1. WHEN an athlete needs to select a photo for competition registration THEN the system SHALL provide a media picker interface
2. WHEN using the media picker THEN the system SHALL display albums and allow browsing media items
3. WHEN a media item is selected THEN the system SHALL return the file URL for use in forms
4. WHEN browsing albums THEN the system SHALL support filtering by album type (competition, training, documents)

### Requirement 5

**User Story:** As a coach, I want to view my athletes' albums, so that I can help them prepare documents for competitions.

#### Acceptance Criteria

1. WHEN a coach views an athlete's profile THEN the system SHALL display the athlete's public albums
2. WHEN a coach accesses an athlete's album THEN the system SHALL display media items in read-only mode
3. WHILE viewing athlete albums THEN the coach SHALL NOT have permission to modify or delete media items

### Requirement 6

**User Story:** As an admin, I want to manage storage usage, so that I can ensure the system operates within resource limits.

#### Acceptance Criteria

1. WHEN an admin views user profiles THEN the system SHALL display storage usage statistics
2. WHEN a user exceeds storage quota (100MB per user) THEN the system SHALL prevent new uploads and notify the user
3. WHEN viewing storage statistics THEN the system SHALL display total files count and total storage used

