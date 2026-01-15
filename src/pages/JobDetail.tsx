import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Form } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { RecordPageLayout, RecordOption } from '@/components/layout/RecordPageLayout';
import { RatesEditDialog, RateField } from '@/components/jobs/RatesEditDialog';
import { ContactEditDialog, ContactField } from '@/components/jobs/ContactEditDialog';
import { EmailPreviewDialog, EmailPreviewData } from '@/components/jobs/EmailPreviewDialog';
import {
  JobCoreFields,
  JobScheduleFields,
  JobLocationFields,
  JobInterpreterSection,
  JobBillingFields,
  JobNotesFields,
  type FacilityOption,
} from '@/components/jobs/fields';
import { HoursSplit, calculateBillableTotal } from '@/lib/utils/job-calculations';
import { normalizeTimeToHHMM } from '@/lib/utils/time-helpers';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'>;

// ==========================================
// Form Schema
// ==========================================

const phoneRegex = /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/;

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
  timezone: z.string().optional(),
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
  facility_rate_holiday: z.coerce.number().optional(),
  facility_rate_mileage: z.coerce.number().optional(),
  interpreter_rate_business: z.coerce.number().optional(),
  interpreter_rate_after_hours: z.coerce.number().optional(),
  interpreter_rate_holiday: z.coerce.number().optional(),
  interpreter_rate_mileage: z.coerce.number().optional(),
  facility_rate_adjustment: z.coerce.number().optional(),
  interpreter_rate_adjustment: z.coerce.number().optional(),
  emergency_fee_applied: z.boolean().optional(),
  holiday_fee_applied: z.boolean().optional(),
  internal_notes: z.string().optional(),
  client_business_name: z.string().optional(),
  client_contact_name: z.string().optional(),
  client_contact_phone: z.string().optional().refine(
    (val) => !val || phoneRegex.test(val),
    { message: 'Please enter a valid phone number' }
  ),
  client_contact_email: z.string().optional().refine(
    (val) => !val || z.string().email().safeParse(val).success,
    { message: 'Please enter a valid email address' }
  ),
});

type FormData = z.infer<typeof formSchema>;

// ==========================================
// Constants
// ==========================================

// Helper to convert a job record to form values with proper normalization
const jobToFormValues = (job: Job, defaultMileageRate: number = 0.7): FormData => ({
  facility_id: job.facility_id,
  interpreter_id: job.interpreter_id ?? '',
  potential_interpreter_ids: job.potential_interpreter_ids ?? [],
  deaf_client_name: job.deaf_client_name ?? '',
  job_date: job.job_date,
  start_time: normalizeTimeToHHMM(job.start_time),
  end_time: normalizeTimeToHHMM(job.end_time),
  location_type: job.location_type ?? 'in_person',
  location_address: job.location_address ?? '',
  location_city: job.location_city ?? '',
  location_state: job.location_state ?? '',
  location_zip: job.location_zip ?? '',
  timezone: job.timezone ?? '',
  video_call_link: job.video_call_link ?? '',
  status: job.status ?? 'new',
  opportunity_source: job.opportunity_source ?? null,
  billable_hours: job.billable_hours ?? 0,
  mileage: job.mileage ?? 0,
  parking: job.parking ?? 0,
  tolls: job.tolls ?? 0,
  misc_fee: job.misc_fee ?? 0,
  travel_time_hours: job.travel_time_hours ?? 0,
  facility_rate_business: job.facility_rate_business ?? 0,
  facility_rate_after_hours: job.facility_rate_after_hours ?? 0,
  facility_rate_holiday: job.facility_rate_holiday ?? 0,
  // Treat 0.00 as "unset" so the UI uses the settings default until user overrides
  facility_rate_mileage:
    job.facility_rate_mileage === null || job.facility_rate_mileage === 0
      ? defaultMileageRate
      : job.facility_rate_mileage,
  facility_rate_adjustment: job.facility_rate_adjustment ?? 0,
  interpreter_rate_business: job.interpreter_rate_business ?? 0,
  interpreter_rate_after_hours: job.interpreter_rate_after_hours ?? 0,
  interpreter_rate_holiday: job.interpreter_rate_holiday ?? 0,
  interpreter_rate_mileage:
    job.interpreter_rate_mileage === null || job.interpreter_rate_mileage === 0
      ? defaultMileageRate
      : job.interpreter_rate_mileage,
  interpreter_rate_adjustment: job.interpreter_rate_adjustment ?? 0,
  emergency_fee_applied: job.emergency_fee_applied ?? false,
  holiday_fee_applied: job.holiday_fee_applied ?? false,
  internal_notes: job.internal_notes ?? '',
  client_business_name: job.client_business_name ?? '',
  client_contact_name: job.client_contact_name ?? '',
  client_contact_phone: job.client_contact_phone ?? '',
  client_contact_email: job.client_contact_email ?? '',
});

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

// ==========================================
// Component
// ==========================================

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(id || null);

  // Sync URL id to selectedJobId state (for browser back/forward navigation)
  useEffect(() => {
    if (id && id !== selectedJobId) {
      setSelectedJobId(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const [selectedFacility, setSelectedFacility] = useState<FacilityOption | null>(null);
  const [hoursSplit, setHoursSplit] = useState<HoursSplit | null>(null);
  
  // Dialog states
  const [facilityRatesDialogOpen, setFacilityRatesDialogOpen] = useState(false);
  const [interpreterRatesDialogOpen, setInterpreterRatesDialogOpen] = useState(false);
  const [clientContactDialogOpen, setClientContactDialogOpen] = useState(false);
  
  // Email preview state
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState<EmailPreviewData | null>(null);
  const [isPreparingEmail, setIsPreparingEmail] = useState(false);

  // Form
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
      opportunity_source: null,
    },
    mode: 'onChange',
  });

  const blocker = useUnsavedChangesWarning({ isDirty: form.formState.isDirty });

  // ==========================================
  // Queries
  // ==========================================

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

  const { data: facilities } = useQuery({
    queryKey: ['facilities-with-rates-and-address'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, rate_business_hours, rate_after_hours, rate_holiday_hours, minimum_billable_hours, contractor, is_gsa, physical_address, physical_city, physical_state, physical_zip, timezone, billing_address, billing_city, billing_state, billing_zip, billing_contacts, emergency_fee, holiday_fee')
        .order('name');
      if (error) throw error;
      return data as FacilityOption[];
    },
  });

  const { data: interpreters } = useQuery({
    queryKey: ['interpreters-with-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interpreters')
        .select('id, first_name, last_name, rate_business_hours, rate_after_hours, rate_holiday_hours, minimum_hours')
        .order('last_name');
      if (error) throw error;
      return data as { id: string; first_name: string; last_name: string; rate_business_hours: number | null; rate_after_hours: number | null; rate_holiday_hours: number | null; minimum_hours: number | null }[];
    },
  });

  const { data: defaultMileageRateSetting } = useQuery({
    queryKey: ['settings', 'default_mileage_rate'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('settings') as any)
        .select('*')
        .eq('key', 'default_mileage_rate')
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; key: string; value: number; description: string | null } | null;
    },
  });

  const defaultMileageRate = defaultMileageRateSetting?.value ?? 0.7;

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
      return data as Job | null;
    },
    enabled: !!selectedJobId,
  });

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

  // ==========================================
  // Derived State
  // ==========================================

  const isLocked = job?.status === 'paid';
  const watchedInterpreterId = form.watch('interpreter_id');
  const watchedPotentialInterpreterIds = form.watch('potential_interpreter_ids') || [];
  const watchedStatus = form.watch('status');
  
  const selectedInterpreter = interpreters?.find((i) => i.id === watchedInterpreterId);
  const canSendOutreach = watchedPotentialInterpreterIds.length > 0 && watchedStatus === 'new';
  const canConfirmInterpreter = !!watchedInterpreterId && (watchedStatus === 'outreach_in_progress' || watchedStatus === 'new');
  const canGenerateBilling = watchedStatus === 'complete' && !!watchedInterpreterId && !jobInvoice && !jobBill;

  // Build job options for selector
  const jobOptions: RecordOption[] = useMemo(() => {
    return (jobs || []).map((j) => ({
      id: j.id,
      label: `${j.job_number} - ${j.deaf_client_name || 'N/A'} (${format(new Date(j.job_date), 'MMM d, yyyy')})`,
      searchValue: `${j.job_number} ${j.deaf_client_name || ''}`,
    }));
  }, [jobs]);

  // ==========================================
  // Effects
  // ==========================================

  // Update URL when job changes
  useEffect(() => {
    if (selectedJobId && selectedJobId !== id) {
      navigate(`/jobs/${selectedJobId}`, { replace: true });
    }
  }, [selectedJobId, id, navigate]);

  // Populate form when job loads
  useEffect(() => {
    if (!job) return;

    // Reset first so RHF updates all fields in one shot
    // Pass defaultMileageRate so mileage rate fields use it when null
    form.reset(jobToFormValues(job, defaultMileageRate), { keepDefaultValues: false });

    // Defensive: some Radix Select fields can appear blank if the value arrives
    // during the same commit as the reset; re-apply normalized times on next tick.
    const t = window.setTimeout(() => {
      form.setValue('start_time', normalizeTimeToHHMM(job.start_time), { shouldDirty: false });
      form.setValue('end_time', normalizeTimeToHHMM(job.end_time), { shouldDirty: false });
    }, 0);

    return () => window.clearTimeout(t);
  }, [job, form, defaultMileageRate]);

  // Some child fields auto-fill values (e.g., location/client fields from facility) after the job reset.
  // If those fills happen during initial page load, RHF can end up considering the form "dirty" even
  // though the user didn't change anything. Once the selected facility is known, we stabilize the
  // current values as the new defaults for this job.
  const stabilizedDefaultsForJobId = useRef<string | null>(null);
  useEffect(() => {
    if (!job?.id) return;
    // Reset marker when switching jobs
    stabilizedDefaultsForJobId.current = null;
  }, [job?.id]);

  useEffect(() => {
    if (!job?.id) return;
    if (!selectedFacility) return;
    if (stabilizedDefaultsForJobId.current === job.id) return;

    // Next tick so any facility-dependent effects have applied their values.
    const t = window.setTimeout(() => {
      form.reset(form.getValues(), { keepDefaultValues: false });
      stabilizedDefaultsForJobId.current = job.id;
    }, 0);

    return () => window.clearTimeout(t);
  }, [job?.id, selectedFacility, form]);

  // Auto-populate interpreter rates when interpreter changes (user-initiated only)
  const prevInterpreterIdRef = useRef<string | null>(null);
  useEffect(() => {
    // Skip on initial load (when form first populates from job data)
    if (prevInterpreterIdRef.current === null) {
      prevInterpreterIdRef.current = watchedInterpreterId || '';
      return;
    }
    // Only run when interpreter actually changed by user action
    if (watchedInterpreterId && watchedInterpreterId !== prevInterpreterIdRef.current && interpreters) {
      const interpreter = interpreters.find((i) => i.id === watchedInterpreterId);
      if (interpreter) {
        form.setValue('interpreter_rate_business', interpreter.rate_business_hours || 0, { shouldDirty: true });
        form.setValue('interpreter_rate_after_hours', interpreter.rate_after_hours || 0, { shouldDirty: true });
        form.setValue('interpreter_rate_holiday', interpreter.rate_holiday_hours || 0, { shouldDirty: true });
      }
    }
    prevInterpreterIdRef.current = watchedInterpreterId || '';
  }, [watchedInterpreterId, interpreters, form]);

  // ==========================================
  // Callbacks
  // ==========================================

  const handleFacilityChange = useCallback((facility: FacilityOption | null) => {
    setSelectedFacility(facility);
    if (facility) {
      // Use shouldDirty: false to avoid marking form as dirty during initial load
      form.setValue('facility_rate_business', facility.rate_business_hours || 0, { shouldDirty: false });
      form.setValue('facility_rate_after_hours', facility.rate_after_hours || 0, { shouldDirty: false });
      form.setValue('facility_rate_holiday', facility.rate_holiday_hours || 0, { shouldDirty: false });
    }
  }, [form]);

  const handleHoursSplitChange = useCallback((split: HoursSplit | null) => {
    setHoursSplit(split);
  }, []);

  // Build totals payload helper
  const buildTotalsPayload = useCallback((data: FormData, currentHoursSplit: HoursSplit | null, currentJob: Job | null) => {
    let facilityHourlyTotal: number | null = null;
    let facilityBillableTotal: number | null = null;
    let interpreterHourlyTotal: number | null = null;
    let interpreterBillableTotal: number | null = null;
    let travelTimeRate: number | null = null;

    if (currentHoursSplit) {
      const trilingualUplift = currentJob?.trilingual_rate_uplift ?? 0;

      const facilityMileageRate =
        data.facility_rate_mileage === null || data.facility_rate_mileage === undefined || data.facility_rate_mileage === 0
          ? defaultMileageRate
          : data.facility_rate_mileage;
      const interpreterMileageRate =
        data.interpreter_rate_mileage === null || data.interpreter_rate_mileage === undefined || data.interpreter_rate_mileage === 0
          ? defaultMileageRate
          : data.interpreter_rate_mileage;

      const result = calculateBillableTotal({
        hoursSplit: currentHoursSplit,
        facilityBusinessRate: (data.facility_rate_business ?? 0) + trilingualUplift,
        facilityAfterHoursRate: (data.facility_rate_after_hours ?? 0) + trilingualUplift,
        facilityHolidayRate: (data.facility_rate_holiday ?? 0) + trilingualUplift,
        facilityMileageRate,
        facilityRateAdjustment: data.facility_rate_adjustment ?? 0,
        interpreterBusinessRate: data.interpreter_rate_business ?? 0,
        interpreterAfterHoursRate: data.interpreter_rate_after_hours ?? 0,
        interpreterHolidayRate: data.interpreter_rate_holiday ?? 0,
        interpreterMileageRate,
        interpreterRateAdjustment: data.interpreter_rate_adjustment ?? 0,
        mileage: data.mileage ?? 0,
        travelTimeHours: data.travel_time_hours ?? 0,
        parking: data.parking ?? 0,
        tolls: data.tolls ?? 0,
        miscFee: data.misc_fee ?? 0,
        useHolidayRate: data.holiday_fee_applied ?? false,
      });

      facilityHourlyTotal = result.facilityBusinessTotal + result.facilityAfterHoursTotal;
      facilityBillableTotal = result.facilityTotal;
      interpreterHourlyTotal = result.interpreterBusinessTotal + result.interpreterAfterHoursTotal;
      interpreterBillableTotal = result.interpreterTotal;
      travelTimeRate = result.interpreterTravelTimeRate;
    }

    return { 
      facility_hourly_total: facilityHourlyTotal, 
      facility_billable_total: facilityBillableTotal,
      total_facility_charge: facilityBillableTotal,
      interpreter_hourly_total: interpreterHourlyTotal, 
      interpreter_billable_total: interpreterBillableTotal,
      total_interpreter_pay: interpreterBillableTotal,
      travel_time_rate: travelTimeRate,
      business_hours_worked: currentHoursSplit?.businessHours ?? null,
      after_hours_worked: currentHoursSplit?.afterHours ?? null,
    };
  }, [defaultMileageRate]);

  // ==========================================
  // Email Preview Handlers
  // ==========================================

  const prepareOutreachEmailPreview = useCallback(async () => {
    if (!selectedJobId) return;
    
    setIsPreparingEmail(true);
    try {
      const data = form.getValues();
      const potentialInterpreterIds = data.potential_interpreter_ids || [];
      
      if (potentialInterpreterIds.length === 0) {
        toast({ title: 'No potential interpreters selected', variant: 'destructive' });
        return;
      }
      
      const normalizedStartTime = normalizeTimeToHHMM(data.start_time);
      const normalizedEndTime = normalizeTimeToHHMM(data.end_time);
      
      if (!normalizedStartTime || !normalizedEndTime) {
        toast({ title: 'Invalid time', description: 'Please select valid start and end times.', variant: 'destructive' });
        return;
      }
      
      // Get facility info
      const facility = facilities?.find(f => f.id === data.facility_id);
      const facilityName = facility?.name || 'Unknown Facility';
      
      // Build location string
      const locationParts = [data.location_address, data.location_city, data.location_state, data.location_zip].filter(Boolean);
      const location = data.location_type === 'remote' 
        ? (data.video_call_link || 'Remote - Link TBD')
        : (locationParts.join(', ') || 'TBD');
      
      // Get rate info
      const businessRate = data.facility_rate_business || facility?.rate_business_hours || 0;
      const rateInfo = `$${businessRate.toFixed(2)}/hr`;
      
      // Get the email template
      const { data: templateData, error: templateError } = await supabase
        .from('email_templates')
        .select('subject, body')
        .eq('name', 'interpreter_outreach')
        .single();
      
      if (templateError || !templateData) {
        toast({ title: 'Error', description: 'Could not find outreach email template', variant: 'destructive' });
        return;
      }
      
      const template = templateData as { subject: string; body: string };
      
      // Get interpreter info
      const { data: potentialInterpreters, error: interpError } = await supabase
        .from('interpreters')
        .select('id, email, first_name, last_name')
        .in('id', potentialInterpreterIds);
      
      if (interpError) {
        toast({ title: 'Error', description: 'Could not fetch interpreter information', variant: 'destructive' });
        return;
      }
      
      const interpreterList = potentialInterpreters as { id: string; email: string; first_name: string; last_name: string }[] | null;
      
      // Use first interpreter for preview template variables
      const firstInterpreter = interpreterList?.[0];
      const templateVariables = {
        interpreter_name: firstInterpreter ? `${firstInterpreter.first_name} ${firstInterpreter.last_name}` : '[Interpreter Name]',
        facility_name: facilityName,
        job_date: format(new Date(data.job_date), 'MMMM d, yyyy'),
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
        location: location,
        rate_info: rateInfo,
      };
      
      const recipients = (interpreterList || []).map(i => ({
        id: i.id,
        email: i.email,
        name: `${i.first_name} ${i.last_name}`,
      }));
      
      setEmailPreviewData({
        type: 'outreach',
        subject: template.subject,
        body: template.body,
        recipients,
        templateVariables,
      });
      setEmailPreviewOpen(true);
    } catch (error) {
      console.error('Error preparing outreach email preview:', error);
      toast({ title: 'Error', description: 'Failed to prepare email preview', variant: 'destructive' });
    } finally {
      setIsPreparingEmail(false);
    }
  }, [selectedJobId, facilities, form, toast]);

  const prepareConfirmationEmailPreview = useCallback(async () => {
    if (!selectedJobId) return;
    
    setIsPreparingEmail(true);
    try {
      const data = form.getValues();
      const interpreterId = data.interpreter_id;
      
      if (!interpreterId) {
        toast({ title: 'No interpreter selected', variant: 'destructive' });
        return;
      }
      
      const normalizedStartTime = normalizeTimeToHHMM(data.start_time);
      const normalizedEndTime = normalizeTimeToHHMM(data.end_time);
      
      if (!normalizedStartTime || !normalizedEndTime) {
        toast({ title: 'Invalid time', description: 'Please select valid start and end times.', variant: 'destructive' });
        return;
      }
      
      // Get facility info
      const facility = facilities?.find(f => f.id === data.facility_id);
      const facilityName = facility?.name || 'Unknown Facility';
      
      // Build location string
      const locationParts = [data.location_address, data.location_city, data.location_state, data.location_zip].filter(Boolean);
      const location = data.location_type === 'remote' 
        ? (data.video_call_link || 'Remote - Link TBD')
        : (locationParts.join(', ') || 'TBD');
      
      // Get contact info from billing_contacts
      const primaryContact = facility?.billing_contacts?.[0];
      const contactName = data.client_contact_name || primaryContact?.name || 'N/A';
      const contactPhone = data.client_contact_phone || primaryContact?.phone || 'N/A';
      
      // Get the interpreter info
      const { data: interpreterInfo, error: interpError } = await supabase
        .from('interpreters')
        .select('email, first_name, last_name')
        .eq('id', interpreterId)
        .single();
      
      if (interpError || !interpreterInfo) {
        toast({ title: 'Error', description: 'Could not find interpreter information', variant: 'destructive' });
        return;
      }
      
      const confirmedInterpreter = interpreterInfo as { email: string; first_name: string; last_name: string };
      
      // Get the email template
      const { data: templateData, error: templateError } = await supabase
        .from('email_templates')
        .select('subject, body')
        .eq('name', 'interpreter_confirmation')
        .single();
      
      if (templateError || !templateData) {
        toast({ title: 'Error', description: 'Could not find confirmation email template', variant: 'destructive' });
        return;
      }
      
      const template = templateData as { subject: string; body: string };
      
      const templateVariables = {
        interpreter_name: `${confirmedInterpreter.first_name} ${confirmedInterpreter.last_name}`,
        job_number: job?.job_number || 'N/A',
        facility_name: facilityName,
        job_date: format(new Date(data.job_date), 'MMMM d, yyyy'),
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
        location: location,
        contact_name: contactName,
        contact_phone: contactPhone,
      };
      
      setEmailPreviewData({
        type: 'confirmation',
        subject: template.subject,
        body: template.body,
        recipients: [{
          id: interpreterId,
          email: confirmedInterpreter.email,
          name: `${confirmedInterpreter.first_name} ${confirmedInterpreter.last_name}`,
        }],
        templateVariables,
      });
      setEmailPreviewOpen(true);
    } catch (error) {
      console.error('Error preparing confirmation email preview:', error);
      toast({ title: 'Error', description: 'Failed to prepare email preview', variant: 'destructive' });
    } finally {
      setIsPreparingEmail(false);
    }
  }, [selectedJobId, facilities, job, form, toast]);

  const handleConfirmSendEmail = useCallback(() => {
    if (!emailPreviewData) return;
    
    if (emailPreviewData.type === 'outreach') {
      sendOutreachMutation.mutate();
    } else {
      confirmInterpreterMutation.mutate();
    }
  }, [emailPreviewData]);

  // ==========================================
  // Mutations
  // ==========================================

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedJobId) throw new Error('No job selected');
      
      // Normalize and validate times before saving
      const normalizedStartTime = normalizeTimeToHHMM(data.start_time);
      const normalizedEndTime = normalizeTimeToHHMM(data.end_time);
      
      if (!normalizedStartTime || !normalizedEndTime) {
        throw new Error('Invalid start or end time. Please select valid times.');
      }
      
      // Sanitize opportunity_source (ensure sentinel values don't reach DB)
      const opportunitySource = (data.opportunity_source as unknown) === '__none__' || !data.opportunity_source
        ? null 
        : data.opportunity_source;
      
      const totals = buildTotalsPayload(data, hoursSplit, job);
      
      const payload: Record<string, unknown> = {
        facility_id: data.facility_id,
        interpreter_id: data.interpreter_id || null,
        deaf_client_name: data.deaf_client_name || null,
        job_date: data.job_date,
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
        location_type: data.location_type,
        location_address: data.location_address || null,
        location_city: data.location_city || null,
        location_state: data.location_state || null,
        location_zip: data.location_zip || null,
        timezone: data.timezone || null,
        video_call_link: data.video_call_link || null,
        status: data.status,
        opportunity_source: opportunitySource,
        billable_hours: data.billable_hours ?? null,
        mileage: data.mileage ?? null,
        parking: data.parking ?? null,
        tolls: data.tolls ?? null,
        misc_fee: data.misc_fee ?? null,
        travel_time_hours: data.travel_time_hours ?? null,
        facility_rate_business: data.facility_rate_business ?? null,
        facility_rate_after_hours: data.facility_rate_after_hours ?? null,
        facility_rate_holiday: data.facility_rate_holiday ?? null,
        // Treat 0 as "use default" and store null
        facility_rate_mileage: !data.facility_rate_mileage || data.facility_rate_mileage === 0 ? null : data.facility_rate_mileage,
        facility_rate_adjustment: data.facility_rate_adjustment ?? 0,
        interpreter_rate_business: data.interpreter_rate_business ?? null,
        interpreter_rate_after_hours: data.interpreter_rate_after_hours ?? null,
        interpreter_rate_holiday: data.interpreter_rate_holiday ?? null,
        interpreter_rate_mileage: !data.interpreter_rate_mileage || data.interpreter_rate_mileage === 0 ? null : data.interpreter_rate_mileage,
        interpreter_rate_adjustment: data.interpreter_rate_adjustment ?? 0,
        emergency_fee_applied: data.emergency_fee_applied || false,
        holiday_fee_applied: data.holiday_fee_applied || false,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        potential_interpreter_ids: data.potential_interpreter_ids || [],
        ...totals,
      };

      // Use select().single() to get the authoritative DB row back after save
      const { data: savedJob, error } = await supabase
        .from('jobs')
        .update(payload as never)
        .eq('id', selectedJobId)
        .select('*')
        .single();
      if (error) throw error;
      return savedJob as Job;
    },
    onSuccess: (savedJob) => {
      queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-list'] });
      // Reset form from the authoritative DB response to ensure UI matches DB
      if (savedJob) {
        form.reset(jobToFormValues(savedJob, defaultMileageRate), { keepDefaultValues: false });
      }
      toast({ title: 'Job updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating job', description: error.message, variant: 'destructive' });
    },
  });

  const sendOutreachMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId) throw new Error('No job selected');
      
      const data = form.getValues();
      const potentialInterpreterIds = data.potential_interpreter_ids || [];
      
      if (potentialInterpreterIds.length === 0) {
        throw new Error('No potential interpreters selected');
      }
      
      // Normalize and validate times before saving
      const normalizedStartTime = normalizeTimeToHHMM(data.start_time);
      const normalizedEndTime = normalizeTimeToHHMM(data.end_time);
      
      if (!normalizedStartTime || !normalizedEndTime) {
        throw new Error('Invalid start or end time. Please select valid times.');
      }
      
      // Get facility name for email
      const facility = facilities?.find(f => f.id === data.facility_id);
      const facilityName = facility?.name || 'Unknown Facility';
      
      // Build location string
      const locationParts = [data.location_address, data.location_city, data.location_state, data.location_zip].filter(Boolean);
      const location = data.location_type === 'remote' 
        ? (data.video_call_link || 'Remote - Link TBD')
        : (locationParts.join(', ') || 'TBD');
      
      // Get rate info
      const businessRate = data.facility_rate_business || facility?.rate_business_hours || 0;
      const rateInfo = `$${businessRate.toFixed(2)}/hr`;
      
      // Get the email template
      const { data: templateData, error: templateError } = await supabase
        .from('email_templates')
        .select('subject, body')
        .eq('name', 'interpreter_outreach')
        .single();
      
      if (templateError || !templateData) {
        throw new Error('Could not find outreach email template');
      }
      
      const template = templateData as { subject: string; body: string };
      
      // Get interpreter emails
      const { data: potentialInterpreters, error: interpError } = await supabase
        .from('interpreters')
        .select('id, email, first_name, last_name')
        .in('id', potentialInterpreterIds);
      
      if (interpError) throw interpError;
      
      // Send emails to all potential interpreters
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }
      
      const emailPromises = (potentialInterpreters || []).map(async (interpreter) => {
        const templateVariables = {
          interpreter_name: `${interpreter.first_name} ${interpreter.last_name}`,
          facility_name: facilityName,
          job_date: format(new Date(data.job_date), 'MMMM d, yyyy'),
          start_time: normalizedStartTime,
          end_time: normalizedEndTime,
          location: location,
          rate_info: rateInfo,
        };
        
        const response = await fetch('https://umyjqvmpvjfikljhoofy.supabase.co/functions/v1/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            to: interpreter.email,
            subject: template.subject,
            body: template.body,
            template_name: 'interpreter_outreach',
            template_variables: templateVariables,
            job_id: selectedJobId,
            interpreter_id: interpreter.id,
          }),
        });
        
        if (!response.ok) {
          console.error(`Failed to send email to ${interpreter.email}`);
        }
        return response;
      });
      
      await Promise.allSettled(emailPromises);
      
      // Sanitize opportunity_source
      const opportunitySource = (data.opportunity_source as unknown) === '__none__' || !data.opportunity_source
        ? null 
        : data.opportunity_source;
      
      const totals = buildTotalsPayload(data, hoursSplit, job);
      
      const payload: Record<string, unknown> = {
        facility_id: data.facility_id,
        interpreter_id: data.interpreter_id || null,
        deaf_client_name: data.deaf_client_name || null,
        job_date: data.job_date,
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
        location_type: data.location_type,
        location_address: data.location_address || null,
        location_city: data.location_city || null,
        location_state: data.location_state || null,
        location_zip: data.location_zip || null,
        video_call_link: data.video_call_link || null,
        status: 'outreach_in_progress',
        opportunity_source: opportunitySource,
        billable_hours: data.billable_hours ?? null,
        mileage: data.mileage ?? null,
        parking: data.parking ?? null,
        tolls: data.tolls ?? null,
        misc_fee: data.misc_fee ?? null,
        travel_time_hours: data.travel_time_hours ?? null,
        facility_rate_business: data.facility_rate_business ?? null,
        facility_rate_after_hours: data.facility_rate_after_hours ?? null,
        facility_rate_mileage: data.facility_rate_mileage ?? null,
        facility_rate_adjustment: data.facility_rate_adjustment ?? 0,
        interpreter_rate_business: data.interpreter_rate_business ?? null,
        interpreter_rate_after_hours: data.interpreter_rate_after_hours ?? null,
        interpreter_rate_mileage: data.interpreter_rate_mileage ?? null,
        interpreter_rate_adjustment: data.interpreter_rate_adjustment ?? 0,
        emergency_fee_applied: data.emergency_fee_applied || false,
        holiday_fee_applied: data.holiday_fee_applied || false,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        potential_interpreter_ids: data.potential_interpreter_ids || [],
        reminder_sent_at: new Date().toISOString(),
        ...totals,
      };

      const { data: savedJob, error } = await supabase
        .from('jobs')
        .update(payload as never)
        .eq('id', selectedJobId)
        .select('*')
        .single();
      if (error) throw error;
      return { savedJob: savedJob as Job, emailCount: potentialInterpreters?.length || 0 };
    },
    onSuccess: ({ savedJob, emailCount }) => {
      setEmailPreviewOpen(false);
      setEmailPreviewData(null);
      queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-list'] });
      if (savedJob) {
        form.reset(jobToFormValues(savedJob, defaultMileageRate), { keepDefaultValues: false });
      }
      toast({
        title: 'Outreach Emails Sent',
        description: `Sent outreach to ${emailCount} interpreter${emailCount !== 1 ? 's' : ''}. Status updated to Outreach In Progress.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const confirmInterpreterMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId) throw new Error('No job selected');
      
      const data = form.getValues();
      const interpreterId = data.interpreter_id;
      
      if (!interpreterId) throw new Error('No interpreter selected');
      
      // Normalize and validate times before saving
      const normalizedStartTime = normalizeTimeToHHMM(data.start_time);
      const normalizedEndTime = normalizeTimeToHHMM(data.end_time);
      
      if (!normalizedStartTime || !normalizedEndTime) {
        throw new Error('Invalid start or end time. Please select valid times.');
      }
      
      // Get facility name and details for email
      const facility = facilities?.find(f => f.id === data.facility_id);
      const facilityName = facility?.name || 'Unknown Facility';
      
      // Build location string
      const locationParts = [data.location_address, data.location_city, data.location_state, data.location_zip].filter(Boolean);
      const location = data.location_type === 'remote' 
        ? (data.video_call_link || 'Remote - Link TBD')
        : (locationParts.join(', ') || 'TBD');
      
      // Get contact info from billing_contacts
      const primaryContact = facility?.billing_contacts?.[0];
      const contactName = data.client_contact_name || primaryContact?.name || 'N/A';
      const contactPhone = data.client_contact_phone || primaryContact?.phone || 'N/A';
      
      // Get the interpreter info
      const { data: interpreterInfo, error: interpError } = await supabase
        .from('interpreters')
        .select('email, first_name, last_name')
        .eq('id', interpreterId)
        .single();
      
      if (interpError || !interpreterInfo) {
        throw new Error('Could not find interpreter information');
      }
      
      const confirmedInterpreter = interpreterInfo as { email: string; first_name: string; last_name: string };
      
      // Get the email template
      const { data: templateData, error: templateError } = await supabase
        .from('email_templates')
        .select('subject, body')
        .eq('name', 'interpreter_confirmation')
        .single();
      
      if (templateError || !templateData) {
        throw new Error('Could not find confirmation email template');
      }
      
      const template = templateData as { subject: string; body: string };
      
      // Send confirmation email
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }
      
      const templateVariables = {
        interpreter_name: `${confirmedInterpreter.first_name} ${confirmedInterpreter.last_name}`,
        job_number: job?.job_number || 'N/A',
        facility_name: facilityName,
        job_date: format(new Date(data.job_date), 'MMMM d, yyyy'),
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
        location: location,
        contact_name: contactName,
        contact_phone: contactPhone,
      };
      
      const emailResponse = await fetch('https://umyjqvmpvjfikljhoofy.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          to: confirmedInterpreter.email,
          subject: template.subject,
          body: template.body,
          template_name: 'interpreter_confirmation',
          template_variables: templateVariables,
          job_id: selectedJobId,
          interpreter_id: interpreterId,
        }),
      });
      
      if (!emailResponse.ok) {
        console.error('Failed to send confirmation email');
      }
      
      // Sanitize opportunity_source
      const opportunitySource = (data.opportunity_source as unknown) === '__none__' || !data.opportunity_source
        ? null 
        : data.opportunity_source;
      
      const interpreter = interpreters?.find((i) => i.id === interpreterId);
      const interpreterMinHours = interpreter?.minimum_hours ?? 2;
      const facilityMinHours = selectedFacility?.minimum_billable_hours ?? 2;
      const effectiveMinHours = Math.max(interpreterMinHours, facilityMinHours);
      
      let newBillableHours = data.billable_hours ?? 0;
      if (hoursSplit) {
        newBillableHours = Math.max(hoursSplit.totalHours, effectiveMinHours);
      }
      
      const totals = buildTotalsPayload(data, hoursSplit, job);
      
      const payload: Record<string, unknown> = {
        facility_id: data.facility_id,
        interpreter_id: interpreterId,
        deaf_client_name: data.deaf_client_name || null,
        job_date: data.job_date,
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
        location_type: data.location_type,
        location_address: data.location_address || null,
        location_city: data.location_city || null,
        location_state: data.location_state || null,
        location_zip: data.location_zip || null,
        video_call_link: data.video_call_link || null,
        status: 'confirmed',
        opportunity_source: opportunitySource,
        billable_hours: newBillableHours,
        mileage: data.mileage ?? null,
        parking: data.parking ?? null,
        tolls: data.tolls ?? null,
        misc_fee: data.misc_fee ?? null,
        travel_time_hours: data.travel_time_hours ?? null,
        facility_rate_business: data.facility_rate_business ?? null,
        facility_rate_after_hours: data.facility_rate_after_hours ?? null,
        facility_rate_mileage: data.facility_rate_mileage ?? null,
        facility_rate_adjustment: data.facility_rate_adjustment ?? 0,
        interpreter_rate_business: data.interpreter_rate_business ?? null,
        interpreter_rate_after_hours: data.interpreter_rate_after_hours ?? null,
        interpreter_rate_mileage: data.interpreter_rate_mileage ?? null,
        interpreter_rate_adjustment: data.interpreter_rate_adjustment ?? 0,
        emergency_fee_applied: data.emergency_fee_applied || false,
        holiday_fee_applied: data.holiday_fee_applied || false,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        potential_interpreter_ids: data.potential_interpreter_ids || [],
        confirmation_sent_at: new Date().toISOString(),
        ...totals,
      };
      
      const { data: savedJob, error } = await supabase
        .from('jobs')
        .update(payload as never)
        .eq('id', selectedJobId)
        .select('*')
        .single();
      if (error) throw error;
      
      return { savedJob: savedJob as Job, interpreterName: `${confirmedInterpreter.first_name} ${confirmedInterpreter.last_name}` };
    },
    onSuccess: ({ savedJob, interpreterName }) => {
      setEmailPreviewOpen(false);
      setEmailPreviewData(null);
      queryClient.invalidateQueries({ queryKey: ['job', selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-list'] });
      if (savedJob) {
        form.reset(jobToFormValues(savedJob), { keepDefaultValues: false });
      }
      toast({
        title: 'Interpreter Confirmed',
        description: `Confirmation email sent to ${interpreterName}. Status updated to Confirmed.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const generateBillingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId) throw new Error('No job selected');
      
      const data = form.getValues();
      const interpreterId = data.interpreter_id;
      
      if (!interpreterId) throw new Error('No interpreter assigned');
      
      // Normalize and validate times before saving
      const normalizedStartTime = normalizeTimeToHHMM(data.start_time);
      const normalizedEndTime = normalizeTimeToHHMM(data.end_time);
      
      if (!normalizedStartTime || !normalizedEndTime) {
        throw new Error('Invalid start or end time. Please select valid times.');
      }
      
      // Sanitize opportunity_source
      const opportunitySource = (data.opportunity_source as unknown) === '__none__' || !data.opportunity_source
        ? null 
        : data.opportunity_source;
      
      const totals = buildTotalsPayload(data, hoursSplit, job);
      
      const payload: Record<string, unknown> = {
        facility_id: data.facility_id,
        interpreter_id: interpreterId,
        deaf_client_name: data.deaf_client_name || null,
        job_date: data.job_date,
        start_time: normalizedStartTime,
        end_time: normalizedEndTime,
        location_type: data.location_type,
        location_address: data.location_address || null,
        location_city: data.location_city || null,
        location_state: data.location_state || null,
        location_zip: data.location_zip || null,
        video_call_link: data.video_call_link || null,
        status: 'ready_to_bill',
        opportunity_source: opportunitySource,
        billable_hours: data.billable_hours ?? null,
        mileage: data.mileage ?? null,
        parking: data.parking ?? null,
        tolls: data.tolls ?? null,
        misc_fee: data.misc_fee ?? null,
        travel_time_hours: data.travel_time_hours ?? null,
        facility_rate_business: data.facility_rate_business ?? null,
        facility_rate_after_hours: data.facility_rate_after_hours ?? null,
        facility_rate_mileage: data.facility_rate_mileage ?? null,
        facility_rate_adjustment: data.facility_rate_adjustment ?? 0,
        interpreter_rate_business: data.interpreter_rate_business ?? null,
        interpreter_rate_after_hours: data.interpreter_rate_after_hours ?? null,
        interpreter_rate_mileage: data.interpreter_rate_mileage ?? null,
        interpreter_rate_adjustment: data.interpreter_rate_adjustment ?? 0,
        emergency_fee_applied: data.emergency_fee_applied || false,
        holiday_fee_applied: data.holiday_fee_applied || false,
        internal_notes: data.internal_notes || null,
        client_business_name: data.client_business_name || null,
        client_contact_name: data.client_contact_name || null,
        client_contact_phone: data.client_contact_phone || null,
        client_contact_email: data.client_contact_email || null,
        potential_interpreter_ids: data.potential_interpreter_ids || [],
        ...totals,
      };

      const { error: saveError } = await supabase
        .from('jobs')
        .update(payload as never)
        .eq('id', selectedJobId);
      if (saveError) throw saveError;
      
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          facility_id: data.facility_id,
          job_id: selectedJobId,
          status: 'draft',
        } as never);
      if (invoiceError) throw invoiceError;

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
      queryClient.invalidateQueries({ queryKey: ['job-invoice', selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ['job-bill', selectedJobId] });
      const currentValues = form.getValues();
      form.reset({ ...currentValues, status: 'ready_to_bill' as const });
      toast({
        title: 'Billing Generated',
        description: 'Invoice and interpreter bill have been created.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ==========================================
  // Handlers
  // ==========================================

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const handleDelete = async () => {
    if (!job || !selectedJobId) return;
    const { error } = await supabase.from('jobs').delete().eq('id', selectedJobId);
    if (error) {
      toast({ title: 'Error deleting job', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Job deleted successfully' });
      navigate('/jobs');
    }
  };

  // Rate dialog handlers
  const handleFacilityRatesSave = (values: Record<string, number>) => {
    form.setValue('facility_rate_business', values.facility_rate_business, { shouldDirty: true });
    form.setValue('facility_rate_after_hours', values.facility_rate_after_hours, { shouldDirty: true });
    form.setValue('facility_rate_holiday', values.facility_rate_holiday, { shouldDirty: true });
    form.setValue('facility_rate_mileage', values.facility_rate_mileage, { shouldDirty: true });
  };

  const handleInterpreterRatesSave = (values: Record<string, number>) => {
    form.setValue('interpreter_rate_business', values.interpreter_rate_business, { shouldDirty: true });
    form.setValue('interpreter_rate_after_hours', values.interpreter_rate_after_hours, { shouldDirty: true });
    form.setValue('interpreter_rate_holiday', values.interpreter_rate_holiday, { shouldDirty: true });
    form.setValue('interpreter_rate_mileage', values.interpreter_rate_mileage, { shouldDirty: true });
  };

  const handleClientContactSave = (values: Record<string, string>) => {
    form.setValue('client_business_name', values.client_business_name, { shouldDirty: true });
    form.setValue('client_contact_name', values.client_contact_name, { shouldDirty: true });
    form.setValue('client_contact_phone', values.client_contact_phone, { shouldDirty: true });
    form.setValue('client_contact_email', values.client_contact_email, { shouldDirty: true });
  };

  // Prepare rate fields for dialogs
  const facilityRateFields: RateField[] = [
    { key: 'facility_rate_business', label: 'Business ($/hr)', value: form.watch('facility_rate_business') ?? 0, suffix: '/hr' },
    { key: 'facility_rate_after_hours', label: 'After Hours ($/hr)', value: form.watch('facility_rate_after_hours') ?? 0, suffix: '/hr' },
    { key: 'facility_rate_holiday', label: 'Holiday ($/hr)', value: form.watch('facility_rate_holiday') ?? 0, suffix: '/hr' },
    { key: 'facility_rate_mileage', label: 'Mileage ($/mi)', value: form.watch('facility_rate_mileage') ?? defaultMileageRate, suffix: '/mi' },
  ];

  const interpreterRateFields: RateField[] = [
    { key: 'interpreter_rate_business', label: 'Business ($/hr)', value: form.watch('interpreter_rate_business') ?? 0, suffix: '/hr' },
    { key: 'interpreter_rate_after_hours', label: 'After Hours ($/hr)', value: form.watch('interpreter_rate_after_hours') ?? 0, suffix: '/hr' },
    { key: 'interpreter_rate_holiday', label: 'Holiday ($/hr)', value: form.watch('interpreter_rate_holiday') ?? 0, suffix: '/hr' },
    { key: 'interpreter_rate_mileage', label: 'Mileage ($/mi)', value: form.watch('interpreter_rate_mileage') ?? defaultMileageRate, suffix: '/mi' },
  ];

  const clientContactFields: ContactField[] = [
    { key: 'client_business_name', label: 'Business Name', value: form.watch('client_business_name') || '' },
    { key: 'client_contact_name', label: 'Contact Name', value: form.watch('client_contact_name') || '' },
    { key: 'client_contact_phone', label: 'Phone', value: form.watch('client_contact_phone') || '' },
    { key: 'client_contact_email', label: 'Email', value: form.watch('client_contact_email') || '', type: 'email' },
  ];

  // ==========================================
  // Render
  // ==========================================

  return (
    <RecordPageLayout
      title={job ? `Job #${job.job_number}` : 'Job Details'}
      backRoute="/jobs"
      isDirty={form.formState.isDirty}
      blocker={blocker}
      isLoading={jobLoading}
      hasRecord={!!job}
      isSaving={mutation.isPending}
      formId="job-detail-form"
      selector={{
        selectedId: selectedJobId,
        options: jobOptions,
        isOpen: selectorOpen,
        onOpenChange: setSelectorOpen,
        onSelect: setSelectedJobId,
        placeholder: 'Select job...',
        searchPlaceholder: 'Search jobs...',
        emptyMessage: 'No job found.',
        width: 'w-[180px]',
      }}
      deleteConfig={{
        title: 'Delete Job',
        description: `Are you sure you want to delete Job #${job?.job_number}? This action cannot be undone.`,
        onDelete: handleDelete,
        hidden: isLocked,
      }}
      headerActions={
        job?.status ? <Badge variant="secondary">{statusLabels[job.status]}</Badge> : null
      }
    >
      {job && (
        <Form {...form}>
          <form id="job-detail-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <JobCoreFields
              form={form}
              mode="edit"
              disabled={isLocked}
              facilities={facilities}
              onFacilityChange={handleFacilityChange}
            />

            <JobScheduleFields
              form={form}
              mode="edit"
              disabled={isLocked}
              minimumHours={selectedFacility?.minimum_billable_hours ?? 2}
              onHoursSplitChange={handleHoursSplitChange}
              facilityEmergencyFee={selectedFacility?.emergency_fee}
              facilityHolidayRate={selectedFacility?.rate_holiday_hours}
            />

            <JobLocationFields
              form={form}
              mode="edit"
              disabled={isLocked}
              selectedFacility={selectedFacility}
            />

            <JobInterpreterSection
              form={form}
              mode="edit"
              disabled={isLocked}
              interpreters={interpreters}
              onSendOutreach={prepareOutreachEmailPreview}
              onConfirmInterpreter={prepareConfirmationEmailPreview}
              isSendingOutreach={isPreparingEmail || sendOutreachMutation.isPending}
              isConfirmingInterpreter={isPreparingEmail || confirmInterpreterMutation.isPending}
              canSendOutreach={canSendOutreach}
              canConfirmInterpreter={canConfirmInterpreter}
            />

            <JobBillingFields
              form={form}
              mode="edit"
              disabled={isLocked}
              hoursSplit={hoursSplit}
              defaultMileageRate={defaultMileageRate}
              linkedInvoice={jobInvoice ? { id: jobInvoice.id, number: jobInvoice.invoice_number } : null}
              linkedBill={jobBill ? { id: jobBill.id, number: jobBill.bill_number } : null}
              facilityId={job?.facility_id}
              interpreterId={watchedInterpreterId}
              onGenerateBilling={() => generateBillingMutation.mutate()}
              isGeneratingBilling={generateBillingMutation.isPending}
              canGenerateBilling={canGenerateBilling}
              selectedInterpreterName={selectedInterpreter ? `${selectedInterpreter.first_name} ${selectedInterpreter.last_name}` : undefined}
              hasInterpreter={!!watchedInterpreterId}
              facilityEmergencyFee={selectedFacility?.emergency_fee}
            />

            <JobNotesFields
              form={form}
              mode="edit"
              disabled={isLocked}
            />
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
      
      {/* Email Preview Dialog */}
      <EmailPreviewDialog
        open={emailPreviewOpen}
        onOpenChange={setEmailPreviewOpen}
        emailData={emailPreviewData}
        onConfirmSend={handleConfirmSendEmail}
        isSending={sendOutreachMutation.isPending || confirmInterpreterMutation.isPending}
      />
    </RecordPageLayout>
  );
}
