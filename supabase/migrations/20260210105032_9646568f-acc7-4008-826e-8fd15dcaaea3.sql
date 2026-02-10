
-- Update the bill_paid trigger to check if invoice is also paid before advancing job
CREATE OR REPLACE FUNCTION public.update_job_status_on_bill_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invoice_is_paid BOOLEAN;
BEGIN
  -- Check if status changed from 'queued' to 'paid'
  IF OLD.status = 'queued' AND NEW.status = 'paid' THEN
    -- Check if the invoice for this job is also paid (or doesn't exist)
    SELECT COALESCE(
      (SELECT i.status = 'paid' FROM public.invoices i WHERE i.job_id = NEW.job_id LIMIT 1),
      TRUE  -- If no invoice exists, don't block
    ) INTO invoice_is_paid;

    IF invoice_is_paid THEN
      UPDATE public.jobs
      SET status = 'paid', updated_at = now()
      WHERE id = NEW.job_id
        AND status IN ('billed', 'ready_to_bill');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the invoice_sent trigger to also handle invoice paid -> check bill
CREATE OR REPLACE FUNCTION public.update_job_status_on_invoice_sent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  bill_is_paid BOOLEAN;
BEGIN
  -- Existing logic: draft -> submitted advances job to billed
  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
    UPDATE public.jobs
    SET status = 'billed', updated_at = now()
    WHERE id = NEW.job_id
      AND status = 'ready_to_bill';
  END IF;

  -- New logic: when invoice marked as paid, check if bill is also paid
  IF OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid' THEN
    SELECT COALESCE(
      (SELECT ib.status = 'paid' FROM public.interpreter_bills ib WHERE ib.job_id = NEW.job_id LIMIT 1),
      TRUE  -- If no bill exists, don't block
    ) INTO bill_is_paid;

    IF bill_is_paid THEN
      UPDATE public.jobs
      SET status = 'paid', updated_at = now()
      WHERE id = NEW.job_id
        AND status IN ('billed', 'ready_to_bill');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
