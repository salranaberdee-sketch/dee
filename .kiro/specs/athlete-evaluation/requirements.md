# Requirements: ระบบประเมินผลนักกีฬา (Athlete Performance Evaluation)

## Introduction

ระบบสำหรับติดตามและประเมินผลนักกีฬาแต่ละคน โดยวัดจากการเข้าร่วมกิจกรรม การฝึกซ้อม และผลงานโดยรวม เพื่อคัดแยกนักกีฬาที่มีผลงานดีและต้องปรับปรุง ทุกฟีเจอร์ต้องเชื่อมโยงกันอย่างสมบูรณ์ Admin/Coach สามารถกำหนดเกณฑ์การให้คะแนนแต่ละกิจกรรมได้เองโดยเพิ่มเงื่อนไขได้

## Glossary

- **Attendance Record**: บันทึกการเข้าร่วมกิจกรรมของนักกีฬา
- **Training Log**: บันทึกการฝึกซ้อมของนักกีฬา
- **Performance Tier**: ระดับผลงานของนักกีฬา (excellent/good/average/needs_improvement)
- **Overall Score**: คะแนนรวมจากการคำนวณ (0-100)
- **Schedule**: นัดหมายฝึกซ้อม/ประชุม
- **Event**: กิจกรรมพิเศษ/แข่งขัน
- **Scoring Criteria**: เกณฑ์การให้คะแนนที่กำหนดโดย Admin/Coach
- **Scoring Category**: หมวดหมู่คะแนน (attendance/training/rating/custom)
- **Scoring Condition**: เงื่อนไขการให้คะแนนเพิ่มเติม

## Requirements

### Requirement 1: บันทึกการเข้าร่วม (Attendance Tracking)

**User Story:** As a coach, I want to record athlete attendance for each activity, so that I can track their participation.

#### Acceptance Criteria

1. WHEN a coach opens the attendance page THEN the system SHALL display a list of athletes in the club
2. WHEN a coach selects a date and activity THEN the system SHALL allow marking each athlete's status (on_time/late/leave/absent)
3. WHEN attendance is recorded THEN the system SHALL link the record to the specific schedule or event
4. WHEN a coach saves attendance THEN the system SHALL persist the data to attendance_records table with club_id

### Requirement 2: ขอลา (Leave Request)

**User Story:** As an athlete, I want to request leave for upcoming activities, so that my absence is recorded properly.

#### Acceptance Criteria

1. WHEN an athlete opens the leave request page THEN the system SHALL display only upcoming activities (schedules/events) from their club
2. WHEN no upcoming activities exist THEN the system SHALL display a message that leave cannot be requested
3. WHEN an athlete selects an activity THEN the system SHALL require leave type (sick/personal/emergency/other) and reason
4. WHEN a leave request is submitted THEN the system SHALL create an attendance_record with status='leave' and link to schedule_id or event_id
5. WHEN a leave request is pending THEN the system SHALL display it in the athlete's leave history with 'pending' status

### Requirement 3: บันทึกฝึกซ้อม (Training Logs)

**User Story:** As an athlete, I want to log my training sessions, so that they count toward my performance score.

#### Acceptance Criteria

1. WHEN an athlete creates a training log THEN the system SHALL require date, duration, and activities
2. WHEN a coach reviews training logs THEN the system SHALL allow rating (1-5 stars)
3. WHEN training logs are saved THEN the system SHALL link them to athlete_id and club_id
4. WHEN calculating performance THEN the system SHALL count training_logs entries as training_sessions

### Requirement 4: คำนวณคะแนน (Score Calculation)

**User Story:** As a system, I want to calculate athlete performance scores automatically, so that coaches can evaluate athletes objectively.

#### Acceptance Criteria

1. WHEN calculating attendance_score THEN the system SHALL use formula based on configured weight (default 40%)
2. WHEN calculating training_score THEN the system SHALL use formula based on configured weight (default 30%)
3. WHEN calculating rating_score THEN the system SHALL use formula based on configured weight (default 30%)
4. WHEN calculating overall_score THEN the system SHALL sum all category scores including custom criteria
5. WHEN overall_score >= 85 THEN the system SHALL assign tier 'excellent'
6. WHEN overall_score >= 70 AND < 85 THEN the system SHALL assign tier 'good'
7. WHEN overall_score >= 50 AND < 70 THEN the system SHALL assign tier 'average'
8. WHEN overall_score < 50 THEN the system SHALL assign tier 'needs_improvement'
9. WHEN custom scoring criteria exist THEN the system SHALL include bonus/penalty points in calculation

### Requirement 7: กำหนดเกณฑ์การให้คะแนน (Scoring Criteria Configuration)

**User Story:** As an admin or coach, I want to configure scoring criteria for each activity, so that I can customize evaluation based on club requirements.

#### Acceptance Criteria

1. WHEN an admin or coach opens scoring criteria settings THEN the system SHALL display current criteria configuration for the club
2. WHEN configuring base weights THEN the system SHALL allow setting percentage for attendance, training, and rating (total must equal 100%)
3. WHEN adding a custom scoring condition THEN the system SHALL require name, category, condition_type, threshold_value, and points
4. WHEN condition_type is 'bonus' THEN the system SHALL add points when athlete meets the threshold
5. WHEN condition_type is 'penalty' THEN the system SHALL subtract points when athlete fails the threshold
6. WHEN saving scoring criteria THEN the system SHALL validate that total base weights equal 100%
7. WHEN a club has no custom criteria THEN the system SHALL use default weights (attendance 40%, training 30%, rating 30%)
8. WHEN deleting a scoring condition THEN the system SHALL remove it from future calculations
9. WHEN updating scoring criteria THEN the system SHALL recalculate all athlete scores in the club

### Requirement 8: เงื่อนไขคะแนนพิเศษ (Custom Scoring Conditions)

**User Story:** As a coach, I want to add special scoring conditions, so that I can reward or penalize specific behaviors.

#### Acceptance Criteria

1. WHEN creating a bonus condition for perfect attendance THEN the system SHALL add specified points when athlete has 100% attendance
2. WHEN creating a penalty condition for excessive absences THEN the system SHALL subtract points when absences exceed threshold
3. WHEN creating a bonus for training consistency THEN the system SHALL add points when athlete trains specified days per week
4. WHEN creating a bonus for high ratings THEN the system SHALL add points when average rating exceeds threshold
5. WHEN displaying athlete score THEN the system SHALL show breakdown including all applied conditions
6. WHEN a condition is met THEN the system SHALL log which conditions affected the score

### Requirement 5: แสดงผลงานนักกีฬา (Athlete Performance View)

**User Story:** As an athlete, I want to see my performance details, so that I know what to improve.

#### Acceptance Criteria

1. WHEN an athlete views their performance THEN the system SHALL display current score and tier
2. WHEN displaying score breakdown THEN the system SHALL show 3 components (attendance 40%, training 30%, rating 30%)
3. WHEN athlete has not reached highest tier THEN the system SHALL display target tier and points needed
4. WHEN displaying improvement suggestions THEN the system SHALL calculate specific actions and potential point gains
5. WHEN displaying tier requirements THEN the system SHALL show all 4 tiers with their score thresholds

### Requirement 6: Dashboard ประเมินผล (Evaluation Dashboard)

**User Story:** As a coach, I want to see all athletes' performance in one view, so that I can identify who needs attention.

#### Acceptance Criteria

1. WHEN a coach opens the evaluation dashboard THEN the system SHALL display athletes filtered by their club_id
2. WHEN displaying summary THEN the system SHALL show count of athletes in each tier
3. WHEN filtering by tier THEN the system SHALL display only athletes matching the selected tier
4. WHEN exporting report THEN the system SHALL generate CSV with all athlete statistics

## Role Matrix

| การกระทำ | Admin | Coach | Athlete |
|----------|-------|-------|---------|
| ดูสถิติทั้งหมด | ✅ | ❌ | ❌ |
| ดูสถิติในชมรม | ✅ | ✅ | ❌ |
| ดูสถิติตัวเอง | ✅ | ✅ | ✅ |
| บันทึก Attendance | ✅ | ✅ | ❌ |
| ขอลา (เฉพาะกิจกรรมที่มี) | ✅ | ✅ | ✅ (ตัวเอง) |
| อนุมัติการลา | ✅ | ✅ | ❌ |
| บันทึก Training Log | ✅ | ✅ | ✅ (ตัวเอง) |
| ให้ Rating | ✅ | ✅ | ❌ |
| Export รายงาน | ✅ | ✅ | ❌ |
| กำหนดเกณฑ์คะแนน | ✅ | ✅ | ❌ |
| เพิ่มเงื่อนไขคะแนน | ✅ | ✅ | ❌ |
| ลบเงื่อนไขคะแนน | ✅ | ✅ | ❌ |
| ดูเงื่อนไขที่ใช้กับตัวเอง | ✅ | ✅ | ✅ |

## Data Flow

```
schedules/events → attendance_records ←→ athletes
                          ↓
training_logs ──────→ CALCULATION ←── rating
                          ↓
                   overall_score
                          ↓
                   performance_tier
```

## Database Constraints

- attendance_records.schedule_id หรือ event_id ต้องมีค่าอย่างน้อย 1 อัน (สำหรับการลา)
- attendance_records.club_id ต้องตรงกับ athlete.club_id
- training_logs.rating ต้องอยู่ระหว่าง 1-5
- scoring_criteria.total_weight ต้องเท่ากับ 100
- scoring_conditions.points ต้องเป็นจำนวนเต็ม (บวกสำหรับ bonus, ลบสำหรับ penalty)
- scoring_conditions.condition_type ต้องเป็น 'bonus' หรือ 'penalty'
- ทุกตารางต้องมี RLS policies ครบตาม development-workflow.md

## Scoring Criteria Data Model

```
scoring_criteria (เกณฑ์คะแนนหลัก)
├── id (uuid)
├── club_id (uuid) → clubs.id
├── attendance_weight (integer, default 40)
├── training_weight (integer, default 30)
├── rating_weight (integer, default 30)
├── created_by (uuid) → user_profiles.id
├── created_at (timestamp)
└── updated_at (timestamp)

scoring_conditions (เงื่อนไขคะแนนเพิ่มเติม)
├── id (uuid)
├── club_id (uuid) → clubs.id
├── criteria_id (uuid) → scoring_criteria.id
├── name (text) - ชื่อเงื่อนไข
├── category (text) - attendance/training/rating/custom
├── condition_type (text) - bonus/penalty
├── threshold_type (text) - percentage/count/value
├── threshold_value (numeric) - ค่าที่ต้องถึง
├── points (integer) - คะแนนที่ได้/หัก
├── description (text) - คำอธิบาย
├── is_active (boolean, default true)
├── created_by (uuid) → user_profiles.id
├── created_at (timestamp)
└── updated_at (timestamp)
```

## Example Scoring Conditions

| ชื่อเงื่อนไข | หมวด | ประเภท | เกณฑ์ | คะแนน |
|------------|------|--------|------|-------|
| เข้าร่วมครบ 100% | attendance | bonus | percentage >= 100 | +5 |
| ขาดเกิน 3 ครั้ง | attendance | penalty | count > 3 | -10 |
| ฝึกซ้อมครบ 4 วัน/สัปดาห์ | training | bonus | count >= 4 | +5 |
| Rating เฉลี่ย 4.5+ | rating | bonus | value >= 4.5 | +5 |
| ไม่มีการฝึกซ้อม | training | penalty | count = 0 | -15 |
