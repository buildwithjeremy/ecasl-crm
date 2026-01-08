import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const formSchema = z.object({
  facility_id: z.string().min(1, 'Facility is required'),
  interpreter_id: z.string().optional(),
  potential_interpreter_ids: z.array(z.string()).optional(),
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
  status: z.enum(['new', 'outreach_in_progress', 'confirmed', 'complete', 'ready_to_bill', 'billed', 'paid', 'cancelled']),
  opportunity_source: z.enum(['direct', 'agency', 'gsa', 'referral', 'repeat', 'other']).nullable().optional(),
  billing_hours_type: z.enum(['business', 'after_hours', 'emergency']),
  billable_hours: z.coerce.number().optional(),
  mileage: z.coerce.number().optional(),
  parking: z.coerce.number().optional(),
  tolls: z.coerce.number().optional(),
  misc_fee: z.coerce.number().optional(),
  travel_time_hours: z.coerce.number().optional(),
  facility_rate_business: z.coerce.number().optional(),
  facility_rate_after_hours: z.coerce.number().optional(),
  facility_rate_mileage: z.coerce.number().optional(),
  interpreter_rate_business: z.coerce.number().optional(),
  interpreter_rate_after_hours: z.coerce.number().optional(),
  interpreter_rate_mileage: z.coerce.number().optional(),
  emergency_fee_applied: z.boolean().optional(),
  holiday_fee_applied: z.boolean().optional(),
  internal_notes: z.string().optional(),
  client_business_name: z.string().optional(),
  client_contact_name: z.string().optional(),
  client_contact_phone: z.string().optional(),
  client_contact_email: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const statusLabels: Record<string, string> = {
  new: 'New',
  outreach_in_progress: 'Outreach',
  confirmed: 'Confirmed',
  complete: 'Complete',
  ready_to_bill: 'Ready to Bill',
  billed: 'Billed',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [interpreterOpen, setInterpreterOpen] = useState(false);
  const [potentialInterpretersOpen, setPotentialInterpretersOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(id || null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      facility_id: '',
      interpreter_id: '',
      potential_interpreter_ids: [],
      location_type: 'in_person',
      status: 'new',
      billing_hours_type: 'business',
      job_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
    },
  });

  // Fetch all jobs for search
  const { data: jobs } = useQuery({
    queryKey: ['jobs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_number, deaf_client_name, job_date')
        .order('job_date', { ascending: false });
      if (error) throw error;
      return data as { id: string; job_number: string | null; deaf_client_name: string | null; job_date: string }[];
    },
  });

  // Fetch facilities for select
  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  // Fetch interpreters for select
  const { data: interpreters } = useQuery({
    queryKey: ['interpreters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interpreters')
        .select('id, first_name, last_name')
        .order('last_name');
      if (error) throw error;
      return data as { id: string; first_name: string; last_name: string }[];
    },
  });

  // Fetch selected job
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return null;
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', selectedJobId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        job_number: string | null;
        facility_id: string;
        interpreter_id: string | null;
        deaf_client_name: string | null;
        job_date: string;
        start_time: string;
        end_time: string;
        location_type: 'in_person' | 'remote' | null;
        location_address: string | null;
        location_city: string | null;
        location_state: string | null;
        location_zip: string | null;
        video_call_link: string | null;
        status: 'new' | 'outreach_in_progress' | 'confirmed' | 'complete' | 'ready_to_bill' | 'billed' | 'paid' | 'cancelled' | null;
        opportunity_source: 'direct' | 'agency' | 'gsa' | 'referral' | 'repeat' | 'other' | null;
        billing_hours_type: 'business' | 'after_hours' | 'emergency' | null;
        billable_hours: number | null;
        mileage: number | null;
        parking: number | null;
        tolls: number | null;
        misc_fee: number | null;
        travel_time_hours: number | null;
        facility_rate_business: number | null;
        facility_rate_after_hours: number | null;
        facility_rate_mileage: number | null;
        interpreter_rate_business: number | null;
        interpreter_rate_after_hours: number | null;
        interpreter_rate_mileage: number | null;
        emergency_fee_applied: boolean | null;
        holiday_fee_applied: boolean | null;
        internal_notes: string | null;
        client_business_name: string | null;
        client_contact_name: string | null;
        client_contact_phone: string | null;
        client_contact_email: string | null;
        potential_interpreter_ids: string[] | null;
      } | null;
    },
    enabled: !!selectedJobId,
  });

  // Update URL when job changes
  useEffect(() => {
    if (selectedJobId && selectedJobId !== id) {
      navigate(`/jobs/${selectedJobId}`, { replace: true });
    }
  }, [selectedJobId, id, navigate]);

  // Populate form when job loads
  useEffect(() => {
    if (job) {
      form.reset({
        facility_id: job.facility_id,
        interpreter_id: job.interpreter_id || '',
        potential_interpreter_ids: job.potential_interpreter_ids || [],
        deaf_client_name: job.deaf_client_name || '',
        job_date: job.job_date,
        start_time: job.start_time,
        end_time: job.end_time,
        location_type: job.location_type || 'in_person',
        location_address: job.location_address || '',
        location_city: job.location_city || '',
        location_state: job.location_state || '',
        location_zip: job.location_zip || '',
        video_call_link: job.video_call_link || '',
        status: job.status || 'new',
        opportunity_source: job.opportunity_source,
        billing_hours_type: job.billing_hours_type || 'business',
        billable_hours: job.billable_hours || 0,
        mileage: job.mileage || 0,
        parking: job.parking || 0,
        tolls: job.tolls || 0,
        misc_fee: job.misc_fee || 0,
        travel_time_hours: job.travel_time_hours || 0,
        facility_rate_business: job.facility_rate_business || 0,
        facility_rate_after_hours: job.facility_rate_after_hours || 0,
        facility_rate_mileage: job.facility_rate_mileage || 0,
        interpreter_rate_business: job.interpreter_rate_business || 0,
        interpreter_rate_after_hours: job.interpreter_rate_after_hours || 0,
        interpreter_rate_mileage: job.interpreter_rate_mileage || 0,
        emergency_fee_applied: job.emergency_fee_applied || false,
        holiday_fee_applied: job.holiday_fee_applied || false,
        internal_notes: job.internal_notes || '',
        client_business_name: job.client_business_name || '',
        client_contact_name: job.client_contact_name || '',
        client_contact_phone: job.client_contact_phone || '',
        client_contact_email: job.client_contact_email || '',
      });
    }
  }, [job, form]);

  // Auto-calculate billable hours from start/end time
  const watchedStartTime = form.watch('start_time');
  const watchedEndTime = form.watch('end_time');

  useEffect(() => {
    if (watchedStartTime && watchedEndTime) {
      const [startHours, startMinutes] = watchedStartTime.split(':').map(Number);
      const [endHours, endMinutes] = watchedEndTime.split(':').map(Number);
      
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;
      
      let diffMinutes = endTotalMinutes - startTotalMinutes;
      // Handle overnight jobs
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
      }
      
      const hours = Math.round((diffMinutes / 60) * 4) / 4; // Round to nearest 0.25
      form.setValue('billable_hours', hours);
    }
  }, [watchedStartTime, watchedEndTime, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedJobId) return;
      const payload: Record<string, unknown> = {
        facility_id: data.facility_id,
        interpreter_id: data.interpreter_id || null,
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
        status: data.status,
        opportunity_source: data.opportunity_source || null,
        billing_hours_type: data.billing_hours_type,
        billable_hours: data.billable_hours || null,
        mileage: data.mileage || null,
        parking: data.parking || null,
        tolls: data.tolls || null,
        misc_fee: data.misc_fee || null,
        travel_time_hours: data.travel_time_hours || null,
        facility_rate_business: data.facility_rate_business || null,
        facility_rate_after_hours: data.facility_rate_after_hours || null,
        facility_rate_mileage: data.facility_rate_mileage || null,
        interpreter_rate_business: data.interpreter_rate_business || null,
        interpreter_rate_after_hours: data.interpreter_rate_after_hours || null,
        interpreter_rate_mileage: data.interpreter_rate_mileage || null,
        emergency_fee_applied: data.emergency_fee_applied || false,
        holiday_fee_applied: data.holiday_fee_applied || false,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        potential_interpreter_ids: data.potential_interpreter_ids || [],
      };
      const { error } = await supabase
        .from('jobs')
        .update(payload as never)
        .eq('id', selectedJobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: 'Job updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error updating job', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const selectedJob = jobs?.find((j) => j.id === selectedJobId);
  const selectedFacility = facilities?.find((f) => f.id === form.watch('facility_id'));
  const selectedInterpreter = interpreters?.find((i) => i.id === form.watch('interpreter_id'));
  const watchedLocationType = form.watch('location_type');
  const watchedPotentialInterpreterIds = form.watch('potential_interpreter_ids') || [];
  const selectedPotentialInterpreters = interpreters?.filter((i) => watchedPotentialInterpreterIds.includes(i.id)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Details</h1>
          <p className="text-muted-foreground">View and edit job information</p>
        </div>
      </div>

      {/* Job Search/Select */}
      <Card>
        <CardHeader>
          <CardTitle>Select Job</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {selectedJob
                  ? `${selectedJob.job_number} - ${selectedJob.deaf_client_name || 'N/A'} (${format(new Date(selectedJob.job_date), 'MMM d, yyyy')})`
                  : 'Search for a job...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0">
              <Command>
                <CommandInput placeholder="Search jobs..." />
                <CommandList>
                  <CommandEmpty>No job found.</CommandEmpty>
                  <CommandGroup>
                    {jobs?.map((j) => (
                      <CommandItem
                        key={j.id}
                        value={`${j.job_number} ${j.deaf_client_name || ''}`}
                        onSelect={() => {
                          setSelectedJobId(j.id);
                          setSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedJobId === j.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {j.job_number} - {j.deaf_client_name || 'N/A'} ({format(new Date(j.job_date), 'MMM d, yyyy')})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {jobLoading && <p className="text-muted-foreground">Loading job...</p>}

      {job && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Job Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Job #{job.job_number}</CardTitle>
                  {job.status && (
                    <Badge variant="secondary">{statusLabels[job.status]}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="outreach_in_progress">Outreach</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                            <SelectItem value="ready_to_bill">Ready to Bill</SelectItem>
                            <SelectItem value="billed">Billed</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="job_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deaf_client_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deaf Client Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Facility & Interpreter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="facility_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Facility</FormLabel>
                        <Popover open={facilityOpen} onOpenChange={setFacilityOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn('justify-between', !field.value && 'text-muted-foreground')}
                              >
                                {selectedFacility?.name || 'Select facility...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
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
                                        field.onChange(facility.id);
                                        setFacilityOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn('mr-2 h-4 w-4', field.value === facility.id ? 'opacity-100' : 'opacity-0')}
                                      />
                                      {facility.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interpreter_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Interpreter</FormLabel>
                        <Popover open={interpreterOpen} onOpenChange={setInterpreterOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn('justify-between', !field.value && 'text-muted-foreground')}
                              >
                                {selectedInterpreter
                                  ? `${selectedInterpreter.first_name} ${selectedInterpreter.last_name}`
                                  : 'Select interpreter...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Search interpreters..." />
                              <CommandList>
                                <CommandEmpty>
                                  {watchedPotentialInterpreterIds.length === 0 
                                    ? 'Add potential interpreters first' 
                                    : 'No interpreter found.'}
                                </CommandEmpty>
                                <CommandGroup>
                                  {interpreters
                                    ?.filter((interpreter) => watchedPotentialInterpreterIds.includes(interpreter.id))
                                    .map((interpreter) => (
                                      <CommandItem
                                        key={interpreter.id}
                                        value={`${interpreter.first_name} ${interpreter.last_name}`}
                                        onSelect={() => {
                                          field.onChange(interpreter.id);
                                          setInterpreterOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn('mr-2 h-4 w-4', field.value === interpreter.id ? 'opacity-100' : 'opacity-0')}
                                        />
                                        {interpreter.first_name} {interpreter.last_name}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="potential_interpreter_ids"
                    render={({ field }) => (
                      <FormItem className="flex flex-col md:col-span-2">
                        <FormLabel>Potential Interpreters</FormLabel>
                        <Popover open={potentialInterpretersOpen} onOpenChange={setPotentialInterpretersOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn('justify-between h-auto min-h-10', selectedPotentialInterpreters.length === 0 && 'text-muted-foreground')}
                              >
                                <div className="flex flex-wrap gap-1">
                                  {selectedPotentialInterpreters.length > 0 ? (
                                    selectedPotentialInterpreters.map((interpreter) => (
                                      <Badge key={interpreter.id} variant="secondary" className="mr-1">
                                        {interpreter.first_name} {interpreter.last_name}
                                      </Badge>
                                    ))
                                  ) : (
                                    'Select potential interpreters...'
                                  )}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="Search interpreters..." />
                              <CommandList>
                                <CommandEmpty>No interpreter found.</CommandEmpty>
                                <CommandGroup>
                                  {interpreters?.map((interpreter) => {
                                    const isSelected = field.value?.includes(interpreter.id);
                                    return (
                                      <CommandItem
                                        key={interpreter.id}
                                        value={`${interpreter.first_name} ${interpreter.last_name}`}
                                        onSelect={() => {
                                          const currentIds = field.value || [];
                                          if (isSelected) {
                                            field.onChange(currentIds.filter((id) => id !== interpreter.id));
                                          } else {
                                            field.onChange([...currentIds, interpreter.id]);
                                          }
                                        }}
                                      >
                                        <Check
                                          className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                                        />
                                        {interpreter.first_name} {interpreter.last_name}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billing_hours_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="business">Business Hours</SelectItem>
                            <SelectItem value="after_hours">After Hours</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billable_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billable Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.25" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="location_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="in_person">In-Person</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedLocationType === 'in_person' ? (
                  <>
                    <FormField
                      control={form.control}
                      name="location_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="location_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location_state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location_zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zip</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                ) : (
                  <FormField
                    control={form.control}
                    name="video_call_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video Call Link</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Rates & Fees Card */}
            <Card>
              <CardHeader>
                <CardTitle>Rates & Fees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Facility Rates */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Facility Rates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="facility_rate_business"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Rate ($/hr)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="facility_rate_after_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>After Hours Rate ($/hr)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="facility_rate_mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mileage Rate ($/mi)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Interpreter Rates */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Interpreter Rates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="interpreter_rate_business"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Rate ($/hr)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="interpreter_rate_after_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>After Hours Rate ($/hr)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="interpreter_rate_mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mileage Rate ($/mi)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Expenses */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Expenses</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <FormField
                      control={form.control}
                      name="mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mileage (mi)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="travel_time_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Travel Time (hrs)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.25" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parking"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parking ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tolls"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tolls ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="misc_fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Misc Fee ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client & Notes Card */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="client_business_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="client_contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="client_contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="client_contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="internal_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notes for internal use..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      )}

      {!selectedJobId && (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">Select a job to view details.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
