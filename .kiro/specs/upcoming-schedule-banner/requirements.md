# Requirements Document

## Introduction

ฟีเจอร์แบนเนอร์นัดหมายถัดไป (Upcoming Schedule Banner) เป็นส่วนประกอบ UI ที่แสดงนัดหมายที่กำลังจะมาถึงในรูปแบบแบนเนอร์ที่โดดเด่น เพื่อให้โค้ชและนักกีฬาเห็นนัดหมายสำคัญได้ทันที แบนเนอร์จะแสดงข้อมูลนัดหมายที่เกี่ยวข้องกับผู้ใช้ตาม Role และ Club ที่สังกัด

## Glossary

- **Banner**: ส่วนประกอบ UI ที่แสดงข้อมูลสำคัญในรูปแบบที่โดดเด่น มักอยู่ด้านบนของหน้า
- **Schedule**: นัดหมายที่บันทึกในระบบ ประกอบด้วยวันที่ เวลา สถานที่ และรายละเอียด
- **Upcoming Schedule**: นัดหมายที่มีวันที่มากกว่าหรือเท่ากับวันปัจจุบัน
- **Coach**: โค้ชที่ดูแลนักกีฬาในชมรม
- **Athlete**: นักกีฬาที่สังกัดชมรม
- **Club**: ชมรมกีฬาที่ผู้ใช้สังกัด
- **Schedule_System**: ระบบจัดการนัดหมายในแอปพลิเคชัน

## Requirements

### Requirement 1

**User Story:** As a coach, I want to see the next upcoming schedule in a prominent banner, so that I can quickly know when and where the next training session is.

#### Acceptance Criteria

1. WHEN a coach opens the Dashboard THEN the Schedule_System SHALL display a banner showing the next upcoming schedule for the coach's club
2. WHEN the coach's club has no upcoming schedules THEN the Schedule_System SHALL hide the banner component
3. WHEN the banner displays a schedule THEN the Schedule_System SHALL show the schedule title, date, time, and location
4. WHEN a coach clicks on the banner THEN the Schedule_System SHALL navigate to the schedules page

### Requirement 2

**User Story:** As an athlete, I want to see the next upcoming schedule in a prominent banner, so that I can prepare for the next training session.

#### Acceptance Criteria

1. WHEN an athlete opens the Dashboard THEN the Schedule_System SHALL display a banner showing the next upcoming schedule for the athlete's club
2. WHEN the athlete's club has no upcoming schedules THEN the Schedule_System SHALL hide the banner component
3. WHEN the banner displays a schedule THEN the Schedule_System SHALL show the schedule title, date, time, and location
4. WHEN an athlete clicks on the banner THEN the Schedule_System SHALL navigate to the schedules page

### Requirement 3

**User Story:** As a user, I want the banner to show relevant schedule information clearly, so that I can understand the schedule at a glance.

#### Acceptance Criteria

1. WHEN the banner displays a schedule THEN the Schedule_System SHALL format the date in Thai locale (e.g., "15 ธ.ค. 2567")
2. WHEN the banner displays a schedule THEN the Schedule_System SHALL show the time in 24-hour format (e.g., "18:00")
3. WHEN the schedule is today THEN the Schedule_System SHALL display a "วันนี้" (Today) label prominently
4. WHEN the schedule is tomorrow THEN the Schedule_System SHALL display a "พรุ่งนี้" (Tomorrow) label
5. WHEN the schedule is within 7 days THEN the Schedule_System SHALL display the day name (e.g., "วันจันทร์")

### Requirement 4

**User Story:** As a user, I want the banner to have a visually distinct design, so that it stands out from other content on the dashboard.

#### Acceptance Criteria

1. WHEN the banner is rendered THEN the Schedule_System SHALL use a dark background (gray-900) with white text following the design theme
2. WHEN the banner is rendered THEN the Schedule_System SHALL display a calendar SVG icon on the left side
3. WHEN the banner is rendered THEN the Schedule_System SHALL have rounded corners (border-radius-lg) consistent with the design system
4. WHEN the user interacts with the banner THEN the Schedule_System SHALL provide visual feedback on hover/active states

### Requirement 5

**User Story:** As a coach or athlete, I want to see only schedules relevant to my club, so that I don't see irrelevant information.

#### Acceptance Criteria

1. WHEN a user with a club_id views the banner THEN the Schedule_System SHALL filter schedules to show only those matching the user's club_id
2. WHEN a user has no club_id THEN the Schedule_System SHALL show schedules that have no club_id (global schedules)
3. WHEN filtering schedules THEN the Schedule_System SHALL select only the nearest upcoming schedule by date and time
