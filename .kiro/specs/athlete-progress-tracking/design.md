# Design Document: Athlete Progress Tracking

## Overview

ระบบติดตามความคืบหน้านักกีฬา ออกแบบให้โค้ชสามารถสร้างแผนพัฒนาที่มีหลายระดับ และติดตามว่านักกีฬาแต่ละคนอยู่ขั้นไหน พร้อมประวัติการเลื่อนระดับ

### Key Design Goals

1. **Flexibility** - โค้ชสร้างแผนได้เองตามต้องการ
2. **Visibility** - เห็นภาพรวมความคืบหน้าทั้งหมดได้ง่าย
3. **Traceability** - เก็บประวัติการเลื่อนระดับครบถ้วน
4. **Simplicity** - ใช้งานง่าย ไม่ซับซ้อน

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vue.js)                     │
├─────────────────────────────────────────────────────────┤
│  TrainingPlansView    │  AthleteProgressView            │
│  - สร้าง/แก้ไขแผน      │  - ดูความคืบหน้านักกีฬา          │
│  - กำหนดระดับ          │  - อัพเดทระดับ                   │
│                       │  - ดูประวัติ                     │
├─────────────────────────────────────────────────────────┤
│                    Pinia Store                          │
│  trainingPlansStore   │  athleteProgressStore           │
├─────────────────────────────────────────────────────────┤
│                    Supabase                             │
│  training_plans       │  plan_levels                    │
│  athlete_progress     │  progress_history               │
└─────────────────────────────────────────────────────────┘
```

## Data Models

### Database Schema

```sql
-- แผนพัฒนา (Training Plans)
CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id),
  name TEXT NOT NULL,
  description TEXT,
  total_levels INTEGER NOT NULL DEFAULT 1 CHECK (total_levels >= 1 AND total_levels <= 20),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ระดับในแผน (Plan Levels)
CREATE TABLE plan_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL CHECK (level_number >= 1),
  name TEXT NOT NULL,
  description TEXT,
  requirements JSONB DEFAULT '[]',  -- [{type: 'skill', name: 'xxx', completed: false}]
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, level_number)
);

-- ความคืบหน้านักกีฬา (Athlete Progress)
CREATE TABLE athlete_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(athlete_id, plan_id)
);

-- ประวัติการเลื่อนระดับ (Progress History)
CREATE TABLE progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID REFERENCES athlete_progress(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES athletes(id),
  plan_id UUID REFERENCES training_plans(id),
  previous_level INTEGER,
  new_level INTEGER NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### TypeScript Interfaces

```typescript
interface TrainingPlan {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  total_levels: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  levels?: PlanLevel[];
  athlete_count?: number;
}

interface PlanLevel {
  id: string;
  plan_id: string;
  level_number: number;
  name: string;
  description: string | null;
  requirements: LevelRequirement[];
  sort_order: number;
}

interface LevelRequirement {
  type: 'skill' | 'duration' | 'approval';
  name: string;
  value?: string | number;
}

interface AthleteProgress {
  id: string;
  athlete_id: string;
  plan_id: string;
  current_level: number;
  started_at: string;
  last_updated_at: string;
  updated_by: string;
  notes: string | null;
  // Relations
  athlete?: Athlete;
  plan?: TrainingPlan;
  current_level_info?: PlanLevel;
}

interface ProgressHistory {
  id: string;
  progress_id: string;
  athlete_id: string;
  plan_id: string;
  previous_level: number | null;
  new_level: number;
  changed_by: string;
  change_reason: string | null;
  notes: string | null;
  created_at: string;
}
```

## Role Matrix

| การกระทำ | Admin | Coach | Athlete |
|----------|-------|-------|---------|
| ดูแผนทั้งหมด | ✅ | ❌ | ❌ |
| ดูแผนในชมรม | ✅ | ✅ | ✅ (เฉพาะที่ถูก assign) |
| สร้างแผน | ✅ | ✅ | ❌ |
| แก้ไขแผน | ✅ | ✅ (เฉพาะที่สร้าง) | ❌ |
| ลบแผน | ✅ | ✅ (เฉพาะที่สร้าง) | ❌ |
| Assign นักกีฬา | ✅ | ✅ | ❌ |
| อัพเดทระดับ | ✅ | ✅ | ❌ |
| ดูความคืบหน้าทั้งหมด | ✅ | ❌ | ❌ |
| ดูความคืบหน้าในชมรม | ✅ | ✅ | ❌ |
| ดูความคืบหน้าตัวเอง | ✅ | ✅ | ✅ |

## Components

### 1. TrainingPlansView.vue
- แสดงรายการแผนพัฒนาทั้งหมด
- สร้าง/แก้ไข/ลบแผน
- กำหนดระดับและเงื่อนไข

### 2. PlanDetailView.vue
- แสดงรายละเอียดแผน
- แสดงนักกีฬาที่ถูก assign และระดับปัจจุบัน
- อัพเดทระดับนักกีฬา

### 3. AthleteProgressCard.vue
- แสดง progress bar ของนักกีฬา
- แสดงระดับปัจจุบัน/ทั้งหมด
- ปุ่มอัพเดทระดับ

### 4. ProgressHistoryModal.vue
- แสดงประวัติการเลื่อนระดับ
- Timeline view

## Correctness Properties

### Property 1: Level Bounds
*For any* athlete progress, current_level SHALL be >= 1 AND <= plan.total_levels
**Validates: Requirements 1.1, 3.1**

### Property 2: Progress Uniqueness
*For any* athlete-plan combination, there SHALL be exactly one athlete_progress record
**Validates: Requirements 3.4**

### Property 3: History Completeness
*For any* level change, a progress_history record SHALL be created with previous and new level
**Validates: Requirements 5.1, 5.2**

### Property 4: Level Sequence
*For any* plan, level_numbers SHALL be sequential from 1 to total_levels without gaps
**Validates: Requirements 2.1**

### Property 5: Access Control Enforcement
*For any* data access, RLS policies SHALL enforce role-based permissions as defined in Role Matrix
**Validates: Requirements 7.1-7.4**

## Error Handling

| Error Code | Condition | Message |
|------------|-----------|---------|
| PLAN_NOT_FOUND | Plan ID ไม่พบ | "ไม่พบแผนพัฒนาที่ระบุ" |
| LEVEL_OUT_OF_RANGE | Level > total_levels | "ระดับเกินจำนวนที่กำหนดในแผน" |
| ALREADY_ASSIGNED | Athlete มี progress แล้ว | "นักกีฬานี้ถูก assign แผนนี้แล้ว" |
| UNAUTHORIZED | ไม่มีสิทธิ์ | "คุณไม่มีสิทธิ์ดำเนินการนี้" |

## UI/UX Design

### Progress Visualization
```
┌─────────────────────────────────────────────────────────┐
│  แผน: พัฒนาทักษะพื้นฐาน                                  │
│  ────────────────────────────────────────────────────── │
│  นักกีฬา A    [████████░░] 8/10  ระดับ 8: ท่าขั้นสูง     │
│  นักกีฬา B    [██████░░░░] 6/10  ระดับ 6: ท่ากลาง       │
│  นักกีฬา C    [███░░░░░░░] 3/10  ระดับ 3: ท่าพื้นฐาน    │
└─────────────────────────────────────────────────────────┘
```

### Level Update Flow
```
1. โค้ชเลือกนักกีฬา
2. เลือกระดับใหม่ (dropdown หรือ +/- buttons)
3. ใส่หมายเหตุ (optional)
4. กดยืนยัน
5. ระบบบันทึก progress + history
6. แสดง notification สำเร็จ
```

