# Requirements: ระบบประเมินผลนักกีฬา (Athlete Performance Evaluation)

## Introduction

ระบบสำหรับติดตามและประเมินผลนักกีฬาแต่ละคน โดยวัดจากการเข้าร่วมกิจกรรม การฝึกซ้อม และผลงานโดยรวม เพื่อคัดแยกนักกีฬาที่มีผลงานดีและต้องปรับปรุง ทุกฟีเจอร์ต้องเชื่อมโยงกันอย่างสมบูรณ์

## Glossary

- **Attendance Record**: บันทึกการเข้าร่วมกิจกรรมของนักกีฬา
- **Training Log**: บันทึกการฝึกซ้อมของนักกีฬา
- **Performance Tier**: ระดับผลงานของนักกีฬา (excellent/good/average/needs_improvement)
- **Overall Score**: คะแนนรวมจากการคำนวณ (0-100)
- **Schedule**: นัดหมายฝึกซ้อม/ประชุม
- **Event**: กิจกรรมพิเศษ/แข่งขัน

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

1. WHEN calculating attendance_score THEN the system SHALL use formula: (on_time + late) / total * 100 * 0.4
2. WHEN calculating training_score THEN the system SHALL use formula: min(sessions / 12, 1) * 30
3. WHEN calculating rating_score THEN the system SHALL use formula: (average_rating / 5) * 30
4. WHEN calculating overall_score THEN the system SHALL sum attendance_score + training_score + rating_score
5. WHEN overall_score >= 85 THEN the system SHALL assign tier 'excellent'
6. WHEN overall_score >= 70 AND < 85 THEN the system SHALL assign tier 'good'
7. WHEN overall_score >= 50 AND < 70 THEN the system SHALL assign tier 'average'
8. WHEN overall_score < 50 THEN the system SHALL assign tier 'needs_improvement'

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
- ทุกตารางต้องมี RLS policies ครบตาม development-workflow.md
