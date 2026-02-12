import { useState, useCallback } from 'react';
import type { SortDirection } from '@/components/ui/sortable-table-head';

export interface TableSort {
  column: string;
  direction: SortDirection;
}

export function useTableSort(defaultColumn: string, defaultDirection: SortDirection = 'asc', persistKey?: string) {
  const [sort, setSort] = useState<TableSort>(() => {
    if (persistKey) {
      try {
        const stored = localStorage.getItem(`table-sort-${persistKey}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return { column: defaultColumn, direction: defaultDirection };
  });

  const handleSort = useCallback((column: string) => {
    setSort((prev) => {
      const next = prev.column === column
        ? { column, direction: (prev.direction === 'asc' ? 'desc' : 'asc') as SortDirection }
        : { column, direction: 'asc' as SortDirection };
      if (persistKey) {
        try { localStorage.setItem(`table-sort-${persistKey}`, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [persistKey]);

  return { sort, handleSort };
}
