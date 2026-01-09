-- Add contract_pdf_url column to interpreters table
ALTER TABLE public.interpreters ADD COLUMN IF NOT EXISTS contract_pdf_url text;

-- Create storage bucket for interpreter contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('interpreter-contracts', 'interpreter-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to interpreter contracts
CREATE POLICY "Interpreter contracts are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'interpreter-contracts');

-- Allow authenticated users to upload contracts
CREATE POLICY "Authenticated users can upload interpreter contracts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'interpreter-contracts' AND auth.role() = 'authenticated');

-- Allow authenticated users to update contracts
CREATE POLICY "Authenticated users can update interpreter contracts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'interpreter-contracts' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete contracts
CREATE POLICY "Authenticated users can delete interpreter contracts"
ON storage.objects FOR DELETE
USING (bucket_id = 'interpreter-contracts' AND auth.role() = 'authenticated');