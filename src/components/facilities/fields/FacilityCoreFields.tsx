import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormMode, FACILITY_TYPES } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

interface FacilityCoreFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
  showStatus?: boolean;
}

// ==========================================
// Component
// ==========================================

export function FacilityCoreFields({
  form,
  mode,
  disabled = false,
  showStatus = false,
}: FacilityCoreFieldsProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Facility Name *</Label>
            <Input
              id="name"
              disabled={disabled}
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message as string}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="facility_type">Facility Type</Label>
            <Select
              value={form.watch('facility_type') ?? undefined}
              onValueChange={(value) => form.setValue('facility_type', value || null, { shouldDirty: true })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {FACILITY_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status - only shown in edit mode */}
        {showStatus && mode === 'edit' && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch('status') || 'pending'}
              onValueChange={(value) => form.setValue('status', value, { shouldDirty: true })}
              disabled={disabled}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_gsa"
              checked={form.watch('is_gsa') || false}
              onCheckedChange={(checked) => form.setValue('is_gsa', !!checked, { shouldDirty: true })}
              disabled={disabled}
            />
            <Label htmlFor="is_gsa">GSA Contract</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="contractor"
              checked={form.watch('contractor') || false}
              onCheckedChange={(checked) => form.setValue('contractor', !!checked, { shouldDirty: true })}
              disabled={disabled}
            />
            <Label htmlFor="contractor">Contractor</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FacilityCoreFields;
