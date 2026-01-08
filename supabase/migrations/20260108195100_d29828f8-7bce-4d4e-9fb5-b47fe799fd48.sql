-- Fix search_path for generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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