import { z } from 'zod';
import { phoneField, requiredEmailField, zipCodeField, requiredCurrencyField, currencyField } from './shared';

// ==========================================
// Interpreter Schema - Base (for creation)
// ==========================================

export const interpreterBaseSchema = z.object({
  // Required fields
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: requiredEmailField,
  
  // Optional personal info
  phone: phoneField,
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: zipCodeField,
  
  // Certifications
  rid_certified: z.boolean(),
  nic_certified: z.boolean(),
  other_certifications: z.string().optional(),
  
  // Rates (required on creation)
  rate_business_hours: requiredCurrencyField,
  rate_after_hours: requiredCurrencyField,
  
  // Payment
  payment_method: z.enum(['zelle', 'check'], { required_error: 'Payment method is required' }),
  payment_details: z.string().optional(),
  
  // Compliance
  w9_received: z.boolean(),
  insurance_end_date: z.date().optional().nullable(),
  
  // Notes
  notes: z.string().optional(),
});

// ==========================================
// Interpreter Schema - Extended (for detail/edit)
// ==========================================

export const interpreterExtendedSchema = z.object({
  // Status
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  
  // Rates & minimums
  minimum_hours: currencyField,
  
  // Fee eligibility
  eligible_emergency_fee: z.boolean().optional(),
  eligible_holiday_fee: z.boolean().optional(),
  
  // Contract fields
  contract_status: z.enum(['not_sent', 'sent', 'signed']).optional(),
  contract_signed_date: z.date().optional().nullable(),
  contract_pdf_url: z.string().optional(),
  signed_contract_pdf_url: z.string().optional(),
  
  // Timezone
  timezone: z.string().optional(),
  
  // W9 date
  w9_received_date: z.date().optional().nullable(),
});

// ==========================================
// Interpreter Schema - Full (combined)
// ==========================================

export const interpreterFullSchema = interpreterBaseSchema.merge(interpreterExtendedSchema);

// ==========================================
// Types
// ==========================================

export type InterpreterBaseFormData = z.infer<typeof interpreterBaseSchema>;
export type InterpreterExtendedFormData = z.infer<typeof interpreterExtendedSchema>;
export type InterpreterFullFormData = z.infer<typeof interpreterFullSchema>;

// ==========================================
// Default Values
// ==========================================

export const getInterpreterBaseDefaults = (): Partial<InterpreterBaseFormData> => ({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  rid_certified: false,
  nic_certified: false,
  w9_received: false,
  insurance_end_date: null,
});

export const getInterpreterFullDefaults = (): Partial<InterpreterFullFormData> => ({
  ...getInterpreterBaseDefaults(),
  status: 'pending',
  contract_status: 'not_sent',
  minimum_hours: 2,
  eligible_emergency_fee: false,
  eligible_holiday_fee: false,
});
