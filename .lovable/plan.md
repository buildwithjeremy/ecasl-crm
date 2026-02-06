

## Plan: Add Data Quality Dashboard Widget

### Summary

Add a new dashboard section that displays counts of incomplete interpreters and facilities, with clickable cards that navigate directly to the pre-filtered list views.

---

### Implementation Approach

#### Part 1: Update Dashboard with Data Quality Widget

**File:** `src/pages/Index.tsx`

Add two new queries to count incomplete records, then add a new card section below the existing stats:

**New Queries:**

```typescript
// Count interpreters with data issues (missing email OR missing business rate)
const { data: incompleteInterpretersCount } = useQuery({
  queryKey: ['incomplete-interpreters-count'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('interpreters')
      .select('id, email, rate_business_hours');
    if (error) throw error;
    // Apply same logic as hasDataIssues in InterpretersTable
    return data.filter(i => !i.email || !i.rate_business_hours).length;
  },
});

// Count facilities with data issues (client-side filter for complex JSONB check)
const { data: incompleteFacilitiesCount } = useQuery({
  queryKey: ['incomplete-facilities-count'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('facilities')
      .select('id, billing_contacts, rate_business_hours, timezone, contractor');
    if (error) throw error;
    return data.filter(f => {
      const hasBillingContactWithEmail = Array.isArray(f.billing_contacts) && 
        (f.billing_contacts as any[]).some(c => c?.email);
      const hasBusinessRate = f.rate_business_hours != null;
      const hasTimezone = !!f.timezone;
      if (f.contractor) {
        return !hasBillingContactWithEmail || !hasBusinessRate;
      }
      return !hasBillingContactWithEmail || !hasBusinessRate || !hasTimezone;
    }).length;
  },
});
```

**New UI Section:**

Add a "Data Quality" section below the main stats with two clickable cards:

```tsx
{/* Data Quality Section */}
{(incompleteInterpretersCount > 0 || incompleteFacilitiesCount > 0) && (
  <div className="space-y-3">
    <h2 className="text-lg font-semibold text-foreground">Needs Attention</h2>
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
      <Card 
        className="cursor-pointer hover:bg-muted/50 transition-colors border-amber-200"
        onClick={() => navigate('/interpreters?issues=any_issue')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Incomplete Interpreters</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {incompleteInterpretersCount ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">Missing email or rates</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer hover:bg-muted/50 transition-colors border-amber-200"
        onClick={() => navigate('/facilities?issues=any_issue')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Incomplete Facilities</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {incompleteFacilitiesCount ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">Missing contact, rates, or timezone</p>
        </CardContent>
      </Card>
    </div>
  </div>
)}
```

---

#### Part 2: Enable URL-Based Filter State

**File:** `src/pages/Interpreters.tsx`

Read initial filter value from URL search params:

```typescript
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Interpreters() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Initialize filter from URL if present
  const [dataIssueFilter, setDataIssueFilter] = useState(
    searchParams.get('issues') || 'all'
  );
  // ... rest unchanged
}
```

**File:** `src/pages/Facilities.tsx`

Same pattern - read initial `issues` param from URL:

```typescript
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Facilities() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [dataIssueFilter, setDataIssueFilter] = useState(
    searchParams.get('issues') || 'all'
  );
  // ... rest unchanged
}
```

---

### Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/Index.tsx` | Modify | Add data quality queries and clickable cards |
| `src/pages/Interpreters.tsx` | Modify | Read initial `issues` filter from URL params |
| `src/pages/Facilities.tsx` | Modify | Read initial `issues` filter from URL params |

---

### User Experience Flow

1. **Dashboard** shows "Needs Attention" section with counts (only if > 0)
2. User clicks "Incomplete Interpreters" card
3. Browser navigates to `/interpreters?issues=any_issue`
4. Interpreters page reads `issues=any_issue` from URL and pre-selects the filter
5. Table shows only interpreters with data issues
6. User clicks on a row to edit and fix the record
7. After saving, user can return to dashboard to see updated counts

---

### Visual Design

- Cards use amber/warning color scheme to indicate action needed
- Cards are only shown when there are actually incomplete records (no empty state)
- Hover effect indicates cards are clickable
- Uses existing `AlertTriangle` icon for consistency with table badges

