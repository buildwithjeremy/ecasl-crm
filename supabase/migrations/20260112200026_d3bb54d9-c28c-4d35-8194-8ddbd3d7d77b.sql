-- Create settings table for app-wide settings
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Team members can view settings"
ON public.settings
FOR SELECT
USING (is_team_member(auth.uid()));

CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Insert default mileage rate
INSERT INTO public.settings (key, value, description)
VALUES ('default_mileage_rate', '0.7', 'Default mileage rate per mile for job calculations');

-- Add trigger for updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove rate_mileage from interpreters table
ALTER TABLE public.interpreters DROP COLUMN IF EXISTS rate_mileage;

-- Remove rate_mileage from facilities table
ALTER TABLE public.facilities DROP COLUMN IF EXISTS rate_mileage;