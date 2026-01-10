-- Add insurance_end_date column to interpreters table
ALTER TABLE public.interpreters 
ADD COLUMN IF NOT EXISTS insurance_end_date date;