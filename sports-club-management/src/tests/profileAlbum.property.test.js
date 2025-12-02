/**
 * Profile Album Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Profile Album
 * 
 * Tests for:
 * - Property 1: Album creation requires valid name and stores complete data
 * - Property 2: Albums are sorted by most recently updated
 * - Property 3: File upload validation accepts only allowed types and sizes
 * 
 * **Feature: profile-album**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * Valid album types as defined in the database schema
 */
const VALID_ALBUM_TYPES = ['competition', 'training', 'documents', 'general']

/**
 * Arbitrary for generating valid album types
 */
const albumTypeArbitrary = fc.constantFrom(...VALID_ALBUM_TYPES)

/**
 * Arbitrary for generating valid album names (non-empty, non-whitespace)
 */
const validAlbumNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)

/**
 * Arbitrary for generating invalid album names (empty or whitespace-only)
 */
const invalidAlbumNameArbitrary = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n'),
  fc.constant('  \t  '),
  fc.constant('\n\r\t'),
  fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 })
    .map(chars => chars.join(''))
)

/**
 * Arbitrary for generating valid album data
 * Matches the user_albums table schema
 */
const validAlbumDataArbitrary = fc.record({
  user_id: fc.uuid(),
  name: validAlbumNameArbitrary,
  description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: null }),
  album_type: fc.option(albumTypeArbitrary, { nil: undefined }),
  cover_image_url: fc.option(fc.webUrl(), { nil: null })
})


// ============================================================================
// Pure Functions for Testing (simulating store operations)
// ============================================================================

/**
 * Validate album name - must be non-empty and non-whitespace
 * This mirrors the validation in createAlbum function
 * 
 * @param {string} name - Album name to validate
 * @returns {boolean} - True if valid
 */
function isValidAlbumName(name) {
  return name !== undefined && name !== null && name.trim().length > 0
}

/**
 * Simulate creating an album (mirrors createAlbum in data.js)
 * Returns success/failure based on validation
 * 
 * @param {Object} albumData - Album data to create
 * @returns {{success: boolean, data?: Object, message?: string}}
 */
function simulateCreateAlbum(albumData) {
  // Validate name is not empty or whitespace-only (Requirement 1.5)
  if (!isValidAlbumName(albumData.name)) {
    return { success: false, message: 'กรุณาระบุชื่ออัลบั้ม' }
  }

  // Simulate database INSERT behavior
  // The database adds: id, created_at, updated_at
  const now = new Date().toISOString()
  const createdAlbum = {
    id: crypto.randomUUID(),
    user_id: albumData.user_id,
    name: albumData.name.trim(),
    description: albumData.description?.trim() || null,
    album_type: albumData.album_type || 'general',
    cover_image_url: albumData.cover_image_url || null,
    created_at: now,
    updated_at: now
  }

  return { success: true, data: createdAlbum }
}

/**
 * Verify that created album contains all required fields
 * 
 * @param {Object} album - Created album object
 * @returns {boolean} - True if all required fields are present
 */
function hasCompleteAlbumData(album) {
  return (
    album.id !== undefined &&
    album.user_id !== undefined &&
    album.name !== undefined &&
    album.name.trim().length > 0 &&
    album.album_type !== undefined &&
    album.created_at !== undefined &&
    album.updated_at !== undefined
  )
}

/**
 * Sort albums by updated_at descending (same logic as store)
 * 
 * @param {Array} albums - Array of albums
 * @returns {Array} - Sorted albums
 */
function sortAlbumsByUpdatedAtDescending(albums) {
  return [...albums].sort((a, b) => 
    new Date(b.updated_at) - new Date(a.updated_at)
  )
}

/**
 * Check if albums are sorted by updated_at descending
 * 
 * @param {Array} albums - Array of albums
 * @returns {boolean} - True if sorted correctly
 */
function isSortedByUpdatedAtDescending(albums) {
  if (albums.length <= 1) return true
  
  for (let i = 0; i < albums.length - 1; i++) {
    const currentDate = new Date(albums[i].updated_at)
    const nextDate = new Date(albums[i + 1].updated_at)
    if (currentDate < nextDate) {
      return false
    }
  }
  return true
}


// ============================================================================
// Property Tests
// ============================================================================

describe('Profile Album Property Tests', () => {

  /**
   * **Feature: profile-album, Property 1: Album creation requires valid name and stores complete data**
   * **Validates: Requirements 1.2, 1.3, 1.5**
   * 
   * For any album creation request, if the name is non-empty and non-whitespace,
   * the system should create an album with user_id, name, description, album_type,
   * and created_at timestamp. If the name is empty or whitespace-only, creation
   * should fail with validation error.
   */
  describe('Property 1: Album creation requires valid name and stores complete data', () => {
    
    it('should create album with complete data when name is valid', () => {
      fc.assert(
        fc.property(
          validAlbumDataArbitrary,
          (albumData) => {
            const result = simulateCreateAlbum(albumData)
            
            // Should succeed
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            
            // Should have complete data (Requirement 1.3)
            expect(hasCompleteAlbumData(result.data)).toBe(true)
            
            // Verify all fields are stored correctly
            expect(result.data.user_id).toBe(albumData.user_id)
            expect(result.data.name).toBe(albumData.name.trim())
            expect(result.data.album_type).toBe(albumData.album_type || 'general')
            
            // Description should be trimmed or null
            // If description is provided and has non-whitespace content, it should be trimmed
            // If description is null/undefined or whitespace-only, it should be null
            if (albumData.description && albumData.description.trim().length > 0) {
              expect(result.data.description).toBe(albumData.description.trim())
            } else {
              expect(result.data.description).toBeNull()
            }
            
            // Should have generated id and timestamps
            expect(result.data.id).toBeDefined()
            expect(typeof result.data.id).toBe('string')
            expect(result.data.created_at).toBeDefined()
            expect(result.data.updated_at).toBeDefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject album creation when name is empty', () => {
      fc.assert(
        fc.property(
          fc.record({
            user_id: fc.uuid(),
            name: fc.constant(''),
            description: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            album_type: fc.option(albumTypeArbitrary, { nil: undefined })
          }),
          (albumData) => {
            const result = simulateCreateAlbum(albumData)
            
            // Should fail (Requirement 1.5)
            expect(result.success).toBe(false)
            expect(result.message).toBeDefined()
            expect(result.data).toBeUndefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject album creation when name is whitespace-only', () => {
      fc.assert(
        fc.property(
          fc.record({
            user_id: fc.uuid(),
            name: invalidAlbumNameArbitrary,
            description: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            album_type: fc.option(albumTypeArbitrary, { nil: undefined })
          }),
          (albumData) => {
            const result = simulateCreateAlbum(albumData)
            
            // Should fail (Requirement 1.5)
            expect(result.success).toBe(false)
            expect(result.message).toBeDefined()
            expect(result.data).toBeUndefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should default album_type to general when not provided', () => {
      fc.assert(
        fc.property(
          fc.record({
            user_id: fc.uuid(),
            name: validAlbumNameArbitrary,
            description: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            album_type: fc.constant(undefined)
          }),
          (albumData) => {
            const result = simulateCreateAlbum(albumData)
            
            expect(result.success).toBe(true)
            expect(result.data.album_type).toBe('general')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve album_type when provided', () => {
      fc.assert(
        fc.property(
          fc.record({
            user_id: fc.uuid(),
            name: validAlbumNameArbitrary,
            description: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            album_type: albumTypeArbitrary
          }),
          (albumData) => {
            const result = simulateCreateAlbum(albumData)
            
            expect(result.success).toBe(true)
            expect(result.data.album_type).toBe(albumData.album_type)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should trim name and description on creation', () => {
      fc.assert(
        fc.property(
          fc.record({
            user_id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim().length > 0)
              .map(s => `  ${s}  `), // Add whitespace padding
            // Generate non-empty strings that have content after trimming
            description: fc.string({ minLength: 1, maxLength: 100 })
              .filter(s => s.trim().length > 0)
              .map(s => `  ${s}  `), // Add whitespace padding
            album_type: fc.option(albumTypeArbitrary, { nil: undefined })
          }),
          (albumData) => {
            const result = simulateCreateAlbum(albumData)
            
            expect(result.success).toBe(true)
            // Name should be trimmed
            expect(result.data.name).toBe(albumData.name.trim())
            // Description should be trimmed (non-empty after trim)
            expect(result.data.description).toBe(albumData.description.trim())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: profile-album, Property 2: Albums are sorted by most recently updated**
   * **Validates: Requirements 1.4**
   * 
   * For any list of albums returned for a user, the albums should be sorted
   * in descending order by updated_at timestamp.
   */
  describe('Property 2: Albums are sorted by most recently updated', () => {
    
    /**
     * Generate a valid ISO date string from a timestamp in a reasonable range
     */
    const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00.000Z').getTime()
    const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59.999Z').getTime()
    
    const validISODateArbitrary = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP })
      .map(ts => new Date(ts).toISOString())

    /**
     * Arbitrary for generating an album with a specific timestamp
     */
    const albumWithTimestampArbitrary = fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      name: validAlbumNameArbitrary,
      description: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
      album_type: albumTypeArbitrary,
      cover_image_url: fc.option(fc.webUrl(), { nil: null }),
      created_at: validISODateArbitrary,
      updated_at: validISODateArbitrary
    })

    /**
     * Arbitrary for generating an array of albums with various timestamps
     */
    const albumArrayArbitrary = fc.array(albumWithTimestampArbitrary, { minLength: 0, maxLength: 50 })

    it('should sort albums by updated_at in descending order', () => {
      fc.assert(
        fc.property(
          albumArrayArbitrary,
          (albums) => {
            // Apply the sorting function (same as store's fetchUserAlbums behavior)
            const sorted = sortAlbumsByUpdatedAtDescending(albums)
            
            // Verify the result is sorted correctly
            expect(isSortedByUpdatedAtDescending(sorted)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have each album updated_at >= next album updated_at', () => {
      fc.assert(
        fc.property(
          albumArrayArbitrary,
          (albums) => {
            const sorted = sortAlbumsByUpdatedAtDescending(albums)
            
            // For each consecutive pair, verify ordering
            for (let i = 0; i < sorted.length - 1; i++) {
              const currentDate = new Date(sorted[i].updated_at)
              const nextDate = new Date(sorted[i + 1].updated_at)
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all albums after sorting (no data loss)', () => {
      fc.assert(
        fc.property(
          albumArrayArbitrary,
          (albums) => {
            const sorted = sortAlbumsByUpdatedAtDescending(albums)
            
            // Same length
            expect(sorted.length).toBe(albums.length)
            
            // All original IDs should be present
            const originalIds = new Set(albums.map(a => a.id))
            const sortedIds = new Set(sorted.map(a => a.id))
            expect(sortedIds.size).toBe(originalIds.size)
            
            for (const id of originalIds) {
              expect(sortedIds.has(id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty album list', () => {
      const emptyList = []
      const sorted = sortAlbumsByUpdatedAtDescending(emptyList)
      
      expect(sorted).toEqual([])
      expect(isSortedByUpdatedAtDescending(sorted)).toBe(true)
    })

    it('should handle single album', () => {
      fc.assert(
        fc.property(
          albumWithTimestampArbitrary,
          (album) => {
            const sorted = sortAlbumsByUpdatedAtDescending([album])
            
            expect(sorted.length).toBe(1)
            expect(sorted[0].id).toBe(album.id)
            expect(isSortedByUpdatedAtDescending(sorted)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly sort albums with same timestamp', () => {
      // Generate albums with potentially same timestamps
      const sameTimestampArbitrary = fc.array(
        fc.record({
          id: fc.uuid(),
          user_id: fc.uuid(),
          name: validAlbumNameArbitrary,
          description: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
          album_type: albumTypeArbitrary,
          cover_image_url: fc.constant(null),
          created_at: fc.constant('2024-01-01T10:00:00.000Z'),
          // Use a small set of timestamps to increase chance of duplicates
          updated_at: fc.constantFrom(
            '2024-01-01T10:00:00.000Z',
            '2024-01-01T11:00:00.000Z',
            '2024-01-01T12:00:00.000Z'
          )
        }),
        { minLength: 2, maxLength: 20 }
      )

      fc.assert(
        fc.property(
          sameTimestampArbitrary,
          (albums) => {
            const sorted = sortAlbumsByUpdatedAtDescending(albums)
            
            // Should still be sorted (equal timestamps are allowed)
            expect(isSortedByUpdatedAtDescending(sorted)).toBe(true)
            
            // All albums should be preserved
            expect(sorted.length).toBe(albums.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve album data integrity through sorting', () => {
      fc.assert(
        fc.property(
          albumArrayArbitrary,
          (albums) => {
            const sorted = sortAlbumsByUpdatedAtDescending(albums)
            
            // Each album in sorted should have all its original data
            for (const sortedAlbum of sorted) {
              const original = albums.find(a => a.id === sortedAlbum.id)
              expect(original).toBeDefined()
              
              // All fields should match
              expect(sortedAlbum.user_id).toBe(original.user_id)
              expect(sortedAlbum.name).toBe(original.name)
              expect(sortedAlbum.description).toBe(original.description)
              expect(sortedAlbum.album_type).toBe(original.album_type)
              expect(sortedAlbum.cover_image_url).toBe(original.cover_image_url)
              expect(sortedAlbum.created_at).toBe(original.created_at)
              expect(sortedAlbum.updated_at).toBe(original.updated_at)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should place most recently updated album first', () => {
      fc.assert(
        fc.property(
          fc.array(albumWithTimestampArbitrary, { minLength: 2, maxLength: 20 }),
          (albums) => {
            const sorted = sortAlbumsByUpdatedAtDescending(albums)
            
            // Find the album with the latest updated_at
            const latestUpdatedAt = Math.max(...albums.map(a => new Date(a.updated_at).getTime()))
            const firstAlbumUpdatedAt = new Date(sorted[0].updated_at).getTime()
            
            // First album should have the latest (or equal to latest) updated_at
            expect(firstAlbumUpdatedAt).toBe(latestUpdatedAt)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: profile-album, Property 3: File upload validation accepts only allowed types and sizes**
   * **Validates: Requirements 2.2, 2.3**
   * 
   * For any file upload attempt, the system should accept files with MIME types
   * (image/jpeg, image/png, image/webp, application/pdf) and size <= 10MB.
   * Files with other types or larger sizes should be rejected with appropriate error.
   */
  describe('Property 3: File upload validation accepts only allowed types and sizes', () => {
    
    // Constants matching the store implementation
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

    /**
     * Validate file type and size (mirrors validateFile in data.js)
     * @param {Object} file - File-like object with type and size
     * @returns {{valid: boolean, error?: string}}
     */
    function validateFile(file) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return { valid: false, error: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF' }
      }
      if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'ไฟล์ต้องไม่เกิน 10MB' }
      }
      return { valid: true }
    }

    /**
     * Arbitrary for generating allowed MIME types
     */
    const allowedMimeTypeArbitrary = fc.constantFrom(...ALLOWED_MIME_TYPES)

    /**
     * Arbitrary for generating invalid MIME types
     */
    const invalidMimeTypeArbitrary = fc.oneof(
      fc.constant('image/gif'),
      fc.constant('image/bmp'),
      fc.constant('image/tiff'),
      fc.constant('image/svg+xml'),
      fc.constant('video/mp4'),
      fc.constant('video/webm'),
      fc.constant('audio/mp3'),
      fc.constant('audio/wav'),
      fc.constant('application/zip'),
      fc.constant('application/json'),
      fc.constant('application/xml'),
      fc.constant('text/plain'),
      fc.constant('text/html'),
      fc.constant('application/msword'),
      fc.constant('application/vnd.ms-excel'),
      // Random MIME types
      fc.string({ minLength: 3, maxLength: 50 })
        .filter(s => !ALLOWED_MIME_TYPES.includes(s) && s.includes('/'))
    )

    /**
     * Arbitrary for generating valid file sizes (0 to 10MB)
     */
    const validFileSizeArbitrary = fc.integer({ min: 0, max: MAX_FILE_SIZE })

    /**
     * Arbitrary for generating invalid file sizes (> 10MB)
     */
    const invalidFileSizeArbitrary = fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 10 })

    /**
     * Arbitrary for generating a valid file (allowed type and valid size)
     */
    const validFileArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }).map(s => s + '.jpg'),
      type: allowedMimeTypeArbitrary,
      size: validFileSizeArbitrary
    })

    /**
     * Arbitrary for generating a file with invalid type
     */
    const invalidTypeFileArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      type: invalidMimeTypeArbitrary,
      size: validFileSizeArbitrary
    })

    /**
     * Arbitrary for generating a file with invalid size (too large)
     */
    const invalidSizeFileArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      type: allowedMimeTypeArbitrary,
      size: invalidFileSizeArbitrary
    })

    it('should accept files with allowed MIME types and valid size', () => {
      fc.assert(
        fc.property(
          validFileArbitrary,
          (file) => {
            const result = validateFile(file)
            
            // Should be valid
            expect(result.valid).toBe(true)
            expect(result.error).toBeUndefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject files with invalid MIME types', () => {
      fc.assert(
        fc.property(
          invalidTypeFileArbitrary,
          (file) => {
            const result = validateFile(file)
            
            // Should be invalid
            expect(result.valid).toBe(false)
            expect(result.error).toBe('รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject files larger than 10MB', () => {
      fc.assert(
        fc.property(
          invalidSizeFileArbitrary,
          (file) => {
            const result = validateFile(file)
            
            // Should be invalid
            expect(result.valid).toBe(false)
            expect(result.error).toBe('ไฟล์ต้องไม่เกิน 10MB')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept each allowed MIME type individually', () => {
      // Test each allowed type explicitly
      for (const mimeType of ALLOWED_MIME_TYPES) {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: MAX_FILE_SIZE }),
            (size) => {
              const file = { name: 'test.file', type: mimeType, size }
              const result = validateFile(file)
              
              expect(result.valid).toBe(true)
              expect(result.error).toBeUndefined()
              
              return true
            }
          ),
          { numRuns: 25 } // 25 runs per type = 100 total
        )
      }
    })

    it('should accept files at exactly 10MB boundary', () => {
      fc.assert(
        fc.property(
          allowedMimeTypeArbitrary,
          (mimeType) => {
            const file = { name: 'boundary.file', type: mimeType, size: MAX_FILE_SIZE }
            const result = validateFile(file)
            
            // Exactly 10MB should be valid
            expect(result.valid).toBe(true)
            expect(result.error).toBeUndefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject files at exactly 10MB + 1 byte', () => {
      fc.assert(
        fc.property(
          allowedMimeTypeArbitrary,
          (mimeType) => {
            const file = { name: 'over-boundary.file', type: mimeType, size: MAX_FILE_SIZE + 1 }
            const result = validateFile(file)
            
            // 10MB + 1 byte should be invalid
            expect(result.valid).toBe(false)
            expect(result.error).toBe('ไฟล์ต้องไม่เกิน 10MB')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept zero-byte files with valid type', () => {
      fc.assert(
        fc.property(
          allowedMimeTypeArbitrary,
          (mimeType) => {
            const file = { name: 'empty.file', type: mimeType, size: 0 }
            const result = validateFile(file)
            
            // Zero-byte files should be valid (type is correct)
            expect(result.valid).toBe(true)
            expect(result.error).toBeUndefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should prioritize type validation over size validation', () => {
      // When both type and size are invalid, type error should be returned first
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            type: invalidMimeTypeArbitrary,
            size: invalidFileSizeArbitrary
          }),
          (file) => {
            const result = validateFile(file)
            
            // Should be invalid with type error (checked first)
            expect(result.valid).toBe(false)
            expect(result.error).toBe('รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle various valid file sizes within limit', () => {
      // Test various sizes from small to max
      const sizesArbitrary = fc.oneof(
        fc.constant(1),                           // 1 byte
        fc.constant(1024),                        // 1 KB
        fc.constant(1024 * 1024),                 // 1 MB
        fc.constant(5 * 1024 * 1024),             // 5 MB
        fc.constant(MAX_FILE_SIZE - 1),           // Just under limit
        fc.constant(MAX_FILE_SIZE),               // Exactly at limit
        fc.integer({ min: 1, max: MAX_FILE_SIZE }) // Random valid size
      )

      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            type: allowedMimeTypeArbitrary,
            size: sizesArbitrary
          }),
          (file) => {
            const result = validateFile(file)
            
            expect(result.valid).toBe(true)
            expect(result.error).toBeUndefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify image/jpeg as valid', () => {
      fc.assert(
        fc.property(
          validFileSizeArbitrary,
          (size) => {
            const file = { name: 'photo.jpg', type: 'image/jpeg', size }
            const result = validateFile(file)
            
            expect(result.valid).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify image/png as valid', () => {
      fc.assert(
        fc.property(
          validFileSizeArbitrary,
          (size) => {
            const file = { name: 'image.png', type: 'image/png', size }
            const result = validateFile(file)
            
            expect(result.valid).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify image/webp as valid', () => {
      fc.assert(
        fc.property(
          validFileSizeArbitrary,
          (size) => {
            const file = { name: 'image.webp', type: 'image/webp', size }
            const result = validateFile(file)
            
            expect(result.valid).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify application/pdf as valid', () => {
      fc.assert(
        fc.property(
          validFileSizeArbitrary,
          (size) => {
            const file = { name: 'document.pdf', type: 'application/pdf', size }
            const result = validateFile(file)
            
            expect(result.valid).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject common invalid image formats', () => {
      const invalidImageTypes = ['image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml']
      
      for (const invalidType of invalidImageTypes) {
        fc.assert(
          fc.property(
            validFileSizeArbitrary,
            (size) => {
              const file = { name: 'invalid.file', type: invalidType, size }
              const result = validateFile(file)
              
              expect(result.valid).toBe(false)
              expect(result.error).toBe('รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF')
              
              return true
            }
          ),
          { numRuns: 25 }
        )
      }
    })

    it('should reject video and audio formats', () => {
      const mediaTypes = ['video/mp4', 'video/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg']
      
      for (const mediaType of mediaTypes) {
        fc.assert(
          fc.property(
            validFileSizeArbitrary,
            (size) => {
              const file = { name: 'media.file', type: mediaType, size }
              const result = validateFile(file)
              
              expect(result.valid).toBe(false)
              expect(result.error).toBe('รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF')
              
              return true
            }
          ),
          { numRuns: 20 }
        )
      }
    })
  })
})


// ============================================================================
// Property Tests for Upload and Deletion (Task 2.5)
// ============================================================================

describe('Profile Album Upload and Deletion Property Tests', () => {

  // ============================================================================
  // Test Helpers for Upload and Deletion
  // ============================================================================

  /**
   * Generate a valid storage path for uploaded media
   * Pattern: {user_id}/{album_id}/{filename}
   * 
   * @param {string} userId - User ID
   * @param {string} albumId - Album ID
   * @param {string} fileName - Original file name
   * @returns {string} Storage path
   */
  function generateStoragePath(userId, albumId, fileName) {
    const fileExt = fileName.split('.').pop() || 'jpg'
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    return `${userId}/${albumId}/${uniqueName}`
  }

  /**
   * Validate storage path format
   * @param {string} path - Storage path to validate
   * @param {string} userId - Expected user ID
   * @param {string} albumId - Expected album ID
   * @returns {boolean} True if path format is valid
   */
  function isValidStoragePath(path, userId, albumId) {
    const pattern = new RegExp(`^${userId}/${albumId}/[a-z0-9-]+\\.[a-z0-9]+$`, 'i')
    return pattern.test(path)
  }

  /**
   * Extract storage path from a public URL
   * @param {string} url - Public URL
   * @returns {string|null} Storage path or null
   */
  function extractStoragePathFromUrl(url) {
    try {
      const urlObj = new URL(url)
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/profile-albums\/(.+)/)
      return pathMatch ? pathMatch[1] : null
    } catch {
      return null
    }
  }

  /**
   * Simulate creating a media record (mirrors uploadMedia in data.js)
   * @param {Object} params - Upload parameters
   * @returns {{success: boolean, data?: Object, storagePath?: string, message?: string}}
   */
  function simulateUploadMedia({ albumId, userId, file }) {
    // Validate file type
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    const MAX_FILE_SIZE = 10 * 1024 * 1024

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, message: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF' }
    }
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, message: 'ไฟล์ต้องไม่เกิน 10MB' }
    }

    // Generate storage path
    const storagePath = generateStoragePath(userId, albumId, file.name)
    
    // Generate public URL (simulated)
    const publicUrl = `https://example.supabase.co/storage/v1/object/public/profile-albums/${storagePath}`

    // Create media record
    const mediaRecord = {
      id: crypto.randomUUID(),
      album_id: albumId,
      user_id: userId,
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      thumbnail_url: file.type.startsWith('image/') ? publicUrl : null,
      uploaded_at: new Date().toISOString()
    }

    return { success: true, data: mediaRecord, storagePath }
  }

  /**
   * Simulate deleting a media item (mirrors deleteMedia in data.js)
   * @param {Object} media - Media record to delete
   * @param {Object} state - Current state { storageFiles: Set, dbRecords: Map }
   * @returns {{success: boolean, deletedFromStorage: boolean, deletedFromDb: boolean}}
   */
  function simulateDeleteMedia(media, state) {
    const storagePath = extractStoragePathFromUrl(media.file_url)
    
    // Delete from storage
    let deletedFromStorage = false
    if (storagePath && state.storageFiles.has(storagePath)) {
      state.storageFiles.delete(storagePath)
      deletedFromStorage = true
    }

    // Delete from database
    let deletedFromDb = false
    if (state.dbRecords.has(media.id)) {
      state.dbRecords.delete(media.id)
      deletedFromDb = true
    }

    return { success: true, deletedFromStorage, deletedFromDb }
  }

  /**
   * Simulate deleting an album with cascade (mirrors deleteAlbum in data.js)
   * @param {string} albumId - Album ID to delete
   * @param {Object} state - Current state { albums: Map, mediaByAlbum: Map, storageFiles: Set, dbRecords: Map }
   * @returns {{success: boolean, deletedMediaCount: number, deletedStorageCount: number}}
   */
  function simulateDeleteAlbumWithCascade(albumId, state) {
    // Get all media items for this album
    const albumMedia = state.mediaByAlbum.get(albumId) || []
    
    let deletedStorageCount = 0
    let deletedMediaCount = 0

    // Delete each media item
    for (const media of albumMedia) {
      const storagePath = extractStoragePathFromUrl(media.file_url)
      
      // Delete from storage
      if (storagePath && state.storageFiles.has(storagePath)) {
        state.storageFiles.delete(storagePath)
        deletedStorageCount++
      }

      // Delete from database
      if (state.dbRecords.has(media.id)) {
        state.dbRecords.delete(media.id)
        deletedMediaCount++
      }
    }

    // Delete album
    state.albums.delete(albumId)
    state.mediaByAlbum.delete(albumId)

    return { success: true, deletedMediaCount, deletedStorageCount }
  }

  // ============================================================================
  // Arbitraries for Upload and Deletion Tests
  // ============================================================================

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  /**
   * Arbitrary for generating valid file data
   */
  const validFileArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0 && !s.includes('/') && !s.includes('\\'))
      .map(s => s.trim() + '.jpg'),
    type: fc.constantFrom(...ALLOWED_MIME_TYPES),
    size: fc.integer({ min: 1, max: MAX_FILE_SIZE })
  })

  /**
   * Arbitrary for generating upload context
   */
  const uploadContextArbitrary = fc.record({
    userId: fc.uuid(),
    albumId: fc.uuid(),
    file: validFileArbitrary
  })

  /**
   * Arbitrary for generating multiple media items for an album
   */
  const albumWithMediaArbitrary = fc.record({
    albumId: fc.uuid(),
    userId: fc.uuid(),
    mediaCount: fc.integer({ min: 1, max: 10 })
  }).chain(({ albumId, userId, mediaCount }) => 
    fc.array(validFileArbitrary, { minLength: mediaCount, maxLength: mediaCount })
      .map(files => ({
        albumId,
        userId,
        files
      }))
  )

  // ============================================================================
  // Property 4: Uploaded media creates correct storage path and database record
  // ============================================================================

  /**
   * **Feature: profile-album, Property 4: Uploaded media creates correct storage path and database record**
   * **Validates: Requirements 2.4, 2.5**
   * 
   * For any successfully uploaded file, the storage path should follow pattern
   * `{user_id}/{album_id}/{filename}` and a media record should exist with
   * album_id, file_url, file_name, file_type, file_size, and uploaded_at.
   */
  describe('Property 4: Uploaded media creates correct storage path and database record', () => {

    it('should create storage path following pattern {user_id}/{album_id}/{filename}', () => {
      fc.assert(
        fc.property(
          uploadContextArbitrary,
          ({ userId, albumId, file }) => {
            const result = simulateUploadMedia({ albumId, userId, file })
            
            // Should succeed for valid files
            expect(result.success).toBe(true)
            expect(result.storagePath).toBeDefined()
            
            // Storage path should follow the pattern
            expect(isValidStoragePath(result.storagePath, userId, albumId)).toBe(true)
            
            // Path should start with userId/albumId/
            expect(result.storagePath.startsWith(`${userId}/${albumId}/`)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create media record with all required fields', () => {
      fc.assert(
        fc.property(
          uploadContextArbitrary,
          ({ userId, albumId, file }) => {
            const result = simulateUploadMedia({ albumId, userId, file })
            
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            
            // Verify all required fields exist (Requirement 2.5)
            const media = result.data
            expect(media.id).toBeDefined()
            expect(typeof media.id).toBe('string')
            expect(media.album_id).toBe(albumId)
            expect(media.user_id).toBe(userId)
            expect(media.file_url).toBeDefined()
            expect(typeof media.file_url).toBe('string')
            expect(media.file_name).toBe(file.name)
            expect(media.file_type).toBe(file.type)
            expect(media.file_size).toBe(file.size)
            expect(media.uploaded_at).toBeDefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set thumbnail_url for image files only', () => {
      fc.assert(
        fc.property(
          uploadContextArbitrary,
          ({ userId, albumId, file }) => {
            const result = simulateUploadMedia({ albumId, userId, file })
            
            expect(result.success).toBe(true)
            
            if (file.type.startsWith('image/')) {
              // Images should have thumbnail_url
              expect(result.data.thumbnail_url).toBe(result.data.file_url)
            } else {
              // Non-images (PDF) should have null thumbnail
              expect(result.data.thumbnail_url).toBeNull()
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate unique storage paths for multiple uploads', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.uuid(),
            albumId: fc.uuid()
          }),
          fc.array(validFileArbitrary, { minLength: 2, maxLength: 10 }),
          ({ userId, albumId }, files) => {
            const storagePaths = new Set()
            
            for (const file of files) {
              const result = simulateUploadMedia({ albumId, userId, file })
              expect(result.success).toBe(true)
              
              // Each path should be unique
              expect(storagePaths.has(result.storagePath)).toBe(false)
              storagePaths.add(result.storagePath)
            }
            
            // All paths should be unique
            expect(storagePaths.size).toBe(files.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include file_url that contains the storage path', () => {
      fc.assert(
        fc.property(
          uploadContextArbitrary,
          ({ userId, albumId, file }) => {
            const result = simulateUploadMedia({ albumId, userId, file })
            
            expect(result.success).toBe(true)
            
            // file_url should contain the storage path
            const extractedPath = extractStoragePathFromUrl(result.data.file_url)
            expect(extractedPath).toBe(result.storagePath)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve original file name in record', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.uuid(),
            albumId: fc.uuid(),
            file: fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 })
                .filter(s => s.trim().length > 0 && !s.includes('/') && !s.includes('\\'))
                .map(s => `${s.trim()}.pdf`),
              type: fc.constant('application/pdf'),
              size: fc.integer({ min: 1, max: MAX_FILE_SIZE })
            })
          }),
          ({ userId, albumId, file }) => {
            const result = simulateUploadMedia({ albumId, userId, file })
            
            expect(result.success).toBe(true)
            // Original file name should be preserved
            expect(result.data.file_name).toBe(file.name)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ============================================================================
  // Property 5: Media deletion removes both storage file and database record
  // ============================================================================

  /**
   * **Feature: profile-album, Property 5: Media deletion removes both storage file and database record**
   * **Validates: Requirements 3.3**
   * 
   * For any media item deletion, after the operation completes, the file should
   * not exist in storage and no database record should exist for that media_id.
   */
  describe('Property 5: Media deletion removes both storage file and database record', () => {

    it('should remove file from storage when media is deleted', () => {
      fc.assert(
        fc.property(
          uploadContextArbitrary,
          ({ userId, albumId, file }) => {
            // First, simulate upload
            const uploadResult = simulateUploadMedia({ albumId, userId, file })
            expect(uploadResult.success).toBe(true)
            
            // Set up state with the uploaded file
            const state = {
              storageFiles: new Set([uploadResult.storagePath]),
              dbRecords: new Map([[uploadResult.data.id, uploadResult.data]])
            }
            
            // Verify file exists before deletion
            expect(state.storageFiles.has(uploadResult.storagePath)).toBe(true)
            
            // Delete the media
            const deleteResult = simulateDeleteMedia(uploadResult.data, state)
            
            // Verify deletion was successful
            expect(deleteResult.success).toBe(true)
            expect(deleteResult.deletedFromStorage).toBe(true)
            
            // File should no longer exist in storage
            expect(state.storageFiles.has(uploadResult.storagePath)).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove database record when media is deleted', () => {
      fc.assert(
        fc.property(
          uploadContextArbitrary,
          ({ userId, albumId, file }) => {
            // First, simulate upload
            const uploadResult = simulateUploadMedia({ albumId, userId, file })
            expect(uploadResult.success).toBe(true)
            
            // Set up state
            const state = {
              storageFiles: new Set([uploadResult.storagePath]),
              dbRecords: new Map([[uploadResult.data.id, uploadResult.data]])
            }
            
            // Verify record exists before deletion
            expect(state.dbRecords.has(uploadResult.data.id)).toBe(true)
            
            // Delete the media
            const deleteResult = simulateDeleteMedia(uploadResult.data, state)
            
            // Verify deletion was successful
            expect(deleteResult.success).toBe(true)
            expect(deleteResult.deletedFromDb).toBe(true)
            
            // Record should no longer exist in database
            expect(state.dbRecords.has(uploadResult.data.id)).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove both storage and database in single operation', () => {
      fc.assert(
        fc.property(
          uploadContextArbitrary,
          ({ userId, albumId, file }) => {
            // Simulate upload
            const uploadResult = simulateUploadMedia({ albumId, userId, file })
            expect(uploadResult.success).toBe(true)
            
            // Set up state
            const state = {
              storageFiles: new Set([uploadResult.storagePath]),
              dbRecords: new Map([[uploadResult.data.id, uploadResult.data]])
            }
            
            // Delete the media
            const deleteResult = simulateDeleteMedia(uploadResult.data, state)
            
            // Both should be deleted
            expect(deleteResult.deletedFromStorage).toBe(true)
            expect(deleteResult.deletedFromDb).toBe(true)
            
            // Verify both are gone
            expect(state.storageFiles.size).toBe(0)
            expect(state.dbRecords.size).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should only delete the specified media item, not others', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.uuid(),
            albumId: fc.uuid()
          }),
          fc.array(validFileArbitrary, { minLength: 2, maxLength: 5 }),
          ({ userId, albumId }, files) => {
            // Upload multiple files
            const uploadResults = files.map(file => 
              simulateUploadMedia({ albumId, userId, file })
            )
            
            // All uploads should succeed
            uploadResults.forEach(r => expect(r.success).toBe(true))
            
            // Set up state with all files
            const state = {
              storageFiles: new Set(uploadResults.map(r => r.storagePath)),
              dbRecords: new Map(uploadResults.map(r => [r.data.id, r.data]))
            }
            
            const initialStorageCount = state.storageFiles.size
            const initialDbCount = state.dbRecords.size
            
            // Delete only the first media item
            const mediaToDelete = uploadResults[0].data
            simulateDeleteMedia(mediaToDelete, state)
            
            // Only one item should be deleted
            expect(state.storageFiles.size).toBe(initialStorageCount - 1)
            expect(state.dbRecords.size).toBe(initialDbCount - 1)
            
            // The deleted item should be gone
            expect(state.storageFiles.has(uploadResults[0].storagePath)).toBe(false)
            expect(state.dbRecords.has(uploadResults[0].data.id)).toBe(false)
            
            // Other items should still exist
            for (let i = 1; i < uploadResults.length; i++) {
              expect(state.storageFiles.has(uploadResults[i].storagePath)).toBe(true)
              expect(state.dbRecords.has(uploadResults[i].data.id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ============================================================================
  // Property 6: Album deletion cascades to all associated media
  // ============================================================================

  /**
   * **Feature: profile-album, Property 6: Album deletion cascades to all associated media**
   * **Validates: Requirements 3.4**
   * 
   * For any album deletion, after the operation completes, all media items that
   * belonged to that album should also be deleted from both storage and database.
   */
  describe('Property 6: Album deletion cascades to all associated media', () => {

    it('should delete all media items when album is deleted', () => {
      fc.assert(
        fc.property(
          albumWithMediaArbitrary,
          ({ albumId, userId, files }) => {
            // Upload all files to the album
            const uploadResults = files.map(file => 
              simulateUploadMedia({ albumId, userId, file })
            )
            
            // All uploads should succeed
            uploadResults.forEach(r => expect(r.success).toBe(true))
            
            // Set up state
            const state = {
              albums: new Map([[albumId, { id: albumId, user_id: userId }]]),
              mediaByAlbum: new Map([[albumId, uploadResults.map(r => r.data)]]),
              storageFiles: new Set(uploadResults.map(r => r.storagePath)),
              dbRecords: new Map(uploadResults.map(r => [r.data.id, r.data]))
            }
            
            // Verify initial state
            expect(state.albums.has(albumId)).toBe(true)
            expect(state.mediaByAlbum.get(albumId).length).toBe(files.length)
            expect(state.storageFiles.size).toBe(files.length)
            expect(state.dbRecords.size).toBe(files.length)
            
            // Delete the album
            const deleteResult = simulateDeleteAlbumWithCascade(albumId, state)
            
            // Verify cascade deletion
            expect(deleteResult.success).toBe(true)
            expect(deleteResult.deletedMediaCount).toBe(files.length)
            expect(deleteResult.deletedStorageCount).toBe(files.length)
            
            // Album should be gone
            expect(state.albums.has(albumId)).toBe(false)
            expect(state.mediaByAlbum.has(albumId)).toBe(false)
            
            // All storage files should be gone
            expect(state.storageFiles.size).toBe(0)
            
            // All database records should be gone
            expect(state.dbRecords.size).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not affect media from other albums', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.uuid(),
            album1Id: fc.uuid(),
            album2Id: fc.uuid()
          }),
          fc.array(validFileArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(validFileArbitrary, { minLength: 1, maxLength: 5 }),
          ({ userId, album1Id, album2Id }, files1, files2) => {
            // Upload files to album 1
            const uploads1 = files1.map(file => 
              simulateUploadMedia({ albumId: album1Id, userId, file })
            )
            
            // Upload files to album 2
            const uploads2 = files2.map(file => 
              simulateUploadMedia({ albumId: album2Id, userId, file })
            )
            
            // Set up state with both albums
            const state = {
              albums: new Map([
                [album1Id, { id: album1Id, user_id: userId }],
                [album2Id, { id: album2Id, user_id: userId }]
              ]),
              mediaByAlbum: new Map([
                [album1Id, uploads1.map(r => r.data)],
                [album2Id, uploads2.map(r => r.data)]
              ]),
              storageFiles: new Set([
                ...uploads1.map(r => r.storagePath),
                ...uploads2.map(r => r.storagePath)
              ]),
              dbRecords: new Map([
                ...uploads1.map(r => [r.data.id, r.data]),
                ...uploads2.map(r => [r.data.id, r.data])
              ])
            }
            
            const initialTotalFiles = state.storageFiles.size
            
            // Delete only album 1
            simulateDeleteAlbumWithCascade(album1Id, state)
            
            // Album 1 should be gone
            expect(state.albums.has(album1Id)).toBe(false)
            
            // Album 2 should still exist
            expect(state.albums.has(album2Id)).toBe(true)
            expect(state.mediaByAlbum.get(album2Id).length).toBe(files2.length)
            
            // Only album 2's files should remain
            expect(state.storageFiles.size).toBe(files2.length)
            expect(state.dbRecords.size).toBe(files2.length)
            
            // Verify album 2's files are intact
            for (const upload of uploads2) {
              expect(state.storageFiles.has(upload.storagePath)).toBe(true)
              expect(state.dbRecords.has(upload.data.id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty album deletion gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            albumId: fc.uuid(),
            userId: fc.uuid()
          }),
          ({ albumId, userId }) => {
            // Set up state with empty album
            const state = {
              albums: new Map([[albumId, { id: albumId, user_id: userId }]]),
              mediaByAlbum: new Map([[albumId, []]]),
              storageFiles: new Set(),
              dbRecords: new Map()
            }
            
            // Delete the empty album
            const deleteResult = simulateDeleteAlbumWithCascade(albumId, state)
            
            // Should succeed with 0 media deleted
            expect(deleteResult.success).toBe(true)
            expect(deleteResult.deletedMediaCount).toBe(0)
            expect(deleteResult.deletedStorageCount).toBe(0)
            
            // Album should be gone
            expect(state.albums.has(albumId)).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should delete all storage files matching the album media', () => {
      fc.assert(
        fc.property(
          albumWithMediaArbitrary,
          ({ albumId, userId, files }) => {
            // Upload files
            const uploadResults = files.map(file => 
              simulateUploadMedia({ albumId, userId, file })
            )
            
            // Collect all storage paths
            const albumStoragePaths = uploadResults.map(r => r.storagePath)
            
            // Set up state
            const state = {
              albums: new Map([[albumId, { id: albumId, user_id: userId }]]),
              mediaByAlbum: new Map([[albumId, uploadResults.map(r => r.data)]]),
              storageFiles: new Set(albumStoragePaths),
              dbRecords: new Map(uploadResults.map(r => [r.data.id, r.data]))
            }
            
            // Delete album
            simulateDeleteAlbumWithCascade(albumId, state)
            
            // All storage paths should be removed
            for (const path of albumStoragePaths) {
              expect(state.storageFiles.has(path)).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should delete all database records matching the album media', () => {
      fc.assert(
        fc.property(
          albumWithMediaArbitrary,
          ({ albumId, userId, files }) => {
            // Upload files
            const uploadResults = files.map(file => 
              simulateUploadMedia({ albumId, userId, file })
            )
            
            // Collect all media IDs
            const albumMediaIds = uploadResults.map(r => r.data.id)
            
            // Set up state
            const state = {
              albums: new Map([[albumId, { id: albumId, user_id: userId }]]),
              mediaByAlbum: new Map([[albumId, uploadResults.map(r => r.data)]]),
              storageFiles: new Set(uploadResults.map(r => r.storagePath)),
              dbRecords: new Map(uploadResults.map(r => [r.data.id, r.data]))
            }
            
            // Delete album
            simulateDeleteAlbumWithCascade(albumId, state)
            
            // All media records should be removed
            for (const mediaId of albumMediaIds) {
              expect(state.dbRecords.has(mediaId)).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// ============================================================================
// Property Tests for Storage Quota and Statistics (Task 2.7)
// ============================================================================

describe('Profile Album Storage Quota and Statistics Property Tests', () => {

  // ============================================================================
  // Constants matching the store implementation
  // ============================================================================

  const STORAGE_QUOTA_BYTES = 100 * 1024 * 1024 // 100MB per user
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file

  // ============================================================================
  // Test Helpers for Storage Quota and Statistics
  // ============================================================================

  /**
   * Calculate storage statistics from media records
   * Mirrors getUserStorageStats in data.js
   * 
   * @param {Array} mediaRecords - Array of media records with file_size
   * @returns {{totalFiles: number, totalSize: number, quotaUsedPercent: number}}
   */
  function calculateStorageStats(mediaRecords) {
    const totalFiles = mediaRecords.length
    const totalSize = mediaRecords.reduce((sum, m) => sum + (m.file_size || 0), 0)
    const quotaUsedPercent = Math.round((totalSize / STORAGE_QUOTA_BYTES) * 100)

    return { totalFiles, totalSize, quotaUsedPercent }
  }

  /**
   * Check if user can upload more files based on current usage
   * Mirrors checkStorageQuota in data.js
   * 
   * @param {number} currentUsage - Current storage usage in bytes
   * @returns {{canUpload: boolean, remainingBytes: number}}
   */
  function checkStorageQuota(currentUsage) {
    const remainingBytes = STORAGE_QUOTA_BYTES - currentUsage
    const canUpload = remainingBytes > 0

    return { canUpload, remainingBytes }
  }

  /**
   * Simulate upload with quota check
   * @param {Object} params - Upload parameters
   * @param {number} currentUsage - Current storage usage in bytes
   * @returns {{success: boolean, message?: string, newUsage?: number}}
   */
  function simulateUploadWithQuotaCheck({ file, currentUsage }) {
    // Check quota first (Requirement 6.2)
    const quotaCheck = checkStorageQuota(currentUsage)
    if (!quotaCheck.canUpload) {
      return { success: false, message: 'พื้นที่เก็บข้อมูลเต็ม กรุณาลบไฟล์เก่าก่อน' }
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, message: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF' }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, message: 'ไฟล์ต้องไม่เกิน 10MB' }
    }

    // Check if adding this file would exceed quota
    if (currentUsage + file.size > STORAGE_QUOTA_BYTES) {
      return { success: false, message: 'พื้นที่เก็บข้อมูลเต็ม กรุณาลบไฟล์เก่าก่อน' }
    }

    // Upload successful
    return { success: true, newUsage: currentUsage + file.size }
  }

  // ============================================================================
  // Arbitraries for Storage Quota and Statistics Tests
  // ============================================================================

  /**
   * Arbitrary for generating valid file data
   */
  const validFileArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0)
      .map(s => s.trim() + '.jpg'),
    type: fc.constantFrom(...ALLOWED_MIME_TYPES),
    size: fc.integer({ min: 1, max: MAX_FILE_SIZE })
  })

  /**
   * Arbitrary for generating valid ISO date strings
   */
  const validISODateArbitrary = fc.integer({ 
    min: new Date('2020-01-01').getTime(), 
    max: new Date('2030-12-31').getTime() 
  }).map(ts => new Date(ts).toISOString())

  /**
   * Arbitrary for generating media records with file_size
   */
  const mediaRecordArbitrary = fc.record({
    id: fc.uuid(),
    album_id: fc.uuid(),
    user_id: fc.uuid(),
    file_url: fc.webUrl(),
    file_name: fc.string({ minLength: 1, maxLength: 50 }).map(s => s + '.jpg'),
    file_type: fc.constantFrom(...ALLOWED_MIME_TYPES),
    file_size: fc.integer({ min: 1, max: MAX_FILE_SIZE }),
    uploaded_at: validISODateArbitrary
  })

  /**
   * Arbitrary for generating an array of media records for a single user
   */
  const userMediaRecordsArbitrary = fc.record({
    userId: fc.uuid()
  }).chain(({ userId }) =>
    fc.array(
      mediaRecordArbitrary.map(m => ({ ...m, user_id: userId })),
      { minLength: 0, maxLength: 20 }
    ).map(records => ({ userId, records }))
  )

  /**
   * Arbitrary for generating storage usage at or above quota
   */
  const atOrAboveQuotaUsageArbitrary = fc.integer({ 
    min: STORAGE_QUOTA_BYTES, 
    max: STORAGE_QUOTA_BYTES * 2 
  })

  /**
   * Arbitrary for generating storage usage below quota
   */
  const belowQuotaUsageArbitrary = fc.integer({ 
    min: 0, 
    max: STORAGE_QUOTA_BYTES - 1 
  })

  // ============================================================================
  // Property 10: Storage quota enforcement
  // ============================================================================

  /**
   * **Feature: profile-album, Property 10: Storage quota enforcement**
   * **Validates: Requirements 6.2**
   * 
   * For any user with total storage usage >= 100MB, new upload attempts
   * should be rejected with quota exceeded error.
   */
  describe('Property 10: Storage quota enforcement', () => {

    it('should reject uploads when storage usage is at quota (100MB)', () => {
      fc.assert(
        fc.property(
          validFileArbitrary,
          (file) => {
            // User is exactly at quota
            const currentUsage = STORAGE_QUOTA_BYTES
            
            const result = simulateUploadWithQuotaCheck({ file, currentUsage })
            
            // Should be rejected
            expect(result.success).toBe(false)
            expect(result.message).toBe('พื้นที่เก็บข้อมูลเต็ม กรุณาลบไฟล์เก่าก่อน')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject uploads when storage usage exceeds quota', () => {
      fc.assert(
        fc.property(
          validFileArbitrary,
          atOrAboveQuotaUsageArbitrary,
          (file, currentUsage) => {
            const result = simulateUploadWithQuotaCheck({ file, currentUsage })
            
            // Should be rejected
            expect(result.success).toBe(false)
            expect(result.message).toBe('พื้นที่เก็บข้อมูลเต็ม กรุณาลบไฟล์เก่าก่อน')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow uploads when storage usage is below quota', () => {
      fc.assert(
        fc.property(
          validFileArbitrary,
          // Generate usage that leaves room for the file
          fc.integer({ min: 0, max: STORAGE_QUOTA_BYTES - MAX_FILE_SIZE - 1 }),
          (file, currentUsage) => {
            const result = simulateUploadWithQuotaCheck({ file, currentUsage })
            
            // Should be allowed
            expect(result.success).toBe(true)
            expect(result.newUsage).toBe(currentUsage + file.size)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject upload if adding file would exceed quota', () => {
      fc.assert(
        fc.property(
          validFileArbitrary,
          (file) => {
            // Set usage so that adding this file would exceed quota
            // but current usage is still below quota
            const currentUsage = STORAGE_QUOTA_BYTES - file.size + 1
            
            // Only test if currentUsage is valid (below quota)
            if (currentUsage >= STORAGE_QUOTA_BYTES) {
              return true // Skip this case
            }
            
            const result = simulateUploadWithQuotaCheck({ file, currentUsage })
            
            // Should be rejected because adding file would exceed quota
            expect(result.success).toBe(false)
            expect(result.message).toBe('พื้นที่เก็บข้อมูลเต็ม กรุณาลบไฟล์เก่าก่อน')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly report canUpload=false when at or above quota', () => {
      fc.assert(
        fc.property(
          atOrAboveQuotaUsageArbitrary,
          (currentUsage) => {
            const quotaCheck = checkStorageQuota(currentUsage)
            
            expect(quotaCheck.canUpload).toBe(false)
            expect(quotaCheck.remainingBytes).toBeLessThanOrEqual(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly report canUpload=true when below quota', () => {
      fc.assert(
        fc.property(
          belowQuotaUsageArbitrary,
          (currentUsage) => {
            const quotaCheck = checkStorageQuota(currentUsage)
            
            expect(quotaCheck.canUpload).toBe(true)
            expect(quotaCheck.remainingBytes).toBeGreaterThan(0)
            expect(quotaCheck.remainingBytes).toBe(STORAGE_QUOTA_BYTES - currentUsage)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow upload at exactly 1 byte below quota for 1-byte file', () => {
      // Edge case: exactly 1 byte remaining, uploading 1 byte file
      const currentUsage = STORAGE_QUOTA_BYTES - 1
      const file = { name: 'tiny.jpg', type: 'image/jpeg', size: 1 }
      
      const result = simulateUploadWithQuotaCheck({ file, currentUsage })
      
      // Should be allowed (exactly fills quota)
      expect(result.success).toBe(true)
      expect(result.newUsage).toBe(STORAGE_QUOTA_BYTES)
    })

    it('should reject upload when remaining space is less than file size', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: MAX_FILE_SIZE }), // file size
          (fileSize) => {
            // Set remaining space to be 1 byte less than file size
            const remainingSpace = fileSize - 1
            const currentUsage = STORAGE_QUOTA_BYTES - remainingSpace
            
            // Only test valid scenarios
            if (currentUsage < 0 || currentUsage >= STORAGE_QUOTA_BYTES) {
              return true
            }
            
            const file = { name: 'test.jpg', type: 'image/jpeg', size: fileSize }
            const result = simulateUploadWithQuotaCheck({ file, currentUsage })
            
            // Should be rejected
            expect(result.success).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle zero current usage correctly', () => {
      fc.assert(
        fc.property(
          validFileArbitrary,
          (file) => {
            const currentUsage = 0
            
            const result = simulateUploadWithQuotaCheck({ file, currentUsage })
            
            // Should always be allowed when starting from zero
            expect(result.success).toBe(true)
            expect(result.newUsage).toBe(file.size)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ============================================================================
  // Property 11: Storage statistics accuracy
  // ============================================================================

  /**
   * **Feature: profile-album, Property 11: Storage statistics accuracy**
   * **Validates: Requirements 6.3**
   * 
   * For any user, the displayed storage statistics (total files count, total
   * storage used) should match the actual sum of file_size from album_media
   * records for that user.
   */
  describe('Property 11: Storage statistics accuracy', () => {

    it('should correctly count total files', () => {
      fc.assert(
        fc.property(
          userMediaRecordsArbitrary,
          ({ records }) => {
            const stats = calculateStorageStats(records)
            
            // Total files should match record count
            expect(stats.totalFiles).toBe(records.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly sum total storage size', () => {
      fc.assert(
        fc.property(
          userMediaRecordsArbitrary,
          ({ records }) => {
            const stats = calculateStorageStats(records)
            
            // Total size should be sum of all file_size values
            const expectedTotalSize = records.reduce((sum, m) => sum + (m.file_size || 0), 0)
            expect(stats.totalSize).toBe(expectedTotalSize)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly calculate quota used percentage', () => {
      fc.assert(
        fc.property(
          userMediaRecordsArbitrary,
          ({ records }) => {
            const stats = calculateStorageStats(records)
            
            // Calculate expected percentage
            const totalSize = records.reduce((sum, m) => sum + (m.file_size || 0), 0)
            const expectedPercent = Math.round((totalSize / STORAGE_QUOTA_BYTES) * 100)
            
            expect(stats.quotaUsedPercent).toBe(expectedPercent)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return zero stats for empty records', () => {
      const stats = calculateStorageStats([])
      
      expect(stats.totalFiles).toBe(0)
      expect(stats.totalSize).toBe(0)
      expect(stats.quotaUsedPercent).toBe(0)
    })

    it('should handle single file correctly', () => {
      fc.assert(
        fc.property(
          mediaRecordArbitrary,
          (record) => {
            const stats = calculateStorageStats([record])
            
            expect(stats.totalFiles).toBe(1)
            expect(stats.totalSize).toBe(record.file_size)
            expect(stats.quotaUsedPercent).toBe(
              Math.round((record.file_size / STORAGE_QUOTA_BYTES) * 100)
            )
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle records with zero file_size', () => {
      fc.assert(
        fc.property(
          fc.array(
            mediaRecordArbitrary.map(m => ({ ...m, file_size: 0 })),
            { minLength: 1, maxLength: 10 }
          ),
          (records) => {
            const stats = calculateStorageStats(records)
            
            expect(stats.totalFiles).toBe(records.length)
            expect(stats.totalSize).toBe(0)
            expect(stats.quotaUsedPercent).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle records with null/undefined file_size', () => {
      fc.assert(
        fc.property(
          fc.array(
            mediaRecordArbitrary.map(m => ({ ...m, file_size: null })),
            { minLength: 1, maxLength: 10 }
          ),
          (records) => {
            const stats = calculateStorageStats(records)
            
            // Should count files but size should be 0
            expect(stats.totalFiles).toBe(records.length)
            expect(stats.totalSize).toBe(0)
            expect(stats.quotaUsedPercent).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accurately reflect storage after adding files', () => {
      fc.assert(
        fc.property(
          fc.array(mediaRecordArbitrary, { minLength: 1, maxLength: 10 }),
          mediaRecordArbitrary,
          (existingRecords, newRecord) => {
            // Calculate stats before adding
            const statsBefore = calculateStorageStats(existingRecords)
            
            // Add new record
            const allRecords = [...existingRecords, newRecord]
            const statsAfter = calculateStorageStats(allRecords)
            
            // Verify changes
            expect(statsAfter.totalFiles).toBe(statsBefore.totalFiles + 1)
            expect(statsAfter.totalSize).toBe(statsBefore.totalSize + newRecord.file_size)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accurately reflect storage after removing files', () => {
      fc.assert(
        fc.property(
          fc.array(mediaRecordArbitrary, { minLength: 2, maxLength: 10 }),
          (records) => {
            // Calculate stats before removing
            const statsBefore = calculateStorageStats(records)
            
            // Remove first record
            const removedRecord = records[0]
            const remainingRecords = records.slice(1)
            const statsAfter = calculateStorageStats(remainingRecords)
            
            // Verify changes
            expect(statsAfter.totalFiles).toBe(statsBefore.totalFiles - 1)
            expect(statsAfter.totalSize).toBe(statsBefore.totalSize - removedRecord.file_size)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show 100% when usage equals quota', () => {
      // Create records that sum to exactly 100MB
      const record = {
        id: crypto.randomUUID(),
        album_id: crypto.randomUUID(),
        user_id: crypto.randomUUID(),
        file_url: 'https://example.com/file.jpg',
        file_name: 'file.jpg',
        file_type: 'image/jpeg',
        file_size: STORAGE_QUOTA_BYTES,
        uploaded_at: new Date().toISOString()
      }
      
      const stats = calculateStorageStats([record])
      
      expect(stats.totalSize).toBe(STORAGE_QUOTA_BYTES)
      expect(stats.quotaUsedPercent).toBe(100)
    })

    it('should show percentage > 100 when usage exceeds quota', () => {
      // Create records that sum to more than 100MB
      const record = {
        id: crypto.randomUUID(),
        album_id: crypto.randomUUID(),
        user_id: crypto.randomUUID(),
        file_url: 'https://example.com/file.jpg',
        file_name: 'file.jpg',
        file_type: 'image/jpeg',
        file_size: STORAGE_QUOTA_BYTES + 1024 * 1024, // 101MB
        uploaded_at: new Date().toISOString()
      }
      
      const stats = calculateStorageStats([record])
      
      expect(stats.totalSize).toBeGreaterThan(STORAGE_QUOTA_BYTES)
      expect(stats.quotaUsedPercent).toBeGreaterThan(100)
    })

    it('should maintain consistency between totalSize and quotaUsedPercent', () => {
      fc.assert(
        fc.property(
          userMediaRecordsArbitrary,
          ({ records }) => {
            const stats = calculateStorageStats(records)
            
            // Verify the relationship between totalSize and quotaUsedPercent
            const calculatedPercent = Math.round((stats.totalSize / STORAGE_QUOTA_BYTES) * 100)
            expect(stats.quotaUsedPercent).toBe(calculatedPercent)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should only count files for the specified user', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // target user
          fc.array(mediaRecordArbitrary, { minLength: 1, maxLength: 10 }), // target user's files
          fc.array(mediaRecordArbitrary, { minLength: 1, maxLength: 10 }), // other user's files
          (targetUserId, targetUserRecords, otherUserRecords) => {
            // Set user_id for target user's records
            const targetRecords = targetUserRecords.map(r => ({ ...r, user_id: targetUserId }))
            
            // Calculate stats for target user only
            const stats = calculateStorageStats(targetRecords)
            
            // Should only count target user's files
            expect(stats.totalFiles).toBe(targetRecords.length)
            
            const expectedSize = targetRecords.reduce((sum, m) => sum + (m.file_size || 0), 0)
            expect(stats.totalSize).toBe(expectedSize)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


// ============================================================================
// Property Tests for Media Picker and Filtering (Task 4.4)
// ============================================================================

describe('Profile Album Media Picker and Filtering Property Tests', () => {

  // ============================================================================
  // Constants and Test Helpers
  // ============================================================================

  const VALID_ALBUM_TYPES = ['competition', 'training', 'documents', 'general']
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  /**
   * Validate that a URL is a valid file URL string
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL
   */
  function isValidFileUrl(url) {
    if (typeof url !== 'string' || url.trim() === '') {
      return false
    }
    try {
      const parsed = new URL(url)
      // Must be http or https protocol
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Filter albums by type (mirrors MediaPicker.vue filteredAlbums logic)
   * @param {Array} albums - Array of albums
   * @param {string} filterType - Album type to filter by ('all' or specific type)
   * @param {string} userId - User ID to filter by
   * @returns {Array} Filtered albums
   */
  function filterAlbumsByType(albums, filterType, userId) {
    let filtered = albums.filter(a => a.user_id === userId)
    if (filterType && filterType !== 'all') {
      filtered = filtered.filter(a => a.album_type === filterType)
    }
    return filtered
  }

  /**
   * Simulate media picker selection (mirrors MediaPicker.vue confirmSelection)
   * @param {Object} media - Selected media item
   * @param {boolean} multiple - Whether multiple selection is enabled
   * @returns {string|Array<string>} Selected file URL(s)
   */
  function simulateMediaPickerSelection(media, multiple = false) {
    if (multiple) {
      return Array.isArray(media) ? media.map(m => m.file_url) : [media.file_url]
    }
    return media.file_url
  }

  // ============================================================================
  // Arbitraries
  // ============================================================================

  /**
   * Arbitrary for generating valid album types
   */
  const albumTypeArbitrary = fc.constantFrom(...VALID_ALBUM_TYPES)

  /**
   * Arbitrary for generating valid album names
   */
  const validAlbumNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
    .filter(s => s.trim().length > 0)

  /**
   * Arbitrary for generating valid ISO date strings
   */
  const validISODateArbitrary = fc.integer({ 
    min: new Date('2020-01-01').getTime(), 
    max: new Date('2030-12-31').getTime() 
  }).map(ts => new Date(ts).toISOString())

  /**
   * Arbitrary for generating valid file URLs
   */
  const validFileUrlArbitrary = fc.record({
    protocol: fc.constantFrom('https'),
    domain: fc.constantFrom('example.supabase.co', 'storage.example.com', 'cdn.example.org'),
    path: fc.uuid().map(id => `/storage/v1/object/public/profile-albums/${id}`)
  }).map(({ protocol, domain, path }) => `${protocol}://${domain}${path}`)

  /**
   * Arbitrary for generating album data
   */
  const albumArbitrary = fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    name: validAlbumNameArbitrary,
    description: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    album_type: albumTypeArbitrary,
    cover_image_url: fc.option(validFileUrlArbitrary, { nil: null }),
    created_at: validISODateArbitrary,
    updated_at: validISODateArbitrary
  })

  /**
   * Arbitrary for generating media item data
   */
  const mediaItemArbitrary = fc.record({
    id: fc.uuid(),
    album_id: fc.uuid(),
    user_id: fc.uuid(),
    file_url: validFileUrlArbitrary,
    file_name: fc.string({ minLength: 1, maxLength: 50 }).map(s => s.trim() + '.jpg'),
    file_type: fc.constantFrom(...ALLOWED_MIME_TYPES),
    file_size: fc.integer({ min: 1, max: MAX_FILE_SIZE }),
    thumbnail_url: fc.option(validFileUrlArbitrary, { nil: null }),
    uploaded_at: validISODateArbitrary
  })

  /**
   * Arbitrary for generating albums with consistent user_id
   */
  const userAlbumsArbitrary = fc.record({
    userId: fc.uuid()
  }).chain(({ userId }) =>
    fc.array(
      albumArbitrary.map(a => ({ ...a, user_id: userId })),
      { minLength: 1, maxLength: 20 }
    ).map(albums => ({ userId, albums }))
  )

  /**
   * Arbitrary for generating albums with mixed types for a user
   */
  const mixedTypeAlbumsArbitrary = fc.record({
    userId: fc.uuid()
  }).chain(({ userId }) =>
    fc.tuple(
      // Generate at least one album of each type
      ...VALID_ALBUM_TYPES.map(type =>
        fc.array(
          albumArbitrary.map(a => ({ ...a, user_id: userId, album_type: type })),
          { minLength: 1, maxLength: 5 }
        )
      )
    ).map(albumArrays => ({
      userId,
      albums: albumArrays.flat()
    }))
  )

  // ============================================================================
  // Property 7: Media picker returns valid file URL
  // ============================================================================

  /**
   * **Feature: profile-album, Property 7: Media picker returns valid file URL**
   * **Validates: Requirements 4.3**
   * 
   * For any media item selected through the media picker, the returned value
   * should be a valid URL string that points to the file in storage.
   */
  describe('Property 7: Media picker returns valid file URL', () => {

    it('should return a valid URL string when single media is selected', () => {
      fc.assert(
        fc.property(
          mediaItemArbitrary,
          (media) => {
            const result = simulateMediaPickerSelection(media, false)
            
            // Should return a string
            expect(typeof result).toBe('string')
            
            // Should be a valid URL
            expect(isValidFileUrl(result)).toBe(true)
            
            // Should match the media's file_url
            expect(result).toBe(media.file_url)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return an array of valid URLs when multiple media are selected', () => {
      fc.assert(
        fc.property(
          fc.array(mediaItemArbitrary, { minLength: 1, maxLength: 10 }),
          (mediaItems) => {
            const result = simulateMediaPickerSelection(mediaItems, true)
            
            // Should return an array
            expect(Array.isArray(result)).toBe(true)
            
            // Array length should match input
            expect(result.length).toBe(mediaItems.length)
            
            // Each URL should be valid
            result.forEach((url, index) => {
              expect(typeof url).toBe('string')
              expect(isValidFileUrl(url)).toBe(true)
              expect(url).toBe(mediaItems[index].file_url)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return URL that starts with http or https protocol', () => {
      fc.assert(
        fc.property(
          mediaItemArbitrary,
          (media) => {
            const result = simulateMediaPickerSelection(media, false)
            
            // URL should start with http:// or https://
            expect(result.startsWith('http://') || result.startsWith('https://')).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return non-empty URL string', () => {
      fc.assert(
        fc.property(
          mediaItemArbitrary,
          (media) => {
            const result = simulateMediaPickerSelection(media, false)
            
            // URL should not be empty
            expect(result.length).toBeGreaterThan(0)
            expect(result.trim().length).toBeGreaterThan(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve original file_url without modification', () => {
      fc.assert(
        fc.property(
          mediaItemArbitrary,
          (media) => {
            const originalUrl = media.file_url
            const result = simulateMediaPickerSelection(media, false)
            
            // URL should be exactly the same as original
            expect(result).toBe(originalUrl)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle media with various file types correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            album_id: fc.uuid(),
            user_id: fc.uuid(),
            file_url: validFileUrlArbitrary,
            file_name: fc.string({ minLength: 1, maxLength: 50 }),
            file_type: fc.constantFrom(...ALLOWED_MIME_TYPES),
            file_size: fc.integer({ min: 1, max: MAX_FILE_SIZE }),
            thumbnail_url: fc.option(validFileUrlArbitrary, { nil: null }),
            uploaded_at: validISODateArbitrary
          }),
          (media) => {
            const result = simulateMediaPickerSelection(media, false)
            
            // Should return valid URL regardless of file type
            expect(isValidFileUrl(result)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return parseable URL that can be used in fetch/img src', () => {
      fc.assert(
        fc.property(
          mediaItemArbitrary,
          (media) => {
            const result = simulateMediaPickerSelection(media, false)
            
            // Should be parseable as URL
            let parsed
            expect(() => {
              parsed = new URL(result)
            }).not.toThrow()
            
            // Should have valid components
            expect(parsed.protocol).toBeTruthy()
            expect(parsed.host).toBeTruthy()
            expect(parsed.pathname).toBeTruthy()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle single item in multiple selection mode', () => {
      fc.assert(
        fc.property(
          mediaItemArbitrary,
          (media) => {
            // Single item passed to multiple selection mode
            const result = simulateMediaPickerSelection(media, true)
            
            // Should return array with single URL
            expect(Array.isArray(result)).toBe(true)
            expect(result.length).toBe(1)
            expect(isValidFileUrl(result[0])).toBe(true)
            expect(result[0]).toBe(media.file_url)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ============================================================================
  // Property 8: Album filtering returns only matching types
  // ============================================================================

  /**
   * **Feature: profile-album, Property 8: Album filtering returns only matching types**
   * **Validates: Requirements 4.4**
   * 
   * For any album filter by type (competition, training, documents), the returned
   * albums should all have album_type matching the filter value.
   */
  describe('Property 8: Album filtering returns only matching types', () => {

    it('should return only albums matching the specified type', () => {
      fc.assert(
        fc.property(
          mixedTypeAlbumsArbitrary,
          albumTypeArbitrary,
          ({ userId, albums }, filterType) => {
            const filtered = filterAlbumsByType(albums, filterType, userId)
            
            // All returned albums should have matching type
            filtered.forEach(album => {
              expect(album.album_type).toBe(filterType)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all user albums when filter is "all"', () => {
      fc.assert(
        fc.property(
          userAlbumsArbitrary,
          ({ userId, albums }) => {
            const filtered = filterAlbumsByType(albums, 'all', userId)
            
            // Should return all albums for the user
            const userAlbums = albums.filter(a => a.user_id === userId)
            expect(filtered.length).toBe(userAlbums.length)
            
            // All user albums should be present
            userAlbums.forEach(album => {
              expect(filtered.some(f => f.id === album.id)).toBe(true)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when no albums match the filter type', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.uuid()
          }).chain(({ userId }) =>
            fc.array(
              albumArbitrary.map(a => ({ ...a, user_id: userId, album_type: 'general' })),
              { minLength: 1, maxLength: 10 }
            ).map(albums => ({ userId, albums }))
          ),
          ({ userId, albums }) => {
            // Filter for 'competition' when all albums are 'general'
            const filtered = filterAlbumsByType(albums, 'competition', userId)
            
            // Should return empty array
            expect(filtered.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should only return albums for the specified user', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // target user
          fc.uuid(), // other user
          fc.array(albumArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(albumArbitrary, { minLength: 1, maxLength: 10 }),
          (targetUserId, otherUserId, targetAlbums, otherAlbums) => {
            // Ensure users are different
            if (targetUserId === otherUserId) return true
            
            // Set user IDs
            const targetUserAlbums = targetAlbums.map(a => ({ ...a, user_id: targetUserId }))
            const otherUserAlbums = otherAlbums.map(a => ({ ...a, user_id: otherUserId }))
            const allAlbums = [...targetUserAlbums, ...otherUserAlbums]
            
            const filtered = filterAlbumsByType(allAlbums, 'all', targetUserId)
            
            // Should only contain target user's albums
            filtered.forEach(album => {
              expect(album.user_id).toBe(targetUserId)
            })
            
            // Should not contain other user's albums
            otherUserAlbums.forEach(album => {
              expect(filtered.some(f => f.id === album.id)).toBe(false)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter correctly for each valid album type', () => {
      // Test each album type explicitly
      for (const albumType of VALID_ALBUM_TYPES) {
        fc.assert(
          fc.property(
            mixedTypeAlbumsArbitrary,
            ({ userId, albums }) => {
              const filtered = filterAlbumsByType(albums, albumType, userId)
              
              // All filtered albums should have the correct type
              filtered.forEach(album => {
                expect(album.album_type).toBe(albumType)
              })
              
              // Count should match albums of that type
              const expectedCount = albums.filter(a => 
                a.user_id === userId && a.album_type === albumType
              ).length
              expect(filtered.length).toBe(expectedCount)
              
              return true
            }
          ),
          { numRuns: 25 } // 25 runs per type = 100 total
        )
      }
    })

    it('should preserve album data integrity through filtering', () => {
      fc.assert(
        fc.property(
          userAlbumsArbitrary,
          albumTypeArbitrary,
          ({ userId, albums }, filterType) => {
            const filtered = filterAlbumsByType(albums, filterType, userId)
            
            // Each filtered album should have all its original data
            filtered.forEach(filteredAlbum => {
              const original = albums.find(a => a.id === filteredAlbum.id)
              expect(original).toBeDefined()
              
              // All fields should match
              expect(filteredAlbum.user_id).toBe(original.user_id)
              expect(filteredAlbum.name).toBe(original.name)
              expect(filteredAlbum.description).toBe(original.description)
              expect(filteredAlbum.album_type).toBe(original.album_type)
              expect(filteredAlbum.cover_image_url).toBe(original.cover_image_url)
              expect(filteredAlbum.created_at).toBe(original.created_at)
              expect(filteredAlbum.updated_at).toBe(original.updated_at)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty album list gracefully', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          albumTypeArbitrary,
          (userId, filterType) => {
            const filtered = filterAlbumsByType([], filterType, userId)
            
            // Should return empty array
            expect(filtered).toEqual([])
            expect(filtered.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return correct count of filtered albums', () => {
      fc.assert(
        fc.property(
          mixedTypeAlbumsArbitrary,
          albumTypeArbitrary,
          ({ userId, albums }, filterType) => {
            const filtered = filterAlbumsByType(albums, filterType, userId)
            
            // Count albums that should match
            const expectedCount = albums.filter(a => 
              a.user_id === userId && a.album_type === filterType
            ).length
            
            expect(filtered.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not modify the original albums array', () => {
      fc.assert(
        fc.property(
          userAlbumsArbitrary,
          albumTypeArbitrary,
          ({ userId, albums }, filterType) => {
            // Create a deep copy to compare
            const originalAlbums = JSON.parse(JSON.stringify(albums))
            
            // Perform filtering
            filterAlbumsByType(albums, filterType, userId)
            
            // Original array should be unchanged
            expect(albums.length).toBe(originalAlbums.length)
            albums.forEach((album, index) => {
              expect(album.id).toBe(originalAlbums[index].id)
              expect(album.album_type).toBe(originalAlbums[index].album_type)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null/undefined filter type as "all"', () => {
      fc.assert(
        fc.property(
          userAlbumsArbitrary,
          fc.constantFrom(null, undefined),
          ({ userId, albums }, filterType) => {
            const filtered = filterAlbumsByType(albums, filterType, userId)
            
            // Should return all user albums (same as 'all' filter)
            const userAlbums = albums.filter(a => a.user_id === userId)
            expect(filtered.length).toBe(userAlbums.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ============================================================================
  // Property 9: Coach access control for athlete albums
  // ============================================================================

  /**
   * **Feature: profile-album, Property 9: Coach access control for athlete albums**
   * **Validates: Requirements 5.1, 5.3**
   * 
   * For any coach viewing an athlete's albums, the coach should be able to read
   * albums of athletes in their club, but should not be able to create, update,
   * or delete those albums or media items.
   */
  describe('Property 9: Coach access control for athlete albums', () => {

    // ============================================================================
    // Access Control Helpers
    // ============================================================================

    /**
     * User roles in the system
     */
    const USER_ROLES = ['admin', 'coach', 'athlete']

    /**
     * Permission types for album operations
     */
    const ALBUM_OPERATIONS = ['select', 'insert', 'update', 'delete']

    /**
     * Check if a user can perform an operation on an album
     * Mirrors the RLS policies defined in the database
     * 
     * @param {Object} params - Parameters
     * @param {string} params.userId - Current user ID
     * @param {string} params.userRole - Current user role
     * @param {string} params.albumOwnerId - Album owner's user ID
     * @param {string} params.operation - Operation to check (select, insert, update, delete)
     * @param {boolean} params.isAthleteInCoachClub - Whether album owner is an athlete in coach's club
     * @returns {{allowed: boolean, reason?: string}}
     */
    function checkAlbumPermission({ userId, userRole, albumOwnerId, operation, isAthleteInCoachClub = false }) {
      // Owner can do everything with their own albums
      if (userId === albumOwnerId) {
        return { allowed: true }
      }

      // Coach viewing athlete's album
      if (userRole === 'coach') {
        if (operation === 'select' && isAthleteInCoachClub) {
          // Coaches can SELECT albums of athletes in their club
          return { allowed: true }
        }
        // Coaches cannot INSERT, UPDATE, or DELETE athlete albums
        return { 
          allowed: false, 
          reason: 'โค้ชไม่มีสิทธิ์แก้ไขอัลบั้มของนักกีฬา' 
        }
      }

      // Admin can do everything (simplified for this test)
      if (userRole === 'admin') {
        return { allowed: true }
      }

      // Athletes cannot access other users' albums
      return { 
        allowed: false, 
        reason: 'ไม่มีสิทธิ์เข้าถึงอัลบั้มนี้' 
      }
    }

    /**
     * Check if a user can perform an operation on media
     * Mirrors the RLS policies for album_media table
     * 
     * @param {Object} params - Parameters
     * @param {string} params.userId - Current user ID
     * @param {string} params.userRole - Current user role
     * @param {string} params.mediaOwnerId - Media owner's user ID
     * @param {string} params.operation - Operation to check
     * @param {boolean} params.isAthleteInCoachClub - Whether media owner is an athlete in coach's club
     * @returns {{allowed: boolean, reason?: string}}
     */
    function checkMediaPermission({ userId, userRole, mediaOwnerId, operation, isAthleteInCoachClub = false }) {
      // Same logic as album permission
      return checkAlbumPermission({
        userId,
        userRole,
        albumOwnerId: mediaOwnerId,
        operation,
        isAthleteInCoachClub
      })
    }

    /**
     * Determine if UI should show edit/delete controls
     * Based on isOwner computed property in AlbumDetail.vue
     * 
     * @param {string} currentUserId - Current user ID
     * @param {string} albumOwnerId - Album owner's user ID
     * @returns {boolean}
     */
    function shouldShowEditControls(currentUserId, albumOwnerId) {
      return currentUserId === albumOwnerId
    }

    /**
     * Determine if AlbumSection should be in read-only mode
     * Based on readOnly prop passed from parent component
     * 
     * @param {string} currentUserId - Current user ID
     * @param {string} profileUserId - Profile being viewed
     * @returns {boolean}
     */
    function isReadOnlyMode(currentUserId, profileUserId) {
      return currentUserId !== profileUserId
    }

    // ============================================================================
    // Arbitraries for Access Control Tests
    // ============================================================================

    /**
     * Arbitrary for generating a coach-athlete relationship
     */
    const coachAthleteRelationshipArbitrary = fc.record({
      coachUserId: fc.uuid(),
      athleteUserId: fc.uuid(),
      clubId: fc.uuid()
    }).filter(({ coachUserId, athleteUserId }) => coachUserId !== athleteUserId)

    /**
     * Generate valid ISO date string from timestamp
     */
    const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00.000Z').getTime()
    const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59.999Z').getTime()
    
    const validISODateArbitrary = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP })
      .map(ts => new Date(ts).toISOString())

    /**
     * Arbitrary for generating album data with owner
     */
    const albumWithOwnerArbitrary = fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      album_type: fc.constantFrom('competition', 'training', 'documents', 'general'),
      created_at: validISODateArbitrary,
      updated_at: validISODateArbitrary
    })

    /**
     * Arbitrary for generating media data with owner
     */
    const mediaWithOwnerArbitrary = fc.record({
      id: fc.uuid(),
      album_id: fc.uuid(),
      user_id: fc.uuid(),
      file_url: fc.webUrl(),
      file_name: fc.string({ minLength: 1, maxLength: 50 }).map(s => s.trim() + '.jpg'),
      file_type: fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
      file_size: fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
      uploaded_at: validISODateArbitrary
    })

    // ============================================================================
    // Property Tests
    // ============================================================================

    it('should allow coach to SELECT albums of athletes in their club', () => {
      fc.assert(
        fc.property(
          coachAthleteRelationshipArbitrary,
          albumWithOwnerArbitrary,
          ({ coachUserId, athleteUserId }, album) => {
            // Album belongs to athlete
            const athleteAlbum = { ...album, user_id: athleteUserId }
            
            const result = checkAlbumPermission({
              userId: coachUserId,
              userRole: 'coach',
              albumOwnerId: athleteAlbum.user_id,
              operation: 'select',
              isAthleteInCoachClub: true
            })
            
            // Coach should be able to SELECT
            expect(result.allowed).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should NOT allow coach to INSERT albums for athletes', () => {
      fc.assert(
        fc.property(
          coachAthleteRelationshipArbitrary,
          albumWithOwnerArbitrary,
          ({ coachUserId, athleteUserId }, album) => {
            const athleteAlbum = { ...album, user_id: athleteUserId }
            
            const result = checkAlbumPermission({
              userId: coachUserId,
              userRole: 'coach',
              albumOwnerId: athleteAlbum.user_id,
              operation: 'insert',
              isAthleteInCoachClub: true
            })
            
            // Coach should NOT be able to INSERT
            expect(result.allowed).toBe(false)
            expect(result.reason).toBeDefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should NOT allow coach to UPDATE athlete albums', () => {
      fc.assert(
        fc.property(
          coachAthleteRelationshipArbitrary,
          albumWithOwnerArbitrary,
          ({ coachUserId, athleteUserId }, album) => {
            const athleteAlbum = { ...album, user_id: athleteUserId }
            
            const result = checkAlbumPermission({
              userId: coachUserId,
              userRole: 'coach',
              albumOwnerId: athleteAlbum.user_id,
              operation: 'update',
              isAthleteInCoachClub: true
            })
            
            // Coach should NOT be able to UPDATE
            expect(result.allowed).toBe(false)
            expect(result.reason).toBeDefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should NOT allow coach to DELETE athlete albums', () => {
      fc.assert(
        fc.property(
          coachAthleteRelationshipArbitrary,
          albumWithOwnerArbitrary,
          ({ coachUserId, athleteUserId }, album) => {
            const athleteAlbum = { ...album, user_id: athleteUserId }
            
            const result = checkAlbumPermission({
              userId: coachUserId,
              userRole: 'coach',
              albumOwnerId: athleteAlbum.user_id,
              operation: 'delete',
              isAthleteInCoachClub: true
            })
            
            // Coach should NOT be able to DELETE
            expect(result.allowed).toBe(false)
            expect(result.reason).toBeDefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow coach to SELECT media of athletes in their club', () => {
      fc.assert(
        fc.property(
          coachAthleteRelationshipArbitrary,
          mediaWithOwnerArbitrary,
          ({ coachUserId, athleteUserId }, media) => {
            const athleteMedia = { ...media, user_id: athleteUserId }
            
            const result = checkMediaPermission({
              userId: coachUserId,
              userRole: 'coach',
              mediaOwnerId: athleteMedia.user_id,
              operation: 'select',
              isAthleteInCoachClub: true
            })
            
            // Coach should be able to SELECT media
            expect(result.allowed).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should NOT allow coach to INSERT/UPDATE/DELETE athlete media', () => {
      const modifyOperations = ['insert', 'update', 'delete']
      
      fc.assert(
        fc.property(
          coachAthleteRelationshipArbitrary,
          mediaWithOwnerArbitrary,
          fc.constantFrom(...modifyOperations),
          ({ coachUserId, athleteUserId }, media, operation) => {
            const athleteMedia = { ...media, user_id: athleteUserId }
            
            const result = checkMediaPermission({
              userId: coachUserId,
              userRole: 'coach',
              mediaOwnerId: athleteMedia.user_id,
              operation,
              isAthleteInCoachClub: true
            })
            
            // Coach should NOT be able to modify media
            expect(result.allowed).toBe(false)
            expect(result.reason).toBeDefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should NOT allow coach to access albums of athletes NOT in their club', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // coachUserId
          fc.uuid(), // athleteUserId (not in coach's club)
          albumWithOwnerArbitrary,
          fc.constantFrom(...ALBUM_OPERATIONS),
          (coachUserId, athleteUserId, album, operation) => {
            // Ensure different users
            fc.pre(coachUserId !== athleteUserId)
            
            const athleteAlbum = { ...album, user_id: athleteUserId }
            
            const result = checkAlbumPermission({
              userId: coachUserId,
              userRole: 'coach',
              albumOwnerId: athleteAlbum.user_id,
              operation,
              isAthleteInCoachClub: false // NOT in coach's club
            })
            
            // Coach should NOT have any access
            expect(result.allowed).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should hide edit controls when coach views athlete album (UI)', () => {
      fc.assert(
        fc.property(
          coachAthleteRelationshipArbitrary,
          ({ coachUserId, athleteUserId }) => {
            // Coach viewing athlete's album
            const showControls = shouldShowEditControls(coachUserId, athleteUserId)
            
            // Edit controls should be hidden
            expect(showControls).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show edit controls when user views own album (UI)', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (userId) => {
            // User viewing their own album
            const showControls = shouldShowEditControls(userId, userId)
            
            // Edit controls should be visible
            expect(showControls).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set read-only mode when viewing another user profile', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          (currentUserId, profileUserId) => {
            fc.pre(currentUserId !== profileUserId)
            
            const readOnly = isReadOnlyMode(currentUserId, profileUserId)
            
            // Should be read-only when viewing another user's profile
            expect(readOnly).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should NOT set read-only mode when viewing own profile', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (userId) => {
            const readOnly = isReadOnlyMode(userId, userId)
            
            // Should NOT be read-only when viewing own profile
            expect(readOnly).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow owner full CRUD access to their own albums', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          albumWithOwnerArbitrary,
          fc.constantFrom(...ALBUM_OPERATIONS),
          fc.constantFrom(...USER_ROLES),
          (userId, album, operation, role) => {
            const ownAlbum = { ...album, user_id: userId }
            
            const result = checkAlbumPermission({
              userId,
              userRole: role,
              albumOwnerId: ownAlbum.user_id,
              operation,
              isAthleteInCoachClub: false
            })
            
            // Owner should always have full access
            expect(result.allowed).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should deny athlete access to other athletes albums', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          albumWithOwnerArbitrary,
          fc.constantFrom(...ALBUM_OPERATIONS),
          (athleteUserId, otherAthleteUserId, album, operation) => {
            fc.pre(athleteUserId !== otherAthleteUserId)
            
            const otherAlbum = { ...album, user_id: otherAthleteUserId }
            
            const result = checkAlbumPermission({
              userId: athleteUserId,
              userRole: 'athlete',
              albumOwnerId: otherAlbum.user_id,
              operation,
              isAthleteInCoachClub: false
            })
            
            // Athlete should NOT access other athlete's albums
            expect(result.allowed).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should consistently apply same rules to albums and media', () => {
      fc.assert(
        fc.property(
          coachAthleteRelationshipArbitrary,
          fc.constantFrom(...ALBUM_OPERATIONS),
          ({ coachUserId, athleteUserId }, operation) => {
            // Check album permission
            const albumResult = checkAlbumPermission({
              userId: coachUserId,
              userRole: 'coach',
              albumOwnerId: athleteUserId,
              operation,
              isAthleteInCoachClub: true
            })
            
            // Check media permission
            const mediaResult = checkMediaPermission({
              userId: coachUserId,
              userRole: 'coach',
              mediaOwnerId: athleteUserId,
              operation,
              isAthleteInCoachClub: true
            })
            
            // Both should have same permission result
            expect(albumResult.allowed).toBe(mediaResult.allowed)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
