# Requirements Document

## Introduction

ฟีเจอร์ Training Logs Enhancement เป็นการต่อยอดระบบบันทึกการฝึกซ้อมที่มีอยู่ โดยเพิ่มความสามารถในการจัดหมวดหมู่กิจกรรม, แสดงสถิติและกราฟความก้าวหน้า, ตั้งเป้าหมายการฝึก, และระบบ Streak/Achievement เพื่อสร้างแรงจูงใจให้นักกีฬาฝึกซ้อมอย่างต่อเนื่อง

## Glossary

- **Training Log**: บันทึกการฝึกซ้อมแต่ละครั้ง ประกอบด้วยกิจกรรม ระยะเวลา คะแนน และโน้ต
- **Activity Category**: หมวดหมู่ของกิจกรรมการฝึก เช่น วิ่ง ว่ายน้ำ ยกน้ำหนัก
- **Training Goal**: เป้าหมายการฝึกซ้อมที่ตั้งไว้ เช่น ฝึก 5 ครั้งต่อสัปดาห์
- **Streak**: จำนวนวันที่ฝึกซ้อมติดต่อกัน
- **Achievement**: รางวัลหรือ badge ที่ได้รับจากการบรรลุเป้าหมาย
- **User**: ผู้ใช้ระบบ (Admin, Coach, Athlete)

## Requirements

### Requirement 1

**User Story:** As an athlete, I want to categorize my training activities, so that I can organize and filter my training logs by activity type.

#### Acceptance Criteria

1. WHEN an athlete creates or edits a training log THEN the system SHALL display a dropdown to select activity category
2. WHEN viewing training logs THEN the system SHALL display the activity category as a badge on each log entry
3. WHEN an athlete filters by category THEN the system SHALL display only logs matching the selected category
4. WHEN the system initializes THEN the system SHALL provide default categories: วิ่ง, ว่ายน้ำ, ยกน้ำหนัก, ยืดเหยียด, กีฬาเฉพาะทาง, อื่นๆ
5. IF an athlete selects "อื่นๆ" category THEN the system SHALL allow entering a custom activity name

### Requirement 2

**User Story:** As an athlete, I want to see statistics and progress charts, so that I can track my training progress over time.

#### Acceptance Criteria

1. WHEN an athlete views the training logs page THEN the system SHALL display summary statistics including total sessions, total hours, and average rating
2. WHEN an athlete views statistics THEN the system SHALL display a weekly training chart showing sessions per day
3. WHEN an athlete views statistics THEN the system SHALL display training distribution by category as a simple breakdown
4. WHEN viewing weekly stats THEN the system SHALL compare current week with previous week
5. WHEN no training data exists for a period THEN the system SHALL display zero values without errors

### Requirement 3

**User Story:** As an athlete, I want to set training goals, so that I can stay motivated and track my progress toward targets.

#### Acceptance Criteria

1. WHEN an athlete accesses goal settings THEN the system SHALL allow setting weekly training frequency goal (sessions per week)
2. WHEN an athlete sets a goal THEN the system SHALL store the goal with user_id, goal_type, target_value, and start_date
3. WHEN viewing the dashboard THEN the system SHALL display current progress toward the weekly goal
4. WHEN a goal is achieved THEN the system SHALL display a completion indicator
5. IF an athlete does not set a goal THEN the system SHALL use a default goal of 3 sessions per week

### Requirement 4

**User Story:** As an athlete, I want to earn streaks and achievements, so that I feel rewarded for consistent training.

#### Acceptance Criteria

1. WHEN an athlete logs training on consecutive days THEN the system SHALL increment the streak counter
2. WHEN an athlete misses a day THEN the system SHALL reset the streak counter to zero
3. WHEN viewing the training page THEN the system SHALL display the current streak prominently
4. WHEN an athlete reaches streak milestones (7, 14, 30, 60, 90 days) THEN the system SHALL award an achievement badge
5. WHEN an athlete earns an achievement THEN the system SHALL store the achievement with user_id, achievement_type, and earned_at

### Requirement 5

**User Story:** As a coach, I want to view my athletes' training statistics and progress, so that I can monitor their development and provide guidance.

#### Acceptance Criteria

1. WHEN a coach views an athlete's profile THEN the system SHALL display the athlete's training statistics summary
2. WHEN a coach accesses athlete training data THEN the system SHALL display training logs in read-only mode
3. WHILE viewing athlete statistics THEN the coach SHALL NOT have permission to modify training logs or goals

### Requirement 6

**User Story:** As an admin, I want to manage activity categories, so that I can customize the available options for all users.

#### Acceptance Criteria

1. WHEN an admin accesses category management THEN the system SHALL display all activity categories
2. WHEN an admin adds a new category THEN the system SHALL make it available to all users
3. WHEN an admin deactivates a category THEN the system SHALL hide it from new entries but preserve existing logs
