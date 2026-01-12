import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import {
  JobCoreFields,
  JobScheduleFields,
  JobLocationFields,
  JobFeesFields,
  JobNotesFields,
  JobEstimatedBillable,
  type FacilityOption,
} from '@/components/jobs/fields';
import { jobBaseSchema, type JobBaseFormData } from '@/lib/schemas/job.schema';
import { HoursSplit, toSafeNumber } from '@/lib/utils/job-calculations';

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

  const watchedEmergencyFee = form.watch('emergency_fee');
  const watchedHolidayFee = form.watch('holiday_fee');

  // Handle facility selection
  const handleFacilityChange = useCallback((facility: FacilityOption | null) => {
    setSelectedFacility(facility);
  }, []);

  // Handle hours split changes from schedule fields
  const handleHoursSplitChange = useCallback((split: HoursSplit | null) => {
    setHoursSplit(split);
  }, []);

  // Calculate billable total
  const billableTotal = useMemo(() => {
    if (!hoursSplit || !selectedFacility) return null;
    const businessRate = selectedFacility.rate_business_hours ?? 0;
    const afterHoursRate = selectedFacility.rate_after_hours ?? 0;

    const businessTotal = hoursSplit.businessHours * businessRate;
    const afterHoursTotal = hoursSplit.afterHours * afterHoursRate;
    const hoursSubtotal = businessTotal + afterHoursTotal;
    
    const emergencyFee = toSafeNumber(watchedEmergencyFee);
    const holidayFee = toSafeNumber(watchedHolidayFee);
    const feesTotal = emergencyFee + holidayFee;

    return {
      businessTotal,
      afterHoursTotal,
      hoursSubtotal,
      businessRate,
      afterHoursRate,
      emergencyFee,
      holidayFee,
      feesTotal,
      total: hoursSubtotal + feesTotal,
    };
  }, [hoursSplit, selectedFacility, watchedEmergencyFee, watchedHolidayFee]);

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
        video_call_link: data.video_call_link || null,
        opportunity_source: data.opportunity_source || null,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        emergency_fee: data.emergency_fee || null,
        holiday_fee: data.holiday_fee || null,
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

        {/* Schedule */}
        <JobScheduleFields
          form={form}
          mode="create"
          minimumHours={selectedFacility?.minimum_billable_hours ?? 2}
          onHoursSplitChange={handleHoursSplitChange}
        />

        {/* Client & Location */}
        <JobLocationFields
          form={form}
          mode="create"
          selectedFacility={selectedFacility}
        />

        {/* Fees */}
        <JobFeesFields form={form} mode="create" />

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
