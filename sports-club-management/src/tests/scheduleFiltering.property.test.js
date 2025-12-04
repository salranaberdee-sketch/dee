/**
 * Schedule Filtering Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับการกรองนัดหมายตาม club_id
 * 
 * **Feature: upcoming-schedule-banner, Property 1: Club-based schedule filtering returns only matching schedules**
 * **Validates: Requirements 1.1, 2.1, 5.1, 5.2**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { getNextUpcomingSchedule } from '../lib/scheduleUtils.js'

// ============================================================================
// Constants
// ============================================================================

const SCHEDULE_STATUSES = ['scheduled', 'completed', 'cancelled']
const SCHEDULE_TYPES = ['training', 'competition', 'meeting', 'other']

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * สร้างวันที่ในอนาคตจากวันนี้
 * @param {number} daysFromToday - จำนวนวันที่ห่างจากวันนี้
 * @returns {string} - ISO date string (YYYY-MM-DD)
 */
function createFutureDateString(daysFromToday) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * สร้างเวลาในอนาคตจากเวลาปัจจุบัน
 * @param {number} hoursFromNow - จำนวนชั่วโมงที่ห่างจากเวลาปัจจุบัน
 * @returns {string} - Time string (HH:MM:SS)
 */
function createFutureTimeString(hoursFromNow) {
  const now = new Date()
  now.setHours(now.getHours() + hoursFromNow)
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}:00`
}

// ============================================================================
// Arbitraries
// ============================================================================

/**
 * Arbitrary for generating valid UUID
 */
const uuidArbitrary = fc.uuid()

/**
 * Arbitrary for generating valid club_id (UUID or null for global)
 */
const clubIdArbitrary = fc.option(fc.uuid(), { nil: null })

/**
 * Arbitrary for generating schedule title
 */
const titleArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)

/**
 * Arbitrary for generating location
 */
const locationArbitrary = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0)

/**
 * Arbitrary for generating days from today (1-30 days in future)
 */
const futureDaysArbitrary = fc.integer({ min: 1, max: 30 })

/**
 * Arbitrary for generating hours from now (1-12 hours)
 */
const futureHoursArbitrary = fc.integer({ min: 1, max: 12 })

/**
 * Arbitrary for generating schedule status (only 'scheduled' for upcoming)
 */
const activeStatusArbitrary = fc.constant('scheduled')

/**
 * Arbitrary for generating schedule type
 */
const scheduleTypeArbitrary = fc.constantFrom(...SCHEDULE_TYPES)

/**
 * Arbitrary for generating a single upcoming schedule
 */
const upcomingScheduleArbitrary = fc.record({
  id: uuidArbitrary,
  title: titleArbitrary,
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  date: futureDaysArbitrary.map(days => createFutureDateString(days)),
  time: futureHoursArbitrary.map(hours => createFutureTimeString(hours)),
  location: locationArbitrary,
  club_id: clubIdArbitrary,
  status: activeStatusArbitrary,
  schedule_type: scheduleTypeArbitrary
})

/**
 * Arbitrary for generating a schedule with specific club_id
 */
function scheduleWithClubIdArbitrary(clubId) {
  return fc.record({
    id: uuidArbitrary,
    title: titleArbitrary,
    description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
    date: futureDaysArbitrary.map(days => createFutureDateString(days)),
    time: futureHoursArbitrary.map(hours => createFutureTimeString(hours)),
    location: locationArbitrary,
    club_id: fc.constant(clubId),
    status: activeStatusArbitrary,
    schedule_type: scheduleTypeArbitrary
  })
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Schedule Filtering Property Tests', () => {

  /**
   * **Feature: upcoming-schedule-banner, Property 1: Club-based schedule filtering returns only matching schedules**
   * **Validates: Requirements 1.1, 2.1, 5.1, 5.2**
   * 
   * For any list of schedules and a user with a club_id, filtering schedules 
   * should return only schedules where schedule.club_id equals user.club_id 
   * or schedule.club_id is null (global schedules).
   */
  describe('Property 1: Club-based schedule filtering returns only matching schedules', () => {

    /**
     * ทดสอบว่าผลลัพธ์ต้องมี club_id ตรงกับผู้ใช้ หรือเป็น global schedule
     * **Validates: Requirements 5.1**
     */
    it('should return schedule with matching club_id or global schedule', () => {
      fc.assert(
        fc.property(
          // สร้าง club_id ของผู้ใช้
          uuidArbitrary,
          // สร้างรายการนัดหมายหลายรายการจากหลายชมรม
          fc.array(upcomingScheduleArbitrary, { minLength: 1, maxLength: 30 }),
          (userClubId, schedules) => {
            const result = getNextUpcomingSchedule(schedules, userClubId)
            
            // ถ้ามีผลลัพธ์ ต้องเป็นนัดหมายของ club เดียวกัน หรือ global
            if (result !== null) {
              const isMatchingClub = result.club_id === userClubId
              const isGlobalSchedule = result.club_id === null || result.club_id === undefined
              
              expect(isMatchingClub || isGlobalSchedule).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าผู้ใช้ที่มี club_id จะเห็นเฉพาะนัดหมายของ club ตัวเอง หรือ global
     * **Validates: Requirements 1.1, 2.1, 5.1**
     */
    it('should filter schedules to user club or global schedules only', () => {
      fc.assert(
        fc.property(
          // สร้าง club_id ของผู้ใช้
          uuidArbitrary,
          // สร้าง club_id อื่น
          uuidArbitrary,
          // สร้างนัดหมายของ club ผู้ใช้
          fc.array(scheduleWithClubIdArbitrary(null).chain(s => 
            uuidArbitrary.map(clubId => ({ ...s, club_id: clubId }))
          ), { minLength: 0, maxLength: 10 }),
          (userClubId, otherClubId, mixedSchedules) => {
            // ข้ามกรณีที่ club_id เหมือนกัน
            if (userClubId === otherClubId) {
              return true
            }
            
            // สร้างนัดหมายของ club ผู้ใช้
            const userClubSchedule = {
              id: crypto.randomUUID(),
              title: 'User Club Schedule',
              date: createFutureDateString(5),
              time: '18:00:00',
              location: 'Test Location',
              club_id: userClubId,
              status: 'scheduled',
              schedule_type: 'training'
            }
            
            // สร้างนัดหมายของ club อื่น
            const otherClubSchedule = {
              id: crypto.randomUUID(),
              title: 'Other Club Schedule',
              date: createFutureDateString(3),
              time: '17:00:00',
              location: 'Other Location',
              club_id: otherClubId,
              status: 'scheduled',
              schedule_type: 'training'
            }
            
            const allSchedules = [userClubSchedule, otherClubSchedule, ...mixedSchedules]
            const result = getNextUpcomingSchedule(allSchedules, userClubId)
            
            // ถ้ามีผลลัพธ์ ต้องไม่ใช่นัดหมายของ club อื่น
            if (result !== null) {
              expect(result.club_id).not.toBe(otherClubId)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าผู้ใช้ที่ไม่มี club_id จะเห็นเฉพาะ global schedules
     * **Validates: Requirements 5.2**
     */
    it('should return only global schedules for user without club_id', () => {
      fc.assert(
        fc.property(
          // สร้างรายการนัดหมายหลายรายการ
          fc.array(upcomingScheduleArbitrary, { minLength: 1, maxLength: 30 }),
          (schedules) => {
            // ผู้ใช้ไม่มี club_id
            const result = getNextUpcomingSchedule(schedules, null)
            
            // ถ้ามีผลลัพธ์ ต้องเป็น global schedule
            if (result !== null) {
              expect(result.club_id === null || result.club_id === undefined).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าไม่มีนัดหมายจาก club อื่นรั่วไหลมาในผลลัพธ์
     * **Validates: Requirements 5.1**
     */
    it('should never return schedules from other clubs', () => {
      fc.assert(
        fc.property(
          // สร้าง club_id ของผู้ใช้
          uuidArbitrary,
          // สร้าง club_id อื่นหลายๆ อัน
          fc.array(uuidArbitrary, { minLength: 1, maxLength: 5 }),
          (userClubId, otherClubIds) => {
            // กรอง club_id ที่ซ้ำกับผู้ใช้ออก
            const uniqueOtherClubIds = otherClubIds.filter(id => id !== userClubId)
            
            if (uniqueOtherClubIds.length === 0) {
              return true
            }
            
            // สร้างนัดหมายจาก club อื่นๆ
            const otherClubSchedules = uniqueOtherClubIds.map((clubId, index) => ({
              id: crypto.randomUUID(),
              title: `Other Club ${index} Schedule`,
              date: createFutureDateString(index + 1),
              time: '18:00:00',
              location: 'Test Location',
              club_id: clubId,
              status: 'scheduled',
              schedule_type: 'training'
            }))
            
            const result = getNextUpcomingSchedule(otherClubSchedules, userClubId)
            
            // ต้องไม่มีผลลัพธ์ เพราะไม่มีนัดหมายของ club ผู้ใช้
            expect(result).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่า global schedules (club_id = null) สามารถเห็นได้โดยทุกคน
     * **Validates: Requirements 5.1, 5.2**
     */
    it('should include global schedules for users with club_id', () => {
      fc.assert(
        fc.property(
          // สร้าง club_id ของผู้ใช้
          uuidArbitrary,
          (userClubId) => {
            // สร้าง global schedule
            const globalSchedule = {
              id: crypto.randomUUID(),
              title: 'Global Schedule',
              date: createFutureDateString(1),
              time: '10:00:00',
              location: 'Global Location',
              club_id: null,
              status: 'scheduled',
              schedule_type: 'meeting'
            }
            
            const result = getNextUpcomingSchedule([globalSchedule], userClubId)
            
            // ต้องได้ global schedule
            expect(result).not.toBeNull()
            expect(result.club_id).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าเมื่อมีทั้ง club schedule และ global schedule จะเลือกอันที่ใกล้ที่สุด
     */
    it('should select nearest schedule regardless of being club or global', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (userClubId, clubDays, globalDays) => {
            // สร้าง club schedule
            const clubSchedule = {
              id: crypto.randomUUID(),
              title: 'Club Schedule',
              date: createFutureDateString(clubDays),
              time: '18:00:00',
              location: 'Club Location',
              club_id: userClubId,
              status: 'scheduled',
              schedule_type: 'training'
            }
            
            // สร้าง global schedule
            const globalSchedule = {
              id: crypto.randomUUID(),
              title: 'Global Schedule',
              date: createFutureDateString(globalDays),
              time: '18:00:00',
              location: 'Global Location',
              club_id: null,
              status: 'scheduled',
              schedule_type: 'meeting'
            }
            
            const result = getNextUpcomingSchedule([clubSchedule, globalSchedule], userClubId)
            
            // ต้องได้นัดหมายที่ใกล้ที่สุด
            expect(result).not.toBeNull()
            
            if (clubDays < globalDays) {
              expect(result.title).toBe('Club Schedule')
            } else if (globalDays < clubDays) {
              expect(result.title).toBe('Global Schedule')
            }
            // ถ้าวันเดียวกัน ผลลัพธ์ขึ้นอยู่กับลำดับการ sort
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าไม่รวมนัดหมายที่ถูกยกเลิก
     */
    it('should not include cancelled schedules', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          (userClubId) => {
            // สร้างนัดหมายที่ถูกยกเลิก
            const cancelledSchedule = {
              id: crypto.randomUUID(),
              title: 'Cancelled Schedule',
              date: createFutureDateString(1),
              time: '18:00:00',
              location: 'Test Location',
              club_id: userClubId,
              status: 'cancelled',
              schedule_type: 'training'
            }
            
            const result = getNextUpcomingSchedule([cancelledSchedule], userClubId)
            
            // ต้องไม่มีผลลัพธ์
            expect(result).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าคืนค่า null เมื่อไม่มีนัดหมาย
     */
    it('should return null for empty schedule list', () => {
      fc.assert(
        fc.property(
          clubIdArbitrary,
          (userClubId) => {
            const result = getNextUpcomingSchedule([], userClubId)
            expect(result).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าคืนค่า null เมื่อ input เป็น null หรือ undefined
     */
    it('should return null for null or undefined input', () => {
      expect(getNextUpcomingSchedule(null, 'some-club-id')).toBeNull()
      expect(getNextUpcomingSchedule(undefined, 'some-club-id')).toBeNull()
    })

    /**
     * ทดสอบว่าข้อมูลนัดหมายไม่ถูกเปลี่ยนแปลงหลังการกรอง
     */
    it('should preserve schedule data integrity after filtering', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(upcomingScheduleArbitrary, { minLength: 1, maxLength: 20 }),
          (userClubId, schedules) => {
            // เพิ่มนัดหมายของ club ผู้ใช้เพื่อให้แน่ใจว่ามีผลลัพธ์
            const userSchedule = {
              id: crypto.randomUUID(),
              title: 'User Schedule',
              description: 'Test Description',
              date: createFutureDateString(5),
              time: '18:00:00',
              location: 'Test Location',
              club_id: userClubId,
              status: 'scheduled',
              schedule_type: 'training'
            }
            
            const allSchedules = [...schedules, userSchedule]
            const result = getNextUpcomingSchedule(allSchedules, userClubId)
            
            // ถ้ามีผลลัพธ์ ตรวจสอบว่าข้อมูลไม่ถูกเปลี่ยนแปลง
            if (result !== null) {
              const original = allSchedules.find(s => s.id === result.id)
              
              if (original) {
                expect(result.id).toBe(original.id)
                expect(result.title).toBe(original.title)
                expect(result.date).toBe(original.date)
                expect(result.time).toBe(original.time)
                expect(result.location).toBe(original.location)
                expect(result.club_id).toBe(original.club_id)
                expect(result.status).toBe(original.status)
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
   * **Feature: upcoming-schedule-banner, Property 2: Nearest schedule selection**
   * **Validates: Requirements 5.3**
   * 
   * For any list of upcoming schedules, the selected schedule should be the one 
   * with the earliest date and time combination that is greater than or equal 
   * to the current date/time.
   */
  describe('Property 2: Nearest schedule selection', () => {

    /**
     * ทดสอบว่าผลลัพธ์ต้องเป็นนัดหมายที่มีวันที่และเวลาใกล้ที่สุด
     * **Validates: Requirements 5.3**
     */
    it('should return the schedule with earliest date and time', () => {
      fc.assert(
        fc.property(
          // สร้าง club_id ของผู้ใช้
          uuidArbitrary,
          // สร้างรายการวันที่ในอนาคตที่แตกต่างกัน (1-30 วัน)
          fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 2, maxLength: 10 }),
          (userClubId, daysArray) => {
            // สร้างนัดหมายหลายรายการที่มีวันที่แตกต่างกัน
            const schedules = daysArray.map((days, index) => ({
              id: crypto.randomUUID(),
              title: `Schedule ${index}`,
              date: createFutureDateString(days),
              time: '18:00:00',
              location: 'Test Location',
              club_id: userClubId,
              status: 'scheduled',
              schedule_type: 'training'
            }))
            
            const result = getNextUpcomingSchedule(schedules, userClubId)
            
            // ต้องมีผลลัพธ์
            expect(result).not.toBeNull()
            
            // หาวันที่น้อยที่สุดจากรายการ
            const minDays = Math.min(...daysArray)
            const expectedDate = createFutureDateString(minDays)
            
            // ผลลัพธ์ต้องมีวันที่ตรงกับวันที่น้อยที่สุด
            expect(result.date).toBe(expectedDate)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าเมื่อวันที่เท่ากัน จะเลือกนัดหมายที่มีเวลาเร็วกว่า
     * **Validates: Requirements 5.3**
     */
    it('should select earlier time when dates are equal', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.integer({ min: 1, max: 30 }),
          // สร้างรายการชั่วโมงที่แตกต่างกัน (8-20)
          fc.array(fc.integer({ min: 8, max: 20 }), { minLength: 2, maxLength: 5 }),
          (userClubId, days, hoursArray) => {
            // ใช้วันเดียวกันทั้งหมด
            const sameDate = createFutureDateString(days)
            
            // สร้างนัดหมายหลายรายการที่มีเวลาแตกต่างกัน
            const schedules = hoursArray.map((hour, index) => ({
              id: crypto.randomUUID(),
              title: `Schedule at ${hour}:00`,
              date: sameDate,
              time: `${String(hour).padStart(2, '0')}:00:00`,
              location: 'Test Location',
              club_id: userClubId,
              status: 'scheduled',
              schedule_type: 'training'
            }))
            
            const result = getNextUpcomingSchedule(schedules, userClubId)
            
            // ต้องมีผลลัพธ์
            expect(result).not.toBeNull()
            
            // หาเวลาที่เร็วที่สุด
            const minHour = Math.min(...hoursArray)
            const expectedTime = `${String(minHour).padStart(2, '0')}:00:00`
            
            // ผลลัพธ์ต้องมีเวลาตรงกับเวลาที่เร็วที่สุด
            expect(result.time).toBe(expectedTime)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าผลลัพธ์ต้องไม่มีนัดหมายอื่นที่เร็วกว่า
     * **Validates: Requirements 5.3**
     */
    it('should not have any other schedule earlier than the result', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.array(
            fc.record({
              days: fc.integer({ min: 1, max: 30 }),
              hours: fc.integer({ min: 0, max: 23 }),
              minutes: fc.integer({ min: 0, max: 59 })
            }),
            { minLength: 2, maxLength: 15 }
          ),
          (userClubId, dateTimeArray) => {
            // สร้างนัดหมายหลายรายการที่มีวันที่และเวลาแตกต่างกัน
            const schedules = dateTimeArray.map((dt, index) => ({
              id: crypto.randomUUID(),
              title: `Schedule ${index}`,
              date: createFutureDateString(dt.days),
              time: `${String(dt.hours).padStart(2, '0')}:${String(dt.minutes).padStart(2, '0')}:00`,
              location: 'Test Location',
              club_id: userClubId,
              status: 'scheduled',
              schedule_type: 'training'
            }))
            
            const result = getNextUpcomingSchedule(schedules, userClubId)
            
            // ต้องมีผลลัพธ์
            expect(result).not.toBeNull()
            
            // ตรวจสอบว่าไม่มีนัดหมายอื่นที่เร็วกว่า
            const resultDateTime = new Date(`${result.date}T${result.time}`)
            
            for (const schedule of schedules) {
              if (schedule.id !== result.id) {
                const scheduleDateTime = new Date(`${schedule.date}T${schedule.time}`)
                // นัดหมายอื่นต้องไม่เร็วกว่าผลลัพธ์
                expect(scheduleDateTime.getTime()).toBeGreaterThanOrEqual(resultDateTime.getTime())
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าการเรียงลำดับถูกต้องเมื่อมีนัดหมายหลายรายการ
     * **Validates: Requirements 5.3**
     */
    it('should correctly sort schedules by date then time', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          (userClubId) => {
            // สร้างนัดหมายที่มีลำดับชัดเจน
            const schedules = [
              {
                id: crypto.randomUUID(),
                title: 'Third - Day 3',
                date: createFutureDateString(3),
                time: '10:00:00',
                location: 'Location',
                club_id: userClubId,
                status: 'scheduled',
                schedule_type: 'training'
              },
              {
                id: crypto.randomUUID(),
                title: 'First - Day 1 Early',
                date: createFutureDateString(1),
                time: '08:00:00',
                location: 'Location',
                club_id: userClubId,
                status: 'scheduled',
                schedule_type: 'training'
              },
              {
                id: crypto.randomUUID(),
                title: 'Second - Day 1 Late',
                date: createFutureDateString(1),
                time: '18:00:00',
                location: 'Location',
                club_id: userClubId,
                status: 'scheduled',
                schedule_type: 'training'
              },
              {
                id: crypto.randomUUID(),
                title: 'Fourth - Day 5',
                date: createFutureDateString(5),
                time: '09:00:00',
                location: 'Location',
                club_id: userClubId,
                status: 'scheduled',
                schedule_type: 'training'
              }
            ]
            
            const result = getNextUpcomingSchedule(schedules, userClubId)
            
            // ต้องได้นัดหมายแรก (Day 1 Early)
            expect(result).not.toBeNull()
            expect(result.title).toBe('First - Day 1 Early')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าเมื่อมีนัดหมายเดียว จะคืนค่านัดหมายนั้น
     * **Validates: Requirements 5.3**
     */
    it('should return the only schedule when there is exactly one', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 8, max: 20 }),
          (userClubId, days, hours) => {
            const singleSchedule = {
              id: crypto.randomUUID(),
              title: 'Only Schedule',
              date: createFutureDateString(days),
              time: `${String(hours).padStart(2, '0')}:00:00`,
              location: 'Test Location',
              club_id: userClubId,
              status: 'scheduled',
              schedule_type: 'training'
            }
            
            const result = getNextUpcomingSchedule([singleSchedule], userClubId)
            
            expect(result).not.toBeNull()
            expect(result.id).toBe(singleSchedule.id)
            expect(result.title).toBe('Only Schedule')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าการเลือกนัดหมายใกล้ที่สุดทำงานถูกต้องกับ global schedules
     * **Validates: Requirements 5.3**
     */
    it('should select nearest schedule including global schedules', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          fc.integer({ min: 2, max: 30 }),
          (userClubId, clubDays) => {
            // Global schedule ที่เร็วกว่า
            const globalSchedule = {
              id: crypto.randomUUID(),
              title: 'Global Schedule (Earlier)',
              date: createFutureDateString(1),
              time: '08:00:00',
              location: 'Global Location',
              club_id: null,
              status: 'scheduled',
              schedule_type: 'meeting'
            }
            
            // Club schedule ที่ช้ากว่า
            const clubSchedule = {
              id: crypto.randomUUID(),
              title: 'Club Schedule (Later)',
              date: createFutureDateString(clubDays),
              time: '18:00:00',
              location: 'Club Location',
              club_id: userClubId,
              status: 'scheduled',
              schedule_type: 'training'
            }
            
            const result = getNextUpcomingSchedule([clubSchedule, globalSchedule], userClubId)
            
            // ต้องได้ global schedule เพราะเร็วกว่า
            expect(result).not.toBeNull()
            expect(result.title).toBe('Global Schedule (Earlier)')
            expect(result.club_id).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าไม่รวมนัดหมายที่ถูกยกเลิกในการเลือกนัดหมายใกล้ที่สุด
     * **Validates: Requirements 5.3**
     */
    it('should skip cancelled schedules when selecting nearest', () => {
      fc.assert(
        fc.property(
          uuidArbitrary,
          (userClubId) => {
            // นัดหมายที่ถูกยกเลิก (เร็วกว่า)
            const cancelledSchedule = {
              id: crypto.randomUUID(),
              title: 'Cancelled Schedule',
              date: createFutureDateString(1),
              time: '08:00:00',
              location: 'Location',
              club_id: userClubId,
              status: 'cancelled',
              schedule_type: 'training'
            }
            
            // นัดหมายที่ยังใช้งานได้ (ช้ากว่า)
            const activeSchedule = {
              id: crypto.randomUUID(),
              title: 'Active Schedule',
              date: createFutureDateString(5),
              time: '18:00:00',
              location: 'Location',
              club_id: userClubId,
              status: 'scheduled',
              schedule_type: 'training'
            }
            
            const result = getNextUpcomingSchedule([cancelledSchedule, activeSchedule], userClubId)
            
            // ต้องได้ active schedule แม้จะช้ากว่า
            expect(result).not.toBeNull()
            expect(result.title).toBe('Active Schedule')
            expect(result.status).toBe('scheduled')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
