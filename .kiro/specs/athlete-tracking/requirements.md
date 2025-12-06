# Requirements Document

## Introduction

ฟีเจอร์ Athlete Tracking เป็นระบบติดตามค่าตัวเลขของนักกีฬาที่ยืดหยุ่น รองรับความต้องการที่หลากหลายในแต่ละกีฬา เช่น การควบคุมน้ำหนักสำหรับยูโด/มวย, การจับเวลาสำหรับว่ายน้ำ/วิ่ง, หรือการวัดความแข็งแรงสำหรับยกน้ำหนัก โดยโค้ชสามารถกำหนดฟิลด์ที่ต้องติดตามเอง และตั้งเป้าหมายรายบุคคลให้นักกีฬาแต่ละคน

## Glossary

- **Tracking Plan**: แผนติดตามค่าตัวเลข ประกอบด้วยชื่อแผน, ประเภท, ระยะเวลา, และฟิลด์ที่ต้องติดตาม
- **Tracking Field**: ฟิลด์ที่กำหนดให้ติดตาม เช่น น้ำหนัก, เปอร์เซ็นต์ไขมัน, เวลาวิ่ง
- **Field Type**: ประเภทของฟิลด์ (number, time, reps, distance, text, select)
- **Athlete Goal**: เป้าหมายรายบุคคลของนักกีฬาในแต่ละฟิลด์
- **Tracking Log**: บันทึกค่าตัวเลขในแต่ละวัน
- **Plan Template**: แม่แบบแผนสำเร็จรูปตามประเภทกีฬา
- **User**: ผู้ใช้ระบบ (Admin, Coach, Athlete)

## Requirements

### Requirement 1: สร้างและจัดการแผนติดตาม

**User Story:** As a coach, I want to create tracking plans with custom fields, so that I can monitor specific metrics relevant to my sport.

#### Acceptance Criteria

1. WHEN a coach creates a tracking plan THEN the system SHALL require plan name, plan type, start date, and end date
2. WHEN a coach defines tracking fields THEN the system SHALL allow specifying field name, field type, unit, and required status
3. WHEN a coach selects field type THEN the system SHALL support types: number, time, reps, distance, text, select
4. WHEN a coach saves a tracking plan THEN the system SHALL store the plan with club_id and created_by
5. WHEN a coach edits a tracking plan THEN the system SHALL allow modifying plan details and adding new fields
6. IF a coach deactivates a tracking plan THEN the system SHALL preserve existing logs but hide the plan from active list

### Requirement 2: ใช้แม่แบบแผนสำเร็จรูป

**User Story:** As a coach, I want to use pre-defined templates for common sports, so that I can quickly set up tracking plans.

#### Acceptance Criteria

1. WHEN a coach creates a new plan THEN the system SHALL display available templates: ควบคุมน้ำหนัก, จับเวลา, ความแข็งแรง, ค่าร่างกายทั่วไป
2. WHEN a coach selects "ควบคุมน้ำหนัก" template THEN the system SHALL pre-fill fields: น้ำหนัก (kg), เปอร์เซ็นต์ไขมัน (%), รอบเอว (cm)
3. WHEN a coach selects "จับเวลา" template THEN the system SHALL pre-fill fields: เวลา (time), ระยะทาง (m)
4. WHEN a coach selects "ความแข็งแรง" template THEN the system SHALL pre-fill fields: Squat 1RM (kg), Deadlift 1RM (kg), Bench Press 1RM (kg)
5. WHEN a coach uses a template THEN the system SHALL allow customizing the pre-filled fields before saving

### Requirement 3: เพิ่มนักกีฬาและตั้งเป้าหมาย

**User Story:** As a coach, I want to add athletes to a tracking plan and set individual goals, so that each athlete has personalized targets.

#### Acceptance Criteria

1. WHEN a coach views a tracking plan THEN the system SHALL display list of athletes in the plan with their current values and goals
2. WHEN a coach adds an athlete to a plan THEN the system SHALL allow setting initial value and target value for each tracking field
3. WHEN a coach sets a goal THEN the system SHALL store athlete_id, plan_id, field_id, initial_value, target_value, and target_date
4. WHEN a coach edits athlete goals THEN the system SHALL allow modifying target values and target dates
5. IF a coach removes an athlete from a plan THEN the system SHALL preserve the athlete's historical logs

### Requirement 4: บันทึกค่าตัวเลขรายวัน

**User Story:** As a coach or athlete, I want to log tracking values, so that progress can be monitored over time.

#### Acceptance Criteria

1. WHEN a user logs tracking values THEN the system SHALL require selecting the plan, athlete, and log date
2. WHEN a user enters values THEN the system SHALL validate input based on field type (number, time format, etc.)
3. WHEN a user saves a tracking log THEN the system SHALL store values with plan_id, athlete_id, log_date, and created_by
4. WHEN viewing existing logs THEN the system SHALL allow editing values for logs created within the last 7 days
5. IF a user logs values for a date that already has a log THEN the system SHALL update the existing log instead of creating duplicate

### Requirement 5: แสดงความคืบหน้าและกราฟ

**User Story:** As a coach or athlete, I want to see progress charts and statistics, so that I can visualize improvement over time.

#### Acceptance Criteria

1. WHEN viewing athlete progress THEN the system SHALL display a line chart showing value changes over time for each field
2. WHEN viewing progress THEN the system SHALL display current value, initial value, target value, and percentage progress
3. WHEN viewing progress THEN the system SHALL highlight if the athlete is on track, ahead, or behind schedule
4. WHEN comparing multiple athletes THEN the system SHALL display a comparison table with current values and progress percentages
5. WHEN no tracking data exists THEN the system SHALL display a message prompting to add the first log

### Requirement 6: การเข้าถึงตาม Role

**User Story:** As a system administrator, I want to control access based on user roles, so that data is properly secured.

#### Acceptance Criteria

1. WHEN an admin accesses tracking plans THEN the system SHALL display all plans across all clubs
2. WHEN a coach accesses tracking plans THEN the system SHALL display only plans in their club
3. WHEN an athlete accesses tracking THEN the system SHALL display only their own tracking data and progress
4. WHILE an athlete views their tracking data THEN the athlete SHALL NOT have permission to modify goals set by coach
5. WHEN a coach logs values for an athlete THEN the system SHALL record the coach as created_by

### Requirement 7: แจ้งเตือนและ Milestone

**User Story:** As an athlete, I want to receive notifications when I reach milestones, so that I feel motivated to continue.

#### Acceptance Criteria

1. WHEN an athlete reaches 50% of their goal THEN the system SHALL create a notification congratulating the milestone
2. WHEN an athlete reaches 100% of their goal THEN the system SHALL create a notification celebrating goal achievement
3. WHEN an athlete's value moves away from goal (regression) THEN the system SHALL NOT create negative notifications
4. WHEN viewing the tracking dashboard THEN the system SHALL display milestone badges for achieved goals

## Role Matrix

| การกระทำ | Admin | Coach | Athlete |
|----------|-------|-------|---------|
| ดูแผนทั้งหมด | ✅ | ❌ | ❌ |
| ดูแผนในชมรม | ✅ | ✅ | ❌ |
| ดูข้อมูลตัวเอง | ✅ | ✅ | ✅ |
| สร้างแผน | ✅ | ✅ | ❌ |
| แก้ไขแผน | ✅ | ✅ (เจ้าของ) | ❌ |
| ลบแผน | ✅ | ✅ (เจ้าของ) | ❌ |
| เพิ่มนักกีฬาในแผน | ✅ | ✅ | ❌ |
| ตั้งเป้าหมาย | ✅ | ✅ | ❌ |
| บันทึกค่าตัวเลข | ✅ | ✅ | ✅ (ตัวเอง) |
| ดูกราฟความคืบหน้า | ✅ | ✅ | ✅ (ตัวเอง) |

## Data Flow

```
tracking_plans → tracking_fields → tracking_athlete_goals
      ↓                                    ↓
      └──────────→ tracking_logs ←─────────┘
                        ↓
                  progress_calculation
                        ↓
                  charts & notifications
```

## Database Constraints

- tracking_plans.club_id ต้องตรงกับ coach.club_id
- tracking_fields.field_type ต้องเป็น: number, time, reps, distance, text, select
- tracking_athlete_goals.target_date ต้องไม่เกิน tracking_plans.end_date
- tracking_logs.log_date ต้องอยู่ระหว่าง tracking_plans.start_date และ end_date
- tracking_logs ต้องมี unique constraint บน (plan_id, athlete_id, log_date)
- ทุกตารางต้องมี RLS policies ครบตาม development-workflow.md
