import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { JobStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Check, ChevronsUpDown, ArrowLeft, Mail, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { RatesEditDialog, RateField } from '@/components/jobs/RatesEditDialog';
import { RateChips } from '@/components/jobs/RateChips';
import { ContactEditDialog, ContactField } from '@/components/jobs/ContactEditDialog';

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
  facility_rate_adjustment: z.coerce.number().optional(),
  interpreter_rate_adjustment: z.coerce.number().optional(),
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
  
  // Dialog states for rate editing
  const [facilityRatesDialogOpen, setFacilityRatesDialogOpen] = useState(false);
  const [interpreterRatesDialogOpen, setInterpreterRatesDialogOpen] = useState(false);
  
  
  const [clientContactDialogOpen, setClientContactDialogOpen] = useState(false);
  
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
      job_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
    },
  });

  // Block navigation when form has unsaved changes
  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
      form.formState.isDirty && currentLocation.pathname !== nextLocation.pathname,
    [form.formState.isDirty]
  );
  const blocker = useBlocker(shouldBlock);

  // Handle browser refresh/close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

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
    queryKey: ['facilities-with-rates-and-address'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, rate_business_hours, rate_after_hours, rate_mileage, minimum_billable_hours, contractor, physical_address, physical_city, physical_state, physical_zip, billing_address, billing_city, billing_state, billing_zip, admin_contact_name, admin_contact_phone, admin_contact_email')
        .order('name');
      if (error) throw error;
      return data as { 
        id: string; 
        name: string; 
        rate_business_hours: number | null; 
        rate_after_hours: number | null; 
        rate_mileage: number | null;
        minimum_billable_hours: number | null;
        contractor: boolean | null;
        physical_address: string | null;
        physical_city: string | null;
        physical_state: string | null;
        physical_zip: string | null;
        billing_address: string | null;
        billing_city: string | null;
        billing_state: string | null;
        billing_zip: string | null;
        admin_contact_name: string | null;
        admin_contact_phone: string | null;
        admin_contact_email: string | null;
      }[];
    },
  });

  // Fetch interpreters for select
  const { data: interpreters } = useQuery({
    queryKey: ['interpreters-with-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interpreters')
        .select('id, first_name, last_name, rate_business_hours, rate_after_hours, rate_mileage, minimum_hours')
        .order('last_name');
      if (error) throw error;
      return data as { id: string; first_name: string; last_name: string; rate_business_hours: number | null; rate_after_hours: number | null; rate_mileage: number | null; minimum_hours: number | null }[];
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
        billable_hours: number | null;
        mileage: number | null;
        parking: number | null;
        tolls: number | null;
        misc_fee: number | null;
        travel_time_hours: number | null;
        facility_rate_business: number | null;
        facility_rate_after_hours: number | null;
        facility_rate_mileage: number | null;
        facility_rate_adjustment: number | null;
        interpreter_rate_business: number | null;
        interpreter_rate_after_hours: number | null;
        interpreter_rate_mileage: number | null;
        interpreter_rate_adjustment: number | null;
        emergency_fee_applied: boolean | null;
        holiday_fee_applied: boolean | null;
        internal_notes: string | null;
        client_business_name: string | null;
        client_contact_name: string | null;
        client_contact_phone: string | null;
        client_contact_email: string | null;
        potential_interpreter_ids: string[] | null;
        trilingual_rate_uplift: number | null;
      } | null;
    },
    enabled: !!selectedJobId,
  });

  // Fetch invoice for this job
  const { data: jobInvoice } = useQuery({
    queryKey: ['job-invoice', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('job_id', selectedJobId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; invoice_number: string } | null;
    },
    enabled: !!selectedJobId,
  });

  // Fetch interpreter bill for this job
  const { data: jobBill } = useQuery({
    queryKey: ['job-bill', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return null;
      const { data, error } = await supabase
        .from('interpreter_bills')
        .select('id, bill_number')
        .eq('job_id', selectedJobId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; bill_number: string | null } | null;
    },
    enabled: !!selectedJobId,
  });

  // Check if job is locked (status is 'paid')
  const isLocked = job?.status === 'paid';

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
        billable_hours: job.billable_hours || 0,
        mileage: job.mileage || 0,
        parking: job.parking || 0,
        tolls: job.tolls || 0,
        misc_fee: job.misc_fee || 0,
        travel_time_hours: job.travel_time_hours || 0,
        facility_rate_business: job.facility_rate_business || 0,
        facility_rate_after_hours: job.facility_rate_after_hours || 0,
        facility_rate_mileage: job.facility_rate_mileage || 0,
        facility_rate_adjustment: job.facility_rate_adjustment || 0,
        interpreter_rate_business: job.interpreter_rate_business || 0,
        interpreter_rate_after_hours: job.interpreter_rate_after_hours || 0,
        interpreter_rate_mileage: job.interpreter_rate_mileage || 0,
        interpreter_rate_adjustment: job.interpreter_rate_adjustment || 0,
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

  // Auto-populate facility rates and location when facility changes
  const watchedFacilityId = form.watch('facility_id');
  const watchedLocationTypeForFacility = form.watch('location_type');
  
  useEffect(() => {
    if (watchedFacilityId && facilities) {
      const facility = facilities.find((f) => f.id === watchedFacilityId);
      if (facility) {
        // Always set rates
        form.setValue('facility_rate_business', facility.rate_business_hours || 0);
        form.setValue('facility_rate_after_hours', facility.rate_after_hours || 0);
        form.setValue('facility_rate_mileage', facility.rate_mileage || 0);
        
        if (!facility.contractor) {
          // Non-contractor: auto-fill from facility data
          if (watchedLocationTypeForFacility === 'in_person') {
            const address = facility.physical_address || facility.billing_address;
            const city = facility.physical_city || facility.billing_city;
            const state = facility.physical_state || facility.billing_state;
            const zip = facility.physical_zip || facility.billing_zip;
            
            form.setValue('location_address', address || '');
            form.setValue('location_city', city || '');
            form.setValue('location_state', state || '');
            form.setValue('location_zip', zip || '');
          }
          // Auto-fill client info from facility
          form.setValue('client_business_name', facility.name || '');
          form.setValue('client_contact_name', facility.admin_contact_name || '');
          form.setValue('client_contact_phone', facility.admin_contact_phone || '');
          form.setValue('client_contact_email', facility.admin_contact_email || '');
        } else {
          // Contractor: clear fields for manual entry
          form.setValue('location_address', '');
          form.setValue('location_city', '');
          form.setValue('location_state', '');
          form.setValue('location_zip', '');
          form.setValue('client_business_name', '');
          form.setValue('client_contact_name', '');
          form.setValue('client_contact_phone', '');
          form.setValue('client_contact_email', '');
        }
      }
    }
  }, [watchedFacilityId, watchedLocationTypeForFacility, facilities, form]);

  // Auto-populate interpreter rates when interpreter changes
  const watchedInterpreterId = form.watch('interpreter_id');
  useEffect(() => {
    if (watchedInterpreterId && interpreters) {
      const interpreter = interpreters.find((i) => i.id === watchedInterpreterId);
      if (interpreter) {
        form.setValue('interpreter_rate_business', interpreter.rate_business_hours || 0);
        form.setValue('interpreter_rate_after_hours', interpreter.rate_after_hours || 0);
        form.setValue('interpreter_rate_mileage', interpreter.rate_mileage || 0);
      }
    }
  }, [watchedInterpreterId, interpreters, form]);

  const selectedJob = jobs?.find((j) => j.id === selectedJobId);
  const selectedFacility = facilities?.find((f) => f.id === form.watch('facility_id'));
  const selectedInterpreter = interpreters?.find((i) => i.id === form.watch('interpreter_id'));
  const watchedLocationType = form.watch('location_type');
  const watchedStatus = form.watch('status');
  const watchedPotentialInterpreterIds = form.watch('potential_interpreter_ids') || [];
  const selectedPotentialInterpreters = interpreters?.filter((i) => watchedPotentialInterpreterIds.includes(i.id)) || [];

  // Calculate billable hours split for display
  const hoursSplit = useMemo(() => {
    if (!watchedStartTime || !watchedEndTime) return null;
    const minimumHours = selectedFacility?.minimum_billable_hours ?? 2;
    return calculateHoursSplit(watchedStartTime, watchedEndTime, minimumHours);
  }, [watchedStartTime, watchedEndTime, selectedFacility?.minimum_billable_hours]);

  // Watch expense fields for calculation reactivity - ensure numeric values
  const rawMileage = form.watch('mileage');
  const rawTravelTime = form.watch('travel_time_hours');
  const rawParking = form.watch('parking');
  const rawTolls = form.watch('tolls');
  const rawMiscFee = form.watch('misc_fee');
  const rawFacilityRateBusiness = form.watch('facility_rate_business');
  const rawFacilityRateAfterHours = form.watch('facility_rate_after_hours');
  const rawFacilityRateMileage = form.watch('facility_rate_mileage');
  const rawInterpreterRateBusiness = form.watch('interpreter_rate_business');
  const rawInterpreterRateAfterHours = form.watch('interpreter_rate_after_hours');
  const rawInterpreterRateMileage = form.watch('interpreter_rate_mileage');
  const rawFacilityRateAdjustment = form.watch('facility_rate_adjustment');
  const rawInterpreterRateAdjustment = form.watch('interpreter_rate_adjustment');

  // Convert to safe numbers (handle empty strings, undefined, NaN)
  const toSafeNumber = (val: unknown, fallback: number = 0): number => {
    if (val === undefined || val === null || val === '') return fallback;
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  };

  // Check if a value was explicitly provided (not empty/undefined)
  const hasValue = (val: unknown): boolean => {
    return val !== undefined && val !== null && val !== '' && !isNaN(Number(val));
  };

  const watchedMileage = toSafeNumber(rawMileage);
  const watchedTravelTime = toSafeNumber(rawTravelTime);
  const watchedParking = toSafeNumber(rawParking);
  const watchedTolls = toSafeNumber(rawTolls);
  const watchedMiscFee = toSafeNumber(rawMiscFee);
  const watchedFacilityRateBusiness = toSafeNumber(rawFacilityRateBusiness);
  const watchedFacilityRateAfterHours = toSafeNumber(rawFacilityRateAfterHours);
  const watchedFacilityRateMileage = toSafeNumber(rawFacilityRateMileage);
  const watchedInterpreterRateBusiness = toSafeNumber(rawInterpreterRateBusiness);
  const watchedInterpreterRateAfterHours = toSafeNumber(rawInterpreterRateAfterHours);
  const watchedInterpreterRateMileage = toSafeNumber(rawInterpreterRateMileage);
  const watchedFacilityRateAdjustment = toSafeNumber(rawFacilityRateAdjustment);
  const watchedInterpreterRateAdjustment = toSafeNumber(rawInterpreterRateAdjustment);

  // Calculate billable totals
  const billableTotal = useMemo(() => {
    if (!hoursSplit) return null;
    
    // Use watched values if set, otherwise fall back to facility/interpreter defaults
    const facilityBusinessRate = hasValue(rawFacilityRateBusiness) 
      ? watchedFacilityRateBusiness 
      : (selectedFacility?.rate_business_hours ?? 0);
    const facilityAfterHoursRate = hasValue(rawFacilityRateAfterHours)
      ? watchedFacilityRateAfterHours 
      : (selectedFacility?.rate_after_hours ?? 0);
    const facilityMileageRate = hasValue(rawFacilityRateMileage)
      ? watchedFacilityRateMileage 
      : (selectedFacility?.rate_mileage ?? 0);
    const interpreterBusinessRate = hasValue(rawInterpreterRateBusiness)
      ? watchedInterpreterRateBusiness 
      : (selectedInterpreter?.rate_business_hours ?? 0);
    const interpreterAfterHoursRate = hasValue(rawInterpreterRateAfterHours)
      ? watchedInterpreterRateAfterHours 
      : (selectedInterpreter?.rate_after_hours ?? 0);
    const interpreterMileageRate = hasValue(rawInterpreterRateMileage)
      ? watchedInterpreterRateMileage 
      : (selectedInterpreter?.rate_mileage ?? 0);
    
    // Apply rate adjustments to hourly rates (added before multiplying by hours)
    const adjustedFacilityBusinessRate = facilityBusinessRate + watchedFacilityRateAdjustment;
    const adjustedFacilityAfterHoursRate = facilityAfterHoursRate + watchedFacilityRateAdjustment;
    const adjustedInterpreterBusinessRate = interpreterBusinessRate + watchedInterpreterRateAdjustment;
    const adjustedInterpreterAfterHoursRate = interpreterAfterHoursRate + watchedInterpreterRateAdjustment;
    
    // Determine travel time rate based on which hour type has more hours (use adjusted rate)
    const interpreterTravelTimeRate = hoursSplit.businessHours >= hoursSplit.afterHours 
      ? adjustedInterpreterBusinessRate 
      : adjustedInterpreterAfterHoursRate;
    
    // Facility calculations with adjusted rates
    const facilityBusinessTotal = hoursSplit.businessHours * adjustedFacilityBusinessRate;
    const facilityAfterHoursTotal = hoursSplit.afterHours * adjustedFacilityAfterHoursRate;
    const facilityMileageTotal = watchedMileage * facilityMileageRate;
    const facilityFeesTotal = watchedParking + watchedTolls + watchedMiscFee;
    
    // Interpreter calculations with adjusted rates
    const interpreterBusinessTotal = hoursSplit.businessHours * adjustedInterpreterBusinessRate;
    const interpreterAfterHoursTotal = hoursSplit.afterHours * adjustedInterpreterAfterHoursRate;
    const interpreterMileageTotal = watchedMileage * interpreterMileageRate;
    const interpreterTravelTimeTotal = watchedTravelTime * interpreterTravelTimeRate;
    const interpreterFeesTotal = watchedParking + watchedTolls + watchedMiscFee;
    
    return {
      facilityBusinessTotal,
      facilityAfterHoursTotal,
      facilityMileageTotal,
      facilityMileageRate,
      facilityFeesTotal,
      facilityTotal: facilityBusinessTotal + facilityAfterHoursTotal + facilityMileageTotal + facilityFeesTotal,
      facilityBusinessRate: adjustedFacilityBusinessRate,
      facilityAfterHoursRate: adjustedFacilityAfterHoursRate,
      facilityRateAdjustment: watchedFacilityRateAdjustment,
      interpreterBusinessTotal,
      interpreterAfterHoursTotal,
      interpreterMileageTotal,
      interpreterMileageRate,
      interpreterTravelTimeTotal,
      interpreterTravelTimeRate,
      interpreterFeesTotal,
      interpreterTotal: interpreterBusinessTotal + interpreterAfterHoursTotal + interpreterMileageTotal + interpreterTravelTimeTotal + interpreterFeesTotal,
      interpreterBusinessRate: adjustedInterpreterBusinessRate,
      interpreterAfterHoursRate: adjustedInterpreterAfterHoursRate,
      interpreterRateAdjustment: watchedInterpreterRateAdjustment,
      mileage: watchedMileage,
      travelTimeHours: watchedTravelTime,
      parking: watchedParking,
      tolls: watchedTolls,
      miscFee: watchedMiscFee,
    };
  }, [hoursSplit, selectedFacility, selectedInterpreter, watchedMileage, watchedTravelTime, watchedParking, watchedTolls, watchedMiscFee, rawFacilityRateBusiness, rawFacilityRateAfterHours, rawFacilityRateMileage, rawInterpreterRateBusiness, rawInterpreterRateAfterHours, rawInterpreterRateMileage, watchedFacilityRateBusiness, watchedFacilityRateAfterHours, watchedFacilityRateMileage, watchedInterpreterRateBusiness, watchedInterpreterRateAfterHours, watchedInterpreterRateMileage, watchedFacilityRateAdjustment, watchedInterpreterRateAdjustment]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedJobId) return;
      
      // Calculate hourly and billable totals
      let facilityHourlyTotal: number | null = null;
      let facilityBillableTotal: number | null = null;
      let interpreterHourlyTotal: number | null = null;
      let interpreterBillableTotal: number | null = null;
      
      if (hoursSplit) {
        const facilityBusinessRate = data.facility_rate_business ?? selectedFacility?.rate_business_hours ?? 0;
        const facilityAfterHoursRate = data.facility_rate_after_hours ?? selectedFacility?.rate_after_hours ?? 0;
        const facilityMileageRate = data.facility_rate_mileage ?? selectedFacility?.rate_mileage ?? 0;
        const interpreterBusinessRate = data.interpreter_rate_business ?? selectedInterpreter?.rate_business_hours ?? 0;
        const interpreterAfterHoursRate = data.interpreter_rate_after_hours ?? selectedInterpreter?.rate_after_hours ?? 0;
        const interpreterMileageRate = data.interpreter_rate_mileage ?? selectedInterpreter?.rate_mileage ?? 0;
        
        // Get rate adjustments
        const facilityRateAdjustment = data.facility_rate_adjustment ?? 0;
        const interpreterRateAdjustment = data.interpreter_rate_adjustment ?? 0;
        
        const mileage = data.mileage ?? 0;
        const travelTimeHours = data.travel_time_hours ?? 0;
        const parking = data.parking ?? 0;
        const tolls = data.tolls ?? 0;
        const miscFee = data.misc_fee ?? 0;
        
        // Get trilingual uplift from existing job data
        const trilingualUplift = job?.trilingual_rate_uplift ?? 0;
        
        // Facility calculations - add trilingual uplift and rate adjustment to hourly rates before multiplying
        const adjustedFacilityBusinessRate = facilityBusinessRate + trilingualUplift + facilityRateAdjustment;
        const adjustedFacilityAfterHoursRate = facilityAfterHoursRate + trilingualUplift + facilityRateAdjustment;
        const facilityBusinessTotal = hoursSplit.businessHours * adjustedFacilityBusinessRate;
        const facilityAfterHoursTotal = hoursSplit.afterHours * adjustedFacilityAfterHoursRate;
        facilityHourlyTotal = facilityBusinessTotal + facilityAfterHoursTotal;
        const facilityMileageTotal = mileage * facilityMileageRate;
        const facilityFeesTotal = parking + tolls + miscFee;
        facilityBillableTotal = facilityHourlyTotal + facilityMileageTotal + facilityFeesTotal;
        
        // Interpreter calculations - add rate adjustment to hourly rates before multiplying
        const adjustedInterpreterBusinessRate = interpreterBusinessRate + interpreterRateAdjustment;
        const adjustedInterpreterAfterHoursRate = interpreterAfterHoursRate + interpreterRateAdjustment;
        const interpreterBusinessTotal = hoursSplit.businessHours * adjustedInterpreterBusinessRate;
        const interpreterAfterHoursTotal = hoursSplit.afterHours * adjustedInterpreterAfterHoursRate;
        interpreterHourlyTotal = interpreterBusinessTotal + interpreterAfterHoursTotal;
        const interpreterMileageTotal = mileage * interpreterMileageRate;
        const interpreterTravelTimeRate = hoursSplit.businessHours >= hoursSplit.afterHours 
          ? adjustedInterpreterBusinessRate 
          : adjustedInterpreterAfterHoursRate;
        const interpreterTravelTimeTotal = travelTimeHours * interpreterTravelTimeRate;
        const interpreterFeesTotal = parking + tolls + miscFee;
        interpreterBillableTotal = interpreterHourlyTotal + interpreterMileageTotal + interpreterTravelTimeTotal + interpreterFeesTotal;
      }
      
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
        billable_hours: data.billable_hours || null,
        mileage: data.mileage || null,
        parking: data.parking || null,
        tolls: data.tolls || null,
        misc_fee: data.misc_fee || null,
        travel_time_hours: data.travel_time_hours || null,
        facility_rate_business: data.facility_rate_business || null,
        facility_rate_after_hours: data.facility_rate_after_hours || null,
        facility_rate_mileage: data.facility_rate_mileage || null,
        facility_rate_adjustment: data.facility_rate_adjustment ?? 0,
        interpreter_rate_business: data.interpreter_rate_business || null,
        interpreter_rate_after_hours: data.interpreter_rate_after_hours || null,
        interpreter_rate_mileage: data.interpreter_rate_mileage || null,
        interpreter_rate_adjustment: data.interpreter_rate_adjustment ?? 0,
        emergency_fee_applied: data.emergency_fee_applied || false,
        holiday_fee_applied: data.holiday_fee_applied || false,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        potential_interpreter_ids: data.potential_interpreter_ids || [],
        facility_hourly_total: facilityHourlyTotal,
        facility_billable_total: facilityBillableTotal,
        interpreter_hourly_total: interpreterHourlyTotal,
        interpreter_billable_total: interpreterBillableTotal,
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
      form.reset(form.getValues());
      toast({ title: 'Job updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error updating job', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const sendOutreachMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId) throw new Error('No job selected');
      
      // Get current form values to save before updating status
      const data = form.getValues();
      
      // Build the same payload as the main mutation, but with status set to outreach_in_progress
      let facilityHourlyTotal: number | null = null;
      let facilityBillableTotal: number | null = null;
      let interpreterHourlyTotal: number | null = null;
      let interpreterBillableTotal: number | null = null;
      
      if (hoursSplit) {
        const facilityBusinessRate = data.facility_rate_business ?? selectedFacility?.rate_business_hours ?? 0;
        const facilityAfterHoursRate = data.facility_rate_after_hours ?? selectedFacility?.rate_after_hours ?? 0;
        const facilityMileageRate = data.facility_rate_mileage ?? selectedFacility?.rate_mileage ?? 0;
        const interpreterBusinessRate = data.interpreter_rate_business ?? selectedInterpreter?.rate_business_hours ?? 0;
        const interpreterAfterHoursRate = data.interpreter_rate_after_hours ?? selectedInterpreter?.rate_after_hours ?? 0;
        const interpreterMileageRate = data.interpreter_rate_mileage ?? selectedInterpreter?.rate_mileage ?? 0;
        
        // Get rate adjustments
        const facilityRateAdjustment = data.facility_rate_adjustment ?? 0;
        const interpreterRateAdjustment = data.interpreter_rate_adjustment ?? 0;
        
        const mileage = data.mileage ?? 0;
        const travelTimeHours = data.travel_time_hours ?? 0;
        const parking = data.parking ?? 0;
        const tolls = data.tolls ?? 0;
        const miscFee = data.misc_fee ?? 0;
        
        const trilingualUplift = job?.trilingual_rate_uplift ?? 0;
        
        // Facility calculations with rate adjustment
        const adjustedFacilityBusinessRate = facilityBusinessRate + trilingualUplift + facilityRateAdjustment;
        const adjustedFacilityAfterHoursRate = facilityAfterHoursRate + trilingualUplift + facilityRateAdjustment;
        const facilityBusinessTotal = hoursSplit.businessHours * adjustedFacilityBusinessRate;
        const facilityAfterHoursTotal = hoursSplit.afterHours * adjustedFacilityAfterHoursRate;
        facilityHourlyTotal = facilityBusinessTotal + facilityAfterHoursTotal;
        const facilityMileageTotal = mileage * facilityMileageRate;
        const facilityFeesTotal = parking + tolls + miscFee;
        facilityBillableTotal = facilityHourlyTotal + facilityMileageTotal + facilityFeesTotal;
        
        // Interpreter calculations with rate adjustment
        const adjustedInterpreterBusinessRate = interpreterBusinessRate + interpreterRateAdjustment;
        const adjustedInterpreterAfterHoursRate = interpreterAfterHoursRate + interpreterRateAdjustment;
        const interpreterBusinessTotal = hoursSplit.businessHours * adjustedInterpreterBusinessRate;
        const interpreterAfterHoursTotal = hoursSplit.afterHours * adjustedInterpreterAfterHoursRate;
        interpreterHourlyTotal = interpreterBusinessTotal + interpreterAfterHoursTotal;
        const interpreterMileageTotal = mileage * interpreterMileageRate;
        const interpreterTravelTimeRate = hoursSplit.businessHours >= hoursSplit.afterHours 
          ? adjustedInterpreterBusinessRate 
          : adjustedInterpreterAfterHoursRate;
        const interpreterTravelTimeTotal = travelTimeHours * interpreterTravelTimeRate;
        const interpreterFeesTotal = parking + tolls + miscFee;
        interpreterBillableTotal = interpreterHourlyTotal + interpreterMileageTotal + interpreterTravelTimeTotal + interpreterFeesTotal;
      }
      
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
        status: 'outreach_in_progress',
        opportunity_source: data.opportunity_source || null,
        billable_hours: data.billable_hours || null,
        mileage: data.mileage || null,
        parking: data.parking || null,
        tolls: data.tolls || null,
        misc_fee: data.misc_fee || null,
        travel_time_hours: data.travel_time_hours || null,
        facility_rate_business: data.facility_rate_business || null,
        facility_rate_after_hours: data.facility_rate_after_hours || null,
        facility_rate_mileage: data.facility_rate_mileage || null,
        facility_rate_adjustment: data.facility_rate_adjustment ?? 0,
        interpreter_rate_business: data.interpreter_rate_business || null,
        interpreter_rate_after_hours: data.interpreter_rate_after_hours || null,
        interpreter_rate_mileage: data.interpreter_rate_mileage || null,
        interpreter_rate_adjustment: data.interpreter_rate_adjustment ?? 0,
        emergency_fee_applied: data.emergency_fee_applied || false,
        holiday_fee_applied: data.holiday_fee_applied || false,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        potential_interpreter_ids: data.potential_interpreter_ids || [],
        facility_hourly_total: facilityHourlyTotal,
        facility_billable_total: facilityBillableTotal,
        interpreter_hourly_total: interpreterHourlyTotal,
        interpreter_billable_total: interpreterBillableTotal,
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
      const currentValues = form.getValues();
      form.reset({ ...currentValues, status: 'outreach_in_progress' as const });
      toast({
        title: 'Outreach Started',
        description: 'Job saved and status updated to Outreach In Progress. Email functionality coming soon.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save and update status',
        variant: 'destructive',
      });
    },
  });

  const canSendOutreach = watchedStatus === 'new' && watchedPotentialInterpreterIds.length > 0;

  const canConfirmInterpreter = watchedStatus === 'outreach_in_progress' && !!watchedInterpreterId;

  const canGenerateBilling = watchedStatus === 'complete' && !!watchedInterpreterId;

  const generateBillingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId || !job) throw new Error('No job selected');
      
      // Get current form values to save before generating billing
      const data = form.getValues();
      const interpreterId = data.interpreter_id;
      if (!interpreterId) throw new Error('No interpreter assigned to job');
      
      // Calculate totals using hoursSplit like other mutations
      let facilityHourlyTotal: number | null = null;
      let facilityBillableTotal: number | null = null;
      let interpreterHourlyTotal: number | null = null;
      let interpreterBillableTotal: number | null = null;
      
      if (hoursSplit) {
        const facilityBusinessRate = data.facility_rate_business ?? selectedFacility?.rate_business_hours ?? 0;
        const facilityAfterHoursRate = data.facility_rate_after_hours ?? selectedFacility?.rate_after_hours ?? 0;
        const facilityMileageRate = data.facility_rate_mileage ?? selectedFacility?.rate_mileage ?? 0;
        const interpreterBusinessRate = data.interpreter_rate_business ?? selectedInterpreter?.rate_business_hours ?? 0;
        const interpreterAfterHoursRate = data.interpreter_rate_after_hours ?? selectedInterpreter?.rate_after_hours ?? 0;
        const interpreterMileageRate = data.interpreter_rate_mileage ?? selectedInterpreter?.rate_mileage ?? 0;
        
        const facilityRateAdjustment = data.facility_rate_adjustment ?? 0;
        const interpreterRateAdjustment = data.interpreter_rate_adjustment ?? 0;
        
        const mileage = data.mileage ?? 0;
        const travelTimeHours = data.travel_time_hours ?? 0;
        const parking = data.parking ?? 0;
        const tolls = data.tolls ?? 0;
        const miscFee = data.misc_fee ?? 0;
        
        const trilingualUplift = job?.trilingual_rate_uplift ?? 0;
        
        const adjustedFacilityBusinessRate = facilityBusinessRate + trilingualUplift + facilityRateAdjustment;
        const adjustedFacilityAfterHoursRate = facilityAfterHoursRate + trilingualUplift + facilityRateAdjustment;
        const facilityBusinessTotal = hoursSplit.businessHours * adjustedFacilityBusinessRate;
        const facilityAfterHoursTotal = hoursSplit.afterHours * adjustedFacilityAfterHoursRate;
        facilityHourlyTotal = facilityBusinessTotal + facilityAfterHoursTotal;
        const facilityMileageTotal = mileage * facilityMileageRate;
        const facilityFeesTotal = parking + tolls + miscFee;
        facilityBillableTotal = facilityHourlyTotal + facilityMileageTotal + facilityFeesTotal;
        
        const adjustedInterpreterBusinessRate = interpreterBusinessRate + interpreterRateAdjustment;
        const adjustedInterpreterAfterHoursRate = interpreterAfterHoursRate + interpreterRateAdjustment;
        const interpreterBusinessTotal = hoursSplit.businessHours * adjustedInterpreterBusinessRate;
        const interpreterAfterHoursTotal = hoursSplit.afterHours * adjustedInterpreterAfterHoursRate;
        interpreterHourlyTotal = interpreterBusinessTotal + interpreterAfterHoursTotal;
        const interpreterMileageTotal = mileage * interpreterMileageRate;
        const interpreterTravelTimeRate = hoursSplit.businessHours >= hoursSplit.afterHours 
          ? adjustedInterpreterBusinessRate 
          : adjustedInterpreterAfterHoursRate;
        const interpreterTravelTimeTotal = travelTimeHours * interpreterTravelTimeRate;
        const interpreterFeesTotal = parking + tolls + miscFee;
        interpreterBillableTotal = interpreterHourlyTotal + interpreterMileageTotal + interpreterTravelTimeTotal + interpreterFeesTotal;
      }
      
      // Build payload to save form data with status update
      const payload: Record<string, unknown> = {
        facility_id: data.facility_id,
        interpreter_id: interpreterId,
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
        status: 'ready_to_bill',
        opportunity_source: data.opportunity_source || null,
        billable_hours: data.billable_hours || null,
        mileage: data.mileage || null,
        parking: data.parking || null,
        tolls: data.tolls || null,
        misc_fee: data.misc_fee || null,
        travel_time_hours: data.travel_time_hours || null,
        facility_rate_business: data.facility_rate_business || null,
        facility_rate_after_hours: data.facility_rate_after_hours || null,
        facility_rate_mileage: data.facility_rate_mileage || null,
        facility_rate_adjustment: data.facility_rate_adjustment ?? 0,
        interpreter_rate_business: data.interpreter_rate_business || null,
        interpreter_rate_after_hours: data.interpreter_rate_after_hours || null,
        interpreter_rate_mileage: data.interpreter_rate_mileage || null,
        interpreter_rate_adjustment: data.interpreter_rate_adjustment ?? 0,
        emergency_fee_applied: data.emergency_fee_applied || false,
        holiday_fee_applied: data.holiday_fee_applied || false,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        potential_interpreter_ids: data.potential_interpreter_ids || [],
        facility_hourly_total: facilityHourlyTotal,
        facility_billable_total: facilityBillableTotal,
        interpreter_hourly_total: interpreterHourlyTotal,
        interpreter_billable_total: interpreterBillableTotal,
      };
      
      // Save form data first
      const { error: saveError } = await supabase
        .from('jobs')
        .update(payload as never)
        .eq('id', selectedJobId);
      if (saveError) throw saveError;
      
      // Generate invoice for facility
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          facility_id: data.facility_id,
          job_id: selectedJobId,
          status: 'draft',
        } as never);
      if (invoiceError) throw invoiceError;

      // Generate interpreter bill
      const { error: billError } = await supabase
        .from('interpreter_bills')
        .insert({
          interpreter_id: interpreterId,
          job_id: selectedJobId,
          status: 'queued',
        } as never);
      if (billError) throw billError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['interpreter-bills'] });
      const currentValues = form.getValues();
      form.reset({ ...currentValues, status: 'ready_to_bill' as const });
      toast({
        title: 'Billing Generated',
        description: 'Invoice and interpreter bill have been created. Job status updated to Ready to Bill.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate billing',
        variant: 'destructive',
      });
    },
  });

  const confirmInterpreterMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId) throw new Error('No job selected');
      
      const data = form.getValues();
      const interpreterId = data.interpreter_id;
      
      if (!interpreterId) throw new Error('No interpreter selected');
      
      // Find interpreter's minimum hours
      const interpreter = interpreters?.find((i) => i.id === interpreterId);
      const interpreterMinHours = interpreter?.minimum_hours ?? 2;
      const facilityMinHours = selectedFacility?.minimum_billable_hours ?? 2;
      
      // Use the higher of the two minimums
      const effectiveMinHours = Math.max(interpreterMinHours, facilityMinHours);
      
      // Recalculate billable hours with new minimum
      let newBillableHours = data.billable_hours ?? 0;
      if (hoursSplit) {
        newBillableHours = Math.max(hoursSplit.totalHours, effectiveMinHours);
      }
      
      // Build payload
      let facilityHourlyTotal: number | null = null;
      let facilityBillableTotal: number | null = null;
      let interpreterHourlyTotal: number | null = null;
      let interpreterBillableTotal: number | null = null;
      
      if (hoursSplit) {
        const facilityBusinessRate = data.facility_rate_business ?? selectedFacility?.rate_business_hours ?? 0;
        const facilityAfterHoursRate = data.facility_rate_after_hours ?? selectedFacility?.rate_after_hours ?? 0;
        const facilityMileageRate = data.facility_rate_mileage ?? selectedFacility?.rate_mileage ?? 0;
        const interpreterBusinessRate = data.interpreter_rate_business ?? selectedInterpreter?.rate_business_hours ?? 0;
        const interpreterAfterHoursRate = data.interpreter_rate_after_hours ?? selectedInterpreter?.rate_after_hours ?? 0;
        const interpreterMileageRate = data.interpreter_rate_mileage ?? selectedInterpreter?.rate_mileage ?? 0;
        
        // Get rate adjustments
        const facilityRateAdjustment = data.facility_rate_adjustment ?? 0;
        const interpreterRateAdjustment = data.interpreter_rate_adjustment ?? 0;
        
        const mileage = data.mileage ?? 0;
        const travelTimeHours = data.travel_time_hours ?? 0;
        const parking = data.parking ?? 0;
        const tolls = data.tolls ?? 0;
        const miscFee = data.misc_fee ?? 0;
        
        const trilingualUplift = job?.trilingual_rate_uplift ?? 0;
        
        // Facility calculations with rate adjustment
        const adjustedFacilityBusinessRate = facilityBusinessRate + trilingualUplift + facilityRateAdjustment;
        const adjustedFacilityAfterHoursRate = facilityAfterHoursRate + trilingualUplift + facilityRateAdjustment;
        const facilityBusinessTotal = hoursSplit.businessHours * adjustedFacilityBusinessRate;
        const facilityAfterHoursTotal = hoursSplit.afterHours * adjustedFacilityAfterHoursRate;
        facilityHourlyTotal = facilityBusinessTotal + facilityAfterHoursTotal;
        const facilityMileageTotal = mileage * facilityMileageRate;
        const facilityFeesTotal = parking + tolls + miscFee;
        facilityBillableTotal = facilityHourlyTotal + facilityMileageTotal + facilityFeesTotal;
        
        // Interpreter calculations with rate adjustment
        const adjustedInterpreterBusinessRate = interpreterBusinessRate + interpreterRateAdjustment;
        const adjustedInterpreterAfterHoursRate = interpreterAfterHoursRate + interpreterRateAdjustment;
        const interpreterBusinessTotal = hoursSplit.businessHours * adjustedInterpreterBusinessRate;
        const interpreterAfterHoursTotal = hoursSplit.afterHours * adjustedInterpreterAfterHoursRate;
        interpreterHourlyTotal = interpreterBusinessTotal + interpreterAfterHoursTotal;
        const interpreterMileageTotal = mileage * interpreterMileageRate;
        const interpreterTravelTimeRate = hoursSplit.businessHours >= hoursSplit.afterHours 
          ? adjustedInterpreterBusinessRate 
          : adjustedInterpreterAfterHoursRate;
        const interpreterTravelTimeTotal = travelTimeHours * interpreterTravelTimeRate;
        const interpreterFeesTotal = parking + tolls + miscFee;
        interpreterBillableTotal = interpreterHourlyTotal + interpreterMileageTotal + interpreterTravelTimeTotal + interpreterFeesTotal;
      }
      
      const payload: Record<string, unknown> = {
        facility_id: data.facility_id,
        interpreter_id: interpreterId,
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
        status: 'confirmed',
        opportunity_source: data.opportunity_source || null,
        billable_hours: newBillableHours,
        mileage: data.mileage || null,
        parking: data.parking || null,
        tolls: data.tolls || null,
        misc_fee: data.misc_fee || null,
        travel_time_hours: data.travel_time_hours || null,
        facility_rate_business: data.facility_rate_business || null,
        facility_rate_after_hours: data.facility_rate_after_hours || null,
        facility_rate_mileage: data.facility_rate_mileage || null,
        facility_rate_adjustment: data.facility_rate_adjustment ?? 0,
        interpreter_rate_business: data.interpreter_rate_business || null,
        interpreter_rate_after_hours: data.interpreter_rate_after_hours || null,
        interpreter_rate_mileage: data.interpreter_rate_mileage || null,
        interpreter_rate_adjustment: data.interpreter_rate_adjustment ?? 0,
        emergency_fee_applied: data.emergency_fee_applied || false,
        holiday_fee_applied: data.holiday_fee_applied || false,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        potential_interpreter_ids: data.potential_interpreter_ids || [],
        facility_hourly_total: facilityHourlyTotal,
        facility_billable_total: facilityBillableTotal,
        interpreter_hourly_total: interpreterHourlyTotal,
        interpreter_billable_total: interpreterBillableTotal,
      };
      
      const { error } = await supabase
        .from('jobs')
        .update(payload as never)
        .eq('id', selectedJobId);
      if (error) throw error;
      
      return newBillableHours;
    },
    onSuccess: (newBillableHours) => {
      queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      const currentValues = form.getValues();
      form.reset({ ...currentValues, status: 'confirmed' as const, billable_hours: newBillableHours });
      toast({
        title: 'Interpreter Confirmed',
        description: 'Job saved and status updated to Confirmed. Confirmation email functionality coming soon.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save and update status',
        variant: 'destructive',
      });
    },
  });

  // Handle rate dialog saves
  const handleFacilityRatesSave = (values: Record<string, number>) => {
    form.setValue('facility_rate_business', values.facility_rate_business);
    form.setValue('facility_rate_after_hours', values.facility_rate_after_hours);
    form.setValue('facility_rate_mileage', values.facility_rate_mileage);
  };

  const handleInterpreterRatesSave = (values: Record<string, number>) => {
    form.setValue('interpreter_rate_business', values.interpreter_rate_business);
    form.setValue('interpreter_rate_after_hours', values.interpreter_rate_after_hours);
    form.setValue('interpreter_rate_mileage', values.interpreter_rate_mileage);
  };

  const handleClientContactSave = (values: Record<string, string>) => {
    form.setValue('client_business_name', values.client_business_name);
    form.setValue('client_contact_name', values.client_contact_name);
    form.setValue('client_contact_phone', values.client_contact_phone);
    form.setValue('client_contact_email', values.client_contact_email);
  };

  // Prepare rate fields for dialogs
  const facilityRateFields: RateField[] = [
    { key: 'facility_rate_business', label: 'Business ($/hr)', value: watchedFacilityRateBusiness, suffix: '/hr' },
    { key: 'facility_rate_after_hours', label: 'After Hours ($/hr)', value: watchedFacilityRateAfterHours, suffix: '/hr' },
    { key: 'facility_rate_mileage', label: 'Mileage ($/mi)', value: watchedFacilityRateMileage, suffix: '/mi' },
  ];

  const interpreterRateFields: RateField[] = [
    { key: 'interpreter_rate_business', label: 'Business ($/hr)', value: watchedInterpreterRateBusiness, suffix: '/hr' },
    { key: 'interpreter_rate_after_hours', label: 'After Hours ($/hr)', value: watchedInterpreterRateAfterHours, suffix: '/hr' },
    { key: 'interpreter_rate_mileage', label: 'Mileage ($/mi)', value: watchedInterpreterRateMileage, suffix: '/mi' },
  ];


  // Watch client contact fields for chips display
  const watchedClientBusinessName = form.watch('client_business_name') || '';
  const watchedClientContactName = form.watch('client_contact_name') || '';
  const watchedClientContactPhone = form.watch('client_contact_phone') || '';
  const watchedClientContactEmail = form.watch('client_contact_email') || '';

  const clientContactFields: ContactField[] = [
    { key: 'client_business_name', label: 'Business Name', value: watchedClientBusinessName },
    { key: 'client_contact_name', label: 'Contact Name', value: watchedClientContactName },
    { key: 'client_contact_phone', label: 'Phone', value: watchedClientContactPhone },
    { key: 'client_contact_email', label: 'Email', value: watchedClientContactEmail, type: 'email' },
  ];

  return (
    <div className="space-y-4">
      {/* Sticky Header with Job Selector and Save Button - positioned below app header (h-14 = 56px) */}
      <div className="sticky top-14 z-10 bg-background py-3 border-b -mx-6 px-6 -mt-6 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {job ? `Job #${job.job_number}` : 'Job Details'}
          </h1>
          
          {/* Compact Job Selector */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[180px] justify-between text-sm"
              >
                {selectedJob
                  ? `${selectedJob.job_number} - ${format(new Date(selectedJob.job_date), 'M/d')}`
                  : 'Select job...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
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

          {job?.status && (
            <Badge variant="secondary">{statusLabels[job.status]}</Badge>
          )}

          {/* Save and Delete buttons in header */}
          {job && (
            <div className="ml-auto flex items-center gap-2">
              {form.formState.isDirty && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Unsaved
                </span>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" disabled={isLocked}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Job</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete Job #{job.job_number}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const { error } = await supabase.from('jobs').delete().eq('id', job.id);
                        if (error) {
                          toast({ title: 'Error deleting job', description: error.message, variant: 'destructive' });
                        } else {
                          toast({ title: 'Job deleted successfully' });
                          navigate('/jobs');
                        }
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                type="submit" 
                form="job-detail-form"
                disabled={isLocked || mutation.isPending}
              >
                {mutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {jobLoading && <p className="text-muted-foreground">Loading job...</p>}

      {job && (
        <Form {...form}>
          <form id="job-detail-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Job Info Card - Consolidated */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Job Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Row 1: Date, Start, End */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="job_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={isLocked} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} disabled={isLocked} />
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
                          <Input type="time" {...field} disabled={isLocked} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 2: Facility & Deaf Client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <FormField
                    control={form.control}
                    name="facility_id"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Facility</FormLabel>
                        <Popover open={facilityOpen} onOpenChange={setFacilityOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                disabled={isLocked}
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
                                      {facility.contractor && (
                                        <Badge variant="outline" className="ml-2 text-xs">Contractor</Badge>
                                      )}
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
                    name="deaf_client_name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Deaf Client Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isLocked} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 3: Potential Interpreters */}
                <FormField
                  control={form.control}
                  name="potential_interpreter_ids"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Potential Interpreters</FormLabel>
                      <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                        <Popover open={potentialInterpretersOpen} onOpenChange={setPotentialInterpretersOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn('w-full justify-between h-auto min-h-10', selectedPotentialInterpreters.length === 0 && 'text-muted-foreground')}
                                disabled={isLocked}
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
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 whitespace-nowrap"
                              disabled={isLocked || !canSendOutreach || sendOutreachMutation.isPending}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              {sendOutreachMutation.isPending ? 'Sending...' : 'Send Outreach'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Send Outreach Email?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will send an email to {watchedPotentialInterpreterIds.length} potential interpreter{watchedPotentialInterpreterIds.length !== 1 ? 's' : ''} and change the job status to "Outreach In Progress".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => sendOutreachMutation.mutate()}>
                                Send Email
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Row 4: Selected Interpreter with Confirm */}
                <FormField
                  control={form.control}
                  name="interpreter_id"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Selected Interpreter</FormLabel>
                      <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                        <Popover open={interpreterOpen} onOpenChange={setInterpreterOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn('w-full justify-between h-10', !field.value && 'text-muted-foreground')}
                                disabled={isLocked}
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
                                <CommandEmpty>No interpreter found.</CommandEmpty>
                                <CommandGroup>
                                  {interpreters
                                    ?.filter((interpreter) => watchedPotentialInterpreterIds?.includes(interpreter.id))
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
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 whitespace-nowrap"
                              disabled={isLocked || !canConfirmInterpreter || confirmInterpreterMutation.isPending}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              {confirmInterpreterMutation.isPending ? 'Confirming...' : 'Confirm Interpreter'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm Interpreter?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will assign {selectedInterpreter ? `${selectedInterpreter.first_name} ${selectedInterpreter.last_name}` : 'the interpreter'} to this job, save all changes, and update the job status to "Confirmed".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => confirmInterpreterMutation.mutate()}>
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Location & Client Card - Merged */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Location & Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location Type */}
                <FormField
                  control={form.control}
                  name="location_type"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Location Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLocked}>
                        <FormControl>
                          <SelectTrigger className="w-[160px]" disabled={isLocked}>
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

                {/* Address Fields or Video Link */}
                {watchedLocationType === 'in_person' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="location_address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2 space-y-2">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isLocked} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location_city"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isLocked} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="location_state"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={isLocked} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location_zip"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel>Zip</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={isLocked} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="video_call_link"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Video Call Link</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} disabled={isLocked} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <Separator />

                {/* Client Info as Chips */}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Client Contact</h4>
                  <div className="flex flex-wrap gap-2 items-center">
                    {watchedClientBusinessName && (
                      <Badge variant="outline" className="font-normal">
                        {watchedClientBusinessName}
                      </Badge>
                    )}
                    {watchedClientContactName && (
                      <Badge variant="outline" className="font-normal">
                        {watchedClientContactName}
                      </Badge>
                    )}
                    {watchedClientContactPhone && (
                      <Badge variant="outline" className="font-normal">
                        {watchedClientContactPhone}
                      </Badge>
                    )}
                    {watchedClientContactEmail && (
                      <Badge variant="outline" className="font-normal">
                        {watchedClientContactEmail}
                      </Badge>
                    )}
                    {!watchedClientBusinessName && !watchedClientContactName && !watchedClientContactPhone && !watchedClientContactEmail && (
                      <span className="text-sm text-muted-foreground">No contact info set</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setClientContactDialogOpen(true)}
                      disabled={isLocked}
                      className="h-7 px-2"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Summary Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Billing</CardTitle>
                  <div className="flex items-center gap-2">
                    {jobInvoice && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/invoices/${jobInvoice.id}`)}
                      >
                        View Invoice
                      </Button>
                    )}
                    {jobBill && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/payables/${jobBill.id}`)}
                      >
                        View Bill
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isLocked || !canGenerateBilling || generateBillingMutation.isPending}
                        >
                          {generateBillingMutation.isPending ? 'Generating...' : 'Generate Invoice & Bill'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Generate Invoice & Interpreter Bill?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will create a new invoice for the facility and a new bill for {selectedInterpreter ? `${selectedInterpreter.first_name} ${selectedInterpreter.last_name}` : 'the interpreter'}. The job status will be changed to "Ready to Bill".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => generateBillingMutation.mutate()}>
                            Generate
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Facility Rates Chips */}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Facility Rates</h4>
                  <RateChips
                    rates={[
                      { label: 'Business', value: watchedFacilityRateBusiness, suffix: '/hr' },
                      { label: 'After Hours', value: watchedFacilityRateAfterHours, suffix: '/hr' },
                      { label: 'Mileage', value: watchedFacilityRateMileage, suffix: '/mi' },
                    ]}
                    onEditClick={() => setFacilityRatesDialogOpen(true)}
                    disabled={isLocked}
                  />
                </div>

                {/* Interpreter Rates Chips */}
                {selectedInterpreter && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">Interpreter Rates</h4>
                    <RateChips
                      rates={[
                        { label: 'Business', value: watchedInterpreterRateBusiness, suffix: '/hr' },
                        { label: 'After Hours', value: watchedInterpreterRateAfterHours, suffix: '/hr' },
                        { label: 'Mileage', value: watchedInterpreterRateMileage, suffix: '/mi' },
                      ]}
                      onEditClick={() => setInterpreterRatesDialogOpen(true)}
                      disabled={isLocked}
                    />
                  </div>
                )}

                {/* Expenses Inline */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Expenses</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="mileage" className="text-xs">Mileage (mi)</Label>
                      <Input
                        id="mileage"
                        type="text"
                        inputMode="decimal"
                        {...form.register('mileage', {
                          setValueAs: (v) => {
                            if (v === '' || v === '-' || v === '-.') return v;
                            const num = parseFloat(v);
                            return isNaN(num) ? 0 : num;
                          }
                        })}
                        disabled={isLocked}
                        placeholder="0"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="travel_time_hours" className="text-xs">Travel Time (hrs)</Label>
                      <Input
                        id="travel_time_hours"
                        type="text"
                        inputMode="decimal"
                        {...form.register('travel_time_hours', {
                          setValueAs: (v) => {
                            if (v === '' || v === '-' || v === '-.') return v;
                            const num = parseFloat(v);
                            return isNaN(num) ? 0 : num;
                          }
                        })}
                        disabled={isLocked}
                        placeholder="0"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="parking" className="text-xs">Parking ($)</Label>
                      <Input
                        id="parking"
                        type="text"
                        inputMode="decimal"
                        {...form.register('parking', {
                          setValueAs: (v) => {
                            if (v === '' || v === '-' || v === '-.') return v;
                            const num = parseFloat(v);
                            return isNaN(num) ? 0 : num;
                          }
                        })}
                        disabled={isLocked}
                        placeholder="0.00"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="tolls" className="text-xs">Tolls ($)</Label>
                      <Input
                        id="tolls"
                        type="text"
                        inputMode="decimal"
                        {...form.register('tolls', {
                          setValueAs: (v) => {
                            if (v === '' || v === '-' || v === '-.') return v;
                            const num = parseFloat(v);
                            return isNaN(num) ? 0 : num;
                          }
                        })}
                        disabled={isLocked}
                        placeholder="0.00"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="misc_fee" className="text-xs">Misc Fee ($)</Label>
                      <Input
                        id="misc_fee"
                        type="text"
                        inputMode="decimal"
                        {...form.register('misc_fee', {
                          setValueAs: (v) => {
                            if (v === '' || v === '-' || v === '-.') return v;
                            const num = parseFloat(v);
                            return isNaN(num) ? 0 : num;
                          }
                        })}
                        disabled={isLocked}
                        placeholder="0.00"
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Rate Adjustments Inline */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Rate Adjustments</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="facility_rate_adjustment" className="text-xs">Facility ($/hr)</Label>
                      <Input
                        id="facility_rate_adjustment"
                        type="text"
                        inputMode="decimal"
                        {...form.register('facility_rate_adjustment', {
                          setValueAs: (v) => {
                            if (v === '' || v === '-' || v === '-.') return v;
                            const num = parseFloat(v);
                            return isNaN(num) ? 0 : num;
                          }
                        })}
                        disabled={isLocked}
                        placeholder="0.00"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="interpreter_rate_adjustment" className="text-xs">Interpreter ($/hr)</Label>
                      <Input
                        id="interpreter_rate_adjustment"
                        type="text"
                        inputMode="decimal"
                        {...form.register('interpreter_rate_adjustment', {
                          setValueAs: (v) => {
                            if (v === '' || v === '-' || v === '-.') return v;
                            const num = parseFloat(v);
                            return isNaN(num) ? 0 : num;
                          }
                        })}
                        disabled={isLocked}
                        placeholder="0.00"
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Billable Calculation */}
                {hoursSplit && billableTotal && (
                  <>
                    <Separator />
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="ml-1 font-medium">{hoursSplit.totalHours.toFixed(2)} hrs</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Billable:</span>
                          <span className="ml-1 font-medium">{hoursSplit.billableHours.toFixed(2)} hrs</span>
                          {hoursSplit.minimumApplied > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">(min)</span>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Business:</span>
                          <span className="ml-1 font-medium">{hoursSplit.businessHours.toFixed(2)} hrs</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">After Hours:</span>
                          <span className="ml-1 font-medium">{hoursSplit.afterHours.toFixed(2)} hrs</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                        {/* Facility Totals */}
                        <div className="space-y-1">
                          <h5 className="text-sm font-medium">Facility Charge</h5>
                          <div className="text-sm space-y-0.5">
                            <div className="flex justify-between">
                              <span>Business:</span>
                              <span>${billableTotal.facilityBusinessTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>After Hours:</span>
                              <span>${billableTotal.facilityAfterHoursTotal.toFixed(2)}</span>
                            </div>
                            {billableTotal.mileage > 0 && (
                              <div className="flex justify-between">
                                <span>Mileage:</span>
                                <span>${billableTotal.facilityMileageTotal.toFixed(2)}</span>
                              </div>
                            )}
                            {billableTotal.facilityFeesTotal > 0 && (
                              <div className="flex justify-between">
                                <span>Fees:</span>
                                <span>${billableTotal.facilityFeesTotal.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t pt-1 font-semibold">
                              <span>Total:</span>
                              <span>${billableTotal.facilityTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Interpreter Totals */}
                        <div className="space-y-1">
                          <h5 className="text-sm font-medium">Interpreter Pay</h5>
                          <div className="text-sm space-y-0.5">
                            <div className="flex justify-between">
                              <span>Business:</span>
                              <span>${billableTotal.interpreterBusinessTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>After Hours:</span>
                              <span>${billableTotal.interpreterAfterHoursTotal.toFixed(2)}</span>
                            </div>
                            {billableTotal.mileage > 0 && (
                              <div className="flex justify-between">
                                <span>Mileage:</span>
                                <span>${billableTotal.interpreterMileageTotal.toFixed(2)}</span>
                              </div>
                            )}
                            {billableTotal.travelTimeHours > 0 && (
                              <div className="flex justify-between">
                                <span>Travel Time:</span>
                                <span>${billableTotal.interpreterTravelTimeTotal.toFixed(2)}</span>
                              </div>
                            )}
                            {billableTotal.interpreterFeesTotal > 0 && (
                              <div className="flex justify-between">
                                <span>Fees:</span>
                                <span>${billableTotal.interpreterFeesTotal.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t pt-1 font-semibold">
                              <span>Total:</span>
                              <span>${billableTotal.interpreterTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notes Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="internal_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea placeholder="Internal notes..." className="min-h-[80px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

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

      {/* Rate Edit Dialogs */}
      <RatesEditDialog
        open={facilityRatesDialogOpen}
        onOpenChange={setFacilityRatesDialogOpen}
        title="Edit Facility Rates"
        fields={facilityRateFields}
        onSave={handleFacilityRatesSave}
        disabled={isLocked}
      />
      
      <RatesEditDialog
        open={interpreterRatesDialogOpen}
        onOpenChange={setInterpreterRatesDialogOpen}
        title="Edit Interpreter Rates"
        fields={interpreterRateFields}
        onSave={handleInterpreterRatesSave}
        disabled={isLocked}
      />
      
      
      
      <ContactEditDialog
        open={clientContactDialogOpen}
        onOpenChange={setClientContactDialogOpen}
        title="Edit Client Contact"
        fields={clientContactFields}
        onSave={handleClientContactSave}
        disabled={isLocked}
      />

      {/* Unsaved changes navigation blocker dialog */}
      <AlertDialog open={blocker.state === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              Stay on Page
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>
              Leave Page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
