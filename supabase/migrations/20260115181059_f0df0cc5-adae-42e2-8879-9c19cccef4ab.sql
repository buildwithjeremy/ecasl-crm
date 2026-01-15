-- Add timezone column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN timezone text;

-- Add comment explaining the field
COMMENT ON COLUMN public.jobs.timezone IS 'Job timezone - auto-populated from facility for regular facilities, manually set for contractor/GSA facilities';