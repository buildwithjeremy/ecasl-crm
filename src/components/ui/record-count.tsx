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

  // Handle irregular plurals
  let pluralLabel: string;
  if (count === 1) {
    pluralLabel = label;
  } else if (label.endsWith('y')) {
    pluralLabel = label.slice(0, -1) + 'ies';
  } else {
    pluralLabel = label + 's';
  }

  return (
    <p className={cn("text-sm text-muted-foreground whitespace-nowrap", className)}>
      {count} {pluralLabel}
    </p>
  );
}
