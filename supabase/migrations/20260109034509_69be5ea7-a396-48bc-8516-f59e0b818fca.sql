-- Create a trigger function to update job status when invoice is sent
CREATE OR REPLACE FUNCTION public.update_job_status_on_invoice_sent()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed from 'draft' to 'sent'
  IF OLD.status = 'draft' AND NEW.status = 'sent' THEN
    -- Update the linked job from 'ready_to_bill' to 'billed'
    UPDATE public.jobs
    SET status = 'billed', updated_at = now()
    WHERE id = NEW.job_id
      AND status = 'ready_to_bill';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger on the invoices table
CREATE TRIGGER on_invoice_sent_update_job_status
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_job_status_on_invoice_sent();