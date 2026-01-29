

## Plan: Data Quality Validation and Incomplete Records View

### Summary

This plan addresses incomplete imported data by:
1. Adding proactive validation before sending emails (with deep-links to fix issues)
2. Creating a "Data Issues" filter/view to identify records missing critical fields
3. Surfacing visual indicators on list views for incomplete records

---

### Critical Fields Analysis

Based on the database audit and code review:

**Interpreters (524 total)**:
| Issue | Count | Workflow Impact |
|-------|-------|-----------------|
| No email | 52 | Cannot send outreach/confirmation emails |
| No business rate | 18 | Cannot calculate pay amounts |
| No after-hours rate | 464 | Cannot calculate after-hours pay |
| No phone | 523 | Minor - display only |
| No address | 508 | Minor - not used in core workflow |

**Facilities (225 total)**:
| Issue | Count | Workflow Impact |
|-------|-------|-----------------|
| No physical address | 60 | Jobs inherit location for confirmation emails |
| No timezone | 224 | Email times display incorrectly |
| No business rate | 18 | Cannot calculate billing amounts |
| No billing contacts | 54 | Cannot send invoices |
| No after-hours rate | 85 | Cannot calculate after-hours billing |

---

### Implementation Plan

#### Part 1: Pre-Action Validation with Actionable Errors

**1.1 Add validation before sending outreach emails**

**File:** `src/pages/JobDetail.tsx`

Before preparing the outreach email preview, check that all selected interpreters have valid email addresses. If any don't, show a clear error with a link to fix each one:

```typescript
// In prepareOutreachEmailPreview
const interpretersWithoutEmail = interpreterList?.filter(i => !i.email) || [];
if (interpretersWithoutEmail.length > 0) {
  toast({
    title: 'Missing Email Addresses',
    description: (
      <div className="space-y-1">
        <p>The following interpreters are missing email addresses:</p>
        <ul className="list-disc pl-4">
          {interpretersWithoutEmail.map(i => (
            <li key={i.id}>
              <Link to={`/interpreters/${i.id}`} className="underline text-primary">
                {i.first_name} {i.last_name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ),
    variant: 'destructive',
    duration: 10000,
  });
  return;
}
```

**1.2 Add validation before sending confirmation emails**

Similarly validate the selected interpreter has an email before sending confirmation.

**1.3 Add validation for job location/timezone in confirmation emails**

Warn if location or timezone is missing (non-blocking but informative):

```typescript
if (!location || location === 'TBD') {
  // Show warning but don't block - location will show as "TBD"
  console.warn('Job is missing location details');
}
```

---

#### Part 2: "Data Issues" Filter for Interpreters and Facilities

**2.1 Add "Has Issues" filter to Interpreters page**

**File:** `src/pages/Interpreters.tsx`

Add a new filter option that finds interpreters with:
- Missing email (blocks email workflows)
- Missing business rate (blocks pay calculations)
- Missing payment method

```typescript
const dataIssueOptions: FilterOption[] = [
  { value: 'missing_email', label: 'Missing Email' },
  { value: 'missing_rates', label: 'Missing Rates' },
  { value: 'any_issue', label: 'Any Issue' },
];

// In query, add filter logic:
if (dataIssueFilter === 'missing_email') {
  query = query.or('email.is.null,email.eq.');
} else if (dataIssueFilter === 'missing_rates') {
  query = query.or('rate_business_hours.is.null,rate_after_hours.is.null');
} else if (dataIssueFilter === 'any_issue') {
  query = query.or('email.is.null,email.eq.,rate_business_hours.is.null');
}
```

**2.2 Add "Has Issues" filter to Facilities page**

**File:** `src/pages/Facilities.tsx`

Add similar filter for facilities:
- Missing billing contacts
- Missing business rate  
- Missing timezone
- Missing physical address (for non-contractors)

```typescript
const dataIssueOptions: FilterOption[] = [
  { value: 'missing_contact', label: 'No Billing Contact' },
  { value: 'missing_rates', label: 'Missing Rates' },
  { value: 'missing_timezone', label: 'No Timezone' },
  { value: 'any_issue', label: 'Any Issue' },
];
```

---

#### Part 3: Visual Indicators on Tables

**3.1 Add warning badge to InterpretersTable**

**File:** `src/components/interpreters/InterpretersTable.tsx`

Add a warning icon/badge next to interpreter names when they have data issues:

```typescript
// Add to the table row
<TableCell className="font-medium">
  <div className="flex items-center gap-2">
    {interpreter.first_name} {interpreter.last_name}
    {(!interpreter.email || !interpreter.rate_business_hours) && (
      <Badge variant="outline" className="text-amber-600 border-amber-400">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Incomplete
      </Badge>
    )}
  </div>
</TableCell>
```

**3.2 Add warning badge to FacilitiesTable**

**File:** `src/components/facilities/FacilitiesTable.tsx`

Similar treatment for facilities:

```typescript
// Check for issues
const hasIssue = !facility.rate_business_hours || 
  (facility.billing_contacts as any[])?.length === 0 ||
  (!facility.timezone && !facility.contractor);
```

---

#### Part 4: Improved Toast Messages with Deep Links

**4.1 Create a helper component for actionable toasts**

**File:** `src/components/ui/action-toast.tsx` (new file)

Create a reusable component for toasts that include links:

```typescript
interface ActionToastProps {
  title: string;
  description: string;
  links?: Array<{ label: string; href: string }>;
}

export function ActionToast({ title, description, links }: ActionToastProps) {
  return (
    <div className="space-y-2">
      <p>{description}</p>
      {links && links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((link, i) => (
            <a 
              key={i}
              href={link.href}
              className="text-primary underline text-sm"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

**4.2 Update email sending to use actionable toasts**

When an email fails due to missing data, show the toast with a direct link to fix:

```typescript
toast({
  title: 'Cannot Send Email',
  description: (
    <ActionToast
      description="This interpreter doesn't have an email address."
      links={[{ label: 'Edit Interpreter', href: `/interpreters/${interpreterId}` }]}
    />
  ),
  variant: 'destructive',
});
```

---

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ui/action-toast.tsx` | Create | Reusable toast with deep links |
| `src/pages/Interpreters.tsx` | Modify | Add "Data Issues" filter dropdown |
| `src/pages/Facilities.tsx` | Modify | Add "Data Issues" filter dropdown |
| `src/components/interpreters/InterpretersTable.tsx` | Modify | Add visual warning badge for incomplete records |
| `src/components/facilities/FacilitiesTable.tsx` | Modify | Add visual warning badge for incomplete records |
| `src/pages/JobDetail.tsx` | Modify | Add pre-send validation with actionable errors |

---

### Technical Notes

**Decision: Filter vs. Dedicated Page**

I recommend adding filters to existing list pages rather than a dedicated "Data Issues" page because:
- Lower maintenance burden (no new page to maintain)
- Users can combine with other filters (e.g., "Active interpreters with missing email")
- Familiar UX pattern - uses existing filter dropdown system
- Deep links from error messages lead directly to edit pages

**Non-Blocking vs. Blocking Validations**

- **Blocking** (prevent action):
  - Sending email to interpreter without email address
  - Sending invoice without billing contact email
  
- **Non-Blocking** (show warning but allow):
  - Job with "TBD" location (interpreter will see TBD in email)
  - Missing after-hours rate (defaults to 0 in calculations)
  - Missing interpreter address (not needed for emails)

**Database Query Optimization**

The data issues filters use OR conditions which Postgres handles efficiently. The additional filter overhead is minimal since the interpreter/facility tables are small (524 and 225 records respectively).

