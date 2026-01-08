-- Add missing fee columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS misc_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS trilingual_rate_uplift numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS travel_time_rate numeric DEFAULT 0;