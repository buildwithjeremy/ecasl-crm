import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, ChevronsUpDown, CalendarIcon, ExternalLink, Building2, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database';

// Generate 15-minute time increments
function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour24 = h.toString().padStart(2, '0');
      const min = m.toString().padStart(2, '0');
      const value = `${hour24}:${min}`;
      
      // Format for display (12-hour with AM/PM)
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? 'AM' : 'PM';
      const label = `${hour12}:${min} ${ampm}`;
      
      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

// Helper to calculate hours split between business (8am-5pm) and after-hours
function calculateHoursSplit(startTime: string, endTime: string, minimumHours: number = 2): {
  businessHours: number;
  afterHours: number;
  totalHours: number;
  billableHours: number;
  minimumApplied: number;
  hoursType: 'business' | 'after' | 'mixed';
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
  
  // Determine hours type
  let hoursType: 'business' | 'after' | 'mixed' = 'mixed';
  if (afterMinutes === 0) {
    hoursType = 'business';
  } else if (businessMinutes === 0) {
    hoursType = 'after';
  }
  
  return {
    businessHours: businessHours + minimumApplied,
    afterHours,
    totalHours,
    billableHours,
    minimumApplied,
    hoursType,
  };
}

// Format duration as "Xh Ym"
function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

type Facility = Database['public']['Tables']['facilities']['Row'];
type FacilitySelect = Pick<Facility, 'id' | 'name' | 'physical_address' | 'physical_city' | 'physical_state' | 'physical_zip' | 'billing_address' | 'billing_city' | 'billing_state' | 'billing_zip' | 'contractor' | 'admin_contact_name' | 'admin_contact_phone' | 'admin_contact_email' | 'rate_business_hours' | 'rate_after_hours' | 'rate_mileage' | 'minimum_billable_hours'>;

// Generate duration options (2h to 8h in 15-min increments)
function generateDurationOptions(): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  // 2 hours to 8 hours in 15-minute increments
  for (let minutes = 120; minutes <= 480; minutes += 15) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const label = mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
    options.push({ value: minutes, label });
  }
  return options;
}

const DURATION_OPTIONS = generateDurationOptions();

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
}).refine((data) => {
  // Validate minimum 2 hour and maximum 8 hour job length
  const [startH, startM] = data.start_time.split(':').map(Number);
  const [endH, endM] = data.end_time.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const duration = endMinutes >= startMinutes 
    ? endMinutes - startMinutes 
    : (24 * 60 - startMinutes) + endMinutes;
  return duration >= 120 && duration <= 480; // 2-8 hours in minutes
}, {
  message: 'Job must be between 2 and 8 hours long',
  path: ['end_time'],
});

type FormData = z.infer<typeof jobSchema>;

export default function NewJob() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [createdAt] = useState(new Date());

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
      end_time: '11:00', // Default 2-hour job
    },
  });

  const watchedFacilityId = form.watch('facility_id');
  const watchedLocationType = form.watch('location_type');
  const watchedStartTime = form.watch('start_time');
  const watchedEndTime = form.watch('end_time');
  const watchedJobDate = form.watch('job_date');
  const watchedEmergencyFee = form.watch('emergency_fee');
  const watchedHolidayFee = form.watch('holiday_fee');
  
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

  // Track previous start time to detect changes
  const prevStartTimeRef = useRef(watchedStartTime);
  
  // When start time changes, auto-adjust end time to maintain valid duration (2-8 hours)
  useEffect(() => {
    if (!watchedStartTime || !watchedEndTime) return;
    
    // Only run when start time actually changed
    if (prevStartTimeRef.current === watchedStartTime) return;
    prevStartTimeRef.current = watchedStartTime;
    
    const [startH, startM] = watchedStartTime.split(':').map(Number);
    const [endH, endM] = watchedEndTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    // Calculate current duration
    let durationMinutes = endMinutes >= startMinutes 
      ? endMinutes - startMinutes 
      : (24 * 60 - startMinutes) + endMinutes;
    
    // Clamp duration to valid range (2-8 hours = 120-480 minutes)
    if (durationMinutes < 120) {
      durationMinutes = 120; // Minimum 2 hours
    } else if (durationMinutes > 480) {
      durationMinutes = 480; // Maximum 8 hours
    } else {
      return; // Duration is valid, no adjustment needed
    }
    
    // Calculate new end time
    const newEndMinutes = (startMinutes + durationMinutes) % (24 * 60);
    const newEndH = Math.floor(newEndMinutes / 60);
    const newEndM = newEndMinutes % 60;
    const newEndTime = `${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}`;
    
    form.setValue('end_time', newEndTime);
  }, [watchedStartTime, watchedEndTime, form]);

  // Track previous end time to detect changes
  const prevEndTimeRef = useRef(watchedEndTime);
  
  // When end time changes directly, ensure it maintains valid duration
  useEffect(() => {
    if (!watchedStartTime || !watchedEndTime) return;
    
    // Only run when end time actually changed
    if (prevEndTimeRef.current === watchedEndTime) return;
    prevEndTimeRef.current = watchedEndTime;
    
    const [startH, startM] = watchedStartTime.split(':').map(Number);
    const [endH, endM] = watchedEndTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    let durationMinutes = endMinutes >= startMinutes 
      ? endMinutes - startMinutes 
      : (24 * 60 - startMinutes) + endMinutes;
    
    // If duration is invalid, adjust end time
    if (durationMinutes < 120 || durationMinutes > 480) {
      const clampedDuration = Math.max(120, Math.min(480, durationMinutes));
      const newEndMinutes = (startMinutes + clampedDuration) % (24 * 60);
      const newEndH = Math.floor(newEndMinutes / 60);
      const newEndM = newEndMinutes % 60;
      const newEndTime = `${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}`;
      form.setValue('end_time', newEndTime);
    }
  }, [watchedEndTime, watchedStartTime, form]);

  // Calculate billable hours split
  const hoursSplit = useMemo(() => {
    if (!watchedStartTime || !watchedEndTime) return null;
    const minimumHours = selectedFacility?.minimum_billable_hours ?? 2;
    return calculateHoursSplit(watchedStartTime, watchedEndTime, minimumHours);
  }, [watchedStartTime, watchedEndTime, selectedFacility?.minimum_billable_hours]);

  // Calculate billable total (hourly charges + fees)
  const billableTotal = useMemo(() => {
    if (!hoursSplit || !selectedFacility) return null;
    const businessRate = selectedFacility.rate_business_hours ?? 0;
    const afterHoursRate = selectedFacility.rate_after_hours ?? 0;

    const businessTotal = hoursSplit.businessHours * businessRate;
    const afterHoursTotal = hoursSplit.afterHours * afterHoursRate;
    const hoursSubtotal = businessTotal + afterHoursTotal;
    
    const emergencyFee = watchedEmergencyFee || 0;
    const holidayFee = watchedHolidayFee || 0;
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

  // Calculate job duration
  const jobDuration = useMemo(() => {
    if (!watchedStartTime || !watchedEndTime) return null;
    const [startH, startM] = watchedStartTime.split(':').map(Number);
    const [endH, endM] = watchedEndTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = endMinutes >= startMinutes 
      ? endMinutes - startMinutes 
      : (24 * 60 - startMinutes) + endMinutes;
    return duration / 60; // hours
  }, [watchedStartTime, watchedEndTime]);

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

  // Get facility location display
  const facilityLocation = selectedFacility ? {
    address: selectedFacility.physical_address || selectedFacility.billing_address,
    city: selectedFacility.physical_city || selectedFacility.billing_city,
    state: selectedFacility.physical_state || selectedFacility.billing_state,
    zip: selectedFacility.physical_zip || selectedFacility.billing_zip,
  } : null;

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
            <Button onClick={form.handleSubmit(onSubmit)} disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Job'}
            </Button>
          </div>
        </div>
      </div>

      <form className="space-y-4">
        {/* Job Details */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Job Details</CardTitle>
              <span className="text-sm text-muted-foreground">
                {format(createdAt, "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Facility Combobox */}
              <div className="space-y-2">
                <Label>Facility *</Label>
                <Popover open={facilityOpen} onOpenChange={setFacilityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={facilityOpen}
                      className="w-full justify-between"
                    >
                      {selectedFacility ? (
                        <span className="flex items-center gap-2 truncate">
                          {selectedFacility.name}
                          {selectedFacility.contractor && (
                            <Badge variant="secondary" className="text-xs">Contractor</Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select facility...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search facilities..." />
                      <CommandList>
                        <CommandEmpty>No facility found.</CommandEmpty>
                        <CommandGroup>
                          {facilities?.map((facility) => (
                            <CommandItem
                              key={facility.id}
                              value={facility.name}
                              onSelect={() => {
                                form.setValue('facility_id', facility.id);
                                setFacilityOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  watchedFacilityId === facility.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span className="flex-1">{facility.name}</span>
                              {facility.contractor && (
                                <Badge variant="secondary" className="ml-2 text-xs">Contractor</Badge>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.formState.errors.facility_id && (
                  <p className="text-sm text-destructive">{form.formState.errors.facility_id.message}</p>
                )}
              </div>

              {/* Job Source */}
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
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Job Date */}
              <div className="space-y-2">
                <Label>Job Date *</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal overflow-hidden',
                        !watchedJobDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {watchedJobDate ? format(new Date(watchedJobDate + 'T00:00:00'), 'MMM d, yyyy') : 'Pick a date'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchedJobDate ? new Date(watchedJobDate + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          form.setValue('job_date', format(date, 'yyyy-MM-dd'));
                          setDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.job_date && (
                  <p className="text-sm text-destructive">{form.formState.errors.job_date.message}</p>
                )}
              </div>

              {/* Start Time */}
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Select
                  value={watchedStartTime}
                  onValueChange={(value) => form.setValue('start_time', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {TIME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.start_time && (
                  <p className="text-sm text-destructive">{form.formState.errors.start_time.message}</p>
                )}
              </div>

              {/* End Time */}
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Select
                  value={watchedEndTime}
                  onValueChange={(value) => form.setValue('end_time', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {TIME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.end_time && (
                  <p className="text-sm text-destructive">{form.formState.errors.end_time.message}</p>
                )}
              </div>

              {/* Job Duration */}
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={jobDuration !== null ? String(Math.round((jobDuration * 60) / 15) * 15) : undefined}
                  onValueChange={(value) => {
                    // Calculate new end time based on duration
                    const durationMinutes = parseInt(value, 10);
                    const [startH, startM] = watchedStartTime.split(':').map(Number);
                    const startMinutes = startH * 60 + startM;
                    const endMinutes = (startMinutes + durationMinutes) % (24 * 60);
                    const endH = Math.floor(endMinutes / 60);
                    const endM = endMinutes % 60;
                    const newEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                    form.setValue('end_time', newEndTime);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Hours Breakdown */}
                {hoursSplit && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    {hoursSplit.businessHours > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {hoursSplit.businessHours}h business
                      </span>
                    )}
                    {hoursSplit.afterHours > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {hoursSplit.afterHours}h after-hours
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Client */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Location & Client</CardTitle>
              {selectedFacility && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/facilities/${selectedFacility.id}`, '_blank')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Facility
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Location Type */}
            <div className="space-y-2">
              <Label>Location Type</Label>
              <Select
                value={watchedLocationType}
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
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Address</span>
                  {selectedFacility && !isContractor && (
                    <Badge variant="secondary" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      From Facility
                    </Badge>
                  )}
                  {isContractor && (
                    <Badge variant="outline" className="text-xs">
                      Manual Entry
                    </Badge>
                  )}
                </div>
                
                {selectedFacility && !isContractor ? (
                  // Non-contractor: Show read-only facility address
                  <div className="text-sm text-muted-foreground pl-6">
                    {facilityLocation?.address && <div>{facilityLocation.address}</div>}
                    {(facilityLocation?.city || facilityLocation?.state || facilityLocation?.zip) && (
                      <div>
                        {[facilityLocation?.city, facilityLocation?.state].filter(Boolean).join(', ')}
                        {facilityLocation?.zip && ` ${facilityLocation.zip}`}
                      </div>
                    )}
                    {!facilityLocation?.address && <div className="italic">No address on file</div>}
                  </div>
                ) : (
                  // Contractor or no facility: Editable address fields
                  <>
                    <div className="space-y-2">
                      <Input 
                        placeholder="Address" 
                        {...form.register('location_address')} 
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <Input 
                        placeholder="City" 
                        {...form.register('location_city')} 
                      />
                      <Input 
                        placeholder="State" 
                        {...form.register('location_state')} 
                      />
                      <Input 
                        placeholder="Zip" 
                        {...form.register('location_zip')} 
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-lg border p-4 space-y-2">
                <Label htmlFor="video_call_link">Video Call Link</Label>
                <Input id="video_call_link" placeholder="https://..." {...form.register('video_call_link')} />
              </div>
            )}

            {/* Client Information */}
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Client Contact</span>
                {selectedFacility && (
                  <Badge variant="secondary" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />
                    From Facility
                  </Badge>
                )}
              </div>
              
              {selectedFacility && !isContractor ? (
                // Non-contractor: Show read-only client info
                <div className="grid grid-cols-2 gap-4 text-sm pl-6">
                  <div>
                    <div className="text-muted-foreground text-xs">Business</div>
                    <div>{selectedFacility.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Contact</div>
                    <div>{selectedFacility.admin_contact_name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Phone</div>
                    <div>{selectedFacility.admin_contact_phone || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Email</div>
                    <div>{selectedFacility.admin_contact_email || '—'}</div>
                  </div>
                </div>
              ) : (
                // Contractor or no facility: Editable client fields
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client_business_name">Business Name</Label>
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
                </>
              )}

              {/* Deaf Client Name - moved here */}
              <div className="pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="deaf_client_name">Deaf Client Name</Label>
                  <Input id="deaf_client_name" {...form.register('deaf_client_name')} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fees */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Fees</CardTitle>
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
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Estimated Billable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Hours Breakdown */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Hours Breakdown</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Business Hours</span>
                      <span className="tabular-nums">
                        {hoursSplit.businessHours.toFixed(2)} hrs × ${billableTotal.businessRate.toFixed(2)}
                        <span className="w-24 inline-block text-right font-medium ml-4">${billableTotal.businessTotal.toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>After Hours</span>
                      <span className="tabular-nums">
                        {hoursSplit.afterHours.toFixed(2)} hrs × ${billableTotal.afterHoursRate.toFixed(2)}
                        <span className="w-24 inline-block text-right font-medium ml-4">${billableTotal.afterHoursTotal.toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-medium">
                        Total Billable Hours
                        {hoursSplit.minimumApplied > 0 && (
                          <span className="text-muted-foreground font-normal ml-1">
                            (incl. {hoursSplit.minimumApplied.toFixed(2)}hr minimum)
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums">
                        {hoursSplit.billableHours.toFixed(2)} hrs
                        <span className="w-24 inline-block text-right font-medium ml-4">${billableTotal.hoursSubtotal.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Fees */}
                {billableTotal.feesTotal > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Additional Fees</div>
                    <div className="space-y-1 text-sm">
                      {billableTotal.emergencyFee > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Emergency Fee</span>
                          <span className="tabular-nums">
                            <span className="w-24 inline-block text-right font-medium ml-4">+${billableTotal.emergencyFee.toFixed(2)}</span>
                          </span>
                        </div>
                      )}
                      {billableTotal.holidayFee > 0 && (
                        <div className="flex justify-between items-center">
                          <span>Holiday Fee</span>
                          <span className="tabular-nums">
                            <span className="w-24 inline-block text-right font-medium ml-4">+${billableTotal.holidayFee.toFixed(2)}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t text-base font-semibold">
                  <span>ESTIMATED TOTAL</span>
                  <span className="tabular-nums text-lg">${billableTotal.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Notes</CardTitle>
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
