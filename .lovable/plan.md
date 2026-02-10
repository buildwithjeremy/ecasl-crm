

## Fix PDF URL & Simplify Generate/Regenerate UX

### Problem
1. **Broken URL**: The edge function creates a NEW file on every generation (timestamp in filename + `upsert: false`), leaving orphaned old files. The `pdf_url` in the DB gets updated but the signed URL shown in the UI may reference the old file path via the `pdfUrl` state variable set from the edge function response.
2. **Redundant buttons**: There's both a "Generate PDF" button in the card header AND a refresh/regenerate icon in the PDF card -- confusing.
3. **No permanent links**: Every PDF gets a unique timestamped filename. Old files pile up in storage.

### Solution

**Edge function (`generate-invoice-pdf/index.ts`)**:
- Use a stable filename: `{invoice_number}/invoice.pdf` (no timestamp)
- Change `upsert: false` to `upsert: true` so regenerating overwrites the previous file
- Delete old timestamped files before uploading (cleanup existing orphans)
- Keep returning the signed URL for immediate viewing

**UI (`src/pages/InvoiceDetail.tsx`)**:
- Remove the separate "Generate PDF" button from the card header
- Replace it with a single "Regenerate PDF" button (with `RefreshCw` icon) that always appears in the header when status is draft and a job is linked
- The PDF card keeps its "View PDF" button but removes the small refresh icon button
- When no PDF exists, the empty state card has a "Generate PDF" button (first-time generation)
- After first generation, only the header "Regenerate PDF" button is available

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-invoice-pdf/index.ts` | Stable filename, `upsert: true`, cleanup old files |
| `src/pages/InvoiceDetail.tsx` | Consolidate Generate/Regenerate into one header button, remove refresh icon from PDF card |

### Technical Details

**Edge function changes (lines ~418-429)**:
```typescript
// Before: timestamped filename, upsert: false
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const fileName = `${invoice.invoice_number}/invoice_${timestamp}.pdf`;
// upsert: false

// After: stable filename, upsert: true
const fileName = `${invoice.invoice_number}/invoice.pdf`;
// upsert: true
```

Also add cleanup logic to delete any old timestamped files in the invoice folder before uploading.

**UI changes**:
- Header button: Show "Generate PDF" (with `FileText` icon) when no PDF exists, show "Regenerate PDF" (with `RefreshCw` icon) when PDF already exists -- single button, label changes based on state
- PDF card (lines 741-817): Remove the `RefreshCw` ghost button from the card; keep only the "View PDF" button
- The empty state card removes its own Generate button since the header handles it

