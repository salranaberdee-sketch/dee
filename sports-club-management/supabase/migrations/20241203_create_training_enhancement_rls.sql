-- Migration: RLS Policies for Training Logs Enhancement tables
-- Requirements: 5.2, 5.3, 6.1 - Role-based access control

-- ============================================
-- ACTIVITY_CATEGORIES RLS
-- Everyone read, Admin manage
-- ============================================
ALTER TABLE activity_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view active categories
CREATE POLICY "Everyone can view active categories" ON activity_categories
  FOR SELECT USING (is_active = true);

-- Admin can view all categories (including inactive)
CREATE POLICY "Admin can SELECT all categories" ON activity_categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can insert categories
CREATE POLICY "Admin can INSERT categories" ON activity_categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update categories
CREATE POLICY "Admin can UPDATE categories" ON activity_categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete categories
CREATE POLICY "Admin can DELETE categories" ON activity_categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- TRAINING_GOALS RLS
-- Users manage own, Coach view athletes in club
-- ============================================
ALTER TABLE training_goals ENABLE ROW LEVEL SECURITY;

-- Admin can SELECT all goals
CREATE POLICY "Admin can SELECT all goals" ON training_goals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- Admin can INSERT all goals
CREATE POLICY "Admin can INSERT all goals" ON training_goals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can UPDATE all goals
CREATE POLICY "Admin can UPDATE all goals" ON training_goals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can DELETE all goals
CREATE POLICY "Admin can DELETE all goals" ON training_goals
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Coach can view athlete goals in same club
CREATE POLICY "Coach can SELECT goals in club" ON training_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles coach
      JOIN user_profiles athlete ON athlete.id = training_goals.user_id
      WHERE coach.id = auth.uid()
      AND coach.role = 'coach'
      AND coach.club_id = athlete.club_id
      AND coach.club_id IS NOT NULL
    )
  );

-- Users can SELECT own goals
CREATE POLICY "Users can SELECT own goals" ON training_goals
  FOR SELECT USING (auth.uid() = user_id);

-- Users can INSERT own goals
CREATE POLICY "Users can INSERT own goals" ON training_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE own goals
CREATE POLICY "Users can UPDATE own goals" ON training_goals
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can DELETE own goals
CREATE POLICY "Users can DELETE own goals" ON training_goals
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- USER_ACHIEVEMENTS RLS
-- Users view own, Coach view athletes in club
-- ============================================
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Admin can SELECT all achievements
CREATE POLICY "Admin can SELECT all achievements" ON user_achievements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can INSERT all achievements
CREATE POLICY "Admin can INSERT all achievements" ON user_achievements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can UPDATE all achievements
CREATE POLICY "Admin can UPDATE all achievements" ON user_achievements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can DELETE all achievements
CREATE POLICY "Admin can DELETE all achievements" ON user_achievements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Coach can view athlete achievements in same club
CREATE POLICY "Coach can SELECT achievements in club" ON user_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles coach
      JOIN user_profiles athlete ON athlete.id = user_achievements.user_id
      WHERE coach.id = auth.uid()
      AND coach.role = 'coach'
      AND coach.club_id = athlete.club_id
      AND coach.club_id IS NOT NULL
    )
  );

-- Users can SELECT own achievements
CREATE POLICY "Users can SELECT own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- Users can INSERT own achievements (for system to award)
CREATE POLICY "Users can INSERT own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
