import { useState, useCallback } from 'react';
import type { SortDirection } from '@/components/ui/sortable-table-head';

export interface TableSort {
  column: string;
  direction: SortDirection;
}

export function useTableSort(defaultColumn: string, defaultDirection: SortDirection = 'asc') {
  const [sort, setSort] = useState<TableSort>({
    column: defaultColumn,
    direction: defaultDirection,
  });

  const handleSort = useCallback((column: string) => {
    setSort((prev) => {
      if (prev.column === column) {
        // Cycle through: asc -> desc -> asc
        return {
          column,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      // New column, start with asc
      return { column, direction: 'asc' };
    });
  }, []);

  return { sort, handleSort };
}
