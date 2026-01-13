import { UseFormReturn, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormMode } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

interface InterpreterCertificationsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
}

// ==========================================
// Component
// ==========================================

export function InterpreterCertifications({
  form,
  mode,
  disabled = false,
}: InterpreterCertificationsProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Certifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-6">
          <Controller
            control={form.control}
            name="rid_certified"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rid_certified"
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
                <Label htmlFor="rid_certified">RID Certified</Label>
              </div>
            )}
          />
          <Controller
            control={form.control}
            name="nic_certified"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="nic_certified"
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
                <Label htmlFor="nic_certified">NIC Certified</Label>
              </div>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="other_certifications">Other Certifications</Label>
          <Input
            id="other_certifications"
            disabled={disabled}
            {...form.register('other_certifications')}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default InterpreterCertifications;
