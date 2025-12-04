# แผนงานการพัฒนาฟีเจอร์ (Feature Development Workflow)

## 🚫 ข้อห้ามเด็ดขาด (ABSOLUTE PROHIBITIONS)

```
❌ ห้ามสร้าง Policy แบบ "Anyone can read" หรือ USING (true)
❌ ห้ามใช้ auth.jwt() ->> 'role' (ไม่น่าเชื่อถือ)
❌ ห้ามสร้าง Policy แบบ ALL สำหรับ Admin (ต้องแยก SELECT/INSERT/UPDATE/DELETE)
❌ ห้ามละเลยการตรวจสอบ RLS หลังสร้างตาราง
❌ ห้าม Deploy โดยไม่ทดสอบด้วย 3 demo accounts
❌ ห้ามแก้ไขโค้ดส่วนที่ไม่เกี่ยวข้องกับงานที่ได้รับมอบหมาย
```

---

## 🎯 กฎการพัฒนาแบบเจาะจง (FOCUSED DEVELOPMENT RULE)

**⚠️ บังคับ: การพัฒนาต้องระบุขอบเขตชัดเจนและไม่ยุ่งส่วนที่ไม่เกี่ยวข้อง**

### หลักการ
1. ✅ **ระบุขอบเขตชัดเจน** - ต้องระบุไฟล์/ฟังก์ชันที่จะแก้ไขก่อนเริ่มงาน
2. ✅ **แก้ไขเฉพาะส่วนที่เกี่ยวข้อง** - ห้ามแก้ไขโค้ดที่ไม่เกี่ยวกับ task ปัจจุบัน
3. ✅ **ถามก่อนหากกระทบส่วนอื่น** - หากจำเป็นต้องแก้ไขส่วนอื่น ต้องแจ้งผลกระทบและขออนุมัติก่อน

### เมื่อต้องแก้ไขส่วนที่ไม่เกี่ยวข้อง ต้อง:
```
1. 🔍 ระบุว่าส่วนไหนที่ต้องแก้ไขเพิ่มเติม
2. 📋 อธิบายเหตุผลว่าทำไมต้องแก้ไข
3. ⚠️ แจ้งผลกระทบที่อาจเกิดขึ้น
4. ✋ รอการอนุมัติจาก user ก่อนดำเนินการ
```

### ตัวอย่าง
```
❌ ผิด: ได้รับมอบหมายให้แก้ไข UI แต่ไปแก้ไข database schema ด้วย
❌ ผิด: ได้รับมอบหมายให้เพิ่มฟีเจอร์ A แต่ไป refactor ฟีเจอร์ B ด้วย
❌ ผิด: แก้ไขไฟล์ที่ไม่ได้ระบุใน task โดยไม่ถามก่อน

✅ ถูก: แก้ไขเฉพาะไฟล์ที่ระบุใน task
✅ ถูก: พบว่าต้องแก้ไขส่วนอื่น → แจ้ง user → รอการอนุมัติ → ดำเนินการ
✅ ถูก: ระบุขอบเขตการแก้ไขก่อนเริ่มงาน
```

---

## ⚠️ กฎบังคับ (MANDATORY RULES)

**ห้ามพัฒนาฟีเจอร์ใดๆ โดยไม่ครบตามเงื่อนไขต่อไปนี้:**

1. ✅ ต้องครบทุก **5 ระดับเทคนิค**: Database → Store → UI → Routing → Security
2. ✅ ต้องครบทุก **3 บริบท Role**: Admin, Coach, Athlete
3. ✅ ต้องระบุ **Role Matrix** ว่าใครทำอะไรได้ (ดู/สร้าง/แก้ไข/ลบ)
4. ✅ ต้องตั้งค่า **RLS Policies ครบทุก Role** ตาม Template ด้านล่าง (อย่างน้อย 10 policies)
5. ✅ ต้องรัน **get_advisors** หลังสร้าง/แก้ไข Table
6. ✅ ต้องตรวจสอบ policies ด้วย SQL query หลังสร้าง

---

## 🚨 RLS Policy Template (บังคับใช้ทุกตาราง)

**ทุกตารางที่สร้างใหม่ต้องมี RLS Policies ครบ 3 กลุ่มนี้:**

### 1. Admin Policies (บังคับ)
```sql
-- Admin ต้องเข้าถึงได้ทั้งหมดเสมอ
CREATE POLICY "Admin can SELECT all" ON [table_name]
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can INSERT all" ON [table_name]
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can UPDATE all" ON [table_name]
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can DELETE all" ON [table_name]
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### 2. Coach Policies (ตามบริบท)
```sql
-- Coach ดูข้อมูลในชมรมเดียวกัน (ผ่าน club_id)
CREATE POLICY "Coach can SELECT in club" ON [table_name]
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles coach
      JOIN user_profiles owner ON owner.id = [table_name].user_id
      WHERE coach.id = auth.uid()
      AND coach.role = 'coach'
      AND coach.club_id = owner.club_id
      AND coach.club_id IS NOT NULL
    )
  );

-- Coach จัดการข้อมูลตัวเองได้
CREATE POLICY "Coach can manage own" ON [table_name]
  FOR ALL USING (auth.uid() = user_id);
```

### 3. Athlete/User Policies (บังคับ)
```sql
-- User จัดการข้อมูลตัวเองได้
CREATE POLICY "Users can SELECT own" ON [table_name]
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can INSERT own" ON [table_name]
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can UPDATE own" ON [table_name]
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can DELETE own" ON [table_name]
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 📋 Role Matrix Template (บังคับระบุในทุก Spec)

**ทุกฟีเจอร์ต้องมี Role Matrix นี้ใน design.md:**

| การกระทำ | Admin | Coach | Athlete |
|----------|-------|-------|---------|
| ดูทั้งหมด | ✅ | ❌ | ❌ |
| ดูในชมรม | ✅ | ✅ | ❌ |
| ดูตัวเอง | ✅ | ✅ | ✅ |
| สร้างทั้งหมด | ✅ | ❌ | ❌ |
| สร้างตัวเอง | ✅ | ✅ | ✅ |
| แก้ไขทั้งหมด | ✅ | ❌ | ❌ |
| แก้ไขตัวเอง | ✅ | ✅ | ✅ |
| ลบทั้งหมด | ✅ | ❌ | ❌ |
| ลบตัวเอง | ✅ | ✅ | ✅ |

---

## 🔒 Role Permissions Summary

```
┌─────────────────────────────────────────────────────────┐
│  👑 ADMIN (ผู้ดูแลระบบ)                                  │
│     - SELECT/INSERT/UPDATE/DELETE ทุกข้อมูล             │
│     - ไม่มีข้อจำกัด                                      │
│     - RLS: role = 'admin'                              │
├─────────────────────────────────────────────────────────┤
│  🏅 COACH (โค้ช)                                        │
│     - SELECT ข้อมูลในชมรมเดียวกัน (club_id)             │
│     - CRUD ข้อมูลตัวเอง (user_id = auth.uid())         │
│     - RLS: club_id match หรือ user_id match            │
├─────────────────────────────────────────────────────────┤
│  🏃 ATHLETE (นักกีฬา)                                   │
│     - CRUD เฉพาะข้อมูลตัวเอง                            │
│     - RLS: user_id = auth.uid()                        │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist การพัฒนาฟีเจอร์ (บังคับทำครบ)

```markdown
## ฟีเจอร์: [ชื่อฟีเจอร์]

### 1. Database
- [ ] ออกแบบ Schema
- [ ] สร้าง Migration
- [ ] ⚠️ RLS Policy: Admin (SELECT/INSERT/UPDATE/DELETE all)
- [ ] ⚠️ RLS Policy: Coach (SELECT in club, CRUD own)
- [ ] ⚠️ RLS Policy: Athlete (CRUD own)
- [ ] ทดสอบ Query ด้วยแต่ละ Role

### 2. Store
- [ ] เพิ่ม State
- [ ] เพิ่ม Actions (CRUD)
- [ ] เพิ่ม Getters
- [ ] Error Handling

### 3. UI
- [ ] สร้าง View Component
- [ ] ใช้ Design Theme (ขาว-ดำ, SVG icons)
- [ ] Responsive Design
- [ ] Loading States
- [ ] ⚠️ แสดง/ซ่อน UI ตาม Role

### 4. Routing
- [ ] เพิ่ม Route
- [ ] ตั้งค่า Meta (auth, roles)
- [ ] เพิ่มใน Navigation

### 5. Security
- [ ] รัน get_advisors
- [ ] ⚠️ ตรวจสอบ RLS ครบทุก Role
- [ ] Validate Inputs
- [ ] ทดสอบด้วย account: admin@test.com, coach@test.com, athlete@test.com
```

---

## 🧪 การทดสอบ Role-Based Access

**ก่อน deploy ต้องทดสอบด้วย 3 accounts:**

| Account | Password | ทดสอบ |
|---------|----------|-------|
| admin@test.com | password123 | ดู/จัดการได้ทั้งหมด |
| coach@test.com | password123 | ดูในชมรม, จัดการตัวเอง |
| athlete@test.com | password123 | ดู/จัดการเฉพาะตัวเอง |

---

## 📝 ตัวอย่าง RLS สำหรับตาราง user_albums

```sql
-- Enable RLS
ALTER TABLE user_albums ENABLE ROW LEVEL SECURITY;

-- 1. Admin Policies
CREATE POLICY "Admin can SELECT all albums" ON user_albums
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can INSERT all albums" ON user_albums
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can UPDATE all albums" ON user_albums
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can DELETE all albums" ON user_albums
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Coach Policies
CREATE POLICY "Coach can SELECT albums in club" ON user_albums
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles coach
      JOIN user_profiles owner ON owner.id = user_albums.user_id
      WHERE coach.id = auth.uid()
      AND coach.role = 'coach'
      AND coach.club_id = owner.club_id
      AND coach.club_id IS NOT NULL
    )
  );

-- 3. User Policies (Owner)
CREATE POLICY "Users can SELECT own albums" ON user_albums
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can INSERT own albums" ON user_albums
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can UPDATE own albums" ON user_albums
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can DELETE own albums" ON user_albums
  FOR DELETE USING (auth.uid() = user_id);
```

---

## ⚡ Quick Reference

**เมื่อสร้างตารางใหม่ ต้องมี RLS อย่างน้อย:**
1. ✅ Admin SELECT/INSERT/UPDATE/DELETE all (4 policies)
2. ✅ Coach SELECT in club + manage own athletes (2 policies)
3. ✅ User SELECT/INSERT/UPDATE/DELETE own (4 policies)

**รวม: 10 RLS policies ต่อตาราง (minimum)**

---

## 🔍 SQL สำหรับตรวจสอบ RLS Policies

**ใช้คำสั่งนี้ตรวจสอบหลังสร้าง/แก้ไข policies:**

```sql
-- ตรวจสอบ policies ของตาราง
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = '[table_name]'
ORDER BY policyname;

-- ตรวจสอบว่า RLS เปิดอยู่
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = '[table_name]';
```

---

## ⚠️ RLS Audit Checklist (ต้องตรวจทุกครั้ง)

หลังสร้าง/แก้ไข RLS policies ต้องตรวจสอบ:

- [ ] ไม่มี policy ที่ใช้ `USING (true)` หรือ `WITH CHECK (true)`
- [ ] ไม่มี policy ที่ใช้ `auth.jwt() ->> 'role'`
- [ ] Admin มีครบ 4 policies (SELECT/INSERT/UPDATE/DELETE)
- [ ] Coach มี SELECT in club + manage own
- [ ] User มีครบ 4 policies สำหรับข้อมูลตัวเอง
- [ ] ทุก policy ใช้ `EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() ...)`
- [ ] รัน `get_advisors` ไม่มี security warnings เกี่ยวกับ RLS

---

## 📊 ตารางที่ต้องมี RLS (Reference)

| ตาราง | RLS | Policies | สถานะ |
|-------|-----|----------|-------|
| athletes | ✅ | 10 | ✅ แก้ไขแล้ว |
| coaches | ✅ | ต้องตรวจสอบ | ⚠️ |
| clubs | ✅ | ต้องตรวจสอบ | ⚠️ |
| training_logs | ✅ | ต้องตรวจสอบ | ⚠️ |
| schedules | ✅ | ต้องตรวจสอบ | ⚠️ |
| announcements | ✅ | ต้องตรวจสอบ | ⚠️ |
| tournaments | ✅ | ต้องตรวจสอบ | ⚠️ |
| user_profiles | ✅ | ต้องตรวจสอบ | ⚠️ |
| user_albums | ✅ | ต้องตรวจสอบ | ⚠️ |
| notifications | ✅ | ต้องตรวจสอบ | ⚠️ |
