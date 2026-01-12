import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormMode } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

interface InterpreterAddressFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
}

// ==========================================
// Component
// ==========================================

export function InterpreterAddressFields({
  form,
  mode,
  disabled = false,
}: InterpreterAddressFieldsProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Address</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            disabled={disabled}
            {...form.register('address')}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              disabled={disabled}
              {...form.register('city')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              disabled={disabled}
              {...form.register('state')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip_code">Zip Code</Label>
            <Input
              id="zip_code"
              placeholder="12345"
              disabled={disabled}
              {...form.register('zip_code')}
            />
            {form.formState.errors.zip_code && (
              <p className="text-sm text-destructive">
                {form.formState.errors.zip_code.message as string}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InterpreterAddressFields;
