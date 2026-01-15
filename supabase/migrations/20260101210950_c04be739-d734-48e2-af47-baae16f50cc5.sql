-- Remove the public read policy from receipts bucket
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;

-- Ensure the bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'receipts';