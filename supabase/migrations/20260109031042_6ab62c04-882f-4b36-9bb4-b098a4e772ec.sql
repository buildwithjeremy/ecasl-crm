-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access to invoices
CREATE POLICY "Anyone can view invoice PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices');

-- Create policy for authenticated users to upload invoices
CREATE POLICY "Authenticated users can upload invoice PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to update invoices
CREATE POLICY "Authenticated users can update invoice PDFs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'invoices' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to delete invoices
CREATE POLICY "Authenticated users can delete invoice PDFs"
ON storage.objects FOR DELETE
USING (bucket_id = 'invoices' AND auth.role() = 'authenticated');