import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormMode } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

interface JobFeesFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
  facilityEmergencyFee?: number | null;
  facilityHolidayFee?: number | null;
}

// ==========================================
// Component
// ==========================================

export function JobFeesFields({
  form,
  mode,
  disabled = false,
  facilityEmergencyFee,
  facilityHolidayFee,
}: JobFeesFieldsProps) {
  const emergencyFeeApplied = form.watch('emergency_fee_applied') || false;
  const holidayFeeApplied = form.watch('holiday_fee_applied') || false;

  const formatFee = (fee: number | null | undefined) => {
    if (fee == null || fee === 0) return null;
    return `$${fee.toFixed(2)}`;
  };

  const emergencyFeeDisplay = formatFee(facilityEmergencyFee);
  const holidayFeeDisplay = formatFee(facilityHolidayFee);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Fees</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="emergency_fee_applied"
              checked={emergencyFeeApplied}
              onCheckedChange={(checked) =>
                form.setValue('emergency_fee_applied', !!checked, { shouldDirty: true })
              }
              disabled={disabled || !facilityEmergencyFee}
            />
            <Label
              htmlFor="emergency_fee_applied"
              className={!facilityEmergencyFee ? 'text-muted-foreground' : ''}
            >
              Apply Emergency Fee
              {emergencyFeeDisplay ? (
                <span className="ml-1 text-muted-foreground">({emergencyFeeDisplay})</span>
              ) : (
                <span className="ml-1 text-muted-foreground text-xs">(not set on facility)</span>
              )}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="holiday_fee_applied"
              checked={holidayFeeApplied}
              onCheckedChange={(checked) =>
                form.setValue('holiday_fee_applied', !!checked, { shouldDirty: true })
              }
              disabled={disabled || !facilityHolidayFee}
            />
            <Label
              htmlFor="holiday_fee_applied"
              className={!facilityHolidayFee ? 'text-muted-foreground' : ''}
            >
              Apply Holiday Fee
              {holidayFeeDisplay ? (
                <span className="ml-1 text-muted-foreground">({holidayFeeDisplay})</span>
              ) : (
                <span className="ml-1 text-muted-foreground text-xs">(not set on facility)</span>
              )}
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default JobFeesFields;
