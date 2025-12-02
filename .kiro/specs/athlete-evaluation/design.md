# Design: ระบบประเมินผลนักกีฬา

## Database Schema

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

## Performance Tier Calculation

```
┌─────────────────────────────────────────────────────────┐
│  คำนวณ Overall Score (0-100)                            │
├─────────────────────────────────────────────────────────┤
│  attendance_score = attendance_rate * 0.4              │
│  training_score = (training_sessions / target) * 30    │
│  rating_score = (average_rating / 5) * 30              │
│                                                         │
│  overall_score = attendance_score + training_score     │
│                  + rating_score                         │
├─────────────────────────────────────────────────────────┤
│  Performance Tier:                                      │
│  - excellent: score ≥ 85                               │
│  - good: score ≥ 70                                    │
│  - average: score ≥ 50                                 │
│  - needs_improvement: score < 50                       │
└─────────────────────────────────────────────────────────┘
```

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
}
```
