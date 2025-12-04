# Requirements Document: Athlete Progress Tracking

## Introduction

ระบบติดตามความคืบหน้านักกีฬา (Athlete Progress Tracking) ช่วยให้โค้ชสามารถสร้าง "แผนพัฒนา" (Training Plan) ที่มีหลายระดับ/ขั้นตอน แล้วติดตามว่านักกีฬาแต่ละคนอยู่ขั้นไหนแล้ว พร้อมวางโปรแกรมฝึกต่อเนื่องได้

**ตัวอย่างการใช้งาน:**
- แผน "พัฒนาทักษะพื้นฐาน" มี 10 ระดับ → นักกีฬา A อยู่ขั้นที่ 6
- แผน "เตรียมแข่งขัน" มี 5 ขั้นตอน → นักกีฬา B อยู่ขั้นที่ 3
- โค้ชสามารถดูภาพรวมว่านักกีฬาทั้งหมดอยู่ขั้นไหนบ้าง

## Glossary

- **Training_Plan**: แผนพัฒนาที่โค้ชสร้างขึ้น มีหลายระดับ/ขั้นตอน
- **Plan_Level**: ระดับ/ขั้นตอนในแผนพัฒนา (เช่น ระดับ 1, 2, 3...)
- **Athlete_Progress**: ความคืบหน้าของนักกีฬาในแต่ละแผน
- **Progress_History**: ประวัติการเลื่อนระดับของนักกีฬา
- **Level_Requirements**: เงื่อนไขที่ต้องผ่านเพื่อเลื่อนระดับ

## Requirements

### Requirement 1: Training Plan Management

**User Story:** As a coach, I want to create custom training plans with multiple levels, so that I can track athlete development systematically.

#### Acceptance Criteria

1. WHEN a coach creates a new Training_Plan THEN the system SHALL require name, description, and total number of levels
2. WHEN a Training_Plan is created THEN the system SHALL allow defining each Plan_Level with name, description, and optional requirements
3. WHEN viewing Training_Plans THEN the system SHALL display all plans created by the coach or shared within the club
4. WHEN a coach edits a Training_Plan THEN the system SHALL preserve existing athlete progress data
5. WHEN a coach deletes a Training_Plan THEN the system SHALL require confirmation and archive (not hard delete) the plan

### Requirement 2: Plan Level Configuration

**User Story:** As a coach, I want to define detailed requirements for each level, so that athletes know what they need to achieve to progress.

#### Acceptance Criteria

1. WHEN defining a Plan_Level THEN the system SHALL allow setting level number, name, and description
2. WHEN configuring Level_Requirements THEN the system SHALL support multiple requirement types (skill checklist, duration, coach approval)
3. WHEN a level has requirements THEN the system SHALL display them clearly to both coach and athlete
4. WHEN all requirements are met THEN the system SHALL highlight the level as "ready for promotion"

### Requirement 3: Athlete Progress Assignment

**User Story:** As a coach, I want to assign athletes to training plans and track their current level, so that I can monitor their development.

#### Acceptance Criteria

1. WHEN assigning an athlete to a Training_Plan THEN the system SHALL set initial level (default: level 1)
2. WHEN viewing athlete profile THEN the system SHALL display all assigned plans and current levels
3. WHEN a coach updates athlete level THEN the system SHALL record the change with timestamp and notes
4. WHEN an athlete is assigned to multiple plans THEN the system SHALL track progress independently for each plan

### Requirement 4: Progress Visualization

**User Story:** As a coach, I want to see a visual overview of all athletes' progress, so that I can quickly identify who needs attention.

#### Acceptance Criteria

1. WHEN viewing plan overview THEN the system SHALL display all athletes grouped by their current level
2. WHEN viewing athlete list THEN the system SHALL show progress bars or level indicators for each plan
3. WHEN filtering athletes THEN the system SHALL allow filtering by plan, level, or progress status
4. WHEN exporting progress data THEN the system SHALL generate a summary report

### Requirement 5: Progress History

**User Story:** As a coach, I want to see the history of an athlete's progress, so that I can understand their development journey.

#### Acceptance Criteria

1. WHEN viewing athlete progress THEN the system SHALL display complete history of level changes
2. WHEN a level change occurs THEN the system SHALL record date, previous level, new level, and coach notes
3. WHEN viewing history THEN the system SHALL show time spent at each level
4. WHEN comparing athletes THEN the system SHALL allow side-by-side progress comparison

### Requirement 6: Athlete Self-View

**User Story:** As an athlete, I want to see my own progress in assigned plans, so that I know where I stand and what to work on.

#### Acceptance Criteria

1. WHEN an athlete views their profile THEN the system SHALL display all assigned plans and current levels
2. WHEN viewing a plan THEN the system SHALL show current level, next level requirements, and progress history
3. WHEN requirements are defined THEN the system SHALL display checklist of what's needed for next level
4. WHEN progress is updated THEN the system SHALL notify the athlete of level changes

### Requirement 7: Role-Based Access Control

**User Story:** As a system, I want to enforce proper access control, so that only authorized users can modify progress data.

#### Acceptance Criteria

1. WHEN an admin accesses progress data THEN the system SHALL allow full CRUD on all plans and progress
2. WHEN a coach accesses progress data THEN the system SHALL allow CRUD on plans they created and athletes in their club
3. WHEN an athlete accesses progress data THEN the system SHALL allow read-only access to their own progress
4. WHEN unauthorized access is attempted THEN the system SHALL deny and log the attempt

