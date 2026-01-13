import { useState, useEffect, useRef, useMemo } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormMode } from '@/lib/schemas/shared';
import {
  TIME_OPTIONS,
  DURATION_OPTIONS,
  calculateHoursSplit,
  HoursSplit,
} from '@/lib/utils/job-calculations';
import {
  calculateDurationMinutes,
  calculateEndTime,
  clampDuration,
  formatTimeForDisplay,
} from '@/lib/utils/form-helpers';
import { normalizeTimeToHHMM, needsTimeNormalization } from '@/lib/utils/time-helpers';

// Sentinel value for "no selection" to keep Select controlled
const TIME_NONE = '';
const DURATION_NONE = '__none__';

// ==========================================
// Types
// ==========================================

interface JobScheduleFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
  minimumHours?: number;
  onHoursSplitChange?: (hoursSplit: HoursSplit | null) => void;
}

// ==========================================
// Component
// ==========================================

export function JobScheduleFields({
  form,
  mode,
  disabled = false,
  minimumHours = 2,
  onHoursSplitChange,
}: JobScheduleFieldsProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Track if this is the initial mount to skip auto-adjustment on form reset
  const isInitialMountRef = useRef(true);

  const watchedJobDate = form.watch('job_date');
  const watchedStartTime = form.watch('start_time');
  const watchedEndTime = form.watch('end_time');

  const timeOptionsSet = useMemo(() => {
    return new Set(TIME_OPTIONS.map((o) => o.value));
  }, []);

  // Track previous times for change detection (user-initiated changes only)
  const prevStartTimeRef = useRef<string | null>(null);
  const prevEndTimeRef = useRef<string | null>(null);

  // Normalize times from various formats to HH:MM on mount and when values change
  useEffect(() => {
    if (needsTimeNormalization(watchedStartTime)) {
      const normalized = normalizeTimeToHHMM(watchedStartTime);
      // Only update if normalized is valid and different from current
      if (normalized && normalized !== watchedStartTime) {
        form.setValue('start_time', normalized, { shouldDirty: false });
      }
    }
    if (needsTimeNormalization(watchedEndTime)) {
      const normalized = normalizeTimeToHHMM(watchedEndTime);
      // Only update if normalized is valid and different from current
      if (normalized && normalized !== watchedEndTime) {
        form.setValue('end_time', normalized, { shouldDirty: false });
      }
    }

    // Debug: confirm form state vs options (DEV only)
    if (import.meta.env.DEV) {
      const startNorm = normalizeTimeToHHMM(watchedStartTime);
      const endNorm = normalizeTimeToHHMM(watchedEndTime);
      // eslint-disable-next-line no-console
      console.debug('[JobScheduleFields] times', {
        watchedStartTime,
        watchedEndTime,
        startNorm,
        endNorm,
        endInOptions: endNorm ? timeOptionsSet.has(endNorm) : null,
      });
    }

    // After first normalization pass, mark initial mount as complete
    // and initialize the refs with current values
    if (isInitialMountRef.current && watchedStartTime && watchedEndTime) {
      // Small delay to allow form reset to fully complete
      const timer = setTimeout(() => {
        prevStartTimeRef.current = watchedStartTime;
        prevEndTimeRef.current = watchedEndTime;
        isInitialMountRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [watchedStartTime, watchedEndTime, form, timeOptionsSet]);

  // Calculate job duration in hours
  const jobDuration = useMemo(() => {
    if (!watchedStartTime || !watchedEndTime) return null;
    // Only calculate if times are in correct format
    if (needsTimeNormalization(watchedStartTime) || needsTimeNormalization(watchedEndTime)) {
      return null;
    }
    return calculateDurationMinutes(watchedStartTime, watchedEndTime) / 60;
  }, [watchedStartTime, watchedEndTime]);

  // Calculate hours split for display
  const hoursSplit = useMemo(() => {
    if (!watchedStartTime || !watchedEndTime) return null;
    // Only calculate if times are in correct format
    if (needsTimeNormalization(watchedStartTime) || needsTimeNormalization(watchedEndTime)) {
      return null;
    }
    return calculateHoursSplit(watchedStartTime, watchedEndTime, minimumHours);
  }, [watchedStartTime, watchedEndTime, minimumHours]);

  // Notify parent of hours split changes
  useEffect(() => {
    if (onHoursSplitChange) {
      onHoursSplitChange(hoursSplit);
    }
  }, [hoursSplit, onHoursSplitChange]);

  // When start time changes, auto-adjust end time to maintain valid duration
  // Skip during initial mount to preserve DB values
  useEffect(() => {
    // Skip if still in initial mount phase
    if (isInitialMountRef.current) return;
    if (!watchedStartTime || !watchedEndTime) return;
    if (prevStartTimeRef.current === watchedStartTime) return;
    prevStartTimeRef.current = watchedStartTime;

    const duration = calculateDurationMinutes(watchedStartTime, watchedEndTime);

    // If duration is invalid, default to minimum 2 hours
    if (duration < 120 || duration > 480) {
      const newEndTime = calculateEndTime(watchedStartTime, 120);
      form.setValue('end_time', newEndTime, { shouldDirty: true });
    }
  }, [watchedStartTime, watchedEndTime, form]);

  // When end time changes directly, ensure it maintains valid duration
  // Skip during initial mount to preserve DB values
  useEffect(() => {
    // Skip if still in initial mount phase
    if (isInitialMountRef.current) return;
    if (!watchedStartTime || !watchedEndTime) return;
    if (prevEndTimeRef.current === watchedEndTime) return;
    prevEndTimeRef.current = watchedEndTime;

    const duration = calculateDurationMinutes(watchedStartTime, watchedEndTime);

    if (duration < 120 || duration > 480) {
      const clampedEndTime = clampDuration(watchedStartTime, watchedEndTime);
      form.setValue('end_time', clampedEndTime, { shouldDirty: true });
    }
  }, [watchedEndTime, watchedStartTime, form]);

  // Handle duration selector change
  const handleDurationChange = (value: string) => {
    const durationMinutes = parseInt(value, 10);
    const newEndTime = calculateEndTime(watchedStartTime, durationMinutes);
    form.setValue('end_time', newEndTime, { shouldDirty: true });
  };

  // Compute duration value for the selector
  const durationSelectValue = useMemo(() => {
    if (jobDuration === null) return DURATION_NONE;
    return String(Math.round((jobDuration * 60) / 15) * 15);
  }, [jobDuration]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Job Date */}
          <div className="space-y-2">
            <Label>Job Date *</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={disabled}
                  className={cn(
                    'w-full justify-start text-left font-normal overflow-hidden',
                    !watchedJobDate && 'text-muted-foreground',
                    form.formState.errors.job_date && 'border-destructive'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {watchedJobDate
                      ? format(new Date(watchedJobDate + 'T00:00:00'), 'MMM d, yyyy')
                      : 'Pick a date'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchedJobDate ? new Date(watchedJobDate + 'T00:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      form.setValue('job_date', format(date, 'yyyy-MM-dd'), { shouldDirty: true });
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.job_date && (
              <p className="text-sm text-destructive">
                {form.formState.errors.job_date.message as string}
              </p>
            )}
          </div>

          {/* Start Time - Using Controller for consistent controlled state */}
          <div className="space-y-2">
            <Label>Start Time *</Label>
            <Controller
              control={form.control}
              name="start_time"
              render={({ field }) => {
                const safeValue = normalizeTimeToHHMM(field.value) || TIME_NONE;
                const hasCustom = !!safeValue && !timeOptionsSet.has(safeValue);

                return (
                  <Select
                    value={safeValue}
                    onValueChange={(value) => {
                      field.onChange(value || null);
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger className={cn(form.formState.errors.start_time && 'border-destructive')}>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {hasCustom && (
                        <SelectItem value={safeValue}>
                          {formatTimeForDisplay(safeValue)}
                        </SelectItem>
                      )}
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
            {form.formState.errors.start_time && (
              <p className="text-sm text-destructive">
                {form.formState.errors.start_time.message as string}
              </p>
            )}
          </div>

          {/* End Time - Using Controller for consistent controlled state */}
          <div className="space-y-2">
            <Label>End Time *</Label>
            <Controller
              control={form.control}
              name="end_time"
              render={({ field }) => {
                const safeValue = normalizeTimeToHHMM(field.value) || TIME_NONE;
                const hasCustom = !!safeValue && !timeOptionsSet.has(safeValue);

                return (
                  <Select
                    value={safeValue}
                    onValueChange={(value) => {
                      field.onChange(value || null);
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger className={cn(form.formState.errors.end_time && 'border-destructive')}>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {hasCustom && (
                        <SelectItem value={safeValue}>
                          {formatTimeForDisplay(safeValue)}
                        </SelectItem>
                      )}
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
            {form.formState.errors.end_time && (
              <p className="text-sm text-destructive">
                {form.formState.errors.end_time.message as string}
              </p>
            )}
          </div>

          {/* Duration Selector */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select
              value={durationSelectValue}
              onValueChange={(value) => {
                if (value !== DURATION_NONE) {
                  handleDurationChange(value);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value={DURATION_NONE}>
                  <span className="text-muted-foreground">—</span>
                </SelectItem>
                {DURATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Hours Breakdown */}
            {hoursSplit && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                {hoursSplit.businessHours > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {hoursSplit.businessHours.toFixed(1)}h business
                  </span>
                )}
                {hoursSplit.afterHours > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {hoursSplit.afterHours.toFixed(1)}h after-hours
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default JobScheduleFields;

