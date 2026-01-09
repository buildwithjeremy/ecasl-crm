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
import { ArrowLeft, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/types/database';

type Facility = Database['public']['Tables']['facilities']['Row'];

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
  contractor: z.boolean(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof facilitySchema>;

const statusLabels: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
};

export default function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(id || null);

  // Fetch all facilities for the search
  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Facility[];
    },
  });

  // Fetch the selected facility
  const { data: facility, isLoading } = useQuery({
    queryKey: ['facility', selectedFacilityId],
    queryFn: async () => {
      if (!selectedFacilityId) return null;
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', selectedFacilityId)
        .single();
      if (error) throw error;
      return data as Facility;
    },
    enabled: !!selectedFacilityId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: '',
      status: 'pending',
      minimum_billable_hours: 2,
      net_terms: 30,
      contract_status: 'not_sent',
      is_gsa: false,
      contractor: false,
    },
  });

  // Update URL when facility changes
  useEffect(() => {
    if (selectedFacilityId && selectedFacilityId !== id) {
      navigate(`/facilities/${selectedFacilityId}`, { replace: true });
    }
  }, [selectedFacilityId, id, navigate]);

  // Populate form when facility data loads
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
        status: facility.status || 'pending',
        rate_business_hours: facility.rate_business_hours || undefined,
        rate_after_hours: facility.rate_after_hours || undefined,
        rate_mileage: facility.rate_mileage || undefined,
        minimum_billable_hours: facility.minimum_billable_hours || 2,
        emergency_fee: facility.emergency_fee || undefined,
        holiday_fee: facility.holiday_fee || undefined,
        invoice_prefix: facility.invoice_prefix || '',
        billing_code: facility.billing_code || '',
        net_terms: facility.net_terms || 30,
        contract_status: facility.contract_status || 'not_sent',
        is_gsa: facility.is_gsa || false,
        contractor: facility.contractor ?? false,
        notes: facility.notes || '',
      });
    }
  }, [facility, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedFacilityId) return;
      
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
        contractor: data.contractor,
        notes: data.notes || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('facilities') as any)
        .update(payload)
        .eq('id', selectedFacilityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', selectedFacilityId] });
      form.reset(form.getValues());
      toast({ title: 'Facility updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const selectedFacility = facilities?.find(f => f.id === selectedFacilityId);

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-14 z-10 bg-background py-3 border-b -mx-6 px-6 -mt-6 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/facilities')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {facility?.name || 'Facility Details'}
          </h1>
          
          {/* Compact Facility Selector */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[200px] justify-between text-sm"
              >
                {selectedFacility?.name || 'Select facility...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search facilities..." />
                <CommandList>
                  <CommandEmpty>No facility found.</CommandEmpty>
                  <CommandGroup>
                    {facilities?.map((f) => (
                      <CommandItem
                        key={f.id}
                        value={f.name}
                        onSelect={() => {
                          setSelectedFacilityId(f.id);
                          setSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedFacilityId === f.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {f.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {facility?.status && (
            <Badge variant="secondary">{statusLabels[facility.status]}</Badge>
          )}

          {/* Save button in header with unsaved indicator */}
          {facility && (
            <div className="ml-auto flex items-center gap-2">
              {form.formState.isDirty && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Unsaved
                </span>
              )}
              <Button 
                type="submit" 
                form="facility-detail-form"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {isLoading && selectedFacilityId && (
        <div className="text-muted-foreground">Loading facility details...</div>
      )}

      {facility && (
        <form id="facility-detail-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    onValueChange={(value) => form.setValue('status', value as 'active' | 'inactive' | 'pending', { shouldDirty: true })}
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
                <div className="flex items-center gap-6 pt-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_gsa"
                      checked={form.watch('is_gsa')}
                      onCheckedChange={(checked) => form.setValue('is_gsa', !!checked, { shouldDirty: true })}
                    />
                    <Label htmlFor="is_gsa">GSA Contract</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="contractor"
                      checked={form.watch('contractor')}
                      onCheckedChange={(checked) => form.setValue('contractor', !!checked, { shouldDirty: true })}
                    />
                    <Label htmlFor="contractor">Contractor</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Contact */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Admin Contact</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Billing Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Physical Address */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Physical Address (for Job Locations)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Rates */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Rates (What We Charge)</CardTitle>
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
                  <Label htmlFor="minimum_billable_hours">Minimum Billable Hours</Label>
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
            </CardContent>
          </Card>

          {/* Billing Settings */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Billing Settings</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Contract Status */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="contract_status">Contract Status</Label>
                <Select
                  value={form.watch('contract_status')}
                  onValueChange={(value) => form.setValue('contract_status', value as 'not_sent' | 'sent' | 'signed', { shouldDirty: true })}
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
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea id="notes" {...form.register('notes')} rows={4} />
            </CardContent>
          </Card>
        </form>
      )}

      {!selectedFacilityId && (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">Select a facility to view details.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}