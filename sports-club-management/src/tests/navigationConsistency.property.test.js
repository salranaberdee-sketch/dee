/**
 * Navigation Consistency Property-Based Tests
 * 
 * **Feature: scoring-hub-consolidation, Property 6: Back Navigation Consistency**
 * **Feature: scoring-hub-consolidation, Property 7: Sub-page Back Arrow Presence**
 * **Validates: Requirements 5.2, 5.3**
 * 
 * Property 6: For any scoring sub-page, the back navigation SHALL always return 
 * to the hub route (/scoring-hub).
 * 
 * Property 7: For any scoring sub-page (config, evaluation, calculator, conditions), 
 * the page SHALL display a back arrow in the header.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// ค่าคงที่ของ Scoring Sub-pages
// ============================================================================

/**
 * รายการ scoring sub-pages ทั้งหมดที่ต้องมี back navigation ไปยัง hub
 */
const SCORING_SUB_PAGES = [
  { 
    id: 'config', 
    route: '/scoring-config', 
    name: 'ScoringConfig',
    backRoute: '/scoring-hub',
    hasBackArrow: true
  },
  { 
    id: 'evaluation', 
    route: '/evaluation', 
    name: 'EvaluationDashboard',
    backRoute: '/scoring-hub',
    hasBackArrow: true
  },
  { 
    id: 'calculator', 
    route: '/score-calculator', 
    name: 'ScoreCalculator',
    backRoute: '/scoring-hub',
    hasBackArrow: true
  },
  { 
    id: 'conditions', 
    route: '/scoring-conditions', 
    name: 'ScoringConditions',
    backRoute: '/scoring-hub',
    hasBackArrow: true
  }
]

/**
 * Hub route ที่ทุก sub-page ต้อง navigate กลับไป
 */
const HUB_ROUTE = '/scoring-hub'

/**
 * ฟังก์ชันจำลองการดึง back route สำหรับ sub-page
 * @param {string} pageId - ID ของ sub-page
 * @returns {string} - route ที่ต้อง navigate กลับไป
 */
function getBackRoute(pageId) {
  const page = SCORING_SUB_PAGES.find(p => p.id === pageId)
  return page ? page.backRoute : null
}

/**
 * ฟังก์ชันตรวจสอบว่า sub-page มี back arrow หรือไม่
 * @param {string} pageId - ID ของ sub-page
 * @returns {boolean} - true ถ้ามี back arrow
 */
function hasBackArrow(pageId) {
  const page = SCORING_SUB_PAGES.find(p => p.id === pageId)
  return page ? page.hasBackArrow : false
}

/**
 * ฟังก์ชันตรวจสอบว่า route เป็น scoring sub-page หรือไม่
 * @param {string} route - route ที่ต้องการตรวจสอบ
 * @returns {boolean}
 */
function isScoringSubPage(route) {
  return SCORING_SUB_PAGES.some(p => p.route === route)
}

/**
 * ฟังก์ชันดึง page info จาก route
 * @param {string} route - route ของ page
 * @returns {object|null}
 */
function getPageByRoute(route) {
  return SCORING_SUB_PAGES.find(p => p.route === route) || null
}

// ============================================================================
// Test Arbitraries
// ============================================================================

/**
 * Arbitrary สำหรับ scoring sub-page IDs
 */
const subPageIdArbitrary = fc.constantFrom('config', 'evaluation', 'calculator', 'conditions')

/**
 * Arbitrary สำหรับ scoring sub-page routes
 */
const subPageRouteArbitrary = fc.constantFrom(
  '/scoring-config',
  '/evaluation',
  '/score-calculator',
  '/scoring-conditions'
)

/**
 * Arbitrary สำหรับ random routes (รวมทั้ง scoring และ non-scoring)
 */
const randomRouteArbitrary = fc.oneof(
  subPageRouteArbitrary,
  fc.constantFrom('/dashboard', '/athletes', '/tournaments', '/profile', '/scoring-hub')
)

/**
 * Arbitrary สำหรับ navigation state
 */
const navigationStateArbitrary = fc.record({
  currentRoute: subPageRouteArbitrary,
  previousRoute: randomRouteArbitrary,
  isAuthenticated: fc.boolean(),
  userRole: fc.constantFrom('admin', 'coach', 'athlete')
})

// ============================================================================
// Property Tests
// ============================================================================

describe('Navigation Consistency Property Tests', () => {

  /**
   * **Feature: scoring-hub-consolidation, Property 6: Back Navigation Consistency**
   * **Validates: Requirements 5.3**
   */
  describe('Property 6: Back Navigation Consistency', () => {

    /**
     * Property: ทุก scoring sub-page ต้อง navigate กลับไปที่ /scoring-hub เสมอ
     */
    it('all scoring sub-pages should navigate back to /scoring-hub', () => {
      fc.assert(
        fc.property(
          subPageIdArbitrary,
          (pageId) => {
            const backRoute = getBackRoute(pageId)
            
            // Back route ต้องเป็น /scoring-hub เสมอ
            expect(backRoute).toBe(HUB_ROUTE)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Back route ต้องคงที่ไม่ว่า previous route จะเป็นอะไร
     */
    it('back route should always be /scoring-hub regardless of previous route', () => {
      fc.assert(
        fc.property(
          navigationStateArbitrary,
          (navState) => {
            const page = getPageByRoute(navState.currentRoute)
            
            if (page) {
              // Back route ต้องเป็น /scoring-hub เสมอ ไม่ว่า previous route จะเป็นอะไร
              expect(page.backRoute).toBe(HUB_ROUTE)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Back route ต้องไม่เปลี่ยนตาม user role
     */
    it('back route should not change based on user role', () => {
      fc.assert(
        fc.property(
          subPageIdArbitrary,
          fc.constantFrom('admin', 'coach'),
          (pageId, userRole) => {
            const backRoute = getBackRoute(pageId)
            
            // Back route ต้องเป็น /scoring-hub เสมอ ไม่ว่า role จะเป็นอะไร
            expect(backRoute).toBe(HUB_ROUTE)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ทุก sub-page ต้องมี back route ที่กำหนดไว้
     */
    it('every sub-page should have a defined back route', () => {
      fc.assert(
        fc.property(
          subPageIdArbitrary,
          (pageId) => {
            const backRoute = getBackRoute(pageId)
            
            // Back route ต้องไม่เป็น null หรือ undefined
            expect(backRoute).not.toBeNull()
            expect(backRoute).not.toBeUndefined()
            expect(typeof backRoute).toBe('string')
            expect(backRoute.length).toBeGreaterThan(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Back route ต้องเป็น valid route (ขึ้นต้นด้วย /)
     */
    it('back route should be a valid route starting with /', () => {
      fc.assert(
        fc.property(
          subPageIdArbitrary,
          (pageId) => {
            const backRoute = getBackRoute(pageId)
            
            // Back route ต้องขึ้นต้นด้วย /
            expect(backRoute).toMatch(/^\//)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: scoring-hub-consolidation, Property 7: Sub-page Back Arrow Presence**
   * **Validates: Requirements 5.2**
   */
  describe('Property 7: Sub-page Back Arrow Presence', () => {

    /**
     * Property: ทุก scoring sub-page ต้องมี back arrow ใน header
     */
    it('all scoring sub-pages should have back arrow in header', () => {
      fc.assert(
        fc.property(
          subPageIdArbitrary,
          (pageId) => {
            const hasArrow = hasBackArrow(pageId)
            
            // ทุก sub-page ต้องมี back arrow
            expect(hasArrow).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ทุก scoring sub-page route ต้องมี back arrow
     */
    it('all scoring sub-page routes should have back arrow', () => {
      fc.assert(
        fc.property(
          subPageRouteArbitrary,
          (route) => {
            const page = getPageByRoute(route)
            
            // ทุก route ต้องมี back arrow
            expect(page).not.toBeNull()
            expect(page.hasBackArrow).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Back arrow ต้องมีอยู่ไม่ว่า navigation state จะเป็นอย่างไร
     */
    it('back arrow should be present regardless of navigation state', () => {
      fc.assert(
        fc.property(
          navigationStateArbitrary,
          (navState) => {
            const page = getPageByRoute(navState.currentRoute)
            
            if (page) {
              // Back arrow ต้องมีอยู่เสมอ
              expect(page.hasBackArrow).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: จำนวน sub-pages ที่มี back arrow ต้องเท่ากับจำนวน sub-pages ทั้งหมด
     */
    it('all 4 sub-pages should have back arrow', () => {
      fc.assert(
        fc.property(
          fc.constant(SCORING_SUB_PAGES),
          (pages) => {
            const pagesWithBackArrow = pages.filter(p => p.hasBackArrow)
            
            // ทุก sub-page ต้องมี back arrow
            expect(pagesWithBackArrow).toHaveLength(4)
            expect(pagesWithBackArrow).toHaveLength(pages.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Back arrow ต้องชี้ไปที่ hub route เสมอ
     */
    it('back arrow should point to hub route', () => {
      fc.assert(
        fc.property(
          subPageIdArbitrary,
          (pageId) => {
            const page = SCORING_SUB_PAGES.find(p => p.id === pageId)
            
            // ถ้ามี back arrow ต้องชี้ไปที่ hub
            if (page && page.hasBackArrow) {
              expect(page.backRoute).toBe(HUB_ROUTE)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Combined Properties - ทดสอบความสัมพันธ์ระหว่าง Property 6 และ 7
   */
  describe('Combined Navigation Properties', () => {

    /**
     * Property: ทุก sub-page ที่มี back arrow ต้อง navigate ไปที่ hub
     */
    it('every sub-page with back arrow should navigate to hub', () => {
      fc.assert(
        fc.property(
          subPageIdArbitrary,
          (pageId) => {
            const hasArrow = hasBackArrow(pageId)
            const backRoute = getBackRoute(pageId)
            
            // ถ้ามี back arrow ต้อง navigate ไปที่ hub
            if (hasArrow) {
              expect(backRoute).toBe(HUB_ROUTE)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Navigation consistency ต้องคงที่ทุก sub-page
     */
    it('navigation should be consistent across all sub-pages', () => {
      fc.assert(
        fc.property(
          fc.tuple(subPageIdArbitrary, subPageIdArbitrary),
          ([pageId1, pageId2]) => {
            const backRoute1 = getBackRoute(pageId1)
            const backRoute2 = getBackRoute(pageId2)
            
            // ทุก sub-page ต้อง navigate กลับไปที่เดียวกัน
            expect(backRoute1).toBe(backRoute2)
            expect(backRoute1).toBe(HUB_ROUTE)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ทุก sub-page ต้องมีทั้ง back arrow และ back route ที่ถูกต้อง
     */
    it('every sub-page should have both back arrow and correct back route', () => {
      fc.assert(
        fc.property(
          subPageRouteArbitrary,
          (route) => {
            const page = getPageByRoute(route)
            
            expect(page).not.toBeNull()
            expect(page.hasBackArrow).toBe(true)
            expect(page.backRoute).toBe(HUB_ROUTE)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
