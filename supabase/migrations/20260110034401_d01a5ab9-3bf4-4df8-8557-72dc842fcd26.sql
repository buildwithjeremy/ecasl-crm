-- Add signed contract PDF URL columns to interpreters and facilities
ALTER TABLE public.interpreters
ADD COLUMN signed_contract_pdf_url text;

ALTER TABLE public.facilities
ADD COLUMN signed_contract_pdf_url text;