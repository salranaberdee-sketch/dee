# Requirements Document

## Introduction

การอัพเกรดเทคโนโลยี Supabase เพื่อเพิ่มประสิทธิภาพ ลดต้นทุน และปรับปรุง scalability ของระบบ Sports Club Management โดยเปลี่ยนจาก Postgres Changes เป็น Realtime Broadcast, เพิ่ม Storage optimizations, และเพิ่ม Edge Functions สำหรับ complex logic

## Glossary

- **Realtime Broadcast**: ระบบส่งข้อความแบบ real-time ผ่าน WebSocket ที่ scalable กว่า Postgres Changes
- **Postgres Changes**: ระบบ subscribe การเปลี่ยนแปลงของ database โดยตรง (วิธีเดิม)
- **Storage Image Transformations**: การปรับขนาดและ optimize รูปภาพอัตโนมัติตอน serve
- **Smart CDN**: Content Delivery Network ที่มี auto-revalidation และ cache optimization
- **Edge Functions**: Serverless functions ที่รันใกล้ user เพื่อลด latency
- **Database Trigger**: Function ที่ทำงานอัตโนมัติเมื่อมีการเปลี่ยนแปลงใน database
- **RLS (Row Level Security)**: ระบบควบคุมการเข้าถึงข้อมูลระดับแถว

## Requirements

### Requirement 1

**User Story:** ในฐานะ developer ฉันต้องการเปลี่ยนจาก Postgres Changes เป็น Realtime Broadcast เพื่อให้ระบบ notifications มี scalability ที่ดีขึ้น

#### Acceptance Criteria

1. WHEN มีการเปลี่ยนแปลงใน notifications table THEN ระบบ SHALL broadcast ข้อความผ่าน realtime.broadcast_changes()
2. WHEN user subscribe ไปยัง notification channel THEN ระบบ SHALL ใช้ Realtime Authorization ผ่าน RLS policies
3. WHEN broadcast message ถูกส่ง THEN ระบบ SHALL รวมข้อมูล event type, table name, และ record changes
4. WHEN user ไม่มีสิทธิ์เข้าถึง THEN ระบบ SHALL ปฏิเสธการ subscribe ผ่าน RLS policy
5. WHEN client subscribe สำเร็จ THEN ระบบ SHALL ส่ง messages แบบ real-time ผ่าน WebSocket

### Requirement 2

**User Story:** ในฐานะ developer ฉันต้องการใช้ Storage Image Transformations เพื่อลด storage costs และปรับปรุง performance

#### Acceptance Criteria

1. WHEN รูปภาพถูก request THEN ระบบ SHALL สามารถ resize อัตโนมัติตาม parameters ที่กำหนด
2. WHEN thumbnail ถูก request THEN ระบบ SHALL generate ขนาด 300x300 pixels แบบ cover
3. WHEN medium size ถูก request THEN ระบบ SHALL generate ขนาด 800x800 pixels
4. WHEN original image ไม่มี THEN ระบบ SHALL return error 404
5. WHEN transformation parameters ไม่ถูกต้อง THEN ระบบ SHALL return original image

### Requirement 3

**User Story:** ในฐานะ developer ฉันต้องการเปิดใช้ Smart CDN เพื่อลด egress costs และเพิ่ม cache hit rate

#### Acceptance Criteria

1. WHEN ไฟล์ถูก upload THEN ระบบ SHALL ตั้ง cache-control header เป็น 86400 seconds (24 ชั่วโมง)
2. WHEN ไฟล์ถูก request ครั้งแรก THEN ระบบ SHALL cache ที่ CDN edge locations
3. WHEN ไฟล์ถูก request ครั้งต่อไป THEN ระบบ SHALL serve จาก cache
4. WHEN ไฟล์ถูก update THEN ระบบ SHALL invalidate cache อัตโนมัติ
5. WHEN cache hit เกิดขึ้น THEN ระบบ SHALL ลด egress costs

### Requirement 4

**User Story:** ในฐานะ developer ฉันต้องการสร้าง Edge Function สำหรับ generate tournament brackets เพื่อไม่ให้ logic ซับซ้อนอยู่ใน client

#### Acceptance Criteria

1. WHEN tournament ถูกสร้าง THEN ระบบ SHALL สามารถเรียก Edge Function เพื่อ generate bracket
2. WHEN Edge Function ทำงาน THEN ระบบ SHALL validate tournament data ก่อน generate
3. WHEN bracket ถูก generate THEN ระบบ SHALL save ลง database อัตโนมัติ
4. WHEN Edge Function error THEN ระบบ SHALL return error message ที่ชัดเจน
5. WHEN Edge Function สำเร็จ THEN ระบบ SHALL return bracket data กลับไปยัง client

### Requirement 5

**User Story:** ในฐานะ developer ฉันต้องการสร้าง Edge Function สำหรับ calculate complex statistics เพื่อลด load บน client และ database

#### Acceptance Criteria

1. WHEN statistics ถูก request THEN ระบบ SHALL เรียก Edge Function เพื่อคำนวณ
2. WHEN Edge Function ทำงาน THEN ระบบ SHALL query ข้อมูลจาก database อย่างมีประสิทธิภาพ
3. WHEN calculation เสร็จสิ้น THEN ระบบ SHALL return JSON response พร้อม statistics
4. WHEN data ไม่เพียงพอ THEN ระบบ SHALL return partial results พร้อม warning
5. WHEN Edge Function timeout THEN ระบบ SHALL return cached results ถ้ามี

### Requirement 6

**User Story:** ในฐานะ developer ฉันต้องการสร้าง Database Webhooks เพื่อส่ง notifications ไปยัง external services อัตโนมัติ

#### Acceptance Criteria

1. WHEN tournament ใหม่ถูกสร้าง THEN ระบบ SHALL ส่ง webhook ไปยัง external notification service
2. WHEN webhook ถูกส่ง THEN ระบบ SHALL ใช้ pg_net extension แบบ async
3. WHEN webhook สำเร็จ THEN ระบบ SHALL log success status
4. WHEN webhook ล้มเหลว THEN ระบบ SHALL retry ตาม configuration
5. WHEN webhook timeout THEN ระบบ SHALL ไม่ block database operations

### Requirement 7

**User Story:** ในฐานะ developer ฉันต้องการสร้าง Event Trigger เพื่อ auto-enable RLS บนตารางใหม่ทุกตาราง

#### Acceptance Criteria

1. WHEN ตารางใหม่ถูกสร้างใน public schema THEN ระบบ SHALL enable RLS อัตโนมัติ
2. WHEN RLS ถูก enable THEN ระบบ SHALL log การเปลี่ยนแปลง
3. WHEN ตารางอยู่ใน system schema THEN ระบบ SHALL skip การ enable RLS
4. WHEN Event Trigger error THEN ระบบ SHALL log error แต่ไม่ block table creation
5. WHEN ตารางถูกสร้างสำเร็จ THEN ระบบ SHALL มี RLS enabled

### Requirement 8

**User Story:** ในฐานะ developer ฉันต้องการ migrate existing notifications จาก Postgres Changes เป็น Broadcast โดยไม่กระทบ users

#### Acceptance Criteria

1. WHEN migration เริ่มต้น THEN ระบบ SHALL รองรับทั้ง Postgres Changes และ Broadcast พร้อมกัน
2. WHEN client ใหม่ connect THEN ระบบ SHALL ใช้ Broadcast
3. WHEN client เก่า connect THEN ระบบ SHALL ยังใช้ Postgres Changes ได้
4. WHEN migration เสร็จสิ้น THEN ระบบ SHALL ปิด Postgres Changes
5. WHEN rollback จำเป็น THEN ระบบ SHALL สามารถกลับไปใช้ Postgres Changes ได้

### Requirement 9

**User Story:** ในฐานะ developer ฉันต้องการ optimize Storage queries เพื่อลด latency เมื่อ list objects จำนวนมาก

#### Acceptance Criteria

1. WHEN list objects ถูกเรียก THEN ระบบ SHALL ใช้ custom Postgres function แทน default list()
2. WHEN pagination ถูกใช้ THEN ระบบ SHALL support limit และ offset parameters
3. WHEN query ทำงาน THEN ระบบ SHALL ไม่คำนวณ folder hierarchy
4. WHEN results ถูก return THEN ระบบ SHALL รวม metadata ของแต่ละ object
5. WHEN query มี prefix filter THEN ระบบ SHALL ใช้ index เพื่อเพิ่มความเร็ว

### Requirement 10

**User Story:** ในฐานะ developer ฉันต้องการ monitoring และ logging เพื่อ track performance ของ Supabase features ใหม่

#### Acceptance Criteria

1. WHEN Broadcast message ถูกส่ง THEN ระบบ SHALL log event type และ timestamp
2. WHEN Edge Function ทำงาน THEN ระบบ SHALL log execution time และ memory usage
3. WHEN Storage transformation ถูกใช้ THEN ระบบ SHALL log transformation parameters
4. WHEN error เกิดขึ้น THEN ระบบ SHALL log error details พร้อม stack trace
5. WHEN performance issue ถูกตรวจพบ THEN ระบบ SHALL alert ผ่าน logging system
