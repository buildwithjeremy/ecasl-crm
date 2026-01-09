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
  const lineHeight = 5;

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { interpreterId } = await req.json();

    if (!interpreterId) {
      return new Response(
        JSON.stringify({ error: "interpreterId is required" }),
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

    // Create filename
    const timestamp = new Date().toISOString().split("T")[0];
    const fileName = `contracts/${interpreter.id}/contract_${timestamp}.pdf`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("interpreter-contracts")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading PDF:", uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("interpreter-contracts")
      .getPublicUrl(fileName);

    console.log(`PDF uploaded successfully: ${publicUrl}`);

    // Update interpreter record with contract URL
    const { error: updateError } = await supabase
      .from("interpreters")
      .update({ contract_pdf_url: publicUrl })
      .eq("id", interpreterId);

    if (updateError) {
      console.error("Error updating interpreter:", updateError);
      throw new Error(`Failed to update interpreter: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, pdf_url: publicUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating contract PDF:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
