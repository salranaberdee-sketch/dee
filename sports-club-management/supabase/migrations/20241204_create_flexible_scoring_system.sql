-- =====================================================
-- Migration: Flexible Scoring System - Database Schema
-- สร้างตารางสำหรับระบบเกณฑ์การให้คะแนนที่ยืดหยุ่น
-- Requirements: 1.1, 1.4, 2.1, 2.2, 2.4, 5.1-5.4, 8.1
-- =====================================================

-- =====================================================
-- 1. ตาราง sport_types และ competition_formats
-- =====================================================

-- ตาราง sport_types - ประเภทกีฬา
CREATE TABLE IF NOT EXISTS sport_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE sport_types IS 'ประเภทกีฬาที่ชมรมเลือกใช้ เช่น pencak_silat, futsal, football, sepak_takraw';

-- ตาราง competition_formats - รูปแบบการแข่งขัน
CREATE TABLE IF NOT EXISTS competition_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_type_id UUID NOT NULL REFERENCES sport_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  team_size INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport_type_id, name)
);

COMMENT ON TABLE competition_formats IS 'รูปแบบการแข่งขันของแต่ละประเภทกีฬา';

CREATE INDEX IF NOT EXISTS idx_competition_formats_sport_type_id ON competition_formats(sport_type_id);

-- =====================================================
-- 2. ตาราง scoring_templates, template_categories, template_metrics
-- =====================================================

-- ตาราง scoring_templates - Template สำเร็จรูป
CREATE TABLE IF NOT EXISTS scoring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_type_id UUID NOT NULL REFERENCES sport_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE scoring_templates IS 'Template สำเร็จรูปสำหรับเกณฑ์การให้คะแนนของแต่ละประเภทกีฬา';

CREATE INDEX IF NOT EXISTS idx_scoring_templates_sport_type_id ON scoring_templates(sport_type_id);

-- ตาราง template_categories - หมวดหมู่ใน Template
CREATE TABLE IF NOT EXISTS template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES scoring_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('attendance', 'training', 'skill', 'competition', 'custom')),
  weight INTEGER NOT NULL CHECK (weight >= 0 AND weight <= 100),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE template_categories IS 'หมวดหมู่ของเกณฑ์การให้คะแนนใน Template';

CREATE INDEX IF NOT EXISTS idx_template_categories_template_id ON template_categories(template_id);

-- ตาราง template_metrics - ตัวชี้วัดใน Template
CREATE TABLE IF NOT EXISTS template_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES template_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('count', 'percentage', 'rating', 'time', 'distance')),
  target_value NUMERIC,
  rating_scale_min INTEGER DEFAULT 1,
  rating_scale_max INTEGER DEFAULT 5,
  formula TEXT,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE template_metrics IS 'ตัวชี้วัดที่ใช้ในการประเมินใน Template';

CREATE INDEX IF NOT EXISTS idx_template_metrics_category_id ON template_metrics(category_id);

-- =====================================================
-- 3. ตาราง club_scoring_configs และตารางที่เกี่ยวข้อง
-- =====================================================

-- ตาราง club_scoring_configs - การตั้งค่าเกณฑ์ของชมรม
CREATE TABLE IF NOT EXISTS club_scoring_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  sport_type_id UUID NOT NULL REFERENCES sport_types(id),
  template_id UUID REFERENCES scoring_templates(id),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  tier_excellent_min INTEGER DEFAULT 85,
  tier_good_min INTEGER DEFAULT 70,
  tier_average_min INTEGER DEFAULT 50,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, name)
);

COMMENT ON TABLE club_scoring_configs IS 'การตั้งค่าเกณฑ์การให้คะแนนเฉพาะของแต่ละชมรม';

CREATE INDEX IF NOT EXISTS idx_club_scoring_configs_club_id ON club_scoring_configs(club_id);
CREATE INDEX IF NOT EXISTS idx_club_scoring_configs_sport_type_id ON club_scoring_configs(sport_type_id);
CREATE INDEX IF NOT EXISTS idx_club_scoring_configs_template_id ON club_scoring_configs(template_id);

-- ตาราง club_scoring_categories - หมวดหมู่ของชมรม
CREATE TABLE IF NOT EXISTS club_scoring_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES club_scoring_configs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('attendance', 'training', 'skill', 'competition', 'custom')),
  weight INTEGER NOT NULL CHECK (weight >= 0 AND weight <= 100),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE club_scoring_categories IS 'หมวดหมู่ของเกณฑ์การให้คะแนนเฉพาะชมรม';

CREATE INDEX IF NOT EXISTS idx_club_scoring_categories_config_id ON club_scoring_categories(config_id);

-- ตาราง club_scoring_metrics - ตัวชี้วัดของชมรม
CREATE TABLE IF NOT EXISTS club_scoring_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES club_scoring_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('count', 'percentage', 'rating', 'time', 'distance')),
  target_value NUMERIC,
  min_value NUMERIC DEFAULT 0,
  max_value NUMERIC DEFAULT 100,
  default_value NUMERIC DEFAULT 0,
  scoring_formula TEXT DEFAULT '(actual / target) * 100',
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE club_scoring_metrics IS 'ตัวชี้วัดที่ใช้ในการประเมินเฉพาะชมรม';

CREATE INDEX IF NOT EXISTS idx_club_scoring_metrics_category_id ON club_scoring_metrics(category_id);

-- ตาราง scoring_config_history - ประวัติการเปลี่ยนแปลง
CREATE TABLE IF NOT EXISTS scoring_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES club_scoring_configs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE scoring_config_history IS 'ประวัติการเปลี่ยนแปลงเกณฑ์การให้คะแนน';

CREATE INDEX IF NOT EXISTS idx_scoring_config_history_config_id ON scoring_config_history(config_id);
CREATE INDEX IF NOT EXISTS idx_scoring_config_history_version ON scoring_config_history(config_id, version);

-- =====================================================
-- 4. Enable RLS และสร้าง Policies
-- =====================================================

-- Enable RLS สำหรับทุกตาราง
ALTER TABLE sport_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_scoring_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_scoring_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_scoring_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_config_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies สำหรับ sport_types (ทุก role อ่านได้, Admin จัดการได้)
-- =====================================================
CREATE POLICY "Admin can SELECT all sport_types" ON sport_types
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can INSERT sport_types" ON sport_types
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can UPDATE sport_types" ON sport_types
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can DELETE sport_types" ON sport_types
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Coach can SELECT sport_types" ON sport_types
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Athlete can SELECT sport_types" ON sport_types
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'athlete'));

-- =====================================================
-- RLS Policies สำหรับ competition_formats
-- =====================================================
CREATE POLICY "Admin can SELECT all competition_formats" ON competition_formats
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can INSERT competition_formats" ON competition_formats
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can UPDATE competition_formats" ON competition_formats
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can DELETE competition_formats" ON competition_formats
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Coach can SELECT competition_formats" ON competition_formats
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Athlete can SELECT competition_formats" ON competition_formats
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'athlete'));

-- =====================================================
-- RLS Policies สำหรับ scoring_templates
-- =====================================================
CREATE POLICY "Admin can SELECT all scoring_templates" ON scoring_templates
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can INSERT scoring_templates" ON scoring_templates
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can UPDATE scoring_templates" ON scoring_templates
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can DELETE scoring_templates" ON scoring_templates
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Coach can SELECT scoring_templates" ON scoring_templates
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Athlete can SELECT scoring_templates" ON scoring_templates
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'athlete'));

-- =====================================================
-- RLS Policies สำหรับ template_categories
-- =====================================================
CREATE POLICY "Admin can SELECT all template_categories" ON template_categories
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can INSERT template_categories" ON template_categories
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can UPDATE template_categories" ON template_categories
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can DELETE template_categories" ON template_categories
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Coach can SELECT template_categories" ON template_categories
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Athlete can SELECT template_categories" ON template_categories
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'athlete'));

-- =====================================================
-- RLS Policies สำหรับ template_metrics
-- =====================================================
CREATE POLICY "Admin can SELECT all template_metrics" ON template_metrics
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can INSERT template_metrics" ON template_metrics
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can UPDATE template_metrics" ON template_metrics
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can DELETE template_metrics" ON template_metrics
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Coach can SELECT template_metrics" ON template_metrics
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'coach'));
CREATE POLICY "Athlete can SELECT template_metrics" ON template_metrics
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'athlete'));

-- =====================================================
-- RLS Policies สำหรับ club_scoring_configs
-- =====================================================
CREATE POLICY "Admin can SELECT all club_scoring_configs" ON club_scoring_configs
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can INSERT club_scoring_configs" ON club_scoring_configs
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can UPDATE club_scoring_configs" ON club_scoring_configs
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can DELETE club_scoring_configs" ON club_scoring_configs
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Coach can SELECT club_scoring_configs in club" ON club_scoring_configs
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'coach' AND club_id = club_scoring_configs.club_id));
CREATE POLICY "Coach can INSERT club_scoring_configs in club" ON club_scoring_configs
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'coach' AND club_id = club_scoring_configs.club_id));
CREATE POLICY "Coach can UPDATE club_scoring_configs in club" ON club_scoring_configs
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'coach' AND club_id = club_scoring_configs.club_id));
CREATE POLICY "Athlete can SELECT club_scoring_configs in club" ON club_scoring_configs
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'athlete' AND club_id = club_scoring_configs.club_id));

-- =====================================================
-- RLS Policies สำหรับ club_scoring_categories
-- =====================================================
CREATE POLICY "Admin can SELECT all club_scoring_categories" ON club_scoring_categories
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can INSERT club_scoring_categories" ON club_scoring_categories
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can UPDATE club_scoring_categories" ON club_scoring_categories
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can DELETE club_scoring_categories" ON club_scoring_categories
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Coach can SELECT club_scoring_categories in club" ON club_scoring_categories
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id WHERE up.id = auth.uid() AND up.role = 'coach' AND csc.id = club_scoring_categories.config_id));
CREATE POLICY "Coach can INSERT club_scoring_categories in club" ON club_scoring_categories
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id WHERE up.id = auth.uid() AND up.role = 'coach' AND csc.id = club_scoring_categories.config_id));
CREATE POLICY "Coach can UPDATE club_scoring_categories in club" ON club_scoring_categories
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id WHERE up.id = auth.uid() AND up.role = 'coach' AND csc.id = club_scoring_categories.config_id));
CREATE POLICY "Coach can DELETE club_scoring_categories in club" ON club_scoring_categories
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id WHERE up.id = auth.uid() AND up.role = 'coach' AND csc.id = club_scoring_categories.config_id));
CREATE POLICY "Athlete can SELECT club_scoring_categories in club" ON club_scoring_categories
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id WHERE up.id = auth.uid() AND up.role = 'athlete' AND csc.id = club_scoring_categories.config_id));

-- =====================================================
-- RLS Policies สำหรับ club_scoring_metrics
-- =====================================================
CREATE POLICY "Admin can SELECT all club_scoring_metrics" ON club_scoring_metrics
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can INSERT club_scoring_metrics" ON club_scoring_metrics
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can UPDATE club_scoring_metrics" ON club_scoring_metrics
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can DELETE club_scoring_metrics" ON club_scoring_metrics
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Coach can SELECT club_scoring_metrics in club" ON club_scoring_metrics
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id JOIN club_scoring_categories cat ON cat.config_id = csc.id WHERE up.id = auth.uid() AND up.role = 'coach' AND cat.id = club_scoring_metrics.category_id));
CREATE POLICY "Coach can INSERT club_scoring_metrics in club" ON club_scoring_metrics
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id JOIN club_scoring_categories cat ON cat.config_id = csc.id WHERE up.id = auth.uid() AND up.role = 'coach' AND cat.id = club_scoring_metrics.category_id));
CREATE POLICY "Coach can UPDATE club_scoring_metrics in club" ON club_scoring_metrics
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id JOIN club_scoring_categories cat ON cat.config_id = csc.id WHERE up.id = auth.uid() AND up.role = 'coach' AND cat.id = club_scoring_metrics.category_id));
CREATE POLICY "Coach can DELETE club_scoring_metrics in club" ON club_scoring_metrics
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id JOIN club_scoring_categories cat ON cat.config_id = csc.id WHERE up.id = auth.uid() AND up.role = 'coach' AND cat.id = club_scoring_metrics.category_id));
CREATE POLICY "Athlete can SELECT club_scoring_metrics in club" ON club_scoring_metrics
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id JOIN club_scoring_categories cat ON cat.config_id = csc.id WHERE up.id = auth.uid() AND up.role = 'athlete' AND cat.id = club_scoring_metrics.category_id));

-- =====================================================
-- RLS Policies สำหรับ scoring_config_history
-- =====================================================
CREATE POLICY "Admin can SELECT all scoring_config_history" ON scoring_config_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can INSERT scoring_config_history" ON scoring_config_history
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can UPDATE scoring_config_history" ON scoring_config_history
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin can DELETE scoring_config_history" ON scoring_config_history
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Coach can SELECT scoring_config_history in club" ON scoring_config_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id WHERE up.id = auth.uid() AND up.role = 'coach' AND csc.id = scoring_config_history.config_id));
CREATE POLICY "Coach can INSERT scoring_config_history in club" ON scoring_config_history
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id WHERE up.id = auth.uid() AND up.role = 'coach' AND csc.id = scoring_config_history.config_id));
CREATE POLICY "Athlete can SELECT scoring_config_history in club" ON scoring_config_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles up JOIN club_scoring_configs csc ON csc.club_id = up.club_id WHERE up.id = auth.uid() AND up.role = 'athlete' AND csc.id = scoring_config_history.config_id));

-- =====================================================
-- 5. Insert ข้อมูลเริ่มต้น
-- =====================================================

-- ประเภทกีฬาเริ่มต้น
INSERT INTO sport_types (name, display_name, description, is_system) VALUES
('pencak_silat', 'ปันจักสีลัต', 'ศิลปะการป้องกันตัวของเอเชียตะวันออกเฉียงใต้', true),
('futsal', 'ฟุตซอล', 'ฟุตบอลขนาดย่อม 5 คน สนามในร่ม', true),
('football', 'ฟุตบอล', 'ฟุตบอล 11 คน สนามกลางแจ้ง', true),
('sepak_takraw', 'ตะกร้อ', 'กีฬาเตะลูกตะกร้อข้ามตาข่าย', true),
('custom', 'กำหนดเอง', 'กำหนดประเภทกีฬาและเกณฑ์เอง', true)
ON CONFLICT (name) DO NOTHING;

-- รูปแบบการแข่งขัน
INSERT INTO competition_formats (sport_type_id, name, display_name, team_size, description)
SELECT id, 'sparring', 'ต่อสู้คะแนน', 1, 'การแข่งขันต่อสู้แบบให้คะแนน'
FROM sport_types WHERE name = 'pencak_silat'
ON CONFLICT (sport_type_id, name) DO NOTHING;

INSERT INTO competition_formats (sport_type_id, name, display_name, team_size, description)
SELECT id, 'kata', 'รำโชว์ (ร่ายท่า)', 1, 'การแข่งขันรำท่าศิลปะ'
FROM sport_types WHERE name = 'pencak_silat'
ON CONFLICT (sport_type_id, name) DO NOTHING;

INSERT INTO competition_formats (sport_type_id, name, display_name, team_size, description)
SELECT id, 'team_match', 'แข่งขันทีม', 5, 'การแข่งขันฟุตซอลทีม 5 คน'
FROM sport_types WHERE name = 'futsal'
ON CONFLICT (sport_type_id, name) DO NOTHING;

INSERT INTO competition_formats (sport_type_id, name, display_name, team_size, description)
SELECT id, 'team_match', 'แข่งขันทีม', 11, 'การแข่งขันฟุตบอลทีม 11 คน'
FROM sport_types WHERE name = 'football'
ON CONFLICT (sport_type_id, name) DO NOTHING;

INSERT INTO competition_formats (sport_type_id, name, display_name, team_size, description)
SELECT id, 'regu', 'เซปักตะกร้อทีม', 3, 'การแข่งขันตะกร้อทีม 3 คน'
FROM sport_types WHERE name = 'sepak_takraw'
ON CONFLICT (sport_type_id, name) DO NOTHING;

INSERT INTO competition_formats (sport_type_id, name, display_name, team_size, description)
SELECT id, 'circle', 'วงโตก', NULL, 'การแข่งขันตะกร้อวง'
FROM sport_types WHERE name = 'sepak_takraw'
ON CONFLICT (sport_type_id, name) DO NOTHING;
