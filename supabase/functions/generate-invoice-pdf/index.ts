import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LineItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string;
  facilityName: string;
  facilityAddress: string;
  facilityCity: string;
  facilityState: string;
  facilityZip: string;
  lineItems: LineItem[];
  total: number;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function generatePdf(data: InvoiceData): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Company Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Effective Communication NY, LLC", 14, y);
  
  y += 8;
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Invoice", 14, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.text("195 Crown Ave", 14, y);
  y += 5;
  doc.text("Staten Island, NY 10312 US", 14, y);
  y += 5;
  doc.text("admin@ecasl.com", 14, y);
  
  // Invoice Info (right side)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const rightX = pageWidth - 14;
  doc.text(`DATE: ${formatDate(data.issuedDate)}`, rightX, 36, { align: "right" });
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`PLEASE PAY: ${formatCurrency(data.total)}`, rightX, 44, { align: "right" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`DUE DATE: ${formatDate(data.dueDate)}`, rightX, 52, { align: "right" });
  
  // Bill To Section
  y = 70;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BILL TO", 14, y);
  
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.facilityName, 14, y);
  
  if (data.facilityAddress) {
    y += 5;
    doc.text(data.facilityAddress, 14, y);
  }
  
  if (data.facilityCity) {
    y += 5;
    const cityStateZip = `${data.facilityCity}, ${data.facilityState} ${data.facilityZip}`;
    doc.text(cityStateZip, 14, y);
  }
  
  // Table Header
  y = 100;
  const colWidths = [25, 75, 25, 30, 35];
  const colX = [14, 39, 114, 139, 169];
  
  doc.setFillColor(249, 250, 251);
  doc.rect(14, y - 5, pageWidth - 28, 10, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DATE", colX[0], y);
  doc.text("DESCRIPTION", colX[1], y);
  doc.text("QTY", colX[2], y, { align: "right" });
  doc.text("RATE", colX[3], y, { align: "right" });
  doc.text("AMOUNT", colX[4], y, { align: "right" });
  
  // Draw header line
  y += 3;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  
  // Table Rows
  doc.setFont("helvetica", "normal");
  y += 8;
  
  for (const item of data.lineItems) {
    if (item.amount <= 0) continue;
    
    doc.text("", colX[0], y); // Date column empty as in example
    doc.text(item.description, colX[1], y);
    doc.text(item.qty.toFixed(2), colX[2], y, { align: "right" });
    doc.text(item.rate.toFixed(2), colX[3], y, { align: "right" });
    doc.text(item.amount.toFixed(2), colX[4], y, { align: "right" });
    
    // Row separator
    y += 3;
    doc.setDrawColor(229, 231, 235);
    doc.line(14, y, pageWidth - 14, y);
    y += 7;
  }
  
  // Total
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`TOTAL DUE: ${formatCurrency(data.total)}`, rightX, y, { align: "right" });
  
  // Return as Uint8Array
  return doc.output("arraybuffer") as unknown as Uint8Array;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating PDF for invoice:', invoiceId);

    // Fetch invoice with facility info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        facility:facilities(
          name, billing_name, billing_address, billing_city, billing_state, billing_zip
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch job details if linked
    let job = null;
    if (invoice.job_id) {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          facility:facilities(emergency_fee, holiday_fee)
        `)
        .eq('id', invoice.job_id)
        .single();

      if (!jobError) {
        job = jobData;
      }
    }

    console.log('Invoice:', invoice.invoice_number);
    console.log('Job:', job?.job_number);

    // Build line items from job data
    const lineItems: LineItem[] = [];

    if (job) {
      // Interpreter Services (hourly) - add trilingual uplift and rate adjustment to hourly rate
      const billableHours = job.billable_hours || 0;
      const trilingualUplift = job.trilingual_rate_uplift || 0;
      const facilityRateAdjustment = job.facility_rate_adjustment || 0;
      const baseBusinessRate = job.facility_rate_business || 0;
      const baseAfterHoursRate = job.facility_rate_after_hours || 0;
      
      // Adjusted rates include trilingual uplift and rate adjustment
      const adjustedBusinessRate = baseBusinessRate + trilingualUplift + facilityRateAdjustment;
      const adjustedAfterHoursRate = baseAfterHoursRate + trilingualUplift + facilityRateAdjustment;
      
      // Calculate hours worked at each rate
      const businessHoursWorked = job.business_hours_worked || 0;
      const afterHoursWorked = job.after_hours_worked || 0;
      
      // Add business hours line item if applicable
      if (businessHoursWorked > 0 && adjustedBusinessRate > 0) {
        let description = 'Interpreter Services (Business Hours)';
        if (trilingualUplift > 0 || facilityRateAdjustment > 0) {
          description = 'Interpreter Services (Business Hours, adjusted)';
        }
        lineItems.push({
          description,
          qty: businessHoursWorked,
          rate: adjustedBusinessRate,
          amount: businessHoursWorked * adjustedBusinessRate
        });
      }
      
      // Add after hours line item if applicable
      if (afterHoursWorked > 0 && adjustedAfterHoursRate > 0) {
        let description = 'Interpreter Services (After Hours)';
        if (trilingualUplift > 0 || facilityRateAdjustment > 0) {
          description = 'Interpreter Services (After Hours, adjusted)';
        }
        lineItems.push({
          description,
          qty: afterHoursWorked,
          rate: adjustedAfterHoursRate,
          amount: afterHoursWorked * adjustedAfterHoursRate
        });
      }
      
      // Fallback: if no hours split data, use billable_hours with business rate
      if (businessHoursWorked === 0 && afterHoursWorked === 0 && billableHours > 0 && adjustedBusinessRate > 0) {
        let description = 'Interpreter Services';
        if (trilingualUplift > 0 || facilityRateAdjustment > 0) {
          description = 'Interpreter Services (adjusted)';
        }
        lineItems.push({
          description,
          qty: billableHours,
          rate: adjustedBusinessRate,
          amount: billableHours * adjustedBusinessRate
        });
      }

      // Travel Time
      const travelHours = job.travel_time_hours || 0;
      const travelRate = job.travel_time_rate || 0;
      if (travelHours > 0 && travelRate > 0) {
        lineItems.push({
          description: 'Travel Time',
          qty: travelHours,
          rate: travelRate,
          amount: travelHours * travelRate
        });
      }

      // Mileage
      const mileage = job.mileage || 0;
      const mileageRate = job.facility_rate_mileage || 0;
      if (mileage > 0 && mileageRate > 0) {
        lineItems.push({
          description: 'Mileage',
          qty: mileage,
          rate: mileageRate,
          amount: mileage * mileageRate
        });
      }

      // Parking
      const parking = job.parking || 0;
      if (parking > 0) {
        lineItems.push({
          description: 'Parking',
          qty: 1,
          rate: parking,
          amount: parking
        });
      }

      // Tolls
      const tolls = job.tolls || 0;
      if (tolls > 0) {
        lineItems.push({
          description: 'Tolls',
          qty: 1,
          rate: tolls,
          amount: tolls
        });
      }

      // Misc Fee
      const miscFee = job.misc_fee || 0;
      if (miscFee > 0) {
        lineItems.push({
          description: 'Miscellaneous Fee',
          qty: 1,
          rate: miscFee,
          amount: miscFee
        });
      }

      // Emergency Fee
      if (job.emergency_fee_applied && job.facility?.emergency_fee) {
        lineItems.push({
          description: 'Emergency Fee',
          qty: 1,
          rate: job.facility.emergency_fee,
          amount: job.facility.emergency_fee
        });
      }

      // Holiday Fee
      if (job.holiday_fee_applied && job.facility?.holiday_fee) {
        lineItems.push({
          description: 'Holiday Fee',
          qty: 1,
          rate: job.facility.holiday_fee,
          amount: job.facility.holiday_fee
        });
      }

      // Note: Trilingual uplift is now included in the hourly rate above
    }

    // Calculate total
    const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Use billing info if available, otherwise use facility name
    const facility = invoice.facility;
    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoice_number,
      issuedDate: invoice.issued_date || new Date().toISOString(),
      dueDate: invoice.due_date || '',
      facilityName: facility?.billing_name || facility?.name || 'Unknown',
      facilityAddress: facility?.billing_address || '',
      facilityCity: facility?.billing_city || '',
      facilityState: facility?.billing_state || '',
      facilityZip: facility?.billing_zip || '',
      lineItems,
      total
    };

    console.log('Generating PDF with', lineItems.length, 'line items, total:', total);

    // Generate PDF
    const pdfBuffer = generatePdf(invoiceData);
    const fileName = `invoice-${invoice.invoice_number}.pdf`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName);

    // Update invoice with PDF URL
    await supabase
      .from('invoices')
      .update({ pdf_url: publicUrl.publicUrl })
      .eq('id', invoiceId);

    console.log('PDF generated successfully:', publicUrl.publicUrl);

    return new Response(
      JSON.stringify({ success: true, pdfUrl: publicUrl.publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
