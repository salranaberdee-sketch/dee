/**
 * Action Card Title Length and Badge Logic Property-Based Tests
 * 
 * **Feature: scoring-hub-consolidation, Property 2: Title Length Constraint**
 * **Feature: scoring-hub-consolidation, Property 9: Setup Badge Logic**
 * **Validates: Requirements 1.2, 2.4**
 * 
 * Property 2: For any Action Card title, the title SHALL contain maximum 4 words.
 * Property 9: For any Action Card representing incomplete setup, the card SHALL display a badge.
 *             For any complete setup, no badge SHALL be shown.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// ค่าคงที่ของ Action Cards (จาก ScoringHub.vue)
// ============================================================================

/**
 * 4 การ์ดคงที่ที่ต้องแสดงเสมอ
 */
const ACTION_CARDS = [
  { id: 'config', icon: 'settings', title: 'ตั้งค่าเกณฑ์', route: '/scoring-config' },
  { id: 'evaluation', icon: 'chart', title: 'ดูผลประเมิน', route: '/evaluation' },
  { id: 'calculator', icon: 'calculator', title: 'คำนวณคะแนน', route: '/score-calculator' },
  { id: 'conditions', icon: 'plus-minus', title: 'โบนัส/หักคะแนน', route: '/scoring-conditions' }
]

/**
 * ฟังก์ชันนับจำนวนคำใน title
 * รองรับทั้งภาษาไทยและภาษาอังกฤษ
 * @param {string} title - ชื่อการ์ด
 * @returns {number} - จำนวนคำ
 */
function countWords(title) {
  if (!title || typeof title !== 'string') return 0
  // แยกคำด้วย space หรือ / (สำหรับ "โบนัส/หักคะแนน")
  const words = title.trim().split(/[\s/]+/).filter(w => w.length > 0)
  return words.length
}

/**
 * ฟังก์ชันตรวจสอบว่า title มีไม่เกิน 4 คำ
 * @param {string} title - ชื่อการ์ด
 * @returns {boolean} - true ถ้าไม่เกิน 4 คำ
 */
function isValidTitleLength(title) {
  return countWords(title) <= 4
}

/**
 * ฟังก์ชันตรวจสอบว่าการ์ดควรแสดง badge หรือไม่
 * Badge แสดงเมื่อ:
 * - configStatus เป็น 'none' และ cardId เป็น 'config'
 * - configStatus เป็น 'inactive' และ cardId เป็น 'config'
 * 
 * @param {string} cardId - ID ของการ์ด
 * @param {'active' | 'inactive' | 'none'} configStatus - สถานะ config
 * @returns {boolean} - true ถ้าควรแสดง badge
 */
function getCardBadge(cardId, configStatus) {
  if (configStatus === 'none' && cardId === 'config') return true
  if (configStatus === 'inactive' && cardId === 'config') return true
  return false
}

/**
 * ฟังก์ชันตรวจสอบว่า setup เสร็จสมบูรณ์หรือไม่
 * @param {'active' | 'inactive' | 'none'} configStatus - สถานะ config
 * @returns {boolean} - true ถ้า setup เสร็จสมบูรณ์ (active)
 */
function isSetupComplete(configStatus) {
  return configStatus === 'active'
}

// ============================================================================
// Test Arbitraries
// ============================================================================

/**
 * Arbitrary สำหรับสถานะ config ที่เป็นไปได้ทั้งหมด
 */
const configStatusArbitrary = fc.constantFrom('active', 'inactive', 'none')

/**
 * Arbitrary สำหรับ card ID ที่เป็นไปได้
 */
const cardIdArbitrary = fc.constantFrom('config', 'evaluation', 'calculator', 'conditions')

/**
 * Arbitrary สำหรับคำเดี่ยว (ไม่มี space หรือ /)
 */
const singleWordArbitrary = fc.string({ minLength: 1, maxLength: 10 })
  .filter(s => s.trim().length > 0 && !s.includes(' ') && !s.includes('/') && !s.includes('\t') && !s.includes('\n'))

/**
 * Arbitrary สำหรับ title ที่ถูกต้อง (1-4 คำ)
 */
const validTitleArbitrary = fc.array(
  singleWordArbitrary,
  { minLength: 1, maxLength: 4 }
).map(words => words.join(' '))

/**
 * Arbitrary สำหรับ title ที่ไม่ถูกต้อง (มากกว่า 4 คำ)
 */
const invalidTitleArbitrary = fc.array(
  singleWordArbitrary,
  { minLength: 5, maxLength: 10 }
).map(words => words.join(' '))

// ============================================================================
// Property Tests
// ============================================================================

describe('Action Card Property Tests', () => {

  /**
   * **Feature: scoring-hub-consolidation, Property 2: Title Length Constraint**
   * **Validates: Requirements 1.2**
   */
  describe('Property 2: Title Length Constraint', () => {

    /**
     * Property: ทุก title ของ ACTION_CARDS ต้องมีไม่เกิน 4 คำ
     */
    it('all predefined action card titles should have maximum 4 words', () => {
      ACTION_CARDS.forEach(card => {
        const wordCount = countWords(card.title)
        expect(wordCount).toBeLessThanOrEqual(4)
        expect(isValidTitleLength(card.title)).toBe(true)
      })
    })

    /**
     * Property: สำหรับ title ที่มี 1-4 คำ ต้องผ่าน validation
     */
    it('titles with 1-4 words should pass validation', () => {
      fc.assert(
        fc.property(
          validTitleArbitrary,
          (title) => {
            const wordCount = countWords(title)
            // Title ที่สร้างจาก validTitleArbitrary ต้องมี 1-4 คำ
            expect(wordCount).toBeGreaterThanOrEqual(1)
            expect(wordCount).toBeLessThanOrEqual(4)
            expect(isValidTitleLength(title)).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: สำหรับ title ที่มีมากกว่า 4 คำ ต้องไม่ผ่าน validation
     */
    it('titles with more than 4 words should fail validation', () => {
      fc.assert(
        fc.property(
          invalidTitleArbitrary,
          (title) => {
            const wordCount = countWords(title)
            // Title ที่สร้างจาก invalidTitleArbitrary ต้องมีมากกว่า 4 คำ
            expect(wordCount).toBeGreaterThan(4)
            expect(isValidTitleLength(title)).toBe(false)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: title ว่างหรือ whitespace only ต้องมี 0 คำ
     */
    it('empty or whitespace-only titles should have 0 words', () => {
      const emptyTitles = ['', '   ', '\t', '\n', '  \t  \n  ']
      emptyTitles.forEach(title => {
        expect(countWords(title)).toBe(0)
        expect(isValidTitleLength(title)).toBe(true) // 0 <= 4
      })
    })

    /**
     * Property: title ที่มี / ต้องนับแยกคำ (เช่น "โบนัส/หักคะแนน" = 2 คำ)
     */
    it('titles with "/" should count as separate words', () => {
      const titleWithSlash = 'โบนัส/หักคะแนน'
      const wordCount = countWords(titleWithSlash)
      expect(wordCount).toBe(2)
      expect(isValidTitleLength(titleWithSlash)).toBe(true)
    })

    /**
     * Property: ทุก title ใน ACTION_CARDS ต้องไม่ว่าง
     */
    it('all predefined action card titles should not be empty', () => {
      ACTION_CARDS.forEach(card => {
        expect(card.title).toBeTruthy()
        expect(card.title.trim().length).toBeGreaterThan(0)
        expect(countWords(card.title)).toBeGreaterThan(0)
      })
    })
  })

  /**
   * **Feature: scoring-hub-consolidation, Property 9: Setup Badge Logic**
   * **Validates: Requirements 2.4**
   */
  describe('Property 9: Setup Badge Logic', () => {

    /**
     * Property: เมื่อ configStatus เป็น 'none' การ์ด 'config' ต้องแสดง badge
     */
    it('config card should show badge when configStatus is "none"', () => {
      fc.assert(
        fc.property(
          fc.constant('none'),
          (configStatus) => {
            const showBadge = getCardBadge('config', configStatus)
            expect(showBadge).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: เมื่อ configStatus เป็น 'inactive' การ์ด 'config' ต้องแสดง badge
     */
    it('config card should show badge when configStatus is "inactive"', () => {
      fc.assert(
        fc.property(
          fc.constant('inactive'),
          (configStatus) => {
            const showBadge = getCardBadge('config', configStatus)
            expect(showBadge).toBe(true)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: เมื่อ configStatus เป็น 'active' (setup complete) ไม่มีการ์ดใดแสดง badge
     */
    it('no card should show badge when configStatus is "active" (setup complete)', () => {
      fc.assert(
        fc.property(
          cardIdArbitrary,
          (cardId) => {
            const showBadge = getCardBadge(cardId, 'active')
            expect(showBadge).toBe(false)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: การ์ดที่ไม่ใช่ 'config' ต้องไม่แสดง badge ไม่ว่า configStatus จะเป็นอะไร
     */
    it('non-config cards should never show badge regardless of configStatus', () => {
      const nonConfigCards = ['evaluation', 'calculator', 'conditions']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...nonConfigCards),
          configStatusArbitrary,
          (cardId, configStatus) => {
            const showBadge = getCardBadge(cardId, configStatus)
            expect(showBadge).toBe(false)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Badge แสดงเฉพาะเมื่อ setup ไม่สมบูรณ์ (incomplete)
     * - incomplete = configStatus เป็น 'none' หรือ 'inactive'
     * - complete = configStatus เป็น 'active'
     */
    it('badge should only show for incomplete setup on config card', () => {
      fc.assert(
        fc.property(
          configStatusArbitrary,
          (configStatus) => {
            const isComplete = isSetupComplete(configStatus)
            const showBadge = getCardBadge('config', configStatus)
            
            if (isComplete) {
              // Setup complete → ไม่แสดง badge
              expect(showBadge).toBe(false)
            } else {
              // Setup incomplete → แสดง badge
              expect(showBadge).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ความสัมพันธ์ระหว่าง isSetupComplete และ getCardBadge
     * - ถ้า setup complete → badge = false สำหรับทุกการ์ด
     * - ถ้า setup incomplete → badge = true เฉพาะการ์ด config
     */
    it('badge logic should be consistent with setup completion status', () => {
      fc.assert(
        fc.property(
          cardIdArbitrary,
          configStatusArbitrary,
          (cardId, configStatus) => {
            const isComplete = isSetupComplete(configStatus)
            const showBadge = getCardBadge(cardId, configStatus)
            
            if (isComplete) {
              // Setup complete → ไม่มีการ์ดใดแสดง badge
              expect(showBadge).toBe(false)
            } else {
              // Setup incomplete → เฉพาะ config card แสดง badge
              if (cardId === 'config') {
                expect(showBadge).toBe(true)
              } else {
                expect(showBadge).toBe(false)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: ตรวจสอบว่า ACTION_CARDS ทั้งหมดมี badge logic ที่ถูกต้อง
     */
    it('all ACTION_CARDS should have correct badge logic for all config states', () => {
      fc.assert(
        fc.property(
          configStatusArbitrary,
          (configStatus) => {
            ACTION_CARDS.forEach(card => {
              const showBadge = getCardBadge(card.id, configStatus)
              
              if (configStatus === 'active') {
                // Active → ไม่มี badge
                expect(showBadge).toBe(false)
              } else {
                // None หรือ Inactive → เฉพาะ config มี badge
                if (card.id === 'config') {
                  expect(showBadge).toBe(true)
                } else {
                  expect(showBadge).toBe(false)
                }
              }
            })
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
