
-- Insert test interpreter
INSERT INTO public.interpreters (first_name, last_name, email, phone, status, rate_business_hours, rate_after_hours, rid_certified, nic_certified, w9_received, minimum_hours, eligible_emergency_fee, eligible_holiday_fee)
VALUES ('Tina', 'Test', 'jeremy+interpreter1@buildwithjeremy.com', '555-100-0001', 'active', 75.00, 95.00, false, false, false, 2, false, false);

-- Insert 3 test facilities
INSERT INTO public.facilities (name, facility_type, status, is_gsa, contractor, physical_address, physical_city, physical_state, physical_zip, timezone, rate_business_hours, rate_after_hours, minimum_billable_hours, billing_contacts)
VALUES
  ('Test Hospital Normal', 'hospital', 'active', false, false, '123 Test St', 'Richmond', 'VA', '23220', 'America/New_York', 100.00, 130.00, 2, '[{"name":"Test Admin","email":"jeremy+facility1@buildwithjeremy.com","phone":"555-200-0001"}]'::jsonb),
  ('GSA-Test Federal Office', 'government', 'active', true, false, null, null, null, null, null, 110.00, 140.00, 2, '[{"name":"GSA Contact","email":"jeremy+gsafacility@buildwithjeremy.com","phone":"555-200-0002"}]'::jsonb),
  ('Test Contractor Services', 'business', 'active', false, true, null, null, null, null, null, 90.00, 120.00, 2, '[{"name":"Contractor Contact","email":"jeremy+contractor@buildwithjeremy.com","phone":"555-200-0003"}]'::jsonb);
