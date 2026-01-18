import { cn } from '@/lib/utils';

interface RecordCountProps {
  count: number;
  label: string;
  isLoading?: boolean;
  className?: string;
}

export function RecordCount({ count, label, isLoading, className }: RecordCountProps) {
  if (isLoading) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>Loading...</p>
    );
  }

  const pluralLabel = count === 1 ? label : `${label}s`;

  return (
    <p className={cn("text-sm text-muted-foreground whitespace-nowrap", className)}>
      {count} {pluralLabel}
    </p>
  );
}
