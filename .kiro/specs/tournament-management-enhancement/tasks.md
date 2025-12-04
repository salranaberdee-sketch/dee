# Implementation Plan

- [x] 1. Utility Functions and Store Enhancement
  - [x] 1.1 Create tournament utility functions
    - Create lib/tournamentUtils.js with grouping and sorting functions
    - Implement groupAthletesByClub, groupParticipantsByCategory, groupMatchesByRound
    - Implement sortParticipants (by weight_class then name)
    - Implement sortMatchesChronologically
    - Implement filterAthletesByName for search
    - Implement calculateRegistrationStats
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 5.4, 6.1, 6.2, 6.3, 7.1, 7.2_

  - [x] 1.2 Write property tests for utility functions
    - **Property 4: Club grouping correctness**
    - **Property 5: Search filter correctness**
    - **Property 8: Category grouping correctness**
    - **Property 9: Participant sorting correctness**
    - **Property 10: Category count consistency**
    - **Property 13: Match round grouping correctness**
    - **Property 14: Match chronological sorting**
    - **Validates: Requirements 2.1, 2.2, 3.1, 3.2, 3.3, 5.4, 7.1, 7.2**

  - [x] 1.3 Enhance tournament store with bulk actions
    - Add bulkAddParticipants action to stores/data.js
    - Add bulkRemoveParticipants action
    - Add bulkUpdateCategory action
    - Add getRegistrationStats getter
    - _Requirements: 1.3, 4.3, 4.4, 6.1_

  - [x] 1.4 Write property tests for bulk operations
    - **Property 2: Bulk add completeness**
    - **Property 3: Partial failure handling**
    - **Property 11: Bulk remove completeness**
    - **Property 12: Bulk category update consistency**
    - **Validates: Requirements 1.3, 1.5, 4.3, 4.4**

- [x] 2. Checkpoint - Verify utility functions and store
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Bulk Athlete Selector Component
  - [x] 3.1 Create BulkAthleteSelector.vue component
    - Create multi-select interface with checkboxes
    - Display athletes grouped by club using groupAthletesByClub
    - Show athlete name, club name, and registration status
    - Implement search input with real-time filtering
    - Implement select all / deselect all buttons
    - Show selected count badge
    - Mark already registered athletes as disabled
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Write property tests for selection logic
    - **Property 1: Selection count accuracy**
    - **Property 6: Select all correctness**
    - **Property 7: Registered athletes exclusion**
    - **Validates: Requirements 1.2, 2.3, 2.4**

  - [x] 3.3 Create BulkAddModal.vue component
    - Integrate BulkAthleteSelector component
    - Add category and weight_class input fields for batch assignment
    - Show confirmation with selected count
    - Handle bulk add with loading state
    - Display success/failure results
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 4. Grouped Participant List Component
  - [x] 4.1 Create GroupedParticipantList.vue component
    - Display participants grouped by category with collapsible sections
    - Show category headers with participant count
    - Sort participants within each category by weight_class then name
    - Display Uncategorized section for null/empty category
    - Show participant details: name, club, weight_class, status
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 Add bulk selection to participant list
    - Add checkbox column for bulk selection
    - Implement select all within category
    - Show bulk action toolbar when items selected
    - Add bulk remove button with confirmation
    - Add bulk change category button with modal
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Checkpoint - Verify components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Registration Statistics Component
  - [x] 6.1 Create RegistrationStats.vue component
    - Display total registered count
    - Show breakdown by status (pending, approved, rejected, withdrawn)
    - Show breakdown by category
    - Display remaining slots if max_participants is set
    - Use card layout with icons following design-theme
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Write property tests for statistics
    - **Property 15: Statistics count accuracy**
    - **Property 16: Remaining slots calculation**
    - **Validates: Requirements 6.1, 6.2, 6.4**

- [x] 7. Match Timeline Component
  - [x] 7.1 Create MatchTimeline.vue component
    - Display matches grouped by round
    - Show timeline view with chronological order within each round
    - Display match details: athlete, opponent, result, score
    - Use visual indicators for win/lose/draw
    - Support adding new match from timeline
    - _Requirements: 5.4, 7.1, 7.2, 7.4_

- [x] 8. Enhanced Tournament Detail View
  - [x] 8.1 Refactor TournamentDetail.vue with sections
    - Reorganize into clear sections: Info, Participants, Matches, Awards
    - Use tab navigation for sections
    - Add section headers with icons
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 8.2 Integrate new components into TournamentDetail
    - Replace participant list with GroupedParticipantList
    - Add RegistrationStats to Participants section
    - Replace match list with MatchTimeline
    - Update add participant to use BulkAddModal
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 8.3 Update Awards section
    - Group awards by type (gold, silver, bronze, etc.)
    - Display medal icons following design-theme
    - _Requirements: 5.5_

- [x] 9. Checkpoint - Verify enhanced detail view
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Mobile Responsiveness
  - [x] 10.1 Add responsive styles to new components
    - Make BulkAthleteSelector mobile-friendly with full-width layout
    - Make GroupedParticipantList use accordion on mobile
    - Ensure touch-friendly button sizes (min 44px)
    - Use appropriate input types for mobile keyboards
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 10.2 Test and fix mobile layout issues
    - Test on various screen sizes
    - Fix any overflow or layout issues
    - Ensure modals work well on mobile
    - _Requirements: 8.1_

- [x] 11. Integration and Polish
  - [x] 11.1 Update Tournaments.vue to use enhanced detail
    - Ensure detail modal uses new TournamentDetail
    - Test all flows: add tournament, view detail, add participants, record matches
    - _Requirements: All_

  - [x] 11.2 Add loading states and error handling
    - Add loading spinners for bulk operations
    - Display appropriate error messages
    - Handle network errors gracefully
    - _Requirements: 1.4, 1.5_

- [x] 12. Final Checkpoint
  - [x] 12.1 Final verification
    - Ensure all tests pass, ask the user if questions arise.

  - [x] 12.2 Security audit
    - Run get_advisors to check RLS policies
    - Verify role-based access works correctly
    - Test with demo accounts (admin, coach, athlete)
