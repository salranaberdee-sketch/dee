/**
 * Banner Content Completeness Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับความครบถ้วนของเนื้อหาในแบนเนอร์
 * 
 * **Feature: upcoming-schedule-banner, Property 3: Banner content completeness**
 * **Validates: Requirements 1.3, 2.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getDateLabel, formatTime } from '../lib/scheduleUtils.js'

// ============================================================================
// Constants
// ============================================================================

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
 * จำลองการ render ข้อมูลแบนเนอร์ (เหมือนกับ component)
 * ฟังก์ชันนี้จำลองการทำงานของ UpcomingScheduleBanner.vue
 * @param {Object} schedule - ข้อมูลนัดหมาย
 * @returns {Object} - ข้อมูลที่จะแสดงในแบนเนอร์
 */
function renderBannerContent(schedule) {
  if (!schedule) {
    return null
  }
  
  return {
    dateLabel: schedule.date ? getDateLabel(schedule.date) : '',
    title: schedule.title || '',
    formattedTime: schedule.time ? formatTime(schedule.time) : '',
    location: schedule.location || '',
    // สร้าง details string เหมือนใน component
    details: schedule.time 
      ? `${formatTime(schedule.time)}${schedule.location ? ' · ' + schedule.location : ''}`
      : ''
  }
}

// ============================================================================
// Arbitraries
// ============================================================================

/**
 * Arbitrary for generating valid UUID
 */
const uuidArbitrary = fc.uuid()

/**
 * Arbitrary for generating schedule title (non-empty)
 */
const titleArbitrary = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim())

/**
 * Arbitrary for generating location (non-empty)
 */
const locationArbitrary = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim())

/**
 * Arbitrary for generating days from today (1-30 days in future)
 */
const futureDaysArbitrary = fc.integer({ min: 1, max: 30 })

/**
 * Arbitrary for generating valid time string (HH:MM:SS)
 */
const timeArbitrary = fc.record({
  hours: fc.integer({ min: 0, max: 23 }),
  minutes: fc.integer({ min: 0, max: 59 })
}).map(({ hours, minutes }) => 
  `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
)

/**
 * Arbitrary for generating schedule type
 */
const scheduleTypeArbitrary = fc.constantFrom(...SCHEDULE_TYPES)

/**
 * Arbitrary for generating a complete schedule with all required fields
 */
const completeScheduleArbitrary = fc.record({
  id: uuidArbitrary,
  title: titleArbitrary,
  date: futureDaysArbitrary.map(days => createFutureDateString(days)),
  time: timeArbitrary,
  location: locationArbitrary,
  club_id: fc.option(uuidArbitrary, { nil: null }),
  status: fc.constant('scheduled'),
  schedule_type: scheduleTypeArbitrary
})

// ============================================================================
// Property Tests
// ============================================================================

describe('Banner Content Completeness Property Tests', () => {

  /**
   * **Feature: upcoming-schedule-banner, Property 3: Banner content completeness**
   * **Validates: Requirements 1.3, 2.3**
   * 
   * For any schedule displayed in the banner, the rendered output should contain 
   * the schedule's title, formatted date, formatted time, and location.
   */
  describe('Property 3: Banner content completeness', () => {

    /**
     * ทดสอบว่าแบนเนอร์แสดง title ของนัดหมาย
     * **Validates: Requirements 1.3, 2.3**
     */
    it('should display schedule title in banner', () => {
      fc.assert(
        fc.property(
          completeScheduleArbitrary,
          (schedule) => {
            const rendered = renderBannerContent(schedule)
            
            // ต้องมี title
            expect(rendered).not.toBeNull()
            expect(rendered.title).toBe(schedule.title)
            expect(rendered.title.length).toBeGreaterThan(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าแบนเนอร์แสดง date label ของนัดหมาย
     * **Validates: Requirements 1.3, 2.3**
     */
    it('should display formatted date label in banner', () => {
      fc.assert(
        fc.property(
          completeScheduleArbitrary,
          (schedule) => {
            const rendered = renderBannerContent(schedule)
            
            // ต้องมี date label
            expect(rendered).not.toBeNull()
            expect(rendered.dateLabel).toBe(getDateLabel(schedule.date))
            expect(rendered.dateLabel.length).toBeGreaterThan(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าแบนเนอร์แสดงเวลาในรูปแบบ 24 ชั่วโมง
     * **Validates: Requirements 1.3, 2.3**
     */
    it('should display formatted time in 24-hour format', () => {
      fc.assert(
        fc.property(
          completeScheduleArbitrary,
          (schedule) => {
            const rendered = renderBannerContent(schedule)
            
            // ต้องมี formatted time
            expect(rendered).not.toBeNull()
            expect(rendered.formattedTime).toBe(formatTime(schedule.time))
            
            // ตรวจสอบรูปแบบ HH:MM
            expect(rendered.formattedTime).toMatch(/^\d{2}:\d{2}$/)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าแบนเนอร์แสดงสถานที่ของนัดหมาย
     * **Validates: Requirements 1.3, 2.3**
     */
    it('should display location in banner', () => {
      fc.assert(
        fc.property(
          completeScheduleArbitrary,
          (schedule) => {
            const rendered = renderBannerContent(schedule)
            
            // ต้องมี location
            expect(rendered).not.toBeNull()
            expect(rendered.location).toBe(schedule.location)
            expect(rendered.location.length).toBeGreaterThan(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าแบนเนอร์แสดงข้อมูลครบทั้ง 4 ส่วน (title, date, time, location)
     * **Validates: Requirements 1.3, 2.3**
     */
    it('should display all four required fields: title, date, time, and location', () => {
      fc.assert(
        fc.property(
          completeScheduleArbitrary,
          (schedule) => {
            const rendered = renderBannerContent(schedule)
            
            // ต้องมีข้อมูลครบทั้ง 4 ส่วน
            expect(rendered).not.toBeNull()
            
            // 1. Title
            expect(rendered.title).toBeTruthy()
            expect(rendered.title).toBe(schedule.title)
            
            // 2. Date Label
            expect(rendered.dateLabel).toBeTruthy()
            expect(rendered.dateLabel).toBe(getDateLabel(schedule.date))
            
            // 3. Formatted Time
            expect(rendered.formattedTime).toBeTruthy()
            expect(rendered.formattedTime).toBe(formatTime(schedule.time))
            
            // 4. Location
            expect(rendered.location).toBeTruthy()
            expect(rendered.location).toBe(schedule.location)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่า details string รวม time และ location ถูกต้อง
     * **Validates: Requirements 1.3, 2.3**
     */
    it('should combine time and location in details string', () => {
      fc.assert(
        fc.property(
          completeScheduleArbitrary,
          (schedule) => {
            const rendered = renderBannerContent(schedule)
            
            expect(rendered).not.toBeNull()
            
            // details ต้องมี time
            expect(rendered.details).toContain(formatTime(schedule.time))
            
            // details ต้องมี location (ถ้ามี)
            if (schedule.location) {
              expect(rendered.details).toContain(schedule.location)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าแบนเนอร์ไม่แสดงเมื่อ schedule เป็น null
     * **Validates: Requirements 1.2, 2.2**
     */
    it('should return null when schedule is null', () => {
      const rendered = renderBannerContent(null)
      expect(rendered).toBeNull()
    })

    /**
     * ทดสอบว่าแบนเนอร์ไม่แสดงเมื่อ schedule เป็น undefined
     */
    it('should return null when schedule is undefined', () => {
      const rendered = renderBannerContent(undefined)
      expect(rendered).toBeNull()
    })

    /**
     * ทดสอบว่าข้อมูลที่แสดงไม่ถูกเปลี่ยนแปลงจาก input
     * **Validates: Requirements 1.3, 2.3**
     */
    it('should preserve original schedule data in rendered output', () => {
      fc.assert(
        fc.property(
          completeScheduleArbitrary,
          (schedule) => {
            const rendered = renderBannerContent(schedule)
            
            expect(rendered).not.toBeNull()
            
            // Title ต้องตรงกับ input
            expect(rendered.title).toBe(schedule.title)
            
            // Location ต้องตรงกับ input
            expect(rendered.location).toBe(schedule.location)
            
            // Date label ต้องเป็นผลลัพธ์จาก getDateLabel
            expect(rendered.dateLabel).toBe(getDateLabel(schedule.date))
            
            // Time ต้องเป็นผลลัพธ์จาก formatTime
            expect(rendered.formattedTime).toBe(formatTime(schedule.time))
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าแบนเนอร์จัดการกับ schedule ที่ไม่มี location ได้
     */
    it('should handle schedule without location gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: uuidArbitrary,
            title: titleArbitrary,
            date: futureDaysArbitrary.map(days => createFutureDateString(days)),
            time: timeArbitrary,
            location: fc.constant(''),
            status: fc.constant('scheduled')
          }),
          (schedule) => {
            const rendered = renderBannerContent(schedule)
            
            expect(rendered).not.toBeNull()
            
            // ยังคงมี title, date, time
            expect(rendered.title).toBe(schedule.title)
            expect(rendered.dateLabel).toBe(getDateLabel(schedule.date))
            expect(rendered.formattedTime).toBe(formatTime(schedule.time))
            
            // location เป็นค่าว่าง
            expect(rendered.location).toBe('')
            
            // details ไม่มี separator " · "
            expect(rendered.details).not.toContain(' · ')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าแบนเนอร์จัดการกับ schedule ที่ไม่มี time ได้
     */
    it('should handle schedule without time gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: uuidArbitrary,
            title: titleArbitrary,
            date: futureDaysArbitrary.map(days => createFutureDateString(days)),
            time: fc.constant(''),
            location: locationArbitrary,
            status: fc.constant('scheduled')
          }),
          (schedule) => {
            const rendered = renderBannerContent(schedule)
            
            expect(rendered).not.toBeNull()
            
            // ยังคงมี title, date, location
            expect(rendered.title).toBe(schedule.title)
            expect(rendered.dateLabel).toBe(getDateLabel(schedule.date))
            expect(rendered.location).toBe(schedule.location)
            
            // time เป็นค่าว่าง
            expect(rendered.formattedTime).toBe('')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่า time format ถูกต้องสำหรับทุกชั่วโมงและนาที
     * **Validates: Requirements 1.3, 2.3**
     */
    it('should format time correctly for all hours and minutes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          (hours, minutes) => {
            const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
            const schedule = {
              id: crypto.randomUUID(),
              title: 'Test Schedule',
              date: createFutureDateString(1),
              time: timeString,
              location: 'Test Location',
              status: 'scheduled'
            }
            
            const rendered = renderBannerContent(schedule)
            
            expect(rendered).not.toBeNull()
            
            // ตรวจสอบรูปแบบ HH:MM
            const expectedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
            expect(rendered.formattedTime).toBe(expectedTime)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่า title ที่มีอักขระพิเศษแสดงได้ถูกต้อง
     */
    it('should handle titles with special characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 })
            .filter(s => s.trim().length > 0)
            .map(s => s.trim()),
          (title) => {
            const schedule = {
              id: crypto.randomUUID(),
              title: title,
              date: createFutureDateString(1),
              time: '18:00:00',
              location: 'Test Location',
              status: 'scheduled'
            }
            
            const rendered = renderBannerContent(schedule)
            
            expect(rendered).not.toBeNull()
            expect(rendered.title).toBe(title)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่า location ที่มีอักขระพิเศษแสดงได้ถูกต้อง
     */
    it('should handle locations with special characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0)
            .map(s => s.trim()),
          (location) => {
            const schedule = {
              id: crypto.randomUUID(),
              title: 'Test Schedule',
              date: createFutureDateString(1),
              time: '18:00:00',
              location: location,
              status: 'scheduled'
            }
            
            const rendered = renderBannerContent(schedule)
            
            expect(rendered).not.toBeNull()
            expect(rendered.location).toBe(location)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
