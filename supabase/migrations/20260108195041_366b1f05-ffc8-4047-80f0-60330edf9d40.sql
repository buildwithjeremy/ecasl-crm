-- Add job_id and pdf_url columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id),
ADD COLUMN IF NOT EXISTS pdf_url text;

-- Create function to generate invoice number (similar to job_number format)
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  current_year TEXT;
  next_number INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM COALESCE(NEW.issued_date, CURRENT_DATE))::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE current_year || '-%';
  
  NEW.invoice_number := current_year || '-' || LPAD(next_number::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-generating invoice numbers
DROP TRIGGER IF EXISTS generate_invoice_number_trigger ON public.invoices;
CREATE TRIGGER generate_invoice_number_trigger
BEFORE INSERT ON public.invoices
FOR EACH ROW
WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
EXECUTE FUNCTION public.generate_invoice_number();

-- Set default for issued_date to now() and due_date to 2 weeks later
ALTER TABLE public.invoices 
ALTER COLUMN issued_date SET DEFAULT CURRENT_DATE,
ALTER COLUMN due_date SET DEFAULT (CURRENT_DATE + INTERVAL '14 days')::date;