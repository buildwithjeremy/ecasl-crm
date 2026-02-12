UPDATE email_templates SET body = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 20px 0 10px;">
    <img src="https://ecasl-crm.lovable.app/images/ecasl-logo.png" alt="Effective Communication ASL" style="max-width: 220px; height: auto;" />
  </div>
  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 10px 0 25px;" />

  <p>Hi {{interpreter_name}},</p>
  <p>Great news — you''re confirmed for the following assignment!</p>

  <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d6f;">
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
', updated_at = now() WHERE name = 'interpreter_confirmation';