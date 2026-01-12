import { useMemo } from 'react';
import type { FormMode } from '@/lib/schemas/shared';

// ==========================================
// Job Section Visibility
// ==========================================

export interface JobSectionVisibility {
  // Core sections - always visible
  showCoreSection: boolean;
  showScheduleSection: boolean;
  showLocationSection: boolean;
  showClientSection: boolean;
  showNotesSection: boolean;
  
  // Conditional sections
  showInterpreterSection: boolean;
  showBillingSection: boolean;
  showExpensesSection: boolean;
  showLinkedInvoice: boolean;
  showLinkedPayable: boolean;
  showActionsSection: boolean;
  
  // Field-level visibility
  showStatusField: boolean;
  showRatesFields: boolean;
}

export type JobStatus = 
  | 'new' 
  | 'outreach_in_progress' 
  | 'confirmed' 
  | 'complete' 
  | 'ready_to_bill' 
  | 'billed' 
  | 'paid' 
  | 'cancelled';

export interface JobVisibilityData {
  status: JobStatus | null;
  interpreter_id: string | null;
  invoiceId?: string | null;
  billId?: string | null;
}

export function useJobSectionVisibility(
  job: JobVisibilityData | null,
  mode: FormMode
): JobSectionVisibility {
  return useMemo(() => {
    const isEdit = mode === 'edit';
    const status = job?.status || 'new';
    const hasInterpreter = !!job?.interpreter_id;
    
    // Status progression levels for comparison
    const statusOrder: JobStatus[] = [
      'new',
      'outreach_in_progress', 
      'confirmed',
      'complete',
      'ready_to_bill',
      'billed',
      'paid',
      'cancelled',
    ];
    
    const statusIndex = statusOrder.indexOf(status);
    const isAtLeast = (targetStatus: JobStatus) => 
      statusIndex >= statusOrder.indexOf(targetStatus);
    
    return {
      // Core sections - always visible
      showCoreSection: true,
      showScheduleSection: true,
      showLocationSection: true,
      showClientSection: true,
      showNotesSection: true,
      
      // Interpreter section shows in edit mode
      showInterpreterSection: isEdit,
      
      // Billing section shows when:
      // - In edit mode AND
      // - (Status is confirmed or later OR interpreter is assigned)
      showBillingSection: isEdit && (isAtLeast('confirmed') || hasInterpreter),
      
      // Expenses section shows when status is complete or later
      showExpensesSection: isEdit && isAtLeast('complete'),
      
      // Linked records show when they exist
      showLinkedInvoice: isEdit && !!job?.invoiceId,
      showLinkedPayable: isEdit && !!job?.billId,
      
      // Actions section (emails, status changes) - edit mode only
      showActionsSection: isEdit,
      
      // Field-level visibility
      showStatusField: isEdit,
      showRatesFields: isEdit && hasInterpreter,
    };
  }, [job, mode]);
}

// ==========================================
// Facility Section Visibility
// ==========================================

export interface FacilitySectionVisibility {
  // Core sections - always visible
  showCoreSection: boolean;
  showBillingContactsSection: boolean;
  showAddressSection: boolean;
  showRatesSection: boolean;
  showNotesSection: boolean;
  
  // Conditional sections
  showBillingSettingsSection: boolean;
  showContractSection: boolean;
  showLinkedJobsSection: boolean;
}

export type FacilityStatus = 'active' | 'inactive' | 'pending';

export interface FacilityVisibilityData {
  status: FacilityStatus | null;
  contract_status?: string | null;
  hasJobs?: boolean;
}

export function useFacilitySectionVisibility(
  facility: FacilityVisibilityData | null,
  mode: FormMode
): FacilitySectionVisibility {
  return useMemo(() => {
    const isEdit = mode === 'edit';
    const status = facility?.status || 'pending';
    const isActive = status === 'active';
    
    return {
      // Core sections - always visible
      showCoreSection: true,
      showBillingContactsSection: true,
      showAddressSection: true,
      showRatesSection: true,
      showNotesSection: true,
      
      // Billing settings show in edit mode for active/pending facilities
      showBillingSettingsSection: isEdit,
      
      // Contract section shows in edit mode
      showContractSection: isEdit,
      
      // Linked jobs section shows if facility has jobs
      showLinkedJobsSection: isEdit && !!facility?.hasJobs,
    };
  }, [facility, mode]);
}

// ==========================================
// Interpreter Section Visibility
// ==========================================

export interface InterpreterSectionVisibility {
  // Core sections - always visible
  showCoreSection: boolean;
  showAddressSection: boolean;
  showCertificationsSection: boolean;
  showRatesSection: boolean;
  showPaymentSection: boolean;
  showNotesSection: boolean;
  
  // Conditional sections
  showComplianceSection: boolean;
  showContractSection: boolean;
  showLinkedJobsSection: boolean;
}

export type InterpreterStatus = 'active' | 'inactive' | 'pending';

export interface InterpreterVisibilityData {
  status: InterpreterStatus | null;
  contract_status?: string | null;
  hasJobs?: boolean;
}

export function useInterpreterSectionVisibility(
  interpreter: InterpreterVisibilityData | null,
  mode: FormMode
): InterpreterSectionVisibility {
  return useMemo(() => {
    const isEdit = mode === 'edit';
    
    return {
      // Core sections - always visible
      showCoreSection: true,
      showAddressSection: true,
      showCertificationsSection: true,
      showRatesSection: true,
      showPaymentSection: true,
      showNotesSection: true,
      
      // Compliance section shows in edit mode
      showComplianceSection: isEdit,
      
      // Contract section shows in edit mode
      showContractSection: isEdit,
      
      // Linked jobs section shows if interpreter has jobs
      showLinkedJobsSection: isEdit && !!interpreter?.hasJobs,
    };
  }, [interpreter, mode]);
}
