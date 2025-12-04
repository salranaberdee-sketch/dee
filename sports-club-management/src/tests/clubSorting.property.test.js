/**
 * Club Sorting Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับการเรียงลำดับชมรมตามพื้นที่ใช้งาน
 * 
 * **Feature: album-individual-view, Property 6: Club list is sorted by storage used descending**
 * **Validates: Requirements 3.4**
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
 * Arbitrary for generating valid storage size (0 to 1GB)
 */
const storageSizeArbitrary = fc.integer({ min: 0, max: 1024 * 1024 * 1024 })

/**
 * Arbitrary for generating a single club with stats
 */
const clubWithStatsArbitrary = fc.record({
  id: uuidArbitrary,
  name: clubNameArbitrary,
  total_albums: fc.integer({ min: 0, max: 1000 }),
  total_media: fc.integer({ min: 0, max: 10000 }),
  total_storage: storageSizeArbitrary
})

// ============================================================================
// Pure Functions for Testing (simulating store operations)
// ============================================================================

/**
 * เรียงลำดับชมรมตามพื้นที่ใช้งานมากไปน้อย
 * จำลองการทำงานของ fetchAllClubsWithStats
 * 
 * @param {Array} clubs - รายการชมรมพร้อมสถิติ
 * @returns {Array} - รายการชมรมที่เรียงลำดับแล้ว
 */
function sortClubsByStorageDescending(clubs) {
  return [...clubs].sort((a, b) => b.total_storage - a.total_storage)
}

/**
 * ตรวจสอบว่ารายการเรียงลำดับจากมากไปน้อยตาม total_storage
 * 
 * @param {Array} clubs - รายการชมรมที่เรียงลำดับแล้ว
 * @returns {boolean} - true ถ้าเรียงลำดับถูกต้อง
 */
function isSortedByStorageDescending(clubs) {
  if (clubs.length <= 1) return true
  
  for (let i = 0; i < clubs.length - 1; i++) {
    if (clubs[i].total_storage < clubs[i + 1].total_storage) {
      return false
    }
  }
  return true
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Club Sorting Property Tests', () => {

  /**
   * **Feature: album-individual-view, Property 6: Club list is sorted by storage used descending**
   * **Validates: Requirements 3.4**
   * 
   * For any list of clubs returned for admin, the clubs should be sorted 
   * in descending order by total_storage.
   */
  describe('Property 6: Club list is sorted by storage used descending', () => {

    it('should sort clubs by total_storage in descending order', () => {
      fc.assert(
        fc.property(
          fc.array(clubWithStatsArbitrary, { minLength: 0, maxLength: 50 }),
          (clubs) => {
            // เรียงลำดับชมรม
            const sortedClubs = sortClubsByStorageDescending(clubs)
            
            // ตรวจสอบว่าเรียงลำดับถูกต้อง
            expect(isSortedByStorageDescending(sortedClubs)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should place club with highest storage first', () => {
      fc.assert(
        fc.property(
          fc.array(clubWithStatsArbitrary, { minLength: 1, maxLength: 50 }),
          (clubs) => {
            // เรียงลำดับชมรม
            const sortedClubs = sortClubsByStorageDescending(clubs)
            
            // หาค่า storage สูงสุด
            const maxStorage = Math.max(...clubs.map(c => c.total_storage))
            
            // ชมรมแรกต้องมี storage เท่ากับค่าสูงสุด
            expect(sortedClubs[0].total_storage).toBe(maxStorage)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should place club with lowest storage last', () => {
      fc.assert(
        fc.property(
          fc.array(clubWithStatsArbitrary, { minLength: 1, maxLength: 50 }),
          (clubs) => {
            // เรียงลำดับชมรม
            const sortedClubs = sortClubsByStorageDescending(clubs)
            
            // หาค่า storage ต่ำสุด
            const minStorage = Math.min(...clubs.map(c => c.total_storage))
            
            // ชมรมสุดท้ายต้องมี storage เท่ากับค่าต่ำสุด
            expect(sortedClubs[sortedClubs.length - 1].total_storage).toBe(minStorage)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all clubs after sorting', () => {
      fc.assert(
        fc.property(
          fc.array(clubWithStatsArbitrary, { minLength: 0, maxLength: 50 }),
          (clubs) => {
            // เรียงลำดับชมรม
            const sortedClubs = sortClubsByStorageDescending(clubs)
            
            // จำนวนชมรมต้องเท่าเดิม
            expect(sortedClubs.length).toBe(clubs.length)
            
            // ทุกชมรมต้องยังอยู่ในผลลัพธ์
            const sortedIds = sortedClubs.map(c => c.id)
            for (const club of clubs) {
              expect(sortedIds).toContain(club.id)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty club list', () => {
      const sortedClubs = sortClubsByStorageDescending([])
      
      expect(sortedClubs).toEqual([])
      expect(isSortedByStorageDescending(sortedClubs)).toBe(true)
    })

    it('should handle single club', () => {
      fc.assert(
        fc.property(
          clubWithStatsArbitrary,
          (club) => {
            const sortedClubs = sortClubsByStorageDescending([club])
            
            expect(sortedClubs.length).toBe(1)
            expect(sortedClubs[0].id).toBe(club.id)
            expect(isSortedByStorageDescending(sortedClubs)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle clubs with equal storage', () => {
      fc.assert(
        fc.property(
          storageSizeArbitrary,
          fc.array(clubWithStatsArbitrary, { minLength: 2, maxLength: 10 }),
          (sameStorage, clubs) => {
            // ตั้งค่า storage เท่ากันทุกชมรม
            const clubsWithSameStorage = clubs.map(c => ({
              ...c,
              total_storage: sameStorage
            }))
            
            // เรียงลำดับชมรม
            const sortedClubs = sortClubsByStorageDescending(clubsWithSameStorage)
            
            // ต้องยังคงเรียงลำดับถูกต้อง (ทุกค่าเท่ากัน)
            expect(isSortedByStorageDescending(sortedClubs)).toBe(true)
            
            // จำนวนชมรมต้องเท่าเดิม
            expect(sortedClubs.length).toBe(clubs.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle clubs with zero storage', () => {
      fc.assert(
        fc.property(
          fc.array(clubWithStatsArbitrary, { minLength: 1, maxLength: 10 }),
          (clubs) => {
            // ตั้งค่า storage เป็น 0 ทุกชมรม
            const clubsWithZeroStorage = clubs.map(c => ({
              ...c,
              total_storage: 0
            }))
            
            // เรียงลำดับชมรม
            const sortedClubs = sortClubsByStorageDescending(clubsWithZeroStorage)
            
            // ต้องยังคงเรียงลำดับถูกต้อง
            expect(isSortedByStorageDescending(sortedClubs)).toBe(true)
            
            // ทุกชมรมต้องมี storage เป็น 0
            for (const club of sortedClubs) {
              expect(club.total_storage).toBe(0)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve club data integrity after sorting', () => {
      fc.assert(
        fc.property(
          fc.array(clubWithStatsArbitrary, { minLength: 1, maxLength: 20 }),
          (clubs) => {
            // เรียงลำดับชมรม
            const sortedClubs = sortClubsByStorageDescending(clubs)
            
            // ตรวจสอบว่าข้อมูลชมรมไม่ถูกเปลี่ยนแปลง
            for (const sortedClub of sortedClubs) {
              const original = clubs.find(c => c.id === sortedClub.id)
              
              expect(original).toBeDefined()
              expect(sortedClub.name).toBe(original.name)
              expect(sortedClub.total_albums).toBe(original.total_albums)
              expect(sortedClub.total_media).toBe(original.total_media)
              expect(sortedClub.total_storage).toBe(original.total_storage)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly order clubs with varying storage sizes', () => {
      fc.assert(
        fc.property(
          // สร้างชมรมที่มี storage ต่างกันแน่นอน
          fc.array(fc.integer({ min: 0, max: 1000000 }), { minLength: 2, maxLength: 20 }),
          (storages) => {
            // สร้างชมรมจาก storage values
            const clubs = storages.map((storage, i) => ({
              id: `club-${i}`,
              name: `Club ${i}`,
              total_albums: 0,
              total_media: 0,
              total_storage: storage
            }))
            
            // เรียงลำดับชมรม
            const sortedClubs = sortClubsByStorageDescending(clubs)
            
            // ตรวจสอบว่าเรียงลำดับถูกต้อง
            expect(isSortedByStorageDescending(sortedClubs)).toBe(true)
            
            // ตรวจสอบทุกคู่ที่ติดกัน
            for (let i = 0; i < sortedClubs.length - 1; i++) {
              expect(sortedClubs[i].total_storage).toBeGreaterThanOrEqual(
                sortedClubs[i + 1].total_storage
              )
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle large storage values', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: clubNameArbitrary,
              total_albums: fc.integer({ min: 0, max: 1000 }),
              total_media: fc.integer({ min: 0, max: 10000 }),
              // ค่า storage ขนาดใหญ่ (หลาย GB)
              total_storage: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (clubs) => {
            // เรียงลำดับชมรม
            const sortedClubs = sortClubsByStorageDescending(clubs)
            
            // ต้องยังคงเรียงลำดับถูกต้อง
            expect(isSortedByStorageDescending(sortedClubs)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
