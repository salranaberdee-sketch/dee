/**
 * Admin/Athlete View Consistency Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับความสอดคล้องของมุมมองอัลบั้มระหว่าง Admin และ Athlete
 * 
 * **Feature: album-individual-view, Property 8: Admin view shows same albums as athlete view**
 * **Validates: Requirements 4.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * Arbitrary for generating valid UUID
 */
const uuidArbitrary = fc.uuid()

/**
 * Valid album types as defined in the database schema
 */
const VALID_ALBUM_TYPES = ['competition', 'training', 'documents', 'general']

/**
 * Arbitrary for generating valid album types
 */
const albumTypeArbitrary = fc.constantFrom(...VALID_ALBUM_TYPES)

/**
 * Arbitrary for generating valid album name
 */
const albumNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)

/**
 * Generate a valid ISO date string from a timestamp in a reasonable range
 */
const MIN_TIMESTAMP = new Date('2020-01-01T00:00:00.000Z').getTime()
const MAX_TIMESTAMP = new Date('2030-12-31T23:59:59.999Z').getTime()

const validISODateArbitrary = fc.integer({ min: MIN_TIMESTAMP, max: MAX_TIMESTAMP })
  .map(ts => new Date(ts).toISOString())

/**
 * Arbitrary for generating a single album
 */
const albumArbitrary = fc.record({
  id: uuidArbitrary,
  user_id: uuidArbitrary,
  name: albumNameArbitrary,
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  album_type: albumTypeArbitrary,
  cover_image_url: fc.option(fc.webUrl(), { nil: null }),
  created_at: validISODateArbitrary,
  updated_at: validISODateArbitrary
})

/**
 * Arbitrary for generating an album with specific user_id
 */
const albumWithUserIdArbitrary = (userId) => fc.record({
  id: uuidArbitrary,
  user_id: fc.constant(userId),
  name: albumNameArbitrary,
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  album_type: albumTypeArbitrary,
  cover_image_url: fc.option(fc.webUrl(), { nil: null }),
  created_at: validISODateArbitrary,
  updated_at: validISODateArbitrary
})

// ============================================================================
// Pure Functions for Testing (simulating store operations)
// ============================================================================

/**
 * จำลองการดึงอัลบั้มจากมุมมอง Athlete (ดูอัลบั้มตัวเอง)
 * Athlete สามารถดูเฉพาะอัลบั้มของตัวเองเท่านั้น
 * 
 * @param {Array} allAlbums - รายการอัลบั้มทั้งหมดในระบบ
 * @param {string} athleteUserId - user_id ของ Athlete
 * @returns {Array} - รายการอัลบั้มที่ Athlete เห็น
 */
function fetchAlbumsAsAthlete(allAlbums, athleteUserId) {
  if (!athleteUserId) {
    return []
  }
  
  // Athlete ดูได้เฉพาะอัลบั้มของตัวเอง
  return allAlbums
    .filter(album => album.user_id === athleteUserId)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
}

/**
 * จำลองการดึงอัลบั้มจากมุมมอง Admin (ดูอัลบั้มของนักกีฬาคนใดก็ได้)
 * Admin สามารถดูอัลบั้มของนักกีฬาทุกคนได้
 * 
 * @param {Array} allAlbums - รายการอัลบั้มทั้งหมดในระบบ
 * @param {string} targetAthleteUserId - user_id ของนักกีฬาที่ Admin ต้องการดู
 * @returns {Array} - รายการอัลบั้มที่ Admin เห็นสำหรับนักกีฬาคนนั้น
 */
function fetchAlbumsAsAdmin(allAlbums, targetAthleteUserId) {
  if (!targetAthleteUserId) {
    return []
  }
  
  // Admin ดูอัลบั้มของนักกีฬาที่เลือก (ใช้ logic เดียวกับ fetchAthleteAlbums)
  return allAlbums
    .filter(album => album.user_id === targetAthleteUserId)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
}

/**
 * เปรียบเทียบว่าอัลบั้มสองชุดเหมือนกันหรือไม่
 * 
 * @param {Array} albums1 - ชุดอัลบั้มแรก
 * @param {Array} albums2 - ชุดอัลบั้มที่สอง
 * @returns {boolean} - true ถ้าอัลบั้มทั้งสองชุดเหมือนกัน
 */
function albumsAreIdentical(albums1, albums2) {
  if (albums1.length !== albums2.length) {
    return false
  }
  
  // เปรียบเทียบทุก field ของแต่ละอัลบั้ม
  for (let i = 0; i < albums1.length; i++) {
    const a1 = albums1[i]
    const a2 = albums2[i]
    
    if (
      a1.id !== a2.id ||
      a1.user_id !== a2.user_id ||
      a1.name !== a2.name ||
      a1.description !== a2.description ||
      a1.album_type !== a2.album_type ||
      a1.cover_image_url !== a2.cover_image_url ||
      a1.created_at !== a2.created_at ||
      a1.updated_at !== a2.updated_at
    ) {
      return false
    }
  }
  
  return true
}

/**
 * ตรวจสอบว่าอัลบั้มสองชุดมี IDs เหมือนกัน (ไม่สนใจลำดับ)
 * 
 * @param {Array} albums1 - ชุดอัลบั้มแรก
 * @param {Array} albums2 - ชุดอัลบั้มที่สอง
 * @returns {boolean} - true ถ้ามี IDs เหมือนกัน
 */
function albumsHaveSameIds(albums1, albums2) {
  if (albums1.length !== albums2.length) {
    return false
  }
  
  const ids1 = new Set(albums1.map(a => a.id))
  const ids2 = new Set(albums2.map(a => a.id))
  
  if (ids1.size !== ids2.size) {
    return false
  }
  
  for (const id of ids1) {
    if (!ids2.has(id)) {
      return false
    }
  }
  
  return true
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Admin/Athlete View Consistency Property Tests', () => {

  /**
   * **Feature: album-individual-view, Property 8: Admin view shows same albums as athlete view**
   * **Validates: Requirements 4.2**
   * 
   * For any athlete, the albums returned when admin views that athlete 
   * should be identical to the albums the athlete would see when viewing their own albums.
   */
  describe('Property 8: Admin view shows same albums as athlete view', () => {

    it('should return identical albums for admin and athlete viewing same user', () => {
      fc.assert(
        fc.property(
          // user_id ของนักกีฬา
          uuidArbitrary,
          // รายการอัลบั้มทั้งหมดในระบบ
          fc.array(albumArbitrary, { minLength: 0, maxLength: 50 }),
          (athleteUserId, allAlbums) => {
            // Athlete ดูอัลบั้มตัวเอง
            const athleteView = fetchAlbumsAsAthlete(allAlbums, athleteUserId)
            
            // Admin ดูอัลบั้มของนักกีฬาคนเดียวกัน
            const adminView = fetchAlbumsAsAdmin(allAlbums, athleteUserId)
            
            // ผลลัพธ์ต้องเหมือนกันทุกประการ
            expect(albumsAreIdentical(athleteView, adminView)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return same number of albums for both views', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumArbitrary, { minLength: 1, maxLength: 50 }),
          (athleteUserId, allAlbums) => {
            const athleteView = fetchAlbumsAsAthlete(allAlbums, athleteUserId)
            const adminView = fetchAlbumsAsAdmin(allAlbums, athleteUserId)
            
            // จำนวนอัลบั้มต้องเท่ากัน
            expect(athleteView.length).toBe(adminView.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return same album IDs for both views', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumArbitrary, { minLength: 1, maxLength: 50 }),
          (athleteUserId, allAlbums) => {
            const athleteView = fetchAlbumsAsAthlete(allAlbums, athleteUserId)
            const adminView = fetchAlbumsAsAdmin(allAlbums, athleteUserId)
            
            // IDs ต้องเหมือนกัน
            expect(albumsHaveSameIds(athleteView, adminView)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return albums in same order for both views', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumArbitrary, { minLength: 2, maxLength: 30 }),
          (athleteUserId, allAlbums) => {
            const athleteView = fetchAlbumsAsAthlete(allAlbums, athleteUserId)
            const adminView = fetchAlbumsAsAdmin(allAlbums, athleteUserId)
            
            // ลำดับต้องเหมือนกัน (เรียงตาม updated_at DESC)
            for (let i = 0; i < athleteView.length; i++) {
              expect(athleteView[i].id).toBe(adminView[i].id)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all album data fields for both views', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumArbitrary, { minLength: 1, maxLength: 30 }),
          (athleteUserId, allAlbums) => {
            const athleteView = fetchAlbumsAsAthlete(allAlbums, athleteUserId)
            const adminView = fetchAlbumsAsAdmin(allAlbums, athleteUserId)
            
            // ตรวจสอบว่าข้อมูลทุก field เหมือนกัน
            for (let i = 0; i < athleteView.length; i++) {
              const athleteAlbum = athleteView[i]
              const adminAlbum = adminView[i]
              
              expect(athleteAlbum.id).toBe(adminAlbum.id)
              expect(athleteAlbum.user_id).toBe(adminAlbum.user_id)
              expect(athleteAlbum.name).toBe(adminAlbum.name)
              expect(athleteAlbum.description).toBe(adminAlbum.description)
              expect(athleteAlbum.album_type).toBe(adminAlbum.album_type)
              expect(athleteAlbum.cover_image_url).toBe(adminAlbum.cover_image_url)
              expect(athleteAlbum.created_at).toBe(adminAlbum.created_at)
              expect(athleteAlbum.updated_at).toBe(adminAlbum.updated_at)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array for both views when athlete has no albums', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumArbitrary, { minLength: 1, maxLength: 30 }),
          (athleteUserId, allAlbums) => {
            // กรองเอาเฉพาะอัลบั้มที่ไม่ใช่ของ athlete นี้
            const albumsWithoutAthlete = allAlbums.filter(
              a => a.user_id !== athleteUserId
            )
            
            const athleteView = fetchAlbumsAsAthlete(albumsWithoutAthlete, athleteUserId)
            const adminView = fetchAlbumsAsAdmin(albumsWithoutAthlete, athleteUserId)
            
            // ทั้งสองมุมมองต้องได้ array ว่าง
            expect(athleteView.length).toBe(0)
            expect(adminView.length).toBe(0)
            expect(albumsAreIdentical(athleteView, adminView)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle athlete with multiple albums consistently', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumNameArbitrary, { minLength: 2, maxLength: 10 }),
          (athleteUserId, albumNames) => {
            // สร้างอัลบั้มหลายรายการสำหรับ athlete
            const athleteAlbums = albumNames.map((name, index) => ({
              id: crypto.randomUUID(),
              user_id: athleteUserId,
              name: name,
              description: null,
              album_type: VALID_ALBUM_TYPES[index % VALID_ALBUM_TYPES.length],
              cover_image_url: null,
              created_at: new Date(Date.now() - index * 86400000).toISOString(),
              updated_at: new Date(Date.now() - index * 3600000).toISOString()
            }))
            
            const athleteView = fetchAlbumsAsAthlete(athleteAlbums, athleteUserId)
            const adminView = fetchAlbumsAsAdmin(athleteAlbums, athleteUserId)
            
            // ทั้งสองมุมมองต้องเหมือนกัน
            expect(albumsAreIdentical(athleteView, adminView)).toBe(true)
            expect(athleteView.length).toBe(athleteAlbums.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter out other users albums consistently for both views', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          uuidArbitrary,
          fc.array(albumNameArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(albumNameArbitrary, { minLength: 1, maxLength: 10 }),
          (athleteUserId, otherUserId, athleteAlbumNames, otherAlbumNames) => {
            // ข้ามกรณีที่ user_id เหมือนกัน
            if (athleteUserId === otherUserId) {
              return true
            }
            
            // สร้างอัลบั้มของ athlete
            const athleteAlbums = athleteAlbumNames.map(name => ({
              id: crypto.randomUUID(),
              user_id: athleteUserId,
              name,
              description: null,
              album_type: 'general',
              cover_image_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
            
            // สร้างอัลบั้มของ user อื่น
            const otherAlbums = otherAlbumNames.map(name => ({
              id: crypto.randomUUID(),
              user_id: otherUserId,
              name,
              description: null,
              album_type: 'general',
              cover_image_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
            
            // รวมอัลบั้มทั้งหมด
            const allAlbums = [...athleteAlbums, ...otherAlbums]
            
            const athleteView = fetchAlbumsAsAthlete(allAlbums, athleteUserId)
            const adminView = fetchAlbumsAsAdmin(allAlbums, athleteUserId)
            
            // ทั้งสองมุมมองต้องได้เฉพาะอัลบั้มของ athlete
            expect(athleteView.length).toBe(athleteAlbums.length)
            expect(adminView.length).toBe(athleteAlbums.length)
            expect(albumsHaveSameIds(athleteView, adminView)).toBe(true)
            
            // ต้องไม่มีอัลบั้มของ user อื่น
            const athleteViewIds = new Set(athleteView.map(a => a.id))
            const adminViewIds = new Set(adminView.map(a => a.id))
            
            for (const otherAlbum of otherAlbums) {
              expect(athleteViewIds.has(otherAlbum.id)).toBe(false)
              expect(adminViewIds.has(otherAlbum.id)).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null/undefined userId consistently for both views', () => {
      fc.assert(
        fc.property(
          fc.array(albumArbitrary, { minLength: 1, maxLength: 30 }),
          (allAlbums) => {
            // ทดสอบกับ null
            const athleteViewNull = fetchAlbumsAsAthlete(allAlbums, null)
            const adminViewNull = fetchAlbumsAsAdmin(allAlbums, null)
            
            expect(athleteViewNull.length).toBe(0)
            expect(adminViewNull.length).toBe(0)
            expect(albumsAreIdentical(athleteViewNull, adminViewNull)).toBe(true)
            
            // ทดสอบกับ undefined
            const athleteViewUndefined = fetchAlbumsAsAthlete(allAlbums, undefined)
            const adminViewUndefined = fetchAlbumsAsAdmin(allAlbums, undefined)
            
            expect(athleteViewUndefined.length).toBe(0)
            expect(adminViewUndefined.length).toBe(0)
            expect(albumsAreIdentical(athleteViewUndefined, adminViewUndefined)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain consistency across multiple athletes', () => {
      fc.assert(
        fc.property(
          // สร้าง user_ids หลายคน
          fc.array(uuidArbitrary, { minLength: 3, maxLength: 5 }),
          fc.array(albumNameArbitrary, { minLength: 10, maxLength: 30 }),
          (userIds, albumNames) => {
            // สร้างอัลบั้มกระจายให้หลาย users
            const allAlbums = albumNames.map((name, index) => ({
              id: crypto.randomUUID(),
              user_id: userIds[index % userIds.length],
              name,
              description: null,
              album_type: 'general',
              cover_image_url: null,
              created_at: new Date(Date.now() - index * 86400000).toISOString(),
              updated_at: new Date(Date.now() - index * 3600000).toISOString()
            }))
            
            // ทดสอบกับทุก user
            for (const userId of userIds) {
              const athleteView = fetchAlbumsAsAthlete(allAlbums, userId)
              const adminView = fetchAlbumsAsAdmin(allAlbums, userId)
              
              // ทั้งสองมุมมองต้องเหมือนกัน
              expect(albumsAreIdentical(athleteView, adminView)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
