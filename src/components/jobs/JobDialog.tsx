import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/types/database';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobUpdate = Database['public']['Tables']['jobs']['Update'];
type Facility = Database['public']['Tables']['facilities']['Row'];

const jobSchema = z.object({
  facility_id: z.string().min(1, 'Facility is required'),
  deaf_client_name: z.string().optional(),
  job_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  location_type: z.enum(['in_person', 'remote']),
  location_address: z.string().optional(),
  location_city: z.string().optional(),
  location_state: z.string().optional(),
  location_zip: z.string().optional(),
  video_call_link: z.string().optional(),
  opportunity_source: z.enum(['direct', 'agency', 'gsa', 'referral', 'repeat', 'other']).nullable().optional(),
  billing_hours_type: z.enum(['business', 'after_hours', 'emergency']),
  internal_notes: z.string().optional(),
});

type FormData = z.infer<typeof jobSchema>;

interface JobDialogProps {
  open: boolean;
  onOpenChange: () => void;
  job: Job | null;
}

export function JobDialog({ open, onOpenChange, job }: JobDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: facilities } = useQuery({
    queryKey: ['facilities-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, physical_address, physical_city, physical_state, physical_zip, billing_address, billing_city, billing_state, billing_zip')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data as Facility[];
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      facility_id: '',
      location_type: 'in_person',
      billing_hours_type: 'business',
      job_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
    },
  });

  const watchedFacilityId = form.watch('facility_id');
  const watchedLocationType = form.watch('location_type');

  // Auto-fill address when facility changes and location is in_person
  useEffect(() => {
    if (watchedLocationType === 'in_person' && watchedFacilityId && facilities) {
      const facility = facilities.find((f) => f.id === watchedFacilityId);
      if (facility) {
        // Prefer physical address, fallback to billing address
        const address = facility.physical_address || facility.billing_address;
        const city = facility.physical_city || facility.billing_city;
        const state = facility.physical_state || facility.billing_state;
        const zip = facility.physical_zip || facility.billing_zip;
        
        form.setValue('location_address', address || '');
        form.setValue('location_city', city || '');
        form.setValue('location_state', state || '');
        form.setValue('location_zip', zip || '');
      }
    }
  }, [watchedFacilityId, watchedLocationType, facilities, form]);

  // Auto-detect billing hours type based on time
  const watchedStartTime = form.watch('start_time');
  const watchedJobDate = form.watch('job_date');

  useEffect(() => {
    if (watchedStartTime && watchedJobDate) {
      const date = new Date(watchedJobDate);
      const dayOfWeek = date.getDay();
      const [hours] = watchedStartTime.split(':').map(Number);
      
      // Business hours: 9am-5pm Monday-Friday
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const isBusinessHours = hours >= 9 && hours < 17;
      
      if (isWeekday && isBusinessHours) {
        form.setValue('billing_hours_type', 'business');
      } else {
        form.setValue('billing_hours_type', 'after_hours');
      }
    }
  }, [watchedStartTime, watchedJobDate, form]);

  useEffect(() => {
    if (job) {
      form.reset({
        facility_id: job.facility_id,
        deaf_client_name: job.deaf_client_name || '',
        job_date: job.job_date,
        start_time: job.start_time,
        end_time: job.end_time,
        location_type: job.location_type,
        location_address: job.location_address || '',
        location_city: job.location_city || '',
        location_state: job.location_state || '',
        location_zip: job.location_zip || '',
        video_call_link: job.video_call_link || '',
        opportunity_source: job.opportunity_source,
        billing_hours_type: job.billing_hours_type,
        internal_notes: job.internal_notes || '',
      });
    } else {
      form.reset({
        facility_id: '',
        location_type: 'in_person',
        billing_hours_type: 'business',
        job_date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '10:00',
      });
    }
  }, [job, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
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
        billing_hours_type: data.billing_hours_type,
        internal_notes: data.internal_notes || null,
      } satisfies JobInsert;

      if (job) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('jobs') as any)
          .update(payload)
          .eq('id', job.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('jobs') as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: `Job ${job ? 'updated' : 'created'} successfully` });
      onOpenChange();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? 'Edit Job' : 'New Job'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Job Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_date">Job Date *</Label>
                <Input id="job_date" type="date" {...form.register('job_date')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facility_id">Facility *</Label>
                <Select
                  value={form.watch('facility_id')}
                  onValueChange={(value) => form.setValue('facility_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities?.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.facility_id && (
                  <p className="text-sm text-destructive">{form.formState.errors.facility_id.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opportunity_source">Job Source</Label>
                <Select
                  value={form.watch('opportunity_source') || ''}
                  onValueChange={(value) => form.setValue('opportunity_source', value as FormData['opportunity_source'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                    <SelectItem value="gsa">GSA</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="repeat">Repeat</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deaf_client_name">Deaf Client Name</Label>
                <Input id="deaf_client_name" {...form.register('deaf_client_name')} />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="font-semibold">Schedule</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input id="start_time" type="time" {...form.register('start_time')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input id="end_time" type="time" {...form.register('end_time')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_hours_type">Billing Type</Label>
                <Select
                  value={form.watch('billing_hours_type')}
                  onValueChange={(value) => form.setValue('billing_hours_type', value as FormData['billing_hours_type'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business Hours</SelectItem>
                    <SelectItem value="after_hours">After Hours</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold">Location</h3>
            <div className="space-y-2">
              <Label htmlFor="location_type">Location Type</Label>
              <Select
                value={form.watch('location_type')}
                onValueChange={(value) => form.setValue('location_type', value as 'in_person' | 'remote')}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In-Person</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watchedLocationType === 'in_person' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="location_address">Address</Label>
                  <Input id="location_address" {...form.register('location_address')} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location_city">City</Label>
                    <Input id="location_city" {...form.register('location_city')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_state">State</Label>
                    <Input id="location_state" {...form.register('location_state')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_zip">Zip</Label>
                    <Input id="location_zip" {...form.register('location_zip')} />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="video_call_link">Video Call Link</Label>
                <Input id="video_call_link" placeholder="https://..." {...form.register('video_call_link')} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="internal_notes">Internal Notes</Label>
            <Textarea id="internal_notes" {...form.register('internal_notes')} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onOpenChange}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : job ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
