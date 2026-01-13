-- Remove timezone column from interpreters table
ALTER TABLE public.interpreters DROP COLUMN IF EXISTS timezone;