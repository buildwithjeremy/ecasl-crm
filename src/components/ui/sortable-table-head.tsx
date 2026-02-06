import { TableHead } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableTableHeadProps {
  column: string;
  label: string;
  currentSort: { column: string; direction: SortDirection };
  onSort: (column: string) => void;
  className?: string;
}

export function SortableTableHead({
  column,
  label,
  currentSort,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = currentSort.column === column;
  const direction = isActive ? currentSort.direction : null;

  const handleClick = () => {
    onSort(column);
  };

  return (
    <TableHead
      className={cn(
        'cursor-pointer select-none hover:bg-muted/50',
        isActive && 'bg-muted/30',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        <span className={cn(isActive && 'font-semibold')}>{label}</span>
        {direction === 'asc' ? (
          <ArrowUp className="h-4 w-4 text-primary" />
        ) : direction === 'desc' ? (
          <ArrowDown className="h-4 w-4 text-primary" />
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );
}
