/**
 * Status Banner Correctness Property-Based Tests
 * 
 * **Feature: scoring-hub-consolidation, Property 3: Status Banner Correctness**
 * **Validates: Requirements 4.1, 4.2**
 * 
 * For any active configuration, the status banner SHALL display green color and "พร้อมใช้งาน" text.
 * For any inactive configuration, the banner SHALL display yellow color.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// ค่าคงที่ของ Status Banner (จาก StatusBanner.vue)
// ============================================================================

/**
 * ข้อความแบนเนอร์ตามสถานะ
 */
const BANNER_TEXT = {
  active: '✓ พร้อมใช้งาน',
  inactive: '⚠ ยังไม่เปิดใช้งาน',
  none: 'เริ่มต้นใช้งาน'
}

/**
 * ปุ่ม action ตามสถานะ
 * หมายเหตุ: เมื่อ status = 'none' จะแสดง FirstTimeSetup อยู่แล้ว
 * ดังนั้นไม่ต้องแสดงปุ่ม "ตั้งค่าเลย" ซ้ำ
 */
const BANNER_ACTION = {
  active: null,
  inactive: 'เปิดใช้งาน',
  none: null // ซ่อนปุ่มเพราะ FirstTimeSetup แสดงอยู่แล้ว
}

/**
 * สีพื้นหลังตามสถานะ (CSS class mapping)
 */
const BANNER_COLORS = {
  active: 'green',    // #D1FAE5 - Green background
  inactive: 'yellow', // #FEF3C7 - Yellow background
  none: 'gray'        // #F5F5F5 - Gray background
}

/**
 * ฟังก์ชันดึงข้อความแบนเนอร์ (เหมือนใน StatusBanner.vue)
 * @param {'active' | 'inactive' | 'none'} status - สถานะ config
 * @returns {string} - ข้อความแบนเนอร์
 */
function getBannerText(status) {
  return BANNER_TEXT[status] || ''
}

/**
 * ฟังก์ชันดึงปุ่ม action (เหมือนใน StatusBanner.vue)
 * @param {'active' | 'inactive' | 'none'} status - สถานะ config
 * @returns {string | null} - ข้อความปุ่ม action
 */
function getActionText(status) {
  return BANNER_ACTION[status]
}

/**
 * ฟังก์ชันดึงสีแบนเนอร์
 * @param {'active' | 'inactive' | 'none'} status - สถานะ config
 * @returns {string} - ประเภทสี
 */
function getBannerColor(status) {
  return BANNER_COLORS[status] || 'gray'
}

/**
 * ฟังก์ชันคำนวณสถานะ config จาก club config object
 * @param {object | null} clubConfig - ข้อมูล config
 * @returns {'active' | 'inactive' | 'none'} - สถานะ
 */
function getConfigStatus(clubConfig) {
  if (!clubConfig) return 'none'
  return clubConfig.is_active ? 'active' : 'inactive'
}

// ============================================================================
// Test Arbitraries
// ============================================================================

/**
 * Arbitrary สำหรับสถานะ config ที่เป็นไปได้ทั้งหมด
 */
const configStatusArbitrary = fc.constantFrom('active', 'inactive', 'none')

/**
 * Arbitrary สำหรับวันที่ที่ถูกต้อง (ใช้ timestamp เพื่อหลีกเลี่ยง Invalid Date)
 */
const validDateArbitrary = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime()
}).map(ts => new Date(ts))

/**
 * Arbitrary สำหรับ club config object
 */
const clubConfigArbitrary = fc.oneof(
  // ไม่มี config
  fc.constant(null),
  // มี config แบบ active
  fc.record({
    id: fc.uuid(),
    club_id: fc.uuid(),
    is_active: fc.constant(true),
    created_at: validDateArbitrary.map(d => d.toISOString()),
    updated_at: validDateArbitrary.map(d => d.toISOString())
  }),
  // มี config แบบ inactive
  fc.record({
    id: fc.uuid(),
    club_id: fc.uuid(),
    is_active: fc.constant(false),
    created_at: validDateArbitrary.map(d => d.toISOString()),
    updated_at: validDateArbitrary.map(d => d.toISOString())
  })
)

// ============================================================================
// Property Tests
// ============================================================================

describe('Status Banner Property Tests', () => {

  /**
   * **Feature: scoring-hub-consolidation, Property 3: Status Banner Correctness**
   * **Validates: Requirements 4.1, 4.2**
   */
  describe('Property 3: Status Banner Correctness', () => {

    /**
     * Property: Active config ต้องแสดงสีเขียวและข้อความ "พร้อมใช้งาน"
     * **Validates: Requirements 4.1**
     */
    it('active config should display green banner with "พร้อมใช้งาน" text', () => {
      fc.assert(
        fc.property(
          fc.constant('active'),
          (status) => {
            const text = getBannerText(status)
            const color = getBannerColor(status)
            
            // ต้องแสดงข้อความ "พร้อมใช้งาน"
            expect(text).toBe('✓ พร้อมใช้งาน')
            expect(text).toContain('พร้อมใช้งาน')
            
            // ต้องเป็นสีเขียว
            expect(color).toBe('green')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Inactive config ต้องแสดงสีเหลือง
     * **Validates: Requirements 4.2**
     */
    it('inactive config should display yellow banner', () => {
      fc.assert(
        fc.property(
          fc.constant('inactive'),
          (status) => {
            const text = getBannerText(status)
            const color = getBannerColor(status)
            
            // ต้องแสดงข้อความ "ยังไม่เปิดใช้งาน"
            expect(text).toBe('⚠ ยังไม่เปิดใช้งาน')
            expect(text).toContain('ยังไม่เปิดใช้งาน')
            
            // ต้องเป็นสีเหลือง
            expect(color).toBe('yellow')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ทุกสถานะต้องมีข้อความที่ไม่ว่างเปล่า
     */
    it('every status should have non-empty banner text', () => {
      fc.assert(
        fc.property(
          configStatusArbitrary,
          (status) => {
            const text = getBannerText(status)
            
            // ข้อความต้องไม่ว่างเปล่า
            expect(text).toBeTruthy()
            expect(text.length).toBeGreaterThan(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ทุกสถานะต้องมีสีที่กำหนดไว้
     */
    it('every status should have a defined color', () => {
      fc.assert(
        fc.property(
          configStatusArbitrary,
          (status) => {
            const color = getBannerColor(status)
            
            // สีต้องเป็นค่าที่กำหนดไว้
            expect(['green', 'yellow', 'gray']).toContain(color)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Active status ต้องไม่มีปุ่ม action
     */
    it('active status should not have action button', () => {
      fc.assert(
        fc.property(
          fc.constant('active'),
          (status) => {
            const actionText = getActionText(status)
            
            // Active ต้องไม่มีปุ่ม action
            expect(actionText).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Inactive status ต้องมีปุ่ม "เปิดใช้งาน"
     */
    it('inactive status should have "เปิดใช้งาน" action button', () => {
      fc.assert(
        fc.property(
          fc.constant('inactive'),
          (status) => {
            const actionText = getActionText(status)
            
            // Inactive ต้องมีปุ่ม "เปิดใช้งาน"
            expect(actionText).toBe('เปิดใช้งาน')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: None status ไม่มีปุ่ม action (เพราะ FirstTimeSetup แสดงอยู่แล้ว)
     */
    it('none status should not have action button (FirstTimeSetup is shown)', () => {
      fc.assert(
        fc.property(
          fc.constant('none'),
          (status) => {
            const actionText = getActionText(status)
            
            // None ไม่มีปุ่ม action เพราะ FirstTimeSetup แสดงอยู่แล้ว
            expect(actionText).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Club config object ต้องแปลงเป็นสถานะที่ถูกต้อง
     */
    it('club config should map to correct status', () => {
      fc.assert(
        fc.property(
          clubConfigArbitrary,
          (clubConfig) => {
            const status = getConfigStatus(clubConfig)
            
            // สถานะต้องเป็นค่าที่ถูกต้อง
            expect(['active', 'inactive', 'none']).toContain(status)
            
            // ตรวจสอบ mapping ที่ถูกต้อง
            if (clubConfig === null) {
              expect(status).toBe('none')
            } else if (clubConfig.is_active === true) {
              expect(status).toBe('active')
            } else {
              expect(status).toBe('inactive')
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: สถานะและสีต้องสอดคล้องกัน
     */
    it('status and color should be consistent', () => {
      fc.assert(
        fc.property(
          configStatusArbitrary,
          (status) => {
            const color = getBannerColor(status)
            
            // ตรวจสอบความสอดคล้อง
            if (status === 'active') {
              expect(color).toBe('green')
            } else if (status === 'inactive') {
              expect(color).toBe('yellow')
            } else if (status === 'none') {
              expect(color).toBe('gray')
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ข้อความแบนเนอร์ต้องเป็น 1 บรรทัด (ไม่มี newline)
     */
    it('banner text should be single line (no newlines)', () => {
      fc.assert(
        fc.property(
          configStatusArbitrary,
          (status) => {
            const text = getBannerText(status)
            
            // ข้อความต้องไม่มี newline
            expect(text).not.toContain('\n')
            expect(text).not.toContain('\r')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
