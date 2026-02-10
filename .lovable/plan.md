

## Allow Regenerating Missing Invoice or Bill

### Problem
When a user deletes just the invoice (or just the bill) for a job, the "Generate Invoice & Bill" button stays greyed out because the condition requires:
1. Job status is `complete` (but it's already `ready_to_bill`)
2. Both `!jobInvoice` AND `!jobBill` (but one still exists)

### Solution

**1. Relax the enable condition** (`src/pages/JobDetail.tsx`, line 343)

Change `canGenerateBilling` to also allow `ready_to_bill` status and allow generation when either record is missing:

```
// Before
canGenerateBilling = watchedStatus === 'complete' && !!watchedInterpreterId && !jobInvoice && !jobBill;

// After
canGenerateBilling = (watchedStatus === 'complete' || watchedStatus === 'ready_to_bill') 
  && !!watchedInterpreterId 
  && (!jobInvoice || !jobBill);
```

**2. Skip creating records that already exist** (`src/pages/JobDetail.tsx`, lines 1435-1451)

Wrap the invoice insert in `if (!jobInvoice)` and the bill insert in `if (!jobBill)` so only the missing record(s) get created.

**3. Update button label and confirmation dialog** (`src/components/jobs/fields/JobBillingFields.tsx`)

Pass flags for which records exist so the UI can say:
- "Generate Invoice & Bill" when both are missing
- "Generate Invoice" when only the invoice is missing  
- "Generate Bill" when only the bill is missing

The confirmation dialog bullet points will also adjust to only list what will be created.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/JobDetail.tsx` | Relax `canGenerateBilling`, conditionally skip existing records |
| `src/components/jobs/fields/JobBillingFields.tsx` | Dynamic button label and dialog based on which records are missing |

