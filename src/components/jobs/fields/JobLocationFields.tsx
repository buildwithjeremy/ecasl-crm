import { useEffect, useRef } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, User, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormMode, LOCATION_TYPES, US_STATES } from '@/lib/schemas/shared';
import type { FacilityOption } from './JobCoreFields';

// Sentinel for state selector (empty state = unselected)
const STATE_NONE = '';

// ==========================================
// Types
// ==========================================

interface JobLocationFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
  selectedFacility?: FacilityOption | null;
}

// ==========================================
// Component
// ==========================================

export function JobLocationFields({
  form,
  mode,
  disabled = false,
  selectedFacility,
}: JobLocationFieldsProps) {
  const watchedLocationType = form.watch('location_type');
  const watchedFacilityId = form.watch('facility_id');
  const isContractor = selectedFacility?.contractor ?? false;

  // Prevent auto-fill from marking form dirty on initial load / resets
  const prevFacilityIdRef = useRef<string | null>(null);
  const prevLocationTypeRef = useRef<string | null>(null);

  // Auto-fill location and client info when facility changes
  useEffect(() => {
    if (!watchedFacilityId || !selectedFacility) return;

    const isInitial = prevFacilityIdRef.current === null;
    const facilityChanged = !isInitial && watchedFacilityId !== prevFacilityIdRef.current;
    const locationTypeChanged = !isInitial && watchedLocationType !== prevLocationTypeRef.current;

    // For contractors in edit mode, never auto-clear fields - the job already has saved values
    // Only clear fields for contractors in create mode when facility first selected
    const isEditMode = mode === 'edit';
    
    // Only run auto-fill logic when facility actually changes (not on initial load in edit mode)
    // In edit mode, form is already populated with job data, so don't overwrite it
    const shouldAutoFill = isEditMode ? facilityChanged : (isInitial || facilityChanged);
    
    if (!shouldAutoFill) {
      // Just update refs without modifying fields
      prevFacilityIdRef.current = watchedFacilityId;
      prevLocationTypeRef.current = watchedLocationType;
      return;
    }

    const shouldDirty = facilityChanged || locationTypeChanged;

    const setIfDifferent = (name: string, next: any) => {
      const current = form.getValues(name);
      if (current !== next) {
        form.setValue(name as any, next, { shouldDirty });
      }
    };

    if (!selectedFacility.contractor) {
      // Non-contractor: auto-fill client info and location from facility
      // Get primary billing contact
      const primaryContact = selectedFacility.billing_contacts?.[0];
      
      setIfDifferent('client_business_name', selectedFacility.name || '');
      setIfDifferent('client_contact_name', primaryContact?.name || '');
      setIfDifferent('client_contact_phone', primaryContact?.phone || '');
      setIfDifferent('client_contact_email', primaryContact?.email || '');

      if (watchedLocationType === 'in_person') {
        const address = selectedFacility.physical_address || selectedFacility.billing_address;
        const city = selectedFacility.physical_city || selectedFacility.billing_city;
        const state = selectedFacility.physical_state || selectedFacility.billing_state;
        const zip = selectedFacility.physical_zip || selectedFacility.billing_zip;

        setIfDifferent('location_address', address || '');
        setIfDifferent('location_city', city || '');
        setIfDifferent('location_state', state || '');
        setIfDifferent('location_zip', zip || '');
      }
    } else if (shouldAutoFill && !isEditMode) {
      // Contractor in CREATE mode: clear fields when facility is selected
      // This ensures clean slate for manual entry
      setIfDifferent('client_business_name', '');
      setIfDifferent('client_contact_name', '');
      setIfDifferent('client_contact_phone', '');
      setIfDifferent('client_contact_email', '');
      setIfDifferent('location_address', '');
      setIfDifferent('location_city', '');
      setIfDifferent('location_state', '');
      setIfDifferent('location_zip', '');
    }
    // For contractors in EDIT mode when facility changes, also clear for new entry
    else if (facilityChanged && isEditMode) {
      setIfDifferent('client_business_name', '');
      setIfDifferent('client_contact_name', '');
      setIfDifferent('client_contact_phone', '');
      setIfDifferent('client_contact_email', '');
      setIfDifferent('location_address', '');
      setIfDifferent('location_city', '');
      setIfDifferent('location_state', '');
      setIfDifferent('location_zip', '');
    }

    prevFacilityIdRef.current = watchedFacilityId;
    prevLocationTypeRef.current = watchedLocationType;
  }, [watchedFacilityId, watchedLocationType, selectedFacility, form, mode]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Client & Location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location Type - Using Controller for consistent controlled state */}
        <div className="space-y-2">
          <Label>Location Type</Label>
          <Controller
            control={form.control}
            name="location_type"
            render={({ field }) => (
              <Select
                value={field.value || 'in_person'}
                onValueChange={(value) => {
                  field.onChange(value as 'in_person' | 'remote');
                }}
                disabled={disabled}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Deaf Client Name */}
        <div className="space-y-2">
          <Label htmlFor="deaf_client_name">Deaf Client Name</Label>
          <Input
            id="deaf_client_name"
            disabled={disabled}
            {...form.register('deaf_client_name')}
          />
        </div>

        {watchedLocationType === 'in_person' ? (
          <>
            {/* Contractor Card */}
            {selectedFacility && isContractor && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedFacility.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">Contractor</Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/facilities/${selectedFacility.id}`, '_blank')}
                    className="text-muted-foreground hover:text-foreground -mr-2"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Facility
                  </Button>
                </div>
              </div>
            )}

            {/* Facility Information Card - Only show when facility is selected */}
            {selectedFacility && (
              <div className="rounded-lg border p-4 space-y-4">
                {/* Header with View Facility link - only for non-contractors */}
                {!isContractor && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Facility Information</span>
                      <Badge variant="secondary" className="text-xs">
                        <Building2 className="h-3 w-3 mr-1" />
                        From Facility
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/facilities/${selectedFacility.id}`, '_blank')}
                      className="text-muted-foreground hover:text-foreground -mr-2"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Facility
                    </Button>
                  </div>
                )}

                {/* Client Contact Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {isContractor ? 'Client Contact (for this job)' : 'Client Contact'}
                    </span>
                  </div>

                  {!isContractor ? (
                    // Non-contractor: Show read-only client info
                    (() => {
                      const primaryContact = selectedFacility.billing_contacts?.[0];
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Business Name</span>
                            <p className="font-medium">{selectedFacility.name || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Contact Name</span>
                            <p className="font-medium">{primaryContact?.name || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email</span>
                            <p className="font-medium">{primaryContact?.email || '-'}</p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    // Contractor: Editable client info
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="client_business_name">Business Name</Label>
                        <Input
                          id="client_business_name"
                          disabled={disabled}
                          {...form.register('client_business_name')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client_contact_name">Contact Name</Label>
                        <Input
                          id="client_contact_name"
                          disabled={disabled}
                          {...form.register('client_contact_name')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client_contact_email">Email</Label>
                        <Input
                          id="client_contact_email"
                          type="email"
                          disabled={disabled}
                          className={cn(form.formState.errors.client_contact_email && "border-destructive")}
                          {...form.register('client_contact_email')}
                        />
                        {form.formState.errors.client_contact_email && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.client_contact_email.message as string}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client_contact_phone">Phone</Label>
                        <Input
                          id="client_contact_phone"
                          disabled={disabled}
                          className={cn(form.formState.errors.client_contact_phone && "border-destructive")}
                          {...form.register('client_contact_phone')}
                        />
                        {form.formState.errors.client_contact_phone && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.client_contact_phone.message as string}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Location Section */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {isContractor ? 'Job Location (for this job)' : 'Job Location'}
                    </span>
                  </div>

                  {!isContractor ? (
                    // Non-contractor: Show read-only location
                    <div className="text-sm">
                      <span className="text-muted-foreground">Address</span>
                      <p className="font-medium">
                        {selectedFacility.physical_address || selectedFacility.billing_address || '-'}
                        {(selectedFacility.physical_city || selectedFacility.billing_city) && ', '}
                        {selectedFacility.physical_city || selectedFacility.billing_city}
                        {(selectedFacility.physical_state || selectedFacility.billing_state) && ', '}
                        {selectedFacility.physical_state || selectedFacility.billing_state}
                        {' '}
                        {selectedFacility.physical_zip || selectedFacility.billing_zip}
                      </p>
                    </div>
                  ) : (
                    // Contractor: Editable location
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="location_address">Street Address</Label>
                        <Input
                          id="location_address"
                          disabled={disabled}
                          {...form.register('location_address')}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="location_city">City</Label>
                          <Input
                            id="location_city"
                            disabled={disabled}
                            {...form.register('location_city')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location_state">State</Label>
                          <Controller
                            control={form.control}
                            name="location_state"
                            render={({ field }) => (
                              <Select
                                value={field.value || STATE_NONE}
                                onValueChange={(value) => {
                                  field.onChange(value || null);
                                }}
                                disabled={disabled}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                  {US_STATES.map((state) => (
                                    <SelectItem key={state.value} value={state.value}>
                                      {state.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location_zip">ZIP Code</Label>
                          <Input
                            id="location_zip"
                            disabled={disabled}
                            {...form.register('location_zip')}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          // Remote: Video call link
          <div className="space-y-2">
            <Label htmlFor="video_call_link">Video Call Link</Label>
            <Input
              id="video_call_link"
              placeholder="https://..."
              disabled={disabled}
              {...form.register('video_call_link')}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default JobLocationFields;
