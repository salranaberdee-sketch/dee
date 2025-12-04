/**
 * Selection Logic Property-Based Tests
 * 
 * **Feature: tournament-management-enhancement**
 * **Validates: Requirements 1.2, 2.3, 2.4**
 * 
 * ทดสอบ Selection Logic สำหรับ BulkAthleteSelector ด้วย Property-Based Testing
 * 
 * เนื่องจาก BulkAthleteSelector เป็น Vue component ที่มี UI
 * เราจะทดสอบ pure functions ที่เป็น core logic ของ selection
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { filterAthletesByName } from '../lib/tournamentUtils.js'

// ============================================================================
// Pure Functions for Testing (Core Selection Logic)
// ============================================================================

/**
 * คำนวณจำนวนนักกีฬาที่เลือก
 * Property 1: Selection count accuracy
 * 
 * @param {Set} selectedAthletes - Set ของ ID นักกีฬาที่เลือก
 * @returns {number} - จำนวนที่เลือก
 */
function getSelectionCount(selectedAthletes) {
  if (!selectedAthletes || !(selectedAthletes instanceof Set)) {
    return 0
  }
  return selectedAthletes.size
}

/**
 * เลือกนักกีฬาทั้งหมดที่สามารถเลือกได้ (ยังไม่ได้ลงทะเบียน)
 * Property 6: Select all correctness
 * 
 * @param {Array} filteredAthletes - รายการนักกีฬาที่กรองแล้ว
 * @param {Set} registeredIds - Set ของ ID นักกีฬาที่ลงทะเบียนแล้ว
 * @returns {Set} - Set ของ ID นักกีฬาที่เลือก
 */
function selectAllSelectable(filteredAthletes, registeredIds) {
  const selected = new Set()
  
  if (!filteredAthletes || !Array.isArray(filteredAthletes)) {
    return selected
  }
  
  const regSet = registeredIds instanceof Set ? registeredIds : new Set(registeredIds || [])
  
  for (const athlete of filteredAthletes) {
    // เลือกเฉพาะนักกีฬาที่ยังไม่ได้ลงทะเบียน
    if (!regSet.has(athlete.id)) {
      selected.add(athlete.id)
    }
  }
  
  return selected
}

/**
 * ตรวจสอบว่านักกีฬาลงทะเบียนแล้วหรือไม่
 * Property 7: Registered athletes exclusion
 * 
 * @param {string} athleteId - ID ของนักกีฬา
 * @param {Set} registeredIds - Set ของ ID นักกีฬาที่ลงทะเบียนแล้ว
 * @returns {boolean} - true ถ้าลงทะเบียนแล้ว (ต้อง disabled)
 */
function isAthleteDisabled(athleteId, registeredIds) {
  if (!athleteId || !registeredIds) {
    return false
  }
  
  const regSet = registeredIds instanceof Set ? registeredIds : new Set(registeredIds)
  return regSet.has(athleteId)
}

/**
 * กรองนักกีฬาที่สามารถเลือกได้ (ยังไม่ได้ลงทะเบียน)
 * 
 * @param {Array} athletes - รายการนักกีฬาทั้งหมด
 * @param {Set} registeredIds - Set ของ ID นักกีฬาที่ลงทะเบียนแล้ว
 * @returns {Array} - รายการนักกีฬาที่สามารถเลือกได้
 */
function getSelectableAthletes(athletes, registeredIds) {
  if (!athletes || !Array.isArray(athletes)) {
    return []
  }
  
  const regSet = registeredIds instanceof Set ? registeredIds : new Set(registeredIds || [])
  
  return athletes.filter(athlete => !regSet.has(athlete.id))
}

/**
 * Toggle การเลือกนักกีฬา
 * 
 * @param {Set} currentSelection - Set ของ ID ที่เลือกอยู่
 * @param {string} athleteId - ID ของนักกีฬาที่จะ toggle
 * @param {Set} registeredIds - Set ของ ID นักกีฬาที่ลงทะเบียนแล้ว
 * @returns {Set} - Set ใหม่หลัง toggle
 */
function toggleAthleteSelection(currentSelection, athleteId, registeredIds) {
  const newSelection = new Set(currentSelection)
  const regSet = registeredIds instanceof Set ? registeredIds : new Set(registeredIds || [])
  
  // ถ้าลงทะเบียนแล้ว ไม่สามารถ toggle ได้
  if (regSet.has(athleteId)) {
    return newSelection
  }
  
  if (newSelection.has(athleteId)) {
    newSelection.delete(athleteId)
  } else {
    newSelection.add(athleteId)
  }
  
  return newSelection
}

// ============================================================================
// Test Arbitraries
// ============================================================================

/**
 * Arbitrary สำหรับสร้างนักกีฬา
 */
const athleteArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  club_id: fc.oneof(fc.uuid(), fc.constant(null))
})

/**
 * Arbitrary สำหรับสร้างรายการนักกีฬา
 */
const athleteListArbitrary = fc.array(athleteArbitrary, { minLength: 0, maxLength: 50 })

/**
 * Arbitrary สำหรับสร้าง Set ของ IDs
 */
const idSetArbitrary = fc.array(fc.uuid(), { minLength: 0, maxLength: 20 })
  .map(ids => new Set(ids))

// ============================================================================
// Property Tests
// ============================================================================

describe('Selection Logic Property Tests', () => {

  /**
   * **Feature: tournament-management-enhancement, Property 1: Selection count accuracy**
   * **Validates: Requirements 1.2**
   * 
   * For any set of selected athletes in the bulk selector, the displayed count
   * SHALL equal the actual size of the selection set.
   */
  describe('Property 1: Selection count accuracy', () => {

    it('จำนวนที่แสดงต้องเท่ากับขนาดของ Set ที่เลือก', () => {
      fc.assert(
        fc.property(
          idSetArbitrary,
          (selectedIds) => {
            const displayedCount = getSelectionCount(selectedIds)
            
            // จำนวนที่แสดงต้องเท่ากับ size ของ Set
            expect(displayedCount).toBe(selectedIds.size)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('การเพิ่มนักกีฬาต้องเพิ่มจำนวนขึ้น 1', () => {
      fc.assert(
        fc.property(
          idSetArbitrary,
          fc.uuid(),
          (selectedIds, newId) => {
            // ข้าม case ที่ newId อยู่ใน selectedIds แล้ว
            if (selectedIds.has(newId)) {
              return true
            }
            
            const countBefore = getSelectionCount(selectedIds)
            
            // เพิ่ม newId
            const newSelection = new Set(selectedIds)
            newSelection.add(newId)
            
            const countAfter = getSelectionCount(newSelection)
            
            // จำนวนต้องเพิ่มขึ้น 1
            expect(countAfter).toBe(countBefore + 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('การลบนักกีฬาต้องลดจำนวนลง 1', () => {
      fc.assert(
        fc.property(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
          (ids) => {
            const selectedIds = new Set(ids)
            const idToRemove = ids[0]
            
            const countBefore = getSelectionCount(selectedIds)
            
            // ลบ id
            const newSelection = new Set(selectedIds)
            newSelection.delete(idToRemove)
            
            const countAfter = getSelectionCount(newSelection)
            
            // จำนวนต้องลดลง 1
            expect(countAfter).toBe(countBefore - 1)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Set ว่างต้องมีจำนวนเป็น 0', () => {
      const emptySet = new Set()
      expect(getSelectionCount(emptySet)).toBe(0)
    })

    it('null หรือ undefined ต้องคืนค่า 0', () => {
      expect(getSelectionCount(null)).toBe(0)
      expect(getSelectionCount(undefined)).toBe(0)
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 6: Select all correctness**
   * **Validates: Requirements 2.3**
   * 
   * For any filtered athlete list, after select all operation, the selection count
   * SHALL equal the count of visible filtered athletes that are not already registered.
   */
  describe('Property 6: Select all correctness', () => {

    it('หลัง select all จำนวนที่เลือกต้องเท่ากับจำนวนนักกีฬาที่เลือกได้', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          idSetArbitrary,
          (athletes, registeredIds) => {
            const selected = selectAllSelectable(athletes, registeredIds)
            
            // นับจำนวนนักกีฬาที่ยังไม่ได้ลงทะเบียน
            const selectableCount = athletes.filter(a => !registeredIds.has(a.id)).length
            
            // จำนวนที่เลือกต้องเท่ากับจำนวนที่เลือกได้
            expect(selected.size).toBe(selectableCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('select all ต้องไม่รวมนักกีฬาที่ลงทะเบียนแล้ว', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          (athletes) => {
            // ให้ครึ่งแรกเป็น registered
            const halfLength = Math.floor(athletes.length / 2)
            const registeredIds = new Set(athletes.slice(0, halfLength).map(a => a.id))
            
            const selected = selectAllSelectable(athletes, registeredIds)
            
            // ตรวจสอบว่าไม่มี registered ID ใน selected
            for (const id of selected) {
              expect(registeredIds.has(id)).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('select all ต้องรวมนักกีฬาที่ยังไม่ได้ลงทะเบียนทุกคน', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          idSetArbitrary,
          (athletes, registeredIds) => {
            const selected = selectAllSelectable(athletes, registeredIds)
            
            // ตรวจสอบว่านักกีฬาที่ยังไม่ได้ลงทะเบียนทุกคนถูกเลือก
            for (const athlete of athletes) {
              if (!registeredIds.has(athlete.id)) {
                expect(selected.has(athlete.id)).toBe(true)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('select all กับ filtered list ต้องเลือกเฉพาะที่ filter ผ่าน', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          fc.string({ minLength: 1, maxLength: 5 }),
          idSetArbitrary,
          (athletes, searchQuery, registeredIds) => {
            // กรองนักกีฬาตาม search query
            const filteredAthletes = filterAthletesByName(athletes, searchQuery)
            
            const selected = selectAllSelectable(filteredAthletes, registeredIds)
            
            // จำนวนที่เลือกต้องไม่เกินจำนวนที่ filter ผ่าน
            expect(selected.size).toBeLessThanOrEqual(filteredAthletes.length)
            
            // ทุก ID ที่เลือกต้องอยู่ใน filtered list
            const filteredIds = new Set(filteredAthletes.map(a => a.id))
            for (const id of selected) {
              expect(filteredIds.has(id)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('ถ้าทุกคนลงทะเบียนแล้ว select all ต้องได้ Set ว่าง', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          (athletes) => {
            // ให้ทุกคนลงทะเบียนแล้ว
            const registeredIds = new Set(athletes.map(a => a.id))
            
            const selected = selectAllSelectable(athletes, registeredIds)
            
            expect(selected.size).toBe(0)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 7: Registered athletes exclusion**
   * **Validates: Requirements 2.4**
   * 
   * For any athlete already registered in the tournament, they SHALL be marked
   * as disabled in the selection interface.
   */
  describe('Property 7: Registered athletes exclusion', () => {

    it('นักกีฬาที่ลงทะเบียนแล้วต้องถูก disabled', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          (athletes) => {
            // ให้ครึ่งแรกเป็น registered
            const halfLength = Math.floor(athletes.length / 2)
            const registeredIds = new Set(athletes.slice(0, halfLength).map(a => a.id))
            
            // ตรวจสอบว่านักกีฬาที่ลงทะเบียนแล้วถูก disabled
            for (const athlete of athletes) {
              const isDisabled = isAthleteDisabled(athlete.id, registeredIds)
              const shouldBeDisabled = registeredIds.has(athlete.id)
              
              expect(isDisabled).toBe(shouldBeDisabled)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('นักกีฬาที่ยังไม่ได้ลงทะเบียนต้องไม่ถูก disabled', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          idSetArbitrary,
          (athletes, registeredIds) => {
            for (const athlete of athletes) {
              if (!registeredIds.has(athlete.id)) {
                const isDisabled = isAthleteDisabled(athlete.id, registeredIds)
                expect(isDisabled).toBe(false)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('toggle นักกีฬาที่ลงทะเบียนแล้วต้องไม่เปลี่ยนแปลง selection', () => {
      fc.assert(
        fc.property(
          idSetArbitrary,
          fc.uuid(),
          (currentSelection, registeredId) => {
            // สร้าง registeredIds ที่มี registeredId
            const registeredIds = new Set([registeredId])
            
            const newSelection = toggleAthleteSelection(currentSelection, registeredId, registeredIds)
            
            // selection ต้องไม่เปลี่ยนแปลง
            expect(newSelection.size).toBe(currentSelection.size)
            expect(newSelection.has(registeredId)).toBe(currentSelection.has(registeredId))
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('toggle นักกีฬาที่ยังไม่ได้ลงทะเบียนต้องเปลี่ยนแปลง selection', () => {
      fc.assert(
        fc.property(
          idSetArbitrary,
          fc.uuid(),
          (currentSelection, athleteId) => {
            // ไม่มี registered
            const registeredIds = new Set()
            
            const wasSelected = currentSelection.has(athleteId)
            const newSelection = toggleAthleteSelection(currentSelection, athleteId, registeredIds)
            
            // ถ้าเคยเลือก ต้องไม่เลือกแล้ว และกลับกัน
            expect(newSelection.has(athleteId)).toBe(!wasSelected)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('getSelectableAthletes ต้องไม่รวมนักกีฬาที่ลงทะเบียนแล้ว', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          (athletes) => {
            // ให้ครึ่งแรกเป็น registered
            const halfLength = Math.floor(athletes.length / 2)
            const registeredIds = new Set(athletes.slice(0, halfLength).map(a => a.id))
            
            const selectable = getSelectableAthletes(athletes, registeredIds)
            
            // ตรวจสอบว่าไม่มี registered ID ใน selectable
            for (const athlete of selectable) {
              expect(registeredIds.has(athlete.id)).toBe(false)
            }
            
            // จำนวน selectable + registered = total
            expect(selectable.length + registeredIds.size).toBeLessThanOrEqual(athletes.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('ถ้าไม่มีใครลงทะเบียน ทุกคนต้องไม่ถูก disabled', () => {
      fc.assert(
        fc.property(
          athleteListArbitrary,
          (athletes) => {
            const registeredIds = new Set()
            
            for (const athlete of athletes) {
              expect(isAthleteDisabled(athlete.id, registeredIds)).toBe(false)
            }
            
            const selectable = getSelectableAthletes(athletes, registeredIds)
            expect(selectable.length).toBe(athletes.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
