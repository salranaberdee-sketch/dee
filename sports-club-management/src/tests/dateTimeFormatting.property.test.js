/**
 * Date and Time Formatting Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับการจัดรูปแบบวันที่และเวลา
 * 
 * **Feature: upcoming-schedule-banner, Property 5: Date and time formatting**
 * **Validates: Requirements 3.1, 3.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { formatThaiDate, formatTime } from '../lib/scheduleUtils.js'

// ============================================================================
// Constants
// ============================================================================

// ชื่อเดือนภาษาไทยแบบย่อ (ต้องตรงกับ scheduleUtils.js)
const THAI_MONTH_NAMES = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.'
]

// ค่าคงที่สำหรับการแปลงปี ค.ศ. เป็น พ.ศ.
const BUDDHIST_ERA_OFFSET = 543

// ============================================================================
// Arbitraries
// ============================================================================

/**
 * Arbitrary สำหรับสร้างวันที่ที่ valid (ปี 2000-2100)
 * กรองเฉพาะวันที่ที่ valid (ไม่ใช่ NaN)
 */
const validDateArbitrary = fc.date({
  min: new Date('2000-01-01'),
  max: new Date('2100-12-31')
}).filter(date => !isNaN(date.getTime()))

/**
 * Arbitrary สำหรับสร้างเวลาในรูปแบบ HH:MM
 */
const timeHHMMArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 })
).map(([hours, minutes]) => {
  const h = String(hours).padStart(2, '0')
  const m = String(minutes).padStart(2, '0')
  return `${h}:${m}`
})

/**
 * Arbitrary สำหรับสร้างเวลาในรูปแบบ HH:MM:SS
 */
const timeHHMMSSArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 }),
  fc.integer({ min: 0, max: 59 })
).map(([hours, minutes, seconds]) => {
  const h = String(hours).padStart(2, '0')
  const m = String(minutes).padStart(2, '0')
  const s = String(seconds).padStart(2, '0')
  return `${h}:${m}:${s}`
})

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * แปลง Date เป็น ISO string (YYYY-MM-DD)
 * @param {Date} date - วันที่
 * @returns {string} - ISO date string
 */
function toISODateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Date and Time Formatting Property Tests', () => {

  /**
   * **Feature: upcoming-schedule-banner, Property 5: Date and time formatting**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * For any valid date and time, the formatted output should:
   * - Date: Match Thai locale format (day month year in Buddhist era)
   * - Time: Be in 24-hour format (HH:MM)
   */
  describe('Property 5: Date and time formatting', () => {

    // ========================================================================
    // Thai Date Formatting Tests (Requirements 3.1)
    // ========================================================================

    describe('Thai Date Formatting (Requirements 3.1)', () => {

      /**
       * ทดสอบว่าวันที่ต้องอยู่ในรูปแบบ "วัน เดือน ปี" (พ.ศ.)
       */
      it('should format date as "day month year" in Buddhist era', () => {
        fc.assert(
          fc.property(
            validDateArbitrary,
            (date) => {
              const formatted = formatThaiDate(date)
              
              // ต้องไม่เป็นค่าว่าง
              expect(formatted).not.toBe('')
              
              // ต้องมีรูปแบบ "วัน เดือน ปี"
              const parts = formatted.split(' ')
              expect(parts.length).toBe(3)
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่าวันที่ต้องแสดงวันที่ถูกต้อง (1-31)
       */
      it('should display correct day of month', () => {
        fc.assert(
          fc.property(
            validDateArbitrary,
            (date) => {
              const formatted = formatThaiDate(date)
              const parts = formatted.split(' ')
              const day = parseInt(parts[0], 10)
              
              // วันที่ต้องตรงกับ Date object
              expect(day).toBe(date.getDate())
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่าเดือนต้องเป็นชื่อเดือนภาษาไทยแบบย่อ
       */
      it('should display Thai month abbreviation', () => {
        fc.assert(
          fc.property(
            validDateArbitrary,
            (date) => {
              const formatted = formatThaiDate(date)
              const parts = formatted.split(' ')
              const month = parts[1]
              
              // เดือนต้องอยู่ใน THAI_MONTH_NAMES
              expect(THAI_MONTH_NAMES).toContain(month)
              
              // เดือนต้องตรงกับ index ของ Date object
              const expectedMonth = THAI_MONTH_NAMES[date.getMonth()]
              expect(month).toBe(expectedMonth)
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่าปีต้องเป็นปี พ.ศ. (ค.ศ. + 543)
       */
      it('should display year in Buddhist era (CE + 543)', () => {
        fc.assert(
          fc.property(
            validDateArbitrary,
            (date) => {
              const formatted = formatThaiDate(date)
              const parts = formatted.split(' ')
              const year = parseInt(parts[2], 10)
              
              // ปีต้องเป็น พ.ศ. (ค.ศ. + 543)
              const expectedYear = date.getFullYear() + BUDDHIST_ERA_OFFSET
              expect(year).toBe(expectedYear)
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่า function ทำงานได้ทั้ง Date object และ ISO string
       */
      it('should work with both Date object and ISO string input', () => {
        fc.assert(
          fc.property(
            validDateArbitrary,
            (date) => {
              const isoString = toISODateString(date)
              
              const formattedFromDate = formatThaiDate(date)
              const formattedFromString = formatThaiDate(isoString)
              
              // ผลลัพธ์ต้องเหมือนกัน
              expect(formattedFromDate).toBe(formattedFromString)
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่า function จัดการ invalid input ได้ถูกต้อง
       */
      it('should return empty string for invalid inputs', () => {
        // null
        expect(formatThaiDate(null)).toBe('')
        
        // undefined
        expect(formatThaiDate(undefined)).toBe('')
        
        // invalid string
        expect(formatThaiDate('invalid-date')).toBe('')
        
        // empty string
        expect(formatThaiDate('')).toBe('')
      })
    })

    // ========================================================================
    // Time Formatting Tests (Requirements 3.2)
    // ========================================================================

    describe('Time Formatting (Requirements 3.2)', () => {

      /**
       * ทดสอบว่าเวลาต้องอยู่ในรูปแบบ 24 ชั่วโมง (HH:MM)
       */
      it('should format time in 24-hour format (HH:MM)', () => {
        fc.assert(
          fc.property(
            timeHHMMArbitrary,
            (time) => {
              const formatted = formatTime(time)
              
              // ต้องไม่เป็นค่าว่าง
              expect(formatted).not.toBe('')
              
              // ต้องมีรูปแบบ HH:MM
              expect(formatted).toMatch(/^\d{2}:\d{2}$/)
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่าเวลาที่มี seconds ต้องตัด seconds ออก
       */
      it('should strip seconds from HH:MM:SS format', () => {
        fc.assert(
          fc.property(
            timeHHMMSSArbitrary,
            (time) => {
              const formatted = formatTime(time)
              
              // ต้องไม่เป็นค่าว่าง
              expect(formatted).not.toBe('')
              
              // ต้องมีรูปแบบ HH:MM (ไม่มี seconds)
              expect(formatted).toMatch(/^\d{2}:\d{2}$/)
              
              // ต้องไม่มี seconds
              expect(formatted.split(':').length).toBe(2)
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่าชั่วโมงและนาทีต้องถูกต้อง
       */
      it('should preserve hours and minutes correctly', () => {
        fc.assert(
          fc.property(
            fc.tuple(
              fc.integer({ min: 0, max: 23 }),
              fc.integer({ min: 0, max: 59 })
            ),
            ([hours, minutes]) => {
              const inputTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
              const formatted = formatTime(inputTime)
              
              const [formattedHours, formattedMinutes] = formatted.split(':').map(Number)
              
              // ชั่วโมงและนาทีต้องตรงกับ input
              expect(formattedHours).toBe(hours)
              expect(formattedMinutes).toBe(minutes)
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่าชั่วโมงต้องอยู่ในช่วง 00-23
       */
      it('should have hours in range 00-23', () => {
        fc.assert(
          fc.property(
            timeHHMMArbitrary,
            (time) => {
              const formatted = formatTime(time)
              const hours = parseInt(formatted.split(':')[0], 10)
              
              // ชั่วโมงต้องอยู่ในช่วง 0-23
              expect(hours).toBeGreaterThanOrEqual(0)
              expect(hours).toBeLessThanOrEqual(23)
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่านาทีต้องอยู่ในช่วง 00-59
       */
      it('should have minutes in range 00-59', () => {
        fc.assert(
          fc.property(
            timeHHMMArbitrary,
            (time) => {
              const formatted = formatTime(time)
              const minutes = parseInt(formatted.split(':')[1], 10)
              
              // นาทีต้องอยู่ในช่วง 0-59
              expect(minutes).toBeGreaterThanOrEqual(0)
              expect(minutes).toBeLessThanOrEqual(59)
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่าชั่วโมงและนาทีต้อง pad ด้วย 0 ให้ครบ 2 หลัก
       */
      it('should pad hours and minutes with leading zeros', () => {
        fc.assert(
          fc.property(
            fc.tuple(
              fc.integer({ min: 0, max: 9 }),
              fc.integer({ min: 0, max: 9 })
            ),
            ([hours, minutes]) => {
              const inputTime = `${hours}:${minutes}`
              const formatted = formatTime(inputTime)
              
              // ต้องมี 2 หลักทั้งชั่วโมงและนาที
              const [formattedHours, formattedMinutes] = formatted.split(':')
              expect(formattedHours.length).toBe(2)
              expect(formattedMinutes.length).toBe(2)
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * ทดสอบว่า function จัดการ invalid input ได้ถูกต้อง
       */
      it('should return empty string for invalid inputs', () => {
        // null
        expect(formatTime(null)).toBe('')
        
        // undefined
        expect(formatTime(undefined)).toBe('')
        
        // empty string
        expect(formatTime('')).toBe('')
        
        // string without colon
        expect(formatTime('1800')).toBe('')
      })
    })
  })
})
