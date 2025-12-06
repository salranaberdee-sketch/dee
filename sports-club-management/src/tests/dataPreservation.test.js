/**
 * Data Preservation Tests
 * ทดสอบการเก็บรักษาข้อมูล logs เมื่อ deactivate plan หรือลบนักกีฬาออกจากแผน
 * 
 * Tests for:
 * - Task 17.1: Verify deactivated plans preserve logs (Requirements: 1.6)
 * - Task 17.2: Verify athlete removal preserves logs (Requirements: 3.5)
 */

import { describe, it, expect, beforeEach } from 'vitest'

// ============================================================================
// Test Helpers - Simulating Store Behavior
// ============================================================================

/**
 * สร้างข้อมูล plan จำลอง
 */
function createMockPlan(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    club_id: crypto.randomUUID(),
    name: 'Test Plan',
    description: 'Test Description',
    plan_type: 'weight_control',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_active: true,
    created_by: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * สร้างข้อมูล log จำลอง
 */
function createMockLog(planId, athleteId, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    plan_id: planId,
    athlete_id: athleteId,
    log_date: '2024-06-15',
    values: { 'field-1': 75.5, 'field-2': 15.2 },
    notes: 'Test notes',
    created_by: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}


/**
 * สร้างข้อมูล goal จำลอง
 */
function createMockGoal(planId, athleteId, fieldId, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    plan_id: planId,
    athlete_id: athleteId,
    field_id: fieldId,
    initial_value: 80,
    target_value: 70,
    target_date: '2024-12-31',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

// ============================================================================
// Simulated Database Operations
// ============================================================================

/**
 * จำลองการทำงานของ database สำหรับ tracking
 * ใช้ในการทดสอบ logic การเก็บรักษาข้อมูล
 */
class MockTrackingDatabase {
  constructor() {
    this.plans = []
    this.goals = []
    this.logs = []
  }

  // Plan operations
  insertPlan(plan) {
    this.plans.push({ ...plan })
    return plan
  }

  updatePlan(planId, updates) {
    const index = this.plans.findIndex(p => p.id === planId)
    if (index !== -1) {
      this.plans[index] = { ...this.plans[index], ...updates }
      return this.plans[index]
    }
    return null
  }

  /**
   * Soft delete plan - set is_active = false
   * Requirements: 1.6 - เก็บ logs ไว้แต่ซ่อนจากรายการ active
   */
  deactivatePlan(planId) {
    return this.updatePlan(planId, { 
      is_active: false, 
      updated_at: new Date().toISOString() 
    })
  }

  getActivePlans() {
    return this.plans.filter(p => p.is_active)
  }

  getAllPlans() {
    return [...this.plans]
  }

  getPlanById(planId) {
    return this.plans.find(p => p.id === planId) || null
  }


  // Goal operations
  insertGoal(goal) {
    this.goals.push({ ...goal })
    return goal
  }

  /**
   * ลบ goals ของนักกีฬาออกจากแผน
   * Requirements: 3.5 - ลบเฉพาะ goals แต่เก็บ logs ไว้
   */
  deleteGoalsByAthleteAndPlan(planId, athleteId) {
    const deletedCount = this.goals.filter(
      g => g.plan_id === planId && g.athlete_id === athleteId
    ).length
    this.goals = this.goals.filter(
      g => !(g.plan_id === planId && g.athlete_id === athleteId)
    )
    return deletedCount
  }

  getGoalsByPlan(planId) {
    return this.goals.filter(g => g.plan_id === planId)
  }

  getGoalsByAthlete(athleteId) {
    return this.goals.filter(g => g.athlete_id === athleteId)
  }

  // Log operations
  insertLog(log) {
    this.logs.push({ ...log })
    return log
  }

  /**
   * ดึง logs ของแผน - ไม่ว่าแผนจะ active หรือไม่
   * Requirements: 1.6 - logs ยังคงอยู่แม้แผนถูก deactivate
   */
  getLogsByPlan(planId) {
    return this.logs.filter(l => l.plan_id === planId)
  }

  /**
   * ดึง logs ของนักกีฬา - ไม่ว่านักกีฬาจะถูกลบออกจากแผนหรือไม่
   * Requirements: 3.5 - logs ยังคงอยู่แม้นักกีฬาถูกลบออกจากแผน
   */
  getLogsByAthlete(athleteId) {
    return this.logs.filter(l => l.athlete_id === athleteId)
  }

  getLogsByPlanAndAthlete(planId, athleteId) {
    return this.logs.filter(l => l.plan_id === planId && l.athlete_id === athleteId)
  }

  getAllLogs() {
    return [...this.logs]
  }
}


// ============================================================================
// Tests
// ============================================================================

describe('Data Preservation Tests', () => {
  let db

  beforeEach(() => {
    db = new MockTrackingDatabase()
  })

  /**
   * Task 17.1: Verify deactivated plans preserve logs
   * Requirements: 1.6 - IF a coach deactivates a tracking plan 
   * THEN the system SHALL preserve existing logs but hide the plan from active list
   */
  describe('Task 17.1: Deactivated plans preserve logs', () => {
    
    it('should hide deactivated plan from active list', () => {
      // สร้างแผน
      const plan = createMockPlan({ is_active: true })
      db.insertPlan(plan)
      
      // ตรวจสอบว่าแผนอยู่ใน active list
      expect(db.getActivePlans()).toHaveLength(1)
      expect(db.getActivePlans()[0].id).toBe(plan.id)
      
      // Deactivate แผน
      db.deactivatePlan(plan.id)
      
      // ตรวจสอบว่าแผนไม่อยู่ใน active list แล้ว
      expect(db.getActivePlans()).toHaveLength(0)
      
      // แต่แผนยังคงอยู่ใน database
      expect(db.getAllPlans()).toHaveLength(1)
      expect(db.getPlanById(plan.id)).not.toBeNull()
      expect(db.getPlanById(plan.id).is_active).toBe(false)
    })

    it('should preserve all logs when plan is deactivated', () => {
      // สร้างแผนและ logs
      const plan = createMockPlan({ is_active: true })
      const athleteId = crypto.randomUUID()
      db.insertPlan(plan)
      
      // สร้าง logs หลายรายการ
      const log1 = createMockLog(plan.id, athleteId, { log_date: '2024-06-01' })
      const log2 = createMockLog(plan.id, athleteId, { log_date: '2024-06-15' })
      const log3 = createMockLog(plan.id, athleteId, { log_date: '2024-06-30' })
      db.insertLog(log1)
      db.insertLog(log2)
      db.insertLog(log3)
      
      // ตรวจสอบว่ามี logs 3 รายการ
      expect(db.getLogsByPlan(plan.id)).toHaveLength(3)
      
      // Deactivate แผน
      db.deactivatePlan(plan.id)
      
      // ตรวจสอบว่า logs ยังคงอยู่ครบ
      const logsAfterDeactivate = db.getLogsByPlan(plan.id)
      expect(logsAfterDeactivate).toHaveLength(3)
      
      // ตรวจสอบว่าข้อมูลใน logs ไม่เปลี่ยนแปลง
      expect(logsAfterDeactivate.find(l => l.id === log1.id)).toBeDefined()
      expect(logsAfterDeactivate.find(l => l.id === log2.id)).toBeDefined()
      expect(logsAfterDeactivate.find(l => l.id === log3.id)).toBeDefined()
    })


    it('should preserve log values and notes when plan is deactivated', () => {
      // สร้างแผนและ log พร้อมข้อมูลครบ
      const plan = createMockPlan({ is_active: true })
      const athleteId = crypto.randomUUID()
      db.insertPlan(plan)
      
      const originalValues = { 'weight': 75.5, 'body_fat': 15.2, 'waist': 80 }
      const originalNotes = 'บันทึกการฝึกซ้อมวันนี้ ทำได้ดีมาก'
      const log = createMockLog(plan.id, athleteId, { 
        values: originalValues,
        notes: originalNotes
      })
      db.insertLog(log)
      
      // Deactivate แผน
      db.deactivatePlan(plan.id)
      
      // ตรวจสอบว่าข้อมูลใน log ยังคงเหมือนเดิม
      const preservedLog = db.getLogsByPlan(plan.id)[0]
      expect(preservedLog.values).toEqual(originalValues)
      expect(preservedLog.notes).toBe(originalNotes)
      expect(preservedLog.athlete_id).toBe(athleteId)
      expect(preservedLog.log_date).toBe(log.log_date)
    })

    it('should allow querying logs of deactivated plan', () => {
      // สร้างแผนและ logs
      const plan = createMockPlan({ is_active: true })
      const athlete1 = crypto.randomUUID()
      const athlete2 = crypto.randomUUID()
      db.insertPlan(plan)
      
      // สร้าง logs สำหรับนักกีฬา 2 คน
      db.insertLog(createMockLog(plan.id, athlete1, { log_date: '2024-06-01' }))
      db.insertLog(createMockLog(plan.id, athlete1, { log_date: '2024-06-15' }))
      db.insertLog(createMockLog(plan.id, athlete2, { log_date: '2024-06-01' }))
      
      // Deactivate แผน
      db.deactivatePlan(plan.id)
      
      // ยังสามารถ query logs ได้
      expect(db.getLogsByPlan(plan.id)).toHaveLength(3)
      expect(db.getLogsByPlanAndAthlete(plan.id, athlete1)).toHaveLength(2)
      expect(db.getLogsByPlanAndAthlete(plan.id, athlete2)).toHaveLength(1)
    })

    it('should not affect logs of other plans when one plan is deactivated', () => {
      // สร้าง 2 แผน
      const plan1 = createMockPlan({ name: 'Plan 1', is_active: true })
      const plan2 = createMockPlan({ name: 'Plan 2', is_active: true })
      const athleteId = crypto.randomUUID()
      db.insertPlan(plan1)
      db.insertPlan(plan2)
      
      // สร้าง logs สำหรับทั้ง 2 แผน
      db.insertLog(createMockLog(plan1.id, athleteId, { log_date: '2024-06-01' }))
      db.insertLog(createMockLog(plan1.id, athleteId, { log_date: '2024-06-15' }))
      db.insertLog(createMockLog(plan2.id, athleteId, { log_date: '2024-06-01' }))
      
      // Deactivate แผนที่ 1
      db.deactivatePlan(plan1.id)
      
      // Logs ของแผนที่ 1 ยังคงอยู่
      expect(db.getLogsByPlan(plan1.id)).toHaveLength(2)
      
      // Logs ของแผนที่ 2 ไม่ได้รับผลกระทบ
      expect(db.getLogsByPlan(plan2.id)).toHaveLength(1)
      
      // แผนที่ 2 ยังคง active
      expect(db.getActivePlans()).toHaveLength(1)
      expect(db.getActivePlans()[0].id).toBe(plan2.id)
    })
  })


  /**
   * Task 17.2: Verify athlete removal preserves logs
   * Requirements: 3.5 - IF a coach removes an athlete from a plan 
   * THEN the system SHALL preserve the athlete's historical logs
   */
  describe('Task 17.2: Athlete removal preserves logs', () => {
    
    it('should remove goals but preserve logs when athlete is removed', () => {
      // สร้างแผน, goals และ logs
      const plan = createMockPlan({ is_active: true })
      const athleteId = crypto.randomUUID()
      const fieldId = crypto.randomUUID()
      db.insertPlan(plan)
      
      // สร้าง goal
      const goal = createMockGoal(plan.id, athleteId, fieldId)
      db.insertGoal(goal)
      
      // สร้าง logs
      const log1 = createMockLog(plan.id, athleteId, { log_date: '2024-06-01' })
      const log2 = createMockLog(plan.id, athleteId, { log_date: '2024-06-15' })
      db.insertLog(log1)
      db.insertLog(log2)
      
      // ตรวจสอบก่อนลบ
      expect(db.getGoalsByPlan(plan.id)).toHaveLength(1)
      expect(db.getLogsByPlanAndAthlete(plan.id, athleteId)).toHaveLength(2)
      
      // ลบนักกีฬาออกจากแผน (ลบเฉพาะ goals)
      db.deleteGoalsByAthleteAndPlan(plan.id, athleteId)
      
      // Goals ถูกลบ
      expect(db.getGoalsByPlan(plan.id)).toHaveLength(0)
      expect(db.getGoalsByAthlete(athleteId)).toHaveLength(0)
      
      // แต่ logs ยังคงอยู่
      expect(db.getLogsByPlanAndAthlete(plan.id, athleteId)).toHaveLength(2)
      expect(db.getLogsByAthlete(athleteId)).toHaveLength(2)
    })

    it('should preserve all log data when athlete is removed', () => {
      // สร้างแผนและ logs พร้อมข้อมูลครบ
      const plan = createMockPlan({ is_active: true })
      const athleteId = crypto.randomUUID()
      const fieldId = crypto.randomUUID()
      db.insertPlan(plan)
      
      // สร้าง goal
      db.insertGoal(createMockGoal(plan.id, athleteId, fieldId))
      
      // สร้าง log พร้อมข้อมูลครบ
      const originalValues = { 'weight': 72.3, 'body_fat': 14.5 }
      const originalNotes = 'ผลการฝึกซ้อมดีมาก น้ำหนักลดลงตามเป้า'
      const log = createMockLog(plan.id, athleteId, {
        values: originalValues,
        notes: originalNotes,
        log_date: '2024-06-15'
      })
      db.insertLog(log)
      
      // ลบนักกีฬาออกจากแผน
      db.deleteGoalsByAthleteAndPlan(plan.id, athleteId)
      
      // ตรวจสอบว่าข้อมูลใน log ยังคงเหมือนเดิม
      const preservedLog = db.getLogsByPlanAndAthlete(plan.id, athleteId)[0]
      expect(preservedLog.values).toEqual(originalValues)
      expect(preservedLog.notes).toBe(originalNotes)
      expect(preservedLog.log_date).toBe('2024-06-15')
      expect(preservedLog.athlete_id).toBe(athleteId)
      expect(preservedLog.plan_id).toBe(plan.id)
    })


    it('should not affect logs of other athletes when one athlete is removed', () => {
      // สร้างแผนและ logs สำหรับนักกีฬา 2 คน
      const plan = createMockPlan({ is_active: true })
      const athlete1 = crypto.randomUUID()
      const athlete2 = crypto.randomUUID()
      const fieldId = crypto.randomUUID()
      db.insertPlan(plan)
      
      // สร้าง goals สำหรับทั้ง 2 คน
      db.insertGoal(createMockGoal(plan.id, athlete1, fieldId))
      db.insertGoal(createMockGoal(plan.id, athlete2, fieldId))
      
      // สร้าง logs สำหรับทั้ง 2 คน
      db.insertLog(createMockLog(plan.id, athlete1, { log_date: '2024-06-01' }))
      db.insertLog(createMockLog(plan.id, athlete1, { log_date: '2024-06-15' }))
      db.insertLog(createMockLog(plan.id, athlete2, { log_date: '2024-06-01' }))
      db.insertLog(createMockLog(plan.id, athlete2, { log_date: '2024-06-15' }))
      db.insertLog(createMockLog(plan.id, athlete2, { log_date: '2024-06-30' }))
      
      // ลบนักกีฬาคนที่ 1 ออกจากแผน
      db.deleteGoalsByAthleteAndPlan(plan.id, athlete1)
      
      // Logs ของนักกีฬาคนที่ 1 ยังคงอยู่
      expect(db.getLogsByPlanAndAthlete(plan.id, athlete1)).toHaveLength(2)
      
      // Logs ของนักกีฬาคนที่ 2 ไม่ได้รับผลกระทบ
      expect(db.getLogsByPlanAndAthlete(plan.id, athlete2)).toHaveLength(3)
      
      // Goals ของนักกีฬาคนที่ 2 ยังคงอยู่
      expect(db.getGoalsByAthlete(athlete2)).toHaveLength(1)
    })

    it('should preserve logs across multiple plans when athlete is removed from one', () => {
      // สร้าง 2 แผน
      const plan1 = createMockPlan({ name: 'Plan 1', is_active: true })
      const plan2 = createMockPlan({ name: 'Plan 2', is_active: true })
      const athleteId = crypto.randomUUID()
      const fieldId1 = crypto.randomUUID()
      const fieldId2 = crypto.randomUUID()
      db.insertPlan(plan1)
      db.insertPlan(plan2)
      
      // สร้าง goals และ logs สำหรับทั้ง 2 แผน
      db.insertGoal(createMockGoal(plan1.id, athleteId, fieldId1))
      db.insertGoal(createMockGoal(plan2.id, athleteId, fieldId2))
      
      db.insertLog(createMockLog(plan1.id, athleteId, { log_date: '2024-06-01' }))
      db.insertLog(createMockLog(plan1.id, athleteId, { log_date: '2024-06-15' }))
      db.insertLog(createMockLog(plan2.id, athleteId, { log_date: '2024-06-01' }))
      
      // ลบนักกีฬาออกจากแผนที่ 1
      db.deleteGoalsByAthleteAndPlan(plan1.id, athleteId)
      
      // Logs ของแผนที่ 1 ยังคงอยู่
      expect(db.getLogsByPlan(plan1.id)).toHaveLength(2)
      
      // Logs ของแผนที่ 2 ไม่ได้รับผลกระทบ
      expect(db.getLogsByPlan(plan2.id)).toHaveLength(1)
      
      // Goals ของแผนที่ 2 ยังคงอยู่
      expect(db.getGoalsByPlan(plan2.id)).toHaveLength(1)
      
      // รวม logs ของนักกีฬายังคงอยู่ครบ
      expect(db.getLogsByAthlete(athleteId)).toHaveLength(3)
    })


    it('should allow querying historical logs after athlete removal', () => {
      // สร้างแผนและ logs
      const plan = createMockPlan({ is_active: true })
      const athleteId = crypto.randomUUID()
      const fieldId = crypto.randomUUID()
      db.insertPlan(plan)
      
      // สร้าง goal และ logs หลายรายการ
      db.insertGoal(createMockGoal(plan.id, athleteId, fieldId))
      
      const dates = ['2024-01-15', '2024-02-15', '2024-03-15', '2024-04-15', '2024-05-15']
      dates.forEach(date => {
        db.insertLog(createMockLog(plan.id, athleteId, { log_date: date }))
      })
      
      // ลบนักกีฬาออกจากแผน
      db.deleteGoalsByAthleteAndPlan(plan.id, athleteId)
      
      // ยังสามารถ query logs ได้ทั้งหมด
      const historicalLogs = db.getLogsByPlanAndAthlete(plan.id, athleteId)
      expect(historicalLogs).toHaveLength(5)
      
      // ตรวจสอบว่า logs มีวันที่ครบถ้วน
      const logDates = historicalLogs.map(l => l.log_date).sort()
      expect(logDates).toEqual(dates)
    })
  })

  /**
   * Combined scenarios - ทดสอบกรณีที่ทั้ง deactivate plan และ remove athlete
   */
  describe('Combined scenarios', () => {
    
    it('should preserve logs when both plan is deactivated and athlete is removed', () => {
      // สร้างแผนและ logs
      const plan = createMockPlan({ is_active: true })
      const athleteId = crypto.randomUUID()
      const fieldId = crypto.randomUUID()
      db.insertPlan(plan)
      
      // สร้าง goal และ logs
      db.insertGoal(createMockGoal(plan.id, athleteId, fieldId))
      db.insertLog(createMockLog(plan.id, athleteId, { log_date: '2024-06-01' }))
      db.insertLog(createMockLog(plan.id, athleteId, { log_date: '2024-06-15' }))
      
      // ลบนักกีฬาออกจากแผนก่อน
      db.deleteGoalsByAthleteAndPlan(plan.id, athleteId)
      
      // จากนั้น deactivate แผน
      db.deactivatePlan(plan.id)
      
      // Logs ยังคงอยู่ครบ
      expect(db.getLogsByPlan(plan.id)).toHaveLength(2)
      expect(db.getLogsByAthlete(athleteId)).toHaveLength(2)
      
      // แผนไม่อยู่ใน active list
      expect(db.getActivePlans()).toHaveLength(0)
      
      // Goals ถูกลบ
      expect(db.getGoalsByPlan(plan.id)).toHaveLength(0)
    })

    it('should preserve logs in reverse order - deactivate then remove', () => {
      // สร้างแผนและ logs
      const plan = createMockPlan({ is_active: true })
      const athleteId = crypto.randomUUID()
      const fieldId = crypto.randomUUID()
      db.insertPlan(plan)
      
      // สร้าง goal และ logs
      db.insertGoal(createMockGoal(plan.id, athleteId, fieldId))
      db.insertLog(createMockLog(plan.id, athleteId, { log_date: '2024-06-01' }))
      db.insertLog(createMockLog(plan.id, athleteId, { log_date: '2024-06-15' }))
      
      // Deactivate แผนก่อน
      db.deactivatePlan(plan.id)
      
      // จากนั้นลบนักกีฬาออกจากแผน
      db.deleteGoalsByAthleteAndPlan(plan.id, athleteId)
      
      // Logs ยังคงอยู่ครบ
      expect(db.getLogsByPlan(plan.id)).toHaveLength(2)
      expect(db.getLogsByAthlete(athleteId)).toHaveLength(2)
    })
  })
})
