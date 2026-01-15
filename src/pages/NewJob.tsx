import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import {
  JobCoreFields,
  JobScheduleFields,
  JobLocationFields,
  JobNotesFields,
  JobEstimatedBillable,
  type FacilityOption,
} from '@/components/jobs/fields';
import { jobBaseSchema, type JobBaseFormData } from '@/lib/schemas/job.schema';
import { HoursSplit } from '@/lib/utils/job-calculations';

export default function NewJob() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFacility, setSelectedFacility] = useState<FacilityOption | null>(null);
  const [hoursSplit, setHoursSplit] = useState<HoursSplit | null>(null);

  const form = useForm<JobBaseFormData>({
    resolver: zodResolver(jobBaseSchema),
    defaultValues: {
      facility_id: '',
      location_type: 'in_person',
      job_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '11:00',
    },
  });

  const watchedEmergencyFeeApplied = form.watch('emergency_fee_applied');
  const watchedHolidayFeeApplied = form.watch('holiday_fee_applied');

  // Handle facility selection
  const handleFacilityChange = useCallback((facility: FacilityOption | null) => {
    setSelectedFacility(facility);
  }, []);

  // Handle hours split changes from schedule fields
  const handleHoursSplitChange = useCallback((split: HoursSplit | null) => {
    setHoursSplit(split);
  }, []);

  // Check if facility has rates configured
  const facilityMissingRates = useMemo(() => {
    if (!selectedFacility) return false;
    return !selectedFacility.rate_business_hours && !selectedFacility.rate_after_hours;
  }, [selectedFacility]);

  // Calculate billable total
  const billableTotal = useMemo(() => {
    if (!hoursSplit || !selectedFacility) return null;
    
    const useHolidayRate = watchedHolidayFeeApplied ?? false;
    const businessRate = selectedFacility.rate_business_hours ?? 0;
    const afterHoursRate = selectedFacility.rate_after_hours ?? 0;
    const holidayRate = selectedFacility.rate_holiday_hours ?? 0;

    // When holiday rate is applied, use it for all hours
    const effectiveBusinessRate = useHolidayRate ? holidayRate : businessRate;
    const effectiveAfterHoursRate = useHolidayRate ? holidayRate : afterHoursRate;

    const businessTotal = hoursSplit.businessHours * effectiveBusinessRate;
    const afterHoursTotal = hoursSplit.afterHours * effectiveAfterHoursRate;
    const hoursSubtotal = businessTotal + afterHoursTotal;
    
    const emergencyFee = watchedEmergencyFeeApplied ? (selectedFacility?.emergency_fee ?? 0) : 0;
    const feesTotal = emergencyFee;

    return {
      businessTotal,
      afterHoursTotal,
      hoursSubtotal,
      businessRate: effectiveBusinessRate,
      afterHoursRate: effectiveAfterHoursRate,
      emergencyFee,
      holidayFee: 0, // No longer a flat fee, now a rate override
      feesTotal,
      total: hoursSubtotal + feesTotal,
      useHolidayRate,
    };
  }, [hoursSplit, selectedFacility, watchedEmergencyFeeApplied, watchedHolidayFeeApplied]);

  const mutation = useMutation({
    mutationFn: async (data: JobBaseFormData) => {
      const payload = {
        facility_id: data.facility_id,
        deaf_client_name: data.deaf_client_name || null,
        job_date: data.job_date,
        start_time: data.start_time,
        end_time: data.end_time,
        location_type: data.location_type,
        location_address: data.location_address || null,
        location_city: data.location_city || null,
        location_state: data.location_state || null,
        location_zip: data.location_zip || null,
        timezone: data.timezone || null,
        video_call_link: data.video_call_link || null,
        opportunity_source: data.opportunity_source || null,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        emergency_fee_applied: data.emergency_fee_applied || false,
        holiday_fee_applied: data.holiday_fee_applied || false,
        facility_rate_business: selectedFacility?.rate_business_hours ?? null,
        facility_rate_after_hours: selectedFacility?.rate_after_hours ?? null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newJob, error } = await (supabase.from('jobs') as any).insert(payload).select('id').single();
      if (error) throw error;
      return newJob;
    },
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: 'Job created successfully' });
      navigate(`/jobs/${newJob.id}`);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: JobBaseFormData) => {
    // Warn but still allow creation if facility has no rates
    if (facilityMissingRates) {
      toast({
        title: "Warning: No Rates Configured",
        description: "This facility has no billing rates. The job will be created with $0.00 rates.",
        variant: "destructive",
      });
    }
    mutation.mutate(data);
  };

  const handleSubmitWithValidation = () => {
    form.handleSubmit(onSubmit, () => {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
    })();
  };

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-14 z-10 bg-background py-3 border-b -mx-6 px-6 -mt-6 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">New Job</h1>

          <div className="ml-auto">
            <Button 
              onClick={handleSubmitWithValidation} 
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Creating...' : 'Create Job'}
            </Button>
          </div>
        </div>
      </div>

      <form className="space-y-4">
        {/* Job Details - JobCoreFields renders its own card */}
        <JobCoreFields
          form={form}
          mode="create"
          onFacilityChange={handleFacilityChange}
        />

        {/* Missing Rates Warning */}
        {facilityMissingRates && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Billing Rates Configured</AlertTitle>
            <AlertDescription>
              The selected facility does not have billing rates set up. This job will be created with $0.00 rates. 
              Consider configuring rates on the facility record first.
            </AlertDescription>
          </Alert>
        )}

        {/* Schedule */}
        <JobScheduleFields
          form={form}
          mode="create"
          minimumHours={selectedFacility?.minimum_billable_hours ?? 2}
          onHoursSplitChange={handleHoursSplitChange}
          facilityEmergencyFee={selectedFacility?.emergency_fee}
          facilityHolidayRate={selectedFacility?.rate_holiday_hours}
        />

        {/* Client & Location */}
        <JobLocationFields
          form={form}
          mode="create"
          selectedFacility={selectedFacility}
        />

        {/* Estimated Billable */}
        {hoursSplit && billableTotal && (
          <JobEstimatedBillable
            hoursSplit={hoursSplit}
            billableTotal={billableTotal}
          />
        )}

        {/* Notes */}
        <JobNotesFields form={form} mode="create" />
      </form>
    </div>
  );
}
