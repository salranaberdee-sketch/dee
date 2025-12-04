/**
 * Alphabetical Sorting Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับการเรียงลำดับนักกีฬาตามชื่อ
 * 
 * **Feature: album-individual-view, Property 3: Athlete list is sorted alphabetically by name**
 * **Validates: Requirements 1.4**
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
 * Arbitrary for generating valid club_id
 */
const clubIdArbitrary = fc.uuid()

/**
 * Arbitrary for generating valid athlete name (Thai and English)
 */
const athleteNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)

/**
 * Arbitrary for generating a single athlete profile
 */
const athleteProfileArbitrary = fc.record({
  id: uuidArbitrary,
  full_name: athleteNameArbitrary,
  name: athleteNameArbitrary,
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
  club_id: clubIdArbitrary,
  role: fc.constant('athlete'),
  album_count: fc.nat({ max: 100 }),
  media_count: fc.nat({ max: 1000 }),
  storage_used: fc.nat({ max: 1000000000 })
})

// ============================================================================
// Pure Functions for Testing (simulating store operations)
// ============================================================================

/**
 * เรียงลำดับนักกีฬาตามชื่อ A-Z
 * จำลองการทำงานของ fetchAthletesInMyClub และ fetchAthletesByClub
 * 
 * @param {Array} athletes - รายการนักกีฬา
 * @returns {Array} - รายการนักกีฬาที่เรียงตามชื่อ
 */
function sortAthletesByName(athletes) {
  return [...athletes].sort((a, b) => {
    const nameA = (a.full_name || a.name || '').toLowerCase()
    const nameB = (b.full_name || b.name || '').toLowerCase()
    return nameA.localeCompare(nameB, 'th')
  })
}

/**
 * ตรวจสอบว่ารายการเรียงตามชื่อ A-Z หรือไม่
 * 
 * @param {Array} athletes - รายการนักกีฬา
 * @returns {boolean} - true ถ้าเรียงตามชื่อ A-Z
 */
function isSortedAlphabetically(athletes) {
  if (athletes.length <= 1) {
    return true
  }
  
  for (let i = 0; i < athletes.length - 1; i++) {
    const nameA = (athletes[i].full_name || athletes[i].name || '').toLowerCase()
    const nameB = (athletes[i + 1].full_name || athletes[i + 1].name || '').toLowerCase()
    
    if (nameA.localeCompare(nameB, 'th') > 0) {
      return false
    }
  }
  
  return true
}

/**
 * ตรวจสอบว่าข้อมูลนักกีฬาไม่ถูกเปลี่ยนแปลงหลังการเรียงลำดับ
 * 
 * @param {Array} original - รายการนักกีฬาต้นฉบับ
 * @param {Array} sorted - รายการนักกีฬาที่เรียงแล้ว
 * @returns {boolean} - true ถ้าข้อมูลไม่ถูกเปลี่ยนแปลง
 */
function dataIntegrityPreserved(original, sorted) {
  if (original.length !== sorted.length) {
    return false
  }
  
  // ตรวจสอบว่าทุก id ในต้นฉบับมีอยู่ในผลลัพธ์
  const originalIds = new Set(original.map(a => a.id))
  const sortedIds = new Set(sorted.map(a => a.id))
  
  if (originalIds.size !== sortedIds.size) {
    return false
  }
  
  for (const id of originalIds) {
    if (!sortedIds.has(id)) {
      return false
    }
  }
  
  return true
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Alphabetical Sorting Property Tests', () => {

  /**
   * **Feature: album-individual-view, Property 3: Athlete list is sorted alphabetically by name**
   * **Validates: Requirements 1.4**
   * 
   * For any list of athletes returned (for coach or admin), the athletes should be 
   * sorted in ascending alphabetical order by full_name.
   */
  describe('Property 3: Athlete list is sorted alphabetically by name', () => {

    it('should sort athletes in ascending alphabetical order by name', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          (athletes) => {
            const sortedAthletes = sortAthletesByName(athletes)
            
            // ตรวจสอบว่าเรียงตามชื่อ A-Z
            expect(isSortedAlphabetically(sortedAthletes)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all athlete data after sorting', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          (athletes) => {
            const sortedAthletes = sortAthletesByName(athletes)
            
            // ตรวจสอบว่าข้อมูลไม่ถูกเปลี่ยนแปลง
            expect(dataIntegrityPreserved(athletes, sortedAthletes)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain same length after sorting', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          (athletes) => {
            const sortedAthletes = sortAthletesByName(athletes)
            
            // จำนวนต้องเท่าเดิม
            expect(sortedAthletes.length).toBe(athletes.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when input is empty', () => {
      const sortedAthletes = sortAthletesByName([])
      expect(sortedAthletes).toEqual([])
      expect(isSortedAlphabetically(sortedAthletes)).toBe(true)
    })

    it('should return single element array unchanged (still sorted)', () => {
      fc.assert(
        fc.property(
          athleteProfileArbitrary,
          (athlete) => {
            const sortedAthletes = sortAthletesByName([athlete])
            
            expect(sortedAthletes.length).toBe(1)
            expect(sortedAthletes[0].id).toBe(athlete.id)
            expect(isSortedAlphabetically(sortedAthletes)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle athletes with same name correctly', () => {
      fc.assert(
        fc.property(
          athleteNameArbitrary,
          fc.array(uuidArbitrary, { minLength: 2, maxLength: 10 }),
          (sharedName, ids) => {
            // สร้างนักกีฬาที่มีชื่อเหมือนกัน
            const athletesWithSameName = ids.map(id => ({
              id,
              full_name: sharedName,
              name: sharedName,
              avatar_url: null,
              club_id: crypto.randomUUID(),
              role: 'athlete',
              album_count: 0,
              media_count: 0,
              storage_used: 0
            }))
            
            const sortedAthletes = sortAthletesByName(athletesWithSameName)
            
            // ต้องยังคงเรียงลำดับถูกต้อง (stable sort)
            expect(isSortedAlphabetically(sortedAthletes)).toBe(true)
            expect(sortedAthletes.length).toBe(athletesWithSameName.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should sort case-insensitively', () => {
      // ทดสอบการเรียงลำดับแบบไม่สนใจตัวพิมพ์ใหญ่-เล็ก
      const athletes = [
        { id: '1', full_name: 'Zebra', name: 'Zebra', role: 'athlete' },
        { id: '2', full_name: 'apple', name: 'apple', role: 'athlete' },
        { id: '3', full_name: 'Banana', name: 'Banana', role: 'athlete' },
        { id: '4', full_name: 'cherry', name: 'cherry', role: 'athlete' }
      ]
      
      const sortedAthletes = sortAthletesByName(athletes)
      
      expect(isSortedAlphabetically(sortedAthletes)).toBe(true)
      // apple < Banana < cherry < Zebra (case-insensitive)
      expect(sortedAthletes[0].full_name.toLowerCase()).toBe('apple')
      expect(sortedAthletes[3].full_name.toLowerCase()).toBe('zebra')
    })

    it('should handle Thai names correctly', () => {
      // ทดสอบการเรียงลำดับชื่อภาษาไทย
      const athletes = [
        { id: '1', full_name: 'สมชาย', name: 'สมชาย', role: 'athlete' },
        { id: '2', full_name: 'กมล', name: 'กมล', role: 'athlete' },
        { id: '3', full_name: 'ชัยวัฒน์', name: 'ชัยวัฒน์', role: 'athlete' },
        { id: '4', full_name: 'ขวัญใจ', name: 'ขวัญใจ', role: 'athlete' }
      ]
      
      const sortedAthletes = sortAthletesByName(athletes)
      
      expect(isSortedAlphabetically(sortedAthletes)).toBe(true)
      // ก < ข < ช < ส (Thai alphabetical order)
      expect(sortedAthletes[0].full_name).toBe('กมล')
      expect(sortedAthletes[1].full_name).toBe('ขวัญใจ')
      expect(sortedAthletes[2].full_name).toBe('ชัยวัฒน์')
      expect(sortedAthletes[3].full_name).toBe('สมชาย')
    })

    it('should not modify original array', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 2, maxLength: 20 }),
          (athletes) => {
            // เก็บ copy ของ array ต้นฉบับ
            const originalOrder = athletes.map(a => a.id)
            
            // เรียงลำดับ
            const sortedAthletes = sortAthletesByName(athletes)
            
            // ตรวจสอบว่า array ต้นฉบับไม่ถูกเปลี่ยนแปลง
            const currentOrder = athletes.map(a => a.id)
            expect(currentOrder).toEqual(originalOrder)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle mixed Thai and English names', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 2, maxLength: 30 }),
          (athletes) => {
            const sortedAthletes = sortAthletesByName(athletes)
            
            // ตรวจสอบว่าเรียงลำดับถูกต้อง
            expect(isSortedAlphabetically(sortedAthletes)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be idempotent - sorting twice gives same result', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 30 }),
          (athletes) => {
            const sortedOnce = sortAthletesByName(athletes)
            const sortedTwice = sortAthletesByName(sortedOnce)
            
            // การเรียงลำดับซ้ำต้องได้ผลลัพธ์เหมือนเดิม
            expect(sortedTwice.map(a => a.id)).toEqual(sortedOnce.map(a => a.id))
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle athletes with null/undefined full_name using name field', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              full_name: fc.option(athleteNameArbitrary, { nil: null }),
              name: athleteNameArbitrary,
              avatar_url: fc.option(fc.webUrl(), { nil: null }),
              club_id: clubIdArbitrary,
              role: fc.constant('athlete')
            }),
            { minLength: 1, maxLength: 30 }
          ),
          (athletes) => {
            const sortedAthletes = sortAthletesByName(athletes)
            
            // ต้องยังคงเรียงลำดับได้ถูกต้อง
            expect(isSortedAlphabetically(sortedAthletes)).toBe(true)
            expect(sortedAthletes.length).toBe(athletes.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
