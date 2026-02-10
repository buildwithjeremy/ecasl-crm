
-- Shared signature block and logo header used by all templates
-- Logo URL: https://ecasl-crm.lovable.app/images/ecasl-logo.png

-- =============================================
-- 1. interpreter_outreach
-- =============================================
UPDATE email_templates SET body = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 20px 0 10px;">
    <img src="https://ecasl-crm.lovable.app/images/ecasl-logo.png" alt="Effective Communication ASL" style="max-width: 220px; height: auto;" />
  </div>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 10px 0 25px;" />

  <p>Hi {{interpreter_name}},</p>
  <p>I have a job coming up that I think would be a great fit for you! Here are the details:</p>

  <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d6f;">
    <p style="margin: 5px 0;"><strong>Facility:</strong> {{facility_name}}</p>
    <p style="margin: 5px 0;"><strong>Date:</strong> {{job_date}}</p>
    <p style="margin: 5px 0;"><strong>Time:</strong> {{start_time}} – {{end_time}}</p>
    <p style="margin: 5px 0;"><strong>Location:</strong> {{location}}</p>
    <p style="margin: 5px 0;"><strong>Rate:</strong> {{rate_info}}</p>
  </div>

  <p>If you''re available, just reply to this email and let me know. I''d love to have you on this one!</p>

  <p style="margin-top: 30px;">Warm regards,</p>
  <p style="margin: 0; font-weight: bold;">Denise Corino</p>
  <p style="margin: 2px 0; color: #555;">Effective Communication</p>
  <p style="margin: 2px 0; color: #555;"><a href="https://www.ecasl.com" style="color: #2e7d6f;">www.ecasl.com</a></p>
  <p style="margin: 2px 0; color: #555;">917-330-0517</p>
  <p style="margin: 2px 0; color: #555;"><a href="mailto:admin@ecasl.com" style="color: #2e7d6f;">admin@ecasl.com</a></p>
  <p style="margin: 8px 0 0; font-size: 12px; color: #888;">GSA Schedule Contract 47QRAA25D00AR</p>
</div>
', updated_at = now()
WHERE name = 'interpreter_outreach';

-- =============================================
-- 2. interpreter_confirmation
-- =============================================
UPDATE email_templates SET body = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 20px 0 10px;">
    <img src="https://ecasl-crm.lovable.app/images/ecasl-logo.png" alt="Effective Communication ASL" style="max-width: 220px; height: auto;" />
  </div>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 10px 0 25px;" />

  <p>Hi {{interpreter_name}},</p>
  <p>Great news — you''re confirmed for the following assignment!</p>

  <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d6f;">
    <p style="margin: 5px 0;"><strong>Facility:</strong> {{facility_name}}</p>
    <p style="margin: 5px 0;"><strong>Date:</strong> {{job_date}}</p>
    <p style="margin: 5px 0;"><strong>Time:</strong> {{start_time}} – {{end_time}} {{timezone}}</p>
    <p style="margin: 5px 0;"><strong>Location:</strong> {{location}}</p>
    <p style="margin: 5px 0;"><strong>Contact:</strong> {{contact_name}} – {{contact_phone}}</p>
  </div>

  <p>Please plan to arrive 10–15 minutes early. If anything comes up or you have any questions, don''t hesitate to reach out to me directly.</p>
  <p>Thank you so much — I really appreciate you!</p>

  <p style="margin-top: 30px;">Warm regards,</p>
  <p style="margin: 0; font-weight: bold;">Denise Corino</p>
  <p style="margin: 2px 0; color: #555;">Effective Communication</p>
  <p style="margin: 2px 0; color: #555;"><a href="https://www.ecasl.com" style="color: #2e7d6f;">www.ecasl.com</a></p>
  <p style="margin: 2px 0; color: #555;">917-330-0517</p>
  <p style="margin: 2px 0; color: #555;"><a href="mailto:admin@ecasl.com" style="color: #2e7d6f;">admin@ecasl.com</a></p>
  <p style="margin: 8px 0 0; font-size: 12px; color: #888;">GSA Schedule Contract 47QRAA25D00AR</p>
</div>
', updated_at = now()
WHERE name = 'interpreter_confirmation';

-- =============================================
-- 3. invoice_reminder
-- =============================================
UPDATE email_templates SET body = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 20px 0 10px;">
    <img src="https://ecasl-crm.lovable.app/images/ecasl-logo.png" alt="Effective Communication ASL" style="max-width: 220px; height: auto;" />
  </div>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 10px 0 25px;" />

  <p>Hi {{facility_contact}},</p>
  <p>I wanted to follow up on the invoice below. Just a friendly reminder that payment is due soon:</p>

  <div style="background: #fff8e1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f9a825;">
    <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {{invoice_number}}</p>
    <p style="margin: 5px 0;"><strong>Amount Due:</strong> {{amount_due}}</p>
    <p style="margin: 5px 0;"><strong>Due Date:</strong> {{due_date}}</p>
    <p style="margin: 5px 0;"><strong>Service Date:</strong> {{service_date}}</p>
  </div>

  <p>If you''ve already sent payment, please disregard this note. Otherwise, feel free to reach out if you have any questions at all — happy to help!</p>

  <p style="margin-top: 30px;">Warm regards,</p>
  <p style="margin: 0; font-weight: bold;">Denise Corino</p>
  <p style="margin: 2px 0; color: #555;">Effective Communication</p>
  <p style="margin: 2px 0; color: #555;"><a href="https://www.ecasl.com" style="color: #2e7d6f;">www.ecasl.com</a></p>
  <p style="margin: 2px 0; color: #555;">917-330-0517</p>
  <p style="margin: 2px 0; color: #555;"><a href="mailto:admin@ecasl.com" style="color: #2e7d6f;">admin@ecasl.com</a></p>
  <p style="margin: 8px 0 0; font-size: 12px; color: #888;">GSA Schedule Contract 47QRAA25D00AR</p>
</div>
', updated_at = now()
WHERE name = 'invoice_reminder';

-- =============================================
-- 4. job_completion_thanks
-- =============================================
UPDATE email_templates SET body = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 20px 0 10px;">
    <img src="https://ecasl-crm.lovable.app/images/ecasl-logo.png" alt="Effective Communication ASL" style="max-width: 220px; height: auto;" />
  </div>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 10px 0 25px;" />

  <p>Hi {{interpreter_name}},</p>
  <p>Thank you so much for your work at {{facility_name}} on {{job_date}}! I really appreciate your professionalism and the great job you did.</p>
  <p>Your payment will be processed on our regular schedule. If you have any questions about compensation, just let me know.</p>
  <p>I look forward to working with you again soon — you''re always a pleasure to work with!</p>

  <p style="margin-top: 30px;">Warm regards,</p>
  <p style="margin: 0; font-weight: bold;">Denise Corino</p>
  <p style="margin: 2px 0; color: #555;">Effective Communication</p>
  <p style="margin: 2px 0; color: #555;"><a href="https://www.ecasl.com" style="color: #2e7d6f;">www.ecasl.com</a></p>
  <p style="margin: 2px 0; color: #555;">917-330-0517</p>
  <p style="margin: 2px 0; color: #555;"><a href="mailto:admin@ecasl.com" style="color: #2e7d6f;">admin@ecasl.com</a></p>
  <p style="margin: 8px 0 0; font-size: 12px; color: #888;">GSA Schedule Contract 47QRAA25D00AR</p>
</div>
', updated_at = now()
WHERE name = 'job_completion_thanks';
