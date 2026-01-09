-- Seed default email templates for the application
INSERT INTO public.email_templates (name, subject, body)
VALUES 
  (
    'interpreter_outreach',
    'Job Opportunity - {{facility_name}} on {{job_date}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Job Opportunity Available</h2>
  <p>Hi {{interpreter_name}},</p>
  <p>We have a new interpreting opportunity that matches your skills:</p>
  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Facility:</strong> {{facility_name}}</p>
    <p><strong>Date:</strong> {{job_date}}</p>
    <p><strong>Time:</strong> {{start_time}} - {{end_time}}</p>
    <p><strong>Location:</strong> {{location}}</p>
    <p><strong>Rate:</strong> {{rate_info}}</p>
  </div>
  <p>Please reply to this email or contact us to confirm your availability.</p>
  <p>Thank you,<br>ECASL Team</p>
</div>'
  ),
  (
    'interpreter_confirmation',
    'Confirmed: {{facility_name}} on {{job_date}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #28a745;">Job Confirmation</h2>
  <p>Hi {{interpreter_name}},</p>
  <p>This email confirms your assignment for the following job:</p>
  <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Job Number:</strong> {{job_number}}</p>
    <p><strong>Facility:</strong> {{facility_name}}</p>
    <p><strong>Date:</strong> {{job_date}}</p>
    <p><strong>Time:</strong> {{start_time}} - {{end_time}}</p>
    <p><strong>Location:</strong> {{location}}</p>
    <p><strong>Contact:</strong> {{contact_name}} - {{contact_phone}}</p>
  </div>
  <p>Please arrive 10-15 minutes early. If you need to cancel, please contact us as soon as possible.</p>
  <p>Thank you,<br>ECASL Team</p>
</div>'
  ),
  (
    'invoice_reminder',
    'Invoice {{invoice_number}} - Payment Reminder',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc3545;">Payment Reminder</h2>
  <p>Dear {{facility_contact}},</p>
  <p>This is a friendly reminder that the following invoice is due for payment:</p>
  <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
    <p><strong>Amount Due:</strong> {{amount_due}}</p>
    <p><strong>Due Date:</strong> {{due_date}}</p>
    <p><strong>Service Date:</strong> {{service_date}}</p>
  </div>
  <p>If you have already submitted payment, please disregard this notice. Otherwise, please remit payment at your earliest convenience.</p>
  <p>If you have any questions about this invoice, please don''t hesitate to contact us.</p>
  <p>Thank you,<br>ECASL Team</p>
</div>'
  ),
  (
    'job_completion_thanks',
    'Thank You - {{facility_name}} Job Complete',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Thank You!</h2>
  <p>Hi {{interpreter_name}},</p>
  <p>Thank you for completing the assignment at {{facility_name}} on {{job_date}}.</p>
  <p>We appreciate your professionalism and dedication to providing quality interpreting services.</p>
  <p>Your payment will be processed according to our standard schedule. If you have any questions about your compensation, please don''t hesitate to reach out.</p>
  <p>We look forward to working with you again soon!</p>
  <p>Best regards,<br>ECASL Team</p>
</div>'
  )
ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  updated_at = now();