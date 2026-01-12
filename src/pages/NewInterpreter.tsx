import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useUnsavedChangesWarning, UnsavedChangesDialog } from '@/hooks/use-unsaved-changes-warning';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const interpreterSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().refine(
    val => !val || /^(\+1)?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(val.replace(/\s/g, '')),
    'Please enter a valid phone number'
  ),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional().refine(
    val => !val || /^\d{5}(-\d{4})?$/.test(val),
    'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)'
  ),
  rid_certified: z.boolean(),
  nic_certified: z.boolean(),
  other_certifications: z.string().optional(),
  rate_business_hours: z.coerce.number().min(0.01, 'Business hours rate is required'),
  rate_after_hours: z.coerce.number().min(0.01, 'After hours rate is required'),
  payment_method: z.enum(['zelle', 'check'], { required_error: 'Payment method is required' }),
  payment_details: z.string().optional(),
  w9_received: z.boolean(),
  insurance_end_date: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof interpreterSchema>;

export default function NewInterpreter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(interpreterSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      rid_certified: false,
      nic_certified: false,
      w9_received: false,
      insurance_end_date: null,
    },
  });

  // Unsaved changes warning
  const blocker = useUnsavedChangesWarning({ isDirty: form.formState.isDirty });

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
        status: 'pending',
        rid_certified: data.rid_certified,
        nic_certified: data.nic_certified,
        other_certifications: data.other_certifications || null,
        rate_business_hours: data.rate_business_hours || null,
        rate_after_hours: data.rate_after_hours || null,
        minimum_hours: 2,
        eligible_emergency_fee: false,
        eligible_holiday_fee: false,
        payment_method: data.payment_method || null,
        payment_details: data.payment_details || null,
        contract_status: 'not_sent',
        w9_received: data.w9_received,
        insurance_end_date: data.insurance_end_date ? format(data.insurance_end_date, 'yyyy-MM-dd') : null,
        notes: data.notes || null,
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newInterpreter, error } = await (supabase.from('interpreters') as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return newInterpreter;
    },
    onSuccess: (newInterpreter) => {
      queryClient.invalidateQueries({ queryKey: ['interpreters'] });
      toast({ title: 'Interpreter created successfully' });
      navigate(`/interpreters/${newInterpreter.id}`);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-14 z-10 bg-background py-3 border-b -mx-6 px-6 -mt-6 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/interpreters')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">New Interpreter</h1>

          <div className="ml-auto">
            <Button 
              type="submit" 
              form="new-interpreter-form"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Creating...' : 'Create Interpreter'}
            </Button>
          </div>
        </div>
      </div>

      <form id="new-interpreter-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <Input id="phone" {...form.register('phone')} placeholder="(555) 123-4567" />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
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
                <Input id="zip_code" {...form.register('zip_code')} placeholder="12345" />
                {form.formState.errors.zip_code && (
                  <p className="text-sm text-destructive">{form.formState.errors.zip_code.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Certifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Rates */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Rates (What We Pay)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate_business_hours">Business Hours Rate *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input id="rate_business_hours" type="number" step="0.01" className="pl-7" {...form.register('rate_business_hours')} />
                </div>
                {form.formState.errors.rate_business_hours && (
                  <p className="text-sm text-destructive">{form.formState.errors.rate_business_hours.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate_after_hours">After Hours Rate *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input id="rate_after_hours" type="number" step="0.01" className="pl-7" {...form.register('rate_after_hours')} />
                </div>
                {form.formState.errors.rate_after_hours && (
                  <p className="text-sm text-destructive">{form.formState.errors.rate_after_hours.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment & Contract */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Payment & Contract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select
                  value={form.watch('payment_method') || ''}
                  onValueChange={(value) => form.setValue('payment_method', value as 'zelle' | 'check')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.payment_method && (
                  <p className="text-sm text-destructive">{form.formState.errors.payment_method.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_details">Payment Details</Label>
                <Input id="payment_details" {...form.register('payment_details')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="w9_received"
                  checked={form.watch('w9_received')}
                  onCheckedChange={(checked) => form.setValue('w9_received', !!checked)}
                />
                <Label htmlFor="w9_received">W9 Received</Label>
              </div>
              <div className="space-y-2">
                <Label>Insurance End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.watch('insurance_end_date') && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('insurance_end_date') 
                        ? format(form.watch('insurance_end_date')!, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('insurance_end_date') || undefined}
                      onSelect={(date) => form.setValue('insurance_end_date', date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              {...form.register('notes')}
              rows={4}
              placeholder="Additional notes about this interpreter..."
            />
          </CardContent>
        </Card>
      </form>

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
