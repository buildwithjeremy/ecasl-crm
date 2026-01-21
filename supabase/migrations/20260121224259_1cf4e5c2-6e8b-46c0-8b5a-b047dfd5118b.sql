-- Update interpreter confirmation email template:
-- - Remove Job Number/Job ID line
-- - Include timezone on the Time line

UPDATE public.email_templates
SET body = $$<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #28a745;">Job Confirmation</h2>
  <p>Hi {{interpreter_name}},</p>
  <p>This email confirms your assignment for the following job:</p>
  <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Facility:</strong> {{facility_name}}</p>
    <p><strong>Date:</strong> {{job_date}}</p>
    <p><strong>Time:</strong> {{start_time}} - {{end_time}} {{timezone}}</p>
    <p><strong>Location:</strong> {{location}}</p>
    <p><strong>Contact:</strong> {{contact_name}} - {{contact_phone}}</p>
  </div>
  <p>Please arrive 10-15 minutes early. If you need to cancel, please contact us as soon as possible.</p>
  <p>Thank you,<br>ECASL Team</p>
</div>$$
WHERE name = 'interpreter_confirmation';
