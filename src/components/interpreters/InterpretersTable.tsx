import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import type { Database } from '@/types/database';

type Interpreter = Database['public']['Tables']['interpreters']['Row'];

interface InterpretersTableProps {
  interpreters: Interpreter[];
  isLoading: boolean;
  sort: { column: string; direction: SortDirection };
  onSort: (column: string) => void;
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'destructive',
  pending: 'secondary',
};

export function InterpretersTable({ interpreters, isLoading, sort, onSort }: InterpretersTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (interpreterId: string) => {
    navigate(`/interpreters/${interpreterId}`);
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading interpreters...</div>;
  }

  if (interpreters.length === 0) {
    return <div className="text-muted-foreground">No interpreters found.</div>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[650px]">
        <TableHeader>
          <TableRow>
            <SortableTableHead column="last_name" label="Name" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="email" label="Email" currentSort={sort} onSort={onSort} className="hidden sm:table-cell" />
            <SortableTableHead column="phone" label="Phone" currentSort={sort} onSort={onSort} className="hidden md:table-cell" />
            <SortableTableHead column="status" label="Status" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="rid_certified" label="Certs" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="rate_business_hours" label="Rate" currentSort={sort} onSort={onSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {interpreters.map((interpreter) => (
            <TableRow 
              key={interpreter.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(interpreter.id)}
            >
              <TableCell className="font-medium">
                {interpreter.first_name} {interpreter.last_name}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{interpreter.email}</TableCell>
              <TableCell className="hidden md:table-cell">{interpreter.phone || '-'}</TableCell>
              <TableCell>
                <Badge variant={statusColors[interpreter.status] || 'secondary'}>
                  {interpreter.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {interpreter.rid_certified && <Badge variant="outline">RID</Badge>}
                  {interpreter.nic_certified && <Badge variant="outline">NIC</Badge>}
                </div>
              </TableCell>
              <TableCell>
                {interpreter.rate_business_hours ? `$${interpreter.rate_business_hours}/hr` : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
