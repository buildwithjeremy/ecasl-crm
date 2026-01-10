-- Fix generate_job_number function to set search_path
CREATE OR REPLACE FUNCTION public.generate_job_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  current_year TEXT;
  next_number INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM NEW.job_date)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.jobs
  WHERE job_number LIKE current_year || '-%';
  
  NEW.job_number := current_year || '-' || LPAD(next_number::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column function to set search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;