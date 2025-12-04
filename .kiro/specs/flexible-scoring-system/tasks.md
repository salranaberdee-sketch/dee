# Implementation Plan

- [x] 1. Database Schema Setup - Sport Types and Templates
  - [x] 1.1 Create sport_types and competition_formats tables
    - Create migration for sport_types table with columns: id, name, display_name, description, is_system, created_at
    - Create migration for competition_formats table with foreign key to sport_types
    - Insert default sport types (pencak_silat, futsal, football, sepak_takraw, custom)
    - Insert competition formats for each sport type
    - Enable RLS and create policies for Admin/Coach/Athlete access
    - _Requirements: 1.1, 1.4_

  - [x] 1.2 Create scoring_templates and template_categories tables
    - Create migration for scoring_templates table with foreign key to sport_types
    - Create migration for template_categories table with weight constraint (0-100)
    - Create migration for template_metrics table with measurement_type enum
    - _Requirements: 2.1, 2.2_

  - [x] 1.3 Create club_scoring_configs tables
    - Create migration for club_scoring_configs with foreign keys to clubs, sport_types, scoring_templates
    - Create migration for club_scoring_categories with weight constraint
    - Create migration for club_scoring_metrics with measurement_type and formula
    - Create migration for scoring_config_history for version tracking
    - Enable RLS and create policies following development-workflow rules
    - _Requirements: 2.4, 8.1_

  - [x] 1.4 Insert default scoring templates
    - Create template for pencak_silat with categories: attendance (30%), training (30%), skill (40%)
    - Create template for futsal with categories: attendance (25%), training (25%), skill (25%), competition (25%)
    - Create template for football with same structure as futsal
    - Create template for sepak_takraw with categories: attendance (25%), training (25%), skill (30%), competition (20%)
    - Add sport-specific metrics to each template
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Checkpoint - Verify database setup
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Core Scoring Logic - Store and Validation
  - [x] 3.1 Create scoring configuration store
    - Create stores/scoringConfig.js with state for sport types, templates, and club configs
    - Implement actions: fetchSportTypes, fetchTemplates, fetchClubConfig
    - Implement getters for active config and available templates
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Implement weight validation and redistribution logic
    - Create lib/scoringCalculator.js with validateWeights function
    - Implement redistributeWeights function for adding/removing categories
    - Ensure total always equals 100 percent
    - _Requirements: 2.3, 3.2, 3.3, 7.1_

- [x] 4. Core Scoring Logic - Calculation Engine
  - [x] 4.1 Implement score calculation engine
    - Create calculateCategoryScore function for individual category scoring
    - Create calculateOverallScore function that applies weights
    - Implement score capping at 100 unless bonus enabled
    - Handle missing data with default values
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.2 Implement tier assignment logic
    - Create assignPerformanceTier function based on thresholds
    - Support configurable thresholds per club
    - _Requirements: 6.4_

- [x] 5. Checkpoint - Verify core logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Template Management
  - [x] 6.1 Implement template loading from sport type
    - Add loadTemplateForSportType action to store
    - Ensure common metrics (attendance_rate, training_hours, coach_rating) are always included
    - _Requirements: 1.2, 5.4_

  - [x] 6.2 Implement template cloning for club customization
    - Create cloneTemplateForClub function
    - Ensure original template remains unchanged after modifications
    - _Requirements: 2.4_

- [x] 7. Configuration History and Validation
  - [x] 7.1 Implement configuration versioning
    - Create saveConfigVersion function that snapshots current config
    - Auto-increment version number on each save
    - Store change summary and changed_by
    - _Requirements: 8.1, 8.2_

  - [x] 7.2 Implement configuration restoration
    - Create restoreConfigVersion function
    - Create new version entry when restoring (don't overwrite history)
    - _Requirements: 8.3, 8.4_

  - [x] 7.3 Implement comprehensive config validation
    - Validate weight sum equals 100 percent
    - Validate each category has at least one metric
    - Validate metric thresholds (min less than max)
    - Return specific error messages for each validation failure
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8. Checkpoint - Verify history and validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. UI Components - Configuration
  - [x] 9.1 Create ScoringConfigView.vue
    - Display sport type selector with predefined options
    - Show template preview when sport type selected
    - Allow switching between template and custom mode
    - _Requirements: 1.1, 1.3, 2.2_

  - [x] 9.2 Create CategoryEditor.vue component
    - Display categories grouped by type
    - Allow adding/removing categories with weight redistribution
    - Show weight percentage with visual indicator
    - _Requirements: 3.1, 3.4_

  - [x] 9.3 Create MetricEditor.vue component
    - Allow configuring measurement type, target, min/max values
    - Show example calculation preview
    - Support all measurement types (count, percentage, rating, time, distance)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. UI Components - History and Display
  - [x] 10.1 Create ConfigHistoryView.vue component
    - Display version history with date, user, and summary
    - Allow selecting and previewing previous versions
    - Implement restore with confirmation dialog
    - _Requirements: 8.2, 8.3_

  - [x] 10.2 Create ScoreCalculatorView.vue component
    - Display athlete score breakdown by category
    - Show calculation details for each metric
    - Display performance tier with color coding
    - _Requirements: 6.1, 6.4_

- [x] 11. Integration
  - [x] 11.1 Add routes for scoring configuration
    - Add /scoring-config route for admin/coach
    - Add /scoring-config/history route for version history
    - Configure route guards for role-based access

  - [x] 11.2 Integrate with existing athlete evaluation
    - Update athlete_evaluations to use new scoring config
    - Migrate existing scoring_criteria data to new structure
    - Ensure backward compatibility

  - [x] 11.3 Update NavBar with scoring config link


    - Add menu item for Admin and Coach roles
    - Use SVG icon following design-theme guidelines

- [x] 12. Final Checkpoint


  - [x] 12.1 Final verification


    - Ensure all tests pass, ask the user if questions arise.


  - [x] 12.2 Security audit

    - Run get_advisors to check RLS policies
    - Verify all tables have proper Admin/Coach/Athlete policies
    - Test with demo accounts
