import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FacilityData {
  id: string;
  name: string;
  admin_contact_name: string | null;
  admin_contact_email: string | null;
  physical_city: string | null;
  physical_state: string | null;
  rate_business_hours: number | null;
  rate_after_hours: number | null;
  holiday_fee: number | null;
  minimum_billable_hours: number | null;
  rate_mileage: number | null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "$0.00";
  return `$${amount.toFixed(2)}`;
}

function generateContractPdf(facility: FacilityData): Uint8Array {
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
  y += 12;

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(facility.name, margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const contactName = facility.admin_contact_name || "Authorized Representative";
  doc.text(`Dear ${contactName},`, margin, y);
  y += 8;

  // Introduction paragraph
  const introParagraph = `As per our conversation regarding sign language interpreting services, please note the terms of our agreement. If after reviewing them you are in accord, please sign one copy and return it to me as soon as possible. If there are any changes please contact me immediately at 917-330-0517 or email me at Dsign1118@aol.com.`;
  
  const introLines = doc.splitTextToSize(introParagraph, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * lineHeight + lineHeight;

  // Contractual Agreement
  doc.setFont("helvetica", "bold");
  doc.text("Contractual Agreement:", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  const location = facility.physical_city && facility.physical_state 
    ? `${facility.physical_city}, ${facility.physical_state}` 
    : "the agreed upon location";
  
  const agreementText = `It has been agreed that Effective Communication will provide interpreting services for ${facility.name} when needed in ${location}.`;
  const agreementLines = doc.splitTextToSize(agreementText, contentWidth);
  doc.text(agreementLines, margin, y);
  y += agreementLines.length * lineHeight + lineHeight;

  // Hourly Rates
  doc.setFont("helvetica", "bold");
  doc.text("Hourly Rates:", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  const businessRate = formatCurrency(facility.rate_business_hours);
  const afterHoursRate = formatCurrency(facility.rate_after_hours);
  const minHours = facility.minimum_billable_hours || 2;

  doc.text(`• 9:00 am to 5:00 pm: ${businessRate} per hour with a ${minHours}-hour minimum.`, margin, y);
  y += 5;
  doc.text(`• 5:00 pm to 9:00 am: ${afterHoursRate} per hour with a ${minHours}-hour minimum. (including nights, weekends or emergencies)`, margin, y);
  y += lineHeight + 4;

  // Holiday Rate
  doc.setFont("helvetica", "bold");
  doc.text("Holiday Rate:", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  const holidayRate = formatCurrency(facility.holiday_fee || facility.rate_after_hours);
  doc.text(`${holidayRate} per hour with a ${minHours}-hour minimum.`, margin, y);
  y += lineHeight + 4;

  // Additional Fees
  doc.setFont("helvetica", "bold");
  doc.text("Additional Fees:", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  doc.text("• Trilingual Interpreters: $25 more per hour for anytime slot", margin, y);
  y += 5;
  doc.text("• Tactile Interpreters: $25 more per hour for anytime slot", margin, y);
  y += 5;
  doc.text("• Media Event: $150 per hour with a two-hour minimum", margin, y);
  y += lineHeight + 4;

  // Cancellation and mileage policy
  const mileageRate = facility.rate_mileage ? `$${facility.rate_mileage.toFixed(2)}` : "the current IRS rate";
  const policyText = `Two-full business day cancelation policy; otherwise scheduled time will be billed. Total mileage will be billed at ${mileageRate} per mile, plus tolls, if applicable.`;
  const policyLines = doc.splitTextToSize(policyText, contentWidth);
  doc.text(policyLines, margin, y);
  y += policyLines.length * lineHeight + lineHeight;

  // Billing email
  const billingEmail = facility.admin_contact_email || "[email address]";
  const billingText = `All bills will be emailed to ${contactName} at ${billingEmail}.`;
  const billingLines = doc.splitTextToSize(billingText, contentWidth);
  doc.text(billingLines, margin, y);
  y += billingLines.length * lineHeight + lineHeight;

  // Independent contractor clause
  const contractorText = `Both ${facility.name} and Effective Communication agree that the interpreter/agency will act as an independent contractor in the performance of their duties under this contract.`;
  const contractorLines = doc.splitTextToSize(contractorText, contentWidth);
  doc.text(contractorLines, margin, y);
  y += contractorLines.length * lineHeight + 8;

  // Signature section
  if (y + 50 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    y = 20;
  }

  doc.text("Sincerely,", margin, y);
  y += 8;
  doc.text("Denise Corino", margin, y);
  y += 5;
  doc.text("Certified Sign Language Interpreter for the Deaf", margin, y);
  y += 5;
  doc.text("Effective Communication", margin, y);
  y += 15;

  doc.text("______________________________", margin, y);
  y += 5;
  doc.text("Name", margin, y);
  y += 10;

  doc.text("_________________________", margin, y);
  y += 5;
  doc.text("Date", margin, y);

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

    const { facilityId } = await req.json();

    if (!facilityId) {
      return new Response(
        JSON.stringify({ error: "facilityId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate facilityId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(facilityId)) {
      return new Response(
        JSON.stringify({ error: "Invalid facility ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating contract PDF for facility: ${facilityId}`);

    // Fetch facility data
    const { data: facility, error: fetchError } = await supabase
      .from("facilities")
      .select("id, name, admin_contact_name, admin_contact_email, physical_city, physical_state, rate_business_hours, rate_after_hours, holiday_fee, minimum_billable_hours, rate_mileage")
      .eq("id", facilityId)
      .single();

    if (fetchError || !facility) {
      console.error("Error fetching facility:", fetchError);
      return new Response(
        JSON.stringify({ error: "Facility not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate the PDF
    const pdfBuffer = generateContractPdf(facility);

    // Create filename (include time to avoid browser/storage caching)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `contracts/${facility.id}/contract_${timestamp}.pdf`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("facility-contracts")
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
      .from("facility-contracts")
      .createSignedUrl(fileName, 3600);

    if (signedUrlError || !signedUrlData) {
      console.error("Error creating signed URL:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate document URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`PDF uploaded successfully`);

    // Update facility record with storage path (not public URL since bucket is now private)
    const { error: updateError } = await supabase
      .from("facilities")
      .update({ contract_pdf_url: fileName })
      .eq("id", facilityId);

    if (updateError) {
      console.error("Error updating facility:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update facility record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, pdf_url: signedUrlData.signedUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating facility contract PDF:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});