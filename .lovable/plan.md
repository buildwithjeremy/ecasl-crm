

## Auto-advance Job Status to "Paid"

### Problem
When both the Invoice and Payable for a job are marked as paid, the job status stays at "Billed". It should automatically advance to "Paid".

### Solution
After marking an invoice or payable as paid, check if both sides are now paid for the associated job. If so, update the job status to "paid". Conversely, if either is reverted from paid, revert the job status back to "billed".

### Changes

**1. `src/pages/InvoiceDetail.tsx`** -- In the `statusMutation.onSuccess` callback (when marking paid):
- Query the payable (`interpreter_bills`) for the same `job_id`
- If the payable also has `status = 'paid'`, update the job status to `'paid'`
- When reverting (clearing paid_date in save mutation), set job status back to `'billed'`

**2. `src/pages/PayableDetail.tsx`** -- In the `statusMutation.onSuccess` callback (when marking paid):
- Query the invoice for the same `job_id`
- If the invoice also has `status = 'paid'`, update the job status to `'paid'`
- When reverting (clearing paid_date in save mutation), set job status back to `'billed'`

### Logic Summary

```text
On Invoice "Mark as Paid":
  1. Set invoice status = paid, paid_date = today
  2. Check: does this invoice's job have a payable with status = paid?
  3. If yes -> set job.status = 'paid'

On Payable "Mark as Paid":
  1. Set payable status = paid, paid_date = today
  2. Check: does this payable's job have an invoice with status = paid?
  3. If yes -> set job.status = 'paid'

On either reverted from paid:
  1. If job.status was 'paid', revert to 'billed'
```

### Edge Cases
- Jobs without a payable or invoice: mark as paid when the existing one is paid (won't block on missing records)
- Only advance if the job is currently at "billed" or later, to avoid jumping ahead in the workflow
