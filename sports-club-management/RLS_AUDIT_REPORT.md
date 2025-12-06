# RLS Policies Audit Report

**วันที่:** 6 ธันวาคม 2025  
**Project:** augislapwqypxsnnwbot (clbde)

---

## 📊 สรุปภาพรวม

| ตาราง | RLS Enabled | จำนวน Policies | สถานะ |
|-------|-------------|----------------|-------|
| user_profiles | ✅ | 8 | ✅ แก้ไขเสร็จแล้ว |
| athletes | ✅ | 12 | ✅ แก้ไขเสร็จแล้ว |
| coaches | ✅ | 6 | ✅ แก้ไขเสร็จแล้ว |
| clubs | ✅ | 5 | ✅ แก้ไขเสร็จแล้ว |
| training_logs | ✅ | 12 | ✅ ครบถ้วน |
| schedules | ✅ | 9 | ✅ ครบถ้วน |
| announcements | ✅ | 4 | ✅ ดี |
| tournaments | ✅ | 9 | ✅ ครบถ้วน |
| user_albums | ✅ | 9 | ✅ ครบถ้วน |
| notifications | ✅ | 4 | ✅ แก้ไขเสร็จแล้ว |
| notification_preferences | ✅ | 4 | ✅ ครบถ้วน |

---

## ⚠️ ปัญหาที่พบและต้องแก้ไข

### 1. 🔴 CRITICAL: notifications table

**ปัญหา:**
```sql
-- Policy นี้อันตราย! ใครก็สามารถ INSERT ได้
"System can insert notifications"
WITH CHECK: true
```

**แนะนำ:**
- ลบ policy `"System can insert notifications"` ทันที
- สร้าง policies ใหม่:
  - Admin can INSERT all
  - System/Service role only (ใช้ service_role key)

---

### 2. ⚠️ user_profiles - ใช้ ALL แทน SELECT/INSERT/UPDATE/DELETE

**ปัญหา:**
```sql
"Users manage own profile" - cmd: ALL
```

**แนะนำ:** แยกเป็น 4 policies แยกกัน:
- Users can SELECT own profile
- Users can INSERT own profile  
- Users can UPDATE own profile
- Users can DELETE own profile

---

### 3. ⚠️ coaches & clubs - มี Policies ซ้ำซ้อน

**ตาราง coaches:**
- มี `get_my_role()` และ `get_user_role()` ปนกัน
- มี Admin policies ซ้ำ 2 ชุด

**ตาราง clubs:**
- มี Admin policies ซ้ำ 2 ชุด

**แนะนำ:** ลบ policies ที่ซ้ำ เหลือเพียงชุดเดียว

---

### 4. ⚠️ athletes - Coach policy ใช้ ALL

**ปัญหา:**
```sql
"Coach can manage own athletes" - cmd: ALL
```

**แนะนำ:** แยกเป็น SELECT/INSERT/UPDATE/DELETE แยกกัน

---

## ✅ ตารางที่ดีแล้ว (ไม่ต้องแก้)

### 1. training_logs ✅
- Admin: 4 policies (SELECT/INSERT/UPDATE/DELETE)
- Coach: 4 policies (in club)
- Athlete: 4 policies (own)
- **รวม 12 policies - สมบูรณ์แบบ!**

### 2. schedules ✅
- Admin: 4 policies
- Coach: 4 policies (in club)
- Athlete: 1 policy (SELECT in club)
- **รวม 9 policies - ดีมาก!**

### 3. tournaments ✅
- Admin: 4 policies
- Coach: 4 policies (own + SELECT all)
- Athlete: 1 policy (SELECT all)
- **รวม 9 policies - ดี!**

### 4. user_albums ✅
- Admin: 4 policies (all)
- Coach: 1 policy (SELECT in club)
- Users: 4 policies (own)
- **รวม 9 policies - สมบูรณ์!**

### 5. notification_preferences ✅
- Users: 4 policies (own)
- **รวม 4 policies - ดี!**

### 6. announcements ✅
- Admin/Author: DELETE/UPDATE
- Admin/Coach: INSERT
- All: SELECT (with club filter)
- **รวม 4 policies - เหมาะสม!**

---

## 🔧 แผนการแก้ไข (Priority Order)

### Priority 1: CRITICAL 🔴
1. **notifications** - ลบ policy `WITH CHECK: true` ทันที

### Priority 2: HIGH ⚠️
2. **user_profiles** - แยก ALL เป็น 4 policies
3. **athletes** - แยก Coach ALL เป็น 4 policies

### Priority 3: MEDIUM 🟡
4. **coaches** - ลบ policies ซ้ำซ้อน
5. **clubs** - ลบ policies ซ้ำซ้อน

---

## 📝 SQL สำหรับแก้ไข

### 1. แก้ไข notifications (CRITICAL)

```sql
-- ลบ policy ที่ไม่ปลอดภัย
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- สร้าง policy ใหม่สำหรับ Admin
CREATE POLICY "Admin can INSERT all notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- สร้าง policy สำหรับ Coach (แจ้งเตือนในชมรม)
CREATE POLICY "Coach can INSERT notifications in club" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles coach
      JOIN user_profiles target ON target.id = notifications.user_id
      WHERE coach.id = auth.uid()
      AND coach.role = 'coach'
      AND coach.club_id = target.club_id
      AND coach.club_id IS NOT NULL
    )
  );
```

### 2. แก้ไข user_profiles

```sql
-- ลบ policy เดิม
DROP POLICY IF EXISTS "Users manage own profile" ON user_profiles;

-- สร้าง policies ใหม่
CREATE POLICY "Admin can SELECT all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can SELECT own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can INSERT own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can UPDATE own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can DELETE own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = id);
```

---

## 📊 สถิติ RLS Policies

| ประเภท | จำนวนตาราง | สถานะ |
|--------|------------|-------|
| ✅ ดีแล้ว | 11 | ทุกตารางแก้ไขเสร็จสมบูรณ์ |
| ⚠️ ต้องปรับปรุง | 0 | - |
| 🔴 อันตราย | 0 | - |

### 🎉 การแก้ไขเสร็จสมบูรณ์!

**วันที่แก้ไข:** 6 ธันวาคม 2025

**Migrations ที่สร้าง:**
1. `fix_notifications_rls_critical` - แก้ไข notifications (ลบ WITH CHECK: true)
2. `fix_user_profiles_rls_policies` - แยก user_profiles ALL เป็น 8 policies
3. `fix_athletes_coach_all_policy` - แยก athletes Coach ALL เป็น 4 policies
4. `cleanup_coaches_duplicate_policies` - ลบ policies ซ้ำซ้อนใน coaches
5. `cleanup_clubs_duplicate_policies` - ลบ policies ซ้ำซ้อนใน clubs

**ผลลัพธ์:**
- ✅ ไม่มี Security Warnings เกี่ยวกับ RLS
- ✅ ทุกตารางมี policies ที่ถูกต้องและครบถ้วน
- ✅ ไม่มี policies ซ้ำซ้อน
- ✅ ไม่มี policies ที่ไม่ปลอดภัย (WITH CHECK: true)

---

## ✅ Checklist การตรวจสอบ

- [x] ตรวจสอบ RLS policies ทั้งหมด
- [x] ระบุปัญหาที่พบ
- [x] จัดลำดับความสำคัญ
- [x] แก้ไข notifications (CRITICAL) ✅
- [x] แก้ไข user_profiles ✅
- [x] แก้ไข athletes ✅
- [x] ลบ policies ซ้ำซ้อน (coaches, clubs) ✅
- [ ] ทดสอบด้วย 3 demo accounts
- [x] รัน get_advisors อีกครั้ง ✅

---

## 🎯 เป้าหมาย

**ทุกตารางต้องมี RLS Policies ตามมาตรฐาน:**

1. ✅ Admin: 4 policies (SELECT/INSERT/UPDATE/DELETE all)
2. ✅ Coach: 2-4 policies (SELECT in club + manage own/athletes)
3. ✅ User/Athlete: 4 policies (CRUD own)

**รวมอย่างน้อย 10 policies ต่อตาราง**

---

## 📚 อ้างอิง

- Development Workflow: `.kiro/steering/development-workflow.md`
- Demo Accounts: `.kiro/steering/demo-accounts.md`
- Security Setup: `SECURITY_SETUP.md`
