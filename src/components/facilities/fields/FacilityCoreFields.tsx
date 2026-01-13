import { UseFormReturn, Controller } from 'react-hook-form';
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

// Sentinel value for "no selection" to keep Select controlled
const FACILITY_TYPE_NONE = '__none__';

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
            <Controller
              control={form.control}
              name="facility_type"
              render={({ field }) => (
                <Select
                  value={field.value || FACILITY_TYPE_NONE}
                  onValueChange={(value) => {
                    field.onChange(value === FACILITY_TYPE_NONE ? null : value);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FACILITY_TYPE_NONE}>
                      <span className="text-muted-foreground">Unspecified</span>
                    </SelectItem>
                    {FACILITY_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Status - only shown in edit mode */}
        {showStatus && mode === 'edit' && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value || 'pending'}
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
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
              )}
            />
          </div>
        )}

        <div className="flex items-center gap-6">
          <Controller
            control={form.control}
            name="is_gsa"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_gsa"
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
                <Label htmlFor="is_gsa">GSA Contract</Label>
              </div>
            )}
          />
          <Controller
            control={form.control}
            name="contractor"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contractor"
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
                <Label htmlFor="contractor">Contractor</Label>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default FacilityCoreFields;
