import { useState, useEffect, useRef, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
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
} from '@/lib/utils/form-helpers';

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

  const watchedJobDate = form.watch('job_date');
  const watchedStartTime = form.watch('start_time');
  const watchedEndTime = form.watch('end_time');

  // Track previous times for change detection
  const prevStartTimeRef = useRef(watchedStartTime);
  const prevEndTimeRef = useRef(watchedEndTime);

  // Calculate job duration in hours
  const jobDuration = useMemo(() => {
    if (!watchedStartTime || !watchedEndTime) return null;
    return calculateDurationMinutes(watchedStartTime, watchedEndTime) / 60;
  }, [watchedStartTime, watchedEndTime]);

  // Calculate hours split for display
  const hoursSplit = useMemo(() => {
    if (!watchedStartTime || !watchedEndTime) return null;
    return calculateHoursSplit(watchedStartTime, watchedEndTime, minimumHours);
  }, [watchedStartTime, watchedEndTime, minimumHours]);

  // Notify parent of hours split changes
  useEffect(() => {
    if (onHoursSplitChange) {
      onHoursSplitChange(hoursSplit);
    }
  }, [hoursSplit, onHoursSplitChange]);

  // When start time changes, auto-adjust end time to maintain valid duration
  useEffect(() => {
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
  useEffect(() => {
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
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.job_date && (
              <p className="text-sm text-destructive">
                {form.formState.errors.job_date.message as string}
              </p>
            )}
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label>Start Time *</Label>
            <Select
              value={watchedStartTime}
              onValueChange={(value) => form.setValue('start_time', value, { shouldDirty: true })}
              disabled={disabled}
            >
              <SelectTrigger className={cn(form.formState.errors.start_time && "border-destructive")}>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.start_time && (
              <p className="text-sm text-destructive">
                {form.formState.errors.start_time.message as string}
              </p>
            )}
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label>End Time *</Label>
            <Select
              value={watchedEndTime}
              onValueChange={(value) => form.setValue('end_time', value, { shouldDirty: true })}
              disabled={disabled}
            >
              <SelectTrigger className={cn(form.formState.errors.end_time && "border-destructive")}>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              value={jobDuration !== null ? String(Math.round((jobDuration * 60) / 15) * 15) : undefined}
              onValueChange={handleDurationChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
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
