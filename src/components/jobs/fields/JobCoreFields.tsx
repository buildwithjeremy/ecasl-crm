import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormMode, OPPORTUNITY_SOURCES } from '@/lib/schemas/shared';
import { FormSelect } from '@/components/form';

// ==========================================
// Types
// ==========================================

// Type for billing contact from JSONB
interface BillingContactData {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface FacilityOption {
  id: string;
  name: string;
  contractor: boolean | null;
  is_gsa: boolean | null;
  physical_address: string | null;
  physical_city: string | null;
  physical_state: string | null;
  physical_zip: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  billing_contacts: BillingContactData[] | null;
  rate_business_hours: number | null;
  rate_after_hours: number | null;
  rate_holiday_hours: number | null;
  minimum_billable_hours: number | null;
  emergency_fee: number | null;
  holiday_fee: number | null;
}

interface JobCoreFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
  facilities?: FacilityOption[];
  onFacilityChange?: (facility: FacilityOption | null) => void;
}

// ==========================================
// Component
// ==========================================

export function JobCoreFields({
  form,
  mode,
  disabled = false,
  facilities: externalFacilities,
  onFacilityChange,
}: JobCoreFieldsProps) {
  const [facilityOpen, setFacilityOpen] = useState(false);

  // Fetch facilities if not provided externally
  const { data: fetchedFacilities } = useQuery({
    queryKey: ['facilities-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name, physical_address, physical_city, physical_state, physical_zip, billing_address, billing_city, billing_state, billing_zip, contractor, is_gsa, billing_contacts, rate_business_hours, rate_after_hours, rate_holiday_hours, minimum_billable_hours, emergency_fee, holiday_fee')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data as FacilityOption[];
    },
    enabled: !externalFacilities,
  });

  const facilities = externalFacilities || fetchedFacilities;

  const watchedFacilityId = form.watch('facility_id');
  const selectedFacility = facilities?.find((f) => f.id === watchedFacilityId) || null;

  // Notify parent of facility changes
  useEffect(() => {
    if (onFacilityChange) {
      onFacilityChange(selectedFacility);
    }
  }, [selectedFacility, onFacilityChange]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Job Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Facility Selector */}
          <div className="space-y-2">
            <Label>Facility *</Label>
            <Popover open={facilityOpen} onOpenChange={setFacilityOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={facilityOpen}
                  disabled={disabled}
                  className={cn(
                    "w-full justify-between",
                    form.formState.errors.facility_id && "border-destructive"
                  )}
                >
                  {selectedFacility ? (
                    <span className="flex items-center gap-2 truncate">
                      {selectedFacility.name}
                      {selectedFacility.is_gsa && (
                        <Badge variant="secondary" className="text-xs">GSA</Badge>
                      )}
                      {selectedFacility.contractor && !selectedFacility.is_gsa && (
                        <Badge variant="secondary" className="text-xs">Contractor</Badge>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select facility...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search facilities..." />
                  <CommandList>
                    <CommandEmpty>No facility found.</CommandEmpty>
                    <CommandGroup>
                      {facilities?.map((facility) => (
                        <CommandItem
                          key={facility.id}
                          value={facility.name}
                          onSelect={() => {
                            form.setValue('facility_id', facility.id, { shouldDirty: true });
                            setFacilityOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              watchedFacilityId === facility.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <span className="flex-1">{facility.name}</span>
                          {facility.is_gsa && (
                            <Badge variant="secondary" className="ml-2 text-xs">GSA</Badge>
                          )}
                          {facility.contractor && !facility.is_gsa && (
                            <Badge variant="secondary" className="ml-2 text-xs">Contractor</Badge>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {form.formState.errors.facility_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.facility_id.message as string}
              </p>
            )}
          </div>

          {/* Job Source - Using FormSelect with Controller */}
          <FormSelect
            form={form}
            name="opportunity_source"
            label="Job Source"
            options={OPPORTUNITY_SOURCES}
            placeholder="Select source"
            disabled={disabled}
            nullable={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default JobCoreFields;
