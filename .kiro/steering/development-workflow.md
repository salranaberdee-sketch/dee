# แผนงานการพัฒนาฟีเจอร์ (Feature Development Workflow)

## กฎการทำงาน (RULES)

**ห้ามพัฒนาฟีเจอร์ใดๆ โดยไม่ครบตามเงื่อนไขต่อไปนี้:**

1. ✅ ต้องครบทุก **5 ระดับเทคนิค**: Database → Store → UI → Routing → Security
2. ✅ ต้องครบทุก **4 บริบท Role**: Admin, Club, Coach, Athlete
3. ✅ ต้องระบุ **Role Matrix** ว่าใครทำอะไรได้
4. ✅ ต้องตั้งค่า **RLS Policies** ให้ถูกต้องตาม Role
5. ✅ ต้องรัน **get_advisors** หลังสร้าง/แก้ไข Table

---

## หลักการ: 1 ฟีเจอร์ = ครบทุกระดับ

เมื่อพัฒนาฟีเจอร์ใหม่ ต้องดำเนินการครบทุกระดับต่อไปนี้:

### ระดับที่ต้องพัฒนา

```
┌─────────────────────────────────────────────────────────┐
│  1. DATABASE (Supabase)                                 │
│     - สร้าง/แก้ไข Table Schema                          │
│     - ตั้งค่า RLS Policies                              │
│     - สร้าง Migration                                   │
├─────────────────────────────────────────────────────────┤
│  2. STORE (Pinia)                                       │
│     - เพิ่ม state, getters, actions                     │
│     - เชื่อมต่อ Supabase client                         │
│     - จัดการ error handling                             │
├─────────────────────────────────────────────────────────┤
│  3. UI COMPONENTS (Vue)                                 │
│     - สร้าง/แก้ไข Views                                 │
│     - ปรับ Navigation (ถ้าจำเป็น)                       │
│     - ใช้ Design Theme ที่กำหนด                         │
├─────────────────────────────────────────────────────────┤
│  4. ROUTING                                             │
│     - เพิ่ม routes ใหม่                                 │
│     - ตั้งค่า guards/permissions                        │
├─────────────────────────────────────────────────────────┤
│  5. SECURITY & VALIDATION                               │
│     - ตรวจสอบ RLS policies                              │
│     - รัน get_advisors                                  │
│     - Validate input/output                             │
└─────────────────────────────────────────────────────────┘
```

### Checklist การพัฒนาฟีเจอร์

```markdown
## ฟีเจอร์: [ชื่อฟีเจอร์]

### 1. Database
- [ ] ออกแบบ Schema
- [ ] สร้าง Migration
- [ ] ตั้งค่า RLS
- [ ] ทดสอบ Query

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

### 4. Routing
- [ ] เพิ่ม Route
- [ ] ตั้งค่า Meta (auth, roles)
- [ ] เพิ่มใน Navigation

### 5. Security
- [ ] รัน get_advisors
- [ ] ตรวจสอบ Permissions
- [ ] Validate Inputs
```

### ลำดับการพัฒนา

1. **Database First** - สร้าง schema และ migration ก่อน
2. **Store Second** - เชื่อมต่อ data layer
3. **UI Third** - สร้าง interface
4. **Integration** - เชื่อมทุกส่วนเข้าด้วยกัน
5. **Security Check** - ตรวจสอบความปลอดภัย

---

## หลักการ: 1 ฟีเจอร์ = ครบทุกบริบท (Role-Based)

ทุกฟีเจอร์ต้องพิจารณาการใช้งานของทุก Role:

```
┌─────────────────────────────────────────────────────────┐
│  👑 ADMIN (ผู้ดูแลระบบ)                                  │
│     - เห็นข้อมูลทั้งหมดในระบบ                            │
│     - จัดการได้ทุกอย่าง (CRUD ทั้งหมด)                   │
│     - ดูรายงานภาพรวม                                    │
├─────────────────────────────────────────────────────────┤
│  🏢 CLUB (ชมรม)                                         │
│     - ข้อมูลแยกตามชมรม                                  │
│     - RLS filter by club_id                            │
├─────────────────────────────────────────────────────────┤
│  🏅 COACH (โค้ช)                                        │
│     - เห็นเฉพาะนักกีฬาในสังกัด                          │
│     - จัดการนัดหมาย/บันทึกของทีมตัวเอง                  │
│     - ไม่เห็นข้อมูลโค้ชคนอื่น                           │
├─────────────────────────────────────────────────────────┤
│  🏃 ATHLETE (นักกีฬา)                                   │
│     - เห็นเฉพาะข้อมูลตัวเอง                             │
│     - ดูนัดหมายของทีม                                   │
│     - บันทึกการฝึกซ้อมของตัวเอง                         │
└─────────────────────────────────────────────────────────┘
```

### Role-Based Checklist

```markdown
## ฟีเจอร์: [ชื่อฟีเจอร์]

### การเข้าถึงตาม Role
- [ ] Admin: [ระบุสิ่งที่ทำได้]
- [ ] Coach: [ระบุสิ่งที่ทำได้]
- [ ] Athlete: [ระบุสิ่งที่ทำได้]

### RLS Policies
- [ ] Admin: SELECT/INSERT/UPDATE/DELETE all
- [ ] Coach: filter by coach_id or club_id
- [ ] Athlete: filter by athlete_id

### UI แยกตาม Role
- [ ] Admin View: แสดงข้อมูลทั้งหมด + ตัวกรอง
- [ ] Coach View: แสดงเฉพาะทีมตัวเอง
- [ ] Athlete View: แสดงเฉพาะข้อมูลส่วนตัว

### Navigation
- [ ] เพิ่มเมนูตาม roles ที่เข้าถึงได้
```

### ตัวอย่าง Role Matrix

| ฟีเจอร์ | Admin | Coach | Athlete |
|---------|-------|-------|---------|
| ดูชมรมทั้งหมด | ✅ | ❌ | ❌ |
| จัดการชมรม | ✅ | ❌ | ❌ |
| ดูโค้ชทั้งหมด | ✅ | ❌ | ❌ |
| จัดการโค้ช | ✅ | ❌ | ❌ |
| ดูนักกีฬา | ✅ ทั้งหมด | ✅ ในทีม | ✅ ตัวเอง |
| จัดการนักกีฬา | ✅ | ✅ ในทีม | ❌ |
| ดูนัดหมาย | ✅ ทั้งหมด | ✅ ของทีม | ✅ ของทีม |
| สร้างนัดหมาย | ✅ | ✅ | ❌ |
| บันทึกฝึกซ้อม | ✅ | ✅ | ✅ ตัวเอง |
| สำรองข้อมูล | ✅ | ❌ | ❌ |

### ตัวอย่างการเพิ่มฟีเจอร์ "จัดการอุปกรณ์กีฬา"

```
1. Database:
   - CREATE TABLE equipment (id, name, club_id, quantity, status)
   - RLS: club members can view their club's equipment

2. Store:
   - equipment state
   - addEquipment(), updateEquipment(), deleteEquipment()
   - getEquipmentByClub getter

3. UI:
   - Equipment.vue (list, add, edit, delete)
   - ใช้ card-icon แบบ SVG
   - ปุ่มดำ-ขาว ตาม design theme

4. Routing:
   - /equipment route
   - roles: ['admin', 'coach']

5. Security:
   - รัน mcp_supabase_get_advisors
   - ตรวจสอบ RLS ครอบคลุม
```
