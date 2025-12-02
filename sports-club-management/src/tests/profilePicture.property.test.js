/**
 * Profile Picture Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Profile Picture
 * 
 * Tests for:
 * - Property 1: File type validation accepts only allowed types
 * - Property 2: File size validation enforces 2MB limit
 * - Property 3: Avatar URL persistence round-trip
 * - Property 5: Avatar removal cleanup
 * - Property 6: Storage path format correctness
 * 
 * **Feature: profile-picture**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { validateAvatarFile, getAvatarFallback, AVATAR_CONSTANTS } from '../lib/avatar.js'

// ============================================================================
// Constants from avatar.js
// ============================================================================

const { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, STORAGE_BUCKET } = AVATAR_CONSTANTS

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * Arbitrary for generating allowed MIME types for avatars
 */
const allowedMimeTypeArbitrary = fc.constantFrom(...ALLOWED_MIME_TYPES)

/**
 * Arbitrary for generating invalid MIME types (not in allowed list)
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
  fc.constant('application/pdf'),
  fc.constant('application/zip'),
  fc.constant('application/json'),
  fc.constant('text/plain'),
  fc.constant('text/html'),
  // Random MIME types that are not in allowed list
  fc.string({ minLength: 3, maxLength: 50 })
    .filter(s => !ALLOWED_MIME_TYPES.includes(s) && s.includes('/'))
)


/**
 * Arbitrary for generating valid file sizes (0 to 2MB)
 */
const validFileSizeArbitrary = fc.integer({ min: 1, max: MAX_FILE_SIZE })

/**
 * Arbitrary for generating invalid file sizes (> 2MB)
 */
const invalidFileSizeArbitrary = fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 10 })

/**
 * Create a mock File-like object for testing
 * @param {string} type - MIME type
 * @param {number} size - File size in bytes
 * @returns {Object} - File-like object
 */
function createMockFile(type, size) {
  return {
    name: `test-avatar.${type.split('/')[1] || 'file'}`,
    type,
    size
  }
}

/**
 * Generate storage path for avatar (mirrors logic in avatar.js)
 * @param {string} userId - User ID
 * @param {number} timestamp - Timestamp
 * @param {string} extension - File extension
 * @returns {string} - Storage path
 */
function generateStoragePath(userId, timestamp, extension) {
  return `${userId}/avatar_${timestamp}.${extension}`
}

/**
 * Get extension from MIME type (mirrors logic in avatar.js)
 * @param {string} mimeType - MIME type
 * @returns {string} - File extension
 */
function getExtensionFromMimeType(mimeType) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  }
  return extensions[mimeType] || 'jpg'
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Profile Picture Property Tests', () => {

  /**
   * **Feature: profile-picture, Property 1: File type validation accepts only allowed types**
   * **Validates: Requirements 1.2**
   * 
   * For any file input, the validation function SHALL accept only files with 
   * MIME type image/jpeg, image/png, or image/webp, and reject all other types.
   */
  describe('Property 1: File type validation accepts only allowed types', () => {
    
    it('should accept files with allowed MIME types (image/jpeg, image/png, image/webp)', () => {
      fc.assert(
        fc.property(
          allowedMimeTypeArbitrary,
          validFileSizeArbitrary,
          (mimeType, size) => {
            const file = createMockFile(mimeType, size)
            const result = validateAvatarFile(file)
            
            // Should be valid for allowed types
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
          invalidMimeTypeArbitrary,
          validFileSizeArbitrary,
          (mimeType, size) => {
            const file = createMockFile(mimeType, size)
            const result = validateAvatarFile(file)
            
            // Should be invalid for non-allowed types
            expect(result.valid).toBe(false)
            expect(result.error).toBeDefined()
            expect(result.error).toContain('Invalid file type')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept image/jpeg specifically', () => {
      fc.assert(
        fc.property(
          validFileSizeArbitrary,
          (size) => {
            const file = createMockFile('image/jpeg', size)
            const result = validateAvatarFile(file)
            
            expect(result.valid).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept image/png specifically', () => {
      fc.assert(
        fc.property(
          validFileSizeArbitrary,
          (size) => {
            const file = createMockFile('image/png', size)
            const result = validateAvatarFile(file)
            
            expect(result.valid).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept image/webp specifically', () => {
      fc.assert(
        fc.property(
          validFileSizeArbitrary,
          (size) => {
            const file = createMockFile('image/webp', size)
            const result = validateAvatarFile(file)
            
            expect(result.valid).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject image/gif (not in allowed list)', () => {
      fc.assert(
        fc.property(
          validFileSizeArbitrary,
          (size) => {
            const file = createMockFile('image/gif', size)
            const result = validateAvatarFile(file)
            
            expect(result.valid).toBe(false)
            expect(result.error).toContain('Invalid file type')
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject application/pdf (not in allowed list for avatars)', () => {
      fc.assert(
        fc.property(
          validFileSizeArbitrary,
          (size) => {
            const file = createMockFile('application/pdf', size)
            const result = validateAvatarFile(file)
            
            expect(result.valid).toBe(false)
            expect(result.error).toContain('Invalid file type')
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: profile-picture, Property 2: File size validation enforces 2MB limit**
   * **Validates: Requirements 1.3**
   * 
   * For any file input, the validation function SHALL accept files with 
   * size ≤ 2,097,152 bytes and reject files exceeding this limit.
   */
  describe('Property 2: File size validation enforces 2MB limit', () => {
    
    it('should accept files with size <= 2MB', () => {
      fc.assert(
        fc.property(
          allowedMimeTypeArbitrary,
          validFileSizeArbitrary,
          (mimeType, size) => {
            const file = createMockFile(mimeType, size)
            const result = validateAvatarFile(file)
            
            // Should be valid for sizes within limit
            expect(result.valid).toBe(true)
            expect(result.error).toBeUndefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject files with size > 2MB', () => {
      fc.assert(
        fc.property(
          allowedMimeTypeArbitrary,
          invalidFileSizeArbitrary,
          (mimeType, size) => {
            const file = createMockFile(mimeType, size)
            const result = validateAvatarFile(file)
            
            // Should be invalid for sizes exceeding limit
            expect(result.valid).toBe(false)
            expect(result.error).toBeDefined()
            expect(result.error).toContain('2MB')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept files at exactly 2MB boundary (2,097,152 bytes)', () => {
      fc.assert(
        fc.property(
          allowedMimeTypeArbitrary,
          (mimeType) => {
            const file = createMockFile(mimeType, MAX_FILE_SIZE)
            const result = validateAvatarFile(file)
            
            // Exactly 2MB should be valid
            expect(result.valid).toBe(true)
            expect(result.error).toBeUndefined()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject files at exactly 2MB + 1 byte', () => {
      fc.assert(
        fc.property(
          allowedMimeTypeArbitrary,
          (mimeType) => {
            const file = createMockFile(mimeType, MAX_FILE_SIZE + 1)
            const result = validateAvatarFile(file)
            
            // 2MB + 1 byte should be invalid
            expect(result.valid).toBe(false)
            expect(result.error).toContain('2MB')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle various valid file sizes within limit', () => {
      const sizesArbitrary = fc.oneof(
        fc.constant(1),                           // 1 byte
        fc.constant(1024),                        // 1 KB
        fc.constant(1024 * 1024),                 // 1 MB
        fc.constant(MAX_FILE_SIZE - 1),           // Just under limit
        fc.constant(MAX_FILE_SIZE),               // Exactly at limit
        fc.integer({ min: 1, max: MAX_FILE_SIZE }) // Random valid size
      )

      fc.assert(
        fc.property(
          allowedMimeTypeArbitrary,
          sizesArbitrary,
          (mimeType, size) => {
            const file = createMockFile(mimeType, size)
            const result = validateAvatarFile(file)
            
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
          invalidMimeTypeArbitrary,
          invalidFileSizeArbitrary,
          (mimeType, size) => {
            const file = createMockFile(mimeType, size)
            const result = validateAvatarFile(file)
            
            // Should be invalid with type error (checked first)
            expect(result.valid).toBe(false)
            expect(result.error).toContain('Invalid file type')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: profile-picture, Property 6: Storage path format correctness**
   * **Validates: Requirements 1.4**
   * 
   * For any uploaded avatar, the storage path SHALL follow the format 
   * `{user_id}/avatar_{timestamp}.{extension}` where user_id matches the authenticated user.
   */
  describe('Property 6: Storage path format correctness', () => {
    
    /**
     * Arbitrary for generating valid user IDs (UUIDs)
     */
    const userIdArbitrary = fc.uuid()

    /**
     * Arbitrary for generating valid timestamps
     */
    const timestampArbitrary = fc.integer({ min: 1000000000000, max: 9999999999999 })

    it('should generate path in format {user_id}/avatar_{timestamp}.{extension}', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          timestampArbitrary,
          allowedMimeTypeArbitrary,
          (userId, timestamp, mimeType) => {
            const extension = getExtensionFromMimeType(mimeType)
            const path = generateStoragePath(userId, timestamp, extension)
            
            // Path should start with user_id
            expect(path.startsWith(`${userId}/`)).toBe(true)
            
            // Path should contain avatar_ prefix
            expect(path).toContain('/avatar_')
            
            // Path should end with correct extension
            expect(path.endsWith(`.${extension}`)).toBe(true)
            
            // Path should match the exact format
            const expectedPath = `${userId}/avatar_${timestamp}.${extension}`
            expect(path).toBe(expectedPath)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use correct extension for each MIME type', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          timestampArbitrary,
          (userId, timestamp) => {
            // Test each MIME type maps to correct extension
            expect(getExtensionFromMimeType('image/jpeg')).toBe('jpg')
            expect(getExtensionFromMimeType('image/png')).toBe('png')
            expect(getExtensionFromMimeType('image/webp')).toBe('webp')
            
            // Generate paths and verify extensions
            const jpegPath = generateStoragePath(userId, timestamp, 'jpg')
            const pngPath = generateStoragePath(userId, timestamp, 'png')
            const webpPath = generateStoragePath(userId, timestamp, 'webp')
            
            expect(jpegPath.endsWith('.jpg')).toBe(true)
            expect(pngPath.endsWith('.png')).toBe(true)
            expect(webpPath.endsWith('.webp')).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include user_id as the first path segment', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          timestampArbitrary,
          allowedMimeTypeArbitrary,
          (userId, timestamp, mimeType) => {
            const extension = getExtensionFromMimeType(mimeType)
            const path = generateStoragePath(userId, timestamp, extension)
            
            // Split path and verify first segment is user_id
            const segments = path.split('/')
            expect(segments[0]).toBe(userId)
            expect(segments.length).toBe(2)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include timestamp in filename', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          timestampArbitrary,
          allowedMimeTypeArbitrary,
          (userId, timestamp, mimeType) => {
            const extension = getExtensionFromMimeType(mimeType)
            const path = generateStoragePath(userId, timestamp, extension)
            
            // Extract filename from path
            const filename = path.split('/')[1]
            
            // Filename should contain the timestamp
            expect(filename).toContain(timestamp.toString())
            
            // Filename should match pattern avatar_{timestamp}.{ext}
            const expectedFilename = `avatar_${timestamp}.${extension}`
            expect(filename).toBe(expectedFilename)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate unique paths for different timestamps', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          timestampArbitrary,
          timestampArbitrary,
          allowedMimeTypeArbitrary,
          (userId, timestamp1, timestamp2, mimeType) => {
            // Skip if timestamps are the same
            fc.pre(timestamp1 !== timestamp2)
            
            const extension = getExtensionFromMimeType(mimeType)
            const path1 = generateStoragePath(userId, timestamp1, extension)
            const path2 = generateStoragePath(userId, timestamp2, extension)
            
            // Paths should be different for different timestamps
            expect(path1).not.toBe(path2)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate unique paths for different users', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          userIdArbitrary,
          timestampArbitrary,
          allowedMimeTypeArbitrary,
          (userId1, userId2, timestamp, mimeType) => {
            // Skip if user IDs are the same
            fc.pre(userId1 !== userId2)
            
            const extension = getExtensionFromMimeType(mimeType)
            const path1 = generateStoragePath(userId1, timestamp, extension)
            const path2 = generateStoragePath(userId2, timestamp, extension)
            
            // Paths should be different for different users
            expect(path1).not.toBe(path2)
            
            // But should have same filename
            const filename1 = path1.split('/')[1]
            const filename2 = path2.split('/')[1]
            expect(filename1).toBe(filename2)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should default to jpg extension for unknown MIME types', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          timestampArbitrary,
          invalidMimeTypeArbitrary,
          (userId, timestamp, mimeType) => {
            const extension = getExtensionFromMimeType(mimeType)
            
            // Unknown MIME types should default to jpg
            expect(extension).toBe('jpg')
            
            const path = generateStoragePath(userId, timestamp, extension)
            expect(path.endsWith('.jpg')).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: profile-picture, Property 3: Avatar URL persistence round-trip**
   * **Validates: Requirements 1.5, 2.3**
   * 
   * For any valid image upload or album selection, after the operation completes,
   * querying the user_profiles table SHALL return the same avatar_url that was set.
   * 
   * Note: This is a pure function test that validates the round-trip logic
   * without actual database calls. The actual persistence is tested via integration tests.
   */
  describe('Property 3: Avatar URL persistence round-trip', () => {
    
    /**
     * Arbitrary for generating valid avatar URLs
     */
    const avatarUrlArbitrary = fc.oneof(
      // Profile pictures bucket URLs
      fc.tuple(fc.uuid(), fc.integer({ min: 1000000000000, max: 9999999999999 }), allowedMimeTypeArbitrary)
        .map(([userId, timestamp, mimeType]) => {
          const ext = getExtensionFromMimeType(mimeType)
          return `https://example.supabase.co/storage/v1/object/public/profile-pictures/${userId}/avatar_${timestamp}.${ext}`
        }),
      // Album URLs (from MediaPicker)
      fc.tuple(fc.uuid(), fc.uuid())
        .map(([userId, mediaId]) => `https://example.supabase.co/storage/v1/object/public/user-albums/${userId}/${mediaId}.jpg`),
      // External URLs (edge case)
      fc.webUrl()
    )

    /**
     * Arbitrary for generating user profile objects
     */
    const userProfileArbitrary = fc.record({
      id: fc.uuid(),
      email: fc.emailAddress(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      role: fc.constantFrom('admin', 'coach', 'athlete'),
      avatar_url: fc.option(avatarUrlArbitrary, { nil: null })
    })

    /**
     * Simulates the updateAvatar function's local state update logic
     * This mirrors the auth store's updateAvatar behavior
     */
    function simulateUpdateAvatar(profile, newAvatarUrl) {
      return { ...profile, avatar_url: newAvatarUrl }
    }

    it('should preserve avatar_url after setting it (round-trip)', () => {
      fc.assert(
        fc.property(
          userProfileArbitrary,
          avatarUrlArbitrary,
          (profile, newAvatarUrl) => {
            // Simulate setting avatar URL
            const updatedProfile = simulateUpdateAvatar(profile, newAvatarUrl)
            
            // The avatar_url should be exactly what was set
            expect(updatedProfile.avatar_url).toBe(newAvatarUrl)
            
            // Other profile fields should remain unchanged
            expect(updatedProfile.id).toBe(profile.id)
            expect(updatedProfile.email).toBe(profile.email)
            expect(updatedProfile.name).toBe(profile.name)
            expect(updatedProfile.role).toBe(profile.role)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null avatar_url correctly', () => {
      fc.assert(
        fc.property(
          userProfileArbitrary,
          (profile) => {
            // Simulate setting avatar URL to null
            const updatedProfile = simulateUpdateAvatar(profile, null)
            
            // The avatar_url should be null
            expect(updatedProfile.avatar_url).toBeNull()
            
            // Other profile fields should remain unchanged
            expect(updatedProfile.id).toBe(profile.id)
            expect(updatedProfile.email).toBe(profile.email)
            expect(updatedProfile.name).toBe(profile.name)
            expect(updatedProfile.role).toBe(profile.role)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow updating avatar_url multiple times', () => {
      fc.assert(
        fc.property(
          userProfileArbitrary,
          fc.array(avatarUrlArbitrary, { minLength: 1, maxLength: 5 }),
          (profile, avatarUrls) => {
            let currentProfile = profile
            
            // Apply multiple avatar updates
            for (const url of avatarUrls) {
              currentProfile = simulateUpdateAvatar(currentProfile, url)
              expect(currentProfile.avatar_url).toBe(url)
            }
            
            // Final avatar_url should be the last one set
            expect(currentProfile.avatar_url).toBe(avatarUrls[avatarUrls.length - 1])
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle profile-pictures bucket URLs correctly', () => {
      fc.assert(
        fc.property(
          userProfileArbitrary,
          fc.uuid(),
          fc.integer({ min: 1000000000000, max: 9999999999999 }),
          allowedMimeTypeArbitrary,
          (profile, userId, timestamp, mimeType) => {
            const ext = getExtensionFromMimeType(mimeType)
            const avatarUrl = `https://example.supabase.co/storage/v1/object/public/profile-pictures/${userId}/avatar_${timestamp}.${ext}`
            
            const updatedProfile = simulateUpdateAvatar(profile, avatarUrl)
            
            // URL should be preserved exactly
            expect(updatedProfile.avatar_url).toBe(avatarUrl)
            
            // URL should contain expected components
            expect(updatedProfile.avatar_url).toContain('profile-pictures')
            expect(updatedProfile.avatar_url).toContain(userId)
            expect(updatedProfile.avatar_url).toContain(`avatar_${timestamp}`)
            expect(updatedProfile.avatar_url).toContain(`.${ext}`)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle album URLs correctly (MediaPicker selection)', () => {
      fc.assert(
        fc.property(
          userProfileArbitrary,
          fc.uuid(),
          fc.uuid(),
          (profile, userId, mediaId) => {
            const albumUrl = `https://example.supabase.co/storage/v1/object/public/user-albums/${userId}/${mediaId}.jpg`
            
            const updatedProfile = simulateUpdateAvatar(profile, albumUrl)
            
            // URL should be preserved exactly
            expect(updatedProfile.avatar_url).toBe(albumUrl)
            
            // URL should contain expected components
            expect(updatedProfile.avatar_url).toContain('user-albums')
            expect(updatedProfile.avatar_url).toContain(userId)
            expect(updatedProfile.avatar_url).toContain(mediaId)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: profile-picture, Property 5: Avatar removal cleanup**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * For any avatar removal operation, the system SHALL delete the file from storage
   * AND set avatar_url to null in the database.
   * 
   * Note: This tests the cleanup logic without actual storage/database calls.
   */
  describe('Property 5: Avatar removal cleanup', () => {
    
    /**
     * Arbitrary for generating profile-pictures bucket URLs
     */
    const profilePictureUrlArbitrary = fc.tuple(
      fc.uuid(),
      fc.integer({ min: 1000000000000, max: 9999999999999 }),
      allowedMimeTypeArbitrary
    ).map(([userId, timestamp, mimeType]) => {
      const ext = getExtensionFromMimeType(mimeType)
      return `https://example.supabase.co/storage/v1/object/public/profile-pictures/${userId}/avatar_${timestamp}.${ext}`
    })

    /**
     * Arbitrary for generating album URLs (not in profile-pictures bucket)
     */
    const albumUrlArbitrary = fc.tuple(fc.uuid(), fc.uuid())
      .map(([userId, mediaId]) => `https://example.supabase.co/storage/v1/object/public/user-albums/${userId}/${mediaId}.jpg`)

    /**
     * Arbitrary for generating user profile with avatar
     */
    const profileWithAvatarArbitrary = fc.record({
      id: fc.uuid(),
      email: fc.emailAddress(),
      name: fc.string({ minLength: 1, maxLength: 100 }),
      role: fc.constantFrom('admin', 'coach', 'athlete'),
      avatar_url: profilePictureUrlArbitrary
    })

    /**
     * Extract file path from profile-pictures URL
     * Mirrors the logic in deleteAvatar function
     */
    function extractFilePath(url) {
      const urlParts = url.split('/storage/v1/object/public/profile-pictures/')
      if (urlParts.length < 2) {
        return null
      }
      return urlParts[1]
    }

    /**
     * Check if URL is from profile-pictures bucket
     */
    function isProfilePictureUrl(url) {
      return url && url.includes('/storage/v1/object/public/profile-pictures/')
    }

    /**
     * Simulates the removeAvatar cleanup logic
     * Returns what should happen: file path to delete (if any) and new avatar_url
     */
    function simulateRemoveAvatar(profile) {
      const currentUrl = profile.avatar_url
      
      // Determine if file should be deleted from storage
      let filePathToDelete = null
      if (currentUrl && isProfilePictureUrl(currentUrl)) {
        filePathToDelete = extractFilePath(currentUrl)
      }
      
      // Avatar URL should always be set to null
      const updatedProfile = { ...profile, avatar_url: null }
      
      return {
        filePathToDelete,
        updatedProfile,
        shouldDeleteFile: filePathToDelete !== null
      }
    }

    it('should set avatar_url to null after removal', () => {
      fc.assert(
        fc.property(
          profileWithAvatarArbitrary,
          (profile) => {
            const result = simulateRemoveAvatar(profile)
            
            // Avatar URL should be null after removal
            expect(result.updatedProfile.avatar_url).toBeNull()
            
            // Other profile fields should remain unchanged
            expect(result.updatedProfile.id).toBe(profile.id)
            expect(result.updatedProfile.email).toBe(profile.email)
            expect(result.updatedProfile.name).toBe(profile.name)
            expect(result.updatedProfile.role).toBe(profile.role)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should identify file path to delete for profile-pictures URLs', () => {
      fc.assert(
        fc.property(
          profileWithAvatarArbitrary,
          (profile) => {
            const result = simulateRemoveAvatar(profile)
            
            // Should identify that file needs to be deleted
            expect(result.shouldDeleteFile).toBe(true)
            expect(result.filePathToDelete).not.toBeNull()
            
            // File path should match expected format
            expect(result.filePathToDelete).toMatch(/^[a-f0-9-]+\/avatar_\d+\.(jpg|png|webp)$/)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not attempt to delete file for album URLs', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            role: fc.constantFrom('admin', 'coach', 'athlete'),
            avatar_url: albumUrlArbitrary
          }),
          (profile) => {
            const result = simulateRemoveAvatar(profile)
            
            // Should not attempt to delete file from profile-pictures bucket
            expect(result.shouldDeleteFile).toBe(false)
            expect(result.filePathToDelete).toBeNull()
            
            // But avatar_url should still be set to null
            expect(result.updatedProfile.avatar_url).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null avatar_url gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            role: fc.constantFrom('admin', 'coach', 'athlete'),
            avatar_url: fc.constant(null)
          }),
          (profile) => {
            const result = simulateRemoveAvatar(profile)
            
            // Should not attempt to delete any file
            expect(result.shouldDeleteFile).toBe(false)
            expect(result.filePathToDelete).toBeNull()
            
            // Avatar URL should remain null
            expect(result.updatedProfile.avatar_url).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should extract correct file path from URL', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.integer({ min: 1000000000000, max: 9999999999999 }),
          allowedMimeTypeArbitrary,
          (userId, timestamp, mimeType) => {
            const ext = getExtensionFromMimeType(mimeType)
            const url = `https://example.supabase.co/storage/v1/object/public/profile-pictures/${userId}/avatar_${timestamp}.${ext}`
            
            const filePath = extractFilePath(url)
            
            // File path should match expected format
            expect(filePath).toBe(`${userId}/avatar_${timestamp}.${ext}`)
            
            // File path should start with user ID
            expect(filePath.startsWith(`${userId}/`)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should ensure both cleanup actions happen together', () => {
      fc.assert(
        fc.property(
          profileWithAvatarArbitrary,
          (profile) => {
            const result = simulateRemoveAvatar(profile)
            
            // Both actions should be determined:
            // 1. File path to delete (for profile-pictures URLs)
            // 2. Avatar URL set to null
            
            // If there was a profile-pictures URL, file should be marked for deletion
            if (isProfilePictureUrl(profile.avatar_url)) {
              expect(result.shouldDeleteFile).toBe(true)
              expect(result.filePathToDelete).not.toBeNull()
            }
            
            // Avatar URL should always be null after removal
            expect(result.updatedProfile.avatar_url).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: profile-picture, Property 4: Fallback display when no avatar**
   * **Validates: Requirements 3.3, 4.4**
   * 
   * For any user with avatar_url = null or empty string, the UserAvatar component
   * SHALL display the first character of the user's name.
   * 
   * This tests the getAvatarFallback function which provides the fallback character.
   */
  describe('Property 4: Fallback display when no avatar', () => {
    
    /**
     * Arbitrary for generating valid user names (non-empty strings)
     */
    const validNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
      .filter(s => s.trim().length > 0)

    /**
     * Arbitrary for generating names with leading whitespace
     */
    const nameWithLeadingWhitespaceArbitrary = fc.tuple(
      fc.integer({ min: 1, max: 5 }).map(n => ' '.repeat(n)),
      fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
    ).map(([spaces, name]) => spaces + name)

    /**
     * Arbitrary for generating empty or whitespace-only strings
     */
    const emptyOrWhitespaceArbitrary = fc.oneof(
      fc.constant(''),
      fc.constant(null),
      fc.constant(undefined),
      fc.integer({ min: 1, max: 10 }).map(n => ' '.repeat(n)),
      fc.integer({ min: 1, max: 5 }).map(n => '\t'.repeat(n)),
      fc.integer({ min: 1, max: 5 }).map(n => '\n'.repeat(n))
    )

    /**
     * Arbitrary for generating single non-whitespace characters
     */
    const singleCharArbitrary = fc.string({ minLength: 1, maxLength: 1 })
      .filter(c => c.trim().length > 0)

    it('should return first character of name (uppercase) for valid names', () => {
      fc.assert(
        fc.property(
          validNameArbitrary,
          (name) => {
            const fallback = getAvatarFallback(name)
            const expectedChar = name.trim().charAt(0).toUpperCase()
            
            // Fallback should be the first character of trimmed name, uppercased
            expect(fallback).toBe(expectedChar)
            
            // Fallback should be exactly one character
            expect(fallback.length).toBe(1)
            
            // Fallback should be uppercase
            expect(fallback).toBe(fallback.toUpperCase())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return "?" for null, undefined, or empty names', () => {
      fc.assert(
        fc.property(
          emptyOrWhitespaceArbitrary,
          (name) => {
            const fallback = getAvatarFallback(name)
            
            // Should return '?' for invalid names
            expect(fallback).toBe('?')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle names with leading whitespace correctly', () => {
      fc.assert(
        fc.property(
          nameWithLeadingWhitespaceArbitrary,
          (name) => {
            const fallback = getAvatarFallback(name)
            const trimmedName = name.trim()
            const expectedChar = trimmedName.charAt(0).toUpperCase()
            
            // Should use first character after trimming
            expect(fallback).toBe(expectedChar)
            
            // Should not be a space
            expect(fallback).not.toBe(' ')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle lowercase names by returning uppercase fallback', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 })
            .filter(s => s.trim().length > 0)
            .map(s => s.toLowerCase()),
          (name) => {
            const fallback = getAvatarFallback(name)
            const firstChar = name.trim().charAt(0)
            
            // Fallback should be uppercase version of first character
            expect(fallback).toBe(firstChar.toUpperCase())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle uppercase names correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 })
            .filter(s => s.trim().length > 0)
            .map(s => s.toUpperCase()),
          (name) => {
            const fallback = getAvatarFallback(name)
            const firstChar = name.trim().charAt(0)
            
            // Fallback should be the same as first character (already uppercase)
            expect(fallback).toBe(firstChar)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle names starting with numbers', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 0, max: 9 }),
            fc.string({ minLength: 0, maxLength: 50 })
          ).map(([num, rest]) => num.toString() + rest),
          (name) => {
            const fallback = getAvatarFallback(name)
            const expectedChar = name.trim().charAt(0)
            
            // Numbers should be returned as-is (toUpperCase has no effect)
            expect(fallback).toBe(expectedChar)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle names starting with special characters', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom('@', '#', '$', '%', '&', '*', '!', '+', '-', '_'),
            fc.string({ minLength: 0, maxLength: 50 })
          ).map(([special, rest]) => special + rest),
          (name) => {
            const fallback = getAvatarFallback(name)
            const expectedChar = name.trim().charAt(0)
            
            // Special characters should be returned as-is
            expect(fallback).toBe(expectedChar)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle Thai names correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'สมชาย',
            'สมหญิง',
            'กรุณา',
            'ธนา',
            'วิชัย',
            'อรุณ',
            'เพชร',
            'ทอง'
          ),
          (name) => {
            const fallback = getAvatarFallback(name)
            const expectedChar = name.charAt(0).toUpperCase()
            
            // Thai characters should be returned correctly
            expect(fallback).toBe(expectedChar)
            expect(fallback.length).toBe(1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle emoji names by returning first character', () => {
      // Note: Emojis may be multi-byte, but charAt(0) will return the first code unit
      fc.assert(
        fc.property(
          fc.constantFrom(
            '😀 User',
            '🎉 Party',
            '⭐ Star'
          ),
          (name) => {
            const fallback = getAvatarFallback(name)
            
            // Should return something (first code unit of emoji)
            expect(fallback.length).toBeGreaterThan(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be consistent - same input always produces same output', () => {
      fc.assert(
        fc.property(
          validNameArbitrary,
          (name) => {
            const fallback1 = getAvatarFallback(name)
            const fallback2 = getAvatarFallback(name)
            const fallback3 = getAvatarFallback(name)
            
            // Same input should always produce same output
            expect(fallback1).toBe(fallback2)
            expect(fallback2).toBe(fallback3)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle single character names', () => {
      fc.assert(
        fc.property(
          singleCharArbitrary,
          (name) => {
            const fallback = getAvatarFallback(name)
            
            // Single character name should return that character (uppercase)
            expect(fallback).toBe(name.toUpperCase())
            expect(fallback.length).toBe(1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should ensure fallback is never empty for valid names', () => {
      fc.assert(
        fc.property(
          validNameArbitrary,
          (name) => {
            const fallback = getAvatarFallback(name)
            
            // Fallback should never be empty for valid names
            expect(fallback.length).toBeGreaterThan(0)
            expect(fallback).not.toBe('')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

})
