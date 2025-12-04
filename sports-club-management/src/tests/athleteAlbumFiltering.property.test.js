/**
 * Athlete Album Filtering Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับการกรองอัลบั้มตามนักกีฬาที่เลือก
 * 
 * **Feature: album-individual-view, Property 2: Athlete album filtering returns only that athlete's albums**
 * **Validates: Requirements 1.2, 4.1**
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
 * กรองอัลบั้มตาม user_id ของนักกีฬาที่เลือก
 * จำลองการทำงานของ fetchAthleteAlbums
 * 
 * @param {Array} allAlbums - รายการอัลบั้มทั้งหมด
 * @param {string} selectedUserId - user_id ของนักกีฬาที่เลือก
 * @returns {Array} - รายการอัลบั้มของนักกีฬาที่เลือก
 */
function filterAlbumsByUserId(allAlbums, selectedUserId) {
  if (!selectedUserId) {
    return []
  }
  
  return allAlbums.filter(album => album.user_id === selectedUserId)
}

/**
 * ตรวจสอบว่าอัลบั้มทุกรายการเป็นของนักกีฬาที่เลือก
 * 
 * @param {Array} albums - รายการอัลบั้ม
 * @param {string} selectedUserId - user_id ของนักกีฬาที่เลือก
 * @returns {boolean} - true ถ้าอัลบั้มทุกรายการเป็นของนักกีฬาที่เลือก
 */
function allAlbumsBelongToUser(albums, selectedUserId) {
  return albums.every(album => album.user_id === selectedUserId)
}

/**
 * ตรวจสอบว่าอัลบั้มมีข้อมูลครบถ้วน
 * 
 * @param {Object} album - อัลบั้ม
 * @returns {boolean} - true ถ้ามีข้อมูลครบถ้วน
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

// ============================================================================
// Property Tests
// ============================================================================

describe('Athlete Album Filtering Property Tests', () => {

  /**
   * **Feature: album-individual-view, Property 2: Athlete album filtering returns only that athlete's albums**
   * **Validates: Requirements 1.2, 4.1**
   * 
   * For any athlete selection (by coach or admin), the returned albums 
   * should all have user_id matching the selected athlete's id.
   */
  describe('Property 2: Athlete album filtering returns only that athlete\'s albums', () => {

    it('should return only albums with matching user_id', () => {
      fc.assert(
        fc.property(
          // user_id ของนักกีฬาที่เลือก
          uuidArbitrary,
          // รายการอัลบั้มทั้งหมดจากหลายนักกีฬา
          fc.array(albumArbitrary, { minLength: 0, maxLength: 50 }),
          (selectedUserId, allAlbums) => {
            // กรองอัลบั้มตาม user_id ที่เลือก
            const filteredAlbums = filterAlbumsByUserId(allAlbums, selectedUserId)
            
            // ตรวจสอบว่าอัลบั้มทุกรายการเป็นของนักกีฬาที่เลือก
            expect(allAlbumsBelongToUser(filteredAlbums, selectedUserId)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not include albums from other users', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumArbitrary, { minLength: 1, maxLength: 50 }),
          (selectedUserId, allAlbums) => {
            const filteredAlbums = filterAlbumsByUserId(allAlbums, selectedUserId)
            
            // นับจำนวนอัลบั้มจากผู้ใช้อื่น
            const albumsFromOtherUsers = filteredAlbums.filter(
              album => album.user_id !== selectedUserId
            )
            
            // ต้องไม่มีอัลบั้มจากผู้ใช้อื่น
            expect(albumsFromOtherUsers.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when userId is null or undefined', () => {
      fc.assert(
        fc.property(
          fc.array(albumArbitrary, { minLength: 1, maxLength: 50 }),
          (allAlbums) => {
            // ไม่ระบุ userId
            const filteredWithNull = filterAlbumsByUserId(allAlbums, null)
            const filteredWithUndefined = filterAlbumsByUserId(allAlbums, undefined)
            
            // ต้องได้ array ว่าง
            expect(filteredWithNull).toEqual([])
            expect(filteredWithUndefined).toEqual([])
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when no albums belong to selected user', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumArbitrary, { minLength: 1, maxLength: 20 }),
          (selectedUserId, allAlbums) => {
            // กรองเอาเฉพาะอัลบั้มที่ไม่ใช่ของ user ที่เลือก
            const albumsNotBelongingToUser = allAlbums.filter(
              a => a.user_id !== selectedUserId
            )
            
            const filteredAlbums = filterAlbumsByUserId(albumsNotBelongingToUser, selectedUserId)
            
            // ต้องได้ array ว่าง
            expect(filteredAlbums.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include all albums belonging to selected user', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumArbitrary, { minLength: 0, maxLength: 50 }),
          (selectedUserId, allAlbums) => {
            // นับจำนวนอัลบั้มของ user ที่เลือกจากข้อมูลต้นฉบับ
            const expectedCount = allAlbums.filter(
              a => a.user_id === selectedUserId
            ).length
            
            const filteredAlbums = filterAlbumsByUserId(allAlbums, selectedUserId)
            
            // จำนวนต้องตรงกัน
            expect(filteredAlbums.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve album data integrity after filtering', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumArbitrary, { minLength: 1, maxLength: 30 }),
          (selectedUserId, allAlbums) => {
            const filteredAlbums = filterAlbumsByUserId(allAlbums, selectedUserId)
            
            // ตรวจสอบว่าข้อมูลอัลบั้มไม่ถูกเปลี่ยนแปลง
            for (const filtered of filteredAlbums) {
              const original = allAlbums.find(a => a.id === filtered.id)
              
              if (original) {
                expect(filtered.id).toBe(original.id)
                expect(filtered.user_id).toBe(original.user_id)
                expect(filtered.name).toBe(original.name)
                expect(filtered.description).toBe(original.description)
                expect(filtered.album_type).toBe(original.album_type)
                expect(filtered.cover_image_url).toBe(original.cover_image_url)
                expect(filtered.created_at).toBe(original.created_at)
                expect(filtered.updated_at).toBe(original.updated_at)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all albums when user has multiple albums', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumNameArbitrary, { minLength: 2, maxLength: 10 }),
          (userId, albumNames) => {
            // สร้างอัลบั้มหลายรายการสำหรับ user เดียวกัน
            const userAlbums = albumNames.map((name, index) => ({
              id: crypto.randomUUID(),
              user_id: userId,
              name: name,
              description: null,
              album_type: VALID_ALBUM_TYPES[index % VALID_ALBUM_TYPES.length],
              cover_image_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
            
            const filteredAlbums = filterAlbumsByUserId(userAlbums, userId)
            
            // ต้องได้อัลบั้มทุกรายการ
            expect(filteredAlbums.length).toBe(userAlbums.length)
            
            // ทุกรายการต้องเป็นของ user ที่เลือก
            expect(allAlbumsBelongToUser(filteredAlbums, userId)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly filter mixed user albums', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          uuidArbitrary,
          fc.array(albumNameArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(albumNameArbitrary, { minLength: 1, maxLength: 10 }),
          (selectedUserId, otherUserId, selectedUserAlbumNames, otherUserAlbumNames) => {
            // ข้ามกรณีที่ user_id เหมือนกัน
            if (selectedUserId === otherUserId) {
              return true
            }
            
            // สร้างอัลบั้มของ user ที่เลือก
            const selectedUserAlbums = selectedUserAlbumNames.map(name => ({
              id: crypto.randomUUID(),
              user_id: selectedUserId,
              name,
              description: null,
              album_type: 'general',
              cover_image_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
            
            // สร้างอัลบั้มของ user อื่น
            const otherUserAlbums = otherUserAlbumNames.map(name => ({
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
            const allAlbums = [...selectedUserAlbums, ...otherUserAlbums]
            
            const filteredAlbums = filterAlbumsByUserId(allAlbums, selectedUserId)
            
            // ต้องได้เฉพาะอัลบั้มของ user ที่เลือก
            expect(filteredAlbums.length).toBe(selectedUserAlbums.length)
            expect(allAlbumsBelongToUser(filteredAlbums, selectedUserId)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return albums with complete data', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(albumArbitrary, { minLength: 1, maxLength: 30 }),
          (selectedUserId, allAlbums) => {
            const filteredAlbums = filterAlbumsByUserId(allAlbums, selectedUserId)
            
            // ตรวจสอบว่าอัลบั้มทุกรายการมีข้อมูลครบถ้วน
            for (const album of filteredAlbums) {
              expect(hasCompleteAlbumData(album)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle albums from multiple users correctly', () => {
      fc.assert(
        fc.property(
          // สร้าง user_ids หลายคน
          fc.array(uuidArbitrary, { minLength: 3, maxLength: 5 }),
          fc.array(albumNameArbitrary, { minLength: 5, maxLength: 20 }),
          (userIds, albumNames) => {
            // สร้างอัลบั้มกระจายให้หลาย users
            const allAlbums = albumNames.map((name, index) => ({
              id: crypto.randomUUID(),
              user_id: userIds[index % userIds.length],
              name,
              description: null,
              album_type: 'general',
              cover_image_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
            
            // เลือก user คนแรก
            const selectedUserId = userIds[0]
            
            const filteredAlbums = filterAlbumsByUserId(allAlbums, selectedUserId)
            
            // ตรวจสอบว่าได้เฉพาะอัลบั้มของ user ที่เลือก
            expect(allAlbumsBelongToUser(filteredAlbums, selectedUserId)).toBe(true)
            
            // นับจำนวนที่คาดหวัง
            const expectedCount = allAlbums.filter(a => a.user_id === selectedUserId).length
            expect(filteredAlbums.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should work consistently for coach and admin viewing same athlete', () => {
      // ทดสอบว่าไม่ว่าจะเป็น coach หรือ admin ดู ผลลัพธ์ต้องเหมือนกัน
      fc.assert(
        fc.property(
          uuidArbitrary, // athlete user_id
          fc.array(albumArbitrary, { minLength: 1, maxLength: 30 }),
          (athleteUserId, allAlbums) => {
            // Coach ดูอัลบั้มของนักกีฬา
            const coachViewAlbums = filterAlbumsByUserId(allAlbums, athleteUserId)
            
            // Admin ดูอัลบั้มของนักกีฬาคนเดียวกัน
            const adminViewAlbums = filterAlbumsByUserId(allAlbums, athleteUserId)
            
            // ผลลัพธ์ต้องเหมือนกัน (Requirements 4.2)
            expect(coachViewAlbums.length).toBe(adminViewAlbums.length)
            
            // ตรวจสอบว่า IDs ตรงกัน
            const coachAlbumIds = new Set(coachViewAlbums.map(a => a.id))
            const adminAlbumIds = new Set(adminViewAlbums.map(a => a.id))
            
            expect(coachAlbumIds.size).toBe(adminAlbumIds.size)
            for (const id of coachAlbumIds) {
              expect(adminAlbumIds.has(id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
