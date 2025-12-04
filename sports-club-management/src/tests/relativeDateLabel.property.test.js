/**
 * Relative Date Label Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับการแสดง label วันที่แบบสัมพัทธ์
 * 
 * **Feature: upcoming-schedule-banner, Property 4: Relative date label correctness**
 * **Validates: Requirements 3.3, 3.4, 3.5**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getDateLabel, formatThaiDate } from '../lib/scheduleUtils.js'

// ============================================================================
// Constants
// ============================================================================

// ชื่อวันภาษาไทย (ต้องตรงกับ scheduleUtils.js)
const THAI_DAY_NAMES = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์'
]

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * สร้างวันที่ที่ห่างจากวันนี้ตามจำนวนวันที่กำหนด
 * @param {number} daysFromToday - จำนวนวันที่ห่างจากวันนี้ (0 = วันนี้, 1 = พรุ่งนี้, ...)
 * @returns {Date} - วันที่ที่สร้างขึ้น
 */
function createDateFromToday(daysFromToday) {
  const date = new Date()
  date.setHours(12, 0, 0, 0) // ตั้งเวลาเป็นเที่ยงเพื่อหลีกเลี่ยงปัญหา timezone
  date.setDate(date.getDate() + daysFromToday)
  return date
}

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
// Arbitraries
// ============================================================================

/**
 * Arbitrary สำหรับสร้างจำนวนวันที่ห่างจากวันนี้ (0-365 วัน)
 */
const daysFromTodayArbitrary = fc.integer({ min: 0, max: 365 })

/**
 * Arbitrary สำหรับสร้างวันที่ในอนาคต (0-365 วันจากวันนี้)
 */
const futureDateArbitrary = daysFromTodayArbitrary.map(days => createDateFromToday(days))

// ============================================================================
// Property Tests
// ============================================================================

describe('Relative Date Label Property Tests', () => {

  /**
   * **Feature: upcoming-schedule-banner, Property 4: Relative date label correctness**
   * **Validates: Requirements 3.3, 3.4, 3.5**
   * 
   * For any schedule date:
   * - If the date equals today, the label should be "วันนี้"
   * - If the date equals tomorrow, the label should be "พรุ่งนี้"
   * - If the date is within 7 days, the label should be the Thai day name
   * - Otherwise, the label should be the formatted date
   */
  describe('Property 4: Relative date label correctness', () => {

    /**
     * ทดสอบว่าวันนี้ต้องแสดง "วันนี้"
     * **Validates: Requirements 3.3**
     */
    it('should return "วันนี้" for today\'s date', () => {
      const today = createDateFromToday(0)
      
      // ทดสอบด้วย Date object
      expect(getDateLabel(today)).toBe('วันนี้')
      
      // ทดสอบด้วย ISO string
      expect(getDateLabel(toISODateString(today))).toBe('วันนี้')
    })

    /**
     * ทดสอบว่าพรุ่งนี้ต้องแสดง "พรุ่งนี้"
     * **Validates: Requirements 3.4**
     */
    it('should return "พรุ่งนี้" for tomorrow\'s date', () => {
      const tomorrow = createDateFromToday(1)
      
      // ทดสอบด้วย Date object
      expect(getDateLabel(tomorrow)).toBe('พรุ่งนี้')
      
      // ทดสอบด้วย ISO string
      expect(getDateLabel(toISODateString(tomorrow))).toBe('พรุ่งนี้')
    })

    /**
     * ทดสอบว่าวันที่ภายใน 2-7 วันต้องแสดงชื่อวันภาษาไทย
     * **Validates: Requirements 3.5**
     */
    it('should return Thai day name for dates within 2-7 days', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 7 }),
          (daysFromToday) => {
            const date = createDateFromToday(daysFromToday)
            const label = getDateLabel(date)
            const expectedDayName = THAI_DAY_NAMES[date.getDay()]
            
            // ต้องเป็นชื่อวันภาษาไทย
            expect(label).toBe(expectedDayName)
            expect(THAI_DAY_NAMES).toContain(label)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าวันที่มากกว่า 7 วันต้องแสดงวันที่แบบ Thai format
     * **Validates: Requirements 3.5**
     */
    it('should return formatted Thai date for dates beyond 7 days', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 8, max: 365 }),
          (daysFromToday) => {
            const date = createDateFromToday(daysFromToday)
            const label = getDateLabel(date)
            const expectedFormattedDate = formatThaiDate(date)
            
            // ต้องเป็นวันที่แบบ Thai format
            expect(label).toBe(expectedFormattedDate)
            
            // ต้องไม่ใช่ "วันนี้", "พรุ่งนี้", หรือชื่อวัน
            expect(label).not.toBe('วันนี้')
            expect(label).not.toBe('พรุ่งนี้')
            expect(THAI_DAY_NAMES).not.toContain(label)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่า label ที่ได้ต้องไม่เป็นค่าว่าง (สำหรับ valid date)
     */
    it('should never return empty string for valid dates', () => {
      fc.assert(
        fc.property(
          daysFromTodayArbitrary,
          (daysFromToday) => {
            const date = createDateFromToday(daysFromToday)
            const label = getDateLabel(date)
            
            // ต้องไม่เป็นค่าว่าง
            expect(label).not.toBe('')
            expect(label.length).toBeGreaterThan(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่า label ต้องเป็นหนึ่งในรูปแบบที่กำหนด
     */
    it('should return one of the expected label formats', () => {
      fc.assert(
        fc.property(
          daysFromTodayArbitrary,
          (daysFromToday) => {
            const date = createDateFromToday(daysFromToday)
            const label = getDateLabel(date)
            
            // ต้องเป็นหนึ่งในรูปแบบที่กำหนด
            const isToday = label === 'วันนี้'
            const isTomorrow = label === 'พรุ่งนี้'
            const isDayName = THAI_DAY_NAMES.includes(label)
            const isFormattedDate = label === formatThaiDate(date)
            
            expect(isToday || isTomorrow || isDayName || isFormattedDate).toBe(true)
            
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
          daysFromTodayArbitrary,
          (daysFromToday) => {
            const date = createDateFromToday(daysFromToday)
            const isoString = toISODateString(date)
            
            const labelFromDate = getDateLabel(date)
            const labelFromString = getDateLabel(isoString)
            
            // ผลลัพธ์ต้องเหมือนกัน
            expect(labelFromDate).toBe(labelFromString)
            
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
      expect(getDateLabel(null)).toBe('')
      
      // undefined
      expect(getDateLabel(undefined)).toBe('')
      
      // invalid string
      expect(getDateLabel('invalid-date')).toBe('')
      
      // empty string
      expect(getDateLabel('')).toBe('')
    })

    /**
     * ทดสอบความสอดคล้องของ label กับจำนวนวัน
     * - 0 วัน = "วันนี้"
     * - 1 วัน = "พรุ่งนี้"
     * - 2-7 วัน = ชื่อวัน
     * - >7 วัน = วันที่แบบ Thai format
     */
    it('should have consistent label based on days from today', () => {
      fc.assert(
        fc.property(
          daysFromTodayArbitrary,
          (daysFromToday) => {
            const date = createDateFromToday(daysFromToday)
            const label = getDateLabel(date)
            
            if (daysFromToday === 0) {
              expect(label).toBe('วันนี้')
            } else if (daysFromToday === 1) {
              expect(label).toBe('พรุ่งนี้')
            } else if (daysFromToday >= 2 && daysFromToday <= 7) {
              expect(THAI_DAY_NAMES).toContain(label)
            } else {
              expect(label).toBe(formatThaiDate(date))
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * ทดสอบว่าชื่อวันที่แสดงตรงกับวันจริงของ Date
     */
    it('should return correct Thai day name matching the actual day of week', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 7 }),
          (daysFromToday) => {
            const date = createDateFromToday(daysFromToday)
            const label = getDateLabel(date)
            const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ...
            
            // ชื่อวันต้องตรงกับ index ใน THAI_DAY_NAMES
            expect(label).toBe(THAI_DAY_NAMES[dayOfWeek])
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
