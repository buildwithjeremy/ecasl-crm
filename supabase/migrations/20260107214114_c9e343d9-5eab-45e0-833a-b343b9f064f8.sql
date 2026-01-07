-- Add contractor boolean to facilities
ALTER TABLE public.facilities 
ADD COLUMN contractor boolean DEFAULT false;

-- Add client fields to jobs for contractor facilities
ALTER TABLE public.jobs 
ADD COLUMN client_business_name text,
ADD COLUMN client_contact_name text,
ADD COLUMN client_contact_phone text,
ADD COLUMN client_contact_email text;