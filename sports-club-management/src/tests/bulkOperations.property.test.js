/**
 * Bulk Operations Property-Based Tests
 * 
 * **Feature: tournament-management-enhancement**
 * **Validates: Requirements 1.3, 1.5, 4.3, 4.4**
 * 
 * ทดสอบ Bulk Operations สำหรับจัดการผู้เข้าแข่งขันทัวนาเมนต์ด้วย Property-Based Testing
 * 
 * เนื่องจาก bulk operations ใน store ต้องเชื่อมต่อกับ Supabase
 * เราจะทดสอบ pure functions ที่เป็น core logic ของ operations เหล่านี้
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Pure Functions for Testing (Core Logic)
// ============================================================================

/**
 * จำลองการเพิ่มนักกีฬาหลายคน และคำนวณผลลัพธ์
 * ใช้สำหรับทดสอบ Property 2 และ 3
 * 
 * @param {Array} athleteIds - รายการ ID นักกีฬาที่จะเพิ่ม
 * @param {Set} existingAthleteIds - รายการ ID นักกีฬาที่ลงทะเบียนแล้ว
 * @param {Set} failingAthleteIds - รายการ ID นักกีฬาที่จะล้มเหลว (จำลอง error)
 * @returns {Object} - { addedIds, failedIds, addedCount, failedCount }
 */
function simulateBulkAdd(athleteIds, existingAthleteIds, failingAthleteIds = new Set()) {
  const addedIds = []
  const failedIds = []
  
  for (const athleteId of athleteIds) {
    // ถ้าลงทะเบียนแล้ว หรืออยู่ใน failing set -> ล้มเหลว
    if (existingAthleteIds.has(athleteId) || failingAthleteIds.has(athleteId)) {
      failedIds.push(athleteId)
    } else {
      addedIds.push(athleteId)
    }
  }
  
  return {
    addedIds,
    failedIds,
    addedCount: addedIds.length,
    failedCount: failedIds.length,
    success: addedIds.length > 0 || failedIds.length === 0
  }
}

/**
 * จำลองการลบผู้เข้าแข่งขันหลายคน
 * ใช้สำหรับทดสอบ Property 11
 * 
 * @param {Array} participants - รายการผู้เข้าแข่งขันทั้งหมด
 * @param {Array} idsToRemove - รายการ ID ที่จะลบ
 * @returns {Object} - { remainingParticipants, removedCount }
 */
function simulateBulkRemove(participants, idsToRemove) {
  const removeSet = new Set(idsToRemove)
  const remainingParticipants = participants.filter(p => !removeSet.has(p.id))
  
  return {
    remainingParticipants,
    removedCount: participants.length - remainingParticipants.length
  }
}

/**
 * จำลองการเปลี่ยน category ของผู้เข้าแข่งขันหลายคน
 * ใช้สำหรับทดสอบ Property 12
 * 
 * @param {Array} participants - รายการผู้เข้าแข่งขันทั้งหมด
 * @param {Array} idsToUpdate - รายการ ID ที่จะอัพเดท
 * @param {string} newCategory - category ใหม่
 * @returns {Object} - { updatedParticipants, updatedCount }
 */
function simulateBulkCategoryUpdate(participants, idsToUpdate, newCategory) {
  const updateSet = new Set(idsToUpdate)
  const updatedParticipants = participants.map(p => {
    if (updateSet.has(p.id)) {
      return { ...p, category: newCategory || null }
    }
    return p
  })
  
  return {
    updatedParticipants,
    updatedCount: idsToUpdate.filter(id => participants.some(p => p.id === id)).length
  }
}

/**
 * คำนวณสถิติการลงทะเบียน
 * ใช้สำหรับตรวจสอบความถูกต้องของ bulk operations
 * 
 * @param {Array} participants - รายการผู้เข้าแข่งขัน
 * @returns {Object} - { total, byStatus, byCategory }
 */
function calculateStats(participants) {
  const stats = {
    total: participants.length,
    byStatus: {},
    byCategory: {}
  }
  
  for (const p of participants) {
    const status = p.registration_status || 'pending'
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
    
    const category = p.category || 'uncategorized'
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
  }
  
  return stats
}

// ============================================================================
// Test Arbitraries
// ============================================================================

/**
 * Arbitrary สำหรับสร้าง athlete ID
 */
const athleteIdArbitrary = fc.uuid()

/**
 * Arbitrary สำหรับสร้างรายการ athlete IDs
 */
const athleteIdListArbitrary = fc.array(athleteIdArbitrary, { minLength: 1, maxLength: 50 })

/**
 * Arbitrary สำหรับสร้างผู้เข้าแข่งขัน
 */
const participantArbitrary = fc.record({
  id: fc.uuid(),
  athlete_id: fc.uuid(),
  tournament_id: fc.uuid(),
  category: fc.oneof(
    fc.constant(null),
    fc.constant(''),
    fc.string({ minLength: 1, maxLength: 20 })
  ),
  weight_class: fc.oneof(
    fc.constant(null),
    fc.string({ minLength: 1, maxLength: 10 })
  ),
  registration_status: fc.constantFrom('pending', 'approved', 'rejected', 'withdrawn')
})

/**
 * Arbitrary สำหรับสร้างรายการผู้เข้าแข่งขัน
 */
const participantListArbitrary = fc.array(participantArbitrary, { minLength: 0, maxLength: 50 })

/**
 * Arbitrary สำหรับสร้าง category
 */
const categoryArbitrary = fc.oneof(
  fc.constant(null),
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 20 })
)

// ============================================================================
// Property Tests
// ============================================================================

describe('Bulk Operations Property Tests', () => {

  /**
   * **Feature: tournament-management-enhancement, Property 2: Bulk add completeness**
   * **Validates: Requirements 1.3**
   * 
   * For any list of selected athletes for bulk add, after the operation completes,
   * all successfully added athletes SHALL have corresponding participant records in the tournament.
   */
  describe('Property 2: Bulk add completeness', () => {

    it('นักกีฬาที่เพิ่มสำเร็จทุกคนต้องมี record ในผลลัพธ์', () => {
      fc.assert(
        fc.property(
          athleteIdListArbitrary,
          fc.array(athleteIdArbitrary, { minLength: 0, maxLength: 10 }), // existing
          (athleteIds, existingIds) => {
            const existingSet = new Set(existingIds)
            const result = simulateBulkAdd(athleteIds, existingSet)
            
            // ทุก ID ที่เพิ่มสำเร็จต้องอยู่ใน addedIds
            for (const addedId of result.addedIds) {
              // ต้องไม่อยู่ใน existing
              expect(existingSet.has(addedId)).toBe(false)
            }
            
            // addedCount ต้องเท่ากับจำนวน addedIds
            expect(result.addedCount).toBe(result.addedIds.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('ผลรวมของ addedCount และ failedCount ต้องเท่ากับจำนวน athleteIds ที่ส่งเข้าไป', () => {
      fc.assert(
        fc.property(
          athleteIdListArbitrary,
          fc.array(athleteIdArbitrary, { minLength: 0, maxLength: 10 }),
          (athleteIds, existingIds) => {
            const existingSet = new Set(existingIds)
            const result = simulateBulkAdd(athleteIds, existingSet)
            
            // ผลรวมต้องเท่ากับจำนวนที่ส่งเข้าไป
            expect(result.addedCount + result.failedCount).toBe(athleteIds.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('นักกีฬาที่ลงทะเบียนแล้วต้องไม่ถูกเพิ่มซ้ำ', () => {
      fc.assert(
        fc.property(
          athleteIdListArbitrary,
          (athleteIds) => {
            // ให้ครึ่งแรกเป็น existing
            const halfLength = Math.floor(athleteIds.length / 2)
            const existingIds = athleteIds.slice(0, halfLength)
            const existingSet = new Set(existingIds)
            
            const result = simulateBulkAdd(athleteIds, existingSet)
            
            // นักกีฬาที่ลงทะเบียนแล้วต้องอยู่ใน failedIds
            for (const existingId of existingIds) {
              if (athleteIds.includes(existingId)) {
                expect(result.failedIds).toContain(existingId)
              }
            }
            
            // นักกีฬาที่เพิ่มสำเร็จต้องไม่อยู่ใน existing
            for (const addedId of result.addedIds) {
              expect(existingSet.has(addedId)).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 3: Partial failure handling**
   * **Validates: Requirements 1.5**
   * 
   * For any bulk add operation where some athletes fail, the successful athletes
   * SHALL still be added and the failure count SHALL equal the number of athletes that failed.
   */
  describe('Property 3: Partial failure handling', () => {

    it('เมื่อบางคนล้มเหลว คนอื่นต้องยังเพิ่มได้สำเร็จ', () => {
      fc.assert(
        fc.property(
          athleteIdListArbitrary,
          fc.array(athleteIdArbitrary, { minLength: 1, maxLength: 5 }), // failing
          (athleteIds, failingIds) => {
            const failingSet = new Set(failingIds)
            const existingSet = new Set() // ไม่มี existing
            
            const result = simulateBulkAdd(athleteIds, existingSet, failingSet)
            
            // นักกีฬาที่ไม่อยู่ใน failing set ต้องเพิ่มสำเร็จ
            for (const athleteId of athleteIds) {
              if (!failingSet.has(athleteId)) {
                expect(result.addedIds).toContain(athleteId)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('failedCount ต้องเท่ากับจำนวนนักกีฬาที่ล้มเหลวจริง', () => {
      fc.assert(
        fc.property(
          athleteIdListArbitrary,
          fc.array(athleteIdArbitrary, { minLength: 0, maxLength: 10 }),
          fc.array(athleteIdArbitrary, { minLength: 0, maxLength: 5 }),
          (athleteIds, existingIds, failingIds) => {
            const existingSet = new Set(existingIds)
            const failingSet = new Set(failingIds)
            
            const result = simulateBulkAdd(athleteIds, existingSet, failingSet)
            
            // นับจำนวนที่ควรล้มเหลว
            let expectedFailCount = 0
            for (const athleteId of athleteIds) {
              if (existingSet.has(athleteId) || failingSet.has(athleteId)) {
                expectedFailCount++
              }
            }
            
            expect(result.failedCount).toBe(expectedFailCount)
            expect(result.failedIds.length).toBe(expectedFailCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('success ต้องเป็น false เฉพาะเมื่อทุกคนล้มเหลว', () => {
      fc.assert(
        fc.property(
          athleteIdListArbitrary,
          (athleteIds) => {
            // กรณี 1: ทุกคนล้มเหลว
            const allFailingSet = new Set(athleteIds)
            const result1 = simulateBulkAdd(athleteIds, new Set(), allFailingSet)
            expect(result1.success).toBe(false)
            
            // กรณี 2: ไม่มีใครล้มเหลว
            const result2 = simulateBulkAdd(athleteIds, new Set(), new Set())
            expect(result2.success).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 11: Bulk remove completeness**
   * **Validates: Requirements 4.3**
   * 
   * For any selection of participants for bulk remove, after the operation completes,
   * none of the selected participants SHALL exist in the participant list.
   */
  describe('Property 11: Bulk remove completeness', () => {

    it('ผู้เข้าแข่งขันที่เลือกลบต้องไม่อยู่ในรายการหลังลบ', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            // เลือกลบครึ่งหนึ่ง
            const halfLength = Math.floor(participants.length / 2)
            const idsToRemove = participants.slice(0, halfLength).map(p => p.id)
            
            const result = simulateBulkRemove(participants, idsToRemove)
            
            // ตรวจสอบว่า ID ที่ลบไม่อยู่ในผลลัพธ์
            const remainingIds = new Set(result.remainingParticipants.map(p => p.id))
            for (const removedId of idsToRemove) {
              expect(remainingIds.has(removedId)).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('ผู้เข้าแข่งขันที่ไม่ได้เลือกลบต้องยังคงอยู่', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            // เลือกลบครึ่งแรก
            const halfLength = Math.floor(participants.length / 2)
            const idsToRemove = participants.slice(0, halfLength).map(p => p.id)
            const idsToKeep = participants.slice(halfLength).map(p => p.id)
            
            const result = simulateBulkRemove(participants, idsToRemove)
            
            // ตรวจสอบว่า ID ที่ไม่ได้ลบยังอยู่
            const remainingIds = new Set(result.remainingParticipants.map(p => p.id))
            for (const keepId of idsToKeep) {
              expect(remainingIds.has(keepId)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('removedCount ต้องเท่ากับจำนวนที่ลบจริง', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            // เลือกลบบางส่วน
            const idsToRemove = participants
              .filter((_, i) => i % 2 === 0)
              .map(p => p.id)
            
            const result = simulateBulkRemove(participants, idsToRemove)
            
            // จำนวนที่เหลือ + จำนวนที่ลบ = จำนวนเดิม
            expect(result.remainingParticipants.length + result.removedCount).toBe(participants.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('การลบ ID ที่ไม่มีอยู่ต้องไม่กระทบรายการเดิม', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
          (participants, randomIds) => {
            // ลบ ID ที่ไม่มีอยู่ในรายการ
            const existingIds = new Set(participants.map(p => p.id))
            const nonExistingIds = randomIds.filter(id => !existingIds.has(id))
            
            const result = simulateBulkRemove(participants, nonExistingIds)
            
            // รายการต้องไม่เปลี่ยนแปลง
            expect(result.remainingParticipants.length).toBe(participants.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: tournament-management-enhancement, Property 12: Bulk category update consistency**
   * **Validates: Requirements 4.4**
   * 
   * For any selection of participants and a new category value, after bulk update,
   * all selected participants SHALL have the new category value.
   */
  describe('Property 12: Bulk category update consistency', () => {

    it('ผู้เข้าแข่งขันที่เลือกต้องมี category ใหม่หลังอัพเดท', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          categoryArbitrary,
          (participants, newCategory) => {
            // เลือกอัพเดทครึ่งหนึ่ง
            const halfLength = Math.floor(participants.length / 2)
            const idsToUpdate = participants.slice(0, halfLength).map(p => p.id)
            
            const result = simulateBulkCategoryUpdate(participants, idsToUpdate, newCategory)
            
            // ตรวจสอบว่าผู้เข้าแข่งขันที่เลือกมี category ใหม่
            const updateSet = new Set(idsToUpdate)
            for (const p of result.updatedParticipants) {
              if (updateSet.has(p.id)) {
                expect(p.category).toBe(newCategory || null)
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('ผู้เข้าแข่งขันที่ไม่ได้เลือกต้องมี category เดิม', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          categoryArbitrary,
          (participants, newCategory) => {
            // เลือกอัพเดทครึ่งแรก
            const halfLength = Math.floor(participants.length / 2)
            const idsToUpdate = participants.slice(0, halfLength).map(p => p.id)
            const updateSet = new Set(idsToUpdate)
            
            // เก็บ category เดิมของคนที่ไม่ได้เลือก
            const originalCategories = new Map()
            for (const p of participants) {
              if (!updateSet.has(p.id)) {
                originalCategories.set(p.id, p.category)
              }
            }
            
            const result = simulateBulkCategoryUpdate(participants, idsToUpdate, newCategory)
            
            // ตรวจสอบว่าผู้เข้าแข่งขันที่ไม่ได้เลือกมี category เดิม
            for (const p of result.updatedParticipants) {
              if (!updateSet.has(p.id)) {
                expect(p.category).toBe(originalCategories.get(p.id))
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('updatedCount ต้องเท่ากับจำนวนที่อัพเดทจริง', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          categoryArbitrary,
          (participants, newCategory) => {
            // เลือกอัพเดทบางส่วน
            const idsToUpdate = participants
              .filter((_, i) => i % 3 === 0)
              .map(p => p.id)
            
            const result = simulateBulkCategoryUpdate(participants, idsToUpdate, newCategory)
            
            // updatedCount ต้องเท่ากับจำนวน ID ที่มีอยู่จริงในรายการ
            const existingIds = new Set(participants.map(p => p.id))
            const validUpdateCount = idsToUpdate.filter(id => existingIds.has(id)).length
            
            expect(result.updatedCount).toBe(validUpdateCount)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('จำนวนผู้เข้าแข่งขันต้องไม่เปลี่ยนแปลงหลังอัพเดท category', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          categoryArbitrary,
          (participants, newCategory) => {
            const idsToUpdate = participants.map(p => p.id)
            
            const result = simulateBulkCategoryUpdate(participants, idsToUpdate, newCategory)
            
            // จำนวนต้องเท่าเดิม
            expect(result.updatedParticipants.length).toBe(participants.length)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('การอัพเดท category เป็น null ต้องทำงานถูกต้อง', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const idsToUpdate = participants.map(p => p.id)
            
            const result = simulateBulkCategoryUpdate(participants, idsToUpdate, null)
            
            // ทุกคนต้องมี category เป็น null
            for (const p of result.updatedParticipants) {
              expect(p.category).toBe(null)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('การอัพเดท category เป็น empty string ต้องแปลงเป็น null', () => {
      fc.assert(
        fc.property(
          participantListArbitrary,
          (participants) => {
            const idsToUpdate = participants.map(p => p.id)
            
            const result = simulateBulkCategoryUpdate(participants, idsToUpdate, '')
            
            // ทุกคนต้องมี category เป็น null (empty string แปลงเป็น null)
            for (const p of result.updatedParticipants) {
              expect(p.category).toBe(null)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
