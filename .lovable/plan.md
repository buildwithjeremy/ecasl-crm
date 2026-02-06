

## Plan: Improve Table Sort Indicators and Default Sort Order

### Summary

Enhance the visual clarity of sorted columns and change the default sort for Jobs to show most recent dates first.

---

### Changes

#### Part 1: Enhanced Visual Indicators for Active Sort Column

**File:** `src/components/ui/sortable-table-head.tsx`

Update the styling to make the active sort column more visually distinct:

1. **Bold text** for the active column label
2. **Primary color** for the active sort icon (instead of default gray)
3. **Subtle background highlight** on the active column header

```tsx
// Current (subtle)
<ArrowUp className="h-4 w-4" />

// Updated (more prominent)
<ArrowUp className="h-4 w-4 text-primary" />
```

The full component will apply these styles when `isActive`:
- Font weight: `font-semibold` on the label text
- Icon color: `text-primary` (brand color) instead of default
- Keep the inactive icon dimmed at `opacity-50`

---

#### Part 2: Change Default Sort for Jobs Page

**File:** `src/pages/Jobs.tsx`

Change the default sort from `job_number` descending to `job_date` descending:

```typescript
// Current
const { sort, handleSort } = useTableSort('job_number', 'desc');

// Updated
const { sort, handleSort } = useTableSort('job_date', 'desc');
```

This ensures when users first load the Jobs page, they see the most recent jobs at the top.

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/sortable-table-head.tsx` | Add stronger visual indicators (bold text, primary color icon) for active sort |
| `src/pages/Jobs.tsx` | Change default sort to `job_date` descending |

---

### Visual Before/After

**Before:**
- Active column: Regular weight text, gray icon
- Hard to tell at a glance which column is sorted

**After:**
- Active column: **Bold text**, primary-colored ↑/↓ icon
- Clear visual distinction from inactive columns
- Inactive columns show dimmed ↕ icon (unchanged)

