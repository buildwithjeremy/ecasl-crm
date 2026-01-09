import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  body: string;
  template_name?: string;
  template_variables?: Record<string, string>;
  job_id?: string;
  interpreter_id?: string;
  facility_id?: string;
}

interface ResendEmailResponse {
  id?: string;
  error?: { message: string };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-email function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: SendEmailRequest = await req.json();
    console.log("Request data:", JSON.stringify(requestData, null, 2));

    const { to, subject, body, template_name, template_variables, job_id, interpreter_id, facility_id } = requestData;

    // Validate required fields
    if (!to || !subject || !body) {
      console.error("Missing required fields: to, subject, or body");
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process template variables if provided
    let processedSubject = subject;
    let processedBody = body;

    if (template_variables) {
      for (const [key, value] of Object.entries(template_variables)) {
        const placeholder = `{{${key}}}`;
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
        processedBody = processedBody.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    // Normalize recipients to array
    const recipients = Array.isArray(to) ? to : [to];
    console.log(`Sending email to ${recipients.length} recipient(s)`);

    // Send email via Resend REST API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ECASL <onboarding@resend.dev>", // Update to verified domain when available
        to: recipients,
        subject: processedSubject,
        html: processedBody,
      }),
    });

    const emailResponse: ResendEmailResponse = await resendResponse.json();
    console.log("Resend response:", JSON.stringify(emailResponse, null, 2));

    // Check for Resend errors
    if (!resendResponse.ok || emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      
      // Log failed email attempt
      for (const recipient of recipients) {
        await supabase.from("email_logs").insert({
          recipient_email: recipient,
          subject: processedSubject,
          template_name: template_name || null,
          job_id: job_id || null,
          interpreter_id: interpreter_id || null,
          facility_id: facility_id || null,
          status: "failed",
          sent_at: new Date().toISOString(),
        });
      }

      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error?.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful email
    for (const recipient of recipients) {
      const { error: logError } = await supabase.from("email_logs").insert({
        recipient_email: recipient,
        subject: processedSubject,
        template_name: template_name || null,
        job_id: job_id || null,
        interpreter_id: interpreter_id || null,
        facility_id: facility_id || null,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      if (logError) {
        console.error("Error logging email:", logError);
      }
    }

    console.log("Email sent successfully, message_id:", emailResponse.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: emailResponse.id,
        recipients_count: recipients.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in send-email function:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
