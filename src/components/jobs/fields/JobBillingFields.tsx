import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FormMode } from '@/lib/schemas/shared';
import { RateChips } from '@/components/jobs/RateChips';
import { HoursSplit, calculateBillableTotal, BillableTotal } from '@/lib/utils/job-calculations';

// ==========================================
// Currency Input Component
// ==========================================

interface CurrencyInputProps {
  value: number | null | undefined;
  onChange: (value: number) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

function CurrencyInput({ value, onChange, disabled, id, className }: CurrencyInputProps) {
  const [localValue, setLocalValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Track the original value to avoid unnecessary onChange calls
  const originalValueRef = useRef<number>(value ?? 0);

  // Sync local value with form value when not focused
  useEffect(() => {
    if (!isFocused) {
      const numValue = value ?? 0;
      setLocalValue(numValue.toFixed(2));
      originalValueRef.current = numValue;
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Allow typing decimal numbers
    if (inputValue === '' || inputValue === '-' || /^-?\d*\.?\d*$/.test(inputValue)) {
      setLocalValue(inputValue);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const num = parseFloat(localValue);
    const finalValue = isNaN(num) ? 0 : Math.round(num * 100) / 100;
    
    // Only call onChange if the value actually changed to avoid marking form as dirty
    if (finalValue !== originalValueRef.current) {
      onChange(finalValue);
      originalValueRef.current = finalValue;
    }
    setLocalValue(finalValue.toFixed(2));
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disabled}
        className={`pl-5 ${className ?? ''}`}
      />
    </div>
  );
}

// ==========================================
// Types
// ==========================================

interface LinkedRecord {
  id: string;
  number: string | null;
}

interface JobBillingFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
  hoursSplit?: HoursSplit | null;
  defaultMileageRate?: number;
  linkedInvoice?: LinkedRecord | null;
  linkedBill?: LinkedRecord | null;
  facilityId?: string;
  interpreterId?: string | null;
  onGenerateBilling?: () => void;
  isGeneratingBilling?: boolean;
  canGenerateBilling?: boolean;
  selectedInterpreterName?: string;
  hasInterpreter?: boolean;
}

// ==========================================
// Component
// ==========================================

export function JobBillingFields({
  form,
  mode,
  disabled = false,
  hoursSplit,
  defaultMileageRate = 0.7,
  linkedInvoice,
  linkedBill,
  facilityId,
  interpreterId,
  onGenerateBilling,
  isGeneratingBilling = false,
  canGenerateBilling = false,
  selectedInterpreterName,
  hasInterpreter = false,
}: JobBillingFieldsProps) {
  const navigate = useNavigate();

  // Watch all billing-related fields for dynamic calculation updates
  const watchedFacilityRateBusiness = form.watch('facility_rate_business') ?? 0;
  const watchedFacilityRateAfterHours = form.watch('facility_rate_after_hours') ?? 0;
  const watchedFacilityRateHoliday = form.watch('facility_rate_holiday') ?? 0;
  const watchedFacilityRateMileageRaw = form.watch('facility_rate_mileage');
  const watchedFacilityRateAdjustment = form.watch('facility_rate_adjustment') ?? 0;
  const watchedInterpreterRateBusiness = form.watch('interpreter_rate_business') ?? 0;
  const watchedInterpreterRateAfterHours = form.watch('interpreter_rate_after_hours') ?? 0;
  const watchedInterpreterRateHoliday = form.watch('interpreter_rate_holiday') ?? 0;
  const watchedInterpreterRateMileageRaw = form.watch('interpreter_rate_mileage');
  const watchedInterpreterRateAdjustment = form.watch('interpreter_rate_adjustment') ?? 0;
  const watchedMileage = form.watch('mileage') ?? 0;
  const watchedTravelTime = form.watch('travel_time_hours') ?? 0;
  const watchedParking = form.watch('parking') ?? 0;
  const watchedTolls = form.watch('tolls') ?? 0;
  const watchedMiscFee = form.watch('misc_fee') ?? 0;

  // Resolve mileage rates with default fallback
  const facilityMileageRate = watchedFacilityRateMileageRaw === null || watchedFacilityRateMileageRaw === undefined || watchedFacilityRateMileageRaw === 0
    ? defaultMileageRate
    : watchedFacilityRateMileageRaw;
  const interpreterMileageRate = watchedInterpreterRateMileageRaw === null || watchedInterpreterRateMileageRaw === undefined || watchedInterpreterRateMileageRaw === 0
    ? defaultMileageRate
    : watchedInterpreterRateMileageRaw;

  // Calculate billable totals - dynamically updates when any watched value changes
  const billableTotal = useMemo<BillableTotal | null>(() => {
    if (!hoursSplit) return null;

    return calculateBillableTotal({
      hoursSplit,
      facilityBusinessRate: watchedFacilityRateBusiness,
      facilityAfterHoursRate: watchedFacilityRateAfterHours,
      facilityMileageRate,
      facilityRateAdjustment: watchedFacilityRateAdjustment,
      interpreterBusinessRate: watchedInterpreterRateBusiness,
      interpreterAfterHoursRate: watchedInterpreterRateAfterHours,
      interpreterMileageRate,
      interpreterRateAdjustment: watchedInterpreterRateAdjustment,
      mileage: watchedMileage,
      travelTimeHours: watchedTravelTime,
      parking: watchedParking,
      tolls: watchedTolls,
      miscFee: watchedMiscFee,
    });
  }, [
    hoursSplit,
    watchedFacilityRateBusiness,
    watchedFacilityRateAfterHours,
    facilityMileageRate,
    watchedFacilityRateAdjustment,
    watchedInterpreterRateBusiness,
    watchedInterpreterRateAfterHours,
    interpreterMileageRate,
    watchedInterpreterRateAdjustment,
    watchedMileage,
    watchedTravelTime,
    watchedParking,
    watchedTolls,
    watchedMiscFee,
  ]);

  // Number input setValueAs helper - rounds to 2 decimal places for currency
  const numericSetValueAs = (v: string) => {
    if (v === '' || v === '-' || v === '-.') return v;
    const num = parseFloat(v);
    if (isNaN(num)) return 0;
    return Math.round(num * 100) / 100;
  };

  // Calculate mileage total using already-watched values
  const mileageTotal = watchedMileage * facilityMileageRate;

  // Travel time rate uses the interpreter's adjusted rate (higher of business or after-hours)
  const travelTimeRate = billableTotal?.interpreterTravelTimeRate ?? 0;
  const travelTimeTotal = billableTotal?.interpreterTravelTimeTotal ?? 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <CardTitle className="text-lg">Billing</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {linkedInvoice && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(`/invoices/${linkedInvoice.id}`)}
              >
                View Invoice
              </Button>
            )}
            {linkedBill && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(`/payables/${linkedBill.id}`)}
              >
                View Bill
              </Button>
            )}
            {onGenerateBilling && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || !canGenerateBilling || isGeneratingBilling}
                  >
                    {isGeneratingBilling ? 'Generating...' : 'Generate Invoice & Bill'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Generate Invoice & Interpreter Bill?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will create a new invoice for the facility and a new bill for {selectedInterpreterName || 'the interpreter'}. The job status will be changed to "Ready to Bill".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onGenerateBilling}>
                      Generate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Facility Rates Chips */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground">Facility Rates</h4>
          <RateChips
            rates={[
              { label: 'Business', value: watchedFacilityRateBusiness, suffix: '/hr' },
              { label: 'After Hours', value: watchedFacilityRateAfterHours, suffix: '/hr' },
              { label: 'Holiday', value: watchedFacilityRateHoliday, suffix: '/hr' },
            ]}
            linkTo={facilityId ? `/facilities/${facilityId}` : undefined}
            linkLabel="View Facility"
            disabled={disabled}
          />
        </div>

        {/* Interpreter Rates Chips */}
        {hasInterpreter && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Interpreter Rates</h4>
            <RateChips
              rates={[
                { label: 'Business', value: watchedInterpreterRateBusiness, suffix: '/hr' },
                { label: 'After Hours', value: watchedInterpreterRateAfterHours, suffix: '/hr' },
                { label: 'Holiday', value: watchedInterpreterRateHoliday, suffix: '/hr' },
              ]}
              linkTo={interpreterId ? `/interpreters/${interpreterId}` : undefined}
              linkLabel="View Interpreter"
              disabled={disabled}
            />
          </div>
        )}

        {/* Expenses */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Expenses</h4>
          
          {/* Mileage Row */}
          <div className="flex items-end gap-2 flex-wrap">
            <div className="space-y-1">
              <Label htmlFor="mileage" className="text-xs">Mileage</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="mileage"
                  type="text"
                  inputMode="decimal"
                  {...form.register('mileage', { setValueAs: numericSetValueAs })}
                  disabled={disabled}
                  placeholder="0"
                  className="h-8 w-20"
                />
                <span className="text-sm text-muted-foreground">mi</span>
              </div>
            </div>
            <span className="text-muted-foreground pb-1">×</span>
            <div className="space-y-1">
              <Label htmlFor="facility_rate_mileage" className="text-xs">Rate/mi</Label>
              <Controller
                control={form.control}
                name="facility_rate_mileage"
                render={({ field }) => {
                  const effective = field.value === null || field.value === undefined || field.value === 0
                    ? defaultMileageRate
                    : field.value;
                  return (
                    <CurrencyInput
                      id="facility_rate_mileage"
                      value={effective}
                      onChange={field.onChange}
                      disabled={disabled}
                      className="h-8 w-20"
                    />
                  );
                }}
              />
            </div>
            <span className="text-muted-foreground pb-1">=</span>
            <div className="pb-1">
              <span className="text-sm font-medium">${mileageTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Travel Time Row */}
          <div className="flex items-end gap-2 flex-wrap">
            <div className="space-y-1">
              <Label htmlFor="travel_time_hours" className="text-xs">Travel Time</Label>
              <div className="flex items-center gap-1">
                <Input
                  id="travel_time_hours"
                  type="text"
                  inputMode="decimal"
                  {...form.register('travel_time_hours', { setValueAs: numericSetValueAs })}
                  disabled={disabled}
                  placeholder="0"
                  className="h-8 w-20"
                />
                <span className="text-sm text-muted-foreground">hrs</span>
              </div>
            </div>
            <span className="text-muted-foreground pb-1">×</span>
            <div className="pb-1">
              <span className="text-sm text-muted-foreground">${travelTimeRate.toFixed(2)}/hr</span>
            </div>
            <span className="text-muted-foreground pb-1">=</span>
            <div className="pb-1">
              <span className="text-sm font-medium">${travelTimeTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Other Expenses Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="parking" className="text-xs">Parking</Label>
              <Controller
                control={form.control}
                name="parking"
                render={({ field }) => (
                  <CurrencyInput
                    id="parking"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={disabled}
                    className="h-8"
                  />
                )}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tolls" className="text-xs">Tolls</Label>
              <Controller
                control={form.control}
                name="tolls"
                render={({ field }) => (
                  <CurrencyInput
                    id="tolls"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={disabled}
                    className="h-8"
                  />
                )}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="misc_fee" className="text-xs">Misc Fee</Label>
              <Controller
                control={form.control}
                name="misc_fee"
                render={({ field }) => (
                  <CurrencyInput
                    id="misc_fee"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={disabled}
                    className="h-8"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Rate Adjustments */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Rate Adjustments (per hour)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="facility_rate_adjustment" className="text-xs">Facility</Label>
              <div className="flex items-center gap-1">
                <Controller
                  control={form.control}
                  name="facility_rate_adjustment"
                  render={({ field }) => (
                    <CurrencyInput
                      id="facility_rate_adjustment"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={disabled}
                      className="h-8 flex-1"
                    />
                  )}
                />
                <div className="flex flex-col">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-4 w-6 rounded-b-none border-b-0"
                    disabled={disabled}
                    onClick={() => {
                      const current = form.getValues('facility_rate_adjustment') ?? 0;
                      form.setValue('facility_rate_adjustment', Math.round((current + 1) * 100) / 100, { shouldDirty: true });
                    }}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-4 w-6 rounded-t-none"
                    disabled={disabled}
                    onClick={() => {
                      const current = form.getValues('facility_rate_adjustment') ?? 0;
                      form.setValue('facility_rate_adjustment', Math.round((current - 1) * 100) / 100, { shouldDirty: true });
                    }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="interpreter_rate_adjustment" className="text-xs">Interpreter</Label>
              <div className="flex items-center gap-1">
                <Controller
                  control={form.control}
                  name="interpreter_rate_adjustment"
                  render={({ field }) => (
                    <CurrencyInput
                      id="interpreter_rate_adjustment"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={disabled}
                      className="h-8 flex-1"
                    />
                  )}
                />
                <div className="flex flex-col">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-4 w-6 rounded-b-none border-b-0"
                    disabled={disabled}
                    onClick={() => {
                      const current = form.getValues('interpreter_rate_adjustment') ?? 0;
                      form.setValue('interpreter_rate_adjustment', Math.round((current + 1) * 100) / 100, { shouldDirty: true });
                    }}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-4 w-6 rounded-t-none"
                    disabled={disabled}
                    onClick={() => {
                      const current = form.getValues('interpreter_rate_adjustment') ?? 0;
                      form.setValue('interpreter_rate_adjustment', Math.round((current - 1) * 100) / 100, { shouldDirty: true });
                    }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billable Calculation */}
        {hoursSplit && billableTotal && (
          <>
            <Separator />
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-1 font-medium">{hoursSplit.totalHours.toFixed(2)} hrs</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Billable:</span>
                  <span className="ml-1 font-medium">{hoursSplit.billableHours.toFixed(2)} hrs</span>
                  {hoursSplit.minimumApplied > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">(min)</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Business:</span>
                  <span className="ml-1 font-medium">{hoursSplit.businessHours.toFixed(2)} hrs</span>
                </div>
                <div>
                  <span className="text-muted-foreground">After Hours:</span>
                  <span className="ml-1 font-medium">{hoursSplit.afterHours.toFixed(2)} hrs</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
                {/* Facility Totals */}
                <div className="space-y-1">
                  <h5 className="text-sm font-medium">Facility Charge</h5>
                  <div className="text-sm space-y-0.5">
                    {hoursSplit.businessHours > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Business Hours ({hoursSplit.businessHours.toFixed(2)} × ${billableTotal.facilityBusinessRate.toFixed(2)})
                        </span>
                        <span>${billableTotal.facilityBusinessTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {hoursSplit.afterHours > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          After Hours ({hoursSplit.afterHours.toFixed(2)} × ${billableTotal.facilityAfterHoursRate.toFixed(2)})
                        </span>
                        <span>${billableTotal.facilityAfterHoursTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {billableTotal.mileage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Mileage ({billableTotal.mileage} × ${billableTotal.facilityMileageRate.toFixed(2)})
                        </span>
                        <span>${billableTotal.facilityMileageTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {billableTotal.facilityFeesTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fees (Parking + Tolls + Misc)</span>
                        <span>${billableTotal.facilityFeesTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 font-semibold">
                      <span>Total</span>
                      <span>${billableTotal.facilityTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Interpreter Totals */}
                <div className="space-y-1">
                  <h5 className="text-sm font-medium">Interpreter Pay</h5>
                  <div className="text-sm space-y-0.5">
                    {hoursSplit.businessHours > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Business Hours ({hoursSplit.businessHours.toFixed(2)} × ${billableTotal.interpreterBusinessRate.toFixed(2)})
                        </span>
                        <span>${billableTotal.interpreterBusinessTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {hoursSplit.afterHours > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          After Hours ({hoursSplit.afterHours.toFixed(2)} × ${billableTotal.interpreterAfterHoursRate.toFixed(2)})
                        </span>
                        <span>${billableTotal.interpreterAfterHoursTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {billableTotal.mileage > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Mileage ({billableTotal.mileage} × ${billableTotal.interpreterMileageRate.toFixed(2)})
                        </span>
                        <span>${billableTotal.interpreterMileageTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {billableTotal.travelTimeHours > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Travel Time ({billableTotal.travelTimeHours.toFixed(2)} × ${billableTotal.interpreterTravelTimeRate.toFixed(2)})
                        </span>
                        <span>${billableTotal.interpreterTravelTimeTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {billableTotal.interpreterFeesTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fees (Parking + Tolls + Misc)</span>
                        <span>${billableTotal.interpreterFeesTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 font-semibold">
                      <span>Total</span>
                      <span>${billableTotal.interpreterTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default JobBillingFields;
