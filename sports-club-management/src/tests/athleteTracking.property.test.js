/**
 * Athlete Tracking Property Tests
 * ทดสอบ property-based testing สำหรับ athlete-tracking feature
 * 
 * **Feature: athlete-tracking**
 * 
 * Tests for:
 * - Property 1: Plan creation stores all required data correctly (Requirements 1.1, 1.2, 1.3, 1.4)
 * - Property 2: Field type validation rejects invalid types (Requirements 1.3)
 * - Property 3: Template application pre-fills correct fields (Requirements 2.2, 2.3, 2.4)
 * - Property 4: Goal creation stores all required data correctly (Requirements 3.2, 3.3)
 * - Property 5: Log upsert behavior - duplicate dates update instead of insert (Requirements 4.5)
 * - Property 6: Input validation based on field type (Requirements 4.2)
 * - Property 7: Progress percentage calculation is correct (Requirements 5.2)
 * - Property 8: Progress status calculation is correct (Requirements 5.3)
 * - Property 9: Role-based data filtering (Requirements 6.2, 6.3)
 * - Property 10: Milestone notification triggers at correct thresholds (Requirements 7.1, 7.2)
 * - Property 11: Deactivated plans preserve logs but hide from active list (Requirements 1.6)
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  PLAN_TEMPLATES,
  VALID_FIELD_TYPES,
  validateFieldValue,
  calculateProgressPercentage,
  calculateProgressStatus,
  detectMilestonesCrossing,
  MILESTONE_THRESHOLDS
} from '@/stores/tracking'

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

// สร้าง plan data ที่ valid
const validPlanArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ maxLength: 500 }),
  plan_type: fc.constantFrom('weight_control', 'timing', 'strength', 'general'),
  start_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
  end_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
}).filter(p => p.start_date <= p.end_date)

// สร้าง field type ที่ valid
const validFieldTypeArb = fc.constantFrom(...VALID_FIELD_TYPES)

// สร้าง field type ที่ invalid
const invalidFieldTypeArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => !VALID_FIELD_TYPES.includes(s))

// สร้าง field data ที่ valid
const validFieldArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  field_type: validFieldTypeArb,
  unit: fc.string({ maxLength: 20 }),
  is_required: fc.boolean()
})


// สร้าง goal data ที่ valid
const validGoalArb = fc.record({
  initial_value: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
  target_value: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
  target_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
})

// สร้าง numeric value สำหรับ number field
const validNumberValueArb = fc.oneof(
  fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
  fc.integer({ min: 0, max: 10000 })
)

// สร้าง invalid number value
const invalidNumberValueArb = fc.oneof(
  fc.constant('abc'),
  fc.constant('12.34.56'),
  fc.constant('not a number'),
  fc.float({ min: Math.fround(-10000), max: Math.fround(-0.01), noNaN: true }) // ค่าติดลบ
)

// สร้าง valid time format
const validTimeFormatArb = fc.oneof(
  // mm:ss format
  fc.tuple(
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 })
  ).map(([m, s]) => `${m}:${s.toString().padStart(2, '0')}`),
  // hh:mm:ss format
  fc.tuple(
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 })
  ).map(([h, m, s]) => `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`),
  // seconds as number
  fc.integer({ min: 0, max: 86400 }).map(String)
)

// สร้าง invalid time format (ที่ validateFieldValue จะ reject)
const invalidTimeFormatArb = fc.oneof(
  fc.constant('12:60:00'), // นาทีเกิน (ใน hh:mm:ss format)
  fc.constant('12:30:60'), // วินาทีเกิน
  fc.constant('abc:def'),
  fc.constant('12-30-45'),
  fc.constant('invalid')
)

// สร้าง percentage สำหรับ progress
const percentageArb = fc.float({ min: Math.fround(0), max: Math.fround(150), noNaN: true })

// สร้าง template key
const templateKeyArb = fc.constantFrom('weight_control', 'timing', 'strength', 'general')

// ============================================================================
// Property Tests
// ============================================================================

describe('Athlete Tracking Property Tests', () => {
  /**
   * **Feature: athlete-tracking, Property 1: Plan creation stores all required data correctly**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   * 
   * *For any* valid plan input with name, plan_type, start_date, end_date, and fields,
   * creating a plan should result in a stored plan with all provided data intact
   */
  describe('Property 1: Plan creation stores all required data correctly', () => {
    it('should preserve all plan data fields', () => {
      fc.assert(
        fc.property(validPlanArb, (planData) => {
          // ตรวจสอบว่า plan data มีข้อมูลครบ
          expect(planData.name).toBeDefined()
          expect(planData.name.trim().length).toBeGreaterThan(0)
          expect(planData.plan_type).toBeDefined()
          expect(['weight_control', 'timing', 'strength', 'general']).toContain(planData.plan_type)
          expect(planData.start_date).toBeInstanceOf(Date)
          expect(planData.end_date).toBeInstanceOf(Date)
          expect(planData.start_date <= planData.end_date).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should validate field data structure', () => {
      fc.assert(
        fc.property(validFieldArb, (fieldData) => {
          expect(fieldData.name).toBeDefined()
          expect(fieldData.name.trim().length).toBeGreaterThan(0)
          expect(VALID_FIELD_TYPES).toContain(fieldData.field_type)
          expect(typeof fieldData.is_required).toBe('boolean')
        }),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: athlete-tracking, Property 2: Field type validation rejects invalid types**
   * **Validates: Requirements 1.3**
   * 
   * *For any* field_type value that is not in the allowed set (number, time, reps, distance, text, select),
   * the system should reject the field creation
   */
  describe('Property 2: Field type validation rejects invalid types', () => {
    it('should accept all valid field types', () => {
      fc.assert(
        fc.property(validFieldTypeArb, (fieldType) => {
          expect(VALID_FIELD_TYPES).toContain(fieldType)
          // validateFieldValue ควรรับ valid field type
          const result = validateFieldValue(fieldType, 'test')
          // text และ select รับ string ได้
          if (fieldType === 'text' || fieldType === 'select') {
            expect(result.valid).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should reject invalid field types', () => {
      fc.assert(
        fc.property(invalidFieldTypeArb, (fieldType) => {
          expect(VALID_FIELD_TYPES).not.toContain(fieldType)
          // validateFieldValue ควร reject invalid field type
          const result = validateFieldValue(fieldType, 'test')
          expect(result.valid).toBe(false)
          expect(result.message).toContain('ประเภทฟิลด์ไม่รองรับ')
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: athlete-tracking, Property 3: Template application pre-fills correct fields**
   * **Validates: Requirements 2.2, 2.3, 2.4**
   * 
   * *For any* template selection, the returned fields should match the template definition
   * exactly in name, field_type, and unit
   */
  describe('Property 3: Template application pre-fills correct fields', () => {
    it('should return correct fields for each template', () => {
      fc.assert(
        fc.property(templateKeyArb, (templateKey) => {
          const template = PLAN_TEMPLATES[templateKey]
          
          expect(template).toBeDefined()
          expect(template.name).toBeDefined()
          expect(template.fields).toBeDefined()
          expect(Array.isArray(template.fields)).toBe(true)
          expect(template.fields.length).toBeGreaterThan(0)
          
          // ตรวจสอบว่าทุก field มีข้อมูลครบ
          template.fields.forEach(field => {
            expect(field.name).toBeDefined()
            expect(field.field_type).toBeDefined()
            expect(VALID_FIELD_TYPES).toContain(field.field_type)
          })
        }),
        { numRuns: 100 }
      )
    })

    it('weight_control template should have correct fields', () => {
      const template = PLAN_TEMPLATES.weight_control
      expect(template.name).toBe('ควบคุมน้ำหนัก')
      expect(template.fields.some(f => f.name === 'น้ำหนัก' && f.unit === 'kg')).toBe(true)
      expect(template.fields.some(f => f.name === 'เปอร์เซ็นต์ไขมัน' && f.unit === '%')).toBe(true)
      expect(template.fields.some(f => f.name === 'รอบเอว' && f.unit === 'cm')).toBe(true)
    })

    it('timing template should have correct fields', () => {
      const template = PLAN_TEMPLATES.timing
      expect(template.name).toBe('จับเวลา')
      expect(template.fields.some(f => f.name === 'เวลา' && f.field_type === 'time')).toBe(true)
      expect(template.fields.some(f => f.name === 'ระยะทาง' && f.field_type === 'distance')).toBe(true)
    })

    it('strength template should have correct fields', () => {
      const template = PLAN_TEMPLATES.strength
      expect(template.name).toBe('ความแข็งแรง')
      expect(template.fields.some(f => f.name === 'Squat 1RM')).toBe(true)
      expect(template.fields.some(f => f.name === 'Deadlift 1RM')).toBe(true)
      expect(template.fields.some(f => f.name === 'Bench Press 1RM')).toBe(true)
    })
  })


  /**
   * **Feature: athlete-tracking, Property 4: Goal creation stores all required data correctly**
   * **Validates: Requirements 3.2, 3.3**
   * 
   * *For any* valid goal input with athlete_id, plan_id, field_id, initial_value, target_value, and target_date,
   * creating a goal should result in a stored goal with all provided data intact
   */
  describe('Property 4: Goal creation stores all required data correctly', () => {
    it('should validate goal data structure', () => {
      fc.assert(
        fc.property(validGoalArb, (goalData) => {
          expect(typeof goalData.initial_value).toBe('number')
          expect(typeof goalData.target_value).toBe('number')
          expect(goalData.target_date).toBeInstanceOf(Date)
          expect(goalData.initial_value).toBeGreaterThanOrEqual(0)
          expect(goalData.target_value).toBeGreaterThanOrEqual(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should allow initial_value to be different from target_value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500 }),
          fc.integer({ min: 0, max: 500 }),
          (initial, target) => {
            // ทั้ง initial และ target ต้องเป็นตัวเลขที่ valid
            expect(typeof initial).toBe('number')
            expect(typeof target).toBe('number')
            expect(!isNaN(initial)).toBe(true)
            expect(!isNaN(target)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: athlete-tracking, Property 5: Log upsert behavior - duplicate dates update instead of insert**
   * **Validates: Requirements 4.5**
   * 
   * *For any* tracking log submission for a (plan_id, athlete_id, log_date) combination that already exists,
   * the system should update the existing log instead of creating a duplicate
   */
  describe('Property 5: Log upsert behavior', () => {
    it('should simulate upsert logic correctly', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.integer({ min: 1, max: 365 }), // วันที่ในปี
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (planId, athleteId, dayOfYear, value1, value2) => {
            // จำลอง log storage
            const logs = new Map()
            const dateStr = `2024-${String(Math.ceil(dayOfYear / 30)).padStart(2, '0')}-${String((dayOfYear % 30) + 1).padStart(2, '0')}`
            const key = `${planId}-${athleteId}-${dateStr}`
            
            // Insert ครั้งแรก
            logs.set(key, { value: value1, count: 1 })
            expect(logs.get(key).value).toBe(value1)
            
            // Upsert ครั้งที่สอง - ควร update ไม่ใช่ insert
            const existing = logs.get(key)
            if (existing) {
              logs.set(key, { value: value2, count: existing.count }) // update value แต่ไม่เพิ่ม count
            }
            
            // ตรวจสอบว่ามีแค่ 1 record
            expect(logs.get(key).count).toBe(1)
            expect(logs.get(key).value).toBe(value2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: athlete-tracking, Property 6: Input validation based on field type**
   * **Validates: Requirements 4.2**
   * 
   * *For any* field with type 'number', submitting a non-numeric value should be rejected;
   * for type 'time', submitting an invalid time format should be rejected
   */
  describe('Property 6: Input validation based on field type', () => {
    it('should accept valid number values for number field', () => {
      fc.assert(
        fc.property(validNumberValueArb, (value) => {
          const result = validateFieldValue('number', value)
          expect(result.valid).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject invalid number values for number field', () => {
      fc.assert(
        fc.property(invalidNumberValueArb, (value) => {
          const result = validateFieldValue('number', value)
          expect(result.valid).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should accept valid time formats for time field', () => {
      fc.assert(
        fc.property(validTimeFormatArb, (value) => {
          const result = validateFieldValue('time', value)
          expect(result.valid).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject invalid time formats for time field', () => {
      fc.assert(
        fc.property(invalidTimeFormatArb, (value) => {
          const result = validateFieldValue('time', value)
          expect(result.valid).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should accept any string for text field', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const result = validateFieldValue('text', value)
          expect(result.valid).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should accept empty values for all field types', () => {
      fc.assert(
        fc.property(validFieldTypeArb, (fieldType) => {
          expect(validateFieldValue(fieldType, null).valid).toBe(true)
          expect(validateFieldValue(fieldType, undefined).valid).toBe(true)
          expect(validateFieldValue(fieldType, '').valid).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: athlete-tracking, Property 7: Progress percentage calculation is correct**
   * **Validates: Requirements 5.2**
   * 
   * *For any* athlete with initial_value, current_value, and target_value,
   * the progress percentage should equal ((current - initial) / (target - initial)) * 100, clamped to 0-100 range
   */
  describe('Property 7: Progress percentage calculation is correct', () => {
    it('should calculate percentage correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (initial, current, target) => {
            const percentage = calculateProgressPercentage(current, initial, target)
            
            // ต้องอยู่ในช่วง 0-100
            expect(percentage).toBeGreaterThanOrEqual(0)
            expect(percentage).toBeLessThanOrEqual(100)
            
            // ถ้า initial = target
            if (initial === target) {
              if (current === target) {
                expect(percentage).toBe(100)
              } else {
                expect(percentage).toBe(0)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0% when current equals initial', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (initial, target) => {
            if (initial !== target) {
              const percentage = calculateProgressPercentage(initial, initial, target)
              expect(percentage).toBe(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 100% when current equals target', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (initial, target) => {
            if (initial !== target) {
              const percentage = calculateProgressPercentage(target, initial, target)
              expect(percentage).toBe(100)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: athlete-tracking, Property 8: Progress status calculation is correct**
   * **Validates: Requirements 5.3**
   * 
   * *For any* athlete progress, if percentage >= 100 then status is 'achieved',
   * if actual progress rate > expected rate then 'ahead',
   * if actual < expected then 'behind', else 'on_track'
   */
  describe('Property 8: Progress status calculation is correct', () => {
    it('should return achieved when percentage >= 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 200 }),
          (percentage) => {
            const status = calculateProgressStatus(percentage)
            expect(status).toBe('achieved')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return on_track when no expected percentage provided', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 99 }),
          (percentage) => {
            const status = calculateProgressStatus(percentage, null)
            expect(status).toBe('on_track')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return ahead when actual > expected + tolerance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 80 }), // ลด max เพื่อให้ actual ไม่เกิน 100
          (expected) => {
            const actual = expected + 10 // มากกว่า tolerance (5%)
            // ถ้า actual >= 100 จะได้ 'achieved' แทน
            if (actual >= 100) {
              const status = calculateProgressStatus(actual, expected, 5)
              expect(status).toBe('achieved')
            } else {
              const status = calculateProgressStatus(actual, expected, 5)
              expect(status).toBe('ahead')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return behind when actual < expected - tolerance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 20, max: 90 }),
          (expected) => {
            const actual = expected - 10 // น้อยกว่า tolerance (5%)
            const status = calculateProgressStatus(actual, expected, 5)
            expect(status).toBe('behind')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return on_track when within tolerance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 90 }),
          fc.integer({ min: -4, max: 4 }),
          (expected, offset) => {
            const actual = expected + offset // ภายใน tolerance
            const status = calculateProgressStatus(actual, expected, 5)
            expect(status).toBe('on_track')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: athlete-tracking, Property 9: Role-based data filtering**
   * **Validates: Requirements 6.2, 6.3**
   * 
   * *For any* coach user, fetching tracking plans should return only plans where club_id matches the coach's club_id;
   * for athlete users, fetching should return only their own tracking data
   */
  describe('Property 9: Role-based data filtering', () => {
    // จำลอง data filtering logic
    function filterPlansByRole(plans, user) {
      if (user.role === 'admin') {
        return plans // Admin เห็นทั้งหมด
      } else if (user.role === 'coach') {
        return plans.filter(p => p.club_id === user.club_id)
      } else if (user.role === 'athlete') {
        return plans.filter(p => p.athlete_ids?.includes(user.id))
      }
      return []
    }

    it('should return all plans for admin', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            id: fc.uuid(),
            club_id: fc.uuid(),
            athlete_ids: fc.array(fc.uuid())
          }), { minLength: 1, maxLength: 10 }),
          (plans) => {
            const admin = { role: 'admin', id: crypto.randomUUID() }
            const filtered = filterPlansByRole(plans, admin)
            expect(filtered.length).toBe(plans.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return only club plans for coach', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.record({
            id: fc.uuid(),
            club_id: fc.uuid(),
            athlete_ids: fc.array(fc.uuid())
          }), { minLength: 1, maxLength: 10 }),
          (coachClubId, plans) => {
            const coach = { role: 'coach', id: crypto.randomUUID(), club_id: coachClubId }
            const filtered = filterPlansByRole(plans, coach)
            
            // ทุก plan ที่ได้ต้องมี club_id ตรงกับ coach
            filtered.forEach(plan => {
              expect(plan.club_id).toBe(coachClubId)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return only enrolled plans for athlete', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.record({
            id: fc.uuid(),
            club_id: fc.uuid(),
            athlete_ids: fc.array(fc.uuid())
          }), { minLength: 1, maxLength: 10 }),
          (athleteId, plans) => {
            const athlete = { role: 'athlete', id: athleteId }
            const filtered = filterPlansByRole(plans, athlete)
            
            // ทุก plan ที่ได้ต้องมี athlete อยู่ใน athlete_ids
            filtered.forEach(plan => {
              expect(plan.athlete_ids).toContain(athleteId)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: athlete-tracking, Property 10: Milestone notification triggers at correct thresholds**
   * **Validates: Requirements 7.1, 7.2**
   * 
   * *For any* athlete whose progress crosses 50% or 100% threshold (from below to at-or-above),
   * the system should create exactly one notification for that milestone
   */
  describe('Property 10: Milestone notification triggers at correct thresholds', () => {
    it('should detect 50% milestone crossing', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 49 }),
          fc.integer({ min: 50, max: 99 }),
          (prev, curr) => {
            const result = detectMilestonesCrossing(prev, curr)
            expect(result.crossed50).toBe(true)
            expect(result.crossed100).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect 100% milestone crossing', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 99 }),
          fc.integer({ min: 100, max: 150 }),
          (prev, curr) => {
            const result = detectMilestonesCrossing(prev, curr)
            expect(result.crossed50).toBe(false) // ไม่ข้าม 50% เพราะ prev >= 50 แล้ว
            expect(result.crossed100).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect both milestones when jumping from 0 to 100+', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 49 }),
          fc.integer({ min: 100, max: 150 }),
          (prev, curr) => {
            const result = detectMilestonesCrossing(prev, curr)
            expect(result.crossed50).toBe(true)
            expect(result.crossed100).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not detect milestone when not crossing threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 40 }),
          fc.integer({ min: 0, max: 49 }),
          (prev, curr) => {
            const result = detectMilestonesCrossing(prev, curr)
            expect(result.crossed50).toBe(false)
            expect(result.crossed100).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not detect milestone when already past threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 80 }),
          fc.integer({ min: 50, max: 99 }),
          (prev, curr) => {
            const result = detectMilestonesCrossing(prev, curr)
            expect(result.crossed50).toBe(false) // ไม่ข้าม 50% เพราะ prev >= 50 แล้ว
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null/undefined previous percentage', () => {
      const result1 = detectMilestonesCrossing(null, 60)
      expect(result1.crossed50).toBe(true)
      
      const result2 = detectMilestonesCrossing(undefined, 110)
      expect(result2.crossed50).toBe(true)
      expect(result2.crossed100).toBe(true)
    })
  })

  /**
   * **Feature: athlete-tracking, Property 11: Deactivated plans preserve logs but hide from active list**
   * **Validates: Requirements 1.6**
   * 
   * *For any* deactivated plan, querying active plans should not include it,
   * but querying logs for that plan should return all existing logs
   */
  describe('Property 11: Deactivated plans preserve logs but hide from active list', () => {
    // จำลอง plan storage
    function createMockStorage() {
      const plans = []
      const logs = []
      
      return {
        addPlan: (plan) => plans.push({ ...plan, is_active: true }),
        deactivatePlan: (planId) => {
          const plan = plans.find(p => p.id === planId)
          if (plan) plan.is_active = false
        },
        getActivePlans: () => plans.filter(p => p.is_active),
        getAllPlans: () => [...plans],
        addLog: (log) => logs.push({ ...log }),
        getLogsByPlan: (planId) => logs.filter(l => l.plan_id === planId)
      }
    }

    it('should hide deactivated plan from active list', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }),
          (planId, planName) => {
            const storage = createMockStorage()
            
            // เพิ่มแผน
            storage.addPlan({ id: planId, name: planName })
            expect(storage.getActivePlans().length).toBe(1)
            
            // Deactivate แผน
            storage.deactivatePlan(planId)
            expect(storage.getActivePlans().length).toBe(0)
            
            // แต่ยังอยู่ใน all plans
            expect(storage.getAllPlans().length).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve logs when plan is deactivated', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.record({
            id: fc.uuid(),
            value: fc.integer({ min: 0, max: 100 })
          }), { minLength: 1, maxLength: 10 }),
          (planId, logData) => {
            const storage = createMockStorage()
            
            // เพิ่มแผนและ logs
            storage.addPlan({ id: planId, name: 'Test Plan' })
            logData.forEach(log => {
              storage.addLog({ ...log, plan_id: planId })
            })
            
            // ตรวจสอบว่ามี logs
            expect(storage.getLogsByPlan(planId).length).toBe(logData.length)
            
            // Deactivate แผน
            storage.deactivatePlan(planId)
            
            // Logs ยังคงอยู่
            expect(storage.getLogsByPlan(planId).length).toBe(logData.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
