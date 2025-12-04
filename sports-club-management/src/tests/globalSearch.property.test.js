/**
 * Global Search Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับการค้นหาข้ามชมรมและนักกีฬา (Admin)
 * 
 * **Feature: album-individual-view, Property 9: Global search returns results from both clubs and athletes**
 * **Validates: Requirements 5.2, 5.3**
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
 * Arbitrary for generating valid name (Thai and English)
 */
const nameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)

/**
 * Arbitrary for generating a club
 */
const clubArbitrary = fc.record({
  id: clubIdArbitrary,
  name: nameArbitrary
})

/**
 * Arbitrary for generating a single athlete profile
 */
const athleteProfileArbitrary = fc.record({
  id: uuidArbitrary,
  name: nameArbitrary,
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
  club_id: clubIdArbitrary,
  role: fc.constant('athlete')
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
 * ค้นหาชมรมตามชื่อ
 * จำลองการทำงานของ globalSearch สำหรับชมรม
 * 
 * @param {Array} clubs - รายการชมรมทั้งหมด
 * @param {string} query - คำค้นหา
 * @returns {Array} - รายการชมรมที่ตรงกับคำค้นหา
 */
function searchClubs(clubs, query) {
  if (!query || query.trim() === '') {
    return []
  }
  
  const searchTerm = query.toLowerCase().trim()
  return clubs.filter(club => 
    club.name.toLowerCase().includes(searchTerm)
  )
}

/**
 * ค้นหานักกีฬาตามชื่อ
 * จำลองการทำงานของ globalSearch สำหรับนักกีฬา
 * 
 * @param {Array} athletes - รายการนักกีฬาทั้งหมด
 * @param {string} query - คำค้นหา
 * @returns {Array} - รายการนักกีฬาที่ตรงกับคำค้นหา
 */
function searchAthletes(athletes, query) {
  if (!query || query.trim() === '') {
    return []
  }
  
  const searchTerm = query.toLowerCase().trim()
  return athletes.filter(athlete => 
    athlete.name.toLowerCase().includes(searchTerm)
  )
}

/**
 * จัดกลุ่มนักกีฬาตามชมรม
 * จำลองการทำงานของ globalSearch ที่จัดกลุ่มผลลัพธ์
 * 
 * @param {Array} athletes - รายการนักกีฬา
 * @param {Array} clubs - รายการชมรม (สำหรับดึงชื่อชมรม)
 * @returns {Array} - รายการนักกีฬาจัดกลุ่มตามชมรม
 */
function groupAthletesByClub(athletes, clubs) {
  const clubMap = new Map(clubs.map(c => [c.id, c.name]))
  const grouped = {}
  
  for (const athlete of athletes) {
    const clubId = athlete.club_id || 'no_club'
    const clubName = clubMap.get(clubId) || 'ไม่มีชมรม'
    
    if (!grouped[clubId]) {
      grouped[clubId] = {
        club_id: clubId,
        club_name: clubName,
        athletes: []
      }
    }
    grouped[clubId].athletes.push({
      ...athlete,
      full_name: athlete.name
    })
  }
  
  return Object.values(grouped)
}

/**
 * ค้นหาข้ามชมรมและนักกีฬา (Global Search)
 * จำลองการทำงานของ globalSearch function ใน store
 * 
 * @param {Array} clubs - รายการชมรมทั้งหมด
 * @param {Array} athletes - รายการนักกีฬาทั้งหมด
 * @param {string} query - คำค้นหา
 * @returns {Object} - ผลลัพธ์การค้นหา { clubs, athletesByClub }
 */
function globalSearch(clubs, athletes, query) {
  if (!query || query.trim() === '') {
    return { clubs: [], athletesByClub: [] }
  }
  
  const matchingClubs = searchClubs(clubs, query)
  const matchingAthletes = searchAthletes(athletes, query)
  const athletesByClub = groupAthletesByClub(matchingAthletes, clubs)
  
  return {
    clubs: matchingClubs,
    athletesByClub: athletesByClub
  }
}

/**
 * ตรวจสอบว่าทุกชมรมในผลลัพธ์มีชื่อที่ตรงกับคำค้นหา
 * 
 * @param {Array} clubs - รายการชมรมที่ค้นหาได้
 * @param {string} query - คำค้นหา
 * @returns {boolean} - true ถ้าทุกชมรมมีชื่อที่ตรงกับคำค้นหา
 */
function allClubsMatchQuery(clubs, query) {
  if (!query || query.trim() === '') {
    return clubs.length === 0
  }
  
  const searchTerm = query.toLowerCase().trim()
  return clubs.every(club => 
    club.name.toLowerCase().includes(searchTerm)
  )
}

/**
 * ตรวจสอบว่าทุกนักกีฬาในผลลัพธ์มีชื่อที่ตรงกับคำค้นหา
 * 
 * @param {Array} athletesByClub - รายการนักกีฬาจัดกลุ่มตามชมรม
 * @param {string} query - คำค้นหา
 * @returns {boolean} - true ถ้าทุกนักกีฬามีชื่อที่ตรงกับคำค้นหา
 */
function allAthletesMatchQuery(athletesByClub, query) {
  if (!query || query.trim() === '') {
    return athletesByClub.length === 0
  }
  
  const searchTerm = query.toLowerCase().trim()
  return athletesByClub.every(group => 
    group.athletes.every(athlete => {
      const athleteName = (athlete.full_name || athlete.name || '').toLowerCase()
      return athleteName.includes(searchTerm)
    })
  )
}

/**
 * ตรวจสอบว่านักกีฬาถูกจัดกลุ่มตามชมรมอย่างถูกต้อง
 * 
 * @param {Array} athletesByClub - รายการนักกีฬาจัดกลุ่มตามชมรม
 * @returns {boolean} - true ถ้านักกีฬาถูกจัดกลุ่มอย่างถูกต้อง
 */
function athletesGroupedCorrectly(athletesByClub) {
  return athletesByClub.every(group => 
    group.athletes.every(athlete => 
      athlete.club_id === group.club_id || 
      (group.club_id === 'no_club' && !athlete.club_id)
    )
  )
}


// ============================================================================
// Property Tests
// ============================================================================

describe('Global Search Property Tests', () => {

  /**
   * **Feature: album-individual-view, Property 9: Global search returns results from both clubs and athletes**
   * **Validates: Requirements 5.2, 5.3**
   * 
   * For any global search query by admin, the results should include clubs with 
   * names matching the query AND athletes with names matching the query, grouped by club.
   */
  describe('Property 9: Global search returns results from both clubs and athletes', () => {

    it('should return clubs with names matching the search query', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 0, maxLength: 30 }),
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          searchQueryArbitrary,
          (clubs, athletes, query) => {
            const result = globalSearch(clubs, athletes, query)
            
            // ทุกชมรมในผลลัพธ์ต้องมีชื่อที่ตรงกับคำค้นหา
            expect(allClubsMatchQuery(result.clubs, query)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return athletes with names matching the search query', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 0, maxLength: 30 }),
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          searchQueryArbitrary,
          (clubs, athletes, query) => {
            const result = globalSearch(clubs, athletes, query)
            
            // ทุกนักกีฬาในผลลัพธ์ต้องมีชื่อที่ตรงกับคำค้นหา
            expect(allAthletesMatchQuery(result.athletesByClub, query)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should group athletes by club correctly', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          searchQueryArbitrary,
          (clubs, athletes, query) => {
            const result = globalSearch(clubs, athletes, query)
            
            // นักกีฬาต้องถูกจัดกลุ่มตามชมรมอย่างถูกต้อง
            expect(athletesGroupedCorrectly(result.athletesByClub)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty results when query is empty', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 30 }),
          (clubs, athletes) => {
            // ทดสอบกับ empty string
            const resultEmpty = globalSearch(clubs, athletes, '')
            expect(resultEmpty.clubs).toEqual([])
            expect(resultEmpty.athletesByClub).toEqual([])
            
            // ทดสอบกับ whitespace only
            const resultWhitespace = globalSearch(clubs, athletes, '   ')
            expect(resultWhitespace.clubs).toEqual([])
            expect(resultWhitespace.athletesByClub).toEqual([])
            
            // ทดสอบกับ null/undefined
            const resultNull = globalSearch(clubs, athletes, null)
            expect(resultNull.clubs).toEqual([])
            expect(resultNull.athletesByClub).toEqual([])
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should find clubs when query matches club name', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 30 }),
          (clubs, athletes) => {
            // เลือกชมรมสุ่มและใช้ส่วนหนึ่งของชื่อเป็นคำค้นหา
            const randomClub = clubs[Math.floor(Math.random() * clubs.length)]
            const clubName = randomClub.name
            
            if (clubName.length >= 2) {
              const partialQuery = clubName.substring(0, Math.min(3, clubName.length))
              const result = globalSearch(clubs, athletes, partialQuery)
              
              // ชมรมที่เลือกต้องอยู่ในผลลัพธ์
              expect(result.clubs.some(c => c.id === randomClub.id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should find athletes when query matches athlete name', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 30 }),
          (clubs, athletes) => {
            // เลือกนักกีฬาสุ่มและใช้ส่วนหนึ่งของชื่อเป็นคำค้นหา
            const randomAthlete = athletes[Math.floor(Math.random() * athletes.length)]
            const athleteName = randomAthlete.name
            
            if (athleteName.length >= 2) {
              const partialQuery = athleteName.substring(0, Math.min(3, athleteName.length))
              const result = globalSearch(clubs, athletes, partialQuery)
              
              // นักกีฬาที่เลือกต้องอยู่ในผลลัพธ์
              const allAthletes = result.athletesByClub.flatMap(g => g.athletes)
              expect(allAthletes.some(a => a.id === randomAthlete.id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should search case-insensitively', () => {
      // ทดสอบการค้นหาแบบไม่สนใจตัวพิมพ์ใหญ่-เล็ก
      const clubs = [
        { id: '1', name: 'Bangkok Sports Club' },
        { id: '2', name: 'CHIANG MAI ATHLETICS' },
        { id: '3', name: 'phuket swimming' }
      ]
      
      const athletes = [
        { id: 'a1', name: 'John Smith', club_id: '1', role: 'athlete' },
        { id: 'a2', name: 'JANE DOE', club_id: '2', role: 'athlete' }
      ]
      
      // ค้นหาด้วยตัวพิมพ์เล็ก
      const resultLower = globalSearch(clubs, athletes, 'bangkok')
      expect(resultLower.clubs.length).toBe(1)
      expect(resultLower.clubs[0].id).toBe('1')
      
      // ค้นหาด้วยตัวพิมพ์ใหญ่
      const resultUpper = globalSearch(clubs, athletes, 'BANGKOK')
      expect(resultUpper.clubs.length).toBe(1)
      
      // ค้นหานักกีฬาด้วยตัวพิมพ์ผสม
      const resultMixed = globalSearch(clubs, athletes, 'JoHn')
      const allAthletes = resultMixed.athletesByClub.flatMap(g => g.athletes)
      expect(allAthletes.length).toBe(1)
      expect(allAthletes[0].id).toBe('a1')
    })

    it('should handle Thai names correctly', () => {
      // ทดสอบการค้นหาชื่อภาษาไทย
      const clubs = [
        { id: '1', name: 'สโมสรกีฬากรุงเทพ' },
        { id: '2', name: 'ชมรมว่ายน้ำเชียงใหม่' }
      ]
      
      const athletes = [
        { id: 'a1', name: 'สมชาย ใจดี', club_id: '1', role: 'athlete' },
        { id: 'a2', name: 'สมหญิง รักดี', club_id: '2', role: 'athlete' }
      ]
      
      // ค้นหาชมรมด้วยคำว่า "กรุงเทพ"
      const resultClub = globalSearch(clubs, athletes, 'กรุงเทพ')
      expect(resultClub.clubs.length).toBe(1)
      expect(resultClub.clubs[0].id).toBe('1')
      
      // ค้นหานักกีฬาด้วยคำว่า "สม"
      const resultAthlete = globalSearch(clubs, athletes, 'สม')
      const allAthletes = resultAthlete.athletesByClub.flatMap(g => g.athletes)
      expect(allAthletes.length).toBe(2)
    })

    it('should return empty results when no matches found', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 30 }),
          (clubs, athletes) => {
            // ใช้คำค้นหาที่ไม่น่าจะตรงกับชื่อใดๆ
            const impossibleQuery = '###IMPOSSIBLE_QUERY_12345###'
            const result = globalSearch(clubs, athletes, impossibleQuery)
            
            expect(result.clubs.length).toBe(0)
            expect(result.athletesByClub.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not include clubs that do not match the query', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 30 }),
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          searchQueryArbitrary,
          (clubs, athletes, query) => {
            const result = globalSearch(clubs, athletes, query)
            const searchTerm = query.toLowerCase().trim()
            
            // ตรวจสอบว่าไม่มีชมรมที่ไม่ตรงกับคำค้นหา
            const nonMatchingClubs = result.clubs.filter(club => 
              !club.name.toLowerCase().includes(searchTerm)
            )
            
            expect(nonMatchingClubs.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not include athletes that do not match the query', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 30 }),
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          searchQueryArbitrary,
          (clubs, athletes, query) => {
            const result = globalSearch(clubs, athletes, query)
            const searchTerm = query.toLowerCase().trim()
            
            // ตรวจสอบว่าไม่มีนักกีฬาที่ไม่ตรงกับคำค้นหา
            const allAthletes = result.athletesByClub.flatMap(g => g.athletes)
            const nonMatchingAthletes = allAthletes.filter(athlete => {
              const athleteName = (athlete.full_name || athlete.name || '').toLowerCase()
              return !athleteName.includes(searchTerm)
            })
            
            expect(nonMatchingAthletes.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include all matching clubs', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 30 }),
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          searchQueryArbitrary,
          (clubs, athletes, query) => {
            const result = globalSearch(clubs, athletes, query)
            const searchTerm = query.toLowerCase().trim()
            
            // นับจำนวนชมรมที่ควรตรงกับคำค้นหา
            const expectedMatchingClubs = clubs.filter(club => 
              club.name.toLowerCase().includes(searchTerm)
            )
            
            expect(result.clubs.length).toBe(expectedMatchingClubs.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include all matching athletes', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 30 }),
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          searchQueryArbitrary,
          (clubs, athletes, query) => {
            const result = globalSearch(clubs, athletes, query)
            const searchTerm = query.toLowerCase().trim()
            
            // นับจำนวนนักกีฬาที่ควรตรงกับคำค้นหา
            const expectedMatchingAthletes = athletes.filter(athlete => 
              athlete.name.toLowerCase().includes(searchTerm)
            )
            
            const allResultAthletes = result.athletesByClub.flatMap(g => g.athletes)
            expect(allResultAthletes.length).toBe(expectedMatchingAthletes.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve data integrity for clubs', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 30 }),
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          searchQueryArbitrary,
          (clubs, athletes, query) => {
            const result = globalSearch(clubs, athletes, query)
            
            // ตรวจสอบว่าข้อมูลชมรมไม่ถูกเปลี่ยนแปลง
            for (const resultClub of result.clubs) {
              const original = clubs.find(c => c.id === resultClub.id)
              expect(original).toBeDefined()
              expect(resultClub.name).toBe(original.name)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve data integrity for athletes', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 30 }),
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          searchQueryArbitrary,
          (clubs, athletes, query) => {
            const result = globalSearch(clubs, athletes, query)
            
            // ตรวจสอบว่าข้อมูลนักกีฬาไม่ถูกเปลี่ยนแปลง
            const allResultAthletes = result.athletesByClub.flatMap(g => g.athletes)
            for (const resultAthlete of allResultAthletes) {
              const original = athletes.find(a => a.id === resultAthlete.id)
              expect(original).toBeDefined()
              expect(resultAthlete.name).toBe(original.name)
              expect(resultAthlete.club_id).toBe(original.club_id)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should add full_name field to athletes in results', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 1, maxLength: 20 }),
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 30 }),
          searchQueryArbitrary,
          (clubs, athletes, query) => {
            const result = globalSearch(clubs, athletes, query)
            
            // ตรวจสอบว่านักกีฬาทุกคนมี full_name field
            const allResultAthletes = result.athletesByClub.flatMap(g => g.athletes)
            for (const athlete of allResultAthletes) {
              expect(athlete.full_name).toBeDefined()
              expect(athlete.full_name).toBe(athlete.name)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle athletes without club_id', () => {
      // ทดสอบกรณีนักกีฬาไม่มี club_id
      const clubs = [
        { id: '1', name: 'Test Club' }
      ]
      
      const athletes = [
        { id: 'a1', name: 'John Smith', club_id: '1', role: 'athlete' },
        { id: 'a2', name: 'Mary Jane', club_id: null, role: 'athlete' },
        { id: 'a3', name: 'Bob Williams', club_id: undefined, role: 'athlete' }
      ]
      
      const result = globalSearch(clubs, athletes, 'Mary')
      
      // ควรพบ Mary (มี 'Mary' ในชื่อ)
      const allAthletes = result.athletesByClub.flatMap(g => g.athletes)
      expect(allAthletes.length).toBe(1)
      expect(allAthletes[0].id).toBe('a2')
      
      // ตรวจสอบว่านักกีฬาที่ไม่มี club_id ถูกจัดกลุ่มใน 'no_club'
      const noClubGroup = result.athletesByClub.find(g => g.club_id === 'no_club')
      expect(noClubGroup).toBeDefined()
      expect(noClubGroup.club_name).toBe('ไม่มีชมรม')
    })

    it('should trim whitespace from search query', () => {
      const clubs = [
        { id: '1', name: 'Bangkok Club' }
      ]
      
      const athletes = [
        { id: 'a1', name: 'John Smith', club_id: '1', role: 'athlete' }
      ]
      
      // ค้นหาด้วย whitespace รอบๆ
      const result = globalSearch(clubs, athletes, '  Bangkok  ')
      expect(result.clubs.length).toBe(1)
      expect(result.clubs[0].id).toBe('1')
    })

    it('should return both clubs and athletes when query matches both', () => {
      // ทดสอบกรณีที่คำค้นหาตรงกับทั้งชื่อชมรมและชื่อนักกีฬา
      const clubs = [
        { id: '1', name: 'Smith Sports Club' },
        { id: '2', name: 'Bangkok Athletics' }
      ]
      
      const athletes = [
        { id: 'a1', name: 'John Smith', club_id: '1', role: 'athlete' },
        { id: 'a2', name: 'Jane Doe', club_id: '2', role: 'athlete' }
      ]
      
      // ค้นหาด้วยคำว่า "Smith" ซึ่งตรงกับทั้งชมรมและนักกีฬา
      const result = globalSearch(clubs, athletes, 'Smith')
      
      // ต้องพบทั้งชมรมและนักกีฬา
      expect(result.clubs.length).toBe(1)
      expect(result.clubs[0].name).toBe('Smith Sports Club')
      
      const allAthletes = result.athletesByClub.flatMap(g => g.athletes)
      expect(allAthletes.length).toBe(1)
      expect(allAthletes[0].name).toBe('John Smith')
    })
  })
})
