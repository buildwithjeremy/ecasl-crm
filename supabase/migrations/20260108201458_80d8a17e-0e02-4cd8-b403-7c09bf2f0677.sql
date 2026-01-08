-- Add potential_interpreter_ids array column to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS potential_interpreter_ids uuid[] DEFAULT '{}';