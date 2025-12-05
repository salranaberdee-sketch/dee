import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TimerModal from '../components/TimerModal.vue'

describe('Timer Accuracy Tests', () => {
  let wrapper
  let realDateNow

  beforeEach(() => {
    // เก็บ Date.now() จริงไว้
    realDateNow = Date.now
    vi.useFakeTimers()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('8.1 ทดสอบ timer ทำงานถูกต้อง', () => {
    it('ควรแสดงเวลาที่ถูกต้องหลังจาก 10 วินาที', async () => {
      // Arrange: สร้าง component
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [
            { id: '1', name: 'วิ่ง' },
            { id: '2', name: 'ว่ายน้ำ' }
          ]
        }
      })

      // เลือกหมวดหมู่
      const categoryButtons = wrapper.findAll('.category-btn')
      await categoryButtons[0].trigger('click')

      // เริ่มจับเวลา
      const startButton = wrapper.find('.btn-primary')
      await startButton.trigger('click')

      // Act: รอ 10 วินาที
      await vi.advanceTimersByTimeAsync(10000)

      // Assert: ตรวจสอบว่าเวลาแสดง 00:00:10
      const timerDisplay = wrapper.find('.timer-time')
      expect(timerDisplay.text()).toBe('00:00:10')
    })

    it('ควรนับเวลาต่อเนื่องหลัง Pause และ Resume', async () => {
      // Arrange
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [{ id: '1', name: 'วิ่ง' }]
        }
      })

      // เลือกหมวดหมู่และเริ่มจับเวลา
      await wrapper.findAll('.category-btn')[0].trigger('click')
      await wrapper.find('.btn-primary').trigger('click')

      // รอ 5 วินาที
      await vi.advanceTimersByTimeAsync(5000)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:05')

      // Pause
      const pauseButton = wrapper.find('.btn-secondary')
      await pauseButton.trigger('click')

      // รอ 3 วินาทีขณะ pause (เวลาไม่ควรเพิ่ม)
      await vi.advanceTimersByTimeAsync(3000)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:05')

      // Resume
      const resumeButton = wrapper.find('.btn-secondary')
      await resumeButton.trigger('click')

      // รอ 5 วินาทีหลัง resume
      await vi.advanceTimersByTimeAsync(5000)

      // Assert: เวลารวมควรเป็น 10 วินาที (5 + 0 + 5)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:10')
    })

    it('ควรแสดงเวลาในรูปแบบ HH:MM:SS ที่ถูกต้อง', async () => {
      // Arrange
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [{ id: '1', name: 'วิ่ง' }]
        }
      })

      await wrapper.findAll('.category-btn')[0].trigger('click')
      await wrapper.find('.btn-primary').trigger('click')

      // Act & Assert: ทดสอบหลายช่วงเวลา
      
      // 0 วินาที
      expect(wrapper.find('.timer-time').text()).toBe('00:00:00')

      // 59 วินาที
      await vi.advanceTimersByTimeAsync(59000)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:59')

      // 1 นาที
      await vi.advanceTimersByTimeAsync(1000)
      expect(wrapper.find('.timer-time').text()).toBe('00:01:00')

      // 1 ชั่วโมง
      await vi.advanceTimersByTimeAsync(3540000) // 59 นาที
      expect(wrapper.find('.timer-time').text()).toBe('01:00:00')

      // 1:23:45
      await vi.advanceTimersByTimeAsync(1425000) // 23:45
      expect(wrapper.find('.timer-time').text()).toBe('01:23:45')
    })

    it('ควร Pause และ Resume ได้หลายครั้ง', async () => {
      // Arrange
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [{ id: '1', name: 'วิ่ง' }]
        }
      })

      await wrapper.findAll('.category-btn')[0].trigger('click')
      await wrapper.find('.btn-primary').trigger('click')

      // Act: Pause/Resume หลายรอบ
      
      // รอบที่ 1: วิ่ง 3 วินาที
      await vi.advanceTimersByTimeAsync(3000)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:03')

      // Pause 1
      await wrapper.find('.btn-secondary').trigger('click')
      await vi.advanceTimersByTimeAsync(2000)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:03')

      // Resume 1 และวิ่ง 4 วินาที
      await wrapper.find('.btn-secondary').trigger('click')
      await vi.advanceTimersByTimeAsync(4000)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:07')

      // Pause 2
      await wrapper.find('.btn-secondary').trigger('click')
      await vi.advanceTimersByTimeAsync(1000)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:07')

      // Resume 2 และวิ่ง 3 วินาที
      await wrapper.find('.btn-secondary').trigger('click')
      await vi.advanceTimersByTimeAsync(3000)

      // Assert: เวลารวม = 3 + 4 + 3 = 10 วินาที
      expect(wrapper.find('.timer-time').text()).toBe('00:00:10')
    })

    it('ควรจำกัดเวลาสูงสุดที่ 24 ชั่วโมง', async () => {
      // Arrange
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [{ id: '1', name: 'วิ่ง' }]
        }
      })

      await wrapper.findAll('.category-btn')[0].trigger('click')
      await wrapper.find('.btn-primary').trigger('click')

      // Act: รอ 24 ชั่วโมง (86400 วินาที)
      await vi.advanceTimersByTimeAsync(86400000)

      // Assert: timer ควรหยุดอัตโนมัติและเปลี่ยนไป step 'save'
      await wrapper.vm.$nextTick()
      
      // ตรวจสอบว่าเปลี่ยนไป save step แล้ว
      const saveStep = wrapper.find('.step-content')
      expect(saveStep.exists()).toBe(true)
      
      // ตรวจสอบว่ามีฟอร์มบันทึก
      const activitiesInput = wrapper.find('input[placeholder*="วิ่ง"]')
      expect(activitiesInput.exists()).toBe(true)
    })
  })

  describe('8.2 ทดสอบ background tab behavior', () => {
    it('ควรแสดงเวลาที่ถูกต้องหลังจาก switch tab', async () => {
      // Arrange
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [{ id: '1', name: 'วิ่ง' }]
        }
      })

      await wrapper.findAll('.category-btn')[0].trigger('click')
      await wrapper.find('.btn-primary').trigger('click')

      // รอ 5 วินาที
      await vi.advanceTimersByTimeAsync(5000)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:05')

      // Simulate: tab เปลี่ยนไป (timer ยังทำงานอยู่ใน background)
      // เนื่องจากใช้ Date.now() เป็นหลัก ไม่ใช่ counter
      // เวลาจะถูกต้องแม้ tab ไม่ active

      // รอ 10 วินาทีเพิ่ม (ขณะ tab ไม่ active)
      await vi.advanceTimersByTimeAsync(10000)

      // กลับมา tab (force update)
      await wrapper.vm.$forceUpdate()
      await wrapper.vm.$nextTick()

      // Assert: เวลาควรเป็น 15 วินาที (5 + 10)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:15')
    })

    it('ควรคำนวณเวลาจาก Date.now() ไม่ใช่ interval counter', async () => {
      // Arrange
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [{ id: '1', name: 'วิ่ง' }]
        }
      })

      await wrapper.findAll('.category-btn')[0].trigger('click')
      
      // เก็บเวลาก่อนเริ่ม
      const startMoment = Date.now()
      
      await wrapper.find('.btn-primary').trigger('click')

      // รอ 7 วินาที
      await vi.advanceTimersByTimeAsync(7000)

      // ตรวจสอบว่า elapsedSeconds คำนวณจาก Date.now() - startTime
      const vm = wrapper.vm
      const expectedElapsed = Math.floor((Date.now() - vm.startTime) / 1000)
      
      expect(vm.elapsedSeconds).toBe(expectedElapsed)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:07')
    })

    it('ควรทำงานถูกต้องหลัง pause/resume ขณะ tab ไม่ active', async () => {
      // Arrange
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [{ id: '1', name: 'วิ่ง' }]
        }
      })

      await wrapper.findAll('.category-btn')[0].trigger('click')
      await wrapper.find('.btn-primary').trigger('click')

      // วิ่ง 3 วินาที
      await vi.advanceTimersByTimeAsync(3000)
      expect(wrapper.find('.timer-time').text()).toBe('00:00:03')

      // Pause
      await wrapper.find('.btn-secondary').trigger('click')

      // Simulate: switch tab ขณะ pause
      await vi.advanceTimersByTimeAsync(5000)
      
      // เวลาไม่ควรเปลี่ยนขณะ pause
      expect(wrapper.find('.timer-time').text()).toBe('00:00:03')

      // Resume (ขณะ tab ไม่ active)
      await wrapper.find('.btn-secondary').trigger('click')

      // รอ 4 วินาที
      await vi.advanceTimersByTimeAsync(4000)

      // Assert: เวลารวม = 3 + 4 = 7 วินาที
      expect(wrapper.find('.timer-time').text()).toBe('00:00:07')
    })
  })

  describe('Timer State Management', () => {
    it('ควร reset state เมื่อ cancel', async () => {
      // Arrange
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [{ id: '1', name: 'วิ่ง' }]
        }
      })

      await wrapper.findAll('.category-btn')[0].trigger('click')
      await wrapper.find('.btn-primary').trigger('click')
      await vi.advanceTimersByTimeAsync(5000)

      // Act: Cancel
      await wrapper.find('.btn-danger').trigger('click')

      // Assert: state ควร reset
      const vm = wrapper.vm
      expect(vm.elapsedSeconds).toBe(0)
      expect(vm.isRunning).toBe(false)
      expect(vm.isPaused).toBe(false)
      expect(vm.step).toBe('select-category')
    })

    it('ควร cleanup interval เมื่อ component unmount', async () => {
      // Arrange
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [{ id: '1', name: 'วิ่ง' }]
        }
      })

      await wrapper.findAll('.category-btn')[0].trigger('click')
      await wrapper.find('.btn-primary').trigger('click')

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      // Act: Unmount component
      wrapper.unmount()

      // Assert: clearInterval ควรถูกเรียก
      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Duration Conversion', () => {
    it('ควรแปลงวินาทีเป็นนาทีได้ถูกต้อง', async () => {
      // Arrange
      wrapper = mount(TimerModal, {
        props: {
          show: true,
          isCoach: false,
          isAdmin: false,
          athletes: [],
          activityCategories: [{ id: '1', name: 'วิ่ง' }]
        }
      })

      await wrapper.findAll('.category-btn')[0].trigger('click')
      await wrapper.find('.btn-primary').trigger('click')

      // Test cases: วินาที -> นาที (ปัดเศษ)
      const testCases = [
        { seconds: 30, expectedMinutes: 1 },   // 0.5 นาที -> 1
        { seconds: 60, expectedMinutes: 1 },   // 1 นาที
        { seconds: 90, expectedMinutes: 2 },   // 1.5 นาที -> 2
        { seconds: 120, expectedMinutes: 2 },  // 2 นาที
        { seconds: 150, expectedMinutes: 3 },  // 2.5 นาที -> 3
        { seconds: 300, expectedMinutes: 5 },  // 5 นาที
        { seconds: 3600, expectedMinutes: 60 } // 1 ชั่วโมง = 60 นาที
      ]

      for (const testCase of testCases) {
        // Set elapsed seconds
        wrapper.vm.elapsedSeconds = testCase.seconds
        await wrapper.vm.$nextTick()

        // Check computed durationInMinutes
        expect(wrapper.vm.durationInMinutes).toBe(testCase.expectedMinutes)
      }
    })
  })
})
