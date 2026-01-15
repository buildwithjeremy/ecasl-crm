import { useEffect } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { FormMode } from '@/lib/schemas/shared';
import { getTimezoneFromState, timezoneOptions } from '@/lib/timezone-utils';

// ==========================================
// Types
// ==========================================

interface FacilityAddressFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
  requiredFields?: boolean; // Whether address fields are required (create mode)
}

// ==========================================
// Component
// ==========================================

export function FacilityAddressFields({
  form,
  mode,
  disabled = false,
  requiredFields = false,
}: FacilityAddressFieldsProps) {
  const watchedPhysicalState = form.watch('physical_state');
  const watchedContractor = form.watch('contractor');
  const watchedIsGsa = form.watch('is_gsa');
  const isContractorOrGsa = watchedContractor || watchedIsGsa;
  const detectedTimezone = getTimezoneFromState(watchedPhysicalState);

  // Auto-update timezone when physical state changes
  useEffect(() => {
    if (detectedTimezone && form.formState.dirtyFields.physical_state) {
      form.setValue('timezone', detectedTimezone, { shouldDirty: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedTimezone]);

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

  const requiredLabel = requiredFields ? ' *' : '';

  return (
    <>
      {/* Billing Address */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Billing Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billing_address">Address{requiredLabel}</Label>
            <Input
              id="billing_address"
              disabled={disabled}
              {...form.register('billing_address')}
            />
            {form.formState.errors.billing_address && (
              <p className="text-sm text-destructive">
                {form.formState.errors.billing_address.message as string}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing_city">City{requiredLabel}</Label>
              <Input
                id="billing_city"
                disabled={disabled}
                {...form.register('billing_city')}
              />
              {form.formState.errors.billing_city && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.billing_city.message as string}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_state">State{requiredLabel}</Label>
              <Input
                id="billing_state"
                disabled={disabled}
                {...form.register('billing_state')}
              />
              {form.formState.errors.billing_state && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.billing_state.message as string}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing_zip">Zip{requiredLabel}</Label>
              <Input
                id="billing_zip"
                disabled={disabled}
                {...form.register('billing_zip')}
              />
              {form.formState.errors.billing_zip && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.billing_zip.message as string}
                </p>
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
            {!isContractorOrGsa && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyBillingToPhysical}
                disabled={disabled}
                className="h-8"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy from Billing
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isContractorOrGsa ? (
            // Contractor/GSA: Show informational message instead of address fields
            <p className="text-sm text-muted-foreground">
              Effective Communication is a contractor for this facility. Physical addresses are provided on a job-by-job basis.
            </p>
          ) : (
            // Regular facility: Show all address fields
            <>
              <div className="space-y-2">
                <Label htmlFor="physical_address">Address{requiredLabel}</Label>
                <Input
                  id="physical_address"
                  disabled={disabled}
                  {...form.register('physical_address')}
                />
                {form.formState.errors.physical_address && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.physical_address.message as string}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="physical_city">City{requiredLabel}</Label>
                  <Input
                    id="physical_city"
                    disabled={disabled}
                    {...form.register('physical_city')}
                  />
                  {form.formState.errors.physical_city && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.physical_city.message as string}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="physical_state">State{requiredLabel}</Label>
                  <Input
                    id="physical_state"
                    disabled={disabled}
                    {...form.register('physical_state')}
                  />
                  {form.formState.errors.physical_state && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.physical_state.message as string}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="physical_zip">Zip{requiredLabel}</Label>
                  <Input
                    id="physical_zip"
                    disabled={disabled}
                    {...form.register('physical_zip')}
                  />
                  {form.formState.errors.physical_zip && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.physical_zip.message as string}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Controller
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={disabled}
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
              )}
            />
            <p className="text-xs text-muted-foreground">
              Auto-detected from state. For border areas with split time zones, please verify and adjust if needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default FacilityAddressFields;
