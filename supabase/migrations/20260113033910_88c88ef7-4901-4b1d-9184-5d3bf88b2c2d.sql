-- Add holiday rate columns to facilities table
ALTER TABLE public.facilities
ADD COLUMN rate_holiday_hours numeric DEFAULT NULL;

-- Add holiday rate columns to interpreters table  
ALTER TABLE public.interpreters
ADD COLUMN rate_holiday_hours numeric DEFAULT NULL;

-- Add holiday rate columns to jobs table for rate propagation
ALTER TABLE public.jobs
ADD COLUMN facility_rate_holiday numeric DEFAULT NULL,
ADD COLUMN interpreter_rate_holiday numeric DEFAULT NULL;