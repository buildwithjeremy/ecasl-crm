-- Add rate adjustment fields to jobs table for facility and interpreter
ALTER TABLE public.jobs 
ADD COLUMN facility_rate_adjustment numeric DEFAULT 0,
ADD COLUMN interpreter_rate_adjustment numeric DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.jobs.facility_rate_adjustment IS 'Per-hour rate adjustment for facility billing (can be positive or negative)';
COMMENT ON COLUMN public.jobs.interpreter_rate_adjustment IS 'Per-hour rate adjustment for interpreter pay (can be positive or negative)';