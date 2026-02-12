

# Editable Email Templates with Quick-Insert and Settings Management

## Overview

This feature adds three capabilities:
1. The email preview dialog becomes an **editable composer** where the body can be modified before sending
2. **Quick-add template buttons** (e.g., "Workers Comp") let users insert pre-defined text blocks into the email body
3. A **template management section in Settings** for admins to view and edit all available templates

## Current State

- Two templates exist in the `email_templates` table: `interpreter_outreach` and `interpreter_confirmation`
- The `EmailPreviewDialog` shows a read-only HTML preview with template variables already replaced
- The send mutations (`sendOutreachMutation`, `confirmInterpreterMutation`) independently re-fetch the template from the DB and re-process variables -- they do NOT use the previewed content
- Settings page currently only has profile info and mileage rate

## Plan

### 1. Database: Add a `template_snippets` table for quick-insert blocks

A new table to store reusable text snippets (like Workers Comp language) that can be inserted into emails:

```sql
CREATE TABLE public.template_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  label text NOT NULL,           -- button display text, e.g. "Workers Comp"
  content text NOT NULL,         -- HTML content to insert
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.template_snippets ENABLE ROW LEVEL SECURITY;

-- Same RLS pattern as email_templates
CREATE POLICY "Admins can manage template snippets" ON public.template_snippets
  FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Team members can view template snippets" ON public.template_snippets
  FOR SELECT USING (is_team_member(auth.uid()));
```

Seed with the Workers Comp snippet and a default 15-minute wait policy snippet.

### 2. Refactor `EmailPreviewDialog` into an editable composer

**Changes to `EmailPreviewDialog.tsx`:**

- Replace the read-only body display with a `<Textarea>` (plain text/HTML editing area) pre-filled with the rendered email body
- Add an `onEmailDataChange` callback so the parent can track edits
- Add a toolbar row above the editor with quick-insert snippet buttons fetched from `template_snippets`
- Clicking a snippet button inserts that snippet's HTML content at the cursor position (or appends to the end)
- The subject line also becomes an editable `<Input>` field

**Updated props interface:**
```typescript
interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailData: EmailPreviewData | null;
  onConfirmSend: (editedSubject: string, editedBody: string) => void;
  isSending: boolean;
}
```

### 3. Update send mutations to use edited content from the dialog

**Changes to `JobDetail.tsx`:**

- `handleConfirmSendEmail` receives `editedSubject` and `editedBody` from the dialog
- Store the edited content in a ref or state so the mutations can access it
- Modify `sendOutreachMutation` and `confirmInterpreterMutation` to use the edited content instead of re-fetching the template from the DB
- Since the body is already rendered (variables replaced), send it directly as the final HTML -- skip template variable processing on the edge function side

### 4. Add Email Templates section to Settings page

**Changes to `Settings.tsx`:**

- Add a new Card section (admin-only) titled "Email Templates" below Default Rates
- Fetch all records from `email_templates` table
- Display each template as an expandable/collapsible card with:
  - Template name (display-friendly label)
  - Editable subject line (`<Input>`)
  - Editable body (`<Textarea>` for raw HTML)
  - Save button per template
- Add a second section for "Email Snippets" showing records from `template_snippets`:
  - Editable label, content fields
  - Add/delete snippet capability
  - Sort order control

### 5. Seed default snippet data

Insert the two initial snippets:

- **"15-Min Wait Policy"**: Standard language about the 15-minute wait window
- **"Workers Comp"**: Specific language about calling within 10 minutes or payment is forfeited

---

## Technical Details

### File changes summary:

| File | Change |
|------|--------|
| `database migration` | Create `template_snippets` table with RLS + seed data |
| `src/components/jobs/EmailPreviewDialog.tsx` | Convert to editable composer with snippet toolbar |
| `src/pages/JobDetail.tsx` | Pass edited content through send flow; stop re-fetching template in mutations |
| `src/pages/Settings.tsx` | Add template and snippet management UI sections |

### Key architectural decisions:

- The email body editor uses a plain `<Textarea>` for HTML editing rather than a rich-text editor -- keeps it simple and consistent with the current HTML template approach
- A live HTML preview panel sits alongside the textarea so users can see rendered output as they edit
- Snippets are inserted as raw HTML at the cursor position in the textarea
- The send flow changes from "re-fetch template + re-process variables" to "send the already-rendered content directly" -- this ensures what you see in the preview is exactly what gets sent
- Per-recipient personalization (interpreter name) is still handled by the mutation, which replaces `{{interpreter_name}}` in the edited body for each recipient

