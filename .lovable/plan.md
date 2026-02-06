

## Plan: Allow Job Confirmation Without Sending Email

### Summary

Remove the hard requirement that confirming a job must send an email. Add a separate "Confirm Job" button that sets the status to "confirmed" without sending an email. Keep the email-sending option available for when it's needed.

---

### Changes

#### Part 1: Add "Confirm Job" Button (No Email)

**File:** `src/components/jobs/fields/JobInterpreterSection.tsx`

Add a new button next to "Confirm Interpreter" that confirms the job without sending an email:

- **"Confirm Job"** - Sets status to confirmed, no email sent
- **"Send Confirmation"** (renamed from "Confirm Interpreter") - Sends email AND confirms

```tsx
{/* Confirm Job button (no email) */}
{onConfirmJob && (
  <Button
    type="button"
    variant="default"
    className="h-10 whitespace-nowrap"
    disabled={disabled || !canConfirmJob || isConfirmingJob}
    onClick={onConfirmJob}
  >
    <Check className="mr-2 h-4 w-4" />
    {isConfirmingJob ? 'Confirming...' : 'Confirm Job'}
  </Button>
)}

{/* Send Confirmation button (with email) */}
{onConfirmInterpreter && (
  <Button
    type="button"
    variant="outline"
    className="h-10 whitespace-nowrap"
    disabled={disabled || !canConfirmInterpreter || isConfirmingInterpreter}
    onClick={onConfirmInterpreter}
  >
    <Mail className="mr-2 h-4 w-4" />
    {isConfirmingInterpreter ? 'Loading...' : 'Send Confirmation'}
  </Button>
)}
```

Add new props to the component:
- `onConfirmJob` - Callback for confirming without email
- `isConfirmingJob` - Loading state
- `canConfirmJob` - Whether button should be enabled (interpreter assigned, status is new or outreach_in_progress)

---

#### Part 2: Add Confirm Job Mutation (No Email)

**File:** `src/pages/JobDetail.tsx`

Add a new mutation that confirms the job without sending an email:

```typescript
const confirmJobMutation = useMutation({
  mutationFn: async () => {
    if (!selectedJobId) throw new Error('No job selected');
    
    const data = form.getValues();
    const interpreterId = data.interpreter_id;
    
    if (!interpreterId) throw new Error('No interpreter selected');
    
    // Get interpreter info for success message
    const { data: interpreterInfo } = await supabase
      .from('interpreters')
      .select('first_name, last_name')
      .eq('id', interpreterId)
      .single();
    
    const interpreterName = interpreterInfo 
      ? `${interpreterInfo.first_name} ${interpreterInfo.last_name}`
      : 'Interpreter';
    
    // Build payload (similar to confirmInterpreterMutation but without email)
    const payload = {
      // ... all form fields
      status: 'confirmed',
      interpreter_id: interpreterId,
      // Note: No confirmation_sent_at since no email was sent
    };
    
    const { data: savedJob, error } = await supabase
      .from('jobs')
      .update(payload)
      .eq('id', selectedJobId)
      .select('*')
      .single();
      
    if (error) throw error;
    
    return { savedJob, interpreterName };
  },
  onSuccess: ({ savedJob, interpreterName }) => {
    queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['jobs-list'] });
    if (savedJob) {
      form.reset(jobToFormValues(savedJob), { keepDefaultValues: false });
    }
    toast({
      title: 'Job Confirmed',
      description: `${interpreterName} assigned. Status updated to Confirmed.`,
    });
  },
  onError: (error: Error) => {
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  },
});
```

---

#### Part 3: Wire Up the New Button

**File:** `src/pages/JobDetail.tsx`

Pass the new handlers to `JobInterpreterSection`:

```tsx
// Same condition as canConfirmInterpreter - interpreter assigned, valid status
const canConfirmJob = !!watchedInterpreterId && 
  (watchedStatus === 'outreach_in_progress' || watchedStatus === 'new');

// In component props:
<JobInterpreterSection
  // ... existing props
  onConfirmJob={handleConfirmJob}
  isConfirmingJob={confirmJobMutation.isPending}
  canConfirmJob={canConfirmJob}
  // Rename existing prop for clarity in the code
  onConfirmInterpreter={prepareConfirmationEmailPreview}
  canConfirmInterpreter={canConfirmInterpreter}
/>
```

Add a handler that uses save-before-action pattern:

```typescript
const handleConfirmJob = useCallback(() => {
  saveJob
    .run(async () => {
      await confirmJobMutation.mutateAsync();
    })
    .catch((e) => {
      toast({
        title: 'Could not confirm job',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    });
}, [saveJob, confirmJobMutation, toast]);
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/jobs/fields/JobInterpreterSection.tsx` | Add "Confirm Job" button, rename email button to "Send Confirmation" |
| `src/pages/JobDetail.tsx` | Add `confirmJobMutation`, wire up `handleConfirmJob` handler |

---

### User Experience

| Action | What Happens |
|--------|--------------|
| **Confirm Job** (new) | Sets status to "confirmed", saves interpreter assignment, no email sent |
| **Send Confirmation** (renamed) | Opens email preview, sends confirmation email, sets status to "confirmed" |

Both buttons require an interpreter to be selected. The "Confirm Job" button is the primary action (filled style), while "Send Confirmation" is secondary (outline style).

---

### Button Layout

The Selected Interpreter section will have two buttons:

```
[ Selected Interpreter dropdown ] [ Confirm Job ] [ Send Confirmation 📧 ]
```

- **Confirm Job** - Primary button, confirms without email
- **Send Confirmation** - Secondary button with mail icon, sends email

