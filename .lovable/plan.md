

## Plan: Jobs Calendar Default View, Improved Tooltips, and Global Search

### Summary

Make three improvements to the Jobs page:
1. Default to Calendar view instead of Table
2. Update calendar tooltips to prioritize useful information (time, facility, interpreter) over job number
3. Extend search to work with calendar view by searching additional fields (city, facility name, interpreter name)

---

### Changes

#### Part 1: Default to Calendar View

**File:** `src/pages/Jobs.tsx`

Change the initial state of `viewMode` from `'table'` to `'calendar'`:

```typescript
// Current
const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

// Updated
const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
```

This ensures users land on the calendar view by default, which is Denise's preferred view for daily scheduling.

---

#### Part 2: Update Calendar Tooltip Content

**File:** `src/components/jobs/JobsCalendar.tsx`

Reorganize the tooltip popup to show the most useful information first:
- **Header**: Time range (e.g., "9:00 AM - 11:30 AM") - most important for scheduling
- **Facility/Business**: Where the job is happening
- **Interpreter**: Who is assigned
- **Client**: Deaf client name
- **Status**: Badge at the bottom
- **Job Number**: Move to bottom as secondary reference (useful for billing, not daily ops)

**Current tooltip order:**
1. Job number (prominent)
2. Time
3. Client
4. Facility
5. Interpreter
6. Status badge

**New tooltip order:**
1. Time range (prominent header)
2. Facility name
3. Interpreter name
4. Client name
5. Status badge
6. Job number (small, de-emphasized)

```tsx
<TooltipContent side="right" className="max-w-xs">
  <div className="space-y-1">
    {/* Time range as primary header */}
    <p className="font-semibold">
      {(job as any)._startLabel && (job as any)._endLabel
        ? `${(job as any)._startLabel} - ${(job as any)._endLabel}`
        : `${job.start_time} - ${job.end_time}`}
    </p>
    
    {/* Facility */}
    {job.facility?.name && (
      <p className="text-sm">
        <span className="text-muted-foreground">Facility:</span> {job.facility.name}
      </p>
    )}
    
    {/* Interpreter */}
    {job.interpreter && (
      <p className="text-sm">
        <span className="text-muted-foreground">Interpreter:</span> {job.interpreter.first_name} {job.interpreter.last_name}
      </p>
    )}
    
    {/* Client */}
    {job.deaf_client_name && (
      <p className="text-sm">
        <span className="text-muted-foreground">Client:</span> {job.deaf_client_name}
      </p>
    )}
    
    {/* Status and Job # row */}
    <div className="flex items-center gap-2 pt-1">
      <Badge variant="outline" className="text-xs">
        {job.status?.replace(/_/g, ' ') || 'new'}
      </Badge>
      {job.job_number && (
        <span className="text-xs text-muted-foreground">#{job.job_number}</span>
      )}
    </div>
  </div>
</TooltipContent>
```

---

#### Part 3: Expand Search to Work with Calendar View

**File:** `src/pages/Jobs.tsx`

The current search only filters on `job_number` and `deaf_client_name`. Extend it to also search:
- `location_city` - so searching "Atlanta" finds jobs in that city
- Facility name (via join) - searching "Hospital" finds jobs at that facility
- Interpreter name (via join) - searching "Smith" finds jobs assigned to that interpreter

Since Supabase doesn't support `ilike` on joined table columns directly, we need a hybrid approach:

1. Keep the database query fetching all matching jobs based on direct job fields
2. Add client-side filtering for facility and interpreter names

```typescript
// Expand database search to include location_city
if (search) {
  const searchTerms = search.trim().toLowerCase().split(/\s+/);
  for (const term of searchTerms) {
    query = query.or(`job_number.ilike.%${term}%,deaf_client_name.ilike.%${term}%,location_city.ilike.%${term}%`);
  }
}

// Then filter results client-side for facility/interpreter names
let results = data;
if (search) {
  const searchLower = search.toLowerCase();
  results = data.filter(job => {
    // Already matched by DB query on job fields, but also check related names
    const facilityMatch = job.facility?.name?.toLowerCase().includes(searchLower);
    const interpreterMatch = job.interpreter 
      ? `${job.interpreter.first_name} ${job.interpreter.last_name}`.toLowerCase().includes(searchLower)
      : false;
    const jobFieldMatch = 
      job.job_number?.toLowerCase().includes(searchLower) ||
      job.deaf_client_name?.toLowerCase().includes(searchLower) ||
      job.location_city?.toLowerCase().includes(searchLower);
    
    return jobFieldMatch || facilityMatch || interpreterMatch;
  });
}
return results;
```

**Update search placeholder** to hint at expanded capabilities:

```tsx
<Input
  placeholder="Search by city, facility, interpreter..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="pl-10 text-base sm:text-sm"
/>
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Jobs.tsx` | Default to calendar view; expand search to include city, facility name, interpreter name |
| `src/components/jobs/JobsCalendar.tsx` | Reorganize tooltip to show time, facility, interpreter prominently; move job number to bottom |

---

### User Experience Improvements

| Before | After |
|--------|-------|
| Jobs page opens to Table view | Jobs page opens to Calendar view |
| Tooltip shows job number as header | Tooltip shows time range as header |
| Search only finds job numbers and client names | Search finds jobs by city, facility, or interpreter name |
| Searching in calendar mode has limited results | Same search works for both views |

---

### Technical Notes

**Why hybrid search (DB + client-side)?**

Supabase/PostgREST doesn't support `ilike` filters on columns from joined tables in `.or()` conditions. The alternatives are:
1. Create a database view with denormalized columns (more complex setup)
2. Use full-text search with a generated column (requires migration)
3. Fetch slightly more data and filter client-side (simple, works now)

Option 3 is chosen for simplicity. The job dataset is typically small enough (hundreds to low thousands) that client-side filtering adds negligible overhead.

