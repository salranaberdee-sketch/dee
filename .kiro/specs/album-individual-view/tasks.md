# Implementation Plan

## Album Individual View Feature

- [x] 1. Store Functions Setup
  - [x] 1.1 Create albumManagement.js store
    - Create new Pinia store for album management
    - Add state for clubs, athletes, selectedClub, selectedAthlete, searchQuery
    - Add loading and error states
    - _Requirements: 1.1, 3.1_

  - [x] 1.2 Implement formatStorageSize utility function
    - Convert bytes to human-readable format (B, KB, MB, GB)
    - Handle edge cases (0, negative, very large numbers)
    - _Requirements: 6.4_

  - [x] 1.3 Write property test for storage size formatting
    - **Property 11: Storage size formatting is correct**
    - **Validates: Requirements 6.4**

- [x] 2. Coach Functions
  - [x] 2.1 Implement fetchAthletesInMyClub function
    - Fetch athletes with same club_id as coach
    - Include album statistics (album_count, media_count, storage_used)
    - Sort by full_name ascending
    - _Requirements: 1.1, 1.4, 6.1, 6.2, 6.3_

  - [x] 2.2 Write property test for coach club filtering
    - **Property 1: Coach sees only athletes from their club**
    - **Validates: Requirements 1.1**

  - [x] 2.3 Write property test for alphabetical sorting
    - **Property 3: Athlete list is sorted alphabetically by name**
    - **Validates: Requirements 1.4**

  - [x] 2.4 Implement searchAthletes function
    - Filter athletes by name (case-insensitive)
    - Return all athletes when query is empty
    - _Requirements: 2.2, 2.3_

  - [x] 2.5 Write property test for search filter
    - **Property 4: Search filter returns only matching athletes**
    - **Validates: Requirements 2.2, 2.3**

  - [x] 2.6 Implement fetchAthleteAlbums function
    - Fetch albums for specific athlete
    - Reuse existing album fetch logic
    - _Requirements: 1.2_

  - [x] 2.7 Write property test for athlete album filtering
    - **Property 2: Athlete album filtering returns only that athlete's albums**
    - **Validates: Requirements 1.2, 4.1**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Admin Functions
  - [x] 4.1 Implement fetchAllClubsWithStats function
    - Fetch all clubs with album statistics
    - Calculate total_albums, total_media, total_storage per club
    - Sort by total_storage descending
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 4.2 Write property test for club statistics accuracy
    - **Property 5: Admin sees all clubs with accurate statistics**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 4.3 Write property test for club sorting
    - **Property 6: Club list is sorted by storage used descending**
    - **Validates: Requirements 3.4**

  - [x] 4.4 Implement fetchAthletesByClub function
    - Fetch athletes in selected club with statistics
    - Sort by full_name ascending
    - _Requirements: 3.3_

  - [x] 4.5 Write property test for admin club selection
    - **Property 7: Admin club selection returns only athletes from that club**
    - **Validates: Requirements 3.3**

  - [x] 4.6 Implement globalSearch function
    - Search across club names and athlete names
    - Group results by club
    - _Requirements: 5.2, 5.3_

  - [x] 4.7 Write property test for global search
    - **Property 9: Global search returns results from both clubs and athletes**
    - **Validates: Requirements 5.2, 5.3**

- [x] 5. Statistics Functions
  - [x] 5.1 Implement getAthleteStats function
    - Calculate accurate statistics for athlete
    - Return album_count, media_count, storage_used
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.2 Write property test for athlete statistics
    - **Property 10: Athlete statistics are complete and accurate**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 5.3 Write property test for admin/athlete view consistency
    - **Property 8: Admin view shows same albums as athlete view**
    - **Validates: Requirements 4.2**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. UI Components
  - [x] 7.1 Create AlbumManagement.vue page
    - Main page for album management
    - Show different UI based on role (coach vs admin)
    - Include search input
    - _Requirements: 1.1, 2.1, 3.1, 5.1_

  - [x] 7.2 Create ClubAlbumList.vue component
    - Display clubs in card grid
    - Show statistics: album count, media count, storage used
    - Click to select club
    - _Requirements: 3.1, 3.2_

  - [x] 7.3 Create AthleteAlbumList.vue component
    - Display athletes in list/card format
    - Show profile picture, name, statistics
    - Search filter input
    - Empty state message
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.4, 6.1, 6.2, 6.3, 6.4_

  - [x] 7.4 Create AthleteAlbumView.vue component
    - Header with athlete name and profile picture
    - Breadcrumb for admin (Clubs > Club > Athlete)
    - Reuse AlbumSection in read-only mode
    - _Requirements: 1.2, 1.3, 4.2, 4.3, 4.4_

- [x] 8. Routing and Navigation
  - [x] 8.1 Add routes for album management
    - /albums - AlbumManagement page
    - /albums/club/:clubId - Athletes in club (admin)
    - /albums/athlete/:userId - Athlete's albums
    - _Requirements: 4.4_

  - [x] 8.2 Add navigation link in NavBar
    - Add "จัดการอัลบั้ม" link for coach and admin
    - Hide for athlete role
    - _Requirements: 1.1, 3.1_

  - [x] 8.3 Implement breadcrumb navigation
    - Show breadcrumb for admin navigation
    - Clickable links to go back
    - _Requirements: 4.4_

- [x] 9. Integration and Polish
  - [x] 9.1 Connect components to store
    - Wire up all components to albumManagement store
    - Handle loading and error states
    - _Requirements: All_

  - [x] 9.2 Add empty states and error messages
    - No athletes message
    - No albums message
    - No search results message
    - Error retry button
    - _Requirements: 1.5, 2.4_

  - [x] 9.3 Apply design theme
    - Use black/white theme
    - SVG icons (no emoji)
    - Consistent styling
    - _Requirements: All_

- [x] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
