# Requirements Document

## Introduction

ฟีเจอร์ Album Individual View เป็นการปรับปรุงระบบอัลบั้มรูปภาพให้โค้ชและ Admin สามารถดูอัลบั้มแยกตามรายบุคคลได้ โดยโค้ชสามารถดูอัลบั้มของนักกีฬาแต่ละคนในชมรมแยกกัน และ Admin สามารถดูภาพรวมแต่ละชมรม รวมถึงดูอัลบั้มของแต่ละบุคคลได้ เพื่อความสะดวกในการติดตามและจัดการข้อมูลรูปภาพของนักกีฬา

## Glossary

- **Album Individual View**: มุมมองอัลบั้มแยกตามรายบุคคล
- **Club Overview**: มุมมองภาพรวมอัลบั้มของทั้งชมรม
- **Athlete Album List**: รายการอัลบั้มของนักกีฬาแต่ละคน
- **User Profile**: ข้อมูลผู้ใช้ที่เชื่อมกับ auth.users
- **Club**: ชมรมกีฬาที่ผู้ใช้สังกัด
- **Coach**: โค้ชที่ดูแลนักกีฬาในชมรม
- **Admin**: ผู้ดูแลระบบที่มีสิทธิ์เข้าถึงข้อมูลทั้งหมด

## Requirements

### Requirement 1

**User Story:** As a coach, I want to view albums separated by individual athletes, so that I can easily track and review each athlete's photos and documents.

#### Acceptance Criteria

1. WHEN a coach accesses the album management page THEN the system SHALL display a list of athletes in the coach's club with their album counts
2. WHEN a coach selects an athlete from the list THEN the system SHALL display only that athlete's albums
3. WHEN viewing an athlete's albums THEN the system SHALL show the athlete's name and profile picture at the top
4. WHEN a coach views the athlete list THEN the system SHALL display athletes sorted alphabetically by name
5. WHEN an athlete has no albums THEN the system SHALL display a message indicating no albums exist for that athlete

### Requirement 2

**User Story:** As a coach, I want to search and filter athletes in my club, so that I can quickly find a specific athlete's albums.

#### Acceptance Criteria

1. WHEN a coach views the athlete list THEN the system SHALL provide a search input field
2. WHEN a coach types in the search field THEN the system SHALL filter athletes by name in real-time
3. WHEN a coach clears the search field THEN the system SHALL display all athletes in the club
4. IF no athletes match the search query THEN the system SHALL display a "no results found" message

### Requirement 3

**User Story:** As an admin, I want to view album overview by club, so that I can monitor storage usage and album activity across all clubs.

#### Acceptance Criteria

1. WHEN an admin accesses the album management page THEN the system SHALL display a list of all clubs with album statistics
2. WHEN viewing club list THEN the system SHALL show total albums count, total media count, and total storage used per club
3. WHEN an admin selects a club THEN the system SHALL display all athletes in that club with their album counts
4. WHEN viewing club statistics THEN the system SHALL sort clubs by total storage used in descending order

### Requirement 4

**User Story:** As an admin, I want to view individual athlete albums from any club, so that I can review and manage content when needed.

#### Acceptance Criteria

1. WHEN an admin selects an athlete from a club THEN the system SHALL display that athlete's albums
2. WHEN viewing an athlete's albums as admin THEN the system SHALL show the same view as the athlete sees
3. WHEN an admin views albums THEN the system SHALL display the club name and athlete name in the header
4. WHEN an admin navigates between athletes THEN the system SHALL provide breadcrumb navigation (Clubs > Club Name > Athlete Name)

### Requirement 5

**User Story:** As an admin, I want to search across all clubs and athletes, so that I can quickly find specific users' albums.

#### Acceptance Criteria

1. WHEN an admin views the album management page THEN the system SHALL provide a global search field
2. WHEN an admin searches THEN the system SHALL search across club names and athlete names
3. WHEN search results are displayed THEN the system SHALL group results by club
4. WHEN an admin clicks a search result THEN the system SHALL navigate directly to that athlete's albums

### Requirement 6

**User Story:** As a coach or admin, I want to see album statistics for each athlete, so that I can understand their album usage at a glance.

#### Acceptance Criteria

1. WHEN viewing the athlete list THEN the system SHALL display album count for each athlete
2. WHEN viewing the athlete list THEN the system SHALL display total media count for each athlete
3. WHEN viewing the athlete list THEN the system SHALL display storage used for each athlete
4. WHEN viewing statistics THEN the system SHALL format storage size in human-readable format (KB, MB)

