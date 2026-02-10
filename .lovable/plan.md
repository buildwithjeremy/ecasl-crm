

## Unified "Mark as Paid" Workflow for Invoices and Payables

### Goal
Create a clean, consistent payment workflow on both Invoice and Payable detail pages where:
- The Paid Date field is hidden until the user marks the record as paid
- Clicking "Mark as Paid" sets the status and reveals the date (defaulting to today)
- The date remains editable after marking paid
- Setting a paid date automatically updates the status

### Design

**Before Paid** (status is `draft`, `submitted`, or `queued`):
- No Paid Date field visible
- A prominent "Mark as Paid" button in the Bill/Invoice Details card header
- Clicking it sets status to `paid`, sets paid_date to today, saves, and reveals the date

**After Paid** (status is `paid`):
- Paid Date field appears (pre-filled with the date, editable)
- Badge shows "Paid"
- "Mark as Paid" button disappears (replaced by the visible date)
- Optionally: an "Undo" or ability to clear the date to revert status

### Changes

**1. Invoice Detail (`src/pages/InvoiceDetail.tsx`)**

- Remove the `paid_date` field from the always-visible 3-column date grid
- Show "Mark as Paid" button in the Invoice Details card header for ALL non-paid statuses (currently only `submitted`) -- this means `draft` invoices can also be marked paid
- When status is `paid`, show the Paid Date as an editable date input below the other dates
- When `paid_date` form value is cleared and saved, revert status back to the previous state (either `draft` or `submitted` based on whether it was sent)

**2. Payable Detail (`src/pages/PayableDetail.tsx`)**

- Remove `paid_date` from the always-visible form fields
- Keep the existing "Mark as Paid" button (already works well)
- When status is `paid`, show the Paid Date as an editable date input
- Same clear-to-revert behavior

### Technical Details

**InvoiceDetail.tsx changes:**
- Move `paid_date` FormField out of the 3-column grid
- Conditionally render it only when `invoice.status === 'paid'`
- Change the "Mark as Paid" button condition from `invoice.status === 'submitted'` to `invoice.status !== 'paid'`
- In the save mutation, add logic: if `paid_date` is cleared and status is `paid`, update status back to `submitted` (if pdf was sent) or `draft`

**PayableDetail.tsx changes:**
- Conditionally render `paid_date` FormField only when `payable.status === 'paid'`
- In the save mutation, add logic: if `paid_date` is cleared and status is `paid`, update status back to `queued`

**Both pages - consistent UI pattern:**
- When not paid: "Mark as Paid" button with DollarSign icon in card header
- When paid: Paid Date input shown in a highlighted row/section with a subtle background, clearly indicating payment was recorded
- The date grid becomes 2-column (Invoice Date, Due Date) for invoices and just Notes for payables when not yet paid

