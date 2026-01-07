-- 1. Add avatar_url to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create the Storage Bucket 'avatars' (This usually needs to be done in UI, but we can try to insert if storage schema is accessible)
-- A common pattern for Supabase migrations to create buckets via SQL:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policy: Allow anyone (authenticated) to READ avatars
CREATE POLICY "Public Read Avatars"   
ON storage.objects FOR SELECT   
USING ( bucket_id = 'avatars' );

-- 4. Policy: Allow authenticated users to UPLOAD (INSERT) an avatar
-- Restricting usage so they can only look at their own folder or similar could be done, 
-- but for simplicity we allow any auth user to upload.
CREATE POLICY "Authenticated Upload Avatar"   
ON storage.objects FOR INSERT   
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- 5. Policy: Allow authenticated users to UPDATE their own avatar
CREATE POLICY "Authenticated Update Avatar"   
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
