import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import type { Database } from '@/types/database';

// Helper to calculate hours split between business (8am-5pm) and after-hours
function calculateHoursSplit(startTime: string, endTime: string, minimumHours: number = 2): {
  businessHours: number;
  afterHours: number;
  totalHours: number;
  billableHours: number;
  minimumApplied: number;
} {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  // Handle overnight jobs
  const totalMinutes = endMinutes >= startMinutes 
    ? endMinutes - startMinutes 
    : (24 * 60 - startMinutes) + endMinutes;
  
  const totalHours = totalMinutes / 60;
  
  // Business hours: 8am (480 min) to 5pm (1020 min)
  const businessStart = 8 * 60; // 8:00 AM
  const businessEnd = 17 * 60;  // 5:00 PM
  
  let businessMinutes = 0;
  let afterMinutes = 0;
  
  // Iterate through each minute of the job
  for (let i = 0; i < totalMinutes; i++) {
    const currentMinute = (startMinutes + i) % (24 * 60);
    if (currentMinute >= businessStart && currentMinute < businessEnd) {
      businessMinutes++;
    } else {
      afterMinutes++;
    }
  }
  
  const businessHours = businessMinutes / 60;
  const afterHours = afterMinutes / 60;
  
  // Apply minimum hours - any shortfall is added to business hours
  const billableHours = Math.max(totalHours, minimumHours);
  const minimumApplied = billableHours > totalHours ? billableHours - totalHours : 0;
  
  return {
    businessHours: businessHours + minimumApplied,
    afterHours,
    totalHours,
    billableHours,
    minimumApplied,
  };
}

type Facility = Database['public']['Tables']['facilities']['Row'];
type FacilitySelect = Pick<Facility, 'id' | 'name' | 'physical_address' | 'physical_city' | 'physical_state' | 'physical_zip' | 'billing_address' | 'billing_city' | 'billing_state' | 'billing_zip' | 'contractor' | 'admin_contact_name' | 'admin_contact_phone' | 'admin_contact_email' | 'rate_business_hours' | 'rate_after_hours' | 'rate_mileage' | 'minimum_billable_hours'>;

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
  internal_notes: z.string().optional(),
  client_business_name: z.string().optional(),
  client_contact_name: z.string().optional(),
  client_contact_phone: z.string().optional(),
  client_contact_email: z.string().optional(),
  emergency_fee: z.coerce.number().optional(),
  holiday_fee: z.coerce.number().optional(),
});

type FormData = z.infer<typeof jobSchema>;

export default function NewJob() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: facilities } = useQuery({
    queryKey: ['facilities-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, physical_address, physical_city, physical_state, physical_zip, billing_address, billing_city, billing_state, billing_zip, contractor, admin_contact_name, admin_contact_phone, admin_contact_email, rate_business_hours, rate_after_hours, rate_mileage, minimum_billable_hours')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data as unknown as FacilitySelect[];
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      facility_id: '',
      location_type: 'in_person',
      job_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
    },
  });

  const watchedFacilityId = form.watch('facility_id');
  const watchedLocationType = form.watch('location_type');
  
  const selectedFacility = facilities?.find((f) => f.id === watchedFacilityId);
  const isContractor = selectedFacility?.contractor ?? false;

  // Auto-fill client info for ALL facilities, but location only for non-contractors
  useEffect(() => {
    if (watchedFacilityId && facilities) {
      const facility = facilities.find((f) => f.id === watchedFacilityId);
      if (facility) {
        // Auto-fill client info for ALL facilities
        form.setValue('client_business_name', facility.name || '');
        form.setValue('client_contact_name', facility.admin_contact_name || '');
        form.setValue('client_contact_phone', facility.admin_contact_phone || '');
        form.setValue('client_contact_email', facility.admin_contact_email || '');

        if (!facility.contractor) {
          // Non-contractor: also auto-fill location from facility
          if (watchedLocationType === 'in_person') {
            const address = facility.physical_address || facility.billing_address;
            const city = facility.physical_city || facility.billing_city;
            const state = facility.physical_state || facility.billing_state;
            const zip = facility.physical_zip || facility.billing_zip;

            form.setValue('location_address', address || '');
            form.setValue('location_city', city || '');
            form.setValue('location_state', state || '');
            form.setValue('location_zip', zip || '');
          }
        } else {
          // Contractor: clear location fields for manual entry
          form.setValue('location_address', '');
          form.setValue('location_city', '');
          form.setValue('location_state', '');
          form.setValue('location_zip', '');
        }
      }
    }
  }, [watchedFacilityId, watchedLocationType, facilities, form]);

  const watchedStartTime = form.watch('start_time');
  const watchedEndTime = form.watch('end_time');

  // Calculate billable hours split
  const hoursSplit = useMemo(() => {
    if (!watchedStartTime || !watchedEndTime) return null;
    const minimumHours = selectedFacility?.minimum_billable_hours ?? 2;
    return calculateHoursSplit(watchedStartTime, watchedEndTime, minimumHours);
  }, [watchedStartTime, watchedEndTime, selectedFacility?.minimum_billable_hours]);

  // Calculate billable total (hourly charges only)
  const billableTotal = useMemo(() => {
    if (!hoursSplit || !selectedFacility) return null;
    const businessRate = selectedFacility.rate_business_hours ?? 0;
    const afterHoursRate = selectedFacility.rate_after_hours ?? 0;

    const businessTotal = hoursSplit.businessHours * businessRate;
    const afterHoursTotal = hoursSplit.afterHours * afterHoursRate;

    return {
      businessTotal,
      afterHoursTotal,
      total: businessTotal + afterHoursTotal,
      businessRate,
      afterHoursRate,
    };
  }, [hoursSplit, selectedFacility]);

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
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        emergency_fee: data.emergency_fee || null,
        holiday_fee: data.holiday_fee || null,
      };

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

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 -mx-6 -mt-6 px-6 py-4 bg-background border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">New Job</h1>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating...' : 'Create Job'}
        </Button>
      </div>

      <form className="space-y-6">
        {/* Job Details */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_date">Job Date *</Label>
                <Input id="job_date" type="date" {...form.register('job_date')} />
                {form.formState.errors.job_date && (
                  <p className="text-sm text-destructive">{form.formState.errors.job_date.message}</p>
                )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input id="start_time" type="time" {...form.register('start_time')} />
                {form.formState.errors.start_time && (
                  <p className="text-sm text-destructive">{form.formState.errors.start_time.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input id="end_time" type="time" {...form.register('end_time')} />
                {form.formState.errors.end_time && (
                  <p className="text-sm text-destructive">{form.formState.errors.end_time.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <Label htmlFor="location_address">Address {isContractor && '*'}</Label>
                  <Input id="location_address" {...form.register('location_address')} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>
              Client Information
              {isContractor && <span className="text-destructive ml-1">*</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isContractor && (
              <p className="text-sm text-muted-foreground">
                This is a contractor facility. Please enter the client details for this job.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_business_name">Business Name {isContractor && '*'}</Label>
                <Input id="client_business_name" {...form.register('client_business_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_contact_name">Contact Name</Label>
                <Input id="client_contact_name" {...form.register('client_contact_name')} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_contact_phone">Phone</Label>
                <Input id="client_contact_phone" {...form.register('client_contact_phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_contact_email">Email</Label>
                <Input id="client_contact_email" type="email" {...form.register('client_contact_email')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fees */}
        <Card>
          <CardHeader>
            <CardTitle>Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_fee">Emergency Fee</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="emergency_fee"
                    type="number"
                    step="0.01"
                    className="pl-7"
                    {...form.register('emergency_fee')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday_fee">Holiday Fee</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="holiday_fee"
                    type="number"
                    step="0.01"
                    className="pl-7"
                    {...form.register('holiday_fee')}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estimated Billable */}
        {hoursSplit && billableTotal && (
          <Card>
            <CardHeader>
              <CardTitle>Estimated Billable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-muted-foreground">Job Duration</div>
                <div className="text-right font-medium">{hoursSplit.totalHours.toFixed(2)} hrs</div>
                
                <div className="text-muted-foreground">Billable Hours</div>
                <div className="text-right font-medium">
                  {hoursSplit.billableHours.toFixed(2)} hrs
                  {hoursSplit.minimumApplied > 0 && (
                    <span className="text-muted-foreground ml-1">
                      (min +{hoursSplit.minimumApplied.toFixed(2)})
                    </span>
                  )}
                </div>
                
                <div className="text-muted-foreground">Business Hours</div>
                <div className="text-right">
                  {hoursSplit.businessHours.toFixed(2)} hrs × ${billableTotal.businessRate.toFixed(2)} = ${billableTotal.businessTotal.toFixed(2)}
                </div>
                
                {hoursSplit.afterHours > 0 && (
                  <>
                    <div className="text-muted-foreground">After Hours</div>
                    <div className="text-right">
                      {hoursSplit.afterHours.toFixed(2)} hrs × ${billableTotal.afterHoursRate.toFixed(2)} = ${billableTotal.afterHoursTotal.toFixed(2)}
                    </div>
                  </>
                )}
                
                <div className="text-muted-foreground font-semibold pt-2 border-t">Estimated Total</div>
                <div className="text-right font-bold pt-2 border-t">${billableTotal.total.toFixed(2)}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="internal_notes">Internal Notes</Label>
              <Textarea
                id="internal_notes"
                rows={4}
                placeholder="Internal notes about this job..."
                {...form.register('internal_notes')}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
