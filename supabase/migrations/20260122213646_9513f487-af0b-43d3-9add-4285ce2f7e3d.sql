-- Update invoice/bill number generation so numbers created from a job match the job_number postfix

-- ==============================
-- Invoices: invoice_number
-- ==============================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  job_num TEXT;
  job_year TEXT;
  job_suffix TEXT;
BEGIN
  -- If the invoice is tied to a job, match the job number (YYYY-#####)
  IF NEW.job_id IS NOT NULL THEN
    SELECT job_number INTO job_num
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF job_num IS NOT NULL AND position('-' in job_num) > 0 THEN
      job_year := split_part(job_num, '-', 1);
      job_suffix := split_part(job_num, '-', 2);

      -- Only apply if suffix looks numeric; otherwise fall back.
      IF job_suffix ~ '^[0-9]+$' THEN
        NEW.invoice_number := job_year || '-' || LPAD(job_suffix, 5, '0');
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  -- Fallback: existing sequential invoice numbering by year
  current_year := EXTRACT(YEAR FROM COALESCE(NEW.issued_date, CURRENT_DATE))::TEXT;

  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE current_year || '-%';

  NEW.invoice_number := current_year || '-' || LPAD(next_number::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Create trigger if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_invoice_number'
  ) THEN
    CREATE TRIGGER set_invoice_number
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_invoice_number();
  END IF;
END $$;

-- ==============================
-- Interpreter bills: bill_number
-- ==============================
CREATE OR REPLACE FUNCTION public.generate_bill_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  job_num TEXT;
  job_year TEXT;
  job_suffix TEXT;
BEGIN
  -- If the bill is tied to a job, match the job number (YYYY-#####)
  IF NEW.job_id IS NOT NULL THEN
    SELECT job_number INTO job_num
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF job_num IS NOT NULL AND position('-' in job_num) > 0 THEN
      job_year := split_part(job_num, '-', 1);
      job_suffix := split_part(job_num, '-', 2);

      IF job_suffix ~ '^[0-9]+$' THEN
        NEW.bill_number := job_year || '-' || LPAD(job_suffix, 5, '0');
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  -- Fallback: existing sequential bill numbering by current year
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.interpreter_bills
  WHERE bill_number LIKE current_year || '-%';

  NEW.bill_number := current_year || '-' || LPAD(next_number::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Create trigger if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_bill_number'
  ) THEN
    CREATE TRIGGER set_bill_number
    BEFORE INSERT ON public.interpreter_bills
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_bill_number();
  END IF;
END $$;