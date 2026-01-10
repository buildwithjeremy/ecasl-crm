-- Add facility_type enum and column
CREATE TYPE public.facility_type AS ENUM ('hospital', 'clinic', 'school', 'government', 'business', 'other');

ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS facility_type public.facility_type;

-- Add timezone column for facilities (if not exists)
ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS timezone TEXT;