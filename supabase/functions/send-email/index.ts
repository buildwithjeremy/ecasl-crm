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

    const requestData: SendEmailRequest = await req.json();
    console.log("Request data:", JSON.stringify(requestData, null, 2));

    const { to, subject, body, template_name, template_variables, job_id, interpreter_id, facility_id } = requestData;

    // Validate required fields
    if (!to || !subject || !body) {
      console.error("Missing required fields: to, subject, or body");
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process template variables if provided
    let processedSubject = subject;
    let processedBody = body;

    if (template_variables) {
      for (const [key, value] of Object.entries(template_variables)) {
        const placeholder = `{{${key}}}`;
        // Use split/join for safe string replacement (avoids regex special char issues)
        processedSubject = processedSubject.split(placeholder).join(value);
        processedBody = processedBody.split(placeholder).join(value);
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
        JSON.stringify({ error: "Failed to send email" }),
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
    console.error("Error in send-email function:", error);
    
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);