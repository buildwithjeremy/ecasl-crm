import { z } from 'zod';
import { phoneField, emailField, currencyField } from './shared';

// ==========================================
// Job Schema - Base (for creation)
// ==========================================

export const jobBaseSchema = z.object({
  // Required fields
  facility_id: z.string().min(1, 'Facility is required'),
  job_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  location_type: z.enum(['in_person', 'remote']),
  
  // Optional fields available on creation
  deaf_client_name: z.string().optional(),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip: z.string().optional(),
  timezone: z.string().optional(),
  video_call_link: z.string().optional(),
  opportunity_source: z.enum(['direct', 'agency', 'gsa', 'referral', 'repeat', 'other']).nullable().optional(),
  internal_notes: z.string().optional(),
  
  // Client contact info
  client_business_name: z.string().optional(),
  client_contact_name: z.string().optional(),
  client_contact_phone: phoneField,
  client_contact_email: emailField,
  
  // Fee flags (optional on creation)
  emergency_fee_applied: z.boolean().optional().default(false),
  holiday_fee_applied: z.boolean().optional().default(false),
}).refine((data) => {
  // Validate minimum 2 hour and maximum 8 hour job length
  const [startH, startM] = data.start_time.split(':').map(Number);
  const [endH, endM] = data.end_time.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const duration = endMinutes >= startMinutes 
    ? endMinutes - startMinutes 
    : (24 * 60 - startMinutes) + endMinutes;
  return duration >= 120 && duration <= 480; // 2-8 hours in minutes
}, {
  message: 'Job must be between 2 and 8 hours long',
  path: ['end_time'],
});

// ==========================================
// Job Schema - Extended (for detail/edit)
// ==========================================

export const jobExtendedSchema = z.object({
  // Status & Assignment
  status: z.enum(['new', 'outreach_in_progress', 'confirmed', 'complete', 'ready_to_bill', 'billed', 'paid', 'cancelled']),
  interpreter_id: z.string().optional(),
  potential_interpreter_ids: z.array(z.string()).optional(),
  
  // Billing fields
  billable_hours: currencyField,
  mileage: currencyField,
  parking: currencyField,
  tolls: currencyField,
  misc_fee: currencyField,
  travel_time_hours: currencyField,
  
  // Rate fields - Facility
  facility_rate_business: currencyField,
  facility_rate_after_hours: currencyField,
  facility_rate_holiday: currencyField,
  facility_rate_mileage: currencyField,
  facility_rate_adjustment: currencyField,
  
  // Rate fields - Interpreter
  interpreter_rate_business: currencyField,
  interpreter_rate_after_hours: currencyField,
  interpreter_rate_holiday: currencyField,
  interpreter_rate_mileage: currencyField,
  interpreter_rate_adjustment: currencyField,
  
  // Fee flags
  emergency_fee_applied: z.boolean().optional(),
  holiday_fee_applied: z.boolean().optional(),
});

// ==========================================
// Job Schema - Full (combined)
// ==========================================

// Use .merge() to combine, but we need to handle the refinement
const jobBaseWithoutRefinement = z.object({
  facility_id: z.string().min(1, 'Facility is required'),
  job_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  location_type: z.enum(['in_person', 'remote']),
  deaf_client_name: z.string().optional(),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip: z.string().optional(),
  timezone: z.string().optional(),
  video_call_link: z.string().optional(),
  opportunity_source: z.enum(['direct', 'agency', 'gsa', 'referral', 'repeat', 'other']).nullable().optional(),
  internal_notes: z.string().optional(),
  client_business_name: z.string().optional(),
  client_contact_name: z.string().optional(),
  client_contact_phone: phoneField,
  client_contact_email: emailField,
  emergency_fee_applied: z.boolean().optional().default(false),
  holiday_fee_applied: z.boolean().optional().default(false),
});

export const jobFullSchema = jobBaseWithoutRefinement.merge(jobExtendedSchema);

// ==========================================
// Types
// ==========================================

export type JobBaseFormData = z.infer<typeof jobBaseSchema>;
export type JobExtendedFormData = z.infer<typeof jobExtendedSchema>;
export type JobFullFormData = z.infer<typeof jobFullSchema>;

// ==========================================
// Default Values
// ==========================================

import { format } from 'date-fns';

export const getJobBaseDefaults = (): Partial<JobBaseFormData> => ({
  facility_id: '',
  location_type: 'in_person',
  job_date: format(new Date(), 'yyyy-MM-dd'),
  start_time: '09:00',
  end_time: '11:00',
});

export const getJobFullDefaults = (): Partial<JobFullFormData> => ({
  ...getJobBaseDefaults(),
  status: 'new',
  interpreter_id: '',
  potential_interpreter_ids: [],
});
