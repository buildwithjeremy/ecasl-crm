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
  parseISO,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
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

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export function JobsCalendar({ jobs, isLoading }: JobsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
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
    const map = new Map<string, Job[]>();
    jobs.forEach((job) => {
      const dateKey = job.job_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(job);
    });
    // Sort jobs by start time within each day
    map.forEach((dayJobs) => {
      dayJobs.sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return map;
  }, [jobs]);

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
              ? format(currentDate, 'MMMM yyyy')
              : `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
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
            const dateKey = format(day, 'yyyy-MM-dd');
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
                  {format(day, 'd')}
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
                              {formatTime(job.start_time)}
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
                              {formatTime(job.start_time)} - {formatTime(job.end_time)}
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
