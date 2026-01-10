import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InterpreterData {
  id: string;
  first_name: string;
  last_name: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function generateContractPdf(interpreter: InterpreterData): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;
  const lineHeight = 4.2;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Effective Communication", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("195 Crown Ave", margin, y);
  y += 5;
  doc.text("Staten Island, NY 10312", margin, y);
  y += 5;
  doc.text("917-330-0517", margin, y);
  y += 10;

  // Date
  doc.text(formatDate(new Date()), margin, y);
  y += 15;

  // Contract body paragraphs
  const paragraphs = [
    `This is an agreement between Effective Communication and ${interpreter.first_name} ${interpreter.last_name}, Sign Language Interpreter for the Deaf. The interpreter agrees to provide sign language interpreting services for Effective Communication on an as needed basis. The interpreter will act as an independent contractor in the performance of their duties under this contract.`,
    
    `The interpreter understands that while on interpreting assignments for Effective Communication, the interpreter acts as a representative of Effective Communication and is expected to act on behalf of Effective Communication.`,
    
    `The interpreter is expected to be professional on all assignments. The interpreter must follow and adhere to all tenants of RID (Registry for the Interpreters for the Deaf), Code of Professional Conduct.`,
    
    `The interpreter is expected to dress in an appropriate manner for all assignments; either in business casual or business formal depending on the type of assignment. Jeans and sneakers are not professional attire.`,
    
    `The interpreter agrees that they will not knowingly solicit any current, past or potential client of Effective Communication either directly or indirectly for the benefit of the interpreter or the benefit of any other person, firm or corporation during or at anytime after their assignment. Please refer all clients/institutions back to Effective Communication. Interpreters should not give personal business cards when working on an assignment through Effective Communication. If the interpreter would like to provide their name and the request comes specifically for such interpreter, every effort will be made to honor the request.`,
    
    `The interpreter agrees to not accept assignments independently from the same facility/institution for one year after the interpreter was contracted through Effective Communication. The interpreter may accept work at the same facility if assigned by another agency but not independently.`,
    
    `Once an assignment is accepted an email confirmation will be sent to the interpreter. Once received, the interpreter must email Effective Communication and acknowledge receipt of the confirmation. The interpreter is then officially assigned once the confirmation is received and acknowledged.`,
    
    `If the Deaf client has not arrived after thirty minutes from the start time of the assignment, the interpreter may ask the on site contact person what their protocol is. If the on site contact person asks the interpreter to stay for the duration of the contracted time then the interpreter must adhere to their request to ensure adequate billing. The interpreter must get the approval from the on-site contact and Effective Communication before leaving any assignment before the contracted time if the Deaf consumer is a "no show".`,
    
    `If an assignment goes over the contracted billing time the interpreter must notify Effective Communication so that billing arrangements can be made. Assignments that go over the original scheduled time will then be billed on 15 minute increments.`,
    
    `The interpreter agrees that travel time will not be reimbursed, unless discussed and agreed upon before accepting an assignment.`,
    
    `The Interpreter agrees to submit all invoices within 10 days after assignment is completed. Effective Communication agrees to pay the interpreter within 30 days after completing an assignment and invoice is submitted.`,
  ];

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(paragraph, contentWidth);
    
    // Check if we need a new page
    if (y + lines.length * lineHeight > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 20;
    }
    
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + lineHeight;
  }

  // Signature section
  if (y + 40 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    y = 20;
  }

  y += 10;
  doc.text("Agreed on: _________________________________", margin, y);
  y += 15;
  doc.text("Signature of Interpreter: _____________________________________________", margin, y);

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables");
    }

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

    const { interpreterId } = await req.json();

    if (!interpreterId) {
      return new Response(
        JSON.stringify({ error: "interpreterId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate interpreterId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(interpreterId)) {
      return new Response(
        JSON.stringify({ error: "Invalid interpreter ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating contract PDF for interpreter: ${interpreterId}`);

    // Fetch interpreter data
    const { data: interpreter, error: fetchError } = await supabase
      .from("interpreters")
      .select("id, first_name, last_name")
      .eq("id", interpreterId)
      .single();

    if (fetchError || !interpreter) {
      console.error("Error fetching interpreter:", fetchError);
      return new Response(
        JSON.stringify({ error: "Interpreter not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate the PDF
    const pdfBuffer = generateContractPdf(interpreter);

    // Create filename (include time to avoid browser/storage caching)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `contracts/${interpreter.id}/contract_${timestamp}.pdf`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("interpreter-contracts")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        cacheControl: "no-cache",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading PDF:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate signed URL for private bucket (1 hour expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("interpreter-contracts")
      .createSignedUrl(fileName, 3600);

    if (signedUrlError || !signedUrlData) {
      console.error("Error creating signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate document URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`PDF uploaded successfully`);

    // Update interpreter record with storage path (not public URL since bucket is now private)
    const { error: updateError } = await supabase
      .from("interpreters")
      .update({ contract_pdf_url: fileName })
      .eq("id", interpreterId);

    if (updateError) {
      console.error("Error updating interpreter:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update interpreter record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, pdf_url: signedUrlData.signedUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating contract PDF:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});