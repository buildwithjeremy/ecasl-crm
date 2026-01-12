import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormMode } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

interface FacilityBillingSettingsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
}

// ==========================================
// Component
// ==========================================

export function FacilityBillingSettings({
  form,
  mode,
  disabled = false,
}: FacilityBillingSettingsProps) {
  // Only show in edit mode
  if (mode !== 'edit') {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Billing Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="billing_code">Billing Code/PO Number</Label>
            <Input
              id="billing_code"
              disabled={disabled}
              {...form.register('billing_code')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FacilityBillingSettings;
