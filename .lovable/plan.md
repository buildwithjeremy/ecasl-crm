

## Update Email "From" Address

### Change

Update the `from` field in `supabase/functions/send-email/index.ts` (line 123) from:

```
"ECASL <onboarding@resend.dev>"
```

to:

```
"ECASL <noreply@denise.ecasl.com>"
```

This single-line change will route all outgoing emails through your verified domain, enabling delivery to the `jeremy+...` test addresses.

### After the change

1. The edge function will be redeployed automatically.
2. Go back to the test job and click "Send Confirmation" to retry the email.
3. Check your inbox at jeremy@buildwithjeremy.com for the confirmation.

