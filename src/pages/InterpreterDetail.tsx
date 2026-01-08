import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, ChevronsUpDown, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database';

type Interpreter = Database['public']['Tables']['interpreters']['Row'];

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

export default function InterpreterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedInterpreterId, setSelectedInterpreterId] = useState<string | null>(id || null);

  // Fetch all interpreters for the search
  const { data: interpreters } = useQuery({
    queryKey: ['interpreters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interpreters')
        .select('*')
        .order('last_name', { ascending: true });
      if (error) throw error;
      return data as Interpreter[];
    },
  });

  // Fetch the selected interpreter
  const { data: interpreter, isLoading } = useQuery({
    queryKey: ['interpreter', selectedInterpreterId],
    queryFn: async () => {
      if (!selectedInterpreterId) return null;
      const { data, error } = await supabase
        .from('interpreters')
        .select('*')
        .eq('id', selectedInterpreterId)
        .single();
      if (error) throw error;
      return data as Interpreter;
    },
    enabled: !!selectedInterpreterId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(interpreterSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
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

  // Update URL when interpreter changes
  useEffect(() => {
    if (selectedInterpreterId && selectedInterpreterId !== id) {
      navigate(`/interpreters/${selectedInterpreterId}`, { replace: true });
    }
  }, [selectedInterpreterId, id, navigate]);

  // Populate form when interpreter data loads
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
        status: interpreter.status || 'pending',
        rid_certified: interpreter.rid_certified ?? false,
        nic_certified: interpreter.nic_certified ?? false,
        other_certifications: interpreter.other_certifications || '',
        rate_business_hours: interpreter.rate_business_hours || undefined,
        rate_after_hours: interpreter.rate_after_hours || undefined,
        rate_mileage: interpreter.rate_mileage || undefined,
        minimum_hours: interpreter.minimum_hours || 2,
        eligible_emergency_fee: interpreter.eligible_emergency_fee ?? false,
        eligible_holiday_fee: interpreter.eligible_holiday_fee ?? false,
        payment_method: interpreter.payment_method,
        payment_details: interpreter.payment_details || '',
        contract_status: interpreter.contract_status || 'not_sent',
        w9_received: interpreter.w9_received ?? false,
        notes: interpreter.notes || '',
      });
    }
  }, [interpreter, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedInterpreterId) return;

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
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('interpreters') as any)
        .update(payload)
        .eq('id', selectedInterpreterId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interpreters'] });
      queryClient.invalidateQueries({ queryKey: ['interpreter', selectedInterpreterId] });
      toast({ title: 'Interpreter updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const selectedInterpreter = interpreters?.find(i => i.id === selectedInterpreterId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/interpreters')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Interpreter Details</h1>
          <p className="text-muted-foreground">View and edit interpreter information</p>
        </div>
      </div>

      {/* Interpreter Search/Select */}
      <Card>
        <CardHeader>
          <CardTitle>Select Interpreter</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={searchOpen}
                className="w-full max-w-md justify-between"
              >
                {selectedInterpreter
                  ? `${selectedInterpreter.first_name} ${selectedInterpreter.last_name}`
                  : "Search for an interpreter..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full max-w-md p-0">
              <Command>
                <CommandInput placeholder="Search interpreters..." />
                <CommandList>
                  <CommandEmpty>No interpreter found.</CommandEmpty>
                  <CommandGroup>
                    {interpreters?.map((i) => (
                      <CommandItem
                        key={i.id}
                        value={`${i.first_name} ${i.last_name}`}
                        onSelect={() => {
                          setSelectedInterpreterId(i.id);
                          setSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedInterpreterId === i.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {i.first_name} {i.last_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Interpreter Details Form */}
      {isLoading && selectedInterpreterId && (
        <div className="text-muted-foreground">Loading interpreter details...</div>
      )}

      {interpreter && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
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
                  <Input id="phone" {...form.register('phone')} />
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
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" {...form.register('timezone')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
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
                  <Input id="zip_code" {...form.register('zip_code')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
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
            <CardHeader>
              <CardTitle>Rates (What We Pay)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Payment & Contract */}
          <Card>
            <CardHeader>
              <CardTitle>Payment & Contract</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea id="notes" {...form.register('notes')} rows={4} />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
