

## Email Branding Overhaul

### Summary

Download and self-host the logo, update both edge functions with proper sender/reply-to, and rewrite all 4 email templates with a warm, personal tone as if Denise is writing them herself.

---

### 1. Self-Host the Logo

- Download the logo from `https://ecasl.com/wp-content/uploads/2025/08/logo_from_current_website.png`
- Add it to the project at `public/images/ecasl-logo.png`
- Reference it via the published URL: `https://ecasl-crm.lovable.app/images/ecasl-logo.png` in email templates (email clients need an absolute URL)

---

### 2. Edge Function Updates

**`supabase/functions/send-email/index.ts`** (line ~120-125):
- Change `from` to `"Denise Corino, Effective Communication <noreply@denise.ecasl.com>"`
- Add `reply_to: "dsign1118@aol.com"`

**`supabase/functions/send-invoice-email/index.ts`** (line ~188-192):
- Change `from` from `"ECASL <onboarding@resend.dev>"` to `"Denise Corino, Effective Communication <noreply@denise.ecasl.com>"`
- Add `reply_to: "dsign1118@aol.com"`

---

### 3. Email Template Rewrites (SQL migration)

All 4 templates get a shared structure:

```text
+------------------------------------------+
|  [ECASL Logo - centered at top]          |
+------------------------------------------+
|                                          |
|  Warm, personal email body               |
|  (written as Denise, not "ECASL Team")   |
|                                          |
+------------------------------------------+
|  Warm regards,                           |
|  Denise Corino                           |
|  Effective Communication                 |
|  www.ecasl.com                           |
|  917-330-0517                            |
|  admin@ecasl.com                         |
|  GSA Schedule Contract 47QRAA25D00AR     |
+------------------------------------------+
```

#### Template tone changes:

**interpreter_outreach** -- currently formal/corporate. Will become:
- "Hi {{interpreter_name}}," stays
- Body rewritten to sound like Denise reaching out personally: "I have a job coming up that I think would be a great fit for you..."
- Sign-off: "Warm regards, Denise Corino" + signature block

**interpreter_confirmation** -- currently stiff. Will become:
- Warmer opening: "Great news! You're confirmed for the following assignment..."
- Same job details card (kept clean for scannability)
- Personal touch: "Please arrive 10-15 minutes early. Let me know if anything comes up."
- Sign-off: Denise's signature block

**invoice_reminder** -- currently reads like a collection notice. Will become:
- Softer: "Hi {{facility_contact}}, I wanted to follow up on the invoice below..."
- Same invoice details card
- Friendly close: "If you've already sent payment, please disregard this note. Feel free to reach out with any questions."
- Sign-off: Denise's signature block

**job_completion_thanks** -- currently generic. Will become:
- Genuine and warm: "Thank you so much for your work at {{facility_name}}! I really appreciate your professionalism..."
- Personal note about looking forward to future work
- Sign-off: Denise's signature block

---

### 4. Files Modified

| File | Change |
|------|--------|
| `public/images/ecasl-logo.png` | New -- downloaded and self-hosted logo |
| `supabase/functions/send-email/index.ts` | Update `from` name, add `reply_to` |
| `supabase/functions/send-invoice-email/index.ts` | Update `from` to verified domain, add `reply_to` |
| New SQL migration | Update all 4 email template bodies in `email_templates` table |

