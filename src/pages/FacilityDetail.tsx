import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RecordPageLayout } from '@/components/layout/RecordPageLayout';
import { FacilityContractSection } from '@/components/facilities/FacilityContractSection';
import {
  FacilityCoreFields,
  FacilityAddressFields,
  FacilityRatesFields,
  FacilityBillingContacts,
  FacilityBillingSettings,
  FacilityNotesFields,
  validateBillingContacts,
  type BillingContact,
} from '@/components/facilities/fields';
import {
  facilityFullSchema,
  type FacilityFullFormData,
} from '@/lib/schemas/facility.schema';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

type Facility = Tables<'facilities'>;
type FacilityUpdate = TablesUpdate<'facilities'>;

export default function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(id || null);
  const [billingContacts, setBillingContacts] = useState<BillingContact[]>([]);

  // Sync URL id to selectedFacilityId state (for browser back/forward navigation)
  useEffect(() => {
    if (id && id !== selectedFacilityId) {
      setSelectedFacilityId(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch all facilities for the search
  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Facility[];
    },
  });

  // Fetch the selected facility
  const { data: facility, isLoading } = useQuery({
    queryKey: ['facility', selectedFacilityId],
    queryFn: async () => {
      if (!selectedFacilityId) return null;
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', selectedFacilityId)
        .single();
      if (error) throw error;
      return data as Facility;
    },
    enabled: !!selectedFacilityId,
  });

  const form = useForm<FacilityFullFormData>({
    resolver: zodResolver(facilityFullSchema),
    defaultValues: {
      name: '',
      facility_type: null,
      status: 'pending',
      minimum_billable_hours: 2,
      contract_status: 'not_sent',
      is_gsa: false,
      contractor: false,
    },
    mode: 'onChange',
  });

  // Unsaved changes warning
  const blocker = useUnsavedChangesWarning({ isDirty: form.formState.isDirty });

  // Update URL when facility changes
  useEffect(() => {
    if (selectedFacilityId && selectedFacilityId !== id) {
      navigate(`/facilities/${selectedFacilityId}`, { replace: true });
    }
  }, [selectedFacilityId, id, navigate]);

  // Populate form when facility data loads
  useEffect(() => {
    if (facility) {
      form.reset({
        name: facility.name,
        facility_type: facility.facility_type ?? null,
        billing_address: facility.billing_address ?? '',
        billing_city: facility.billing_city ?? '',
        billing_state: facility.billing_state ?? '',
        billing_zip: facility.billing_zip ?? '',
        physical_address: facility.physical_address ?? '',
        physical_city: facility.physical_city ?? '',
        physical_state: facility.physical_state ?? '',
        physical_zip: facility.physical_zip ?? '',
        timezone: facility.timezone ?? '',
        admin_contact_name: facility.admin_contact_name ?? '',
        admin_contact_phone: facility.admin_contact_phone ?? '',
        admin_contact_email: facility.admin_contact_email ?? '',
        status: facility.status ?? 'pending',
        rate_business_hours: facility.rate_business_hours ?? undefined,
        rate_after_hours: facility.rate_after_hours ?? undefined,
        rate_holiday_hours: facility.rate_holiday_hours ?? undefined,
        minimum_billable_hours: facility.minimum_billable_hours ?? 2,
        emergency_fee: facility.emergency_fee ?? undefined,
        holiday_fee: facility.holiday_fee ?? undefined,
        billing_code: facility.billing_code ?? '',
        contract_status: facility.contract_status ?? 'not_sent',
        is_gsa: facility.is_gsa ?? false,
        contractor: facility.contractor ?? false,
        notes: facility.notes ?? '',
      }, { keepDefaultValues: false });

      // Populate billing contacts from existing admin contact data
      if (facility.admin_contact_name || facility.admin_contact_phone || facility.admin_contact_email) {
        setBillingContacts([{
          id: crypto.randomUUID(),
          name: facility.admin_contact_name ?? '',
          phone: facility.admin_contact_phone ?? '',
          email: facility.admin_contact_email ?? '',
        }]);
      } else {
        setBillingContacts([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility]);

  const mutation = useMutation({
    mutationFn: async (data: FacilityFullFormData) => {
      if (!selectedFacilityId) return;
      
      // Get primary billing contact (first one) for the main admin fields
      const primaryContact = billingContacts[0];
      
      const updatePayload: FacilityUpdate = {
        name: data.name,
        facility_type: data.facility_type || null,
        billing_address: data.billing_address || null,
        billing_city: data.billing_city || null,
        billing_state: data.billing_state || null,
        billing_zip: data.billing_zip || null,
        physical_address: data.physical_address || null,
        physical_city: data.physical_city || null,
        physical_state: data.physical_state || null,
        physical_zip: data.physical_zip || null,
        timezone: data.timezone || null,
        admin_contact_name: primaryContact?.name || null,
        admin_contact_phone: primaryContact?.phone || null,
        admin_contact_email: primaryContact?.email || null,
        status: data.status || null,
        rate_business_hours: data.rate_business_hours ?? null,
        rate_after_hours: data.rate_after_hours ?? null,
        rate_holiday_hours: data.rate_holiday_hours ?? null,
        minimum_billable_hours: data.minimum_billable_hours ?? null,
        emergency_fee: data.emergency_fee ?? null,
        holiday_fee: data.holiday_fee ?? null,
        billing_code: data.billing_code || null,
        contract_status: data.contract_status || null,
        is_gsa: data.is_gsa ?? null,
        contractor: data.contractor ?? null,
        notes: data.notes || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('facilities') as any)
        .update(updatePayload)
        .eq('id', selectedFacilityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', selectedFacilityId] });
      toast({ title: 'Facility updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FacilityFullFormData) => {
    const validation = validateBillingContacts(billingContacts);
    if (!validation.valid) {
      toast({ title: 'Please fix validation errors', variant: 'destructive' });
      return;
    }
    mutation.mutate(data);
  };

  const handleDelete = useCallback(async () => {
    if (!facility) return;
    const { error } = await supabase.from('facilities').delete().eq('id', facility.id);
    if (error) {
      toast({ title: 'Error deleting facility', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Facility deleted successfully' });
      navigate('/facilities');
    }
  }, [facility, navigate, toast]);

  // Build options for the selector
  const selectorOptions = (facilities ?? []).map((f) => ({
    id: f.id,
    label: f.name,
    searchValue: f.name,
  }));

  return (
    <RecordPageLayout
      title={facility?.name || 'Facility Details'}
      backRoute="/facilities"
      isDirty={form.formState.isDirty}
      blocker={blocker}
      isLoading={isLoading}
      hasRecord={!!facility}
      isSaving={mutation.isPending}
      formId="facility-detail-form"
      selector={{
        selectedId: selectedFacilityId,
        options: selectorOptions,
        isOpen: searchOpen,
        onOpenChange: setSearchOpen,
        onSelect: setSelectedFacilityId,
        placeholder: 'Select facility...',
        searchPlaceholder: 'Search facilities...',
        emptyMessage: 'No facility found.',
        width: 'w-[200px]',
      }}
      deleteConfig={{
        title: 'Delete Facility',
        description: `Are you sure you want to delete ${facility?.name}? This action cannot be undone.`,
        onDelete: handleDelete,
      }}
    >
      {facility && (
        <form id="facility-detail-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Information */}
          <FacilityCoreFields form={form} mode="edit" showStatus />

          {/* Billing Contacts */}
          <FacilityBillingContacts
            mode="edit"
            contacts={billingContacts}
            onContactsChange={setBillingContacts}
          />

          {/* Addresses */}
          <FacilityAddressFields form={form} mode="edit" />

          {/* Rates */}
          <FacilityRatesFields form={form} mode="edit" />

          {/* Billing Settings */}
          <FacilityBillingSettings form={form} mode="edit" />

          {/* Contract Section with PDF Generation */}
          <FacilityContractSection
            form={form}
            facility={{ 
              id: facility.id, 
              contract_pdf_url: facility.contract_pdf_url,
              signed_contract_pdf_url: facility.signed_contract_pdf_url
            }}
            onContractGenerated={() => {
              queryClient.invalidateQueries({ queryKey: ['facility', selectedFacilityId] });
            }}
          />

          {/* Notes */}
          <FacilityNotesFields form={form} mode="edit" />
        </form>
      )}

      {!selectedFacilityId && (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">Select a facility to view details.</p>
          </CardContent>
        </Card>
      )}
    </RecordPageLayout>
  );
}
