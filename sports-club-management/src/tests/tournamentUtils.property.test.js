/**
 * Tournament Utility Functions Property-Based Tests
 * 
 * **Feature: tournament-management-enhancement**
 * **Validates: Requirements 2.1, 2.2, 3.1, 3.2, 3.3, 5.4, 7.1, 7.2**
 * 
 * ทดสอบฟังก์ชัน utility สำหรับจัดการทัวนาเมนต์ด้วย Property-Based Testing
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  groupAthletesByClub,
  filterAthletesByName,
  groupParticipantsByCategory,
  sortParticipants,
  getCategoryCounts,
  getTotalFromGrouped,
  groupMatchesByRound,
  sortMatchesChronologically,
  calculateRegistrationStats
} from '../lib/tournamentUtils.js'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * Arbitrary สำหรับสร้างนักกีฬาที่มี club_id
 */
const athleteArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  club_id: fc.oneof(fc.uuid(), fc.constant(null))
})

/**
 * Arbitrary สำหรับสร้างรายการนักกีฬา
 */
const athleteListArbitrary = fc.array(athleteArbitrary, { minLength: 0, maxLength: 50 })

/**
 * Arbitrary สำหรับสร้างผู้เข้าแข่งขัน
 */
const participantArbitrary = fc.record({
  id: fc.uuid(),
  athlete_id: fc.uuid(),
  category: fc.oneof(
    fc.constant(null),
    fc.constant(''),
    fc.constant('   '),
    fc.string({ minLength: 1, maxLength: 20 })
  ),
  weight_class: fc.oneof(
    fc.constant(null),
    fc.constant(''),
    fc.string({ minLength: 1, maxLength: 10 })
  ),
  registration_status: fc.constantFrom('pending', 'approved', 'rejected', 'withdrawn'),
  athletes: fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 })
  })
})

/**
 * Arbitrary สำหรับสร้างรายการผู้เข้าแข่งขัน
 */
const participantListArbitrary = fc.array(participantArbitrary, { minLength: 0, maxLength: 50 })

/**
 * Arbitrary สำหรับสร้างวันที่ในรูปแบบ YYYY-MM-DD
 */
const dateStringArbitrary = fc.tuple(
  fc.integer({ min: 2020, max: 2030 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 })
).map(([y, m, d]) => 
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
)

/**
 * Arbitrary สำหรับสร้างการแข่งขัน
 */
const matchArbitrary = fc.record({
  id: fc.uuid(),
  tournament_id: fc.uuid(),
  participant_id: fc.uuid(),
  match_date: dateStringArbitrary,
  match_time: fc.oneof(
    fc.constant(null),
    fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 })
    ).map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  ),
  round: fc.oneof(
    fc.constant(null),
    fc.constant(''),
    fc.constant('   '),
    fc.constantFrom('รอบแรก', 'รอบสอง', 'รอบชิง', 'รอบรองชนะเลิศ')
  ),
  result: fc.constantFrom('win', 'lose', 'draw', 'pending')
})

/**
 * Arbitrary สำหรับสร้างรายการการแข่งขัน
 */
const matchListArbitrary = fc.array(matchArbitrary, { minLength: 0, maxLength: 50 })

// ============================================================================
// Property Tests
// ============================================================================

describe('Tournament Utility Property Tests', () => {

  /**
   * **Feature: tournament-management-enhancement, Property 4: Club grouping correctness**
   * **Validates: Requirements 2.1**
   * 
   * For any list of athletes, when grouped by club, each athlete SHALL appear
   * in exactly one group matching their club_id.
   */
  describe('Property 4: Club grouping correctness', () => {

    it('แต่ละนักกีฬาต้องอยู่ในกลุ่มเดียวที่ตรงกับ club_id', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          (athletes) => {
            const grouped = groupAthletesByClub(athletes)
            
            // นับจำนวนนักกีฬาทั้งหมดใน grouped
            let totalInGroups = 0
            for (const group of grouped.values()) {
              totalInGroups += group.length
            }
            
            // จำนวนนักกีฬาใน grouped ต้องเท่ากับจำนวนนักกีฬาทั้งหมด
            expect(totalInGroups).toBe(athletes.length)
            
            // ตรวจสอบว่าแต่ละนักกีฬาอยู่ในกลุ่มที่ถูกต้อง
            for (const athlete of athletes) {
              const expectedClubId = athlete.club_id || 'no_club'
              const group = grouped.get(expectedClubId)
              
              // ต้องมีกลุ่มสำหรับ club_id นี้
              expect(group).toBeDefined()
              
              // นักกีฬาต้องอยู่ในกลุ่มนี้
              const found = group.some(a => a.id === athlete.id)
              expect(found).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('นักกีฬาแต่ละคนต้องปรากฏในกลุ่มเดียวเท่านั้น', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          (athletes) => {
            const grouped = groupAthletesByClub(athletes)
            
            // สร้าง Set เก็บ ID ที่เจอแล้ว
            const seenIds = new Set()
            
            for (const group of grouped.values()) {
              for (const athlete of group) {
                // ต้องไม่เคยเจอ ID นี้มาก่อน
                expect(seenIds.has(athlete.id)).toBe(false)
                seenIds.add(athlete.id)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 5: Search filter correctness**
   * **Validates: Requirements 2.2**
   * 
   * For any search query, all athletes in the filtered result SHALL have names
   * containing the query string (case-insensitive).
   */
  describe('Property 5: Search filter correctness', () => {

    it('ผลลัพธ์ทั้งหมดต้องมีชื่อที่ตรงกับ query (case-insensitive)', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          fc.string({ minLength: 1, maxLength: 10 }),
          (athletes, query) => {
            const filtered = filterAthletesByName(athletes, query)
            const normalizedQuery = query.trim().toLowerCase()
            
            // ทุกผลลัพธ์ต้องมีชื่อที่ประกอบด้วย query
            for (const athlete of filtered) {
              const name = (athlete.name || '').toLowerCase()
              expect(name.includes(normalizedQuery)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('ผลลัพธ์ต้องไม่มีนักกีฬาที่ชื่อไม่ตรงกับ query', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          fc.string({ minLength: 1, maxLength: 10 }),
          (athletes, query) => {
            const filtered = filterAthletesByName(athletes, query)
            const normalizedQuery = query.trim().toLowerCase()
            
            // นับจำนวนนักกีฬาที่ควรจะอยู่ในผลลัพธ์
            const expectedCount = athletes.filter(a => 
              (a.name || '').toLowerCase().includes(normalizedQuery)
            ).length
            
            expect(filtered.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('query ว่างต้องคืนค่านักกีฬาทั้งหมด', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          (athletes) => {
            const filtered = filterAthletesByName(athletes, '')
            expect(filtered.length).toBe(athletes.length)
            
            const filteredWithSpaces = filterAthletesByName(athletes, '   ')
            expect(filteredWithSpaces.length).toBe(athletes.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 8: Category grouping correctness**
   * **Validates: Requirements 3.1, 3.4**
   * 
   * For any list of participants, when grouped by category, each participant SHALL appear
   * in exactly one group (including Uncategorized for null/empty category).
   */
  describe('Property 8: Category grouping correctness', () => {

    it('แต่ละผู้เข้าแข่งขันต้องอยู่ในกลุ่มเดียว', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const grouped = groupParticipantsByCategory(participants)
            
            // นับจำนวนผู้เข้าแข่งขันทั้งหมดใน grouped
            let totalInGroups = 0
            for (const group of grouped.values()) {
              totalInGroups += group.length
            }
            
            // จำนวนต้องเท่ากับจำนวนผู้เข้าแข่งขันทั้งหมด
            expect(totalInGroups).toBe(participants.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('ผู้เข้าแข่งขันที่ไม่มี category ต้องอยู่ในกลุ่ม uncategorized', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const grouped = groupParticipantsByCategory(participants)
            
            for (const participant of participants) {
              const category = participant.category
              const isUncategorized = !category || category.trim() === ''
              
              if (isUncategorized) {
                const uncategorizedGroup = grouped.get('uncategorized')
                if (participants.some(p => !p.category || p.category.trim() === '')) {
                  expect(uncategorizedGroup).toBeDefined()
                  const found = uncategorizedGroup.some(p => p.id === participant.id)
                  expect(found).toBe(true)
                }
              } else {
                const categoryGroup = grouped.get(category)
                expect(categoryGroup).toBeDefined()
                const found = categoryGroup.some(p => p.id === participant.id)
                expect(found).toBe(true)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('ผู้เข้าแข่งขันแต่ละคนต้องปรากฏในกลุ่มเดียวเท่านั้น', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const grouped = groupParticipantsByCategory(participants)
            
            const seenIds = new Set()
            
            for (const group of grouped.values()) {
              for (const participant of group) {
                expect(seenIds.has(participant.id)).toBe(false)
                seenIds.add(participant.id)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 9: Participant sorting correctness**
   * **Validates: Requirements 3.2**
   * 
   * For any category group, participants SHALL be sorted by weight_class first,
   * then by name alphabetically.
   */
  describe('Property 9: Participant sorting correctness', () => {

    it('ผู้เข้าแข่งขันต้องเรียงตาม weight_class ก่อน แล้วตาม name', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const sorted = sortParticipants(participants)
            
            // ตรวจสอบว่าเรียงลำดับถูกต้อง
            for (let i = 1; i < sorted.length; i++) {
              const prev = sorted[i - 1]
              const curr = sorted[i]
              
              const prevWeight = prev.weight_class || ''
              const currWeight = curr.weight_class || ''
              const prevName = prev.athletes?.name || prev.name || ''
              const currName = curr.athletes?.name || curr.name || ''
              
              // ถ้า weight_class ต่างกัน ต้องเรียงตาม weight_class
              if (prevWeight !== currWeight) {
                // ค่าว่างต้องอยู่ท้าย
                if (prevWeight === '' && currWeight !== '') {
                  // prev ว่าง curr ไม่ว่าง -> ผิด (ว่างต้องอยู่ท้าย)
                  expect(false).toBe(true)
                } else if (prevWeight !== '' && currWeight === '') {
                  // prev ไม่ว่าง curr ว่าง -> ถูก
                  continue
                } else {
                  // ทั้งคู่ไม่ว่าง -> เปรียบเทียบ locale
                  expect(prevWeight.localeCompare(currWeight, 'th')).toBeLessThanOrEqual(0)
                }
              } else {
                // weight_class เท่ากัน -> เรียงตาม name
                expect(prevName.localeCompare(currName, 'th')).toBeLessThanOrEqual(0)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('จำนวนผู้เข้าแข่งขันหลัง sort ต้องเท่าเดิม', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const sorted = sortParticipants(participants)
            expect(sorted.length).toBe(participants.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 10: Category count consistency**
   * **Validates: Requirements 3.3**
   * 
   * For any grouped participant list, the sum of all category counts SHALL equal
   * the total participant count.
   */
  describe('Property 10: Category count consistency', () => {

    it('ผลรวมของ category counts ต้องเท่ากับจำนวนผู้เข้าแข่งขันทั้งหมด', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const grouped = groupParticipantsByCategory(participants)
            const counts = getCategoryCounts(grouped)
            
            // ผลรวมของ counts ต้องเท่ากับจำนวนผู้เข้าแข่งขันทั้งหมด
            const totalFromCounts = counts.reduce((sum, c) => sum + c.count, 0)
            expect(totalFromCounts).toBe(participants.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('getTotalFromGrouped ต้องคืนค่าเท่ากับจำนวนผู้เข้าแข่งขันทั้งหมด', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const grouped = groupParticipantsByCategory(participants)
            const total = getTotalFromGrouped(grouped)
            
            expect(total).toBe(participants.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 13: Match round grouping correctness**
   * **Validates: Requirements 5.4, 7.1**
   * 
   * For any list of matches, when grouped by round, each match SHALL appear
   * in exactly one round group.
   */
  describe('Property 13: Match round grouping correctness', () => {

    it('แต่ละการแข่งขันต้องอยู่ในรอบเดียว', () => {
      fc.assert(
        fc.property(
          matchListArbitrary,
          (matches) => {
            const grouped = groupMatchesByRound(matches)
            
            // นับจำนวนการแข่งขันทั้งหมดใน grouped
            let totalInGroups = 0
            for (const group of grouped.values()) {
              totalInGroups += group.length
            }
            
            // จำนวนต้องเท่ากับจำนวนการแข่งขันทั้งหมด
            expect(totalInGroups).toBe(matches.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('การแข่งขันที่ไม่มี round ต้องอยู่ในกลุ่ม "ไม่ระบุรอบ"', () => {
      fc.assert(
        fc.property(
          matchListArbitrary,
          (matches) => {
            const grouped = groupMatchesByRound(matches)
            
            for (const match of matches) {
              const round = match.round
              const isUnspecified = !round || round.trim() === ''
              
              if (isUnspecified) {
                const unspecifiedGroup = grouped.get('ไม่ระบุรอบ')
                if (matches.some(m => !m.round || m.round.trim() === '')) {
                  expect(unspecifiedGroup).toBeDefined()
                  const found = unspecifiedGroup.some(m => m.id === match.id)
                  expect(found).toBe(true)
                }
              } else {
                const roundGroup = grouped.get(round)
                expect(roundGroup).toBeDefined()
                const found = roundGroup.some(m => m.id === match.id)
                expect(found).toBe(true)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('การแข่งขันแต่ละรายการต้องปรากฏในกลุ่มเดียวเท่านั้น', () => {
      fc.assert(
        fc.property(
          matchListArbitrary,
          (matches) => {
            const grouped = groupMatchesByRound(matches)
            
            const seenIds = new Set()
            
            for (const group of grouped.values()) {
              for (const match of group) {
                expect(seenIds.has(match.id)).toBe(false)
                seenIds.add(match.id)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 14: Match chronological sorting**
   * **Validates: Requirements 7.2**
   * 
   * For any round group, matches SHALL be sorted by match_date and match_time
   * in ascending order.
   */
  describe('Property 14: Match chronological sorting', () => {

    it('การแข่งขันต้องเรียงตามวันที่และเวลา (เก่าสุดก่อน)', () => {
      fc.assert(
        fc.property(
          matchListArbitrary,
          (matches) => {
            const sorted = sortMatchesChronologically(matches)
            
            // ตรวจสอบว่าเรียงลำดับถูกต้อง
            for (let i = 1; i < sorted.length; i++) {
              const prev = sorted[i - 1]
              const curr = sorted[i]
              
              const prevDate = prev.match_date || ''
              const currDate = curr.match_date || ''
              const prevTime = prev.match_time || '00:00'
              const currTime = curr.match_time || '00:00'
              
              // เปรียบเทียบวันที่ก่อน
              if (prevDate !== currDate) {
                expect(prevDate.localeCompare(currDate)).toBeLessThanOrEqual(0)
              } else {
                // วันที่เท่ากัน -> เปรียบเทียบเวลา
                expect(prevTime.localeCompare(currTime)).toBeLessThanOrEqual(0)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('จำนวนการแข่งขันหลัง sort ต้องเท่าเดิม', () => {
      fc.assert(
        fc.property(
          matchListArbitrary,
          (matches) => {
            const sorted = sortMatchesChronologically(matches)
            expect(sorted.length).toBe(matches.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('การ sort ต้องไม่เปลี่ยนแปลงข้อมูลต้นฉบับ', () => {
      fc.assert(
        fc.property(
          matchListArbitrary,
          (matches) => {
            // สร้าง copy ของ matches
            const originalIds = matches.map(m => m.id)
            
            sortMatchesChronologically(matches)
            
            // ตรวจสอบว่า matches ไม่เปลี่ยนแปลง
            const afterIds = matches.map(m => m.id)
            expect(afterIds).toEqual(originalIds)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 15: Statistics count accuracy**
   * **Validates: Requirements 6.1, 6.2**
   * 
   * For any participant list, the total count SHALL equal the sum of status breakdown counts.
   */
  describe('Property 15: Statistics count accuracy', () => {

    it('ผลรวมของ status breakdown ต้องเท่ากับ totalRegistered', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const stats = calculateRegistrationStats(participants, null)
            
            // ผลรวมของ status counts ต้องเท่ากับ totalRegistered
            const statusSum = 
              stats.byStatus.pending + 
              stats.byStatus.approved + 
              stats.byStatus.rejected + 
              stats.byStatus.withdrawn
            
            expect(statusSum).toBe(stats.totalRegistered)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('totalRegistered ต้องเท่ากับจำนวนผู้เข้าแข่งขันทั้งหมด', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const stats = calculateRegistrationStats(participants, null)
            
            expect(stats.totalRegistered).toBe(participants.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('ผลรวมของ byCategory ต้องเท่ากับ totalRegistered', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const stats = calculateRegistrationStats(participants, null)
            
            // ผลรวมของ category counts ต้องเท่ากับ totalRegistered
            let categorySum = 0
            for (const count of stats.byCategory.values()) {
              categorySum += count
            }
            
            expect(categorySum).toBe(stats.totalRegistered)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('แต่ละ status count ต้องไม่ติดลบ', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const stats = calculateRegistrationStats(participants, null)
            
            expect(stats.byStatus.pending).toBeGreaterThanOrEqual(0)
            expect(stats.byStatus.approved).toBeGreaterThanOrEqual(0)
            expect(stats.byStatus.rejected).toBeGreaterThanOrEqual(0)
            expect(stats.byStatus.withdrawn).toBeGreaterThanOrEqual(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 16: Remaining slots calculation**
   * **Validates: Requirements 6.4**
   * 
   * For any tournament with max_participants set, remaining slots SHALL equal
   * max_participants minus current participant count.
   */
  describe('Property 16: Remaining slots calculation', () => {

    it('remainingSlots ต้องเท่ากับ maxParticipants - totalRegistered (เมื่อ maxParticipants > 0)', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          fc.integer({ min: 1, max: 200 }),
          (participants, maxParticipants) => {
            const stats = calculateRegistrationStats(participants, maxParticipants)
            
            // remainingSlots ต้องเท่ากับ max - total (แต่ไม่ติดลบ)
            const expectedRemaining = Math.max(0, maxParticipants - participants.length)
            
            expect(stats.remainingSlots).toBe(expectedRemaining)
            expect(stats.maxParticipants).toBe(maxParticipants)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('remainingSlots ต้องเป็น null เมื่อ maxParticipants เป็น null', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const stats = calculateRegistrationStats(participants, null)
            
            expect(stats.remainingSlots).toBeNull()
            expect(stats.maxParticipants).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('remainingSlots ต้องไม่ติดลบ แม้ว่าจะมีผู้เข้าแข่งขันเกิน maxParticipants', () => {
      fc.assert(
        fc.property(
          fc.array(participantArbitrary, { minLength: 10, maxLength: 50 }),
          fc.integer({ min: 1, max: 9 }),
          (participants, maxParticipants) => {
            // กรณีที่ participants > maxParticipants
            const stats = calculateRegistrationStats(participants, maxParticipants)
            
            expect(stats.remainingSlots).toBeGreaterThanOrEqual(0)
            expect(stats.remainingSlots).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('remainingSlots ต้องเป็น null เมื่อ maxParticipants เป็น 0 หรือติดลบ', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          fc.integer({ min: -100, max: 0 }),
          (participants, maxParticipants) => {
            const stats = calculateRegistrationStats(participants, maxParticipants)
            
            // เมื่อ maxParticipants <= 0 ควรถือว่าไม่จำกัด
            expect(stats.remainingSlots).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
