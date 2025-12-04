/**
 * Athlete Statistics Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับความถูกต้องของสถิติอัลบั้มนักกีฬา
 * 
 * **Feature: album-individual-view, Property 10: Athlete statistics are complete and accurate**
 * **Validates: Requirements 6.1, 6.2, 6.3**
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
 * Arbitrary for generating valid file size (0 to 100MB)
 */
const fileSizeArbitrary = fc.integer({ min: 0, max: 100 * 1024 * 1024 })

/**
 * Arbitrary for generating a single album
 */
const albumArbitrary = (userId) => fc.record({
  id: uuidArbitrary,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  user_id: fc.constant(userId)
})

/**
 * Arbitrary for generating a single media item
 */
const mediaArbitrary = (userId) => fc.record({
  id: uuidArbitrary,
  file_size: fileSizeArbitrary,
  user_id: fc.constant(userId)
})

// ============================================================================
// Pure Functions for Testing (simulating store operations)
// ============================================================================

/**
 * คำนวณสถิติอัลบั้มของนักกีฬา
 * จำลองการทำงานของ getAthleteStats
 * 
 * @param {string} userId - รหัสนักกีฬา
 * @param {Array} albums - รายการอัลบั้มทั้งหมด
 * @param {Array} media - รายการไฟล์ทั้งหมด
 * @returns {Object} - สถิติอัลบั้ม { album_count, media_count, storage_used }
 */
function calculateAthleteStats(userId, albums, media) {
  if (!userId) {
    return { album_count: 0, media_count: 0, storage_used: 0 }
  }

  // นับจำนวนอัลบั้มของนักกีฬา
  const albumCount = albums.filter(a => a.user_id === userId).length

  // นับจำนวนไฟล์และขนาดรวมของนักกีฬา
  const athleteMedia = media.filter(m => m.user_id === userId)
  const mediaCount = athleteMedia.length
  const storageUsed = athleteMedia.reduce((sum, m) => sum + (m.file_size || 0), 0)

  return {
    album_count: albumCount,
    media_count: mediaCount,
    storage_used: storageUsed
  }
}

/**
 * ตรวจสอบความถูกต้องของสถิตินักกีฬา
 * 
 * @param {Object} stats - สถิติที่คำนวณได้
 * @param {string} userId - รหัสนักกีฬา
 * @param {Array} albums - รายการอัลบั้มทั้งหมด
 * @param {Array} media - รายการไฟล์ทั้งหมด
 * @returns {boolean} - true ถ้าสถิติถูกต้อง
 */
function verifyAthleteStats(stats, userId, albums, media) {
  // คำนวณค่าที่คาดหวัง
  const expectedAlbums = albums.filter(a => a.user_id === userId).length
  const athleteMedia = media.filter(m => m.user_id === userId)
  const expectedMedia = athleteMedia.length
  const expectedStorage = athleteMedia.reduce((sum, m) => sum + (m.file_size || 0), 0)

  return (
    stats.album_count === expectedAlbums &&
    stats.media_count === expectedMedia &&
    stats.storage_used === expectedStorage
  )
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Athlete Statistics Property Tests', () => {

  /**
   * **Feature: album-individual-view, Property 10: Athlete statistics are complete and accurate**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   * 
   * For any athlete in the list, the displayed statistics (album_count, media_count, storage_used)
   * should match the actual count and sum of their albums and media.
   */
  describe('Property 10: Athlete statistics are complete and accurate', () => {

    it('should return zero statistics for athlete with no data', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          (userId) => {
            // คำนวณสถิติโดยไม่มีข้อมูล
            const stats = calculateAthleteStats(userId, [], [])

            // ต้องได้สถิติเป็น 0 ทั้งหมด
            expect(stats.album_count).toBe(0)
            expect(stats.media_count).toBe(0)
            expect(stats.storage_used).toBe(0)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return zero statistics for null/undefined userId', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant('')),
          fc.array(fc.record({ id: uuidArbitrary, user_id: uuidArbitrary }), { maxLength: 10 }),
          fc.array(fc.record({ id: uuidArbitrary, file_size: fileSizeArbitrary, user_id: uuidArbitrary }), { maxLength: 10 }),
          (userId, albums, media) => {
            // คำนวณสถิติด้วย userId ที่ไม่ถูกต้อง
            const stats = calculateAthleteStats(userId, albums, media)

            // ต้องได้สถิติเป็น 0 ทั้งหมด
            expect(stats.album_count).toBe(0)
            expect(stats.media_count).toBe(0)
            expect(stats.storage_used).toBe(0)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate accurate album count (Requirement 6.1)', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.integer({ min: 0, max: 20 }),
          (userId, albumCount) => {
            // สร้างอัลบั้มสำหรับนักกีฬา
            const albums = Array.from({ length: albumCount }, (_, i) => ({
              id: `album-${i}`,
              name: `Album ${i}`,
              user_id: userId
            }))

            // คำนวณสถิติ
            const stats = calculateAthleteStats(userId, albums, [])

            // ตรวจสอบจำนวนอัลบั้ม
            expect(stats.album_count).toBe(albumCount)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate accurate media count (Requirement 6.2)', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.integer({ min: 0, max: 30 }),
          (userId, mediaCount) => {
            // สร้างไฟล์มีเดียสำหรับนักกีฬา
            const media = Array.from({ length: mediaCount }, (_, i) => ({
              id: `media-${i}`,
              file_size: 1024,
              user_id: userId
            }))

            // คำนวณสถิติ
            const stats = calculateAthleteStats(userId, [], media)

            // ตรวจสอบจำนวนไฟล์
            expect(stats.media_count).toBe(mediaCount)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate accurate storage used (Requirement 6.3)', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(fileSizeArbitrary, { minLength: 0, maxLength: 30 }),
          (userId, fileSizes) => {
            // สร้างไฟล์มีเดียตามขนาดที่กำหนด
            const media = fileSizes.map((size, i) => ({
              id: `media-${i}`,
              file_size: size,
              user_id: userId
            }))

            // คำนวณขนาดรวมที่คาดหวัง
            const expectedStorage = fileSizes.reduce((sum, size) => sum + size, 0)

            // คำนวณสถิติ
            const stats = calculateAthleteStats(userId, [], media)

            // ตรวจสอบขนาดรวม
            expect(stats.storage_used).toBe(expectedStorage)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not count albums from other athletes', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          uuidArbitrary,
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (userId1, userId2, albumCount1, albumCount2) => {
            // ข้ามกรณีที่ userId เหมือนกัน
            if (userId1 === userId2) return true

            // สร้างอัลบั้มสำหรับนักกีฬา 1
            const albums1 = Array.from({ length: albumCount1 }, (_, i) => ({
              id: `album-1-${i}`,
              name: `Album 1-${i}`,
              user_id: userId1
            }))

            // สร้างอัลบั้มสำหรับนักกีฬา 2
            const albums2 = Array.from({ length: albumCount2 }, (_, i) => ({
              id: `album-2-${i}`,
              name: `Album 2-${i}`,
              user_id: userId2
            }))

            const allAlbums = [...albums1, ...albums2]

            // คำนวณสถิติสำหรับนักกีฬา 1
            const stats1 = calculateAthleteStats(userId1, allAlbums, [])

            // ต้องนับเฉพาะอัลบั้มของนักกีฬา 1
            expect(stats1.album_count).toBe(albumCount1)

            // คำนวณสถิติสำหรับนักกีฬา 2
            const stats2 = calculateAthleteStats(userId2, allAlbums, [])

            // ต้องนับเฉพาะอัลบั้มของนักกีฬา 2
            expect(stats2.album_count).toBe(albumCount2)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not count media from other athletes', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          uuidArbitrary,
          fc.array(fileSizeArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(fileSizeArbitrary, { minLength: 1, maxLength: 10 }),
          (userId1, userId2, fileSizes1, fileSizes2) => {
            // ข้ามกรณีที่ userId เหมือนกัน
            if (userId1 === userId2) return true

            // สร้างไฟล์มีเดียสำหรับนักกีฬา 1
            const media1 = fileSizes1.map((size, i) => ({
              id: `media-1-${i}`,
              file_size: size,
              user_id: userId1
            }))

            // สร้างไฟล์มีเดียสำหรับนักกีฬา 2
            const media2 = fileSizes2.map((size, i) => ({
              id: `media-2-${i}`,
              file_size: size,
              user_id: userId2
            }))

            const allMedia = [...media1, ...media2]

            // คำนวณสถิติสำหรับนักกีฬา 1
            const stats1 = calculateAthleteStats(userId1, [], allMedia)

            // ต้องนับเฉพาะไฟล์ของนักกีฬา 1
            expect(stats1.media_count).toBe(fileSizes1.length)
            expect(stats1.storage_used).toBe(fileSizes1.reduce((sum, s) => sum + s, 0))

            // คำนวณสถิติสำหรับนักกีฬา 2
            const stats2 = calculateAthleteStats(userId2, [], allMedia)

            // ต้องนับเฉพาะไฟล์ของนักกีฬา 2
            expect(stats2.media_count).toBe(fileSizes2.length)
            expect(stats2.storage_used).toBe(fileSizes2.reduce((sum, s) => sum + s, 0))

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null or undefined file sizes gracefully', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(
            fc.oneof(
              fileSizeArbitrary,
              fc.constant(null),
              fc.constant(undefined)
            ),
            { minLength: 1, maxLength: 20 }
          ),
          (userId, fileSizes) => {
            // สร้างไฟล์มีเดีย
            const media = fileSizes.map((size, i) => ({
              id: `media-${i}`,
              file_size: size,
              user_id: userId
            }))

            // คำนวณขนาดรวมที่คาดหวัง (null/undefined = 0)
            const expectedStorage = fileSizes.reduce((sum, size) => sum + (size || 0), 0)

            // คำนวณสถิติ
            const stats = calculateAthleteStats(userId, [], media)

            // ตรวจสอบขนาดรวม
            expect(stats.storage_used).toBe(expectedStorage)
            expect(stats.media_count).toBe(fileSizes.length)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify all statistics are complete and accurate', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.integer({ min: 0, max: 15 }),
          fc.array(fileSizeArbitrary, { minLength: 0, maxLength: 30 }),
          (userId, albumCount, fileSizes) => {
            // สร้างอัลบั้ม
            const albums = Array.from({ length: albumCount }, (_, i) => ({
              id: `album-${i}`,
              name: `Album ${i}`,
              user_id: userId
            }))

            // สร้างไฟล์มีเดีย
            const media = fileSizes.map((size, i) => ({
              id: `media-${i}`,
              file_size: size,
              user_id: userId
            }))

            // คำนวณสถิติ
            const stats = calculateAthleteStats(userId, albums, media)

            // ตรวจสอบความถูกต้องของสถิติทั้งหมด
            expect(verifyAthleteStats(stats, userId, albums, media)).toBe(true)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return consistent results for same input', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.integer({ min: 0, max: 10 }),
          fc.array(fileSizeArbitrary, { minLength: 0, maxLength: 20 }),
          (userId, albumCount, fileSizes) => {
            // สร้างข้อมูล
            const albums = Array.from({ length: albumCount }, (_, i) => ({
              id: `album-${i}`,
              name: `Album ${i}`,
              user_id: userId
            }))

            const media = fileSizes.map((size, i) => ({
              id: `media-${i}`,
              file_size: size,
              user_id: userId
            }))

            // คำนวณสถิติ 2 ครั้ง
            const stats1 = calculateAthleteStats(userId, albums, media)
            const stats2 = calculateAthleteStats(userId, albums, media)

            // ผลลัพธ์ต้องเหมือนกัน
            expect(stats1.album_count).toBe(stats2.album_count)
            expect(stats1.media_count).toBe(stats2.media_count)
            expect(stats1.storage_used).toBe(stats2.storage_used)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return non-negative values for all statistics', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.integer({ min: 0, max: 20 }),
          fc.array(fileSizeArbitrary, { minLength: 0, maxLength: 30 }),
          (userId, albumCount, fileSizes) => {
            // สร้างข้อมูล
            const albums = Array.from({ length: albumCount }, (_, i) => ({
              id: `album-${i}`,
              name: `Album ${i}`,
              user_id: userId
            }))

            const media = fileSizes.map((size, i) => ({
              id: `media-${i}`,
              file_size: size,
              user_id: userId
            }))

            // คำนวณสถิติ
            const stats = calculateAthleteStats(userId, albums, media)

            // ค่าทั้งหมดต้องไม่ติดลบ
            expect(stats.album_count).toBeGreaterThanOrEqual(0)
            expect(stats.media_count).toBeGreaterThanOrEqual(0)
            expect(stats.storage_used).toBeGreaterThanOrEqual(0)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
