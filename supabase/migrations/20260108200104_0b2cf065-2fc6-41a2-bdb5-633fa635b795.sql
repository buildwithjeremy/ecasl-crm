-- Add bill_number and notes columns to interpreter_bills table
ALTER TABLE public.interpreter_bills 
ADD COLUMN IF NOT EXISTS bill_number text,
ADD COLUMN IF NOT EXISTS notes text;

-- Create function to generate bill number (similar to job_number format)
CREATE OR REPLACE FUNCTION public.generate_bill_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  current_year TEXT;
  next_number INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.interpreter_bills
  WHERE bill_number LIKE current_year || '-%';
  
  NEW.bill_number := current_year || '-' || LPAD(next_number::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-generating bill numbers
DROP TRIGGER IF EXISTS generate_bill_number_trigger ON public.interpreter_bills;
CREATE TRIGGER generate_bill_number_trigger
BEFORE INSERT ON public.interpreter_bills
FOR EACH ROW
WHEN (NEW.bill_number IS NULL OR NEW.bill_number = '')
EXECUTE FUNCTION public.generate_bill_number();