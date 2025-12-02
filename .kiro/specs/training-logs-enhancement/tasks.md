# Implementation Plan

## Training Logs Enhancement Feature

- [x] 1. Database Setup
  - [x] 1.1 Create migration for activity_categories table
    - Create `activity_categories` table with id, name, icon, is_active, sort_order, created_at
    - Insert default categories: วิ่ง, ว่ายน้ำ, ยกน้ำหนัก, ยืดเหยียด, กีฬาเฉพาะทาง, อื่นๆ
    - _Requirements: 1.4_

  - [x] 1.2 Create migration to add category to training_logs
    - Add category_id column referencing activity_categories
    - Add custom_activity column for "อื่นๆ" category
    - _Requirements: 1.1, 1.5_

  - [x] 1.3 Create migration for training_goals table
    - Create table with user_id, goal_type, target_value, start_date, is_active
    - Add unique constraint on user_id + goal_type
    - _Requirements: 3.2_

  - [x] 1.4 Create migration for user_achievements table
    - Create table with user_id, achievement_type, earned_at
    - Add unique constraint on user_id + achievement_type
    - _Requirements: 4.5_

  - [x] 1.5 Create RLS policies for all new tables
    - activity_categories: Everyone read, Admin manage
    - training_goals: Users manage own, Coach view athletes
    - user_achievements: Users view own, Coach view athletes
    - _Requirements: 5.2, 5.3, 6.1_

- [x] 2. Store Functions (data.js)
  - [x] 2.1 Implement activity category functions
    - `fetchActivityCategories()` - fetch active categories
    - `addActivityCategory(data)` - admin only
    - `updateActivityCategory(id, data)` - admin only
    - _Requirements: 1.4, 6.2, 6.3_

  - [x] 2.2 Write property test for category filtering
    - **Property 1: Category filter returns only matching logs**
    - **Validates: Requirements 1.3**

  - [x] 2.3 Implement training statistics functions
    - `getTrainingStats(userId, dateRange)` - calculate totals and averages
    - `getWeeklyComparison(userId)` - compare current vs previous week
    - `getCategoryDistribution(userId)` - breakdown by category
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.4 Write property test for statistics calculation
    - **Property 2: Statistics calculation accuracy**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 2.5 Implement goal management functions
    - `fetchUserGoal(userId)` - get current goal
    - `setUserGoal(userId, goalData)` - create/update goal
    - `getGoalProgress(userId)` - calculate weekly progress
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.6 Write property test for goal progress
    - **Property 3: Goal progress calculation**
    - **Validates: Requirements 3.3, 3.4**

  - [x] 2.7 Implement streak and achievement functions
    - `calculateStreak(userId)` - count consecutive training days
    - `fetchUserAchievements(userId)` - get earned achievements
    - `checkAndAwardAchievements(userId)` - check milestones and award
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.8 Write property test for streak calculation
    - **Property 4: Streak calculation correctness**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 2.9 Write property test for achievement awards
    - **Property 5: Achievement milestone awards**
    - **Validates: Requirements 4.4, 4.5**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. UI Components
  - [x] 4.1 Enhance TrainingLogs.vue with category support
    - Add category dropdown in form
    - Add custom activity input when "อื่นๆ" selected
    - Display category badge on each log entry
    - Add category filter dropdown
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 4.2 Add statistics section to TrainingLogs.vue
    - Display summary stats: total sessions, hours, avg rating
    - Add simple weekly bar chart (CSS-based)
    - Show category distribution breakdown
    - Show week-over-week comparison
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.3 Add goal progress section
    - Display current goal and progress bar
    - Add goal settings modal
    - Show completion indicator when achieved
    - _Requirements: 3.1, 3.3, 3.4, 3.5_

  - [x] 4.4 Add streak and achievements display
    - Show current streak prominently
    - Display earned achievement badges
    - Show next milestone to achieve
    - _Requirements: 4.3, 4.4_

- [x] 5. Coach and Admin Features
  - [x] 5.1 Add athlete statistics view for coaches
    - Display athlete's training stats in read-only mode
    - Show streak and achievements
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 Write property test for coach access control





    - **Property 6: Coach read-only access**
    - **Validates: Requirements 5.2, 5.3**

  - [x] 5.3 Add category management for admin
    - List all categories with active/inactive status
    - Add new category form
    - Toggle category active status
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.4 Write property test for category deactivation










    - **Property 7: Category deactivation preserves existing logs**
    - **Validates: Requirements 6.3**


- [x] 6. Final Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
