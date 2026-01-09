-- Create trigger function to update job status when bill is paid
CREATE OR REPLACE FUNCTION public.update_job_status_on_bill_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed from 'payment_pending' to 'paid'
  IF OLD.status = 'payment_pending' AND NEW.status = 'paid' THEN
    -- Update the linked job from 'billed' to 'paid'
    UPDATE public.jobs
    SET status = 'paid', updated_at = now()
    WHERE id = NEW.job_id
      AND status = 'billed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on interpreter_bills table
DROP TRIGGER IF EXISTS on_bill_paid_update_job_status ON public.interpreter_bills;
CREATE TRIGGER on_bill_paid_update_job_status
  AFTER UPDATE ON public.interpreter_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_job_status_on_bill_paid();