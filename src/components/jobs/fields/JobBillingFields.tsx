import { useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
  onEditFacilityRates?: () => void;
  onEditInterpreterRates?: () => void;
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
  onEditFacilityRates,
  onEditInterpreterRates,
  onGenerateBilling,
  isGeneratingBilling = false,
  canGenerateBilling = false,
  selectedInterpreterName,
  hasInterpreter = false,
}: JobBillingFieldsProps) {
  const navigate = useNavigate();

  const watchedFacilityRateBusiness = form.watch('facility_rate_business') ?? 0;
  const watchedFacilityRateAfterHours = form.watch('facility_rate_after_hours') ?? 0;
  const watchedInterpreterRateBusiness = form.watch('interpreter_rate_business') ?? 0;
  const watchedInterpreterRateAfterHours = form.watch('interpreter_rate_after_hours') ?? 0;

  // Calculate billable totals
  const billableTotal = useMemo<BillableTotal | null>(() => {
    if (!hoursSplit) return null;

    return calculateBillableTotal({
      hoursSplit,
      facilityBusinessRate: form.watch('facility_rate_business') ?? 0,
      facilityAfterHoursRate: form.watch('facility_rate_after_hours') ?? 0,
      facilityMileageRate: form.watch('facility_rate_mileage') ?? defaultMileageRate,
      facilityRateAdjustment: form.watch('facility_rate_adjustment') ?? 0,
      interpreterBusinessRate: form.watch('interpreter_rate_business') ?? 0,
      interpreterAfterHoursRate: form.watch('interpreter_rate_after_hours') ?? 0,
      interpreterMileageRate: form.watch('interpreter_rate_mileage') ?? defaultMileageRate,
      interpreterRateAdjustment: form.watch('interpreter_rate_adjustment') ?? 0,
      mileage: form.watch('mileage') ?? 0,
      travelTimeHours: form.watch('travel_time_hours') ?? 0,
      parking: form.watch('parking') ?? 0,
      tolls: form.watch('tolls') ?? 0,
      miscFee: form.watch('misc_fee') ?? 0,
    });
  }, [hoursSplit, form, defaultMileageRate]);

  // Number input setValueAs helper - rounds to 2 decimal places for currency
  const numericSetValueAs = (v: string) => {
    if (v === '' || v === '-' || v === '-.') return v;
    const num = parseFloat(v);
    if (isNaN(num)) return 0;
    return Math.round(num * 100) / 100;
  };

  // Watch values for inline calculations
  const watchedMileage = form.watch('mileage') ?? 0;
  const watchedMileageRate = form.watch('facility_rate_mileage') ?? defaultMileageRate;
  const watchedTravelTime = form.watch('travel_time_hours') ?? 0;

  // Calculate mileage total
  const mileageTotal = watchedMileage * watchedMileageRate;

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
            ]}
            onEditClick={onEditFacilityRates}
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
              ]}
              onEditClick={onEditInterpreterRates}
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
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="facility_rate_mileage"
                  type="text"
                  inputMode="decimal"
                  {...form.register('facility_rate_mileage', { setValueAs: numericSetValueAs })}
                  disabled={disabled}
                  placeholder={String(defaultMileageRate)}
                  className="h-8 w-20 pl-5"
                />
              </div>
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
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="parking"
                  type="text"
                  inputMode="decimal"
                  {...form.register('parking', { setValueAs: numericSetValueAs })}
                  disabled={disabled}
                  placeholder="0.00"
                  className="h-8 pl-5"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tolls" className="text-xs">Tolls</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="tolls"
                  type="text"
                  inputMode="decimal"
                  {...form.register('tolls', { setValueAs: numericSetValueAs })}
                  disabled={disabled}
                  placeholder="0.00"
                  className="h-8 pl-5"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="misc_fee" className="text-xs">Misc Fee</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="misc_fee"
                  type="text"
                  inputMode="decimal"
                  {...form.register('misc_fee', { setValueAs: numericSetValueAs })}
                  disabled={disabled}
                  placeholder="0.00"
                  className="h-8 pl-5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rate Adjustments */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Rate Adjustments (per hour)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="facility_rate_adjustment" className="text-xs">Facility</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="facility_rate_adjustment"
                  type="text"
                  inputMode="decimal"
                  {...form.register('facility_rate_adjustment', { setValueAs: numericSetValueAs })}
                  disabled={disabled}
                  placeholder="0.00"
                  className="h-8 pl-5"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="interpreter_rate_adjustment" className="text-xs">Interpreter</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="interpreter_rate_adjustment"
                  type="text"
                  inputMode="decimal"
                  {...form.register('interpreter_rate_adjustment', { setValueAs: numericSetValueAs })}
                  disabled={disabled}
                  placeholder="0.00"
                  className="h-8 pl-5"
                />
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
                    <div className="flex justify-between">
                      <span>Business:</span>
                      <span>${billableTotal.facilityBusinessTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>After Hours:</span>
                      <span>${billableTotal.facilityAfterHoursTotal.toFixed(2)}</span>
                    </div>
                    {billableTotal.mileage > 0 && (
                      <div className="flex justify-between">
                        <span>Mileage:</span>
                        <span>${billableTotal.facilityMileageTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {billableTotal.facilityFeesTotal > 0 && (
                      <div className="flex justify-between">
                        <span>Fees:</span>
                        <span>${billableTotal.facilityFeesTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 font-semibold">
                      <span>Total:</span>
                      <span>${billableTotal.facilityTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Interpreter Totals */}
                <div className="space-y-1">
                  <h5 className="text-sm font-medium">Interpreter Pay</h5>
                  <div className="text-sm space-y-0.5">
                    <div className="flex justify-between">
                      <span>Business:</span>
                      <span>${billableTotal.interpreterBusinessTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>After Hours:</span>
                      <span>${billableTotal.interpreterAfterHoursTotal.toFixed(2)}</span>
                    </div>
                    {billableTotal.mileage > 0 && (
                      <div className="flex justify-between">
                        <span>Mileage:</span>
                        <span>${billableTotal.interpreterMileageTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {billableTotal.travelTimeHours > 0 && (
                      <div className="flex justify-between">
                        <span>Travel Time:</span>
                        <span>${billableTotal.interpreterTravelTimeTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {billableTotal.interpreterFeesTotal > 0 && (
                      <div className="flex justify-between">
                        <span>Fees:</span>
                        <span>${billableTotal.interpreterFeesTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 font-semibold">
                      <span>Total:</span>
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
