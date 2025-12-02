-- Migration: Create Storage Bucket for Profile Albums
-- Requirements: 2.4

-- Create the storage bucket for profile albums
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-albums',
  'profile-albums',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============ Storage Policies ============

-- Users can upload files to their own folder
CREATE POLICY "Users can upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-albums' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own files
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'profile-albums' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Coaches can view files of athletes in their club
CREATE POLICY "Coaches can view athlete files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'profile-albums' AND
    EXISTS (
      SELECT 1 FROM athletes a
      JOIN coaches c ON a.coach_id = c.id
      WHERE a.user_id::text = (storage.foldername(name))[1]
      AND c.user_id = auth.uid()
    )
  );

-- Users can update their own files
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-albums' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-albums' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
