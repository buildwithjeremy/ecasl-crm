import { z } from 'zod';

// ==========================================
// Shared Validation Patterns
// ==========================================

// Phone validation regex - allows formats like (123) 456-7890, 123-456-7890, 1234567890
export const phoneRegex = /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/;

// Zip code validation
export const zipCodeRegex = /^\d{5}(-\d{4})?$/;

// ==========================================
// Shared Field Schemas
// ==========================================

export const phoneField = z.string().optional().refine(
  (val) => !val || phoneRegex.test(val),
  { message: 'Please enter a valid phone number' }
);

export const emailField = z.string().optional().refine(
  (val) => !val || z.string().email().safeParse(val).success,
  { message: 'Please enter a valid email address' }
);

export const requiredEmailField = z.string().email('Valid email is required');

export const zipCodeField = z.string().optional().refine(
  (val) => !val || zipCodeRegex.test(val),
  'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)'
);

export const currencyField = z.coerce.number().optional();

export const requiredCurrencyField = z.coerce.number().min(0.01, 'Rate is required');

// ==========================================
// Shared Types
// ==========================================

export type FormMode = 'create' | 'edit';

// US States for dropdowns
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
] as const;

// Facility types
export const FACILITY_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'school', label: 'School' },
  { value: 'government', label: 'Government' },
  { value: 'business', label: 'Business' },
  { value: 'other', label: 'Other' },
] as const;

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
] as const;

// Job statuses
export const JOB_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'outreach_in_progress', label: 'Outreach' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'complete', label: 'Complete' },
  { value: 'ready_to_bill', label: 'Ready to Bill' },
  { value: 'billed', label: 'Billed' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

// Job sources
export const OPPORTUNITY_SOURCES = [
  { value: 'direct', label: 'Direct' },
  { value: 'agency', label: 'Agency' },
  { value: 'gsa', label: 'GSA' },
  { value: 'referral', label: 'Referral' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'other', label: 'Other' },
] as const;

// Location types
export const LOCATION_TYPES = [
  { value: 'in_person', label: 'In Person' },
  { value: 'remote', label: 'Remote (Video)' },
] as const;
