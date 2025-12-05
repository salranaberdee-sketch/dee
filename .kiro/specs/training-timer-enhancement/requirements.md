# Requirements Document: Training Timer Enhancement

## Introduction

ปรับปรุงระบบบันทึกการฝึกซ้อมให้มีระบบจับเวลาจริง (Stopwatch) เพื่อให้ Athlete สามารถบันทึกเวลาการฝึกได้แม่นยำ และลดความซับซ้อนของ UI ให้ใช้งานง่ายขึ้น

## Glossary

- **Training Log System**: ระบบบันทึกการฝึกซ้อม
- **Stopwatch**: เครื่องจับเวลา
- **Timer Modal**: หน้าต่างแสดงเครื่องจับเวลา
- **Session**: รอบการฝึกซ้อมหนึ่งครั้ง
- **Athlete**: นักกีฬา
- **Coach**: โค้ช
- **Admin**: ผู้ดูแลระบบ

## Requirements

### Requirement 1

**User Story:** As an Athlete, I want to start a timer immediately when I begin training, so that I can accurately track my training duration without selecting category first.

#### Acceptance Criteria

1. WHEN an Athlete clicks "เริ่มฝึก" button THEN the Training Log System SHALL immediately start the timer without requiring category selection
2. WHEN the timer starts THEN the Training Log System SHALL display elapsed time in HH:MM:SS format
3. WHEN the timer is running THEN the Training Log System SHALL display a large hero timer with pause/stop controls
4. WHEN an Athlete clicks "หยุดชั่วคราว" THEN the Training Log System SHALL pause the timer and preserve the current elapsed time
5. WHEN an Athlete clicks "ดำเนินการต่อ" on a paused timer THEN the Training Log System SHALL resume counting from the paused time

### Requirement 2

**User Story:** As an Athlete, I want to finish my training session and save the log with category selection, so that the exact duration is automatically recorded.

#### Acceptance Criteria

1. WHEN an Athlete clicks "จบการฝึก" THEN the Training Log System SHALL stop the timer and open the save form with duration pre-filled
2. WHEN the save form opens THEN the Training Log System SHALL show category selection if not already selected during training
3. WHEN an Athlete fills in category and activity details and clicks "บันทึก" THEN the Training Log System SHALL save the training log with all provided information
4. WHEN a training log is saved THEN the Training Log System SHALL close the timer modal and refresh the training logs list
5. WHEN an Athlete clicks "ยกเลิก" during timer or save form THEN the Training Log System SHALL discard the session and close the modal

### Requirement 3

**User Story:** As an Athlete, I want to manually add a training log for past sessions, so that I can record training that I forgot to track with the timer.

#### Acceptance Criteria

1. WHEN an Athlete clicks "บันทึกด้วยตนเอง" THEN the Training Log System SHALL display the manual entry form without timer
2. WHEN using manual entry THEN the Training Log System SHALL allow the Athlete to input date, duration, category, activity, and notes
3. WHEN an Athlete saves a manual entry THEN the Training Log System SHALL validate all required fields before saving
4. WHERE manual entry is used THEN the Training Log System SHALL function identically to timer-based entries after saving

### Requirement 4

**User Story:** As an Athlete, I want to view my training statistics, so that I can track my progress over time.

#### Acceptance Criteria

1. WHEN an Athlete views the training logs page THEN the Training Log System SHALL display a collapsible statistics section (collapsed by default)
2. WHEN an Athlete expands statistics THEN the Training Log System SHALL show total sessions and total hours
3. WHEN an Athlete expands statistics THEN the Training Log System SHALL display a weekly bar chart showing sessions per day
4. WHEN an Athlete expands statistics THEN the Training Log System SHALL show category distribution with percentages
5. WHERE no training data exists THEN the Training Log System SHALL display "ยังไม่มีข้อมูลสถิติ" message

### Requirement 5

**User Story:** As an Athlete, I want to set and track weekly training goals, so that I can stay motivated and consistent.

#### Acceptance Criteria

1. WHEN an Athlete views the training logs page THEN the Training Log System SHALL display a weekly goal section with current progress
2. WHEN an Athlete clicks "ตั้งค่า" in goal section THEN the Training Log System SHALL open a goal settings modal
3. WHEN an Athlete selects target sessions per week (1-7) and saves THEN the Training Log System SHALL update the goal and display progress
4. WHEN an Athlete achieves the weekly goal THEN the Training Log System SHALL display a completion indicator with green color
5. WHERE no goal is set THEN the Training Log System SHALL default to 3 sessions per week

### Requirement 6

**User Story:** As a Coach or Admin, I want to add training logs for athletes, so that I can record training sessions on their behalf.

#### Acceptance Criteria

1. WHEN a Coach or Admin clicks "เริ่มฝึก" THEN the Training Log System SHALL display athlete selection before starting timer
2. WHEN a Coach or Admin selects an athlete THEN the Training Log System SHALL proceed with timer functionality for that athlete
3. WHERE a Coach is logged in THEN the Training Log System SHALL only show athletes from the Coach's club
4. WHERE an Admin is logged in THEN the Training Log System SHALL show all athletes
5. WHEN a Coach or Admin saves a training log THEN the Training Log System SHALL associate the log with the selected athlete

### Requirement 7

**User Story:** As a user, I want to filter training logs by category, so that I can view specific types of training.

#### Acceptance Criteria

1. WHEN a user selects a category filter THEN the Training Log System SHALL display only logs matching that category
2. WHEN a user clears the category filter THEN the Training Log System SHALL display all training logs
3. WHEN a category filter is active THEN the Training Log System SHALL show a clear filter button
4. WHEN statistics are displayed with an active filter THEN the Training Log System SHALL calculate statistics based on filtered logs only

### Requirement 8

**User Story:** As a user, I want to edit or delete existing training logs, so that I can correct mistakes or remove invalid entries.

#### Acceptance Criteria

1. WHEN a user clicks on a training log THEN the Training Log System SHALL open an edit form with pre-filled data
2. WHEN a user modifies log details and saves THEN the Training Log System SHALL update the training log with new information
3. WHEN a user clicks "ลบ" in edit form THEN the Training Log System SHALL prompt for confirmation before deleting
4. WHEN a user confirms deletion THEN the Training Log System SHALL remove the training log and refresh the list
5. WHERE a user is an Athlete THEN the Training Log System SHALL only allow editing their own logs

### Requirement 9

**User Story:** As an Athlete, I want the timer to continue running in the background when I lock my screen or switch apps, so that I don't lose my training session progress.

#### Acceptance Criteria

1. WHEN the timer is running and the user locks the screen THEN the Training Log System SHALL continue counting elapsed time in the background
2. WHEN the timer is running and the user switches to another app or tab THEN the Training Log System SHALL continue counting elapsed time in the background
3. WHEN the user returns to the app with a running timer THEN the Training Log System SHALL display the correct elapsed time based on actual time passed
4. WHEN the timer is running and the browser/app is closed THEN the Training Log System SHALL persist timer state to local storage
5. WHEN the user reopens the app with a persisted timer THEN the Training Log System SHALL restore the timer and continue counting from the saved state

### Requirement 10

**User Story:** As an Athlete, I want the app to prevent my screen from sleeping during active training, so that I can easily view my timer without unlocking my device.

#### Acceptance Criteria

1. WHEN the timer starts running THEN the Training Log System SHALL request screen wake lock to prevent screen from sleeping
2. WHEN the timer is paused or stopped THEN the Training Log System SHALL release the screen wake lock
3. WHERE wake lock is not supported by the browser THEN the Training Log System SHALL continue timer functionality without wake lock
4. WHEN the user navigates away from the timer page THEN the Training Log System SHALL release the screen wake lock
5. WHEN wake lock is active THEN the Training Log System SHALL display a subtle indicator to inform the user
