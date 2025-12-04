/**
 * Admin Club Selection Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับการเลือกชมรมของ Admin
 * 
 * **Feature: album-individual-view, Property 7: Admin club selection returns only athletes from that club**
 * **Validates: Requirements 3.3**
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
 * Arbitrary for generating valid athlete name
 */
const athleteNameArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)

/**
 * Arbitrary for generating a single athlete profile
 */
const athleteProfileArbitrary = fc.record({
  id: uuidArbitrary,
  name: athleteNameArbitrary,
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
  club_id: clubIdArbitrary,
  role: fc.constant('athlete')
})

/**
 * Arbitrary for generating a club
 */
const clubArbitrary = fc.record({
  id: clubIdArbitrary,
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
})

// ============================================================================
// Pure Functions for Testing (simulating store operations)
// ============================================================================

/**
 * กรองนักกีฬาตาม club_id ที่ Admin เลือก
 * จำลองการทำงานของ fetchAthletesByClub
 * 
 * @param {Array} allAthletes - รายการนักกีฬาทั้งหมด
 * @param {string} selectedClubId - club_id ที่ Admin เลือก
 * @returns {Array} - รายการนักกีฬาในชมรมที่เลือก
 */
function filterAthletesByClub(allAthletes, selectedClubId) {
  if (!selectedClubId) {
    return []
  }
  
  return allAthletes.filter(athlete => 
    athlete.club_id === selectedClubId && athlete.role === 'athlete'
  )
}

/**
 * ตรวจสอบว่านักกีฬาทุกคนอยู่ในชมรมที่เลือก
 * 
 * @param {Array} athletes - รายการนักกีฬา
 * @param {string} selectedClubId - club_id ที่เลือก
 * @returns {boolean} - true ถ้านักกีฬาทุกคนอยู่ในชมรมที่เลือก
 */
function allAthletesInSelectedClub(athletes, selectedClubId) {
  return athletes.every(athlete => athlete.club_id === selectedClubId)
}

/**
 * ตรวจสอบว่าผลลัพธ์มีเฉพาะ role athlete เท่านั้น
 * 
 * @param {Array} athletes - รายการนักกีฬา
 * @returns {boolean} - true ถ้าทุกคนเป็น athlete
 */
function allAreAthletes(athletes) {
  return athletes.every(athlete => athlete.role === 'athlete')
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Admin Club Selection Property Tests', () => {

  /**
   * **Feature: album-individual-view, Property 7: Admin club selection returns only athletes from that club**
   * **Validates: Requirements 3.3**
   * 
   * For any club selection by admin, all returned athletes should have club_id 
   * matching the selected club's id.
   */
  describe('Property 7: Admin club selection returns only athletes from that club', () => {

    it('should return only athletes with club_id matching selected club', () => {
      fc.assert(
        fc.property(
          // สร้างชมรมที่เลือก
          clubArbitrary,
          // สร้างรายการนักกีฬาหลายคนจากหลายชมรม
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          (selectedClub, allAthletes) => {
            // กรองนักกีฬาตาม club_id ที่เลือก
            const filteredAthletes = filterAthletesByClub(allAthletes, selectedClub.id)
            
            // ตรวจสอบว่านักกีฬาทุกคนอยู่ในชมรมที่เลือก
            expect(allAthletesInSelectedClub(filteredAthletes, selectedClub.id)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return only users with role athlete', () => {
      fc.assert(
        fc.property(
          clubArbitrary,
          // สร้างรายการผู้ใช้หลายคนที่มีทั้ง athlete และ coach
          fc.array(
            fc.oneof(
              athleteProfileArbitrary,
              fc.record({
                id: uuidArbitrary,
                name: athleteNameArbitrary,
                avatar_url: fc.option(fc.webUrl(), { nil: null }),
                club_id: clubIdArbitrary,
                role: fc.constant('coach')
              })
            ),
            { minLength: 0, maxLength: 50 }
          ),
          (selectedClub, allUsers) => {
            // กรองนักกีฬาตาม club_id ที่เลือก
            const filteredAthletes = filterAthletesByClub(allUsers, selectedClub.id)
            
            // ตรวจสอบว่าผลลัพธ์มีเฉพาะ athlete เท่านั้น
            expect(allAreAthletes(filteredAthletes)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not include athletes from other clubs', () => {
      fc.assert(
        fc.property(
          clubArbitrary,
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          (selectedClub, allAthletes) => {
            const filteredAthletes = filterAthletesByClub(allAthletes, selectedClub.id)
            
            // นับจำนวนนักกีฬาจากชมรมอื่น
            const athletesFromOtherClubs = filteredAthletes.filter(
              athlete => athlete.club_id !== selectedClub.id
            )
            
            // ต้องไม่มีนักกีฬาจากชมรมอื่น
            expect(athletesFromOtherClubs.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when no club is selected', () => {
      fc.assert(
        fc.property(
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 50 }),
          (allAthletes) => {
            // ไม่ได้เลือกชมรม (null)
            const filteredAthletes = filterAthletesByClub(allAthletes, null)
            
            // ต้องได้ array ว่าง
            expect(filteredAthletes).toEqual([])
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return empty array when no athletes in selected club', () => {
      fc.assert(
        fc.property(
          clubArbitrary,
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 20 }),
          (selectedClub, allAthletes) => {
            // กรองเอาเฉพาะนักกีฬาที่ไม่อยู่ในชมรมที่เลือก
            const athletesNotInSelectedClub = allAthletes.filter(
              a => a.club_id !== selectedClub.id
            )
            
            const filteredAthletes = filterAthletesByClub(athletesNotInSelectedClub, selectedClub.id)
            
            // ต้องได้ array ว่าง
            expect(filteredAthletes.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include all athletes from selected club', () => {
      fc.assert(
        fc.property(
          clubArbitrary,
          fc.array(athleteProfileArbitrary, { minLength: 0, maxLength: 50 }),
          (selectedClub, allAthletes) => {
            // นับจำนวนนักกีฬาในชมรมที่เลือกจากข้อมูลต้นฉบับ
            const expectedCount = allAthletes.filter(
              a => a.club_id === selectedClub.id && a.role === 'athlete'
            ).length
            
            const filteredAthletes = filterAthletesByClub(allAthletes, selectedClub.id)
            
            // จำนวนต้องตรงกัน
            expect(filteredAthletes.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve athlete data integrity after filtering', () => {
      fc.assert(
        fc.property(
          clubArbitrary,
          fc.array(athleteProfileArbitrary, { minLength: 1, maxLength: 30 }),
          (selectedClub, allAthletes) => {
            const filteredAthletes = filterAthletesByClub(allAthletes, selectedClub.id)
            
            // ตรวจสอบว่าข้อมูลนักกีฬาไม่ถูกเปลี่ยนแปลง
            for (const filtered of filteredAthletes) {
              const original = allAthletes.find(a => a.id === filtered.id)
              
              if (original) {
                expect(filtered.id).toBe(original.id)
                expect(filtered.name).toBe(original.name)
                expect(filtered.avatar_url).toBe(original.avatar_url)
                expect(filtered.club_id).toBe(original.club_id)
                expect(filtered.role).toBe(original.role)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle athletes with same club_id as selected club correctly', () => {
      // ทดสอบกรณีที่มีนักกีฬาหลายคนในชมรมที่เลือก
      fc.assert(
        fc.property(
          clubIdArbitrary,
          fc.array(athleteNameArbitrary, { minLength: 2, maxLength: 10 }),
          (sharedClubId, names) => {
            // สร้างชมรมและนักกีฬาที่อยู่ในชมรมเดียวกัน
            const selectedClub = {
              id: sharedClubId,
              name: 'Test Club'
            }
            
            const athletesInSameClub = names.map((name) => ({
              id: crypto.randomUUID(),
              name: name,
              avatar_url: null,
              club_id: sharedClubId,
              role: 'athlete'
            }))
            
            const filteredAthletes = filterAthletesByClub(athletesInSameClub, selectedClub.id)
            
            // ต้องได้นักกีฬาทุกคน
            expect(filteredAthletes.length).toBe(athletesInSameClub.length)
            
            // ทุกคนต้องอยู่ในชมรมที่เลือก
            expect(allAthletesInSelectedClub(filteredAthletes, selectedClub.id)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly filter mixed club athletes', () => {
      fc.assert(
        fc.property(
          clubIdArbitrary,
          clubIdArbitrary,
          fc.array(athleteNameArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(athleteNameArbitrary, { minLength: 1, maxLength: 10 }),
          (selectedClubId, otherClubId, selectedClubNames, otherClubNames) => {
            // ข้ามกรณีที่ club_id เหมือนกัน
            if (selectedClubId === otherClubId) {
              return true
            }
            
            // สร้างนักกีฬาในชมรมที่เลือก
            const athletesInSelectedClub = selectedClubNames.map(name => ({
              id: crypto.randomUUID(),
              name,
              avatar_url: null,
              club_id: selectedClubId,
              role: 'athlete'
            }))
            
            // สร้างนักกีฬาในชมรมอื่น
            const athletesInOtherClub = otherClubNames.map(name => ({
              id: crypto.randomUUID(),
              name,
              avatar_url: null,
              club_id: otherClubId,
              role: 'athlete'
            }))
            
            // รวมนักกีฬาทั้งหมด
            const allAthletes = [...athletesInSelectedClub, ...athletesInOtherClub]
            
            const filteredAthletes = filterAthletesByClub(allAthletes, selectedClubId)
            
            // ต้องได้เฉพาะนักกีฬาในชมรมที่เลือก
            expect(filteredAthletes.length).toBe(athletesInSelectedClub.length)
            expect(allAthletesInSelectedClub(filteredAthletes, selectedClubId)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should work with multiple clubs selection sequentially', () => {
      fc.assert(
        fc.property(
          fc.array(clubArbitrary, { minLength: 2, maxLength: 5 }),
          fc.array(athleteProfileArbitrary, { minLength: 5, maxLength: 30 }),
          (clubs, allAthletes) => {
            // ทดสอบการเลือกชมรมหลายครั้งติดต่อกัน
            for (const club of clubs) {
              const filteredAthletes = filterAthletesByClub(allAthletes, club.id)
              
              // ทุกครั้งที่เลือกชมรม ต้องได้เฉพาะนักกีฬาในชมรมนั้น
              expect(allAthletesInSelectedClub(filteredAthletes, club.id)).toBe(true)
              expect(allAreAthletes(filteredAthletes)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
