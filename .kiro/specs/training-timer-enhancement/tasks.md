# Implementation Plan: Training Timer Enhancement

## ✅ สถานะ: ทุก Task เสร็จสมบูรณ์แล้ว

ฟีเจอร์ Training Timer Enhancement ได้รับการพัฒนาและทดสอบครบถ้วนแล้ว ประกอบด้วย:

### สิ่งที่ทำเสร็จแล้ว:
- ✅ TimerModal component พร้อม 3 steps (select-category, timer, save)
- ✅ Timer logic ที่แม่นยำด้วย Date.now() และ setInterval
- ✅ UI สำหรับเลือกหมวดหมู่และนักกีฬา (role-based)
- ✅ Timer display แบบ HH:MM:SS พร้อม pause/resume
- ✅ ฟอร์มบันทึกรายละเอียดพร้อม validation
- ✅ Integration เข้า TrainingLogs.vue
- ✅ Manual entry modal พร้อม validation
- ✅ Unit tests สำหรับ timer accuracy (timerAccuracy.test.js)
- ✅ Edge case tests (timerEdgeCases.test.js)
- ✅ Integration tests (trainingTimer.integration.test.js)
- ✅ Role-based access control (Athlete/Coach/Admin)

---

## รายละเอียด Tasks ที่เสร็จแล้ว

- [x] 1. สร้าง TimerModal component
  - สร้างไฟล์ `src/components/TimerModal.vue`
  - เพิ่ม props: show, isCoach, isAdmin, athletes, activityCategories
  - เพิ่ม emits: close, save
  - สร้าง template โครงสร้างพื้นฐาน (3 steps: select-category, timer, save)
  - _Requirements: 1.1, 2.1, 6.1_

- [x] 2. Implement timer logic
  - [x] 2.1 สร้าง timer state และ functions
    - เพิ่ม reactive state: elapsedSeconds, isRunning, isPaused, startTime
    - สร้าง startTimer() function ใช้ Date.now() และ setInterval
    - สร้าง pauseTimer() function clear interval
    - สร้าง resumeTimer() function continue from paused time
    - สร้าง stopTimer() function และเปลี่ยนไปยัง save step
    - สร้าง cancelTimer() function reset state และ emit close
    - _Requirements: 1.2, 1.4, 1.5, 2.1_

  - [x] 2.2 สร้าง time formatting functions
    - สร้าง formatTime(seconds) แปลงเป็น HH:MM:SS
    - สร้าง secondsToMinutes(seconds) แปลงเป็นนาที (ปัดเศษ)
    - _Requirements: 1.3, 2.2_

  - [x] 2.3 Implement cleanup และ error handling
    - เพิ่ม onUnmounted() เพื่อ clearInterval
    - เพิ่ม watch เมื่อ show = false ให้ cleanup
    - จำกัดเวลาสูงสุด 24 ชั่วโมง
    - _Requirements: 1.2_

- [x] 3. สร้าง UI สำหรับ Step 1: เลือกหมวดหมู่
  - [x] 3.1 สร้าง category selector
    - แสดงรายการหมวดหมู่จาก activityCategories
    - ใช้ grid layout พร้อม active state
    - เพิ่ม validation: ต้องเลือกหมวดหมู่ก่อนเริ่มจับเวลา
    - _Requirements: 1.1_

  - [x] 3.2 เพิ่ม athlete selector (สำหรับ Coach/Admin)
    - แสดง dropdown เลือกนักกีฬา (ถ้า isCoach หรือ isAdmin)
    - Filter athletes ตาม club_id (สำหรับ Coach)
    - แสดงทุกคนสำหรับ Admin
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 3.3 สร้างปุ่ม "เริ่มจับเวลา"
    - ปุ่มสีดำ ตัวอักษรขาว
    - Disabled ถ้ายังไม่เลือกหมวดหมู่ (หรือนักกีฬาสำหรับ Coach/Admin)
    - คลิกแล้วเรียก startTimer() และเปลี่ยนไป step timer
    - _Requirements: 1.2_

- [x] 4. สร้าง UI สำหรับ Step 2: จับเวลา
  - [x] 4.1 สร้าง timer display
    - แสดงเวลาในรูปแบบ HH:MM:SS
    - ใช้ font ขนาดใหญ่ (48px) อ่านง่าย
    - อัพเดททุก 100ms แต่แสดงทุก 1 วินาที
    - _Requirements: 1.3_

  - [x] 4.2 สร้างปุ่ม control
    - ปุ่ม "หยุดชั่วคราว" (แสดงเมื่อ isRunning && !isPaused)
    - ปุ่ม "ดำเนินการต่อ" (แสดงเมื่อ isPaused)
    - ปุ่ม "จบการฝึก" (แสดงเสมอ)
    - ปุ่ม "ยกเลิก" (สีแดง)
    - _Requirements: 1.4, 1.5, 2.1, 2.5_

- [x] 5. สร้าง UI สำหรับ Step 3: บันทึกรายละเอียด
  - [x] 5.1 สร้างฟอร์มบันทึก
    - แสดงระยะเวลา (อัตโนมัติจาก timer, disabled)
    - Input กิจกรรมที่ฝึก (required)
    - Textarea หมายเหตุ (optional)
    - Input custom_activity (ถ้าเลือกหมวดหมู่ "อื่นๆ")
    - _Requirements: 2.2, 2.3_

  - [x] 5.2 Implement save logic
    - Validate required fields (activities, duration > 0)
    - สร้าง training log object พร้อม duration จาก timer
    - เรียก emit('save', logData)
    - แสดง error message ถ้า validation ล้มเหลว
    - _Requirements: 2.3, 2.4_

- [x] 6. Integrate TimerModal เข้า TrainingLogs.vue
  - [x] 6.1 เพิ่ม TimerModal component
    - Import TimerModal.vue
    - เพิ่ม showTimerModal state
    - เพิ่ม @save handler เพื่อบันทึก training log
    - _Requirements: 1.1, 2.4_

  - [x] 6.2 ปรับปุ่ม "เพิ่ม" เป็น "เริ่มฝึก"
    - เปลี่ยนชื่อปุ่มเป็น "เริ่มฝึก" พร้อม timer icon
    - คลิกแล้วเปิด TimerModal แทน Manual Modal
    - _Requirements: 1.1_

  - [x] 6.3 เพิ่มปุ่ม "บันทึกด้วยตนเอง"
    - เพิ่มปุ่มใหม่ใน header-actions
    - คลิกแล้วเปิด Manual Modal (เดิม)
    - _Requirements: 3.1_

- [x] 7. ปรับปรุง Manual Entry Modal
  - [x] 7.1 Rename modal title
    - เปลี่ยน title จาก "บันทึกใหม่" เป็น "บันทึกด้วยตนเอง"
    - _Requirements: 3.1_

  - [x] 7.2 ปรับ validation
    - ตรวจสอบ required fields (date, duration, activities)
    - แสดง error messages ที่ชัดเจนใน validation-error component
    - _Requirements: 3.3_

- [x] 8. ทดสอบ timer accuracy
  - [x] 8.1 ทดสอบ timer ทำงานถูกต้อง
    - เริ่ม timer → รอ 10 วินาที → ตรวจสอบเวลาแสดงถูกต้อง ✅
    - Pause → Resume → ตรวจสอบเวลาต่อเนื่อง ✅
    - ทดสอบ HH:MM:SS formatting ✅
    - ทดสอบ Pause/Resume หลายครั้ง ✅
    - ทดสอบจำกัดเวลา 24 ชั่วโมง ✅
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 8.2 ทดสอบ background tab behavior
    - เริ่ม timer → switch tab → กลับมา → ตรวจสอบเวลาถูกต้อง ✅
    - ทดสอบว่าใช้ Date.now() ไม่ใช่ interval counter ✅
    - ทดสอบ pause/resume ขณะ tab ไม่ active ✅
    - _Requirements: 1.3_

- [x] 9. ทดสอบ complete flow
  - [x] 9.1 ทดสอบ timer flow
    - เลือกหมวดหมู่ → เริ่มจับเวลา → Pause → Resume → จบการฝึก → บันทึก ✅
    - ตรวจสอบ training log ถูกสร้างด้วยเวลาที่ถูกต้อง ✅
    - ทดสอบ long duration (1:30:45) ✅
    - ทดสอบ validation ก่อนบันทึก ✅
    - ทดสอบ cancel during timer ✅
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4_

  - [x] 9.2 ทดสอบ manual entry flow
    - ทดสอบ validation logic ✅
    - ทดสอบ log structure ✅
    - ทดสอบ custom activity สำหรับ "อื่นๆ" ✅
    - ทดสอบ clear custom_activity เมื่อไม่ใช่ "อื่นๆ" ✅
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 9.3 ทดสอบ role-based access
    - Athlete: ไม่มี athlete selector ✅
    - Coach: เห็นเฉพาะนักกีฬาในชมรม ✅
    - Admin: เห็นนักกีฬาทั้งหมด ✅
    - Coach/Admin: ต้องเลือกนักกีฬาก่อนเริ่ม timer ✅
    - ทดสอบ athlete_id ถูกต้องตาม role ✅
    - ทดสอบ UI visibility ตาม role ✅
    - ทดสอบ validation สำหรับ Coach/Admin ✅
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. ทดสอบ edge cases
  - [x] 10.1 ทดสอบ cancel scenarios
    - Cancel ระหว่างเลือกหมวดหมู่ ✅
    - Cancel ระหว่างจับเวลา ✅
    - Cancel ระหว่าง pause ✅
    - Cancel ในฟอร์มบันทึก ✅
    - ตรวจสอบ state ถูก reset ✅
    - ตรวจสอบ interval cleanup ✅
    - ทดสอบ multiple cancel clicks ✅
    - _Requirements: 2.5_

  - [x] 10.2 ทดสอบ validation errors
    - ไม่เลือกหมวดหมู่ → ปุ่ม disabled ✅
    - เลือกหมวดหมู่ → ปุ่ม enabled ✅
    - ไม่กรอกกิจกรรม → แสดง error ✅
    - กรอกแต่ whitespace → แสดง error ✅
    - Coach ไม่เลือกนักกีฬา → ปุ่ม disabled ✅
    - Admin ไม่เลือกนักกีฬา → ปุ่ม disabled ✅
    - Coach เลือกครบ → ปุ่ม enabled ✅
    - ระยะเวลา 0 นาที → แสดง error ✅
    - กรอกครบถ้วน → บันทึกสำเร็จ ✅
    - _Requirements: 2.3, 6.1_

- [x] 11. Checkpoint - ตรวจสอบทุกอย่างทำงานถูกต้อง
  - ✅ ทุก tests ผ่านหมด (timerAccuracy.test.js, timerEdgeCases.test.js, trainingTimer.integration.test.js)
  - ✅ Component ทำงานถูกต้องตาม requirements
  - ✅ Role-based access control ทำงานถูกต้อง
  - ✅ Validation ครบถ้วน
  - ✅ UI/UX ตาม design theme (ขาว-ดำ, SVG icons)


---

## 🆕 Additional Enhancements (December 2025)

### Task 12: Background Timer & State Persistence

**Status:** ✅ Done

**Description:** Implement background timer continuation and state persistence using LocalStorage and Wake Lock API

**Requirements:** Requirements 9 & 10

**Subtasks:**
- [x] 12.1: Refactor timer logic to use timestamps (startTime + pausedDuration)
- [x] 12.2: Implement LocalStorage persistence (saveTimerState, restoreTimerState, clearTimerState)
- [x] 12.3: Add auto-save watchers for timer state changes
- [x] 12.4: Implement Screen Wake Lock API (requestWakeLock, releaseWakeLock)
- [x] 12.5: Add visibility change handler for tab switching
- [x] 12.6: Add beforeunload handler with warning
- [x] 12.7: Add UI indicators (wake lock, restored session)
- [x] 12.8: Test background timer with screen lock
- [x] 12.9: Test state restoration after browser close
- [x] 12.10: Test wake lock on mobile devices

**Files:**
- `sports-club-management/src/components/TimerModal.vue`

**Implementation Notes:**
- Timer uses `Date.now()` as source of truth for accuracy
- State persists to localStorage with 24-hour expiration
- Wake Lock prevents screen sleep during active training
- Visibility change handler updates timer when tab becomes active
- Beforeunload warning prevents accidental session loss
- Constants: `TIMER_STORAGE_KEY`, `MAX_TIMER_DURATION`

---

### Task 13: UX/UI Flow Redesign (Option 1: Quick Start First)

**Status:** ✅ Done

**Description:** Redesign timer UX to allow quick start without category selection first

**Requirements:** Requirements 1 & 2 (Updated)

**Subtasks:**
- [x] 13.1: Update requirements.md with Option 1 flow
- [x] 13.2: Update design.md with new UX specifications
- [x] 13.3: Restructure step flow (remove select-category step)
- [x] 13.4: Implement immediate timer start on modal open (Athlete)
- [x] 13.5: Keep athlete selection step for Coach/Admin
- [x] 13.6: Convert category grid to horizontal scrolling pills
- [x] 13.7: Add category selection during training (optional)
- [x] 13.8: Make category required in save form (if not selected)
- [x] 13.9: Update CSS for horizontal pill layout with smooth scroll
- [x] 13.10: Add SVG icons to timer control buttons
- [x] 13.11: Add restored session indicator
- [x] 13.12: Add wake lock indicator
- [x] 13.13: Test UX flow with all user roles

**Files:**
- `.kiro/specs/training-timer-enhancement/requirements.md`
- `.kiro/specs/training-timer-enhancement/design.md`
- `sports-club-management/src/components/TimerModal.vue`

**Implementation Notes:**
- **Athlete Flow:** Click "เริ่มฝึก" → Timer starts immediately → Select category during/after → Save
- **Coach/Admin Flow:** Click "เริ่มฝึก" → Select athlete → Timer starts → Select category during/after → Save
- Category pills use horizontal scroll with custom scrollbar styling
- Restored session indicator shows when state is loaded from localStorage
- Wake lock indicator shows when screen sleep is prevented
- All buttons have SVG icons for better visual feedback

---

## 📊 Summary

**Total Tasks:** 13
**Completed:** 13 ✅
**In Progress:** 0
**Pending:** 0

**Latest Updates:**
- ✅ Background timer with state persistence (Task 12)
- ✅ Quick start UX flow redesign (Task 13)
- ✅ Screen Wake Lock API integration
- ✅ LocalStorage state management
- ✅ Horizontal scrolling category pills
- ✅ Enhanced UI indicators

**Next Steps:**
- Test on various mobile devices (iOS Safari, Android Chrome)
- Gather user feedback on new UX flow
- Monitor localStorage usage and cleanup
- Consider adding training streak feature (future enhancement)
