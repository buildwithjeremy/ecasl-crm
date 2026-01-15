-- Add RID number field to interpreters table
ALTER TABLE public.interpreters
ADD COLUMN rid_number text;