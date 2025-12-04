/**
 * Club Statistics Accuracy Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับความถูกต้องของสถิติชมรม
 * 
 * **Feature: album-individual-view, Property 5: Admin sees all clubs with accurate statistics**
 * **Validates: Requirements 3.1, 3.2**
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
 * Arbitrary for generating valid club name
 */
const clubNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)

/**
 * Arbitrary for generating valid file size (0 to 100MB)
 */
const fileSizeArbitrary = fc.integer({ min: 0, max: 100 * 1024 * 1024 })

/**
 * Arbitrary for generating a single club
 */
const clubArbitrary = fc.record({
  id: uuidArbitrary,
  name: clubNameArbitrary
})

/**
 * Arbitrary for generating a single athlete profile
 */
const athleteProfileArbitrary = (clubId) => fc.record({
  id: uuidArbitrary,
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  club_id: fc.constant(clubId),
  role: fc.constant('athlete')
})

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
 * คำนวณสถิติสำหรับชมรม
 * จำลองการทำงานของ fetchAllClubsWithStats
 * 
 * @param {Object} club - ข้อมูลชมรม
 * @param {Array} athletes - รายการนักกีฬาทั้งหมด
 * @param {Array} albums - รายการอัลบั้มทั้งหมด
 * @param {Array} media - รายการไฟล์ทั้งหมด
 * @returns {Object} - ชมรมพร้อมสถิติ
 */
function calculateClubStats(club, athletes, albums, media) {
  // หา user_ids ของนักกีฬาในชมรม
  const athleteIds = athletes
    .filter(a => a.club_id === club.id && a.role === 'athlete')
    .map(a => a.id)
  
  if (athleteIds.length === 0) {
    return {
      ...club,
      total_albums: 0,
      total_media: 0,
      total_storage: 0
    }
  }
  
  // นับจำนวนอัลบั้ม
  const totalAlbums = albums.filter(a => athleteIds.includes(a.user_id)).length
  
  // นับจำนวนไฟล์และขนาดรวม
  const clubMedia = media.filter(m => athleteIds.includes(m.user_id))
  const totalMedia = clubMedia.length
  const totalStorage = clubMedia.reduce((sum, m) => sum + (m.file_size || 0), 0)
  
  return {
    ...club,
    total_albums: totalAlbums,
    total_media: totalMedia,
    total_storage: totalStorage
  }
}

/**
 * คำนวณสถิติสำหรับทุกชมรม
 * 
 * @param {Array} clubs - รายการชมรมทั้งหมด
 * @param {Array} athletes - รายการนักกีฬาทั้งหมด
 * @param {Array} albums - รายการอัลบั้มทั้งหมด
 * @param {Array} media - รายการไฟล์ทั้งหมด
 * @returns {Array} - รายการชมรมพร้อมสถิติ
 */
function calculateAllClubsStats(clubs, athletes, albums, media) {
  return clubs.map(club => calculateClubStats(club, athletes, albums, media))
}

/**
 * ตรวจสอบความถูกต้องของสถิติชมรม
 * 
 * @param {Object} clubWithStats - ชมรมพร้อมสถิติ
 * @param {Array} athletes - รายการนักกีฬาทั้งหมด
 * @param {Array} albums - รายการอัลบั้มทั้งหมด
 * @param {Array} media - รายการไฟล์ทั้งหมด
 * @returns {boolean} - true ถ้าสถิติถูกต้อง
 */
function verifyClubStats(clubWithStats, athletes, albums, media) {
  // หา user_ids ของนักกีฬาในชมรม
  const athleteIds = athletes
    .filter(a => a.club_id === clubWithStats.id && a.role === 'athlete')
    .map(a => a.id)
  
  // คำนวณค่าที่คาดหวัง
  const expectedAlbums = albums.filter(a => athleteIds.includes(a.user_id)).length
  const clubMedia = media.filter(m => athleteIds.includes(m.user_id))
  const expectedMedia = clubMedia.length
  const expectedStorage = clubMedia.reduce((sum, m) => sum + (m.file_size || 0), 0)
  
  return (
    clubWithStats.total_albums === expectedAlbums &&
    clubWithStats.total_media === expectedMedia &&
    clubWithStats.total_storage === expectedStorage
  )
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Club Statistics Accuracy Property Tests', () => {

  /**
   * **Feature: album-individual-view, Property 5: Admin sees all clubs with accurate statistics**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * For any admin user, when fetching club list, all clubs should be returned 
   * and each club's statistics (total_albums, total_media, total_storage) 
   * should match the actual sum of data for that club.
   */
  describe('Property 5: Admin sees all clubs with accurate statistics', () => {

    it('should return all clubs', () => {
      fc.assert(
        fc.property(
          // สร้างรายการชมรม
          fc.array(clubArbitrary, { minLength: 1, maxLength: 20 }),
          (clubs) => {
            // คำนวณสถิติสำหรับทุกชมรม (ไม่มีนักกีฬา)
            const clubsWithStats = calculateAllClubsStats(clubs, [], [], [])
            
            // ต้องได้ชมรมทุกชมรม
            expect(clubsWithStats.length).toBe(clubs.length)
            
            // ตรวจสอบว่าทุกชมรมมีอยู่ในผลลัพธ์
            const resultIds = clubsWithStats.map(c => c.id)
            for (const club of clubs) {
              expect(resultIds).toContain(club.id)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return zero statistics for clubs with no athletes', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 10 }),
          (clubs) => {
            // คำนวณสถิติโดยไม่มีนักกีฬา
            const clubsWithStats = calculateAllClubsStats(clubs, [], [], [])
            
            // ทุกชมรมต้องมีสถิติเป็น 0
            for (const club of clubsWithStats) {
              expect(club.total_albums).toBe(0)
              expect(club.total_media).toBe(0)
              expect(club.total_storage).toBe(0)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate accurate album count per club', () => {
      fc.assert(
        fc.property(
          // สร้างชมรม 2 ชมรม
          clubArbitrary,
          clubArbitrary,
          // จำนวนนักกีฬาและอัลบั้มต่อชมรม
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 0, max: 10 }),
          (club1, club2, athleteCount1, albumCount1, athleteCount2, albumCount2) => {
            // ข้ามกรณีที่ club_id เหมือนกัน
            if (club1.id === club2.id) return true
            
            // สร้างนักกีฬาสำหรับชมรม 1
            const athletes1 = Array.from({ length: athleteCount1 }, (_, i) => ({
              id: `athlete-1-${i}`,
              name: `Athlete 1-${i}`,
              club_id: club1.id,
              role: 'athlete'
            }))
            
            // สร้างนักกีฬาสำหรับชมรม 2
            const athletes2 = Array.from({ length: athleteCount2 }, (_, i) => ({
              id: `athlete-2-${i}`,
              name: `Athlete 2-${i}`,
              club_id: club2.id,
              role: 'athlete'
            }))
            
            const allAthletes = [...athletes1, ...athletes2]
            
            // สร้างอัลบั้มสำหรับนักกีฬาในชมรม 1
            const albums1 = Array.from({ length: albumCount1 }, (_, i) => ({
              id: `album-1-${i}`,
              name: `Album 1-${i}`,
              user_id: athletes1[i % athletes1.length].id
            }))
            
            // สร้างอัลบั้มสำหรับนักกีฬาในชมรม 2
            const albums2 = Array.from({ length: albumCount2 }, (_, i) => ({
              id: `album-2-${i}`,
              name: `Album 2-${i}`,
              user_id: athletes2[i % athletes2.length].id
            }))
            
            const allAlbums = [...albums1, ...albums2]
            
            // คำนวณสถิติ
            const clubsWithStats = calculateAllClubsStats(
              [club1, club2],
              allAthletes,
              allAlbums,
              []
            )
            
            // ตรวจสอบจำนวนอัลบั้มของแต่ละชมรม
            const club1Stats = clubsWithStats.find(c => c.id === club1.id)
            const club2Stats = clubsWithStats.find(c => c.id === club2.id)
            
            expect(club1Stats.total_albums).toBe(albumCount1)
            expect(club2Stats.total_albums).toBe(albumCount2)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate accurate media count per club', () => {
      fc.assert(
        fc.property(
          clubArbitrary,
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 0, max: 20 }),
          (club, athleteCount, mediaCount) => {
            // สร้างนักกีฬา
            const athletes = Array.from({ length: athleteCount }, (_, i) => ({
              id: `athlete-${i}`,
              name: `Athlete ${i}`,
              club_id: club.id,
              role: 'athlete'
            }))
            
            // สร้างไฟล์มีเดีย
            const media = Array.from({ length: mediaCount }, (_, i) => ({
              id: `media-${i}`,
              file_size: 1024,
              user_id: athletes[i % athletes.length].id
            }))
            
            // คำนวณสถิติ
            const clubsWithStats = calculateAllClubsStats([club], athletes, [], media)
            
            // ตรวจสอบจำนวนไฟล์
            expect(clubsWithStats[0].total_media).toBe(mediaCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate accurate storage size per club', () => {
      fc.assert(
        fc.property(
          clubArbitrary,
          fc.array(fileSizeArbitrary, { minLength: 1, maxLength: 20 }),
          (club, fileSizes) => {
            // สร้างนักกีฬา 1 คน
            const athlete = {
              id: 'athlete-1',
              name: 'Athlete 1',
              club_id: club.id,
              role: 'athlete'
            }
            
            // สร้างไฟล์มีเดียตามขนาดที่กำหนด
            const media = fileSizes.map((size, i) => ({
              id: `media-${i}`,
              file_size: size,
              user_id: athlete.id
            }))
            
            // คำนวณขนาดรวมที่คาดหวัง
            const expectedStorage = fileSizes.reduce((sum, size) => sum + size, 0)
            
            // คำนวณสถิติ
            const clubsWithStats = calculateAllClubsStats([club], [athlete], [], media)
            
            // ตรวจสอบขนาดรวม
            expect(clubsWithStats[0].total_storage).toBe(expectedStorage)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify all statistics are accurate for each club', () => {
      fc.assert(
        fc.property(
          // สร้างชมรมหลายชมรม
          fc.array(clubArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(fileSizeArbitrary, { minLength: 0, maxLength: 30 }),
          (clubs, fileSizes) => {
            // กรองชมรมที่ซ้ำกัน
            const uniqueClubs = clubs.filter((club, index, self) =>
              index === self.findIndex(c => c.id === club.id)
            )
            
            if (uniqueClubs.length === 0) return true
            
            // สร้างนักกีฬาและข้อมูลสำหรับแต่ละชมรม
            const allAthletes = []
            const allAlbums = []
            const allMedia = []
            
            uniqueClubs.forEach((club, clubIndex) => {
              // สร้างนักกีฬา 2 คนต่อชมรม
              const athletes = [
                {
                  id: `athlete-${clubIndex}-0`,
                  name: `Athlete ${clubIndex}-0`,
                  club_id: club.id,
                  role: 'athlete'
                },
                {
                  id: `athlete-${clubIndex}-1`,
                  name: `Athlete ${clubIndex}-1`,
                  club_id: club.id,
                  role: 'athlete'
                }
              ]
              allAthletes.push(...athletes)
              
              // สร้างอัลบั้ม 1 อัลบั้มต่อนักกีฬา
              athletes.forEach((athlete, i) => {
                allAlbums.push({
                  id: `album-${clubIndex}-${i}`,
                  name: `Album ${clubIndex}-${i}`,
                  user_id: athlete.id
                })
              })
              
              // สร้างไฟล์มีเดียตามจำนวนที่กำหนด
              const mediaPerClub = Math.floor(fileSizes.length / uniqueClubs.length)
              const startIndex = clubIndex * mediaPerClub
              const endIndex = startIndex + mediaPerClub
              
              fileSizes.slice(startIndex, endIndex).forEach((size, i) => {
                allMedia.push({
                  id: `media-${clubIndex}-${i}`,
                  file_size: size,
                  user_id: athletes[i % athletes.length].id
                })
              })
            })
            
            // คำนวณสถิติ
            const clubsWithStats = calculateAllClubsStats(
              uniqueClubs,
              allAthletes,
              allAlbums,
              allMedia
            )
            
            // ตรวจสอบความถูกต้องของสถิติแต่ละชมรม
            for (const clubStats of clubsWithStats) {
              expect(verifyClubStats(clubStats, allAthletes, allAlbums, allMedia)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not count athletes from other clubs', () => {
      fc.assert(
        fc.property(
          clubArbitrary,
          clubArbitrary,
          fc.integer({ min: 1, max: 10 }),
          (club1, club2, mediaCount) => {
            // ข้ามกรณีที่ club_id เหมือนกัน
            if (club1.id === club2.id) return true
            
            // สร้างนักกีฬาในชมรม 2 เท่านั้น
            const athlete = {
              id: 'athlete-club2',
              name: 'Athlete Club 2',
              club_id: club2.id,
              role: 'athlete'
            }
            
            // สร้างไฟล์มีเดียสำหรับนักกีฬาในชมรม 2
            const media = Array.from({ length: mediaCount }, (_, i) => ({
              id: `media-${i}`,
              file_size: 1024,
              user_id: athlete.id
            }))
            
            // คำนวณสถิติสำหรับทั้งสองชมรม
            const clubsWithStats = calculateAllClubsStats(
              [club1, club2],
              [athlete],
              [],
              media
            )
            
            // ชมรม 1 ต้องมีสถิติเป็น 0
            const club1Stats = clubsWithStats.find(c => c.id === club1.id)
            expect(club1Stats.total_albums).toBe(0)
            expect(club1Stats.total_media).toBe(0)
            expect(club1Stats.total_storage).toBe(0)
            
            // ชมรม 2 ต้องมีสถิติถูกต้อง
            const club2Stats = clubsWithStats.find(c => c.id === club2.id)
            expect(club2Stats.total_media).toBe(mediaCount)
            expect(club2Stats.total_storage).toBe(mediaCount * 1024)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null or undefined file sizes gracefully', () => {
      fc.assert(
        fc.property(
          clubArbitrary,
          fc.array(
            fc.oneof(
              fileSizeArbitrary,
              fc.constant(null),
              fc.constant(undefined)
            ),
            { minLength: 1, maxLength: 20 }
          ),
          (club, fileSizes) => {
            // สร้างนักกีฬา
            const athlete = {
              id: 'athlete-1',
              name: 'Athlete 1',
              club_id: club.id,
              role: 'athlete'
            }
            
            // สร้างไฟล์มีเดีย
            const media = fileSizes.map((size, i) => ({
              id: `media-${i}`,
              file_size: size,
              user_id: athlete.id
            }))
            
            // คำนวณขนาดรวมที่คาดหวัง (null/undefined = 0)
            const expectedStorage = fileSizes.reduce((sum, size) => sum + (size || 0), 0)
            
            // คำนวณสถิติ
            const clubsWithStats = calculateAllClubsStats([club], [athlete], [], media)
            
            // ตรวจสอบขนาดรวม
            expect(clubsWithStats[0].total_storage).toBe(expectedStorage)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve club data integrity after calculating stats', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 10 }),
          (clubs) => {
            // คำนวณสถิติ
            const clubsWithStats = calculateAllClubsStats(clubs, [], [], [])
            
            // ตรวจสอบว่าข้อมูลชมรมไม่ถูกเปลี่ยนแปลง
            for (const clubStats of clubsWithStats) {
              const original = clubs.find(c => c.id === clubStats.id)
              
              if (original) {
                expect(clubStats.id).toBe(original.id)
                expect(clubStats.name).toBe(original.name)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should only count users with role athlete', () => {
      fc.assert(
        fc.property(
          clubArbitrary,
          fc.integer({ min: 1, max: 10 }),
          (club, mediaCount) => {
            // สร้างโค้ชในชมรม (ไม่ใช่ athlete)
            const coach = {
              id: 'coach-1',
              name: 'Coach 1',
              club_id: club.id,
              role: 'coach'
            }
            
            // สร้างไฟล์มีเดียสำหรับโค้ช
            const media = Array.from({ length: mediaCount }, (_, i) => ({
              id: `media-${i}`,
              file_size: 1024,
              user_id: coach.id
            }))
            
            // คำนวณสถิติ
            const clubsWithStats = calculateAllClubsStats([club], [coach], [], media)
            
            // ต้องไม่นับข้อมูลของโค้ช
            expect(clubsWithStats[0].total_albums).toBe(0)
            expect(clubsWithStats[0].total_media).toBe(0)
            expect(clubsWithStats[0].total_storage).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
