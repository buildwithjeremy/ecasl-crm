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
import type { Database } from '@/types/database';

type Facility = Database['public']['Tables']['facilities']['Row'];
type FacilityInsert = Database['public']['Tables']['facilities']['Insert'];

const facilitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  billing_name: z.string().optional(),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  physical_address: z.string().optional(),
  physical_city: z.string().optional(),
  physical_state: z.string().optional(),
  physical_zip: z.string().optional(),
  admin_contact_name: z.string().optional(),
  admin_contact_phone: z.string().optional(),
  admin_contact_email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'pending']),
  rate_business_hours: z.coerce.number().optional(),
  rate_after_hours: z.coerce.number().optional(),
  rate_mileage: z.coerce.number().optional(),
  minimum_billable_hours: z.coerce.number().default(2),
  emergency_fee: z.coerce.number().optional(),
  holiday_fee: z.coerce.number().optional(),
  invoice_prefix: z.string().optional(),
  billing_code: z.string().optional(),
  net_terms: z.coerce.number().default(30),
  contract_status: z.enum(['not_sent', 'sent', 'signed']),
  is_gsa: z.boolean(),
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
      status: 'pending',
      minimum_billable_hours: 2,
      net_terms: 30,
      contract_status: 'not_sent',
      is_gsa: false,
    },
  });

  useEffect(() => {
    if (facility) {
      form.reset({
        name: facility.name,
        billing_name: facility.billing_name || '',
        billing_address: facility.billing_address || '',
        billing_city: facility.billing_city || '',
        billing_state: facility.billing_state || '',
        billing_zip: facility.billing_zip || '',
        physical_address: facility.physical_address || '',
        physical_city: facility.physical_city || '',
        physical_state: facility.physical_state || '',
        physical_zip: facility.physical_zip || '',
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
        invoice_prefix: facility.invoice_prefix || '',
        billing_code: facility.billing_code || '',
        net_terms: facility.net_terms,
        contract_status: facility.contract_status,
        is_gsa: facility.is_gsa,
        notes: facility.notes || '',
      });
    } else {
      form.reset({
        name: '',
        status: 'pending',
        minimum_billable_hours: 2,
        net_terms: 30,
        contract_status: 'not_sent',
        is_gsa: false,
      });
    }
  }, [facility, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        billing_name: data.billing_name || null,
        billing_address: data.billing_address || null,
        billing_city: data.billing_city || null,
        billing_state: data.billing_state || null,
        billing_zip: data.billing_zip || null,
        physical_address: data.physical_address || null,
        physical_city: data.physical_city || null,
        physical_state: data.physical_state || null,
        physical_zip: data.physical_zip || null,
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
        invoice_prefix: data.invoice_prefix || null,
        billing_code: data.billing_code || null,
        net_terms: data.net_terms,
        contract_status: data.contract_status,
        is_gsa: data.is_gsa,
        notes: data.notes || null,
      };

      if (facility) {
        const { error } = await supabase
          .from('facilities')
          .update(payload as any)
          .eq('id', facility.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('facilities').insert(payload as any);
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
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_name">Billing Name</Label>
                <Input id="billing_name" {...form.register('billing_name')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="is_gsa"
                  checked={form.watch('is_gsa')}
                  onCheckedChange={(checked) => form.setValue('is_gsa', !!checked)}
                />
                <Label htmlFor="is_gsa">GSA Contract</Label>
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
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="space-y-4">
            <h3 className="font-semibold">Billing Address</h3>
            <div className="space-y-2">
              <Label htmlFor="billing_address">Address</Label>
              <Input id="billing_address" {...form.register('billing_address')} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_city">City</Label>
                <Input id="billing_city" {...form.register('billing_city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_state">State</Label>
                <Input id="billing_state" {...form.register('billing_state')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_zip">Zip</Label>
                <Input id="billing_zip" {...form.register('billing_zip')} />
              </div>
            </div>
          </div>

          {/* Physical Address */}
          <div className="space-y-4">
            <h3 className="font-semibold">Physical Address (for Job Locations)</h3>
            <div className="space-y-2">
              <Label htmlFor="physical_address">Address</Label>
              <Input id="physical_address" {...form.register('physical_address')} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="physical_city">City</Label>
                <Input id="physical_city" {...form.register('physical_city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="physical_state">State</Label>
                <Input id="physical_state" {...form.register('physical_state')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="physical_zip">Zip</Label>
                <Input id="physical_zip" {...form.register('physical_zip')} />
              </div>
            </div>
          </div>

          {/* Rates */}
          <div className="space-y-4">
            <h3 className="font-semibold">Rates (What We Charge)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate_business_hours">Business Hours ($/hr)</Label>
                <Input id="rate_business_hours" type="number" step="0.01" {...form.register('rate_business_hours')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate_after_hours">After Hours ($/hr)</Label>
                <Input id="rate_after_hours" type="number" step="0.01" {...form.register('rate_after_hours')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate_mileage">Mileage ($/mile)</Label>
                <Input id="rate_mileage" type="number" step="0.01" {...form.register('rate_mileage')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimum_billable_hours">Minimum Hours</Label>
                <Input id="minimum_billable_hours" type="number" step="0.5" {...form.register('minimum_billable_hours')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_fee">Emergency Fee ($)</Label>
                <Input id="emergency_fee" type="number" step="0.01" {...form.register('emergency_fee')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday_fee">Holiday Fee ($)</Label>
                <Input id="holiday_fee" type="number" step="0.01" {...form.register('holiday_fee')} />
              </div>
            </div>
          </div>

          {/* Billing Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold">Billing Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                <Input id="invoice_prefix" {...form.register('invoice_prefix')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_code">Billing Code</Label>
                <Input id="billing_code" {...form.register('billing_code')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="net_terms">Net Terms (days)</Label>
                <Input id="net_terms" type="number" {...form.register('net_terms')} />
              </div>
            </div>
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
              {mutation.isPending ? 'Saving...' : facility ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
