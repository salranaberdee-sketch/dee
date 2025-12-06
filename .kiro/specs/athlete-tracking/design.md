# Design Document: Athlete Tracking

## Overview

ระบบ Athlete Tracking เป็นฟีเจอร์สำหรับติดตามค่าตัวเลขของนักกีฬาที่ยืดหยุ่น รองรับการกำหนดฟิลด์เอง (Custom Fields) และเป้าหมายรายบุคคล ออกแบบให้ทำงานร่วมกับระบบที่มีอยู่ (Training Plans, Training Logs, Athlete Evaluation) โดยไม่กระทบฟีเจอร์เดิม

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Vue.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  TrackingPlansView.vue    │  TrackingDetailView.vue             │
│  - รายการแผนติดตาม         │  - รายละเอียดแผน + นักกีฬา          │
│  - สร้าง/แก้ไขแผน          │  - บันทึกค่า + ดูกราฟ               │
├─────────────────────────────────────────────────────────────────┤
│                     Pinia Store (tracking.js)                   │
│  - plans, athletes, logs, goals                                 │
│  - CRUD operations + progress calculations                      │
├─────────────────────────────────────────────────────────────────┤
│                      Supabase Backend                           │
│  - tracking_plans, tracking_fields                              │
│  - tracking_athlete_goals, tracking_logs                        │
│  - RLS Policies (Admin/Coach/Athlete)                           │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Vue Components

```
src/views/
├── TrackingPlansView.vue      # รายการแผนติดตามทั้งหมด
├── TrackingDetailView.vue     # รายละเอียดแผน + จัดการนักกีฬา
└── AthleteTrackingView.vue    # มุมมองนักกีฬา (ดูข้อมูลตัวเอง)

src/components/tracking/
├── TrackingPlanModal.vue      # Modal สร้าง/แก้ไขแผน
├── TrackingFieldEditor.vue    # จัดการฟิลด์ในแผน
├── AthleteGoalModal.vue       # Modal ตั้งเป้าหมายนักกีฬา
├── TrackingLogForm.vue        # ฟอร์มบันทึกค่า
├── ProgressChart.vue          # กราฟความคืบหน้า
└── ProgressCard.vue           # การ์ดแสดงสถานะความคืบหน้า
```

### Pinia Store Interface

```typescript
// stores/tracking.js
interface TrackingStore {
  // State
  plans: TrackingPlan[]
  currentPlan: TrackingPlan | null
  athletes: TrackingAthlete[]
  logs: TrackingLog[]
  
  // Getters
  activePlans: TrackingPlan[]
  athleteProgress(athleteId: string, fieldId: string): ProgressData
  
  // Actions
  fetchPlans(): Promise<void>
  fetchPlanDetail(planId: string): Promise<void>
  createPlan(plan: CreatePlanInput): Promise<Result>
  updatePlan(planId: string, data: UpdatePlanInput): Promise<Result>
  deletePlan(planId: string): Promise<Result>
  
  addAthleteToPlan(planId: string, athleteId: string, goals: Goal[]): Promise<Result>
  updateAthleteGoals(planId: string, athleteId: string, goals: Goal[]): Promise<Result>
  removeAthleteFromPlan(planId: string, athleteId: string): Promise<Result>
  
  createLog(log: CreateLogInput): Promise<Result>
  updateLog(logId: string, values: LogValues): Promise<Result>
  
  calculateProgress(athleteId: string, fieldId: string): ProgressData
}
```

## Data Models

### Database Schema

```sql
-- แผนติดตาม
CREATE TABLE tracking_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  plan_type VARCHAR(50) NOT NULL, -- weight_control, timing, strength, general
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ฟิลด์ที่ติดตาม
CREATE TABLE tracking_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tracking_plans(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  field_type VARCHAR(20) NOT NULL, -- number, time, reps, distance, text, select
  unit VARCHAR(20), -- kg, %, cm, m, min:sec
  is_required BOOLEAN DEFAULT false,
  options JSONB, -- สำหรับ field_type = 'select'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- เป้าหมายนักกีฬา
CREATE TABLE tracking_athlete_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tracking_plans(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES user_profiles(id),
  field_id UUID NOT NULL REFERENCES tracking_fields(id) ON DELETE CASCADE,
  initial_value DECIMAL(10,2),
  target_value DECIMAL(10,2),
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, athlete_id, field_id)
);

-- บันทึกค่ารายวัน
CREATE TABLE tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tracking_plans(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES user_profiles(id),
  log_date DATE NOT NULL,
  values JSONB NOT NULL, -- { "field_id": value, ... }
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, athlete_id, log_date)
);

-- Indexes
CREATE INDEX idx_tracking_plans_club ON tracking_plans(club_id);
CREATE INDEX idx_tracking_plans_active ON tracking_plans(is_active);
CREATE INDEX idx_tracking_fields_plan ON tracking_fields(plan_id);
CREATE INDEX idx_tracking_goals_plan_athlete ON tracking_athlete_goals(plan_id, athlete_id);
CREATE INDEX idx_tracking_logs_plan_athlete ON tracking_logs(plan_id, athlete_id);
CREATE INDEX idx_tracking_logs_date ON tracking_logs(log_date);
```

### TypeScript Interfaces

```typescript
interface TrackingPlan {
  id: string
  club_id: string
  name: string
  description?: string
  plan_type: 'weight_control' | 'timing' | 'strength' | 'general'
  start_date: string
  end_date: string
  is_active: boolean
  created_by: string
  created_at: string
  fields?: TrackingField[]
  athlete_count?: number
}

interface TrackingField {
  id: string
  plan_id: string
  name: string
  field_type: 'number' | 'time' | 'reps' | 'distance' | 'text' | 'select'
  unit?: string
  is_required: boolean
  options?: string[]
  sort_order: number
}

interface TrackingAthleteGoal {
  id: string
  plan_id: string
  athlete_id: string
  field_id: string
  initial_value?: number
  target_value?: number
  target_date?: string
}

interface TrackingLog {
  id: string
  plan_id: string
  athlete_id: string
  log_date: string
  values: Record<string, number | string>
  notes?: string
  created_by: string
  created_at: string
}

interface ProgressData {
  current_value: number
  initial_value: number
  target_value: number
  percentage: number
  status: 'on_track' | 'ahead' | 'behind' | 'achieved'
  days_remaining: number
}
```

### Plan Templates

```typescript
const PLAN_TEMPLATES = {
  weight_control: {
    name: 'ควบคุมน้ำหนัก',
    fields: [
      { name: 'น้ำหนัก', field_type: 'number', unit: 'kg', is_required: true },
      { name: 'เปอร์เซ็นต์ไขมัน', field_type: 'number', unit: '%', is_required: false },
      { name: 'รอบเอว', field_type: 'number', unit: 'cm', is_required: false },
      { name: 'ปริมาณน้ำดื่ม', field_type: 'number', unit: 'ลิตร', is_required: false }
    ]
  },
  timing: {
    name: 'จับเวลา',
    fields: [
      { name: 'เวลา', field_type: 'time', unit: 'min:sec', is_required: true },
      { name: 'ระยะทาง', field_type: 'distance', unit: 'm', is_required: true }
    ]
  },
  strength: {
    name: 'ความแข็งแรง',
    fields: [
      { name: 'Squat 1RM', field_type: 'number', unit: 'kg', is_required: false },
      { name: 'Deadlift 1RM', field_type: 'number', unit: 'kg', is_required: false },
      { name: 'Bench Press 1RM', field_type: 'number', unit: 'kg', is_required: false }
    ]
  },
  general: {
    name: 'ค่าร่างกายทั่วไป',
    fields: [
      { name: 'น้ำหนัก', field_type: 'number', unit: 'kg', is_required: true },
      { name: 'ส่วนสูง', field_type: 'number', unit: 'cm', is_required: false },
      { name: 'BMI', field_type: 'number', unit: '', is_required: false }
    ]
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Plan creation stores all required data correctly
*For any* valid plan input with name, plan_type, start_date, end_date, and fields, creating a plan should result in a stored plan with all provided data intact and club_id matching the creator's club
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Field type validation rejects invalid types
*For any* field_type value that is not in the allowed set (number, time, reps, distance, text, select), the system should reject the field creation
**Validates: Requirements 1.3**

### Property 3: Template application pre-fills correct fields
*For any* template selection, the returned fields should match the template definition exactly in name, field_type, and unit
**Validates: Requirements 2.2, 2.3, 2.4**

### Property 4: Goal creation stores all required data correctly
*For any* valid goal input with athlete_id, plan_id, field_id, initial_value, target_value, and target_date, creating a goal should result in a stored goal with all provided data intact
**Validates: Requirements 3.2, 3.3**

### Property 5: Log upsert behavior - duplicate dates update instead of insert
*For any* tracking log submission for a (plan_id, athlete_id, log_date) combination that already exists, the system should update the existing log instead of creating a duplicate
**Validates: Requirements 4.5**

### Property 6: Input validation based on field type
*For any* field with type 'number', submitting a non-numeric value should be rejected; for type 'time', submitting an invalid time format should be rejected
**Validates: Requirements 4.2**

### Property 7: Progress percentage calculation is correct
*For any* athlete with initial_value, current_value, and target_value, the progress percentage should equal ((current - initial) / (target - initial)) * 100, clamped to 0-100 range
**Validates: Requirements 5.2**

### Property 8: Progress status calculation is correct
*For any* athlete progress, if percentage >= 100 then status is 'achieved', if actual progress rate > expected rate then 'ahead', if actual < expected then 'behind', else 'on_track'
**Validates: Requirements 5.3**

### Property 9: Role-based data filtering
*For any* coach user, fetching tracking plans should return only plans where club_id matches the coach's club_id; for athlete users, fetching should return only their own tracking data
**Validates: Requirements 6.2, 6.3**

### Property 10: Milestone notification triggers at correct thresholds
*For any* athlete whose progress crosses 50% or 100% threshold (from below to at-or-above), the system should create exactly one notification for that milestone
**Validates: Requirements 7.1, 7.2**

### Property 11: Deactivated plans preserve logs but hide from active list
*For any* deactivated plan, querying active plans should not include it, but querying logs for that plan should return all existing logs
**Validates: Requirements 1.6**

### Property 12: Athlete removal preserves historical logs
*For any* athlete removed from a plan, the athlete's tracking logs should remain in the database and be queryable
**Validates: Requirements 3.5**

## Error Handling

### User Input Errors
- แสดง validation errors แบบ inline ใต้ฟิลด์ที่ผิด
- ป้องกันการ submit ฟอร์มที่ไม่ครบ required fields
- แสดง toast notification สำหรับ errors ที่เกิดจาก server

### Network Errors
- แสดง retry button เมื่อ fetch ล้มเหลว
- Cache ข้อมูลล่าสุดใน store เพื่อแสดงผลแม้ offline
- Queue การบันทึกค่าเมื่อ offline (ตาม PWA requirements)

### Permission Errors
- Redirect ไปหน้า unauthorized เมื่อเข้าถึงข้อมูลที่ไม่มีสิทธิ์
- ซ่อน UI elements ที่ user ไม่มีสิทธิ์ใช้งาน

## Testing Strategy

### Property-Based Testing
- ใช้ **fast-check** library สำหรับ property-based testing
- ทุก property test ต้องรัน minimum 100 iterations
- ทุก property test ต้อง tag ด้วย format: `**Feature: athlete-tracking, Property {number}: {property_text}**`

### Unit Tests
- ทดสอบ progress calculation functions
- ทดสอบ input validation functions
- ทดสอบ template application

### Integration Tests
- ทดสอบ CRUD operations กับ Supabase
- ทดสอบ RLS policies ด้วย 3 demo accounts

## RLS Policies

### tracking_plans
```sql
-- Admin: SELECT/INSERT/UPDATE/DELETE all
-- Coach: SELECT/INSERT/UPDATE/DELETE in club
-- Athlete: SELECT plans they're enrolled in
```

### tracking_fields
```sql
-- Admin: SELECT/INSERT/UPDATE/DELETE all
-- Coach: SELECT/INSERT/UPDATE/DELETE for plans in club
-- Athlete: SELECT for plans they're enrolled in
```

### tracking_athlete_goals
```sql
-- Admin: SELECT/INSERT/UPDATE/DELETE all
-- Coach: SELECT/INSERT/UPDATE/DELETE for athletes in club
-- Athlete: SELECT own goals only
```

### tracking_logs
```sql
-- Admin: SELECT/INSERT/UPDATE/DELETE all
-- Coach: SELECT/INSERT/UPDATE for athletes in club
-- Athlete: SELECT/INSERT/UPDATE own logs only
```
