-- Migration: Create Athlete Tracking Tables
-- ฟีเจอร์ Athlete Tracking สำหรับติดตามค่าตัวเลขของนักกีฬา
-- Requirements: 1.1, 1.2, 1.3, 1.4, 3.2, 3.3, 4.3, 4.5

-- =====================================================
-- 1. tracking_plans - แผนติดตามค่าตัวเลข
-- Requirements: 1.1, 1.4
-- =====================================================
CREATE TABLE tracking_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  plan_type VARCHAR(50) NOT NULL, -- weight_control, timing, strength, general
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: end_date ต้องมากกว่าหรือเท่ากับ start_date
  CONSTRAINT tracking_plans_date_check CHECK (end_date >= start_date)
);

-- Comment สำหรับตาราง
COMMENT ON TABLE tracking_plans IS 'แผนติดตามค่าตัวเลขของนักกีฬา เช่น ควบคุมน้ำหนัก, จับเวลา, ความแข็งแรง';

-- Indexes สำหรับ tracking_plans
CREATE INDEX idx_tracking_plans_club ON tracking_plans(club_id);
CREATE INDEX idx_tracking_plans_active ON tracking_plans(is_active);
CREATE INDEX idx_tracking_plans_created_by ON tracking_plans(created_by);
CREATE INDEX idx_tracking_plans_dates ON tracking_plans(start_date, end_date);

-- =====================================================
-- 2. tracking_fields - ฟิลด์ที่ติดตาม
-- Requirements: 1.2, 1.3
-- =====================================================
CREATE TABLE tracking_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tracking_plans(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  field_type VARCHAR(20) NOT NULL,
  unit VARCHAR(20),
  is_required BOOLEAN DEFAULT false,
  options JSONB, -- สำหรับ field_type = 'select'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: field_type ต้องเป็นค่าที่กำหนด
  CONSTRAINT tracking_fields_type_check CHECK (
    field_type IN ('number', 'time', 'reps', 'distance', 'text', 'select')
  )
);

-- Comment สำหรับตาราง
COMMENT ON TABLE tracking_fields IS 'ฟิลด์ที่กำหนดให้ติดตามในแต่ละแผน เช่น น้ำหนัก, เปอร์เซ็นต์ไขมัน, เวลาวิ่ง';

-- Indexes สำหรับ tracking_fields
CREATE INDEX idx_tracking_fields_plan ON tracking_fields(plan_id);
CREATE INDEX idx_tracking_fields_sort ON tracking_fields(plan_id, sort_order);

-- =====================================================
-- 3. tracking_athlete_goals - เป้าหมายนักกีฬา
-- Requirements: 3.2, 3.3
-- =====================================================
CREATE TABLE tracking_athlete_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tracking_plans(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES tracking_fields(id) ON DELETE CASCADE,
  initial_value DECIMAL(10,2),
  target_value DECIMAL(10,2),
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: นักกีฬาหนึ่งคนมีเป้าหมายได้หนึ่งรายการต่อฟิลด์ในแต่ละแผน
  CONSTRAINT tracking_athlete_goals_unique UNIQUE(plan_id, athlete_id, field_id)
);

-- Comment สำหรับตาราง
COMMENT ON TABLE tracking_athlete_goals IS 'เป้าหมายรายบุคคลของนักกีฬาในแต่ละฟิลด์ของแผนติดตาม';

-- Indexes สำหรับ tracking_athlete_goals
CREATE INDEX idx_tracking_goals_plan_athlete ON tracking_athlete_goals(plan_id, athlete_id);
CREATE INDEX idx_tracking_goals_athlete ON tracking_athlete_goals(athlete_id);
CREATE INDEX idx_tracking_goals_field ON tracking_athlete_goals(field_id);

-- =====================================================
-- 4. tracking_logs - บันทึกค่ารายวัน
-- Requirements: 4.3, 4.5
-- =====================================================
CREATE TABLE tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES tracking_plans(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  values JSONB NOT NULL, -- { "field_id": value, ... }
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: รองรับ upsert - วันละหนึ่งบันทึกต่อนักกีฬาต่อแผน
  CONSTRAINT tracking_logs_unique UNIQUE(plan_id, athlete_id, log_date)
);

-- Comment สำหรับตาราง
COMMENT ON TABLE tracking_logs IS 'บันทึกค่าตัวเลขรายวันของนักกีฬา รองรับ upsert สำหรับวันที่ซ้ำ';

-- Indexes สำหรับ tracking_logs
CREATE INDEX idx_tracking_logs_plan_athlete ON tracking_logs(plan_id, athlete_id);
CREATE INDEX idx_tracking_logs_date ON tracking_logs(log_date);
CREATE INDEX idx_tracking_logs_athlete ON tracking_logs(athlete_id);
CREATE INDEX idx_tracking_logs_created_by ON tracking_logs(created_by);

-- =====================================================
-- Enable RLS on all tables
-- =====================================================
ALTER TABLE tracking_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_athlete_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Trigger สำหรับ updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tracking_plans_updated_at
  BEFORE UPDATE ON tracking_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

CREATE TRIGGER tracking_athlete_goals_updated_at
  BEFORE UPDATE ON tracking_athlete_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

CREATE TRIGGER tracking_logs_updated_at
  BEFORE UPDATE ON tracking_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();
