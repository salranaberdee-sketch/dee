# Design: ระบบประเมินผลนักกีฬา

## Overview

ระบบประเมินผลนักกีฬาที่รองรับการกำหนดเกณฑ์การให้คะแนนแบบยืดหยุ่น Admin/Coach สามารถปรับ weight ของแต่ละหมวดและเพิ่มเงื่อนไข bonus/penalty ได้ตามความต้องการของชมรม

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Vue.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Views:                                                         │
│  - EvaluationDashboard.vue (ภาพรวมนักกีฬา)                      │
│  - AthletePerformance.vue (ผลงานรายบุคคล)                       │
│  - AttendanceManager.vue (บันทึกการเข้าร่วม)                    │
│  - ScoringCriteriaSettings.vue (ตั้งค่าเกณฑ์คะแนน) [NEW]        │
│                                                                 │
│  Stores:                                                        │
│  - evaluation.js (คำนวณคะแนน, จัดการ evaluations)               │
│  - scoringCriteria.js (จัดการเกณฑ์และเงื่อนไข) [NEW]            │
├─────────────────────────────────────────────────────────────────┤
│                        Backend (Supabase)                       │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                        │
│  - attendance_records (บันทึกการเข้าร่วม)                       │
│  - athlete_evaluations (สรุปผลประเมิน)                          │
│  - scoring_criteria (เกณฑ์คะแนนหลัก) [NEW]                      │
│  - scoring_conditions (เงื่อนไขคะแนนพิเศษ) [NEW]                │
│  - applied_conditions (เงื่อนไขที่ใช้กับนักกีฬา) [NEW]          │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### ตาราง: scoring_criteria (เกณฑ์คะแนนหลัก)

```sql
CREATE TABLE scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  
  -- น้ำหนักคะแนนหลัก (รวมต้องเท่ากับ 100)
  attendance_weight INTEGER NOT NULL DEFAULT 40 CHECK (attendance_weight >= 0 AND attendance_weight <= 100),
  training_weight INTEGER NOT NULL DEFAULT 30 CHECK (training_weight >= 0 AND training_weight <= 100),
  rating_weight INTEGER NOT NULL DEFAULT 30 CHECK (rating_weight >= 0 AND rating_weight <= 100),
  
  -- ค่าเป้าหมาย
  target_training_sessions INTEGER NOT NULL DEFAULT 12, -- จำนวนครั้งต่อเดือน
  
  -- ผู้สร้าง/แก้ไข
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- 1 ชมรม = 1 เกณฑ์
  UNIQUE(club_id),
  
  -- ตรวจสอบว่ารวมเท่ากับ 100
  CONSTRAINT weights_sum_100 CHECK (attendance_weight + training_weight + rating_weight = 100)
);
```

### ตาราง: scoring_conditions (เงื่อนไขคะแนนพิเศษ)

```sql
CREATE TABLE scoring_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES scoring_criteria(id) ON DELETE CASCADE,
  
  -- รายละเอียดเงื่อนไข
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('attendance', 'training', 'rating', 'custom')),
  condition_type TEXT NOT NULL CHECK (condition_type IN ('bonus', 'penalty')),
  
  -- เกณฑ์การตรวจสอบ
  threshold_type TEXT NOT NULL CHECK (threshold_type IN ('percentage', 'count', 'value')),
  comparison_operator TEXT NOT NULL CHECK (comparison_operator IN ('>=', '>', '<=', '<', '=')),
  threshold_value NUMERIC NOT NULL,
  
  -- คะแนนที่ได้/หัก
  points INTEGER NOT NULL, -- บวก = bonus, ลบ = penalty
  
  -- สถานะ
  is_active BOOLEAN DEFAULT true,
  
  -- ผู้สร้าง
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### ตาราง: applied_conditions (เงื่อนไขที่ใช้กับนักกีฬา)

```sql
CREATE TABLE applied_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES athlete_evaluations(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES scoring_conditions(id) ON DELETE CASCADE,
  
  -- ค่าที่ตรวจสอบ
  actual_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  
  -- ผลลัพธ์
  condition_met BOOLEAN NOT NULL,
  points_applied INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(evaluation_id, condition_id)
);
```

### ตาราง: attendance_records
บันทึกการเข้าร่วมกิจกรรมของนักกีฬา

```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  club_id UUID REFERENCES clubs(id),
  
  -- วันที่และประเภท
  record_date DATE NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('training', 'competition', 'meeting', 'other')),
  
  -- สถานะการเข้าร่วม
  status TEXT NOT NULL CHECK (status IN ('on_time', 'late', 'leave', 'absent')),
  late_minutes INTEGER DEFAULT 0,
  
  -- การลา
  leave_type TEXT CHECK (leave_type IN ('sick', 'personal', 'emergency', 'other')),
  leave_reason TEXT,
  leave_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  
  -- ผู้บันทึก
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- ป้องกันซ้ำ
  UNIQUE(athlete_id, record_date, schedule_id),
  UNIQUE(athlete_id, record_date, event_id)
);
```

### ตาราง: athlete_evaluations
สรุปผลประเมินรายเดือน

```sql
CREATE TABLE athlete_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id),
  
  -- ช่วงเวลา
  evaluation_month DATE NOT NULL, -- วันแรกของเดือน
  
  -- สถิติการเข้าร่วม
  total_sessions INTEGER DEFAULT 0,
  attended_on_time INTEGER DEFAULT 0,
  attended_late INTEGER DEFAULT 0,
  leave_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  attendance_rate DECIMAL(5,2) DEFAULT 0, -- เปอร์เซ็นต์
  
  -- สถิติการฝึกซ้อม
  training_hours DECIMAL(6,2) DEFAULT 0,
  training_sessions INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  
  -- ระดับผลงาน
  performance_tier TEXT CHECK (performance_tier IN ('excellent', 'good', 'average', 'needs_improvement')),
  overall_score DECIMAL(5,2) DEFAULT 0, -- คะแนนรวม 0-100
  
  -- หมายเหตุจาก Coach
  coach_notes TEXT,
  evaluated_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(athlete_id, evaluation_month)
);
```

## Components and Interfaces

### ScoringCriteriaService

```typescript
interface ScoringCriteria {
  id: string;
  club_id: string;
  attendance_weight: number;
  training_weight: number;
  rating_weight: number;
  target_training_sessions: number;
}

interface ScoringCondition {
  id: string;
  club_id: string;
  criteria_id: string;
  name: string;
  description?: string;
  category: 'attendance' | 'training' | 'rating' | 'custom';
  condition_type: 'bonus' | 'penalty';
  threshold_type: 'percentage' | 'count' | 'value';
  comparison_operator: '>=' | '>' | '<=' | '<' | '=';
  threshold_value: number;
  points: number;
  is_active: boolean;
}

interface AppliedCondition {
  condition_id: string;
  condition_name: string;
  actual_value: number;
  threshold_value: number;
  condition_met: boolean;
  points_applied: number;
}
```

### ScoreCalculator Interface

```typescript
interface AthleteStats {
  total_sessions: number;
  attended_on_time: number;
  attended_late: number;
  leave_count: number;
  absent_count: number;
  training_sessions: number;
  average_rating: number;
}

interface ScoreBreakdown {
  attendance_score: number;
  training_score: number;
  rating_score: number;
  base_score: number;
  bonus_points: number;
  penalty_points: number;
  overall_score: number;
  tier: 'excellent' | 'good' | 'average' | 'needs_improvement';
  applied_conditions: AppliedCondition[];
}
```

## Data Models

### Default Criteria Values

| Field | Default | Description |
|-------|---------|-------------|
| attendance_weight | 40 | น้ำหนักคะแนนการเข้าร่วม |
| training_weight | 30 | น้ำหนักคะแนนการฝึกซ้อม |
| rating_weight | 30 | น้ำหนักคะแนน rating |
| target_training_sessions | 12 | เป้าหมายจำนวนครั้งต่อเดือน |

## Performance Tier Calculation

```
┌─────────────────────────────────────────────────────────────────────┐
│  คำนวณ Overall Score (0-100) - Configurable Weights                │
├─────────────────────────────────────────────────────────────────────┤
│  1. ดึงเกณฑ์จาก scoring_criteria (หรือใช้ default)                  │
│     - attendance_weight (default 40)                               │
│     - training_weight (default 30)                                 │
│     - rating_weight (default 30)                                   │
│     - target_training_sessions (default 12)                        │
├─────────────────────────────────────────────────────────────────────┤
│  2. คำนวณคะแนนหลัก                                                  │
│     attendance_score = (on_time + late) / total * attendance_weight│
│     training_score = min(sessions / target, 1) * training_weight   │
│     rating_score = (average_rating / 5) * rating_weight            │
│     base_score = attendance_score + training_score + rating_score  │
├─────────────────────────────────────────────────────────────────────┤
│  3. ตรวจสอบเงื่อนไขพิเศษ (scoring_conditions)                       │
│     FOR EACH active condition:                                     │
│       IF condition_met(actual_value, operator, threshold):         │
│         IF condition_type = 'bonus': bonus_points += points        │
│         IF condition_type = 'penalty': penalty_points += points    │
├─────────────────────────────────────────────────────────────────────┤
│  4. คำนวณคะแนนรวม                                                   │
│     overall_score = base_score + bonus_points + penalty_points     │
│     overall_score = max(0, min(100, overall_score)) // cap 0-100   │
├─────────────────────────────────────────────────────────────────────┤
│  5. กำหนด Performance Tier                                         │
│     - excellent: score >= 85                                       │
│     - good: score >= 70                                            │
│     - average: score >= 50                                         │
│     - needs_improvement: score < 50                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Condition Evaluation Logic

```javascript
function evaluateCondition(condition, athleteStats) {
  let actualValue;
  
  switch (condition.category) {
    case 'attendance':
      if (condition.threshold_type === 'percentage') {
        actualValue = athleteStats.attendance_rate;
      } else if (condition.threshold_type === 'count') {
        actualValue = athleteStats.absent_count;
      }
      break;
    case 'training':
      actualValue = athleteStats.training_sessions;
      break;
    case 'rating':
      actualValue = athleteStats.average_rating;
      break;
  }
  
  const met = compare(actualValue, condition.comparison_operator, condition.threshold_value);
  
  return {
    condition_met: met,
    points_applied: met ? condition.points : 0,
    actual_value: actualValue
  };
}

function compare(actual, operator, threshold) {
  switch (operator) {
    case '>=': return actual >= threshold;
    case '>':  return actual > threshold;
    case '<=': return actual <= threshold;
    case '<':  return actual < threshold;
    case '=':  return actual === threshold;
  }
}
```

## Error Handling

| Error Case | Handling |
|------------|----------|
| Weights don't sum to 100 | Reject save, show validation error |
| Invalid condition threshold | Reject save, show validation error |
| No criteria for club | Use default values |
| Division by zero (no sessions) | Return 0 for that component |
| Score exceeds 100 | Cap at 100 |
| Score below 0 | Cap at 0 |

## RLS Policies (10+ policies ตามกฎ)

### attendance_records

```sql
-- Admin Policies
CREATE POLICY "Admin can SELECT all attendance" ON attendance_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can INSERT all attendance" ON attendance_records
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can UPDATE all attendance" ON attendance_records
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can DELETE all attendance" ON attendance_records
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Coach Policies
CREATE POLICY "Coach can SELECT attendance in club" ON attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'coach' 
      AND club_id = attendance_records.club_id
    )
  );

CREATE POLICY "Coach can INSERT attendance in club" ON attendance_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'coach' 
      AND club_id = attendance_records.club_id
    )
  );

CREATE POLICY "Coach can UPDATE attendance in club" ON attendance_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'coach' 
      AND club_id = attendance_records.club_id
    )
  );

-- Athlete Policies
CREATE POLICY "Athletes can SELECT own attendance" ON attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM athletes 
      WHERE athletes.id = attendance_records.athlete_id 
      AND athletes.user_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can INSERT own leave request" ON attendance_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM athletes 
      WHERE athletes.id = attendance_records.athlete_id 
      AND athletes.user_id = auth.uid()
    )
    AND status = 'leave'
  );
```

### athlete_evaluations (คล้ายกัน)

### scoring_criteria

```sql
-- Admin Policies
CREATE POLICY "Admin can SELECT all scoring_criteria" ON scoring_criteria
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can INSERT scoring_criteria" ON scoring_criteria
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can UPDATE scoring_criteria" ON scoring_criteria
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can DELETE scoring_criteria" ON scoring_criteria
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Coach Policies
CREATE POLICY "Coach can SELECT scoring_criteria in club" ON scoring_criteria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'coach' 
      AND club_id = scoring_criteria.club_id
    )
  );

CREATE POLICY "Coach can INSERT scoring_criteria in club" ON scoring_criteria
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'coach' 
      AND club_id = scoring_criteria.club_id
    )
  );

CREATE POLICY "Coach can UPDATE scoring_criteria in club" ON scoring_criteria
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'coach' 
      AND club_id = scoring_criteria.club_id
    )
  );

-- Athlete can view criteria (read-only)
CREATE POLICY "Athletes can SELECT scoring_criteria in club" ON scoring_criteria
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM athletes a
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE a.user_id = auth.uid()
      AND a.club_id = scoring_criteria.club_id
    )
  );
```

### scoring_conditions

```sql
-- Admin Policies
CREATE POLICY "Admin can SELECT all scoring_conditions" ON scoring_conditions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can INSERT scoring_conditions" ON scoring_conditions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can UPDATE scoring_conditions" ON scoring_conditions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can DELETE scoring_conditions" ON scoring_conditions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Coach Policies
CREATE POLICY "Coach can SELECT scoring_conditions in club" ON scoring_conditions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'coach' 
      AND club_id = scoring_conditions.club_id
    )
  );

CREATE POLICY "Coach can INSERT scoring_conditions in club" ON scoring_conditions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'coach' 
      AND club_id = scoring_conditions.club_id
    )
  );

CREATE POLICY "Coach can UPDATE scoring_conditions in club" ON scoring_conditions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'coach' 
      AND club_id = scoring_conditions.club_id
    )
  );

CREATE POLICY "Coach can DELETE scoring_conditions in club" ON scoring_conditions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'coach' 
      AND club_id = scoring_conditions.club_id
    )
  );

-- Athlete can view conditions (read-only)
CREATE POLICY "Athletes can SELECT scoring_conditions in club" ON scoring_conditions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM athletes a
      WHERE a.user_id = auth.uid()
      AND a.club_id = scoring_conditions.club_id
    )
  );
```

## UI Components

### 1. AttendanceManager.vue
- บันทึกการเข้าร่วมรายวัน
- ดูรายการนักกีฬาและ mark สถานะ
- รองรับ bulk update

### 2. AthleteEvaluationCard.vue
- แสดงสรุปผลนักกีฬารายคน
- แสดง tier badge
- แสดงสถิติหลัก

### 3. EvaluationDashboard.vue
- ภาพรวมนักกีฬาทั้งหมด
- กรองตาม tier
- จัดอันดับ
- Export

### 4. AthletePerformanceView.vue
- หน้ารายละเอียดนักกีฬา
- กราฟแนวโน้ม
- ประวัติการเข้าร่วม
- แสดง applied conditions

### 5. ScoringCriteriaSettings.vue [NEW]
- ตั้งค่า weight หลัก (attendance, training, rating)
- Slider หรือ input สำหรับปรับ weight
- แสดง validation ว่ารวมต้องเท่ากับ 100%
- รายการเงื่อนไขพิเศษ (bonus/penalty)
- เพิ่ม/แก้ไข/ลบเงื่อนไข

### 6. ScoringConditionForm.vue [NEW]
- Form สำหรับสร้าง/แก้ไขเงื่อนไข
- เลือก category (attendance/training/rating/custom)
- เลือก condition_type (bonus/penalty)
- เลือก threshold_type และ comparison_operator
- กำหนด threshold_value และ points

### 7. ScoreBreakdownCard.vue [NEW]
- แสดงรายละเอียดคะแนน
- Base scores (attendance, training, rating)
- Applied conditions (bonus/penalty)
- Overall score และ tier

## Store: evaluationStore.js

```javascript
// State
athletes: [],
evaluations: [],
attendanceRecords: [],
filters: { tier: null, month: null },
loading: false

// Actions
- fetchAthleteEvaluations(clubId, month)
- recordAttendance(athleteId, data)
- calculateEvaluation(athleteId, month)
- exportReport(clubId, month)

// Getters
- athletesByTier
- topPerformers
- needsAttention
- attendanceStats
```

## Store: scoringCriteria.js [NEW]

```javascript
// State
criteria: null,           // ScoringCriteria for current club
conditions: [],           // ScoringCondition[] for current club
loading: false,
error: null

// Actions
- fetchCriteria(clubId)           // Get or create default criteria
- saveCriteria(criteria)          // Save weight configuration
- fetchConditions(clubId)         // Get all conditions
- addCondition(condition)         // Add new condition
- updateCondition(id, updates)    // Update existing condition
- deleteCondition(id)             // Delete condition
- toggleCondition(id, isActive)   // Enable/disable condition

// Getters
- activeConditions                // Only is_active = true
- bonusConditions                 // condition_type = 'bonus'
- penaltyConditions               // condition_type = 'penalty'
- totalWeights                    // Sum of all weights (should be 100)
- isValidWeights                  // totalWeights === 100
```

## Routes

```javascript
{
  path: '/evaluation',
  name: 'Evaluation',
  component: EvaluationDashboard,
  meta: { requiresAuth: true, roles: ['admin', 'coach'] }
},
{
  path: '/evaluation/athlete/:id',
  name: 'AthletePerformance',
  component: AthletePerformanceView,
  meta: { requiresAuth: true }
},
{
  path: '/attendance',
  name: 'Attendance',
  component: AttendanceManager,
  meta: { requiresAuth: true, roles: ['admin', 'coach'] }
},
{
  path: '/evaluation/settings',
  name: 'ScoringCriteriaSettings',
  component: ScoringCriteriaSettings,
  meta: { requiresAuth: true, roles: ['admin', 'coach'] }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Weights Sum Constraint
*For any* scoring criteria configuration, the sum of attendance_weight, training_weight, and rating_weight must equal exactly 100.
**Validates: Requirements 7.2, 7.6**

### Property 2: Score Bounded Range
*For any* athlete stats and scoring criteria, the calculated overall_score must be between 0 and 100 inclusive.
**Validates: Requirements 4.4**

### Property 3: Tier Assignment Consistency
*For any* overall_score value, the assigned tier must be:
- 'excellent' if score >= 85
- 'good' if score >= 70 and < 85
- 'average' if score >= 50 and < 70
- 'needs_improvement' if score < 50
**Validates: Requirements 4.5, 4.6, 4.7, 4.8**

### Property 4: Score Components Use Configured Weights
*For any* athlete stats and valid scoring criteria, each score component (attendance, training, rating) must be calculated using the configured weight percentage.
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Condition Points Application
*For any* scoring condition and athlete stats:
- If condition_type is 'bonus' and condition is met, points are added
- If condition_type is 'penalty' and condition is met, points are subtracted
**Validates: Requirements 7.4, 7.5, 8.1, 8.2, 8.3, 8.4**

### Property 6: Default Criteria Fallback
*For any* club without custom scoring criteria, the system must use default weights (40, 30, 30).
**Validates: Requirements 7.7**

### Property 7: Condition Evaluation Determinism
*For any* condition with the same threshold and athlete stats, the evaluation result (met/not met) must be consistent.
**Validates: Requirements 8.6**

### Property 8: Rating Constraint
*For any* training log rating, the value must be between 1 and 5 inclusive.
**Validates: Requirements 3.2**

### Property 9: Leave Request Creates Correct Record
*For any* leave request submission, the created attendance_record must have status='leave' and valid schedule_id or event_id.
**Validates: Requirements 2.4**

### Property 10: Upcoming Activities Filter
*For any* list of activities, the leave request page must only show activities with dates in the future.
**Validates: Requirements 2.1**

## Testing Strategy

### Unit Tests
- Test weight validation (sum must equal 100)
- Test condition evaluation logic
- Test score calculation with various inputs
- Test tier assignment based on score
- Test default criteria creation

### Property-Based Tests
- Property 1: Generate random weight combinations, verify sum constraint
- Property 2: Generate random stats and criteria, verify score bounds
- Property 3: Generate random scores, verify tier assignment
- Property 4: Generate random stats and weights, verify formula application
- Property 5: Generate random conditions and stats, verify points application
- Property 6: Test clubs without criteria get defaults
- Property 7: Same inputs produce same condition results
- Property 8: Generate random ratings, verify constraint
- Property 9: Generate leave requests, verify record creation
- Property 10: Generate activities with various dates, verify filter
