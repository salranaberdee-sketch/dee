# Implementation Plan: ระบบประเมินผลนักกีฬา - Scoring Criteria Configuration

## Phase 1: Database Schema for Scoring Criteria

- [x] 1. Create scoring_criteria and scoring_conditions tables



  - [x] 1.1 Create migration for scoring_criteria table


    - Create table with club_id, attendance_weight, training_weight, rating_weight, target_training_sessions
    - Add CHECK constraint for weights_sum_100
    - Add UNIQUE constraint on club_id
    - _Requirements: 7.2, 7.6_
  - [x] 1.2 Write property test for weights sum constraint






    - **Property 1: Weights Sum Constraint**
    - **Validates: Requirements 7.2, 7.6**


  - [x] 1.3 Create migration for scoring_conditions table
    - Create table with name, category, condition_type, threshold_type, comparison_operator, threshold_value, points
    - Add CHECK constraints for valid enum values
    - _Requirements: 7.3, 8.1, 8.2, 8.3, 8.4_
  - [x] 1.4 Create migration for applied_conditions table
    - Create table to track which conditions were applied to each evaluation
    - _Requirements: 8.5, 8.6_
  - [x] 1.5 Create RLS policies for scoring_criteria
    - Admin: SELECT/INSERT/UPDATE/DELETE all
    - Coach: SELECT/INSERT/UPDATE in club
    - Athlete: SELECT in club (read-only)
    - _Requirements: Role Matrix_
  - [x] 1.6 Create RLS policies for scoring_conditions
    - Admin: SELECT/INSERT/UPDATE/DELETE all
    - Coach: SELECT/INSERT/UPDATE/DELETE in club
    - Athlete: SELECT in club (read-only)
    - _Requirements: Role Matrix_
  - [x] 1.7 Run get_advisors to verify security

    - Ensure no security warnings for new tables
    - _Requirements: Security_
-

- [x] 2. Checkpoint - Ensure all migrations applied successfully




  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Score Calculation Logic
-

- [x] 3. Implement score calculation with configurable weights






  - [x] 3.1 Create scoreCalculator.js utility

    - Implement calculateScore function with criteria and conditions
    - Implement evaluateCondition function
    - Implement compare function for operators
    --_Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Write property test for score bounded range





    - **Property 2: Score Bounded Range**
    --**Validates: Requirements 4.4**

  - [x] 3.3 Write property test for tier assignment consistency





    - **Property 3: Tier Assignment Consistency**

    --**Validates: Requirements 4.5, 4.6, 4.7, 4.8**

  - [x] 3.4 Write property test for score components using configured weights











    - **Property 4: Score Components Use Configured Weights**
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 3.5 Write property test for condition points application




    - **Property 5: Condition Points Application**
    - **Validates: Requirements 7.4, 7.5, 8.1, 8.2, 8.3, 8.4**

  - [x] 3.6 Implement default criteria fallback


    - Return default weights (40, 30, 30) when no criteria exists
    --_Requirements: 7.7_

  - [x] 3.7 Write property test for default criteria fallback






    - **Property 6: Default Criteria Fallback**
    - **Validates: Requirements 7.7**
-


- [x] 4. Checkpoint - Ensure score calculation tests pass





  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Scoring Criteria Store

- [x] 5. Create scoringCriteria.js Pinia store
  - [x] 5.1 Implement state and basic structure
    - State: criteria, conditions, loading, error
    - _Requirements: 7.1_
  - [x] 5.2 Implement fetchCriteria action
    - Fetch criteria for club or return defaults
    - _Requirements: 7.1, 7.7_
  - [x] 5.3 Implement saveCriteria action
    - Validate weights sum to 100 before save
    - Upsert criteria for club
    - _Requirements: 7.2, 7.6_
  - [x] 5.4 Implement condition CRUD actions
    - addCondition, updateCondition, deleteCondition, toggleCondition
    - _Requirements: 7.3, 7.8_
  - [x] 5.5 Implement getters

    - activeConditions, bonusConditions, penaltyConditions, totalWeights, isValidWeights
    - _Requirements: 7.4, 7.5_
  - [x] 5.6 Write unit tests for store actions






    - Test CRUD operations
    - Test validation logic
    - _Requirements: 7.1-7.9_

## Phase 4: UI Components
-

- [x] 6. Create ScoringCriteriaSettings.vue




  - [x] 6.1 Create base component structure


    - Layout with weights section and conditions section
    - Use black-white theme
    - _Requirements: 7.1_
  - [x] 6.2 Implement weight configuration UI

    - Sliders or inputs for attendance, training, rating weights
    - Real-time validation showing sum
    - Error message when sum != 100
    - _Requirements: 7.2, 7.6_
  - [x] 6.3 Implement conditions list

    - Display all conditions with name, type, points
    - Toggle active/inactive
    - Edit and delete buttons
    - _Requirements: 7.3, 7.8_

  - [x] 6.4 Implement save functionality
    - Save button with loading state
    - Success/error feedback
    - _Requirements: 7.6, 7.9_
-

- [x] 7. Create ScoringConditionForm.vue





  - [x] 7.1 Create modal form component

    - Form fields for all condition properties
    - _Requirements: 7.3_

  - [x] 7.2 Implement form validation

    - Required fields: name, category, condition_type, threshold_type, comparison_operator, threshold_value, points
    - _Requirements: 7.3_

  - [x] 7.3 Implement create/edit modes

    - Support both adding new and editing existing conditions
    - _Requirements: 7.3, 7.8_
-

- [x] 8. Create ScoreBreakdownCard.vue





  - [x] 8.1 Create component to display score details

    - Show base scores (attendance, training, rating)
    - Show applied conditions with points
    - Show overall score and tier
    - _Requirements: 8.5_

  - [x] 8.2 Integrate into AthletePerformance.vue

    - Replace or enhance existing score display
    - _Requirements: 5.2, 8.5_

- [x] 9. Checkpoint - Ensure UI components render correctly




  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Integration
-

- [x] 10. Update evaluation.js store




  - [x] 10.1 Integrate scoreCalculator with criteria


    - Fetch criteria when calculating scores
    - Apply conditions to score calculation
    - _Requirements: 4.4, 4.9_

  - [x] 10.2 Save applied conditions to database

    - Record which conditions affected each evaluation
    - _Requirements: 8.6_

  - [x] 10.3 Update calculateAthleteStats to use configurable weights

    - Use criteria from scoringCriteria store
    - _Requirements: 4.1, 4.2, 4.3_
- [x] 11. Add routing and navigation



- [ ] 11. Add routing and navigation

  - [x] 11.1 Add route for ScoringCriteriaSettings


    - Path: /evaluation/settings
    - Meta: requiresAuth, roles: ['admin', 'coach']
    - _Requirements: 7.1_
  - [x] 11.2 Add navigation link in EvaluationDashboard


    - Settings icon/button to access criteria settings
    - _Requirements: 7.1_

- [x] 12. Update AthletePerformance.vue

  - [x] 12.1 Display applied conditions
    - Show which bonus/penalty conditions affected score
    - _Requirements: 8.5_

  - [x] 12.2 Show configured weights

    - Display current weight configuration
    - _Requirements: 5.2_

## Phase 6: Final Testing and Verification
-

- [x] 13. Write integration tests





  - [x] 13.1 Test end-to-end scoring flow



    - Create criteria, add conditions, calculate score
    - _Requirements: 4.4, 7.9_

  - [x] 13.2 Test role-based access


    - Verify admin, coach, athlete permissions
    - _Requirements: Role Matrix_

- [x] 14. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Run security verification





  - [x] 15.1 Run get_advisors for all new tables

    - Verify no security warnings
    - _Requirements: Security_

  - [x] 15.2 Test with demo accounts

    - admin@test.com, coach@test.com, athlete@test.com
    - _Requirements: Security_
