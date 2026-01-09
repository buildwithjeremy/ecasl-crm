-- Fix the trigger function to use correct enum value 'queued' instead of 'payment_pending'
CREATE OR REPLACE FUNCTION public.update_job_status_on_bill_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed from 'queued' to 'paid'
  IF OLD.status = 'queued' AND NEW.status = 'paid' THEN
    -- Update the linked job from 'billed' to 'paid'
    UPDATE public.jobs
    SET status = 'paid', updated_at = now()
    WHERE id = NEW.job_id
      AND status = 'billed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Force schema cache refresh
COMMENT ON TABLE public.interpreter_bills IS 'Interpreter bill records for payables';