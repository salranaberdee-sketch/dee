-- Migration: Create notification_history table for Notification Inbox feature
-- Requirements: 1.2 - Store notifications in Notification_History table
-- Date: 2024-12-02

-- ============================================
-- 1. Create notification_history table
-- ============================================
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- CHECK constraint for valid notification types
  CONSTRAINT valid_notification_type CHECK (
    type IN (
      'announcement_urgent',
      'announcement_normal',
      'schedule_updates',
      'event_reminders',
      'tournament_updates',
      'club_application'
    )
  )
);

-- ============================================
-- 2. Create indexes for performance
-- ============================================

-- Index for filtering by user_id (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id 
  ON notification_history(user_id);

-- Index for sorting by created_at descending (for inbox display)
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at 
  ON notification_history(created_at DESC);

-- Partial index for unread notifications (read_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_notification_history_unread 
  ON notification_history(user_id, created_at DESC) 
  WHERE read_at IS NULL;

-- ============================================
-- 3. Enable Row Level Security
-- ============================================
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies
-- ============================================

-- Policy: Users can only SELECT their own notifications
CREATE POLICY "Users can view own notifications"
  ON notification_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can only UPDATE read_at on their own notifications
CREATE POLICY "Users can update own notification read status"
  ON notification_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notification_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can INSERT (for Edge Function)
-- Note: Service role bypasses RLS by default, but we add this for clarity
CREATE POLICY "Service role can insert notifications"
  ON notification_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert their own notifications (for testing)
CREATE POLICY "Users can insert own notifications"
  ON notification_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. Add comment for documentation
-- ============================================
COMMENT ON TABLE notification_history IS 'Stores notification history for users. Part of Notification Inbox feature.';
COMMENT ON COLUMN notification_history.type IS 'Type of notification: announcement_urgent, announcement_normal, schedule_updates, event_reminders, tournament_updates, club_application';
COMMENT ON COLUMN notification_history.reference_type IS 'Type of referenced content (e.g., announcement, schedule, tournament)';
COMMENT ON COLUMN notification_history.reference_id IS 'UUID of the referenced content';
COMMENT ON COLUMN notification_history.read_at IS 'Timestamp when notification was read. NULL means unread.';
