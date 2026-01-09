-- Drop the billing_hours_type column from jobs table
ALTER TABLE public.jobs DROP COLUMN IF EXISTS billing_hours_type;

-- Drop the billing_hours_type enum type
DROP TYPE IF EXISTS public.billing_hours_type;