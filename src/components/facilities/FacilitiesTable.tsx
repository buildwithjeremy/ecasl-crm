import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import type { Database } from '@/types/database';

type Facility = Database['public']['Tables']['facilities']['Row'];

interface FacilitiesTableProps {
  facilities: Facility[];
  isLoading: boolean;
  onEdit: (facility: Facility) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'destructive',
  pending: 'secondary',
};

export function FacilitiesTable({ facilities, isLoading, onEdit, onDelete }: FacilitiesTableProps) {
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
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>GSA</TableHead>
            <TableHead>Rate (Business)</TableHead>
            <TableHead>Net Terms</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
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
                {facility.rate_business_hours ? `$${facility.rate_business_hours}/hr` : '-'}
              </TableCell>
              <TableCell>Net {facility.net_terms}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { e.stopPropagation(); onEdit(facility); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { e.stopPropagation(); onDelete(facility.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
