-- Switch job_number / invoice_number / bill_number formats from YYYY-##### to YY-#####

-- =====================================
-- Jobs: job_number
-- =====================================
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_year_yy TEXT;
  next_number INTEGER;
BEGIN
  current_year_yy := to_char(NEW.job_date, 'YY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.jobs
  WHERE job_number LIKE current_year_yy || '-%';

  NEW.job_number := current_year_yy || '-' || LPAD(next_number::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Create trigger if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_job_number'
  ) THEN
    CREATE TRIGGER set_job_number
    BEFORE INSERT ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_job_number();
  END IF;
END $$;

-- =====================================
-- Invoices: invoice_number
-- =====================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_year_yy TEXT;
  next_number INTEGER;
  job_num TEXT;
  job_year_yy TEXT;
  job_suffix TEXT;
BEGIN
  -- If invoice is tied to a job, match the job's postfix and YY prefix
  IF NEW.job_id IS NOT NULL THEN
    SELECT job_number INTO job_num
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF job_num IS NOT NULL AND position('-' in job_num) > 0 THEN
      job_year_yy := split_part(job_num, '-', 1);
      job_suffix := split_part(job_num, '-', 2);

      IF job_year_yy ~ '^[0-9]{2}$' AND job_suffix ~ '^[0-9]+$' THEN
        NEW.invoice_number := job_year_yy || '-' || LPAD(job_suffix, 5, '0');
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  -- Fallback: sequential invoice numbering by YY of issued_date/current
  current_year_yy := to_char(COALESCE(NEW.issued_date, CURRENT_DATE), 'YY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE current_year_yy || '-%';

  NEW.invoice_number := current_year_yy || '-' || LPAD(next_number::TEXT, 5, '0');
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

-- =====================================
-- Interpreter bills: bill_number
-- =====================================
CREATE OR REPLACE FUNCTION public.generate_bill_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_year_yy TEXT;
  next_number INTEGER;
  job_num TEXT;
  job_year_yy TEXT;
  job_suffix TEXT;
BEGIN
  -- If bill is tied to a job, match the job's postfix and YY prefix
  IF NEW.job_id IS NOT NULL THEN
    SELECT job_number INTO job_num
    FROM public.jobs
    WHERE id = NEW.job_id;

    IF job_num IS NOT NULL AND position('-' in job_num) > 0 THEN
      job_year_yy := split_part(job_num, '-', 1);
      job_suffix := split_part(job_num, '-', 2);

      IF job_year_yy ~ '^[0-9]{2}$' AND job_suffix ~ '^[0-9]+$' THEN
        NEW.bill_number := job_year_yy || '-' || LPAD(job_suffix, 5, '0');
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  -- Fallback: sequential bill numbering by YY of current date
  current_year_yy := to_char(CURRENT_DATE, 'YY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.interpreter_bills
  WHERE bill_number LIKE current_year_yy || '-%';

  NEW.bill_number := current_year_yy || '-' || LPAD(next_number::TEXT, 5, '0');
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
