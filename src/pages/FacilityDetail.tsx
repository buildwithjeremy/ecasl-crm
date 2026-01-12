import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnsavedChangesWarning, UnsavedChangesDialog } from '@/hooks/use-unsaved-changes-warning';
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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, ChevronsUpDown, Trash2, Copy, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTimezoneFromState, timezoneOptions } from '@/lib/timezone-utils';
import { FacilityContractSection } from '@/components/facilities/FacilityContractSection';
import type { Database } from '@/types/database';

type Facility = Database['public']['Tables']['facilities']['Row'];

// Phone validation regex - allows formats like (123) 456-7890, 123-456-7890, 1234567890
const phoneRegex = /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/;

// Billing contact type
interface BillingContact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

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
  
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  physical_address: z.string().optional(),
  physical_city: z.string().optional(),
  physical_state: z.string().optional(),
  physical_zip: z.string().optional(),
  timezone: z.string().optional().nullable(),
  admin_contact_name: z.string().optional(),
  admin_contact_phone: z.string().optional(),
  admin_contact_email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'pending']),
  rate_business_hours: z.coerce.number().optional(),
  rate_after_hours: z.coerce.number().optional(),
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

export default function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(id || null);
  const [billingContacts, setBillingContacts] = useState<BillingContact[]>([]);
  const [contactErrors, setContactErrors] = useState<Record<string, { name?: string; phone?: string; email?: string }>>({});

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
      facility_type: null,
      status: 'pending',
      minimum_billable_hours: 2,
      contract_status: 'not_sent',
      is_gsa: false,
      contractor: false,
    },
  });

  // Unsaved changes warning
  const blocker = useUnsavedChangesWarning({ isDirty: form.formState.isDirty });

  const watchedPhysicalState = form.watch('physical_state');
  const detectedTimezone = getTimezoneFromState(watchedPhysicalState);

  // Auto-update timezone when physical state changes (only mark dirty if user changed the state)
  useEffect(() => {
    if (detectedTimezone && form.formState.dirtyFields.physical_state) {
      form.setValue('timezone', detectedTimezone, { shouldDirty: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedTimezone]);

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
        facility_type: (facility as any).facility_type || null,
        
        billing_address: facility.billing_address ?? '',
        billing_city: facility.billing_city ?? '',
        billing_state: facility.billing_state ?? '',
        billing_zip: facility.billing_zip ?? '',
        physical_address: facility.physical_address ?? '',
        physical_city: facility.physical_city ?? '',
        physical_state: facility.physical_state ?? '',
        physical_zip: facility.physical_zip ?? '',
        timezone: (facility as any).timezone ?? null,
        admin_contact_name: facility.admin_contact_name ?? '',
        admin_contact_phone: facility.admin_contact_phone ?? '',
        admin_contact_email: facility.admin_contact_email ?? '',
        status: facility.status ?? 'pending',
        rate_business_hours: facility.rate_business_hours ?? undefined,
        rate_after_hours: facility.rate_after_hours ?? undefined,
        minimum_billable_hours: facility.minimum_billable_hours ?? 2,
        emergency_fee: facility.emergency_fee ?? undefined,
        holiday_fee: facility.holiday_fee ?? undefined,
        billing_code: facility.billing_code ?? '',
        contract_status: facility.contract_status ?? 'not_sent',
        is_gsa: facility.is_gsa ?? false,
        contractor: facility.contractor ?? false,
        notes: facility.notes ?? '',
      }, { keepDefaultValues: false });

      // Populate billing contacts from existing admin contact data
      if (facility.admin_contact_name || facility.admin_contact_phone || facility.admin_contact_email) {
        setBillingContacts([{
          id: crypto.randomUUID(),
          name: facility.admin_contact_name ?? '',
          phone: facility.admin_contact_phone ?? '',
          email: facility.admin_contact_email ?? '',
        }]);
      } else {
        setBillingContacts([]);
      }
      setContactErrors({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility]);

  const copyBillingToPhysical = () => {
    const billingAddress = form.getValues('billing_address');
    const billingCity = form.getValues('billing_city');
    const billingState = form.getValues('billing_state');
    const billingZip = form.getValues('billing_zip');

    form.setValue('physical_address', billingAddress || '', { shouldDirty: true });
    form.setValue('physical_city', billingCity || '', { shouldDirty: true });
    form.setValue('physical_state', billingState || '', { shouldDirty: true });
    form.setValue('physical_zip', billingZip || '', { shouldDirty: true });
  };

  // Billing contacts management
  const addBillingContact = () => {
    setBillingContacts([
      ...billingContacts,
      { id: crypto.randomUUID(), name: '', phone: '', email: '' }
    ]);
  };

  const removeBillingContact = (id: string) => {
    setBillingContacts(billingContacts.filter(c => c.id !== id));
    setContactErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  };

  const updateBillingContact = (id: string, field: keyof Omit<BillingContact, 'id'>, value: string) => {
    setBillingContacts(billingContacts.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));

    // Validate on change
    if (field === 'phone' && value) {
      if (!phoneRegex.test(value)) {
        setContactErrors(prev => ({
          ...prev,
          [id]: { ...prev[id], phone: 'Please enter a valid phone number' }
        }));
      } else {
        setContactErrors(prev => ({
          ...prev,
          [id]: { ...prev[id], phone: undefined }
        }));
      }
    }

    if (field === 'email' && value) {
      if (!z.string().email().safeParse(value).success) {
        setContactErrors(prev => ({
          ...prev,
          [id]: { ...prev[id], email: 'Please enter a valid email address' }
        }));
      } else {
        setContactErrors(prev => ({
          ...prev,
          [id]: { ...prev[id], email: undefined }
        }));
      }
    }
  };

  const validateContacts = (): boolean => {
    let valid = true;
    const newErrors: Record<string, { name?: string; phone?: string; email?: string }> = {};

    // Check if at least one contact exists
    if (billingContacts.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one billing contact with name and email is required',
        variant: 'destructive',
      });
      return false;
    }

    // First contact must have name and email (primary contact)
    const primaryContact = billingContacts[0];
    if (!primaryContact.name || primaryContact.name.trim() === '') {
      newErrors[primaryContact.id] = { ...newErrors[primaryContact.id], name: 'Name is required for primary contact' };
      valid = false;
    }
    if (!primaryContact.email || primaryContact.email.trim() === '') {
      newErrors[primaryContact.id] = { ...newErrors[primaryContact.id], email: 'Email is required for primary contact' };
      valid = false;
    }

    billingContacts.forEach(contact => {
      if (contact.phone && !phoneRegex.test(contact.phone)) {
        newErrors[contact.id] = { ...newErrors[contact.id], phone: 'Please enter a valid phone number' };
        valid = false;
      }
      if (contact.email && !z.string().email().safeParse(contact.email).success) {
        newErrors[contact.id] = { ...newErrors[contact.id], email: 'Please enter a valid email address' };
        valid = false;
      }
    });

    setContactErrors(newErrors);
    return valid;
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedFacilityId) return;
      
      // Get primary billing contact (first one) for the main admin fields
      const primaryContact = billingContacts[0];
      
      const payload = {
        name: data.name,
        facility_type: data.facility_type || null,
        
        billing_address: data.billing_address || null,
        billing_city: data.billing_city || null,
        billing_state: data.billing_state || null,
        billing_zip: data.billing_zip || null,
        physical_address: data.physical_address || null,
        physical_city: data.physical_city || null,
        physical_state: data.physical_state || null,
        physical_zip: data.physical_zip || null,
        timezone: data.timezone || null,
        admin_contact_name: primaryContact?.name || null,
        admin_contact_phone: primaryContact?.phone || null,
        admin_contact_email: primaryContact?.email || null,
        status: data.status,
        rate_business_hours: data.rate_business_hours ?? null,
        rate_after_hours: data.rate_after_hours ?? null,
        minimum_billable_hours: data.minimum_billable_hours,
        emergency_fee: data.emergency_fee ?? null,
        holiday_fee: data.holiday_fee ?? null,
        billing_code: data.billing_code || null,
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
    if (!validateContacts()) {
      toast({ title: 'Please fix validation errors', variant: 'destructive' });
      return;
    }
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
                <span className="truncate">
                  {selectedFacility?.name || 'Select facility...'}
                </span>
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

          {/* Save and Delete buttons in header */}
          {facility && (
            <div className="ml-auto flex items-center gap-2">
              {form.formState.isDirty && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Unsaved
                </span>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Facility</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {facility.name}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const { error } = await supabase.from('facilities').delete().eq('id', facility.id);
                        if (error) {
                          toast({ title: 'Error deleting facility', description: error.message, variant: 'destructive' });
                        } else {
                          toast({ title: 'Facility deleted successfully' });
                          navigate('/facilities');
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
                  <Label htmlFor="name">Facility Name *</Label>
                  <Input id="name" {...form.register('name')} />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facility_type">Facility Type</Label>
                        <Select
                          value={form.watch('facility_type') || undefined}
                          onValueChange={(value) => form.setValue('facility_type', value as FormData['facility_type'], { shouldDirty: true })}
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

              <div className="flex items-center gap-6">
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
            </CardContent>
          </Card>

          {/* Billing Contacts */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Billing Contacts</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBillingContact}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Billing Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {billingContacts.length === 0 ? (
                <p className="text-sm text-destructive">At least one billing contact with name and email is required. Click "Add Billing Contact" to add one.</p>
              ) : (
                billingContacts.map((contact, index) => (
                  <div key={contact.id} className="space-y-3">
                    {index > 0 && <div className="border-t pt-4" />}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {index === 0 ? 'Primary Contact' : `Contact ${index + 1}`}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBillingContact(contact.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>
                          Name {index === 0 && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          value={contact.name}
                          onChange={(e) => updateBillingContact(contact.id, 'name', e.target.value)}
                          placeholder="Contact name"
                          className={contactErrors[contact.id]?.name ? 'border-destructive' : ''}
                        />
                        {contactErrors[contact.id]?.name && (
                          <p className="text-sm text-destructive">{contactErrors[contact.id].name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={contact.phone}
                          onChange={(e) => updateBillingContact(contact.id, 'phone', e.target.value)}
                          placeholder="(555) 123-4567"
                          className={contactErrors[contact.id]?.phone ? 'border-destructive' : ''}
                        />
                        {contactErrors[contact.id]?.phone && (
                          <p className="text-sm text-destructive">{contactErrors[contact.id].phone}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>
                          Email {index === 0 && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          type="email"
                          value={contact.email}
                          onChange={(e) => updateBillingContact(contact.id, 'email', e.target.value)}
                          placeholder="email@example.com"
                          className={contactErrors[contact.id]?.email ? 'border-destructive' : ''}
                        />
                        {contactErrors[contact.id]?.email && (
                          <p className="text-sm text-destructive">{contactErrors[contact.id].email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Physical Address (for Job Locations)</CardTitle>
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
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={form.watch('timezone') || ''}
                  onValueChange={(value) => form.setValue('timezone', value, { shouldDirty: true })}
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
            </CardContent>
          </Card>

          {/* Rates */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Rates (What We Charge)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate_business_hours">Business Hours Rate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="rate_business_hours"
                      type="number"
                      step="0.01"
                      className="pl-7"
                      {...form.register('rate_business_hours', { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate_after_hours">After Hours Rate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="rate_after_hours"
                      type="number"
                      step="0.01"
                      className="pl-7"
                      {...form.register('rate_after_hours', { valueAsNumber: true })}
                    />
                  </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_code">Billing Code/PO Number</Label>
                  <Input id="billing_code" {...form.register('billing_code')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Section with PDF Generation */}
          <FacilityContractSection
            form={form}
            facility={{ 
              id: facility.id, 
              contract_pdf_url: (facility as any).contract_pdf_url,
              signed_contract_pdf_url: (facility as any).signed_contract_pdf_url
            }}
            onContractGenerated={() => {
              queryClient.invalidateQueries({ queryKey: ['facility', selectedFacilityId] });
            }}
          />

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

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
