-- Create storage bucket for facility contracts if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('facility-contracts', 'facility-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the storage bucket
CREATE POLICY "Facility contracts are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'facility-contracts');

CREATE POLICY "Service role can upload facility contracts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'facility-contracts');

CREATE POLICY "Service role can update facility contracts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'facility-contracts');

CREATE POLICY "Service role can delete facility contracts"
ON storage.objects FOR DELETE
USING (bucket_id = 'facility-contracts');