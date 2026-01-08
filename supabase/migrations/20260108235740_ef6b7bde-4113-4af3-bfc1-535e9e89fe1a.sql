-- Add hourly total and billable total columns for facility and interpreter
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS facility_hourly_total numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS facility_billable_total numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS interpreter_hourly_total numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS interpreter_billable_total numeric DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.jobs.facility_hourly_total IS 'Facility charge for hours only (business + after hours)';
COMMENT ON COLUMN public.jobs.facility_billable_total IS 'Total facility charge including hours, mileage, and fees';
COMMENT ON COLUMN public.jobs.interpreter_hourly_total IS 'Interpreter pay for hours only (business + after hours)';
COMMENT ON COLUMN public.jobs.interpreter_billable_total IS 'Total interpreter pay including hours, mileage, travel time, and fees';