-- Migration: RLS Policies for Profile Albums
-- Requirements: 5.1, 5.3

-- Enable RLS on user_albums
ALTER TABLE user_albums ENABLE ROW LEVEL SECURITY;

-- Enable RLS on album_media
ALTER TABLE album_media ENABLE ROW LEVEL SECURITY;

-- ============ user_albums RLS Policies ============

-- Users can view their own albums
CREATE POLICY "Users can view own albums" ON user_albums
  FOR SELECT USING (auth.uid() = user_id);

-- Coaches can view albums of athletes in their club
CREATE POLICY "Coaches can view athlete albums" ON user_albums
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM athletes a
      JOIN coaches c ON a.coach_id = c.id
      WHERE a.user_id = user_albums.user_id
      AND c.user_id = auth.uid()
    )
  );

-- Users can create their own albums
CREATE POLICY "Users can create own albums" ON user_albums
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own albums
CREATE POLICY "Users can update own albums" ON user_albums
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own albums
CREATE POLICY "Users can delete own albums" ON user_albums
  FOR DELETE USING (auth.uid() = user_id);

-- ============ album_media RLS Policies ============

-- Users can view their own media
CREATE POLICY "Users can view own media" ON album_media
  FOR SELECT USING (auth.uid() = user_id);

-- Coaches can view media of athletes in their club
CREATE POLICY "Coaches can view athlete media" ON album_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM athletes a
      JOIN coaches c ON a.coach_id = c.id
      WHERE a.user_id = album_media.user_id
      AND c.user_id = auth.uid()
    )
  );

-- Users can create their own media
CREATE POLICY "Users can create own media" ON album_media
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own media
CREATE POLICY "Users can update own media" ON album_media
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own media
CREATE POLICY "Users can delete own media" ON album_media
  FOR DELETE USING (auth.uid() = user_id);
