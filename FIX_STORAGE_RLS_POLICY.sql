-- ==========================================
-- FIX: Storage RLS Policy for Bill Uploads
-- ==========================================
-- This fixes the "new row violates row-level security policy for table objects" error

-- Step 1: Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Step 2: Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- Step 3: Create a PERMISSIVE policy for the bill bucket
-- This allows ANY authenticated user to upload to the bill bucket
CREATE POLICY "Anyone can upload bills"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'bill'
);

-- Step 4: Create a SELECT policy so users can view bills
CREATE POLICY "Anyone can view bills"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'bill'
);

-- Step 5: Create UPDATE policy (for file metadata)
CREATE POLICY "Anyone can update bills"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'bill'
)
WITH CHECK (
  bucket_id = 'bill'
);

-- Step 6: Create DELETE policy (optional - restrict this more if needed)
CREATE POLICY "Anyone can delete bills"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'bill'
);

-- ==========================================
-- ALTERNATIVE: If you want folder-based restrictions
-- ==========================================
-- Uncomment this if you want users to only access their own folders

/*
-- Drop the permissive policies above first
DROP POLICY IF EXISTS "Anyone can upload bills" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view bills" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update bills" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete bills" ON storage.objects;

-- Create folder-based policies
-- Note: This will only work if you switch to Supabase Auth

CREATE POLICY "Users can upload to their folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'bill' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their folder"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'bill' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their folder"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'bill' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'bill' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete from their folder"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'bill' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
*/

-- ==========================================
-- Verify the policies were created
-- ==========================================
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%bill%';
