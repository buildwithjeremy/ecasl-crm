import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormMode } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

interface JobFeesFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
}

// ==========================================
// Component
// ==========================================

export function JobFeesFields({
  form,
  mode,
  disabled = false,
}: JobFeesFieldsProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Fees</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergency_fee">Emergency Fee</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="emergency_fee"
                type="number"
                step="0.01"
                className="pl-7"
                disabled={disabled}
                {...form.register('emergency_fee')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday_fee">Holiday Fee</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="holiday_fee"
                type="number"
                step="0.01"
                className="pl-7"
                disabled={disabled}
                {...form.register('holiday_fee')}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default JobFeesFields;
