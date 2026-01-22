import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceEmailRequest {
  invoiceId: string;
  to?: string | string[];
  subject: string;
  body: string;
  pdfStoragePath: string;
}

function normalizeRecipients(to: string | string[] | undefined): string[] {
  if (!to) return [];
  if (Array.isArray(to)) {
    return to.map((t) => (t || '').trim()).filter(Boolean);
  }
  // Allow callers to pass comma/semicolon/space separated list
  return to
    .split(/[\n,;\s]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

type BillingContact = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invoice-email function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the request
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth token to validate
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Invalid token:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    // Verify user is a team member using service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isTeamMember } = await supabase.rpc('is_team_member', { _user_id: userId });
    
    if (!isTeamMember) {
      console.error("User is not a team member:", userId);
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData: SendInvoiceEmailRequest = await req.json();
    console.log("Request data:", JSON.stringify({ ...requestData, body: '[REDACTED]' }, null, 2));

    const { invoiceId, to, subject, body, pdfStoragePath } = requestData;

    // Validate required fields
    if (!invoiceId || !subject || !body || !pdfStoragePath) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If caller provided recipients, respect them. Otherwise default to facility primary billing contact.
    const providedRecipients = normalizeRecipients(to);

    let finalToList: string[] = providedRecipients;

    if (finalToList.length === 0) {
      let resolvedRecipient: string | null = null;
      try {
        const { data: invoiceRow, error: invErr } = await supabase
          .from('invoices')
          .select('id, facility_id')
          .eq('id', invoiceId)
          .single();

        if (invErr) throw invErr;

        const { data: facilityRow, error: facErr } = await supabase
          .from('facilities')
          .select('billing_contacts')
          .eq('id', invoiceRow.facility_id)
          .single();

        if (facErr) throw facErr;

        const contacts = (facilityRow?.billing_contacts as BillingContact[] | null) || [];
        const primary = contacts.find((c) => !!c?.email && !!c?.name) || contacts.find((c) => !!c?.email);
        resolvedRecipient = primary?.email?.trim() || null;
      } catch (e) {
        console.warn('Unable to resolve billing contact', e);
      }

      finalToList = resolvedRecipient ? [resolvedRecipient] : [];
    }

    // de-dupe
    finalToList = Array.from(new Set(finalToList.map((e) => e.trim()).filter(Boolean)));

    if (finalToList.length === 0) {
      return new Response(
        JSON.stringify({ error: "No billing contact email found for this facility." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the PDF from storage
    console.log("Downloading PDF from storage:", pdfStoragePath);
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('invoices')
      .download(pdfStoragePath);

    if (downloadError || !pdfData) {
      console.error("Error downloading PDF:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert PDF to base64
    const pdfArrayBuffer = await pdfData.arrayBuffer();
    const pdfBase64 = encode(pdfArrayBuffer);
    console.log("PDF downloaded and encoded, size:", pdfArrayBuffer.byteLength, "bytes");

    // Extract filename from path
    const pdfFilename = pdfStoragePath.split('/').pop() || 'invoice.pdf';

    // Convert plain text body to HTML
    const htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    // Send email via Resend REST API with attachment
    console.log("Sending email to:", finalToList.join(', '));
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ECASL <onboarding@resend.dev>", // Update to verified domain when available
        to: finalToList,
        subject: subject,
        html: htmlBody,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBase64,
          }
        ],
      }),
    });

    const emailResponse = await resendResponse.json();
    console.log("Resend response:", JSON.stringify(emailResponse, null, 2));

    // Check for Resend errors
    if (!resendResponse.ok || emailResponse.error || emailResponse.statusCode) {
      const errorMessage = emailResponse.error?.message || emailResponse.message || "Unknown error";
      console.error("Resend error:", errorMessage);

      // Log failed email attempt
      await supabase.from("email_logs").insert({
        recipient_email: finalToList.join(', '),
        subject: subject,
        template_name: 'invoice_send',
        status: "failed",
        sent_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful email
    await supabase.from("email_logs").insert({
      recipient_email: finalToList.join(', '),
      subject: subject,
      template_name: 'invoice_send',
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    // Update invoice status to submitted
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'submitted' })
      .eq('id', invoiceId);

    if (updateError) {
      console.error("Error updating invoice status:", updateError);
      // Don't fail the request - email was sent successfully
    }

    console.log("Invoice email sent successfully, message_id:", emailResponse.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: emailResponse.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-invoice-email function:", error);
    
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
