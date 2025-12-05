/**
 * Training Timer Edge Cases Tests
 * 
 * Tests edge cases and error scenarios for the timer modal
 * Requirements: 2.5, 2.3, 6.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TimerModal from '../components/TimerModal.vue'

// ============================================================================
// Test Data Fixtures
// ============================================================================

const mockActivityCategories = [
  { id: 'cat-1', name: 'วิ่ง', icon: '🏃' },
  { id: 'cat-2', name: 'ว่ายน้ำ', icon: '🏊' },
  { id: 'cat-3', name: 'อื่นๆ', icon: '📝' }
]

const mockAthletes = [
  { id: 'athlete-1', name: 'นักกีฬา 1', club_id: 'club-123' },
  { id: 'athlete-2', name: 'นักกีฬา 2', club_id: 'club-123' }
]

// ============================================================================
// Edge Case Tests: Cancel Scenarios (Task 10.1)
// ============================================================================

describe('Timer Edge Cases - Cancel Scenarios', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * Test: Cancel ระหว่างเลือกหมวดหมู่
   * Requirements: 2.5
   */
  it('should handle cancel during category selection', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // อยู่ใน step select-category
    expect(wrapper.vm.step).toBe('select-category')

    // เลือกหมวดหมู่
    await wrapper.findAll('.category-btn')[0].trigger('click')
    expect(wrapper.vm.selectedCategory).toBe('cat-1')

    // กด cancel
    const cancelButton = wrapper.find('.modal-close')
    await cancelButton.trigger('click')

    // ตรวจสอบว่า emit close event
    expect(wrapper.emitted('close')).toBeTruthy()

    // ตรวจสอบว่า state ถูก reset
    expect(wrapper.vm.step).toBe('select-category')
    expect(wrapper.vm.selectedCategory).toBeNull()
    expect(wrapper.vm.elapsedSeconds).toBe(0)
    expect(wrapper.vm.isRunning).toBe(false)
    expect(wrapper.vm.isPaused).toBe(false)
  })

  /**
   * Test: Cancel ระหว่างจับเวลา
   * Requirements: 2.5
   */
  it('should handle cancel during active timer', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่และเริ่มจับเวลา
    await wrapper.findAll('.category-btn')[0].trigger('click')
    await wrapper.find('.btn-primary').trigger('click')

    expect(wrapper.vm.step).toBe('timer')
    expect(wrapper.vm.isRunning).toBe(true)

    // ให้เวลาผ่านไป
    await vi.advanceTimersByTime(45000) // 45 วินาที
    expect(wrapper.vm.elapsedSeconds).toBe(45)

    // กด cancel
    const cancelButton = wrapper.find('.btn-danger')
    await cancelButton.trigger('click')

    // ตรวจสอบว่า emit close event
    expect(wrapper.emitted('close')).toBeTruthy()

    // ตรวจสอบว่า state ถูก reset
    expect(wrapper.vm.step).toBe('select-category')
    expect(wrapper.vm.selectedCategory).toBeNull()
    expect(wrapper.vm.elapsedSeconds).toBe(0)
    expect(wrapper.vm.isRunning).toBe(false)
    expect(wrapper.vm.isPaused).toBe(false)
  })

  /**
   * Test: Cancel ระหว่าง pause
   * Requirements: 2.5
   */
  it('should handle cancel during paused timer', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่และเริ่มจับเวลา
    await wrapper.findAll('.category-btn')[0].trigger('click')
    await wrapper.find('.btn-primary').trigger('click')

    // ให้เวลาผ่านไปและ pause
    await vi.advanceTimersByTime(30000) // 30 วินาที
    await wrapper.find('.btn-secondary').trigger('click')

    expect(wrapper.vm.isPaused).toBe(true)
    expect(wrapper.vm.elapsedSeconds).toBe(30)

    // กด cancel
    const cancelButton = wrapper.find('.btn-danger')
    await cancelButton.trigger('click')

    // ตรวจสอบว่า emit close event
    expect(wrapper.emitted('close')).toBeTruthy()

    // ตรวจสอบว่า state ถูก reset
    expect(wrapper.vm.step).toBe('select-category')
    expect(wrapper.vm.selectedCategory).toBeNull()
    expect(wrapper.vm.elapsedSeconds).toBe(0)
    expect(wrapper.vm.isRunning).toBe(false)
    expect(wrapper.vm.isPaused).toBe(false)
  })

  /**
   * Test: Cancel ในฟอร์มบันทึก
   * Requirements: 2.5
   */
  it('should handle cancel in save form', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่ เริ่มจับเวลา และหยุด
    await wrapper.findAll('.category-btn')[0].trigger('click')
    await wrapper.find('.btn-primary').trigger('click')
    await vi.advanceTimersByTime(60000) // 1 นาที
    await wrapper.find('.btn-primary').trigger('click')

    expect(wrapper.vm.step).toBe('save')
    expect(wrapper.vm.durationInMinutes).toBe(1)

    // กรอกข้อมูลบางส่วน
    const activitiesInput = wrapper.find('input[placeholder="เช่น วิ่ง 5 กม."]')
    await activitiesInput.setValue('วิ่ง 5 กม.')

    const notesTextarea = wrapper.find('textarea')
    await notesTextarea.setValue('รู้สึกดี')

    // กด cancel
    const cancelButton = wrapper.find('.btn-secondary')
    await cancelButton.trigger('click')

    // ตรวจสอบว่า emit close event
    expect(wrapper.emitted('close')).toBeTruthy()

    // ตรวจสอบว่า state ถูก reset (รวมถึงฟอร์ม)
    expect(wrapper.vm.step).toBe('select-category')
    expect(wrapper.vm.selectedCategory).toBeNull()
    expect(wrapper.vm.elapsedSeconds).toBe(0)
    expect(wrapper.vm.saveForm.activities).toBe('')
    expect(wrapper.vm.saveForm.notes).toBe('')
  })

  /**
   * Test: ตรวจสอบว่า interval ถูก cleanup เมื่อ cancel
   * Requirements: 2.5
   */
  it('should cleanup timer interval when cancelled', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่และเริ่มจับเวลา
    await wrapper.findAll('.category-btn')[0].trigger('click')
    await wrapper.find('.btn-primary').trigger('click')

    expect(wrapper.vm.isRunning).toBe(true)
    const elapsedBeforeCancel = wrapper.vm.elapsedSeconds

    // กด cancel
    await wrapper.find('.btn-danger').trigger('click')

    // ตรวจสอบว่า state ถูก reset
    expect(wrapper.vm.isRunning).toBe(false)
    expect(wrapper.vm.elapsedSeconds).toBe(0)

    // ตรวจสอบว่าเวลาไม่เพิ่มขึ้นอีกหลัง cancel
    await vi.advanceTimersByTime(10000)
    expect(wrapper.vm.elapsedSeconds).toBe(0)
  })

  /**
   * Test: Cancel หลายครั้งติดกันไม่ทำให้เกิด error
   * Requirements: 2.5
   */
  it('should handle multiple cancel clicks without errors', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่และเริ่มจับเวลา
    await wrapper.findAll('.category-btn')[0].trigger('click')
    await wrapper.find('.btn-primary').trigger('click')
    await vi.advanceTimersByTime(10000)

    const cancelButton = wrapper.find('.btn-danger')

    // กด cancel หลายครั้ง
    await cancelButton.trigger('click')
    await cancelButton.trigger('click')
    await cancelButton.trigger('click')

    // ควร emit close event หลายครั้ง
    expect(wrapper.emitted('close').length).toBeGreaterThanOrEqual(1)

    // state ควรถูก reset
    expect(wrapper.vm.step).toBe('select-category')
    expect(wrapper.vm.elapsedSeconds).toBe(0)
  })
})

// ============================================================================
// Edge Case Tests: Validation Errors (Task 10.2)
// ============================================================================

describe('Timer Edge Cases - Validation Errors', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * Test: ไม่เลือกหมวดหมู่ → ปุ่มเริ่มจับเวลา disabled
   * Requirements: 2.3
   */
  it('should disable start button when no category selected', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // ไม่เลือกหมวดหมู่
    expect(wrapper.vm.selectedCategory).toBeNull()
    expect(wrapper.vm.canStartTimer).toBeFalsy()

    // ปุ่มเริ่มจับเวลาควร disabled
    const startButton = wrapper.find('.btn-primary')
    expect(startButton.attributes('disabled')).toBeDefined()

    // พยายามเริ่มจับเวลา (ไม่ควรทำงาน)
    wrapper.vm.startTimer()
    expect(wrapper.vm.isRunning).toBe(false)
    expect(wrapper.vm.step).toBe('select-category')
  })

  /**
   * Test: เลือกหมวดหมู่แล้ว → ปุ่มเริ่มจับเวลา enabled
   * Requirements: 2.3
   */
  it('should enable start button when category is selected', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่
    await wrapper.findAll('.category-btn')[0].trigger('click')
    expect(wrapper.vm.selectedCategory).toBe('cat-1')
    expect(wrapper.vm.canStartTimer).toBeTruthy()

    // ปุ่มเริ่มจับเวลาไม่ควร disabled
    const startButton = wrapper.find('.btn-primary')
    expect(startButton.attributes('disabled')).toBeUndefined()
  })

  /**
   * Test: ไม่กรอกกิจกรรม → แสดง error
   * Requirements: 2.3
   */
  it('should show error when activities field is empty', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่ เริ่มจับเวลา และหยุด
    await wrapper.findAll('.category-btn')[0].trigger('click')
    await wrapper.find('.btn-primary').trigger('click')
    await vi.advanceTimersByTime(60000)
    await wrapper.find('.btn-primary').trigger('click')

    expect(wrapper.vm.step).toBe('save')

    // ไม่กรอกกิจกรรม (เว้นว่าง)
    wrapper.vm.saveForm.activities = ''

    // พยายามบันทึก
    wrapper.vm.handleSave()
    await wrapper.vm.$nextTick()

    // ควรแสดง error
    expect(alertSpy).toHaveBeenCalledWith('กรุณากรอกกิจกรรมที่ฝึก')
    expect(wrapper.emitted('save')).toBeFalsy()

    alertSpy.mockRestore()
  })

  /**
   * Test: กรอกกิจกรรมแต่เป็น whitespace → แสดง error
   * Requirements: 2.3
   */
  it('should show error when activities field contains only whitespace', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่ เริ่มจับเวลา และหยุด
    await wrapper.findAll('.category-btn')[0].trigger('click')
    await wrapper.find('.btn-primary').trigger('click')
    await vi.advanceTimersByTime(60000)
    await wrapper.find('.btn-primary').trigger('click')

    // กรอกแต่ whitespace
    wrapper.vm.saveForm.activities = '   '

    // พยายามบันทึก
    wrapper.vm.handleSave()
    await wrapper.vm.$nextTick()

    // ควรแสดง error
    expect(alertSpy).toHaveBeenCalledWith('กรุณากรอกกิจกรรมที่ฝึก')
    expect(wrapper.emitted('save')).toBeFalsy()

    alertSpy.mockRestore()
  })

  /**
   * Test: Coach ไม่เลือกนักกีฬา → ปุ่มเริ่มจับเวลา disabled
   * Requirements: 6.1
   */
  it('should disable start button for Coach when no athlete selected', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: true,
        isAdmin: false,
        athletes: mockAthletes,
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่แต่ไม่เลือกนักกีฬา
    await wrapper.findAll('.category-btn')[0].trigger('click')
    expect(wrapper.vm.selectedCategory).toBe('cat-1')
    expect(wrapper.vm.selectedAthlete).toBeNull()
    expect(wrapper.vm.canStartTimer).toBeFalsy()

    // ปุ่มเริ่มจับเวลาควร disabled
    const startButton = wrapper.find('.btn-primary')
    expect(startButton.attributes('disabled')).toBeDefined()

    // พยายามเริ่มจับเวลา (ไม่ควรทำงาน)
    wrapper.vm.startTimer()
    expect(wrapper.vm.isRunning).toBe(false)
    expect(wrapper.vm.step).toBe('select-category')
  })

  /**
   * Test: Admin ไม่เลือกนักกีฬา → ปุ่มเริ่มจับเวลา disabled
   * Requirements: 6.1
   */
  it('should disable start button for Admin when no athlete selected', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: true,
        athletes: mockAthletes,
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่แต่ไม่เลือกนักกีฬา
    await wrapper.findAll('.category-btn')[0].trigger('click')
    expect(wrapper.vm.selectedCategory).toBe('cat-1')
    expect(wrapper.vm.selectedAthlete).toBeNull()
    expect(wrapper.vm.canStartTimer).toBeFalsy()

    // ปุ่มเริ่มจับเวลาควร disabled
    const startButton = wrapper.find('.btn-primary')
    expect(startButton.attributes('disabled')).toBeDefined()
  })

  /**
   * Test: Coach เลือกทั้งหมวดหมู่และนักกีฬา → ปุ่มเริ่มจับเวลา enabled
   * Requirements: 6.1
   */
  it('should enable start button for Coach when both category and athlete selected', async () => {
    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: true,
        isAdmin: false,
        athletes: mockAthletes,
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่
    await wrapper.findAll('.category-btn')[0].trigger('click')
    expect(wrapper.vm.canStartTimer).toBeFalsy()

    // เลือกนักกีฬา
    const athleteSelect = wrapper.find('select')
    await athleteSelect.setValue('athlete-1')
    expect(wrapper.vm.selectedAthlete).toBe('athlete-1')
    expect(wrapper.vm.canStartTimer).toBeTruthy()

    // ปุ่มเริ่มจับเวลาไม่ควร disabled
    const startButton = wrapper.find('.btn-primary')
    expect(startButton.attributes('disabled')).toBeUndefined()
  })

  /**
   * Test: ระยะเวลา 0 นาที → แสดง error
   * Requirements: 2.3
   */
  it('should show error when duration is 0 minutes', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่ เริ่มจับเวลา และหยุดทันที (< 30 วินาที = 0 นาที)
    await wrapper.findAll('.category-btn')[0].trigger('click')
    await wrapper.find('.btn-primary').trigger('click')
    await vi.advanceTimersByTime(10000) // 10 วินาที
    await wrapper.find('.btn-primary').trigger('click')

    expect(wrapper.vm.step).toBe('save')
    expect(wrapper.vm.durationInMinutes).toBe(0) // 10 seconds rounds to 0 minutes

    // กรอกกิจกรรม
    wrapper.vm.saveForm.activities = 'วิ่ง'

    // พยายามบันทึก
    wrapper.vm.handleSave()
    await wrapper.vm.$nextTick()

    // ควรแสดง error
    expect(alertSpy).toHaveBeenCalledWith('ระยะเวลาต้องมากกว่า 0 นาที')
    expect(wrapper.emitted('save')).toBeFalsy()

    alertSpy.mockRestore()
  })

  /**
   * Test: กรอกข้อมูลครบถ้วน → บันทึกสำเร็จ
   * Requirements: 2.3
   */
  it('should save successfully when all required fields are filled', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const wrapper = mount(TimerModal, {
      props: {
        show: true,
        isCoach: false,
        isAdmin: false,
        athletes: [],
        activityCategories: mockActivityCategories
      }
    })

    // เลือกหมวดหมู่ เริ่มจับเวลา และหยุด
    await wrapper.findAll('.category-btn')[0].trigger('click')
    await wrapper.find('.btn-primary').trigger('click')
    await vi.advanceTimersByTime(60000) // 1 นาที
    await wrapper.find('.btn-primary').trigger('click')

    expect(wrapper.vm.step).toBe('save')
    expect(wrapper.vm.durationInMinutes).toBe(1)

    // กรอกกิจกรรม
    wrapper.vm.saveForm.activities = 'วิ่ง 5 กม.'

    // บันทึก
    wrapper.vm.handleSave()
    await wrapper.vm.$nextTick()

    // ไม่ควรแสดง error
    expect(alertSpy).not.toHaveBeenCalled()

    // ควร emit save event
    expect(wrapper.emitted('save')).toBeTruthy()
    const saveData = wrapper.emitted('save')[0][0]
    expect(saveData.activities).toBe('วิ่ง 5 กม.')
    expect(saveData.duration).toBe(1)

    alertSpy.mockRestore()
  })
})
