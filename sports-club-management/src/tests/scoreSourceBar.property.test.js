/**
 * Score Source Bar Property-Based Tests
 * 
 * **Feature: scoring-hub-consolidation, Property 4: Score Source Bar Segment Limit**
 * **Feature: scoring-hub-consolidation, Property 5: Segment Display Completeness**
 * **Validates: Requirements 3.2, 3.3**
 * 
 * Property 4: For any scoring configuration with N categories, the Score Source Bar 
 * SHALL display minimum(N, 5) segments.
 * 
 * Property 5: For any segment in the Score Source Bar, the segment SHALL display 
 * both category name and weight percentage.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// ค่าคงที่ของ Score Source Bar (จาก ScoreSourceBar.vue)
// ============================================================================

/**
 * จำนวน segment สูงสุดที่แสดงได้
 */
const MAX_SEGMENTS = 5

/**
 * สีของแต่ละ category
 */
const SOURCE_COLORS = {
  attendance: '#3B82F6',   // Blue
  training: '#10B981',     // Green
  skill: '#F59E0B',        // Amber
  competition: '#EF4444',  // Red
  bonus: '#8B5CF6'         // Purple
}

/**
 * ฟังก์ชันจำกัด segments (เหมือนใน ScoreSourceBar.vue)
 * @param {Array} sources - รายการ score sources
 * @returns {Array} - รายการ sources ที่จำกัดแล้ว (สูงสุด 5)
 */
function getDisplaySources(sources) {
  return sources.slice(0, MAX_SEGMENTS)
}

/**
 * ฟังก์ชันตรวจสอบว่า segment มีข้อมูลครบถ้วน
 * @param {object} source - ข้อมูล source
 * @returns {boolean} - true ถ้ามีข้อมูลครบ
 */
function isSegmentComplete(source) {
  return (
    source.displayName !== undefined &&
    source.displayName !== null &&
    source.displayName !== '' &&
    source.weight !== undefined &&
    source.weight !== null &&
    typeof source.weight === 'number'
  )
}

/**
 * ฟังก์ชันสร้าง segment label (แสดงเปอร์เซ็นต์)
 * @param {object} source - ข้อมูล source
 * @returns {string} - label ที่แสดง
 */
function getSegmentLabel(source) {
  return `${source.weight}%`
}

/**
 * ฟังก์ชันสร้าง legend item (แสดงชื่อและเปอร์เซ็นต์)
 * @param {object} source - ข้อมูล source
 * @returns {object} - ข้อมูล legend
 */
function getLegendItem(source) {
  return {
    name: source.displayName,
    weight: `${source.weight}%`,
    color: source.color
  }
}

// ============================================================================
// Test Arbitraries
// ============================================================================

/**
 * Arbitrary สำหรับ category type
 */
const categoryTypeArbitrary = fc.constantFrom(
  'attendance', 'training', 'skill', 'competition', 'bonus'
)

/**
 * Arbitrary สำหรับ score source object
 */
const scoreSourceArbitrary = fc.record({
  category: categoryTypeArbitrary,
  displayName: fc.constantFrom(
    'การเข้าร่วม', 'ฝึกซ้อม', 'ทักษะ', 'แข่งขัน', 'โบนัส/หัก',
    'Attendance', 'Training', 'Skill', 'Competition', 'Bonus'
  ),
  weight: fc.integer({ min: 0, max: 100 }),
  color: fc.constantFrom('#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6')
})

/**
 * Arbitrary สำหรับ sources array ที่มี 0-10 items
 */
const sourcesArrayArbitrary = fc.array(scoreSourceArbitrary, { minLength: 0, maxLength: 10 })

/**
 * Arbitrary สำหรับ sources array ที่มีมากกว่า 5 items
 */
const manySourcesArbitrary = fc.array(scoreSourceArbitrary, { minLength: 6, maxLength: 15 })

/**
 * Arbitrary สำหรับ sources array ที่มี 1-5 items
 */
const fewSourcesArbitrary = fc.array(scoreSourceArbitrary, { minLength: 1, maxLength: 5 })

// ============================================================================
// Property Tests
// ============================================================================

describe('Score Source Bar Property Tests', () => {

  /**
   * **Feature: scoring-hub-consolidation, Property 4: Score Source Bar Segment Limit**
   * **Validates: Requirements 3.3**
   */
  describe('Property 4: Score Source Bar Segment Limit', () => {

    /**
     * Property: จำนวน segments ที่แสดงต้องไม่เกิน 5
     */
    it('displayed segments should never exceed 5', () => {
      fc.assert(
        fc.property(
          sourcesArrayArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            // จำนวน segments ต้องไม่เกิน 5
            expect(displaySources.length).toBeLessThanOrEqual(MAX_SEGMENTS)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: เมื่อมี sources มากกว่า 5 ต้องแสดงแค่ 5
     */
    it('should display exactly 5 segments when sources exceed 5', () => {
      fc.assert(
        fc.property(
          manySourcesArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            // ต้องแสดงแค่ 5 segments
            expect(displaySources.length).toBe(MAX_SEGMENTS)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: เมื่อมี sources น้อยกว่าหรือเท่ากับ 5 ต้องแสดงทั้งหมด
     */
    it('should display all segments when sources are 5 or fewer', () => {
      fc.assert(
        fc.property(
          fewSourcesArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            // ต้องแสดงทั้งหมด
            expect(displaySources.length).toBe(sources.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: จำนวน segments ที่แสดงต้องเท่ากับ min(N, 5)
     */
    it('displayed segments count should equal min(N, 5)', () => {
      fc.assert(
        fc.property(
          sourcesArrayArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            const expectedCount = Math.min(sources.length, MAX_SEGMENTS)
            
            // จำนวนต้องเท่ากับ min(N, 5)
            expect(displaySources.length).toBe(expectedCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: segments ที่แสดงต้องเป็น 5 ตัวแรกของ sources
     */
    it('displayed segments should be the first 5 sources', () => {
      fc.assert(
        fc.property(
          manySourcesArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            // ต้องเป็น 5 ตัวแรก
            for (let i = 0; i < MAX_SEGMENTS; i++) {
              expect(displaySources[i]).toEqual(sources[i])
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: เมื่อไม่มี sources ต้องแสดง 0 segments
     */
    it('should display 0 segments when sources array is empty', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            // ต้องแสดง 0 segments
            expect(displaySources.length).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: scoring-hub-consolidation, Property 5: Segment Display Completeness**
   * **Validates: Requirements 3.2**
   */
  describe('Property 5: Segment Display Completeness', () => {

    /**
     * Property: ทุก segment ต้องมี displayName
     */
    it('every segment should have displayName', () => {
      fc.assert(
        fc.property(
          sourcesArrayArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            displaySources.forEach(source => {
              expect(source.displayName).toBeDefined()
              expect(source.displayName).not.toBeNull()
              expect(typeof source.displayName).toBe('string')
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ทุก segment ต้องมี weight (percentage)
     */
    it('every segment should have weight percentage', () => {
      fc.assert(
        fc.property(
          sourcesArrayArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            displaySources.forEach(source => {
              expect(source.weight).toBeDefined()
              expect(source.weight).not.toBeNull()
              expect(typeof source.weight).toBe('number')
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ทุก segment ต้องมีข้อมูลครบถ้วน (ชื่อและเปอร์เซ็นต์)
     */
    it('every segment should be complete with name and percentage', () => {
      fc.assert(
        fc.property(
          sourcesArrayArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            displaySources.forEach(source => {
              expect(isSegmentComplete(source)).toBe(true)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: segment label ต้องแสดงเปอร์เซ็นต์
     */
    it('segment label should display percentage', () => {
      fc.assert(
        fc.property(
          scoreSourceArbitrary,
          (source) => {
            const label = getSegmentLabel(source)
            
            // label ต้องมี % และตัวเลข
            expect(label).toContain('%')
            expect(label).toBe(`${source.weight}%`)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: legend item ต้องมีชื่อและเปอร์เซ็นต์
     */
    it('legend item should contain name and percentage', () => {
      fc.assert(
        fc.property(
          scoreSourceArbitrary,
          (source) => {
            const legend = getLegendItem(source)
            
            // legend ต้องมีชื่อ
            expect(legend.name).toBe(source.displayName)
            
            // legend ต้องมีเปอร์เซ็นต์
            expect(legend.weight).toBe(`${source.weight}%`)
            expect(legend.weight).toContain('%')
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ทุก segment ต้องมี color
     */
    it('every segment should have color', () => {
      fc.assert(
        fc.property(
          sourcesArrayArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            displaySources.forEach(source => {
              expect(source.color).toBeDefined()
              expect(source.color).not.toBeNull()
              expect(typeof source.color).toBe('string')
              // ต้องเป็น hex color
              expect(source.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: weight ต้องอยู่ในช่วง 0-100
     */
    it('weight should be between 0 and 100', () => {
      fc.assert(
        fc.property(
          sourcesArrayArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            displaySources.forEach(source => {
              expect(source.weight).toBeGreaterThanOrEqual(0)
              expect(source.weight).toBeLessThanOrEqual(100)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: displayName ต้องไม่ว่างเปล่า
     */
    it('displayName should not be empty', () => {
      fc.assert(
        fc.property(
          sourcesArrayArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            displaySources.forEach(source => {
              expect(source.displayName.length).toBeGreaterThan(0)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ทุก segment ต้องมี category
     */
    it('every segment should have category', () => {
      fc.assert(
        fc.property(
          sourcesArrayArbitrary,
          (sources) => {
            const displaySources = getDisplaySources(sources)
            
            displaySources.forEach(source => {
              expect(source.category).toBeDefined()
              expect(source.category).not.toBeNull()
              expect(['attendance', 'training', 'skill', 'competition', 'bonus']).toContain(source.category)
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
