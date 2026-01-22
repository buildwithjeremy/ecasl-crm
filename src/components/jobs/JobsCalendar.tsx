import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { timezoneOptions } from '@/lib/timezone-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Job = {
  id: string;
  job_number: string | null;
  job_date: string;
  start_time: string;
  end_time: string;
  timezone?: string | null;
  deaf_client_name: string | null;
  status: string | null;
  facility?: { name: string } | null;
  interpreter?: { first_name: string; last_name: string } | null;
};

interface JobsCalendarProps {
  jobs: Job[];
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  confirmed: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  ready_to_bill: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
  billed: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  paid: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - date.getTime();
}

function zonedLocalDateTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh = '0', mm = '0', ss = '0'] = timeStr.split(':');
  const naiveUtc = new Date(Date.UTC(y, m - 1, d, Number(hh), Number(mm), Number(ss)));

  const offset1 = getTimeZoneOffsetMs(naiveUtc, timeZone);
  const adjusted1 = new Date(naiveUtc.getTime() - offset1);
  const offset2 = getTimeZoneOffsetMs(adjusted1, timeZone);
  return new Date(naiveUtc.getTime() - offset2);
}

function formatTimeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function formatDateKeyInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

function formatDayNumberInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    day: 'numeric',
  }).format(date);
}

function formatMonthYearInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatWeekOfInZone(date: Date, timeZone: string): string {
  // Use the week start computed in local time, but label it in the selected timezone.
  const weekStart = startOfWeek(date);
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(weekStart);
}

export function JobsCalendar({ jobs, isLoading }: JobsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [calendarTimezone, setCalendarTimezone] = useState<string>('America/New_York');
  const navigate = useNavigate();

  const calendarDays = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, view]);

  const jobsByDate = useMemo(() => {
    type CalendarJob = Job & {
      _calendarStart: Date;
      _calendarEnd: Date;
      _calendarDateKey: string;
      _startLabel: string;
      _endLabel: string;
    };

    const map = new Map<string, CalendarJob[]>();

    for (const job of jobs) {
      const sourceTz = job.timezone || calendarTimezone;
      const startUtc = zonedLocalDateTimeToUtc(job.job_date, job.start_time, sourceTz);
      const endUtc = zonedLocalDateTimeToUtc(job.job_date, job.end_time, sourceTz);

      const dateKey = formatDateKeyInZone(startUtc, calendarTimezone);
      const calendarJob: CalendarJob = {
        ...job,
        _calendarStart: startUtc,
        _calendarEnd: endUtc,
        _calendarDateKey: dateKey,
        _startLabel: formatTimeInZone(startUtc, calendarTimezone),
        _endLabel: formatTimeInZone(endUtc, calendarTimezone),
      };

      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(calendarJob);
    }

    map.forEach((dayJobs) => {
      dayJobs.sort((a, b) => a._calendarStart.getTime() - b._calendarStart.getTime());
    });

    return map;
  }, [jobs, calendarTimezone]);

  const navigatePrev = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleJobClick = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {view === 'month'
              ? formatMonthYearInZone(currentDate, calendarTimezone)
              : `Week of ${formatWeekOfInZone(currentDate, calendarTimezone)}`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={calendarTimezone} onValueChange={setCalendarTimezone}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder="Timezone" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              {timezoneOptions.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant={view === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setView('month')}
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setView('week')}
            >
              Week
            </Button>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-2">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            // Use noon to avoid off-by-one when converting across timezones
            const safeDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0);
            const dateKey = formatDateKeyInZone(safeDay, calendarTimezone);
            const dayJobs = jobsByDate.get(dateKey) || [];
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            const maxJobsToShow = view === 'week' ? 10 : 3;

            return (
              <div
                key={dateKey}
                className={cn(
                  'min-h-[100px] border border-border rounded-md p-1 transition-colors',
                  view === 'week' && 'min-h-[400px]',
                  !isCurrentMonth && view === 'month' && 'bg-muted/30',
                  isToday && 'bg-primary/5 border-primary/30'
                )}
              >
                {/* Day Number */}
                <div
                  className={cn(
                    'text-sm font-medium mb-1 px-1',
                    isToday && 'text-primary',
                    !isCurrentMonth && view === 'month' && 'text-muted-foreground/50'
                  )}
                >
                  {formatDayNumberInZone(safeDay, calendarTimezone)}
                </div>

                {/* Jobs */}
                <div className="space-y-0.5">
                  <TooltipProvider>
                    {dayJobs.slice(0, maxJobsToShow).map((job) => (
                      <Tooltip key={job.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleJobClick(job.id)}
                            className={cn(
                              'w-full text-left text-xs p-1 rounded border truncate hover:opacity-80 transition-opacity',
                              statusColors[job.status || 'new']
                            )}
                          >
                            <span className="font-medium">
                              {(job as any)._startLabel || job.start_time}
                            </span>
                            {' - '}
                            {job.deaf_client_name || job.job_number || 'Job'}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">
                              {job.job_number || 'N/A'}
                            </p>
                            <p className="text-sm">
                              {(job as any)._startLabel && (job as any)._endLabel
                                ? `${(job as any)._startLabel} - ${(job as any)._endLabel}`
                                : `${job.start_time} - ${job.end_time}`}
                            </p>
                            {job.deaf_client_name && (
                              <p className="text-sm">Client: {job.deaf_client_name}</p>
                            )}
                            {job.facility?.name && (
                              <p className="text-sm">Facility: {job.facility.name}</p>
                            )}
                            {job.interpreter && (
                              <p className="text-sm">
                                Interpreter: {job.interpreter.first_name}{' '}
                                {job.interpreter.last_name}
                              </p>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {job.status?.replace(/_/g, ' ') || 'new'}
                            </Badge>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>

                  {/* More jobs indicator */}
                  {dayJobs.length > maxJobsToShow && (
                    <button
                      onClick={() => {
                        setCurrentDate(day);
                        setView('week');
                      }}
                      className="w-full text-xs text-primary hover:underline text-left px-1"
                    >
                      +{dayJobs.length - maxJobsToShow} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 p-4 border-t border-border">
        {Object.entries(statusColors).map(([status, colorClass]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded border', colorClass)} />
            <span className="text-xs text-muted-foreground capitalize">
              {status.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
