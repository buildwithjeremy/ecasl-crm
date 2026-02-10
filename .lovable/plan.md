

## Plan: Job Status Progression Indicator

### Summary

Add a horizontal step indicator below the header on the Job Detail page that shows where the job is in its lifecycle. Each step is a labeled dot connected by lines. The current step is highlighted, completed steps are filled, and future steps are dimmed. This gives Denise an at-a-glance view of what's done and what's next.

### Visual Design

The progression bar will look like this:

```text
 (*)-----(*)-----(*)-----( )-----( )-----( )-----( )
 New   Outreach  Confirmed  Complete  Ready to  Billed   Paid
                                       Bill
```

- Completed steps: filled circle with check, connected by a colored line
- Current step: filled circle, slightly larger or highlighted with a ring
- Future steps: empty/dimmed circle, gray connecting line
- Cancelled: if status is "cancelled", show all steps as dimmed with a "Cancelled" badge overlaid

### Status Order

The main flow (excluding "cancelled" which is a branch):

1. New
2. Outreach
3. Confirmed
4. Complete
5. Ready to Bill
6. Billed
7. Paid

### Implementation

#### New Component: `src/components/jobs/JobStatusStepper.tsx`

A self-contained component that takes the current status and renders the stepper:

```tsx
interface JobStatusStepperProps {
  currentStatus: string;
}
```

The component will:
- Define the ordered steps array
- Calculate the current step index
- Render circles and connecting lines with appropriate styles
- Handle "cancelled" as a special case (show a cancelled badge, all steps dimmed)
- Use Tailwind classes for styling (primary color for completed, muted for future)
- Be responsive: on small screens, show abbreviated labels

#### Integration: `src/pages/JobDetail.tsx`

Place the stepper just inside the form, before the first card section:

```tsx
{job && (
  <Form {...form}>
    <form id="job-detail-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Status progression indicator */}
      <JobStatusStepper currentStatus={watchedStatus} />

      <JobCoreFields ... />
      ...
    </form>
  </Form>
)}
```

Uses `watchedStatus` (from `form.watch('status')`) so it updates live if the status changes.

---

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/jobs/JobStatusStepper.tsx` | New component - horizontal step indicator |
| `src/pages/JobDetail.tsx` | Import and render `JobStatusStepper` above the form fields |

---

### Technical Details

- Steps array: `['new', 'outreach_in_progress', 'confirmed', 'complete', 'ready_to_bill', 'billed', 'paid']`
- Current index determined by `steps.indexOf(currentStatus)`
- Steps with index less than current: completed styling (filled circle, colored connector)
- Step at current index: active styling (ring highlight)
- Steps with index greater than current: future styling (gray/dimmed)
- "cancelled" status: render all steps as dimmed, overlay a "Cancelled" badge
- Uses existing Tailwind color tokens (`bg-primary`, `text-muted-foreground`, etc.) to match the app's theme
- Responsive: labels stack below dots on all screen sizes; font size reduces on mobile

