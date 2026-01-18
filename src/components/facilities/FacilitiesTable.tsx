import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import type { Database, Json } from '@/integrations/supabase/types';
import { BillingContact } from '@/components/facilities/fields';

type Facility = Database['public']['Tables']['facilities']['Row'];

// Helper to safely get first billing contact
const getPrimaryContact = (billingContacts: Json | null): BillingContact | null => {
  if (!billingContacts || !Array.isArray(billingContacts) || billingContacts.length === 0) {
    return null;
  }
  const first = billingContacts[0];
  if (typeof first === 'object' && first !== null) {
    return first as unknown as BillingContact;
  }
  return null;
};

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
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow>
            <SortableTableHead column="name" label="Name" currentSort={sort} onSort={onSort} />
            <TableHead className="hidden sm:table-cell">Contact</TableHead>
            <SortableTableHead column="status" label="Status" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="is_gsa" label="GSA" currentSort={sort} onSort={onSort} className="hidden md:table-cell" />
            <SortableTableHead column="contract_status" label="Contract" currentSort={sort} onSort={onSort} className="hidden lg:table-cell" />
            <SortableTableHead column="rate_business_hours" label="Rate" currentSort={sort} onSort={onSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {facilities.map((facility) => {
            const primaryContact = getPrimaryContact(facility.billing_contacts);
            return (
              <TableRow 
                key={facility.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(facility.id)}
              >
              <TableCell className="font-medium">{facility.name}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="text-sm">
                    <div>{primaryContact?.name || '-'}</div>
                    <div className="text-muted-foreground">{primaryContact?.email || ''}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[facility.status ?? 'pending'] || 'secondary'}>
                    {facility.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {facility.is_gsa && <Badge variant="outline">GSA</Badge>}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant="outline">{facility.contract_status || 'not_sent'}</Badge>
                </TableCell>
                <TableCell>
                  {facility.rate_business_hours ? `$${facility.rate_business_hours}/hr` : '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}