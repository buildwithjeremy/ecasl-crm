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

type Facility = Database['public']['Tables']['facilities']['Row'];

interface FacilitiesTableProps {
  facilities: Facility[];
  isLoading: boolean;
  sort: { column: string; direction: SortDirection };
  onSort: (column: string) => void;
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'destructive',
  pending: 'secondary',
};

export function FacilitiesTable({ facilities, isLoading, sort, onSort }: FacilitiesTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="text-muted-foreground">Loading facilities...</div>;
  }

  if (facilities.length === 0) {
    return <div className="text-muted-foreground">No facilities found.</div>;
  }

  const handleRowClick = (facilityId: string) => {
    navigate(`/facilities/${facilityId}`);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead column="name" label="Name" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="admin_contact_name" label="Contact" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="status" label="Status" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="is_gsa" label="GSA" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="contract_status" label="Contract" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="rate_business_hours" label="Rate (Business)" currentSort={sort} onSort={onSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {facilities.map((facility) => (
            <TableRow 
              key={facility.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(facility.id)}
            >
              <TableCell className="font-medium">{facility.name}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{facility.admin_contact_name || '-'}</div>
                  <div className="text-muted-foreground">{facility.admin_contact_email || ''}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[facility.status] || 'secondary'}>
                  {facility.status}
                </Badge>
              </TableCell>
              <TableCell>
                {facility.is_gsa && <Badge variant="outline">GSA</Badge>}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{facility.contract_status || 'not_sent'}</Badge>
              </TableCell>
              <TableCell>
                {facility.rate_business_hours ? `$${facility.rate_business_hours}/hr` : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
