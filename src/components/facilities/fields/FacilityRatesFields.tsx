import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormMode } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

interface FacilityRatesFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
  requiredFields?: boolean;
}

// ==========================================
// Component
// ==========================================

export function FacilityRatesFields({
  form,
  mode,
  disabled = false,
  requiredFields = false,
}: FacilityRatesFieldsProps) {
  const requiredLabel = requiredFields ? ' *' : '';

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Rates (What We Charge)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rate_business_hours">Business Hours Rate{requiredLabel}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="rate_business_hours"
                type="number"
                step="0.01"
                className="pl-7"
                disabled={disabled}
                {...form.register('rate_business_hours', { valueAsNumber: true })}
              />
            </div>
            {form.formState.errors.rate_business_hours && (
              <p className="text-sm text-destructive">
                {form.formState.errors.rate_business_hours.message as string}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate_after_hours">After Hours Rate{requiredLabel}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="rate_after_hours"
                type="number"
                step="0.01"
                className="pl-7"
                disabled={disabled}
                {...form.register('rate_after_hours', { valueAsNumber: true })}
              />
            </div>
            {form.formState.errors.rate_after_hours && (
              <p className="text-sm text-destructive">
                {form.formState.errors.rate_after_hours.message as string}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FacilityRatesFields;
