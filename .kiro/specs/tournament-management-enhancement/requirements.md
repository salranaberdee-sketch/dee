# Requirements Document

## Introduction

ระบบจัดการทัวนาเมนต์ที่ปรับปรุงใหม่ (Tournament Management Enhancement) เพื่อให้การจัดการนักกีฬาและข้อมูลทัวนาเมนต์สะดวก รวดเร็ว และใช้งานง่ายขึ้น โดยเน้น:

- **Bulk Add Athletes** - เพิ่มนักกีฬาได้ครั้งละหลายคน
- **Organized UI** - จัดระเบียบ UI เป็นหมวดหมู่ที่ชัดเจน
- **Quick Actions** - การดำเนินการที่รวดเร็ว

## Glossary

- **Tournament**: รายการแข่งขันที่จัดขึ้น
- **Participant**: นักกีฬาที่ลงทะเบียนเข้าร่วมทัวนาเมนต์
- **Bulk_Add**: การเพิ่มนักกีฬาหลายคนพร้อมกันในครั้งเดียว
- **Category**: รุ่น/ประเภทการแข่งขัน (เช่น รุ่นเยาวชน, รุ่นทั่วไป)
- **Weight_Class**: รุ่นน้ำหนัก (เช่น 50-55 กก.)
- **Quick_Filter**: ตัวกรองข้อมูลแบบรวดเร็ว
- **Tournament_Management_System**: ระบบจัดการทัวนาเมนต์

## Requirements

### Requirement 1: Bulk Add Athletes

**User Story:** As a coach, I want to add multiple athletes to a tournament at once, so that I can quickly register my team without adding them one by one.

#### Acceptance Criteria

1. WHEN a coach opens the add participant modal THEN the Tournament_Management_System SHALL display a multi-select interface for choosing athletes
2. WHEN athletes are selected THEN the Tournament_Management_System SHALL show a count of selected athletes and allow batch category/weight_class assignment
3. WHEN a coach confirms bulk add THEN the Tournament_Management_System SHALL create participant records for all selected athletes in a single operation
4. WHEN bulk add completes THEN the Tournament_Management_System SHALL display success message with count of added athletes
5. WHEN any athlete fails to add THEN the Tournament_Management_System SHALL continue adding others and report failures separately

### Requirement 2: Athlete Selection Interface

**User Story:** As a coach, I want to easily select athletes from my club with search and filter options, so that I can quickly find and add the right athletes.

#### Acceptance Criteria

1. WHEN displaying athlete selection THEN the Tournament_Management_System SHALL show athletes grouped by club
2. WHEN a coach searches THEN the Tournament_Management_System SHALL filter athletes by name in real-time
3. WHEN a coach uses select all THEN the Tournament_Management_System SHALL select all visible athletes matching current filters
4. WHEN athletes are already registered THEN the Tournament_Management_System SHALL display them as disabled with a registered indicator
5. WHEN displaying athlete list THEN the Tournament_Management_System SHALL show athlete name, club, and registration status

### Requirement 3: Organized Participant List

**User Story:** As an admin, I want to view participants organized by category and weight class, so that I can easily manage and review registrations.

#### Acceptance Criteria

1. WHEN displaying participants THEN the Tournament_Management_System SHALL group them by category with collapsible sections
2. WHEN a category section is expanded THEN the Tournament_Management_System SHALL show participants sorted by weight_class then name
3. WHEN displaying participant count THEN the Tournament_Management_System SHALL show count per category and total count
4. WHEN a participant has no category THEN the Tournament_Management_System SHALL display them in an Uncategorized section

### Requirement 4: Quick Actions for Participants

**User Story:** As a coach, I want quick action buttons for common operations, so that I can manage participants efficiently.

#### Acceptance Criteria

1. WHEN viewing participant list THEN the Tournament_Management_System SHALL provide bulk select checkboxes
2. WHEN participants are selected THEN the Tournament_Management_System SHALL show bulk action buttons (remove, change category, change status)
3. WHEN bulk remove is triggered THEN the Tournament_Management_System SHALL confirm and remove all selected participants
4. WHEN bulk category change is triggered THEN the Tournament_Management_System SHALL allow setting category for all selected participants

### Requirement 5: Tournament Dashboard Sections

**User Story:** As an admin, I want the tournament detail page organized into clear sections, so that I can navigate and manage different aspects easily.

#### Acceptance Criteria

1. WHEN viewing tournament detail THEN the Tournament_Management_System SHALL display sections for Info, Participants, Matches, and Awards
2. WHEN displaying Info section THEN the Tournament_Management_System SHALL show tournament details in a card layout with edit capability
3. WHEN displaying Participants section THEN the Tournament_Management_System SHALL show registration statistics and participant list
4. WHEN displaying Matches section THEN the Tournament_Management_System SHALL group matches by round with timeline view
5. WHEN displaying Awards section THEN the Tournament_Management_System SHALL show awards grouped by type with medal icons

### Requirement 6: Registration Statistics

**User Story:** As an admin, I want to see registration statistics at a glance, so that I can monitor tournament participation.

#### Acceptance Criteria

1. WHEN displaying participant section THEN the Tournament_Management_System SHALL show total registered count
2. WHEN displaying statistics THEN the Tournament_Management_System SHALL show breakdown by registration status (pending, approved, rejected)
3. WHEN displaying statistics THEN the Tournament_Management_System SHALL show breakdown by category
4. WHEN max_participants is set THEN the Tournament_Management_System SHALL show remaining slots available

### Requirement 7: Improved Match Management

**User Story:** As a coach, I want to record and view match results in an organized timeline, so that I can track athlete performance throughout the tournament.

#### Acceptance Criteria

1. WHEN displaying matches THEN the Tournament_Management_System SHALL group them by round (รอบแรก, รอบสอง, รอบชิง)
2. WHEN displaying match timeline THEN the Tournament_Management_System SHALL show matches in chronological order within each round
3. WHEN recording a match THEN the Tournament_Management_System SHALL allow selecting multiple athletes for team matches
4. WHEN displaying match result THEN the Tournament_Management_System SHALL show win/lose/draw with visual indicators

### Requirement 8: Mobile-Friendly Interface

**User Story:** As a coach using a mobile device at the tournament venue, I want the interface to work well on small screens, so that I can manage registrations and results on-site.

#### Acceptance Criteria

1. WHEN viewing on mobile THEN the Tournament_Management_System SHALL display a responsive layout with touch-friendly buttons
2. WHEN using bulk select on mobile THEN the Tournament_Management_System SHALL provide swipe gestures for selection
3. WHEN displaying sections on mobile THEN the Tournament_Management_System SHALL use accordion-style collapsible panels
4. WHEN displaying forms on mobile THEN the Tournament_Management_System SHALL use full-width inputs with appropriate keyboard types

