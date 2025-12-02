-- Migration: Create Training Goals table
-- Requirements: 3.2 - Store goal with user_id, goal_type, target_value, start_date

-- Table: training_goals
CREATE TABLE IF NOT EXISTS training_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type VARCHAR(50) DEFAULT 'weekly_sessions',
  target_value INTEGER NOT NULL DEFAULT 3,
  start_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_type)
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_training_goals_user_id ON training_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_training_goals_active ON training_goals(is_active);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_training_goals_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_training_goals_updated_at
  BEFORE UPDATE ON training_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_training_goals_updated_at();
