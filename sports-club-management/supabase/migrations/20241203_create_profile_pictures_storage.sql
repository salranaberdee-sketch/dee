-- Create profile-pictures storage bucket for user avatars
-- Requirements: 1.4, 4.2
-- Path format: {user_id}/avatar_{timestamp}.{ext}

-- Create the bucket with public access for viewing
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own avatar
-- Path format: {user_id}/avatar_{timestamp}.{ext}
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Avatars are publicly viewable (public bucket)
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Policy: Admin can manage all avatars
CREATE POLICY "Admin can manage all avatars"
ON storage.objects FOR ALL
USING (
  bucket_id = 'profile-pictures'
  AND EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
