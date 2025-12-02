-- Migration: Create Activity Categories table
-- Requirements: 1.4 - Default categories for training logs

-- Table: activity_categories
CREATE TABLE IF NOT EXISTS activity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sorting
CREATE INDEX IF NOT EXISTS idx_activity_categories_sort ON activity_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_activity_categories_active ON activity_categories(is_active);

-- Insert default categories (Requirement 1.4)
INSERT INTO activity_categories (name, icon, sort_order) VALUES
  ('วิ่ง', 'run', 1),
  ('ว่ายน้ำ', 'swim', 2),
  ('ยกน้ำหนัก', 'weight', 3),
  ('ยืดเหยียด', 'stretch', 4),
  ('กีฬาเฉพาะทาง', 'sport', 5),
  ('อื่นๆ', 'other', 99);
