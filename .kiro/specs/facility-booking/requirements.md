# Requirements Document

## Introduction

ระบบขอใช้สถานที่ (Facility Booking) สำหรับให้นักกีฬาสามารถขอจองใช้สถานที่ฝึกซ้อมของสโมสร เช่น สนามกีฬา ห้องฟิตเนส ลู่วิ่ง ฯลฯ โดยโค้ชหรือแอดมินจะเป็นผู้อนุมัติคำขอ ระบบออกแบบให้ใช้งานง่าย เข้าใจได้ใน 3 วินาที

## Glossary

- **Facility (สถานที่)**: สถานที่หรืออุปกรณ์ที่สามารถจองใช้งานได้ เช่น สนามฟุตบอล ห้องฟิตเนส ลู่วิ่ง
- **Booking (การจอง)**: คำขอใช้สถานที่จากนักกีฬา
- **Time Slot (ช่วงเวลา)**: ช่วงเวลาที่สามารถจองได้
- **Booking Status (สถานะการจอง)**: pending (รออนุมัติ), approved (อนุมัติ), rejected (ปฏิเสธ), cancelled (ยกเลิก)
- **System**: ระบบขอใช้สถานที่

## Requirements

### Requirement 1

**User Story:** As an athlete, I want to view available facilities, so that I can choose which facility to book.

#### Acceptance Criteria

1. WHEN an athlete opens the facility booking page THEN the System SHALL display a list of all available facilities with name, image, and availability status
2. WHEN a facility is fully booked for today THEN the System SHALL display a "เต็ม" badge on that facility card
3. WHEN a facility has available slots THEN the System SHALL display the number of available slots for today

### Requirement 2

**User Story:** As a user, I want to create a booking request, so that I can reserve a facility for my training or activities.

#### Acceptance Criteria

1. WHEN an athlete selects a facility and chooses a date and time slot THEN the System SHALL create a booking request with status "pending"
2. WHEN an admin or coach selects a facility and chooses a date and time slot THEN the System SHALL create a booking with status "approved" automatically (auto-approval)
3. WHEN an admin or coach booking is auto-approved THEN the System SHALL record the approver_id and approved_at timestamp
4. WHEN a user submits a booking request THEN the System SHALL validate that the time slot is not already booked
5. IF a user attempts to book an already reserved time slot THEN the System SHALL display an error message and prevent the booking
6. WHEN an athlete booking is created THEN the System SHALL send a notification to coaches and admins

### Requirement 3

**User Story:** As an athlete, I want to view my booking history, so that I can track my past and upcoming reservations.

#### Acceptance Criteria

1. WHEN an athlete views their bookings THEN the System SHALL display bookings grouped by status (upcoming, pending, past)
2. WHEN displaying a booking THEN the System SHALL show facility name, date, time, and status with clear visual indicators
3. WHEN a booking is pending THEN the System SHALL allow the athlete to cancel it

### Requirement 4

**User Story:** As a coach, I want to approve or reject booking requests, so that I can manage facility usage.

#### Acceptance Criteria

1. WHEN a coach views pending bookings THEN the System SHALL display all pending requests for their club
2. WHEN a coach approves a booking THEN the System SHALL update the status to "approved", record the approver's ID and timestamp, and notify the athlete
3. WHEN a coach rejects a booking THEN the System SHALL require a reason, record the rejector's ID and timestamp, update the status to "rejected", and notify the athlete
4. WHEN a booking is approved THEN the System SHALL block that time slot from other bookings
5. WHEN an admin views booking details THEN the System SHALL display which coach approved or rejected the booking with timestamp
6. WHEN a coach or athlete views booking details THEN the System SHALL hide the approver information (only admin can see)

### Requirement 5

**User Story:** As an admin, I want to manage facilities, so that I can add, edit, or remove bookable facilities.

#### Acceptance Criteria

1. WHEN an admin creates a facility THEN the System SHALL require name, description, capacity, and available time slots
2. WHEN an admin edits a facility THEN the System SHALL update the facility information without affecting existing bookings
3. WHEN an admin deactivates a facility THEN the System SHALL prevent new bookings but keep existing approved bookings

### Requirement 6

**User Story:** As a user, I want to see a calendar view of facility availability, so that I can quickly find available time slots.

#### Acceptance Criteria

1. WHEN viewing a facility's calendar THEN the System SHALL display a weekly view with time slots color-coded by availability
2. WHEN a time slot is available THEN the System SHALL display it in white/light color
3. WHEN a time slot is booked THEN the System SHALL display it in gray with the booker's name
4. WHEN a time slot is pending THEN the System SHALL display it in yellow

### Requirement 7

**User Story:** As an athlete, I want to create recurring bookings, so that I can reserve the same time slot for multiple weeks without repeating the process.

#### Acceptance Criteria

1. WHEN an athlete creates a booking THEN the System SHALL provide an option to make it recurring (weekly)
2. WHEN an athlete selects recurring booking THEN the System SHALL allow selecting the number of weeks (2-8 weeks)
3. WHEN a recurring booking is submitted THEN the System SHALL create individual booking requests for each week
4. IF any time slot in the recurring series is already booked THEN the System SHALL display a warning and allow the athlete to skip that slot
5. WHEN a coach approves a recurring booking THEN the System SHALL approve all pending bookings in the series
6. WHEN an athlete cancels a recurring booking THEN the System SHALL provide options to cancel single occurrence or entire series

