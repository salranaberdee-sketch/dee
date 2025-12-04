/**
 * Search Filter Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับการค้นหานักกีฬา
 * 
 * **Feature: album-individual-view, Property 4: Search filter returns only matching athletes**
 * **Validates: Requirements 2.2, 2.3**
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

/**
 * Arbitrary for generating search query (non-empty string)
 */
const searchQueryArbitrary = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0)

// ============================================================================
// Pure Functions for Testing (simulating store operations)
// ============================================================================

/**
 * กรองนักกีฬาตามคำค้นหา
 * จำลองการทำงานของ filteredAthletes computed และ searchAthletes function
 * 
 * @param {Array} athletes - รายการนักกีฬา
 * @param {string} query - คำค้นหา
 * @returns {Array} - รายการนักกีฬาที่ตรงกับคำค้นหา
 */
function filterAthletesBySearch(athletes, query) {
  if (!query || query.trim() === '') {
    return athletes
  }
  
  const searchTerm = query.toLowerCase().trim()
  return athletes.filter(athlete => {
    const athleteName = (athlete.full_name || athlete.name || '').toLowerCase()
    return athleteName.includes(searchTerm)
  })
}

/**
 * ตรวจสอบว่าทุกนักกีฬาในผลลัพธ์มีชื่อที่ตรงกับคำค้นหา
 * 
 * @param {Array} athletes - รายการนักกีฬาที่กรองแล้ว
 * @param {string} query - คำค้นหา
 * @returns {boolean} - true ถ้าทุกนักกีฬามีชื่อที่ตรงกับคำค้นหา
 */
function allAthletesMatchQuery(athletes, query) {
  if (!query || query.trim() === '') {
    return true
  }
  
  const searchTerm = query.toLowerCase().trim()
  return athletes.every(athlete => {
    const athleteName = (athlete.full_name || athlete.name || '').toLowerCase()
    return athleteName.includes(searchTerm)
  })
}

/**
 * ตรวจสอบว่าไม่มีนักกีฬาที่ตรงกับคำค้นหาถูกตัดออก
 * 
 * @param {Array} original - รายการนักกีฬาต้นฉบับ
 * @param {Array} filtered - รายการนักกีฬาที่กรองแล้ว
 * @param {string} query - คำค้นหา
 * @returns {boolean} - true ถ้าไม่มีนักกีฬาที่ตรงกับคำค้นหาถูกตัดออก
 */
function noMatchingAthletesExcluded(original, filtered, query) {
  if (!query || query.trim() === '') {
    return original.length === filtered.length
  }
  
  const searchTerm = query.toLowerCase().trim()
  const filteredIds = new Set(filtered.map(a => a.id))
  
  // ตรวจสอบว่าทุกนักกีฬาที่ตรงกับคำค้นหาอยู่ในผลลัพธ์
  return original.every(athlete => {
    const athleteName = (athlete.full_name || athlete.name || '').toLowerCase()
    const shouldMatch = athleteName.includes(searchTerm)
    
    if (shouldMatch) {
      return filteredIds.has(athlete.id)
    }
    return true
  })
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Search Filter Property Tests', () => {

  /**
   * **Feature: album-individual-view, Property 4: Search filter returns only matching athletes**
   * **Validates: Requirements 2.2, 2.3**
   * 
   * For any search query string, all returned athletes should have full_name 
   * containing the query string (case-insensitive). When search is empty, 
   * all athletes in scope should be returned.
   */
  describe('Property 4: Search filter returns only matching athletes', () => {

    it('should return only athletes whose name contains the search query (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          searchQueryArbitrary,
          (athletes, query) => {
            const filteredAthletes = filterAthletesBySearch(athletes, query)
            
            // ทุกนักกีฬาในผลลัพธ์ต้องมีชื่อที่ตรงกับคำค้นหา
            expect(allAthletesMatchQuery(filteredAthletes, query)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all athletes when search query is empty', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          (athletes) => {
            // ทดสอบกับ empty string
            const filteredEmpty = filterAthletesBySearch(athletes, '')
            expect(filteredEmpty.length).toBe(athletes.length)
            
            // ทดสอบกับ whitespace only
            const filteredWhitespace = filterAthletesBySearch(athletes, '   ')
            expect(filteredWhitespace.length).toBe(athletes.length)
            
            // ทดสอบกับ null/undefined
            const filteredNull = filterAthletesBySearch(athletes, null)
            expect(filteredNull.length).toBe(athletes.length)
            
            const filteredUndefined = filterAthletesBySearch(athletes, undefined)
            expect(filteredUndefined.length).toBe(athletes.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not exclude any athletes that match the search query', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          searchQueryArbitrary,
          (athletes, query) => {
            const filteredAthletes = filterAthletesBySearch(athletes, query)
            
            // ไม่มีนักกีฬาที่ตรงกับคำค้นหาถูกตัดออก
            expect(noMatchingAthletesExcluded(athletes, filteredAthletes, query)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter case-insensitively', () => {
      // ทดสอบการค้นหาแบบไม่สนใจตัวพิมพ์ใหญ่-เล็ก
      const athletes = [
        { id: '1', full_name: 'John Smith', name: 'John Smith', role: 'athlete' },
        { id: '2', full_name: 'JANE DOE', name: 'JANE DOE', role: 'athlete' },
        { id: '3', full_name: 'Bob Johnson', name: 'Bob Johnson', role: 'athlete' }
      ]
      
      // ค้นหาด้วยตัวพิมพ์เล็ก
      const filteredLower = filterAthletesBySearch(athletes, 'john')
      expect(filteredLower.length).toBe(2) // John Smith และ Bob Johnson
      expect(filteredLower.some(a => a.id === '1')).toBe(true)
      expect(filteredLower.some(a => a.id === '3')).toBe(true)
      
      // ค้นหาด้วยตัวพิมพ์ใหญ่
      const filteredUpper = filterAthletesBySearch(athletes, 'JOHN')
      expect(filteredUpper.length).toBe(2)
      
      // ค้นหาด้วยตัวพิมพ์ผสม
      const filteredMixed = filterAthletesBySearch(athletes, 'JoHn')
      expect(filteredMixed.length).toBe(2)
    })

    it('should handle Thai names correctly', () => {
      // ทดสอบการค้นหาชื่อภาษาไทย
      const athletes = [
        { id: '1', full_name: 'สมชาย ใจดี', name: 'สมชาย ใจดี', role: 'athlete' },
        { id: '2', full_name: 'สมหญิง รักดี', name: 'สมหญิง รักดี', role: 'athlete' },
        { id: '3', full_name: 'กมล สุขใจ', name: 'กมล สุขใจ', role: 'athlete' }
      ]
      
      // ค้นหาด้วยคำว่า "สม"
      const filteredSom = filterAthletesBySearch(athletes, 'สม')
      expect(filteredSom.length).toBe(2)
      expect(filteredSom.some(a => a.id === '1')).toBe(true)
      expect(filteredSom.some(a => a.id === '2')).toBe(true)
      
      // ค้นหาด้วยคำว่า "ใจ"
      const filteredJai = filterAthletesBySearch(athletes, 'ใจ')
      expect(filteredJai.length).toBe(2)
      expect(filteredJai.some(a => a.id === '1')).toBe(true)
      expect(filteredJai.some(a => a.id === '3')).toBe(true)
    })

    it('should return empty array when no athletes match', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          (athletes) => {
            // ใช้คำค้นหาที่ไม่น่าจะตรงกับชื่อใดๆ
            const impossibleQuery = '###IMPOSSIBLE_QUERY_12345###'
            const filteredAthletes = filterAthletesBySearch(athletes, impossibleQuery)
            
            expect(filteredAthletes.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle partial name matches', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 30 }),
          (athletes) => {
            // เลือกนักกีฬาสุ่มและใช้ส่วนหนึ่งของชื่อเป็นคำค้นหา
            const randomAthlete = athletes[Math.floor(Math.random() * athletes.length)]
            const fullName = randomAthlete.full_name || randomAthlete.name || ''
            
            if (fullName.length >= 2) {
              // ใช้ 2 ตัวอักษรแรกเป็นคำค้นหา
              const partialQuery = fullName.substring(0, 2)
              const filteredAthletes = filterAthletesBySearch(athletes, partialQuery)
              
              // นักกีฬาที่เลือกต้องอยู่ในผลลัพธ์
              expect(filteredAthletes.some(a => a.id === randomAthlete.id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve athlete data integrity after filtering', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          searchQueryArbitrary,
          (athletes, query) => {
            const filteredAthletes = filterAthletesBySearch(athletes, query)
            
            // ตรวจสอบว่าข้อมูลนักกีฬาไม่ถูกเปลี่ยนแปลง
            filteredAthletes.forEach(filtered => {
              const original = athletes.find(a => a.id === filtered.id)
              expect(original).toBeDefined()
              expect(filtered.full_name).toBe(original.full_name)
              expect(filtered.name).toBe(original.name)
              expect(filtered.club_id).toBe(original.club_id)
              expect(filtered.avatar_url).toBe(original.avatar_url)
            })
            
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
          searchQueryArbitrary,
          (athletes, query) => {
            const filteredAthletes = filterAthletesBySearch(athletes, query)
            
            // ทุกนักกีฬาในผลลัพธ์ต้องมีชื่อที่ตรงกับคำค้นหา
            expect(allAthletesMatchQuery(filteredAthletes, query)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should trim whitespace from search query', () => {
      const athletes = [
        { id: '1', full_name: 'John Smith', name: 'John Smith', role: 'athlete' },
        { id: '2', full_name: 'Jane Doe', name: 'Jane Doe', role: 'athlete' }
      ]
      
      // ค้นหาด้วย whitespace รอบๆ
      const filteredWithSpaces = filterAthletesBySearch(athletes, '  John  ')
      expect(filteredWithSpaces.length).toBe(1)
      expect(filteredWithSpaces[0].id).toBe('1')
    })

    it('should be idempotent - filtering twice with same query gives same result', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 30 }),
          searchQueryArbitrary,
          (athletes, query) => {
            const filteredOnce = filterAthletesBySearch(athletes, query)
            const filteredTwice = filterAthletesBySearch(filteredOnce, query)
            
            // การกรองซ้ำต้องได้ผลลัพธ์เหมือนเดิม
            expect(filteredTwice.length).toBe(filteredOnce.length)
            expect(filteredTwice.map(a => a.id)).toEqual(filteredOnce.map(a => a.id))
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not modify original array', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 2, maxLength: 20 }),
          searchQueryArbitrary,
          (athletes, query) => {
            // เก็บ copy ของ array ต้นฉบับ
            const originalIds = athletes.map(a => a.id)
            const originalLength = athletes.length
            
            // กรอง
            filterAthletesBySearch(athletes, query)
            
            // ตรวจสอบว่า array ต้นฉบับไม่ถูกเปลี่ยนแปลง
            expect(athletes.length).toBe(originalLength)
            expect(athletes.map(a => a.id)).toEqual(originalIds)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return subset of original athletes', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          searchQueryArbitrary,
          (athletes, query) => {
            const filteredAthletes = filterAthletesBySearch(athletes, query)
            
            // ผลลัพธ์ต้องเป็น subset ของต้นฉบับ
            expect(filteredAthletes.length).toBeLessThanOrEqual(athletes.length)
            
            // ทุก id ในผลลัพธ์ต้องมีอยู่ในต้นฉบับ
            const originalIds = new Set(athletes.map(a => a.id))
            filteredAthletes.forEach(athlete => {
              expect(originalIds.has(athlete.id)).toBe(true)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
