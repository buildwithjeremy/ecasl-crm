import { useState } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FormMode, PAYMENT_METHODS } from '@/lib/schemas/shared';

// Sentinel value for "no selection" to keep Select controlled
const PAYMENT_METHOD_NONE = '__none__';

// ==========================================
// Types
// ==========================================

interface InterpreterPaymentFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
  requiredPaymentMethod?: boolean;
}

// ==========================================
// Component
// ==========================================

export function InterpreterPaymentFields({
  form,
  mode,
  disabled = false,
  requiredPaymentMethod = false,
}: InterpreterPaymentFieldsProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const watchedInsuranceEndDate = form.watch('insurance_end_date');
  const requiredLabel = requiredPaymentMethod ? ' *' : '';

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Payment & Contract</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method{requiredLabel}</Label>
            <Controller
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <Select
                  value={field.value || PAYMENT_METHOD_NONE}
                  onValueChange={(value) => {
                    field.onChange(value === PAYMENT_METHOD_NONE ? null : value);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PAYMENT_METHOD_NONE}>
                      <span className="text-muted-foreground">Unspecified</span>
                    </SelectItem>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.payment_method && (
              <p className="text-sm text-destructive">
                {form.formState.errors.payment_method.message as string}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_details">Payment Details</Label>
            <Input
              id="payment_details"
              disabled={disabled}
              {...form.register('payment_details')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="w9_received"
              checked={form.watch('w9_received') || false}
              onCheckedChange={(checked) => form.setValue('w9_received', !!checked, { shouldDirty: true })}
              disabled={disabled}
            />
            <Label htmlFor="w9_received">W9 Received</Label>
          </div>
          <div className="space-y-2">
            <Label>Insurance End Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={disabled}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !watchedInsuranceEndDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedInsuranceEndDate
                    ? format(watchedInsuranceEndDate, 'PPP')
                    : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchedInsuranceEndDate || undefined}
                  onSelect={(date) => {
                    form.setValue('insurance_end_date', date || null, { shouldDirty: true });
                    setDatePickerOpen(false);
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InterpreterPaymentFields;
