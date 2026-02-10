import { Check, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const STEPS = [
  { key: 'new', label: 'New', short: 'New' },
  { key: 'outreach_in_progress', label: 'Outreach', short: 'Out' },
  { key: 'confirmed', label: 'Confirmed', short: 'Conf' },
  { key: 'complete', label: 'Complete', short: 'Done' },
  { key: 'ready_to_bill', label: 'Ready to Bill', short: 'RTB' },
  { key: 'billed', label: 'Billed', short: 'Bill' },
  { key: 'paid', label: 'Paid', short: 'Paid' },
] as const;

interface JobStatusStepperProps {
  currentStatus: string;
}

export function JobStatusStepper({ currentStatus }: JobStatusStepperProps) {
  const isCancelled = currentStatus === 'cancelled';
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);

  if (isCancelled) {
    return (
      <div className="relative flex items-center justify-center rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <XCircle className="h-4 w-4" />
          <span className="text-sm font-medium">This job has been cancelled</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-0 rounded-lg border border-border bg-card px-3 py-3 sm:px-4">
      {STEPS.map((step, index) => {
        const isCompleted = currentIndex > index;
        const isCurrent = currentIndex === index;
        const isFuture = currentIndex < index;

        return (
          <div key={step.key} className="flex flex-1 items-start">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors sm:h-8 sm:w-8',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20',
                  isFuture && 'border-muted-foreground/30 bg-background text-muted-foreground/40',
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : (index + 1)}
              </div>
              <span
                className={cn(
                  'text-center text-[10px] leading-tight sm:text-xs',
                  isCompleted && 'font-medium text-foreground',
                  isCurrent && 'font-semibold text-primary',
                  isFuture && 'text-muted-foreground/60',
                )}
              >
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.short}</span>
              </span>
            </div>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div className="mt-3.5 flex flex-1 items-center px-1 sm:mt-4 sm:px-1.5">
                <div
                  className={cn(
                    'h-0.5 w-full rounded-full',
                    currentIndex > index ? 'bg-primary' : 'bg-muted-foreground/20',
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
