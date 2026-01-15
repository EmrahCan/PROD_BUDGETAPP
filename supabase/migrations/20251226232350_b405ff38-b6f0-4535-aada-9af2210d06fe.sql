-- Fix 1: Make the receipts bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'receipts';

-- Fix 2: Remove the overly permissive public access policy
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;

-- Note: The following user-scoped policies should already exist and remain:
-- "Users can upload their own receipts" (INSERT)
-- "Users can view their own receipts" (SELECT)
-- "Users can delete their own receipts" (DELETE)