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

type Interpreter = Database['public']['Tables']['interpreters']['Row'];

interface InterpretersTableProps {
  interpreters: Interpreter[];
  isLoading: boolean;
  onEdit: (interpreter: Interpreter) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'destructive',
  pending: 'secondary',
};

export function InterpretersTable({ interpreters, isLoading, onEdit, onDelete }: InterpretersTableProps) {
  if (isLoading) {
    return <div className="text-muted-foreground">Loading interpreters...</div>;
  }

  if (interpreters.length === 0) {
    return <div className="text-muted-foreground">No interpreters found.</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Certifications</TableHead>
            <TableHead>Rate (Business)</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interpreters.map((interpreter) => (
            <TableRow key={interpreter.id}>
              <TableCell className="font-medium">
                {interpreter.first_name} {interpreter.last_name}
              </TableCell>
              <TableCell>{interpreter.email}</TableCell>
              <TableCell>{interpreter.phone || '-'}</TableCell>
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
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(interpreter)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(interpreter.id)}>
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
