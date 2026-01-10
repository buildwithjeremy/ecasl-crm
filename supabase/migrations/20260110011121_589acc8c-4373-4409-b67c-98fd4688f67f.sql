-- Remove net_terms and invoice_prefix columns from facilities table
ALTER TABLE public.facilities DROP COLUMN IF EXISTS net_terms;
ALTER TABLE public.facilities DROP COLUMN IF EXISTS invoice_prefix;