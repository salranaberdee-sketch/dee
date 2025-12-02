# แผนงานการพัฒนาฟีเจอร์ (Feature Development Workflow)

## ⚠️ กฎบังคับ (MANDATORY RULES)

**ห้ามพัฒนาฟีเจอร์ใดๆ โดยไม่ครบตามเงื่อนไขต่อไปนี้:**

1. ✅ ต้องครบทุก **5 ระดับเทคนิค**: Database → Store → UI → Routing → Security
2. ✅ ต้องครบทุก **3 บริบท Role**: Admin, Coach, Athlete
3. ✅ ต้องระบุ **Role Matrix** ว่าใครทำอะไรได้ (ดู/สร้าง/แก้ไข/ลบ)
4. ✅ ต้องตั้งค่า **RLS Policies ครบทุก Role** ตาม Template ด้านล่าง
5. ✅ ต้องรัน **get_advisors** หลังสร้าง/แก้ไข Table

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
2. ✅ Coach SELECT in club (1 policy)
3. ✅ User SELECT/INSERT/UPDATE/DELETE own (4 policies)

**รวม: 9 RLS policies ต่อตาราง (minimum)**
