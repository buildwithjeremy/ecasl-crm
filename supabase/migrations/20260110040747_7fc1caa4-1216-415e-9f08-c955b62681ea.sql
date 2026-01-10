-- Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('invoices', 'interpreter-contracts', 'facility-contracts');

-- Drop any existing public access policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access on invoices" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access on interpreter-contracts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access on facility-contracts" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for invoices" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for interpreter-contracts" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for facility-contracts" ON storage.objects;

-- Create policies for authenticated team members only
-- Invoices bucket - team members can read and write
CREATE POLICY "Team members can access invoices"
ON storage.objects FOR ALL
USING (
  bucket_id = 'invoices'
  AND public.is_team_member(auth.uid())
)
WITH CHECK (
  bucket_id = 'invoices'
  AND public.is_team_member(auth.uid())
);

-- Interpreter contracts bucket - team members can read and write
CREATE POLICY "Team members can access interpreter-contracts"
ON storage.objects FOR ALL
USING (
  bucket_id = 'interpreter-contracts'
  AND public.is_team_member(auth.uid())
)
WITH CHECK (
  bucket_id = 'interpreter-contracts'
  AND public.is_team_member(auth.uid())
);

-- Facility contracts bucket - team members can read and write
CREATE POLICY "Team members can access facility-contracts"
ON storage.objects FOR ALL
USING (
  bucket_id = 'facility-contracts'
  AND public.is_team_member(auth.uid())
)
WITH CHECK (
  bucket_id = 'facility-contracts'
  AND public.is_team_member(auth.uid())
);