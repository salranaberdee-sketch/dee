# Implementation Plan

## Phase 1: Database Setup

- [x] 1. Create database migration for tracking tables
  - [x] 1.1 Create tracking_plans table with all columns and indexes
    - Include: id, club_id, name, description, plan_type, start_date, end_date, is_active, created_by, timestamps
    - _Requirements: 1.1, 1.4_
  - [x] 1.2 Create tracking_fields table with field_type enum validation
    - Include: id, plan_id, name, field_type, unit, is_required, options, sort_order
    - Add CHECK constraint for field_type values
    - _Requirements: 1.2, 1.3_
  - [x] 1.3 Create tracking_athlete_goals table with unique constraint
    - Include: id, plan_id, athlete_id, field_id, initial_value, target_value, target_date
    - Add UNIQUE(plan_id, athlete_id, field_id)
    - _Requirements: 3.2, 3.3_
  - [x] 1.4 Create tracking_logs table with upsert support
    - Include: id, plan_id, athlete_id, log_date, values (JSONB), notes, created_by
    - Add UNIQUE(plan_id, athlete_id, log_date)
    - _Requirements: 4.3, 4.5_

- [x] 2. Create RLS policies for all tracking tables
  - [x] 2.1 Create RLS policies for tracking_plans (Admin/Coach/Athlete)
    - Admin: SELECT/INSERT/UPDATE/DELETE all
    - Coach: SELECT/INSERT/UPDATE/DELETE in club
    - Athlete: SELECT plans they're enrolled in
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 2.2 Create RLS policies for tracking_fields
    - Follow same pattern as tracking_plans
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 2.3 Create RLS policies for tracking_athlete_goals
    - Admin: full access
    - Coach: access for athletes in club
    - Athlete: SELECT own goals only
    - _Requirements: 6.3, 6.4_
  - [x] 2.4 Create RLS policies for tracking_logs
    - Admin: full access
    - Coach: SELECT/INSERT/UPDATE for athletes in club
    - Athlete: SELECT/INSERT/UPDATE own logs only
    - _Requirements: 6.3, 6.5_
  - [x] 2.5 Run get_advisors to verify RLS policies
    - _Requirements: 6.1-6.5_

- [x] 3. Checkpoint - Verify database setup
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Pinia Store

- [x] 4. Create tracking store with core functionality
  - [x] 4.1 Create stores/tracking.js with state and basic structure
    - State: plans, currentPlan, athletes, logs, loading, error
    - _Requirements: 1.1, 3.1_
  - [x] 4.2 Implement fetchPlans and fetchPlanDetail actions
    - Include fields and athlete count in queries
    - _Requirements: 1.1, 3.1_
  - [x] 4.3 Implement createPlan action with template support
    - Accept template parameter to pre-fill fields
    - _Requirements: 1.1, 2.1-2.5_
  - [x] 4.4 Implement updatePlan and deletePlan (soft delete) actions
    - deletePlan sets is_active = false
    - _Requirements: 1.5, 1.6_
  - [x]* 4.5 Write property test for plan creation
    - **Property 1: Plan creation stores all required data correctly**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  - [x]* 4.6 Write property test for field type validation
    - **Property 2: Field type validation rejects invalid types**
    - **Validates: Requirements 1.3**

- [x] 5. Implement athlete and goal management in store
  - [x] 5.1 Implement addAthleteToPlan action
    - Create goals for each field
    - _Requirements: 3.2_
  - [x] 5.2 Implement updateAthleteGoals action
    - _Requirements: 3.4_
  - [x] 5.3 Implement removeAthleteFromPlan action (preserve logs)
    - Only remove from goals, keep logs

    - _Requirements: 3.5_
  - [x]* 5.4 Write property test for goal creation
    - **Property 4: Goal creation stores all required data correctly**
    - **Validates: Requirements 3.2, 3.3**

- [x] 6. Implement tracking log functionality in store
  - [x] 6.1 Implement createLog action with upsert behavior
    - Use ON CONFLICT to update existing logs
    - _Requirements: 4.3, 4.5_
  - [x] 6.2 Implement updateLog action with 7-day edit limit
    - Check created_at before allowing edit
    - _Requirements: 4.4_
  - [x] 6.3 Implement input validation based on field type
    - Validate number, time format, etc.

    - _Requirements: 4.2_
  - [x]* 6.4 Write property test for log upsert behavior
    - **Property 5: Log upsert behavior - duplicate dates update instead of insert**
    - **Validates: Requirements 4.5**
  - [x]* 6.5 Write property test for input validation
    - **Property 6: Input validation based on field type**
    - **Validates: Requirements 4.2**

- [x] 7. Implement progress calculation in store
  - [x] 7.1 Implement calculateProgress getter
    - Calculate percentage, status, days_remaining
    - _Requirements: 5.2, 5.3_

  - [x] 7.2 Implement getChartData getter for line charts
    - Format data for chart display
    - _Requirements: 5.1_
  - [x]* 7.3 Write property test for progress percentage calculation
    - **Property 7: Progress percentage calculation is correct**
    - **Validates: Requirements 5.2**
  - [x]* 7.4 Write property test for progress status calculation
    - **Property 8: Progress status calculation is correct**
    - **Validates: Requirements 5.3**

- [x] 8. Checkpoint - Verify store functionality
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Vue Components

- [x] 9. Create TrackingPlansView.vue
  - [x] 9.1 Create basic view structure with header and filters
    - Filter by status (active/inactive), search by name
    - _Requirements: 1.1_
  - [x] 9.2 Create plan cards grid with stats display
    - Show: name, type, date range, athlete count
    - _Requirements: 1.1, 3.1_
  - [x] 9.3 Implement create plan modal with template selection
    - Show template options, allow customization
    - _Requirements: 2.1-2.5_
  - [x] 9.4 Implement edit and delete (deactivate) functionality
    - _Requirements: 1.5, 1.6_

- [x] 10. Create TrackingFieldEditor.vue component
  - [x] 10.1 Create field list with drag-to-reorder
    - _Requirements: 1.2_
  - [x] 10.2 Create add/edit field form with type selection

    - Support all field types: number, time, reps, distance, text, select
    - _Requirements: 1.2, 1.3_
  - [x]* 10.3 Write property test for template application
    - **Property 3: Template application pre-fills correct fields**
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 11. Create TrackingDetailView.vue
  - [x] 11.1 Create plan header with info and actions
    - Show plan details, edit button
    - _Requirements: 1.1, 3.1_
  - [x] 11.2 Create athlete list with goals and current values
    - Show each athlete's progress for each field
    - _Requirements: 3.1, 5.2_
  - [x] 11.3 Implement add athlete modal with goal setting
    - Select athlete, set initial and target values
    - _Requirements: 3.2, 3.3_
  - [x] 11.4 Implement log entry form
    - Date picker, value inputs based on field types
    - _Requirements: 4.1, 4.2_

- [x] 12. Create progress visualization components
  - [x] 12.1 Create ProgressCard.vue component
    - Show current, initial, target, percentage, status
    - _Requirements: 5.2, 5.3_
  - [x] 12.2 Create ProgressChart.vue with line chart
    - Use Chart.js or similar for line chart
    - _Requirements: 5.1_
  - [x] 12.3 Create comparison table for multiple athletes
    - _Requirements: 5.4_

- [x] 13. Create AthleteTrackingView.vue (athlete's own view)
  - [x] 13.1 Create view showing athlete's enrolled plans
    - _Requirements: 6.3_
  - [x] 13.2 Display progress for each plan/field
    - _Requirements: 5.2_

  - [x] 13.3 Allow athlete to log their own values
    - _Requirements: 4.1, 6.3_
  - [x]* 13.4 Write property test for role-based data filtering
    - **Property 9: Role-based data filtering**
    - **Validates: Requirements 6.2, 6.3**

- [x] 14. Checkpoint - Verify UI components
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Routing and Navigation

- [x] 15. Add routes and navigation
  - [x] 15.1 Add routes to router/index.js
    - /tracking - TrackingPlansView (Coach/Admin)
    - /tracking/:id - TrackingDetailView (Coach/Admin)
    - /my-tracking - AthleteTrackingView (Athlete)
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 15.2 Add navigation links to sidebar/menu
    - Show appropriate links based on role
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 15.3 Add route guards for role-based access
    - _Requirements: 6.1, 6.2, 6.3_

## Phase 5: Notifications and Milestones

- [x] 16. Implement milestone notifications
  - [x] 16.1 Create milestone detection logic in store
    - Detect when progress crosses 50% or 100%
    - _Requirements: 7.1, 7.2_
  - [x] 16.2 Create notifications when milestones are reached
    - Use existing notification system
    - _Requirements: 7.1, 7.2_

  - [x] 16.3 Display milestone badges on progress cards
    - Implemented in ProgressCard.vue with 50% and 100% milestone badges
    - _Requirements: 7.4_
  - [x]* 16.4 Write property test for milestone notifications
    - **Property 10: Milestone notification triggers at correct thresholds**
    - **Validates: Requirements 7.1, 7.2**

## Phase 6: Edge Cases and Data Preservation

- [x] 17. Implement data preservation logic
  - [x] 17.1 Verify deactivated plans preserve logs
    - Tested in dataPreservation.test.js
    - _Requirements: 1.6_
  - [x] 17.2 Verify athlete removal preserves logs
    - Implemented in removeAthleteFromPlan (only deletes goals, preserves logs)

    - Tested in dataPreservation.test.js
    - _Requirements: 3.5_
  - [x]* 17.3 Write property test for deactivated plans

    - **Property 11: Deactivated plans preserve logs but hide from active list**
    - **Validates: Requirements 1.6**
  - [x]* 17.4 Write property test for athlete removal
    - Covered in dataPreservation.test.js
    - **Property 12: Athlete removal preserves historical logs**
    - **Validates: Requirements 3.5**

- [x] 18. Final Checkpoint - Complete testing



  - Ensure all tests pass, ask the user if questions arise.
