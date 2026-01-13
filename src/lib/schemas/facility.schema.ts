import { z } from 'zod';
import { phoneField, currencyField } from './shared';

// ==========================================
// Billing Contact Schema
// ==========================================

export const billingContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
});

export type BillingContact = z.infer<typeof billingContactSchema>;

// ==========================================
// Facility Schema - Base (for creation)
// ==========================================

export const facilityBaseSchema = z.object({
  // Required fields
  name: z.string().min(1, 'Facility name is required'),
  
  // Type & flags
  facility_type: z.enum(['hospital', 'clinic', 'school', 'government', 'business', 'other']).nullable().optional(),
  is_gsa: z.boolean().optional(),
  contractor: z.boolean().optional(),
  
  // Billing address
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  
  // Physical address
  physical_address: z.string().optional(),
  physical_city: z.string().optional(),
  physical_state: z.string().optional(),
  physical_zip: z.string().optional(),
  timezone: z.string().optional(),
  
  // Rates
  rate_business_hours: currencyField,
  rate_after_hours: currencyField,
  rate_holiday_hours: currencyField,
  
  // Notes
  notes: z.string().optional(),
});

// ==========================================
// Facility Schema - Extended (for detail/edit)
// ==========================================

export const facilityExtendedSchema = z.object({
  // Admin contact (legacy - now using billing contacts)
  admin_contact_name: z.string().optional(),
  admin_contact_phone: phoneField,
  admin_contact_email: z.string().optional().refine(
    (val) => !val || z.string().email().safeParse(val).success,
    { message: 'Please enter a valid email address' }
  ),
  
  // Billing settings
  billing_code: z.string().optional(),
  minimum_billable_hours: currencyField,
  emergency_fee: currencyField,
  holiday_fee: currencyField,
  
  // Contract fields
  contract_status: z.enum(['not_sent', 'sent', 'signed']).optional(),
  contract_signed_date: z.date().optional().nullable(),
  contract_pdf_url: z.string().optional(),
  signed_contract_pdf_url: z.string().optional(),
  
  // Status
  status: z.enum(['active', 'inactive', 'pending']).optional(),
});

// ==========================================
// Facility Schema - Full (combined)
// ==========================================

export const facilityFullSchema = facilityBaseSchema.merge(facilityExtendedSchema);

// ==========================================
// Types
// ==========================================

export type FacilityBaseFormData = z.infer<typeof facilityBaseSchema>;
export type FacilityExtendedFormData = z.infer<typeof facilityExtendedSchema>;
export type FacilityFullFormData = z.infer<typeof facilityFullSchema>;

// ==========================================
// Default Values
// ==========================================

export const getFacilityBaseDefaults = (): Partial<FacilityBaseFormData> => ({
  name: '',
  facility_type: null,
  is_gsa: false,
  contractor: false,
});

export const getFacilityFullDefaults = (): Partial<FacilityFullFormData> => ({
  ...getFacilityBaseDefaults(),
  status: 'pending',
  contract_status: 'not_sent',
  minimum_billable_hours: 2,
});

// ==========================================
// Billing Contact Helpers
// ==========================================

export const createEmptyBillingContact = (): BillingContact => ({
  id: crypto.randomUUID(),
  name: '',
  phone: '',
  email: '',
});
