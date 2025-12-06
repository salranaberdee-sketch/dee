/**
 * Sport Type Selection Limit Property-Based Tests
 * 
 * **Feature: scoring-hub-consolidation, Property 10: Sport Type Selection Limit**
 * **Validates: Requirements 7.2**
 * 
 * For any first-time setup flow, the sport type selection SHALL display 
 * maximum 5 options.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// ค่าคงที่
// ============================================================================

const MAX_SPORT_TYPES = 5

// ============================================================================
// ฟังก์ชันจำลองจาก FirstTimeSetup.vue
// ============================================================================

/**
 * จำกัดจำนวน sport types ที่แสดง (เหมือนใน FirstTimeSetup.vue)
 * @param {Array} sportTypes - รายการประเภทกีฬาทั้งหมด
 * @returns {Array} - รายการประเภทกีฬาที่จะแสดง (สูงสุด 5 ตัว)
 */
function getDisplaySportTypes(sportTypes) {
  if (!sportTypes || !Array.isArray(sportTypes)) return []
  return sportTypes.slice(0, MAX_SPORT_TYPES)
}

// ============================================================================
// Test Arbitraries
// ============================================================================

/**
 * Arbitrary สำหรับ sport type object
 */
const sportTypeArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  display_name: fc.string({ minLength: 1, maxLength: 30 }),
  icon: fc.constantFrom('football', 'basketball', 'tennis', 'swimming', 'running', 'volleyball')
})

/**
 * Arbitrary สำหรับ empty sport types
 */
const emptySportTypesArbitrary = fc.constantFrom(
  null,
  undefined,
  []
)

/**
 * Arbitrary สำหรับ sport types น้อยกว่าหรือเท่ากับ 5
 */
const smallSportTypesArbitrary = fc.array(
  sportTypeArbitrary,
  { minLength: 1, maxLength: 5 }
)

/**
 * Arbitrary สำหรับ sport types มากกว่า 5
 */
const largeSportTypesArbitrary = fc.array(
  sportTypeArbitrary,
  { minLength: 6, maxLength: 20 }
)

/**
 * Arbitrary สำหรับ sport types ทั่วไป (0-20 ตัว)
 */
const anySportTypesArbitrary = fc.array(
  sportTypeArbitrary,
  { minLength: 0, maxLength: 20 }
)

// ============================================================================
// Property Tests
// ============================================================================

describe('Sport Type Selection Limit Property Tests', () => {

  /**
   * **Feature: scoring-hub-consolidation, Property 10: Sport Type Selection Limit**
   * **Validates: Requirements 7.2**
   */
  describe('Property 10: Sport Type Selection Limit', () => {

    /**
     * Property: ต้องแสดงไม่เกิน 5 ตัวเลือกเสมอ
     */
    it('should display maximum 5 sport type options', () => {
      fc.assert(
        fc.property(
          anySportTypesArbitrary,
          (sportTypes) => {
            const displayTypes = getDisplaySportTypes(sportTypes)
            
            // ต้องไม่เกิน 5 ตัวเลือก
            expect(displayTypes.length).toBeLessThanOrEqual(MAX_SPORT_TYPES)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: เมื่อมี sport types น้อยกว่า 5 ต้องแสดงทั้งหมด
     */
    it('should display all sport types when count is less than or equal to 5', () => {
      fc.assert(
        fc.property(
          smallSportTypesArbitrary,
          (sportTypes) => {
            const displayTypes = getDisplaySportTypes(sportTypes)
            
            // ต้องแสดงทั้งหมดเมื่อมีไม่เกิน 5
            expect(displayTypes.length).toBe(sportTypes.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: เมื่อมี sport types มากกว่า 5 ต้องแสดงแค่ 5 ตัวแรก
     */
    it('should display exactly 5 sport types when count exceeds 5', () => {
      fc.assert(
        fc.property(
          largeSportTypesArbitrary,
          (sportTypes) => {
            const displayTypes = getDisplaySportTypes(sportTypes)
            
            // ต้องแสดงแค่ 5 ตัว
            expect(displayTypes.length).toBe(MAX_SPORT_TYPES)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ต้องแสดง 5 ตัวแรกตามลำดับเดิม
     */
    it('should display the first 5 sport types in original order', () => {
      fc.assert(
        fc.property(
          largeSportTypesArbitrary,
          (sportTypes) => {
            const displayTypes = getDisplaySportTypes(sportTypes)
            
            // ต้องเป็น 5 ตัวแรกตามลำดับ
            for (let i = 0; i < MAX_SPORT_TYPES; i++) {
              expect(displayTypes[i]).toEqual(sportTypes[i])
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: เมื่อไม่มี sport types ต้องแสดง empty array
     */
    it('should return empty array when sport types is empty or invalid', () => {
      fc.assert(
        fc.property(
          emptySportTypesArbitrary,
          (sportTypes) => {
            const displayTypes = getDisplaySportTypes(sportTypes)
            
            // ต้องเป็น empty array
            expect(displayTypes).toEqual([])
            expect(displayTypes.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ผลลัพธ์ต้องเป็น subset ของ input
     */
    it('displayed sport types should be a subset of input sport types', () => {
      fc.assert(
        fc.property(
          anySportTypesArbitrary,
          (sportTypes) => {
            const displayTypes = getDisplaySportTypes(sportTypes)
            
            // ทุกตัวที่แสดงต้องอยู่ใน input
            displayTypes.forEach(displayType => {
              expect(sportTypes).toContainEqual(displayType)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ลำดับต้องคงที่ (ไม่มีการสลับ)
     */
    it('order of displayed sport types should match original order', () => {
      fc.assert(
        fc.property(
          anySportTypesArbitrary.filter(arr => arr.length > 0),
          (sportTypes) => {
            const displayTypes = getDisplaySportTypes(sportTypes)
            
            // ตรวจสอบลำดับ
            for (let i = 0; i < displayTypes.length; i++) {
              expect(displayTypes[i]).toEqual(sportTypes[i])
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ทุก sport type ที่แสดงต้องมี properties ที่จำเป็น
     */
    it('every displayed sport type should have required properties', () => {
      fc.assert(
        fc.property(
          anySportTypesArbitrary.filter(arr => arr.length > 0),
          (sportTypes) => {
            const displayTypes = getDisplaySportTypes(sportTypes)
            
            displayTypes.forEach(sport => {
              expect(sport).toHaveProperty('id')
              expect(sport).toHaveProperty('display_name')
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: จำนวนที่แสดงต้องเท่ากับ min(input.length, 5)
     */
    it('displayed count should equal min(input length, 5)', () => {
      fc.assert(
        fc.property(
          anySportTypesArbitrary,
          (sportTypes) => {
            const displayTypes = getDisplaySportTypes(sportTypes)
            const expectedCount = Math.min(sportTypes.length, MAX_SPORT_TYPES)
            
            expect(displayTypes.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
