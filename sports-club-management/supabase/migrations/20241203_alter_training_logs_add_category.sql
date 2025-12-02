-- Migration: Add category columns to training_logs
-- Requirements: 1.1, 1.5 - Category selection and custom activity for "อื่นๆ"

-- Add category_id column referencing activity_categories
ALTER TABLE training_logs 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES activity_categories(id);

-- Add custom_activity column for "อื่นๆ" category
ALTER TABLE training_logs 
ADD COLUMN IF NOT EXISTS custom_activity VARCHAR(100);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_training_logs_category ON training_logs(category_id);
