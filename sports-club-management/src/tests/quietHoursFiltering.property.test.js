/**
 * Quiet Hours Time Filtering Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Quiet Hours
 * 
 * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
 * **Validates: Requirements 1.3, 1.4, 1.5**
 * 
 * Property 1: Quiet Hours time filtering
 * *For any* notification time and quiet hours configuration, if quiet_hours_enabled is true 
 * and the time falls within the range (start to end, handling midnight crossing), 
 * the notification should be suppressed. If quiet_hours_enabled is false or time is outside 
 * the range, the notification should be delivered.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { checkQuietHours } from '../stores/notificationPreferences.js'

/**
 * Arbitrary สำหรับสร้างเวลาในรูปแบบ HH:mm
 * ใช้สำหรับ Quiet Hours settings
 */
const timeStringArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 })
).map(([hour, minute]) => 
  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
)

/**
 * Arbitrary สำหรับสร้าง Date object จากชั่วโมงและนาที
 */
const dateFromTimeArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 })
).map(([hour, minute]) => {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date
})

/**
 * Helper: แปลงเวลา HH:mm เป็นนาทีตั้งแต่เที่ยงคืน
 */
function timeToMinutes(timeStr) {
  const [hour, min] = timeStr.split(':').map(Number)
  return hour * 60 + min
}

/**
 * Helper: ตรวจสอบว่าเวลาอยู่ในช่วงหรือไม่ (reference implementation)
 * ใช้เป็น oracle สำหรับเปรียบเทียบกับ checkQuietHours
 */
function isTimeInRange(startStr, endStr, time) {
  const startMinutes = timeToMinutes(startStr)
  const endMinutes = timeToMinutes(endStr)
  const currentMinutes = time.getHours() * 60 + time.getMinutes()
  
  // กรณีข้ามเที่ยงคืน (เช่น 22:00 ถึง 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
  
  // กรณีปกติ (เช่น 09:00 ถึง 17:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

describe('Quiet Hours Time Filtering Property Tests', () => {
  
  /**
   * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
   * **Validates: Requirements 1.3, 1.4, 1.5**
   * 
   * ทดสอบว่า checkQuietHours ทำงานถูกต้องสำหรับทุกเวลาและทุกช่วง quiet hours
   * รวมถึงกรณีข้ามเที่ยงคืน
   */
  it('Property 1: checkQuietHours returns correct result for any time and range', () => {
    fc.assert(
      fc.property(
        timeStringArbitrary, // start time
        timeStringArbitrary, // end time
        dateFromTimeArbitrary, // time to check
        (start, end, time) => {
          const result = checkQuietHours(start, end, time)
          const expected = isTimeInRange(start, end, time)
          
          expect(result).toBe(expected)
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
   * **Validates: Requirements 1.3**
   * 
   * ทดสอบกรณีข้ามเที่ยงคืน: เวลาหลังเที่ยงคืนแต่ก่อนเวลาสิ้นสุดควรอยู่ในช่วง quiet hours
   * เช่น quiet hours 22:00-07:00, เวลา 03:00 ควรอยู่ในช่วง
   */
  it('Property 1: Midnight crossing - times after midnight but before end are within quiet hours', () => {
    fc.assert(
      fc.property(
        // start time: 18:00-23:59 (ช่วงเย็น/ค่ำ)
        fc.integer({ min: 18, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        // end time: 00:00-11:59 (ช่วงเช้า)
        fc.integer({ min: 0, max: 11 }),
        fc.integer({ min: 0, max: 59 }),
        // time to check: หลังเที่ยงคืนแต่ก่อน end time
        fc.integer({ min: 0, max: 11 }),
        fc.integer({ min: 0, max: 59 }),
        (startHour, startMin, endHour, endMin, checkHour, checkMin) => {
          const start = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`
          const end = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
          
          const time = new Date()
          time.setHours(checkHour, checkMin, 0, 0)
          
          const checkMinutes = checkHour * 60 + checkMin
          const endMinutes = endHour * 60 + endMin
          
          // ถ้าเวลาที่ตรวจสอบอยู่ก่อน end time ควรอยู่ในช่วง quiet hours
          if (checkMinutes < endMinutes) {
            expect(checkQuietHours(start, end, time)).toBe(true)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
   * **Validates: Requirements 1.4**
   * 
   * ทดสอบว่าเวลาที่อยู่นอกช่วง quiet hours จะไม่ถูก suppress
   * กรณีปกติ (ไม่ข้ามเที่ยงคืน)
   */
  it('Property 1: Times outside normal range are not within quiet hours', () => {
    fc.assert(
      fc.property(
        // start time: 08:00-12:00
        fc.integer({ min: 8, max: 12 }),
        fc.integer({ min: 0, max: 59 }),
        // end time: 13:00-18:00 (หลัง start)
        fc.integer({ min: 13, max: 18 }),
        fc.integer({ min: 0, max: 59 }),
        // time to check: ก่อน start time (00:00-07:59)
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: 0, max: 59 }),
        (startHour, startMin, endHour, endMin, checkHour, checkMin) => {
          const start = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`
          const end = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
          
          const time = new Date()
          time.setHours(checkHour, checkMin, 0, 0)
          
          // เวลาก่อน start time ไม่ควรอยู่ในช่วง quiet hours (กรณีปกติ)
          expect(checkQuietHours(start, end, time)).toBe(false)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
   * **Validates: Requirements 1.3, 1.4**
   * 
   * ทดสอบว่าเวลาที่อยู่ในช่วง quiet hours จะถูก suppress
   * กรณีปกติ (ไม่ข้ามเที่ยงคืน)
   */
  it('Property 1: Times within normal range are within quiet hours', () => {
    fc.assert(
      fc.property(
        // start time: 08:00-11:00
        fc.integer({ min: 8, max: 11 }),
        fc.integer({ min: 0, max: 59 }),
        // end time: 16:00-20:00 (หลัง start)
        fc.integer({ min: 16, max: 20 }),
        fc.integer({ min: 0, max: 59 }),
        // time to check: ระหว่าง start และ end (12:00-15:59)
        fc.integer({ min: 12, max: 15 }),
        fc.integer({ min: 0, max: 59 }),
        (startHour, startMin, endHour, endMin, checkHour, checkMin) => {
          const start = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`
          const end = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
          
          const time = new Date()
          time.setHours(checkHour, checkMin, 0, 0)
          
          // เวลาระหว่าง start และ end ควรอยู่ในช่วง quiet hours
          expect(checkQuietHours(start, end, time)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
   * **Validates: Requirements 1.5**
   * 
   * ทดสอบว่าเมื่อ start time = end time ไม่มีเวลาใดอยู่ในช่วง
   * (ช่วงว่าง)
   */
  it('Property 1: When start equals end, no time is within quiet hours', () => {
    fc.assert(
      fc.property(
        timeStringArbitrary, // same start and end
        dateFromTimeArbitrary, // any time to check
        (sameTime, time) => {
          // เมื่อ start = end ไม่มีเวลาใดอยู่ในช่วง
          expect(checkQuietHours(sameTime, sameTime, time)).toBe(false)
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
   * **Validates: Requirements 1.3**
   * 
   * ทดสอบกรณีข้ามเที่ยงคืน: เวลาก่อนเที่ยงคืนแต่หลัง start time ควรอยู่ในช่วง
   * เช่น quiet hours 22:00-07:00, เวลา 23:30 ควรอยู่ในช่วง
   */
  it('Property 1: Midnight crossing - times before midnight but after start are within quiet hours', () => {
    fc.assert(
      fc.property(
        // start time: 20:00-22:00
        fc.integer({ min: 20, max: 22 }),
        fc.integer({ min: 0, max: 59 }),
        // end time: 05:00-08:00 (เช้าวันถัดไป)
        fc.integer({ min: 5, max: 8 }),
        fc.integer({ min: 0, max: 59 }),
        // time to check: หลัง start แต่ก่อนเที่ยงคืน (23:00-23:59)
        fc.integer({ min: 23, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        (startHour, startMin, endHour, endMin, checkHour, checkMin) => {
          const start = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`
          const end = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
          
          const time = new Date()
          time.setHours(checkHour, checkMin, 0, 0)
          
          // เวลา 23:xx ควรอยู่ในช่วง quiet hours เมื่อ start <= 22:xx
          expect(checkQuietHours(start, end, time)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
   * **Validates: Requirements 1.4**
   * 
   * ทดสอบกรณีข้ามเที่ยงคืน: เวลาระหว่าง end และ start ไม่ควรอยู่ในช่วง
   * เช่น quiet hours 22:00-07:00, เวลา 12:00 ไม่ควรอยู่ในช่วง
   */
  it('Property 1: Midnight crossing - times between end and start are not within quiet hours', () => {
    fc.assert(
      fc.property(
        // start time: 20:00-23:00 (ค่ำ)
        fc.integer({ min: 20, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        // end time: 05:00-08:00 (เช้า)
        fc.integer({ min: 5, max: 8 }),
        fc.integer({ min: 0, max: 59 }),
        // time to check: ระหว่าง end และ start (10:00-18:00)
        fc.integer({ min: 10, max: 18 }),
        fc.integer({ min: 0, max: 59 }),
        (startHour, startMin, endHour, endMin, checkHour, checkMin) => {
          const start = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`
          const end = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
          
          const time = new Date()
          time.setHours(checkHour, checkMin, 0, 0)
          
          // เวลาระหว่าง end (เช้า) และ start (ค่ำ) ไม่ควรอยู่ในช่วง quiet hours
          expect(checkQuietHours(start, end, time)).toBe(false)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
   * **Validates: Requirements 1.3**
   * 
   * ทดสอบ boundary condition: เวลาที่ตรงกับ start time ควรอยู่ในช่วง
   */
  it('Property 1: Time exactly at start is within quiet hours', () => {
    fc.assert(
      fc.property(
        timeStringArbitrary, // start time
        timeStringArbitrary, // end time (different from start)
        (start, end) => {
          // ข้ามกรณี start = end
          if (start === end) return true
          
          const [startHour, startMin] = start.split(':').map(Number)
          const time = new Date()
          time.setHours(startHour, startMin, 0, 0)
          
          // เวลาที่ตรงกับ start ควรอยู่ในช่วง quiet hours
          expect(checkQuietHours(start, end, time)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
   * **Validates: Requirements 1.4**
   * 
   * ทดสอบ boundary condition: เวลาที่ตรงกับ end time ไม่ควรอยู่ในช่วง
   * (end time เป็น exclusive)
   */
  it('Property 1: Time exactly at end is not within quiet hours', () => {
    fc.assert(
      fc.property(
        timeStringArbitrary, // start time
        timeStringArbitrary, // end time (different from start)
        (start, end) => {
          // ข้ามกรณี start = end
          if (start === end) return true
          
          const [endHour, endMin] = end.split(':').map(Number)
          const time = new Date()
          time.setHours(endHour, endMin, 0, 0)
          
          // เวลาที่ตรงกับ end ไม่ควรอยู่ในช่วง quiet hours (exclusive)
          expect(checkQuietHours(start, end, time)).toBe(false)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 1: Quiet Hours time filtering**
   * **Validates: Requirements 1.3, 1.4, 1.5**
   * 
   * ทดสอบกรณีทั่วไปด้วย typical quiet hours (22:00-07:00)
   */
  it('Property 1: Typical quiet hours (22:00-07:00) work correctly', () => {
    const start = '22:00'
    const end = '07:00'
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        (hour, minute) => {
          const time = new Date()
          time.setHours(hour, minute, 0, 0)
          
          const result = checkQuietHours(start, end, time)
          
          // 22:00-23:59 หรือ 00:00-06:59 ควรอยู่ในช่วง
          const shouldBeInQuietHours = hour >= 22 || hour < 7
          
          expect(result).toBe(shouldBeInQuietHours)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
