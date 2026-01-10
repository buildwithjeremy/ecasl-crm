import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';
import { getTimezoneFromState, timezoneOptions } from '@/lib/timezone-utils';
import type { Database } from '@/types/database';

type Facility = Database['public']['Tables']['facilities']['Row'];
type FacilityInsert = Database['public']['Tables']['facilities']['Insert'];

const facilityTypeOptions = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'school', label: 'School' },
  { value: 'government', label: 'Government' },
  { value: 'business', label: 'Business' },
  { value: 'other', label: 'Other' },
] as const;

const facilitySchema = z.object({
  name: z.string().min(1, 'Facility name is required'),
  facility_type: z.enum(['hospital', 'clinic', 'school', 'government', 'business', 'other']).optional().nullable(),
  billing_name: z.string().optional(),
  billing_address: z.string().min(1, 'Address is required'),
  billing_city: z.string().min(1, 'City is required'),
  billing_state: z.string().min(1, 'State is required'),
  billing_zip: z.string().min(1, 'Zip is required'),
  physical_address: z.string().min(1, 'Address is required'),
  physical_city: z.string().min(1, 'City is required'),
  physical_state: z.string().min(1, 'State is required'),
  physical_zip: z.string().min(1, 'Zip is required'),
  timezone: z.string().optional().nullable(),
  admin_contact_name: z.string().optional(),
  admin_contact_phone: z.string().optional(),
  admin_contact_email: z.string().email('Valid email is required').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'pending']),
  rate_business_hours: z.coerce.number().min(0.01, 'Business rate is required'),
  rate_after_hours: z.coerce.number().min(0.01, 'After hours rate is required'),
  rate_mileage: z.coerce.number().optional(),
  // Keep these in schema for database compatibility but don't show in UI
  minimum_billable_hours: z.coerce.number().optional().default(2),
  emergency_fee: z.coerce.number().optional(),
  holiday_fee: z.coerce.number().optional(),
  billing_code: z.string().optional(),
  contract_status: z.enum(['not_sent', 'sent', 'signed']),
  is_gsa: z.boolean(),
  contractor: z.boolean(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof facilitySchema>;

interface FacilityDialogProps {
  open: boolean;
  onOpenChange: () => void;
  facility: Facility | null;
}

export function FacilityDialog({ open, onOpenChange, facility }: FacilityDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: '',
      facility_type: null,
      status: 'pending',
      minimum_billable_hours: 2,
      rate_mileage: 0.7,
      contract_status: 'not_sent',
      is_gsa: false,
      contractor: false,
    },
  });

  const watchedPhysicalState = form.watch('physical_state');
  const detectedTimezone = getTimezoneFromState(watchedPhysicalState);

  // Auto-update timezone when physical state changes
  useEffect(() => {
    if (detectedTimezone) {
      form.setValue('timezone', detectedTimezone);
    }
  }, [detectedTimezone, form]);

  useEffect(() => {
    if (facility) {
      form.reset({
        name: facility.name,
        facility_type: (facility as any).facility_type || null,
        billing_name: facility.billing_name || '',
        billing_address: facility.billing_address || '',
        billing_city: facility.billing_city || '',
        billing_state: facility.billing_state || '',
        billing_zip: facility.billing_zip || '',
        physical_address: facility.physical_address || '',
        physical_city: facility.physical_city || '',
        physical_state: facility.physical_state || '',
        physical_zip: facility.physical_zip || '',
        timezone: (facility as any).timezone || null,
        admin_contact_name: facility.admin_contact_name || '',
        admin_contact_phone: facility.admin_contact_phone || '',
        admin_contact_email: facility.admin_contact_email || '',
        status: facility.status,
        rate_business_hours: facility.rate_business_hours || undefined,
        rate_after_hours: facility.rate_after_hours || undefined,
        rate_mileage: facility.rate_mileage || undefined,
        minimum_billable_hours: facility.minimum_billable_hours,
        emergency_fee: facility.emergency_fee || undefined,
        holiday_fee: facility.holiday_fee || undefined,
        billing_code: facility.billing_code || '',
        contract_status: facility.contract_status,
        is_gsa: facility.is_gsa,
        contractor: facility.contractor ?? false,
        notes: facility.notes || '',
      });
    } else {
      form.reset({
        name: '',
        facility_type: null,
        status: 'pending',
        minimum_billable_hours: 2,
        rate_mileage: 0.7,
        contract_status: 'not_sent',
        is_gsa: false,
        contractor: false,
      });
    }
  }, [facility, form]);

  const copyBillingToPhysical = () => {
    const billingAddress = form.getValues('billing_address');
    const billingCity = form.getValues('billing_city');
    const billingState = form.getValues('billing_state');
    const billingZip = form.getValues('billing_zip');

    form.setValue('physical_address', billingAddress || '');
    form.setValue('physical_city', billingCity || '');
    form.setValue('physical_state', billingState || '');
    form.setValue('physical_zip', billingZip || '');
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Using 'as any' because facility_type and timezone are new columns not yet in generated types
      const payload: any = {
        name: data.name,
        facility_type: data.facility_type || null,
        billing_name: data.billing_name || null,
        billing_address: data.billing_address || null,
        billing_city: data.billing_city || null,
        billing_state: data.billing_state || null,
        billing_zip: data.billing_zip || null,
        physical_address: data.physical_address || null,
        physical_city: data.physical_city || null,
        physical_state: data.physical_state || null,
        physical_zip: data.physical_zip || null,
        timezone: data.timezone || null,
        admin_contact_name: data.admin_contact_name || null,
        admin_contact_phone: data.admin_contact_phone || null,
        admin_contact_email: data.admin_contact_email || null,
        status: data.status,
        rate_business_hours: data.rate_business_hours || null,
        rate_after_hours: data.rate_after_hours || null,
        rate_mileage: data.rate_mileage || null,
        minimum_billable_hours: data.minimum_billable_hours,
        emergency_fee: data.emergency_fee || null,
        holiday_fee: data.holiday_fee || null,
        billing_code: data.billing_code || null,
        contract_status: data.contract_status,
        is_gsa: data.is_gsa,
        contractor: data.contractor,
        notes: data.notes || null,
      };

      if (facility) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('facilities') as any)
          .update(payload)
          .eq('id', facility.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('facilities') as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast({ title: `Facility ${facility ? 'updated' : 'created'} successfully` });
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
          <DialogTitle>{facility ? 'Edit Facility' : 'New Facility'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Facility Name *</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="facility_type">Facility Type</Label>
                <Select
                  value={form.watch('facility_type') || ''}
                  onValueChange={(value) => form.setValue('facility_type', value as FormData['facility_type'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilityTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {facility && (
                <div className="space-y-2">
                  <Label htmlFor="billing_name">Billing Name</Label>
                  <Input id="billing_name" {...form.register('billing_name')} />
                </div>
              )}
              {facility && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value) => form.setValue('status', value as 'active' | 'inactive' | 'pending')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_gsa"
                  checked={form.watch('is_gsa')}
                  onCheckedChange={(checked) => form.setValue('is_gsa', !!checked)}
                />
                <Label htmlFor="is_gsa">GSA Contract</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contractor"
                  checked={form.watch('contractor')}
                  onCheckedChange={(checked) => form.setValue('contractor', !!checked)}
                />
                <Label htmlFor="contractor">Contractor</Label>
              </div>
            </div>
          </div>

          {/* Admin Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">Admin Contact</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin_contact_name">Name</Label>
                <Input id="admin_contact_name" {...form.register('admin_contact_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_contact_phone">Phone</Label>
                <Input id="admin_contact_phone" {...form.register('admin_contact_phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_contact_email">Email</Label>
                <Input id="admin_contact_email" type="email" {...form.register('admin_contact_email')} />
                {form.formState.errors.admin_contact_email && (
                  <p className="text-sm text-destructive">{form.formState.errors.admin_contact_email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="space-y-4">
            <h3 className="font-semibold">Billing Address</h3>
            <div className="space-y-2">
              <Label htmlFor="billing_address">Address *</Label>
              <Input id="billing_address" {...form.register('billing_address')} />
              {form.formState.errors.billing_address && (
                <p className="text-sm text-destructive">{form.formState.errors.billing_address.message}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_city">City *</Label>
                <Input id="billing_city" {...form.register('billing_city')} />
                {form.formState.errors.billing_city && (
                  <p className="text-sm text-destructive">{form.formState.errors.billing_city.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_state">State *</Label>
                <Input id="billing_state" {...form.register('billing_state')} />
                {form.formState.errors.billing_state && (
                  <p className="text-sm text-destructive">{form.formState.errors.billing_state.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_zip">Zip *</Label>
                <Input id="billing_zip" {...form.register('billing_zip')} />
                {form.formState.errors.billing_zip && (
                  <p className="text-sm text-destructive">{form.formState.errors.billing_zip.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Physical Address */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Physical Address (for Job Locations)</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyBillingToPhysical}
                className="h-8"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy from Billing
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="physical_address">Address *</Label>
              <Input id="physical_address" {...form.register('physical_address')} />
              {form.formState.errors.physical_address && (
                <p className="text-sm text-destructive">{form.formState.errors.physical_address.message}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="physical_city">City *</Label>
                <Input id="physical_city" {...form.register('physical_city')} />
                {form.formState.errors.physical_city && (
                  <p className="text-sm text-destructive">{form.formState.errors.physical_city.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="physical_state">State *</Label>
                <Input id="physical_state" {...form.register('physical_state')} />
                {form.formState.errors.physical_state && (
                  <p className="text-sm text-destructive">{form.formState.errors.physical_state.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="physical_zip">Zip *</Label>
                <Input id="physical_zip" {...form.register('physical_zip')} />
                {form.formState.errors.physical_zip && (
                  <p className="text-sm text-destructive">{form.formState.errors.physical_zip.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={form.watch('timezone') || ''}
                onValueChange={(value) => form.setValue('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto-detected from state. For border areas with split time zones, please verify and adjust if needed.
              </p>
            </div>
          </div>

          {/* Rates */}
          <div className="space-y-4">
            <h3 className="font-semibold">Rates (What We Charge)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate_business_hours">Business Hours Rate *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    id="rate_business_hours" 
                    type="number" 
                    step="0.01" 
                    className="pl-7"
                    {...form.register('rate_business_hours')} 
                  />
                </div>
                {form.formState.errors.rate_business_hours && (
                  <p className="text-sm text-destructive">{form.formState.errors.rate_business_hours.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate_after_hours">After Hours Rate *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    id="rate_after_hours" 
                    type="number" 
                    step="0.01" 
                    className="pl-7"
                    {...form.register('rate_after_hours')} 
                  />
                </div>
                {form.formState.errors.rate_after_hours && (
                  <p className="text-sm text-destructive">{form.formState.errors.rate_after_hours.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate_mileage">Mileage Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    id="rate_mileage" 
                    type="number" 
                    step="0.01" 
                    className="pl-7"
                    {...form.register('rate_mileage')} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Billing Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold">Billing Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_code">Billing Code/PO Number</Label>
                <Input id="billing_code" {...form.register('billing_code')} />
              </div>
            </div>
            {facility && (
              <div className="space-y-2">
                <Label htmlFor="contract_status">Contract Status</Label>
                <Select
                  value={form.watch('contract_status')}
                  onValueChange={(value) => form.setValue('contract_status', value as 'not_sent' | 'sent' | 'signed')}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_sent">Not Sent</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...form.register('notes')} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onOpenChange}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : facility ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
