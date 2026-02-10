

## Fix PDF URL & Improve Invoice PDF Display

### Problem
1. The PDF signed URL works but expires after 1 hour -- the URL the user shared was expired. The underlying storage path logic is actually correct, but the UI shows the raw signed URL which looks ugly and is confusing.
2. The PDF section is just a raw truncated URL link -- not user-friendly.

### Solution
Replace the raw URL link (lines 741-755) with a polished PDF preview card:

**New PDF Section Design:**
- A styled card with a PDF icon and the invoice number as filename
- "View PDF" button that opens the signed URL in a new tab (generates fresh signed URL on click to avoid expiry)
- "Regenerate" button to re-generate the PDF
- When no PDF exists yet, show a clean empty state with the Generate PDF button

### File Changes

**`src/pages/InvoiceDetail.tsx`** (lines 741-755):

Replace the current "Invoice PDF URL" section with:

```text
+-----------------------------------------------+
|  [PDF Icon]  Invoice_26-00059.pdf              |
|              Generated 02/10/2026              |
|                                                |
|  [View PDF]  [Regenerate]                      |
+-----------------------------------------------+
```

Technical details:
- Replace lines 741-755 (the raw URL display) with a styled card component
- Add an `ExternalLink` icon import from lucide-react
- The "View PDF" button calls a helper that generates a fresh signed URL on click (avoiding expiry issues), then opens it via `window.open()`
- The "Regenerate" button reuses the existing `handleGeneratePdf` function
- When no PDF exists, show "No PDF generated yet" with a subtle file icon
- Move the Generate PDF / Send Invoice buttons from the card header into contextual positions (Generate shows in empty state, Send shows after PDF exists)

### Why This Fixes the Broken URL
The signed URL itself isn't broken -- it just expired. The current code already regenerates signed URLs when the page loads (lines 222-251). The real fix is to never show the raw URL to the user. Instead, clicking "View PDF" will generate a fresh signed URL at that moment and open it, so it's always valid.
