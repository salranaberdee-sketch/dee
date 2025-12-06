# Implementation Plan

- [x] 1. Create Core Hub Components



  - [x] 1.1 Create ScoringHub.vue main component

    - Create new view at src/views/ScoringHub.vue
    - Implement hub layout with status banner, 4 action cards, score source bar, quick stats
    - Use existing scoringConfig store for data
    - Follow design-theme (black/white, SVG icons)
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 1.2 Write property test for fixed card count






    - **Property 1: Fixed Card Count**
    - Test that hub always renders exactly 4 cards regardless of config state
    - **Validates: Requirements 2.1, 8.4**


  - [x] 1.3 Create ActionCard.vue component

    - Create reusable card component with icon (48x48px), title, status indicator
    - Implement badge display for incomplete setup
    - Ensure touch target minimum 48x48px

    - _Requirements: 2.1, 2.2, 2.4_


  - [x] 1.4 Write property test for title length and badge logic










    - **Property 2: Title Length Constraint**
    - **Property 9: Setup Badge Logic**
    - Test title max 4 words, badge shows only for incomplete
    - **Validates: Requirements 1.2, 2.4**


- [x] 2. Implement Status and Score Source Components


  - [x] 2.1 Create StatusBanner.vue component

    - Implement 3 states: active (green), inactive (yellow), none (setup prompt)
    - Single line text only
    - Single action button when applicable
    - _Requirements: 4.1, 4.2, 4.3, 4.4_



  - [x] 2.2 Write property test for status banner correctness




    - **Property 3: Status Banner Correctness**
    - Test banner color and text matches config status
    - **Validates: Requirements 4.1, 4.2**


  - [x] 2.3 Create ScoreSourceBar.vue component

    - Implement horizontal stacked bar with color-coded segments
    - Show category name and percentage for each segment
    - Limit to maximum 5 segments
    - Make segments clickable to navigate to category config
    - _Requirements: 3.1, 3.2, 3.3, 3.4_


  - [x] 2.4 Write property test for score source bar





    - **Property 4: Score Source Bar Segment Limit**
    - **Property 5: Segment Display Completeness**
    - Test max 5 segments and each shows name + percentage
    - **Validates: Requirements 3.2, 3.3**


- [x] 3. Checkpoint - Verify core components




  - Ensure all tests pass, ask the user if questions arise.


- [x] 4. Implement Quick Stats and First-Time Setup





  - [x] 4.1 Create QuickStats.vue component

    - Display 4 stats: total athletes, average score, excellent count, needs improvement count
    - Large numbers (24px+) with small labels
    - Make stats clickable to navigate to filtered evaluation
    - Hide entire section when no data
    - _Requirements: 6.1, 6.3, 6.4_


  - [x] 4.2 Write property test for empty stats hiding







    - **Property 8: Empty Stats Hiding**
    - Test stats section not rendered when athlete count is zero
    - **Validates: Requirements 6.4**


  - [x] 4.3 Create FirstTimeSetup.vue component
    - Implement 2-step setup flow: select sport type → confirm template
    - Show max 5 sport type options as cards
    - Single "ยืนยัน" button on step 2
    - Transition to normal hub view after completion
    - _Requirements: 7.1, 7.2, 7.3, 7.4_


  - [x] 4.4 Write property test for sport type selection limit







    - **Property 10: Sport Type Selection Limit**
    - Test max 5 sport type options displayed
    - **Validates: Requirements 7.2**


- [x] 5. Update Navigation and Routing


  - [x] 5.1 Add hub route and update NavBar

    - Add /scoring-hub route
    - Replace multiple scoring menu items with single "ศูนย์คะแนน" item
    - Update NavBar.vue to show single entry point
    - _Requirements: 5.1_


  - [x] 5.2 Update existing scoring pages with back navigation
    - Add back arrow to ScoringConfigView.vue header
    - Add back arrow to EvaluationDashboard.vue header
    - Add back arrow to ScoreCalculatorView.vue header
    - Ensure all back buttons navigate to /scoring-hub
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 5.3 Write property test for navigation consistency






    - **Property 6: Back Navigation Consistency**
    - **Property 7: Sub-page Back Arrow Presence**
    - Test all sub-pages have back arrow and navigate to hub
    - **Validates: Requirements 5.2, 5.3**

- [x] 6. Checkpoint - Verify navigation





  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integration and Polish


  - [x] 7.1 Integrate hub with existing stores


    - Connect to scoringConfig store for config status
    - Connect to evaluation store for quick stats
    - Implement loading states
    - _Requirements: 1.1, 6.1_



  - [x] 7.2 Implement mobile responsive layout
    - 2x2 grid for action cards on mobile
    - Hide score source bar on mobile (show on expand)
    - Ensure 48px touch targets
    - _Requirements: 8.1, 8.2, 8.3, 8.4_



  - [x] 7.3 Update router guards and redirects
    - Redirect old /evaluation direct access to /scoring-hub
    - Redirect old /scoring-config direct access to /scoring-hub
    - Maintain deep links for specific athlete evaluation
    - _Requirements: 5.1_


- [x] 8. Final Checkpoint

  - [x] 8.1 Final verification
    - All 78 Scoring Hub related tests pass
    - Tests verified: statusBannerCorrectness, scoringHubFixedCardCount, emptyStatsHiding, scoreSourceBar, actionCardTitleBadge, navigationConsistency, sportTypeSelectionLimit

  - [x] 8.2 Security audit
    - Run get_advisors: No RLS issues related to scoring hub
    - Verified role-based access (Admin/Coach can access hub)
    - Database has 5 sport_types and 4 scoring_templates ready for FirstTimeSetup

  - [x] 8.3 Performance optimization (2024-12-06)
    - Added skeleton loading for immediate UI feedback
    - Implemented background stats loading (non-blocking)
    - Added 1-minute cache duration to avoid redundant API calls
    - Added debounced resize handler
    - Separated config loading from stats loading for faster initial render
    - Fixed "ตั้งค่าเลย" button issue - hidden when status='none' because FirstTimeSetup is already displayed

