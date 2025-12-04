/**
 * Vibration Pattern Validity Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Vibration Pattern
 * 
 * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
 * **Validates: Requirements 4.2, 4.3**
 * 
 * Property 4: Vibration pattern validity
 * *For any* vibration pattern selection, the pattern should be one of the valid options 
 * ('short', 'medium', 'long', 'pulse') and the corresponding vibration array should be non-empty.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { VIBRATION_PATTERNS } from '../stores/notificationPreferences.js'

// ค่ารูปแบบการสั่นที่ถูกต้องตาม design document
const VALID_PATTERNS = ['short', 'medium', 'long', 'pulse']

/**
 * Arbitrary สำหรับ vibration pattern ที่ถูกต้อง
 * ต้องตรงกับ CHECK constraint ใน database
 */
const vibrationPatternArbitrary = fc.constantFrom('short', 'medium', 'long', 'pulse')

describe('Vibration Pattern Validity Property Tests', () => {
  
  /**
   * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * Property: For any valid vibration pattern selection, it must be in the valid patterns list
   */
  it('Property 4: Valid vibration patterns are in allowed list', () => {
    fc.assert(
      fc.property(
        vibrationPatternArbitrary,
        (pattern) => {
          // ตรวจสอบว่ารูปแบบที่เลือกอยู่ในรายการที่อนุญาต
          expect(VALID_PATTERNS).toContain(pattern)
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * Property: For any valid vibration pattern, the corresponding array should be non-empty
   */
  it('Property 4: Vibration patterns have non-empty arrays', () => {
    fc.assert(
      fc.property(
        vibrationPatternArbitrary,
        (pattern) => {
          // ตรวจสอบว่ามี entry ใน VIBRATION_PATTERNS
          expect(VIBRATION_PATTERNS).toHaveProperty(pattern)
          // ตรวจสอบว่าเป็น array
          expect(Array.isArray(VIBRATION_PATTERNS[pattern])).toBe(true)
          // ตรวจสอบว่า array ไม่ว่างเปล่า
          expect(VIBRATION_PATTERNS[pattern].length).toBeGreaterThan(0)
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * Property: All vibration pattern arrays contain only positive integers (milliseconds)
   */
  it('Property 4: Vibration arrays contain only positive integers', () => {
    fc.assert(
      fc.property(
        vibrationPatternArbitrary,
        (pattern) => {
          const vibrationArray = VIBRATION_PATTERNS[pattern]
          
          // ตรวจสอบว่าทุกค่าใน array เป็นจำนวนเต็มบวก
          for (const duration of vibrationArray) {
            expect(Number.isInteger(duration)).toBe(true)
            expect(duration).toBeGreaterThan(0)
          }
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * Property: Vibration pattern selection is valid for database storage
   */
  it('Property 4: Vibration pattern is valid for database storage', () => {
    fc.assert(
      fc.property(
        vibrationPatternArbitrary,
        (pattern) => {
          // ตรวจสอบว่าเป็น string
          expect(typeof pattern).toBe('string')
          // ตรวจสอบว่าไม่เป็นค่าว่าง
          expect(pattern.length).toBeGreaterThan(0)
          // ตรวจสอบว่าอยู่ในรายการที่ database รองรับ (CHECK constraint)
          expect(VALID_PATTERNS).toContain(pattern)
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * Property: Invalid vibration patterns should not be in the valid list
   */
  it('Property 4: Invalid vibration patterns are rejected', () => {
    // สร้าง arbitrary สำหรับรูปแบบที่ไม่ถูกต้อง
    const invalidPatternArbitrary = fc.string().filter(s => !VALID_PATTERNS.includes(s))
    
    fc.assert(
      fc.property(
        invalidPatternArbitrary,
        (invalidPattern) => {
          // ตรวจสอบว่ารูปแบบที่ไม่ถูกต้องไม่อยู่ในรายการ
          expect(VALID_PATTERNS).not.toContain(invalidPattern)
          // ตรวจสอบว่าไม่มี entry ใน VIBRATION_PATTERNS
          expect(VIBRATION_PATTERNS[invalidPattern]).toBeUndefined()
          return true
        }
      ),
      { numRuns: 50 }
    )
  })


  /**
   * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * Property: Vibration pattern selection round-trip through JSON serialization
   */
  it('Property 4: Vibration pattern survives JSON serialization', () => {
    fc.assert(
      fc.property(
        vibrationPatternArbitrary,
        (pattern) => {
          const preferences = { vibration_pattern: pattern }
          
          // จำลอง database round-trip ผ่าน JSON
          const serialized = JSON.stringify(preferences)
          const deserialized = JSON.parse(serialized)
          
          // ตรวจสอบว่าค่ายังคงถูกต้อง
          expect(deserialized.vibration_pattern).toBe(pattern)
          expect(VALID_PATTERNS).toContain(deserialized.vibration_pattern)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * Property: Vibration arrays are compatible with Vibration API
   * Vibration API accepts array of integers representing milliseconds
   */
  it('Property 4: Vibration arrays are compatible with Vibration API', () => {
    fc.assert(
      fc.property(
        vibrationPatternArbitrary,
        (pattern) => {
          const vibrationArray = VIBRATION_PATTERNS[pattern]
          
          // Vibration API รับ array ของ integers
          // ค่าคี่ = ระยะเวลาสั่น, ค่าคู่ = ระยะเวลาหยุด
          expect(Array.isArray(vibrationArray)).toBe(true)
          
          // ตรวจสอบว่าทุกค่าเป็น integer ที่ไม่ติดลบ
          for (const duration of vibrationArray) {
            expect(Number.isInteger(duration)).toBe(true)
            expect(duration).toBeGreaterThanOrEqual(0)
          }
          
          // ตรวจสอบว่า total duration ไม่เกิน 10 วินาที (ข้อจำกัดของบาง browser)
          const totalDuration = vibrationArray.reduce((sum, d) => sum + d, 0)
          expect(totalDuration).toBeLessThanOrEqual(10000)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * Property: All defined patterns in VIBRATION_PATTERNS are valid
   */
  it('Property 4: All defined patterns are valid', () => {
    // ตรวจสอบว่าทุก pattern ที่กำหนดไว้ใน VIBRATION_PATTERNS อยู่ใน VALID_PATTERNS
    for (const pattern of Object.keys(VIBRATION_PATTERNS)) {
      expect(VALID_PATTERNS).toContain(pattern)
    }
    
    // ตรวจสอบว่าทุก pattern ใน VALID_PATTERNS มีอยู่ใน VIBRATION_PATTERNS
    for (const pattern of VALID_PATTERNS) {
      expect(VIBRATION_PATTERNS).toHaveProperty(pattern)
    }
  })

  /**
   * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * Property: Vibration pattern with enabled flag combination
   */
  it('Property 4: Vibration settings combination is valid', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        vibrationPatternArbitrary,
        (enabled, pattern) => {
          const settings = {
            vibration_enabled: enabled,
            vibration_pattern: pattern
          }
          
          // ตรวจสอบว่า enabled เป็น boolean
          expect(typeof settings.vibration_enabled).toBe('boolean')
          // ตรวจสอบว่า pattern เป็น string ที่ถูกต้อง
          expect(typeof settings.vibration_pattern).toBe('string')
          expect(VALID_PATTERNS).toContain(settings.vibration_pattern)
          
          // ถ้าเปิดใช้งาน ต้องมี pattern ที่ใช้งานได้
          if (settings.vibration_enabled) {
            expect(VIBRATION_PATTERNS[settings.vibration_pattern]).toBeDefined()
            expect(VIBRATION_PATTERNS[settings.vibration_pattern].length).toBeGreaterThan(0)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: notification-settings-enhancement, Property 4: Vibration pattern validity**
   * **Validates: Requirements 4.2, 4.3**
   * 
   * Property: Each pattern has distinct vibration characteristics
   */
  it('Property 4: Each pattern has distinct characteristics', () => {
    // ตรวจสอบว่าแต่ละ pattern มีลักษณะเฉพาะ
    const short = VIBRATION_PATTERNS.short
    const medium = VIBRATION_PATTERNS.medium
    const long = VIBRATION_PATTERNS.long
    const pulse = VIBRATION_PATTERNS.pulse
    
    // short ควรมีระยะเวลาสั้นที่สุด
    const shortTotal = short.reduce((sum, d) => sum + d, 0)
    const mediumTotal = medium.reduce((sum, d) => sum + d, 0)
    const longTotal = long.reduce((sum, d) => sum + d, 0)
    const pulseTotal = pulse.reduce((sum, d) => sum + d, 0)
    
    // ตรวจสอบว่า short สั้นกว่า long
    expect(shortTotal).toBeLessThan(longTotal)
    
    // ตรวจสอบว่า pulse มีหลาย segments (สั่นเป็นจังหวะ)
    expect(pulse.length).toBeGreaterThan(1)
    
    // ตรวจสอบว่าทุก pattern มีค่าบวก
    expect(shortTotal).toBeGreaterThan(0)
    expect(mediumTotal).toBeGreaterThan(0)
    expect(longTotal).toBeGreaterThan(0)
    expect(pulseTotal).toBeGreaterThan(0)
  })
})
