import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceData {
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string;
  facilityName: string;
  facilityAddress: string;
  facilityCity: string;
  facilityState: string;
  facilityZip: string;
  lineItems: {
    description: string;
    qty: number;
    rate: number;
    amount: number;
  }[];
  total: number;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function generateInvoiceHtml(data: InvoiceData): string {
  const lineItemsHtml = data.lineItems
    .filter(item => item.amount > 0)
    .map(item => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb;"></td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.qty.toFixed(2)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.rate.toFixed(2)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          color: #1f2937;
          margin: 0;
          padding: 40px;
        }
        .header {
          margin-bottom: 30px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 5px;
        }
        .invoice-title {
          font-size: 18px;
          color: #6b7280;
          margin-bottom: 15px;
        }
        .company-address {
          font-size: 12px;
          color: #6b7280;
          line-height: 1.5;
        }
        .bill-to-section {
          margin: 30px 0;
        }
        .bill-to-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 8px;
        }
        .bill-to-content {
          font-size: 13px;
          line-height: 1.5;
        }
        .invoice-info {
          text-align: right;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .invoice-info p {
          margin: 4px 0;
        }
        .please-pay {
          font-size: 16px;
          font-weight: bold;
          color: #1f2937;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background-color: #f9fafb;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #e5e7eb;
        }
        th:nth-child(3), th:nth-child(4), th:nth-child(5) {
          text-align: right;
        }
        .total-row {
          margin-top: 20px;
          text-align: right;
          font-size: 16px;
          font-weight: bold;
        }
        .thank-you {
          margin-top: 40px;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">Effective Communication NY, LLC</div>
        <div class="invoice-title">Invoice</div>
        <div class="company-address">
          195 Crown Ave<br>
          Staten Island, NY 10312 US<br>
          admin@ecasl.com
        </div>
      </div>

      <div style="display: flex; justify-content: space-between;">
        <div class="bill-to-section">
          <div class="bill-to-title">BILL TO</div>
          <div class="bill-to-content">
            ${data.facilityName}<br>
            ${data.facilityAddress ? `${data.facilityAddress}<br>` : ''}
            ${data.facilityCity ? `${data.facilityCity}, ${data.facilityState} ${data.facilityZip}` : ''}
          </div>
        </div>

        <div class="invoice-info">
          <p><strong>DATE:</strong> ${formatDate(data.issuedDate)}</p>
          <p class="please-pay"><strong>PLEASE PAY:</strong> $${data.total.toFixed(2)}</p>
          <p><strong>DUE DATE:</strong> ${formatDate(data.dueDate)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 80px;">DATE</th>
            <th>DESCRIPTION</th>
            <th style="width: 80px;">QTY</th>
            <th style="width: 80px;">RATE</th>
            <th style="width: 100px;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>

      <div class="total-row">
        TOTAL DUE: $${data.total.toFixed(2)}
      </div>

      <div class="thank-you">
        THANK YOU.
      </div>
    </body>
    </html>
  `;
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

    console.log('Invoice:', invoice);
    console.log('Job:', job);

    // Build line items from job data
    const lineItems: InvoiceData['lineItems'] = [];

    if (job) {
      // Interpreter Services (hourly)
      const billableHours = job.billable_hours || 0;
      const hourlyRate = job.facility_rate_business || 0;
      if (billableHours > 0 && hourlyRate > 0) {
        lineItems.push({
          description: 'Interpreter Services',
          qty: billableHours,
          rate: hourlyRate,
          amount: billableHours * hourlyRate
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

      // Trilingual Rate Uplift
      const trilingualUplift = job.trilingual_rate_uplift || 0;
      if (trilingualUplift > 0) {
        lineItems.push({
          description: 'Trilingual Rate Uplift',
          qty: 1,
          rate: trilingualUplift,
          amount: trilingualUplift
        });
      }
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

    // Generate HTML
    const html = generateInvoiceHtml(invoiceData);

    // Use a PDF generation API service
    // We'll use a simple HTML to PDF approach with jsPDF or similar
    // For now, we'll convert HTML to PDF using an external API
    
    const pdfResponse = await fetch('https://api.html2pdf.app/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: html,
        apiKey: 'free', // Using free tier for demo
      }),
    });

    if (!pdfResponse.ok) {
      // Fallback: store HTML and return a message
      console.error('PDF generation failed, storing HTML instead');
      
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const fileName = `invoice-${invoice.invoice_number}.html`;
      
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, htmlBlob, {
          contentType: 'text/html',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload file' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: publicUrl } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      // Update invoice with PDF URL
      await supabase
        .from('invoices')
        .update({ pdf_url: publicUrl.publicUrl })
        .eq('id', invoiceId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          pdfUrl: publicUrl.publicUrl,
          note: 'Generated as HTML (PDF service unavailable)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
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
