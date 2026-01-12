import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Copy, Plus, X } from 'lucide-react';
import { getTimezoneFromState, timezoneOptions } from '@/lib/timezone-utils';

const facilityTypeOptions = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'school', label: 'School' },
  { value: 'government', label: 'Government' },
  { value: 'business', label: 'Business' },
  { value: 'other', label: 'Other' },
] as const;

// Phone validation regex - allows formats like (123) 456-7890, 123-456-7890, 1234567890
const phoneRegex = /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/;

// Billing contact type
interface BillingContact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

const facilitySchema = z.object({
  name: z.string().min(1, 'Facility name is required'),
  facility_type: z.enum(['hospital', 'clinic', 'school', 'government', 'business', 'other']).optional().nullable(),
  billing_address: z.string().min(1, 'Address is required'),
  billing_city: z.string().min(1, 'City is required'),
  billing_state: z.string().min(1, 'State is required'),
  billing_zip: z.string().min(1, 'Zip is required'),
  physical_address: z.string().min(1, 'Address is required'),
  physical_city: z.string().min(1, 'City is required'),
  physical_state: z.string().min(1, 'State is required'),
  physical_zip: z.string().min(1, 'Zip is required'),
  timezone: z.string().optional().nullable(),
  rate_business_hours: z.coerce.number().min(0.01, 'Business rate is required'),
  rate_after_hours: z.coerce.number().min(0.01, 'After hours rate is required'),
  is_gsa: z.boolean(),
  contractor: z.boolean(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof facilitySchema>;

export default function NewFacility() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [billingContacts, setBillingContacts] = useState<BillingContact[]>([]);
  const [contactErrors, setContactErrors] = useState<Record<string, { phone?: string; email?: string }>>({});

  const form = useForm<FormData>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: '',
      facility_type: null,
      is_gsa: false,
      contractor: false,
    },
  });

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
    const newErrors: Record<string, { phone?: string; email?: string }> = {};

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

  const watchedPhysicalState = form.watch('physical_state');
  const detectedTimezone = getTimezoneFromState(watchedPhysicalState);

  // Auto-update timezone when physical state changes
  useEffect(() => {
    if (detectedTimezone) {
      form.setValue('timezone', detectedTimezone);
    }
  }, [detectedTimezone, form]);

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
      // Get primary billing contact (first one) for the main admin fields
      const primaryContact = billingContacts[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
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
        status: 'pending',
        rate_business_hours: data.rate_business_hours || null,
        rate_after_hours: data.rate_after_hours || null,
        minimum_billable_hours: 2,
        contract_status: 'not_sent',
        is_gsa: data.is_gsa,
        contractor: data.contractor,
        notes: data.notes || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newFacility, error } = await (supabase.from('facilities') as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return newFacility;
    },
    onSuccess: (newFacility) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast({ title: 'Facility created successfully' });
      navigate(`/facilities/${newFacility.id}`);
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

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-14 z-10 bg-background py-3 border-b -mx-6 px-6 -mt-6 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/facilities')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">New Facility</h1>

          <div className="ml-auto">
            <Button 
              type="submit" 
              form="new-facility-form"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Creating...' : 'Create Facility'}
            </Button>
          </div>
        </div>
      </div>

      <form id="new-facility-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <p className="text-sm text-muted-foreground">No billing contacts added yet. Click "Add Billing Contact" to add one.</p>
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
                      <Label>Name</Label>
                      <Input
                        value={contact.name}
                        onChange={(e) => updateBillingContact(contact.id, 'name', e.target.value)}
                        placeholder="Contact name"
                      />
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
                      <Label>Email</Label>
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
              placeholder="Additional notes about this facility..."
            />
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
