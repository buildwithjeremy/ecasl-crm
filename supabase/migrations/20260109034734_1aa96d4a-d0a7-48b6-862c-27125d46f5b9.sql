-- Update the trigger function to use correct enum value 'submitted' instead of 'sent'
CREATE OR REPLACE FUNCTION public.update_job_status_on_invoice_sent()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed from 'draft' to 'submitted'
  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
    -- Update the linked job from 'ready_to_bill' to 'billed'
    UPDATE public.jobs
    SET status = 'billed', updated_at = now()
    WHERE id = NEW.job_id
      AND status = 'ready_to_bill';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;