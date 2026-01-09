-- Add contract_pdf_url column to facilities table
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT;