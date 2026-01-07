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

type Interpreter = Database['public']['Tables']['interpreters']['Row'];
type InterpreterInsert = Database['public']['Tables']['interpreters']['Insert'];
type InterpreterUpdate = Database['public']['Tables']['interpreters']['Update'];

const interpreterSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  timezone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
  rid_certified: z.boolean(),
  nic_certified: z.boolean(),
  other_certifications: z.string().optional(),
  rate_business_hours: z.coerce.number().optional(),
  rate_after_hours: z.coerce.number().optional(),
  rate_mileage: z.coerce.number().optional(),
  minimum_hours: z.coerce.number().default(2),
  eligible_emergency_fee: z.boolean(),
  eligible_holiday_fee: z.boolean(),
  payment_method: z.enum(['zelle', 'check']).nullable().optional(),
  payment_details: z.string().optional(),
  contract_status: z.enum(['not_sent', 'sent', 'signed']),
  w9_received: z.boolean(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof interpreterSchema>;

interface InterpreterDialogProps {
  open: boolean;
  onOpenChange: () => void;
  interpreter: Interpreter | null;
}

export function InterpreterDialog({ open, onOpenChange, interpreter }: InterpreterDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(interpreterSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      status: 'pending',
      rid_certified: false,
      nic_certified: false,
      minimum_hours: 2,
      eligible_emergency_fee: false,
      eligible_holiday_fee: false,
      contract_status: 'not_sent',
      w9_received: false,
    },
  });

  useEffect(() => {
    if (interpreter) {
      form.reset({
        first_name: interpreter.first_name,
        last_name: interpreter.last_name,
        email: interpreter.email,
        phone: interpreter.phone || '',
        address: interpreter.address || '',
        city: interpreter.city || '',
        state: interpreter.state || '',
        zip_code: interpreter.zip_code || '',
        timezone: interpreter.timezone || '',
        status: interpreter.status,
        rid_certified: interpreter.rid_certified,
        nic_certified: interpreter.nic_certified,
        other_certifications: interpreter.other_certifications || '',
        rate_business_hours: interpreter.rate_business_hours || undefined,
        rate_after_hours: interpreter.rate_after_hours || undefined,
        rate_mileage: interpreter.rate_mileage || undefined,
        minimum_hours: interpreter.minimum_hours,
        eligible_emergency_fee: interpreter.eligible_emergency_fee,
        eligible_holiday_fee: interpreter.eligible_holiday_fee,
        payment_method: interpreter.payment_method,
        payment_details: interpreter.payment_details || '',
        contract_status: interpreter.contract_status,
        w9_received: interpreter.w9_received,
        notes: interpreter.notes || '',
      });
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        status: 'pending',
        rid_certified: false,
        nic_certified: false,
        minimum_hours: 2,
        eligible_emergency_fee: false,
        eligible_holiday_fee: false,
        contract_status: 'not_sent',
        w9_received: false,
      });
    }
  }, [interpreter, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        timezone: data.timezone || null,
        status: data.status,
        rid_certified: data.rid_certified,
        nic_certified: data.nic_certified,
        other_certifications: data.other_certifications || null,
        rate_business_hours: data.rate_business_hours || null,
        rate_after_hours: data.rate_after_hours || null,
        rate_mileage: data.rate_mileage || null,
        minimum_hours: data.minimum_hours,
        eligible_emergency_fee: data.eligible_emergency_fee,
        eligible_holiday_fee: data.eligible_holiday_fee,
        payment_method: data.payment_method || null,
        payment_details: data.payment_details || null,
        contract_status: data.contract_status,
        w9_received: data.w9_received,
        notes: data.notes || null,
      } satisfies InterpreterInsert;

      if (interpreter) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('interpreters') as any)
          .update(payload)
          .eq('id', interpreter.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('interpreters') as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interpreters'] });
      toast({ title: `Interpreter ${interpreter ? 'updated' : 'created'} successfully` });
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
          <DialogTitle>{interpreter ? 'Edit Interpreter' : 'New Interpreter'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input id="first_name" {...form.register('first_name')} />
                {form.formState.errors.first_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input id="last_name" {...form.register('last_name')} />
                {form.formState.errors.last_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...form.register('phone')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...form.register('address')} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...form.register('city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...form.register('state')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">Zip Code</Label>
                <Input id="zip_code" {...form.register('zip_code')} />
              </div>
            </div>

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
          </div>

          {/* Certifications */}
          <div className="space-y-4">
            <h3 className="font-semibold">Certifications</h3>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rid_certified"
                  checked={form.watch('rid_certified')}
                  onCheckedChange={(checked) => form.setValue('rid_certified', !!checked)}
                />
                <Label htmlFor="rid_certified">RID Certified</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="nic_certified"
                  checked={form.watch('nic_certified')}
                  onCheckedChange={(checked) => form.setValue('nic_certified', !!checked)}
                />
                <Label htmlFor="nic_certified">NIC Certified</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="other_certifications">Other Certifications</Label>
              <Input id="other_certifications" {...form.register('other_certifications')} />
            </div>
          </div>

          {/* Rates */}
          <div className="space-y-4">
            <h3 className="font-semibold">Rates (What We Pay)</h3>
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
                <Label htmlFor="minimum_hours">Minimum Hours</Label>
                <Input id="minimum_hours" type="number" step="0.5" {...form.register('minimum_hours')} />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="eligible_emergency_fee"
                  checked={form.watch('eligible_emergency_fee')}
                  onCheckedChange={(checked) => form.setValue('eligible_emergency_fee', !!checked)}
                />
                <Label htmlFor="eligible_emergency_fee">Eligible for Emergency Fee</Label>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="eligible_holiday_fee"
                  checked={form.watch('eligible_holiday_fee')}
                  onCheckedChange={(checked) => form.setValue('eligible_holiday_fee', !!checked)}
                />
                <Label htmlFor="eligible_holiday_fee">Eligible for Holiday Fee</Label>
              </div>
            </div>
          </div>

          {/* Payment & Contract */}
          <div className="space-y-4">
            <h3 className="font-semibold">Payment & Contract</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={form.watch('payment_method') || ''}
                  onValueChange={(value) => form.setValue('payment_method', value as 'zelle' | 'check' | null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_details">Payment Details</Label>
                <Input id="payment_details" {...form.register('payment_details')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contract_status">Contract Status</Label>
                <Select
                  value={form.watch('contract_status')}
                  onValueChange={(value) => form.setValue('contract_status', value as 'not_sent' | 'sent' | 'signed')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_sent">Not Sent</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="w9_received"
                  checked={form.watch('w9_received')}
                  onCheckedChange={(checked) => form.setValue('w9_received', !!checked)}
                />
                <Label htmlFor="w9_received">W9 Received</Label>
              </div>
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
              {mutation.isPending ? 'Saving...' : interpreter ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
