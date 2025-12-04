# Implementation Tasks: Athlete Progress Tracking

## Task 1: Database Schema Setup

### Description
สร้างตารางฐานข้อมูลสำหรับระบบติดตามความคืบหน้านักกีฬา

### Requirements Addressed
- Requirement 1: Training Plan Management
- Requirement 2: Plan Level Configuration
- Requirement 3: Athlete Progress Assignment
- Requirement 5: Progress History

### Acceptance Criteria
- [ ] สร้างตาราง `training_plans` สำหรับเก็บแผนพัฒนา
- [ ] สร้างตาราง `plan_levels` สำหรับเก็บระดับในแผน
- [ ] สร้างตาราง `athlete_progress` สำหรับเก็บความคืบหน้านักกีฬา
- [ ] สร้างตาราง `progress_history` สำหรับเก็บประวัติการเลื่อนระดับ
- [ ] สร้าง indexes ที่จำเป็น
- [ ] ทดสอบ foreign key constraints

---

## Task 2: RLS Policies Setup

### Description
สร้าง Row Level Security policies ตาม Role Matrix ที่กำหนด

### Requirements Addressed
- Requirement 7: Role-Based Access Control

### Acceptance Criteria
- [ ] RLS Policy: Admin SELECT/INSERT/UPDATE/DELETE all (4 policies ต่อตาราง)
- [ ] RLS Policy: Coach SELECT/INSERT/UPDATE/DELETE in club (4 policies ต่อตาราง)
- [ ] RLS Policy: Athlete SELECT own progress (1 policy)
- [ ] รัน `get_advisors` ตรวจสอบ security
- [ ] ทดสอบด้วย 3 demo accounts

---

## Task 3: Pinia Store - Training Plans

### Description
สร้าง Pinia store สำหรับจัดการแผนพัฒนา

### Requirements Addressed
- Requirement 1: Training Plan Management
- Requirement 2: Plan Level Configuration

### Acceptance Criteria
- [ ] สร้างไฟล์ `stores/trainingPlans.js`
- [ ] State: plans, currentPlan, loading, error
- [ ] Actions: fetchPlans, createPlan, updatePlan, deletePlan
- [ ] Actions: fetchLevels, createLevel, updateLevel, deleteLevel
- [ ] Getters: activePlans, planById
- [ ] Error handling ครบถ้วน

---

## Task 4: Pinia Store - Athlete Progress

### Description
สร้าง Pinia store สำหรับจัดการความคืบหน้านักกีฬา

### Requirements Addressed
- Requirement 3: Athlete Progress Assignment
- Requirement 5: Progress History

### Acceptance Criteria
- [ ] สร้างไฟล์ `stores/athleteProgress.js`
- [ ] State: progressList, history, loading, error
- [ ] Actions: fetchProgress, assignAthlete, updateLevel, fetchHistory
- [ ] Getters: progressByPlan, progressByAthlete
- [ ] บันทึก history อัตโนมัติเมื่ออัพเดทระดับ
- [ ] Error handling ครบถ้วน

---

## Task 5: Training Plans View

### Description
สร้างหน้าจัดการแผนพัฒนา

### Requirements Addressed
- Requirement 1: Training Plan Management
- Requirement 2: Plan Level Configuration

### Acceptance Criteria
- [ ] สร้างไฟล์ `views/TrainingPlansView.vue`
- [ ] แสดงรายการแผนพัฒนาทั้งหมด (ตาม role)
- [ ] ปุ่มสร้างแผนใหม่ (Coach/Admin)
- [ ] Modal สร้าง/แก้ไขแผน
- [ ] กำหนดจำนวนระดับและรายละเอียดแต่ละระดับ
- [ ] ปุ่มลบแผน (พร้อม confirmation)
- [ ] Responsive design
- [ ] ใช้ Design Theme (ขาว-ดำ, SVG icons)

---

## Task 6: Plan Detail View

### Description
สร้างหน้าแสดงรายละเอียดแผนและนักกีฬาที่ถูก assign

### Requirements Addressed
- Requirement 3: Athlete Progress Assignment
- Requirement 4: Progress Visualization

### Acceptance Criteria
- [ ] สร้างไฟล์ `views/PlanDetailView.vue`
- [ ] แสดงรายละเอียดแผน (ชื่อ, คำอธิบาย, จำนวนระดับ)
- [ ] แสดงรายการระดับทั้งหมดพร้อมรายละเอียด
- [ ] แสดงนักกีฬาที่ถูก assign พร้อมระดับปัจจุบัน
- [ ] Progress bar แสดงความคืบหน้า
- [ ] ปุ่ม assign นักกีฬาใหม่
- [ ] ปุ่มอัพเดทระดับนักกีฬา
- [ ] Filter/Sort นักกีฬาตามระดับ

---

## Task 7: Athlete Progress Components

### Description
สร้าง components สำหรับแสดงและจัดการความคืบหน้า

### Requirements Addressed
- Requirement 4: Progress Visualization
- Requirement 6: Athlete Self-View

### Acceptance Criteria
- [ ] สร้าง `components/AthleteProgressCard.vue` - แสดง progress bar และระดับ
- [ ] สร้าง `components/LevelUpdateModal.vue` - modal อัพเดทระดับ
- [ ] สร้าง `components/ProgressHistoryModal.vue` - แสดงประวัติ timeline
- [ ] สร้าง `components/AssignAthleteModal.vue` - modal assign นักกีฬา
- [ ] ใช้ Design Theme (ขาว-ดำ, SVG icons)

---

## Task 8: Athlete Self-View Integration

### Description
เพิ่มส่วนแสดงความคืบหน้าในหน้า profile ของนักกีฬา

### Requirements Addressed
- Requirement 6: Athlete Self-View

### Acceptance Criteria
- [ ] เพิ่ม section "แผนพัฒนาของฉัน" ในหน้า profile
- [ ] แสดงแผนที่ถูก assign พร้อมระดับปัจจุบัน
- [ ] แสดง progress bar
- [ ] แสดงรายละเอียดระดับถัดไป (ถ้ามี)
- [ ] ปุ่มดูประวัติการเลื่อนระดับ

---

## Task 9: Routing Setup

### Description
เพิ่ม routes สำหรับหน้าใหม่

### Requirements Addressed
- All requirements

### Acceptance Criteria
- [ ] เพิ่ม route `/training-plans` - รายการแผนพัฒนา
- [ ] เพิ่ม route `/training-plans/:id` - รายละเอียดแผน
- [ ] ตั้งค่า meta.requiresAuth = true
- [ ] ตั้งค่า meta.roles ตาม Role Matrix
- [ ] เพิ่มใน NavBar (สำหรับ Coach/Admin)

---

## Task 10: Testing & Security Audit

### Description
ทดสอบระบบและตรวจสอบ security

### Requirements Addressed
- Requirement 7: Role-Based Access Control

### Acceptance Criteria
- [ ] ทดสอบด้วย admin@test.com - ดู/จัดการได้ทั้งหมด
- [ ] ทดสอบด้วย coach@test.com - ดู/จัดการในชมรม
- [ ] ทดสอบด้วย athlete@test.com - ดูเฉพาะตัวเอง
- [ ] รัน `get_advisors` ไม่มี security warnings
- [ ] ตรวจสอบ RLS policies ครบถ้วน

---

## Implementation Order

```
1. Task 1: Database Schema Setup
2. Task 2: RLS Policies Setup
3. Task 3: Pinia Store - Training Plans
4. Task 4: Pinia Store - Athlete Progress
5. Task 5: Training Plans View
6. Task 6: Plan Detail View
7. Task 7: Athlete Progress Components
8. Task 8: Athlete Self-View Integration
9. Task 9: Routing Setup
10. Task 10: Testing & Security Audit
```

## Dependencies

- Task 2 depends on Task 1
- Task 3, 4 depend on Task 1
- Task 5, 6, 7, 8 depend on Task 3, 4
- Task 9 depends on Task 5, 6
- Task 10 depends on all tasks

