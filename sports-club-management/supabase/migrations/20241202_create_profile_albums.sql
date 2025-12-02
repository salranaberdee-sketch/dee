-- Migration: Create Profile Albums tables
-- Requirements: 1.3, 2.5

-- Table: user_albums
CREATE TABLE IF NOT EXISTS user_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  album_type VARCHAR(50) DEFAULT 'general', -- competition, training, documents, general
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_albums
CREATE INDEX IF NOT EXISTS idx_user_albums_user_id ON user_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_user_albums_type ON user_albums(album_type);
CREATE INDEX IF NOT EXISTS idx_user_albums_updated_at ON user_albums(updated_at DESC);

-- Table: album_media
CREATE TABLE IF NOT EXISTS album_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES user_albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- image/jpeg, image/png, image/webp, application/pdf
  file_size INTEGER NOT NULL, -- bytes
  thumbnail_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for album_media
CREATE INDEX IF NOT EXISTS idx_album_media_album_id ON album_media(album_id);
CREATE INDEX IF NOT EXISTS idx_album_media_user_id ON album_media(user_id);

-- Trigger to update updated_at on user_albums
CREATE OR REPLACE FUNCTION update_user_albums_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_albums_updated_at
  BEFORE UPDATE ON user_albums
  FOR EACH ROW
  EXECUTE FUNCTION update_user_albums_updated_at();
