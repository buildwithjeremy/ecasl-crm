

## Plan: Create Test Data for Email Testing

### Summary

Insert 1 test interpreter and 3 test facilities directly into the database using the `+` email strategy so all emails route to your inbox. Then you can create a test job and try the confirmation email flow.

### Test Data

**Test Interpreter:**

| Field | Value |
|-------|-------|
| Name | Test Interpreter (Tina Test) |
| Email | jeremy+interpreter1@buildwithjeremy.com |
| Rates | $75/hr business, $95/hr after-hours |
| Status | active |

**Test Facilities:**

| Facility | Type | Email | Key Settings |
|----------|------|-------|-------------|
| Test Hospital Normal | hospital | jeremy+facility1@buildwithjeremy.com | Normal facility with physical address and timezone |
| GSA-Test Federal Office | government, is_gsa=true | jeremy+gsafacility@buildwithjeremy.com | GSA badge, no physical address (per job) |
| Test Contractor Services | business, contractor=true | jeremy+contractor@buildwithjeremy.com | Contractor badge, no physical address (per job) |

All billing contacts will use the `+` email pattern so every email lands in your inbox.

### Implementation

**Step 1: Insert test interpreter via SQL**

Insert one interpreter record with `jeremy+interpreter1@buildwithjeremy.com`, active status, and standard rates.

**Step 2: Insert 3 test facilities via SQL**

Each facility gets:
- A `billing_contacts` JSONB array with a primary contact using the appropriate `+` email
- Appropriate rates and settings
- The normal facility gets a physical address and timezone; the GSA and Contractor ones do not (per existing pattern)

### Testing Flow

After the data is created:

1. Go to Jobs and create a new test job linked to one of the test facilities
2. Assign the test interpreter
3. Click "Send Confirmation" to test the email flow
4. Check your inbox at jeremy@buildwithjeremy.com for the confirmation email
5. Repeat with the other facility types to verify all combos work

### Files to Modify

No code changes needed -- this is a data-only operation using direct database inserts.

