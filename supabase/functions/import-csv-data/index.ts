import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function cleanCurrency(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const cleaned = value.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function parseDate(value: string): string | null {
  if (!value || value.trim() === '') return null;
  
  const cleaned = value.trim();
  
  // Try MM/DD/YYYY or M/D/YYYY format
  const parts = cleaned.split('/');
  if (parts.length === 3) {
    let [month, day, year] = parts.map(p => p.trim());
    
    // Validate parts are numeric
    if (!/^\d+$/.test(month) || !/^\d+$/.test(day) || !/^\d+$/.test(year)) {
      console.log(`Invalid date parts (non-numeric): ${value}`);
      return null;
    }
    
    let monthNum = parseInt(month, 10);
    let dayNum = parseInt(day, 10);
    let yearNum = parseInt(year, 10);
    
    // Handle 2-digit years
    if (yearNum < 100) {
      yearNum = yearNum > 50 ? 1900 + yearNum : 2000 + yearNum;
    }
    
    // Validate ranges
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || yearNum < 1900 || yearNum > 2100) {
      console.log(`Invalid date range: ${value} -> month=${monthNum}, day=${dayNum}, year=${yearNum}`);
      return null;
    }
    
    // Format as YYYY-MM-DD
    const result = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return result;
  }
  
  console.log(`Could not parse date: ${value}`);
  return null;
}

function determinePaymentMethod(zelleValue: string, notes: string): { method: 'zelle' | 'check' | null, details: string | null } {
  const zelleLower = (zelleValue || '').toLowerCase().trim();
  const notesLower = (notes || '').toLowerCase();
  
  // Check for "no" or "check" indicators
  if (zelleLower === 'no' || zelleLower.includes('no zelle') || 
      notesLower.includes('no zelle') || notesLower.includes('send check')) {
    return { method: 'check', details: null };
  }
  
  // If there's any Zelle value (email, phone, etc.), set to zelle
  if (zelleValue && zelleValue.trim() !== '') {
    return { method: 'zelle', details: zelleValue.trim() };
  }
  
  // Check notes for check references
  if (notesLower.includes('check')) {
    return { method: 'check', details: null };
  }
  
  // Default to zelle if no other indicator
  return { method: 'zelle', details: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, csvData } = await req.json();
    console.log(`Starting ${type} import...`);

    if (type === 'interpreters') {
      return await importInterpreters(supabase, csvData);
    } else if (type === 'facilities') {
      return await importFacilities(supabase, csvData);
    } else {
      throw new Error('Invalid import type');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function importInterpreters(supabase: any, csvData: string) {
  const lines = csvData.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  console.log('Interpreter headers:', headers);
  
  // Map column indices
  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => colMap[h.toLowerCase().trim()] = i);
  
  const interpreters: any[] = [];
  let skipped = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    
    const firstName = row[colMap['first name']] || '';
    const lastName = row[colMap['last name']] || '';
    
    // Skip if no name
    if (!firstName.trim() && !lastName.trim()) {
      skipped++;
      continue;
    }
    
    // Get email - prefer Email column, fallback to Email Address
    let email: string | null = row[colMap['email']] || '';
    if (!email && colMap['email address'] !== undefined) {
      email = row[colMap['email address']] || '';
    }
    
    // Leave email as null if not provided (don't generate placeholder)
    if (!email || !email.trim()) {
      email = null;
    }
    
    const notes = row[colMap['notes']] || '';
    const zelleValue = row[colMap['zelle']] || '';
    const { method: paymentMethod, details: paymentDetails } = determinePaymentMethod(zelleValue, notes);
    
    const ridNumber = row[colMap['rid #']] || '';
    
    interpreters.push({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email ? email.trim() : null,
      rate_business_hours: cleanCurrency(row[colMap['businesshourrate']]),
      rate_after_hours: cleanCurrency(row[colMap['afterhoursrate']]),
      rate_holiday_hours: cleanCurrency(row[colMap['holidayrate']]),
      insurance_end_date: parseDate(row[colMap['insuranceenddate']]),
      address: row[colMap['adress']] || null, // Note: typo in CSV
      city: row[colMap['city']] || null,
      state: row[colMap['state']] || null,
      rid_number: ridNumber || null,
      rid_certified: !!ridNumber,
      notes: notes || null,
      payment_method: paymentMethod,
      payment_details: paymentDetails,
      status: 'active',
    });
  }
  
  console.log(`Parsed ${interpreters.length} interpreters, skipped ${skipped}`);
  
  // First, delete interpreter_bills that reference interpreters
  console.log('Deleting existing interpreter bills...');
  const { error: deleteBillsError } = await supabase
    .from('interpreter_bills')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteBillsError) {
    console.error('Delete bills error:', deleteBillsError);
    throw new Error(`Failed to delete interpreter bills: ${deleteBillsError.message}`);
  }
  
  // Then delete existing interpreters
  console.log('Deleting existing interpreters...');
  const { error: deleteError } = await supabase
    .from('interpreters')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error('Delete error:', deleteError);
    throw new Error(`Failed to delete existing interpreters: ${deleteError.message}`);
  }
  
  // Insert in batches
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < interpreters.length; i += batchSize) {
    const batch = interpreters.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('interpreters')
      .insert(batch);
    
    if (insertError) {
      console.error(`Insert error at batch ${i}:`, insertError);
      throw new Error(`Failed to insert interpreters: ${insertError.message}`);
    }
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${interpreters.length} interpreters`);
  }
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Successfully imported ${interpreters.length} interpreters`,
      count: interpreters.length,
      skipped
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function importFacilities(supabase: any, csvData: string) {
  const lines = csvData.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  console.log('Facility headers:', headers);
  
  // Map column indices
  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => colMap[h.toLowerCase().trim()] = i);
  
  const facilities: any[] = [];
  let skipped = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    
    const name = row[colMap['facilityname']] || '';
    
    // Skip if no name
    if (!name.trim()) {
      skipped++;
      continue;
    }
    
    const contractorValue = (row[colMap['contractor (y/n)']] || '').toLowerCase().trim();
    const isContractor = contractorValue === 'y' || contractorValue === 'yes';
    
    const address = row[colMap['address']] || '';
    const city = row[colMap['city']] || '';
    const state = row[colMap['state']] || '';
    const zip = row[colMap['zipcode']] || '';
    
    const contactName = row[colMap['contact name']] || '';
    const contactEmail = row[colMap['contact email']] || '';
    const contactPhone = row[colMap['phone']] || '';
    
    // Create billing contact if any contact info exists
    const billingContacts: any[] = [];
    if (contactName || contactEmail || contactPhone) {
      billingContacts.push({
        id: crypto.randomUUID(),
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
      });
    }
    
    facilities.push({
      name: name.trim(),
      contractor: isContractor,
      physical_address: address || null,
      physical_city: city || null,
      physical_state: state || null,
      physical_zip: zip || null,
      billing_address: address || null,
      billing_city: city || null,
      billing_state: state || null,
      billing_zip: zip || null,
      rate_business_hours: cleanCurrency(row[colMap['businesshourrate']]),
      rate_after_hours: cleanCurrency(row[colMap['afterhoursrate']]),
      rate_holiday_hours: cleanCurrency(row[colMap['holidayrate']]),
      emergency_fee: cleanCurrency(row[colMap['emergencyfee']]),
      billing_contacts: billingContacts,
      notes: row[colMap['notes']] || null,
      billing_code: row[colMap['department charge#']] || null,
      status: 'active',
    });
  }
  
  console.log(`Parsed ${facilities.length} facilities, skipped ${skipped}`);
  
  // First, delete invoice_items that reference jobs
  console.log('Deleting existing invoice items...');
  const { error: deleteItemsError } = await supabase
    .from('invoice_items')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteItemsError) {
    console.error('Delete invoice items error:', deleteItemsError);
    throw new Error(`Failed to delete invoice items: ${deleteItemsError.message}`);
  }
  
  // Delete invoices that reference facilities
  console.log('Deleting existing invoices...');
  const { error: deleteInvoicesError } = await supabase
    .from('invoices')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteInvoicesError) {
    console.error('Delete invoices error:', deleteInvoicesError);
    throw new Error(`Failed to delete invoices: ${deleteInvoicesError.message}`);
  }
  
  // Delete jobs that reference facilities
  console.log('Deleting existing jobs...');
  const { error: deleteJobsError } = await supabase
    .from('jobs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteJobsError) {
    console.error('Delete jobs error:', deleteJobsError);
    throw new Error(`Failed to delete jobs: ${deleteJobsError.message}`);
  }
  
  // Then delete existing facilities
  console.log('Deleting existing facilities...');
  const { error: deleteError } = await supabase
    .from('facilities')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error('Delete error:', deleteError);
    throw new Error(`Failed to delete existing facilities: ${deleteError.message}`);
  }
  
  // Insert in batches
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < facilities.length; i += batchSize) {
    const batch = facilities.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('facilities')
      .insert(batch);
    
    if (insertError) {
      console.error(`Insert error at batch ${i}:`, insertError);
      throw new Error(`Failed to insert facilities: ${insertError.message}`);
    }
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${facilities.length} facilities`);
  }
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Successfully imported ${facilities.length} facilities`,
      count: facilities.length,
      skipped
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
