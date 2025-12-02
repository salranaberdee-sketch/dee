-- Add avatar_url column to user_profiles table for profile pictures
-- Requirements: 1.5, 2.3

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
