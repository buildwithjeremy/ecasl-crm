import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { facilityBaseSchema, FacilityBaseFormData } from '@/lib/schemas/facility.schema';
import {
  FacilityCoreFields,
  FacilityAddressFields,
  FacilityRatesFields,
  FacilityBillingContacts,
  FacilityNotesFields,
} from '@/components/facilities/fields';

export default function NewFacility() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FacilityBaseFormData>({
    resolver: zodResolver(facilityBaseSchema),
    defaultValues: {
      name: '',
      facility_type: undefined,
      is_gsa: false,
      contractor: false,
      billing_contacts: [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FacilityBaseFormData) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
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
        // Save to billing_contacts JSONB column
        billing_contacts: data.billing_contacts || [],
        status: 'pending',
        rate_business_hours: data.rate_business_hours || null,
        rate_after_hours: data.rate_after_hours || null,
        rate_holiday_hours: data.rate_holiday_hours || null,
        minimum_billable_hours: 2,
        contract_status: 'not_sent',
        is_gsa: data.is_gsa,
        contractor: data.contractor,
        notes: data.notes || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newFacility, error } = await (supabase.from('facilities') as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return newFacility;
    },
    onSuccess: (newFacility) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast({ title: 'Facility created successfully' });
      navigate(`/facilities/${newFacility.id}`);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FacilityBaseFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-14 z-10 bg-background py-3 border-b -mx-6 px-6 -mt-6 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/facilities')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">New Facility</h1>

          <div className="ml-auto">
            <Button 
              type="submit" 
              form="new-facility-form"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Creating...' : 'Create Facility'}
            </Button>
          </div>
        </div>
      </div>

      <form id="new-facility-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FacilityCoreFields form={form} mode="create" />
        
        <FacilityBillingContacts form={form} mode="create" />
        
        <FacilityAddressFields form={form} mode="create" />
        
        <FacilityRatesFields form={form} mode="create" />
        
        <FacilityNotesFields form={form} mode="create" />
      </form>
    </div>
  );
}
