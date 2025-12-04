# Implementation Plan

- [x] 1. Create date utility functions
  - [x] 1.1 Create `getDateLabel` function that returns relative date labels (วันนี้, พรุ่งนี้, day name, or formatted date)
    - Implement logic to compare schedule date with today
    - Return "วันนี้" for today, "พรุ่งนี้" for tomorrow
    - Return Thai day name for dates within 7 days
    - Return formatted date for dates beyond 7 days
    - _Requirements: 3.3, 3.4, 3.5_
  - [x] 1.2 Create `formatThaiDate` function for Thai locale date formatting
    - Format date as "15 ธ.ค. 2567" (Buddhist era)
    - Handle ISO date string input
    - _Requirements: 3.1_
  - [x] 1.3 Create `formatTime` function for 24-hour time formatting
    - Format time as "HH:MM"
    - Handle various time input formats (HH:MM:SS, HH:MM)
    - _Requirements: 3.2_
  - [x] 1.4 Write property test for relative date label correctness
    - **Property 4: Relative date label correctness**
    - **Validates: Requirements 3.3, 3.4, 3.5**
  - [x] 1.5 Write property test for date and time formatting
    - **Property 5: Date and time formatting**
    - **Validates: Requirements 3.1, 3.2**

- [x] 2. Create schedule filtering function
  - [x] 2.1 Create `getNextUpcomingSchedule` function
    - Filter schedules by user's club_id
    - Include global schedules (club_id = null) for users without club
    - Filter out past schedules and cancelled schedules
    - Sort by date and time ascending
    - Return the nearest upcoming schedule or null
    - _Requirements: 1.1, 2.1, 5.1, 5.2, 5.3_
  - [x] 2.2 Write property test for club-based schedule filtering
    - **Property 1: Club-based schedule filtering returns only matching schedules**
    - **Validates: Requirements 1.1, 2.1, 5.1, 5.2**
  - [x] 2.3 Write property test for nearest schedule selection
    - **Property 2: Nearest schedule selection**
    - **Validates: Requirements 5.3**

- [x] 3. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create UpcomingScheduleBanner component
  - [x] 4.1 Create `UpcomingScheduleBanner.vue` component
    - Accept schedule prop
    - Display calendar SVG icon on the left
    - Show date label, title, time, and location
    - Use dark background (gray-900) with white text
    - Add rounded corners and hover/active states
    - Emit click event for navigation
    - Hide component when schedule is null
    - _Requirements: 1.3, 2.3, 4.1, 4.2, 4.3, 4.4_
  - [x] 4.2 Write property test for banner content completeness
    - **Property 3: Banner content completeness**
    - **Validates: Requirements 1.3, 2.3**

- [x] 5. Integrate banner into Dashboard
  - [x] 5.1 Add computed property for next upcoming schedule in Dashboard
    - Use `getNextUpcomingSchedule` with user's club_id from auth store
    - _Requirements: 1.1, 2.1_
  - [x] 5.2 Add UpcomingScheduleBanner component to Dashboard template
    - Place banner below page header
    - Pass computed schedule to banner
    - Handle click to navigate to /schedules
    - _Requirements: 1.4, 2.4_

- [x] 6. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
