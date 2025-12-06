# Implementation Plan

## 1. Database Setup

- [ ] 1.1 Create facilities table migration
  - สร้างตาราง facilities พร้อม columns: id, club_id, name, description, image_url, capacity, is_active
  - เพิ่ม foreign key ไปยัง clubs
  - _Requirements: 5.1_

- [ ] 1.2 Create facility_time_slots table migration
  - สร้างตาราง facility_time_slots พร้อม columns: id, facility_id, day_of_week, start_time, end_time, is_active
  - เพิ่ม constraint สำหรับ day_of_week (0-6)
  - _Requirements: 5.1_

- [ ] 1.3 Create facility_bookings table migration
  - สร้างตาราง facility_bookings พร้อม columns ทั้งหมดตาม design
  - เพิ่ม status check constraint, unique constraint สำหรับ approved bookings
  - เพิ่ม indexes สำหรับ query ที่ใช้บ่อย
  - _Requirements: 2.1, 4.2, 4.3, 7.3_

- [ ] 1.4 Create RLS policies for facilities
  - Admin: SELECT/INSERT/UPDATE/DELETE all
  - Coach: SELECT in club
  - Athlete: SELECT in club
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 1.5 Create RLS policies for facility_time_slots
  - Admin: SELECT/INSERT/UPDATE/DELETE all
  - Coach/Athlete: SELECT only
  - _Requirements: 5.1_

- [ ] 1.6 Create RLS policies for facility_bookings
  - Admin: SELECT/INSERT/UPDATE/DELETE all + เห็น approved_by
  - Coach: SELECT in club, UPDATE status (approve/reject)
  - Athlete: SELECT/INSERT own, UPDATE own (cancel only)
  - ซ่อน approved_by/rejected_by จาก non-admin
  - _Requirements: 2.1, 3.3, 4.1, 4.5, 4.6_

- [ ] 1.7 Create database functions
  - Function: check_slot_availability(facility_id, date, start_time, end_time)
  - Function: get_available_slots_count(facility_id, date)
  - _Requirements: 1.3, 2.2_

- [ ] 1.8 Checkpoint - Verify database setup
  - Ensure all tests pass, ask the user if questions arise.

## 2. Store Implementation

- [ ] 2.1 Create facility store base structure
  - สร้าง stores/facility.js พร้อม state, getters พื้นฐาน
  - _Requirements: 1.1_

- [ ] 2.2 Implement facility fetching actions
  - fetchFacilities(), fetchFacilityById()
  - รวม time_slots ใน query
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 2.3 Write property test for available slot count
  - **Property 1: Available Slot Count Accuracy**
  - **Validates: Requirements 1.3**

- [ ] 2.4 Implement booking creation actions
  - createBooking() - สร้างการจองใหม่ status=pending
  - ตรวจสอบ slot availability ก่อนสร้าง
  - _Requirements: 2.1, 2.2_

- [ ]* 2.5 Write property test for new booking status
  - **Property 2: New Booking Status**
  - **Validates: Requirements 2.1**

- [ ]* 2.6 Write property test for no double booking
  - **Property 3: No Double Booking**
  - **Validates: Requirements 2.2, 4.4**

- [ ] 2.7 Implement recurring booking action
  - createRecurringBooking() - สร้างหลาย bookings พร้อม series_id
  - ตรวจสอบ conflicts และ return warnings
  - _Requirements: 7.2, 7.3, 7.4_

- [ ]* 2.8 Write property test for recurring booking count
  - **Property 14: Recurring Booking Count**
  - **Validates: Requirements 7.3**

- [ ] 2.9 Implement booking management actions
  - cancelBooking(), cancelRecurringSeries()
  - fetchMyBookings() - grouped by status
  - _Requirements: 3.1, 3.3, 7.6_

- [ ]* 2.10 Write property test for booking grouping
  - **Property 4: Booking Grouping Correctness**
  - **Validates: Requirements 3.1**

- [ ] 2.11 Implement approval/rejection actions
  - approveBooking(), rejectBooking(reason)
  - approveRecurringSeries()
  - บันทึก approved_by/rejected_by และ timestamp
  - _Requirements: 4.2, 4.3, 7.5_

- [ ]* 2.12 Write property test for approval metadata
  - **Property 7: Approval Metadata Recording**
  - **Validates: Requirements 4.2**

- [ ]* 2.13 Write property test for rejection metadata
  - **Property 8: Rejection Metadata Recording**
  - **Validates: Requirements 4.3**

- [ ]* 2.14 Write property test for recurring series approval
  - **Property 15: Recurring Series Approval**
  - **Validates: Requirements 7.5**

- [ ] 2.15 Implement admin facility management actions
  - createFacility(), updateFacility(), deactivateFacility()
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 2.16 Checkpoint - Verify store implementation
  - Ensure all tests pass, ask the user if questions arise.

## 3. UI Components

- [ ] 3.1 Create BookingStatusBadge component
  - แสดง badge ตามสถานะ พร้อมสีที่ถูกต้อง
  - pending=เหลือง, approved=เขียว, rejected=แดง, cancelled=เทา
  - _Requirements: 3.2_

- [ ] 3.2 Create FacilityCard component
  - แสดงรูป, ชื่อ, ความจุ, จำนวนช่องว่าง
  - แสดง badge "เต็ม" เมื่อไม่มีช่องว่าง
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3.3 Create FacilityCalendar component
  - แสดงปฏิทินรายสัปดาห์
  - สีบอกสถานะ: ขาว=ว่าง, เทา=จอง, เหลือง=รอ
  - คลิกช่องว่างเพื่อจอง
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 3.4 Write property test for calendar slot color coding
  - **Property 12: Calendar Slot Color Coding**
  - **Validates: Requirements 6.2, 6.3, 6.4**

- [ ] 3.5 Create BookingForm component
  - ฟอร์มเลือกวัน/เวลา/จุดประสงค์
  - Toggle สำหรับ recurring booking
  - เลือกจำนวนสัปดาห์ (2-8)
  - _Requirements: 2.1, 7.1, 7.2_

- [ ]* 3.6 Write property test for recurring week range
  - **Property 13: Recurring Booking Week Range**
  - **Validates: Requirements 7.2**

- [ ] 3.7 Create BookingCard component
  - แสดงข้อมูลการจอง: สถานที่, วัน, เวลา, สถานะ
  - ปุ่มยกเลิก (สำหรับ pending)
  - แสดงเหตุผลปฏิเสธ (ถ้ามี)
  - _Requirements: 3.2, 3.3_

- [ ] 3.8 Checkpoint - Verify components
  - Ensure all tests pass, ask the user if questions arise.

## 4. Views Implementation

- [ ] 4.1 Create FacilityListView
  - แสดงรายการ FacilityCard
  - Filter ตามประเภท/สถานะ
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 4.2 Create FacilityDetailView
  - แสดงรายละเอียดสถานที่
  - FacilityCalendar + BookingForm
  - _Requirements: 6.1, 2.1_

- [ ] 4.3 Create MyBookingsView
  - แสดง BookingCard grouped by status
  - Tabs: กำลังจะมาถึง, รออนุมัติ, ผ่านมาแล้ว
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4.4 Create BookingManageView (Coach/Admin)
  - แสดงคำขอที่รออนุมัติ
  - ปุ่มอนุมัติ/ปฏิเสธ
  - Modal สำหรับใส่เหตุผลปฏิเสธ
  - แสดงผู้อนุมัติ (admin only)
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

- [ ]* 4.5 Write property test for approver visibility
  - **Property 9: Approver Visibility by Role**
  - **Validates: Requirements 4.5, 4.6**

- [ ] 4.6 Create FacilityManageView (Admin only)
  - CRUD สถานที่
  - จัดการ time slots
  - ปิด/เปิดใช้งานสถานที่
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 4.7 Write property test for facility required fields
  - **Property 10: Facility Required Fields**
  - **Validates: Requirements 5.1**

- [ ]* 4.8 Write property test for deactivated facility
  - **Property 11: Deactivated Facility Booking Prevention**
  - **Validates: Requirements 5.3**

- [ ] 4.9 Checkpoint - Verify views
  - Ensure all tests pass, ask the user if questions arise.

## 5. Routing and Navigation

- [ ] 5.1 Add routes for facility booking
  - /facilities - FacilityListView (all roles)
  - /facilities/:id - FacilityDetailView (all roles)
  - /my-bookings - MyBookingsView (all roles)
  - /booking-manage - BookingManageView (coach, admin)
  - /facility-manage - FacilityManageView (admin only)
  - _Requirements: 1.1, 3.1, 4.1, 5.1_

- [ ] 5.2 Add navigation menu items
  - เพิ่ม "สถานที่" ใน sidebar
  - เพิ่ม "การจองของฉัน" ใน sidebar
  - เพิ่ม "จัดการคำขอ" สำหรับ coach/admin
  - เพิ่ม "จัดการสถานที่" สำหรับ admin
  - _Requirements: 1.1, 3.1, 4.1, 5.1_

## 6. Notifications

- [ ] 6.1 Create notification triggers
  - แจ้งโค้ช/แอดมินเมื่อมีคำขอใหม่
  - แจ้งนักกีฬาเมื่อคำขอถูกอนุมัติ/ปฏิเสธ
  - _Requirements: 2.4, 4.2, 4.3_

- [ ] 6.2 Checkpoint - Verify notifications
  - Ensure all tests pass, ask the user if questions arise.

## 7. Security Verification

- [ ] 7.1 Run security advisors
  - รัน get_advisors เพื่อตรวจสอบ RLS
  - แก้ไข warnings ที่พบ
  - _Requirements: 4.5, 4.6_

- [ ] 7.2 Test with demo accounts
  - ทดสอบด้วย admin@test.com - ดูผู้อนุมัติได้
  - ทดสอบด้วย coach@test.com - ไม่เห็นผู้อนุมัติ
  - ทดสอบด้วย athlete@test.com - จองและยกเลิกได้
  - _Requirements: 4.5, 4.6_

- [ ]* 7.3 Write property test for club filtering
  - **Property 6: Club Filtering for Coach**
  - **Validates: Requirements 4.1**

- [ ]* 7.4 Write property test for pending cancellation
  - **Property 5: Pending Booking Cancellation**
  - **Validates: Requirements 3.3**

- [ ] 7.5 Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

