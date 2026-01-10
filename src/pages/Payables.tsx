import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { PayableDialog } from '@/components/payables/PayableDialog';
import { FilterDropdown, FilterOption } from '@/components/ui/filter-dropdown';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useTableSort } from '@/hooks/use-table-sort';

type Payable = {
  id: string;
  bill_number: string | null;
  interpreter_id: string;
  job_id: string;
  status: 'queued' | 'paid' | null;
  paid_date: string | null;
  notes: string | null;
  total: number | null;
  interpreter: { first_name: string; last_name: string } | null;
  job: { job_number: string | null } | null;
};

const statusDisplayMap: Record<string, string> = {
  queued: 'Payment Pending',
  paid: 'Paid',
};

const statusVariantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
  queued: 'secondary',
  paid: 'outline',
};

const statusOptions: FilterOption[] = [
  { value: 'queued', label: 'Payment Pending' },
  { value: 'paid', label: 'Paid' },
];

const paymentMethodOptions: FilterOption[] = [
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
];

export default function Payables() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  
  const { sort, handleSort } = useTableSort('created_at', 'desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: payables, isLoading } = useQuery({
    queryKey: ['payables', searchQuery, sort, statusFilter, paymentMethodFilter],
    queryFn: async () => {
      let query = supabase
        .from('interpreter_bills')
        .select(`
          *,
          interpreter:interpreters(first_name, last_name),
          job:jobs(job_number)
        `)
        .order(sort.column, { ascending: sort.direction === 'asc' });

      if (searchQuery) {
        // Split search into words and match each word against searchable fields
        const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/);
        for (const term of searchTerms) {
          query = query.or(`bill_number.ilike.%${term}%,notes.ilike.%${term}%`);
        }
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (paymentMethodFilter !== 'all') {
        query = query.eq('payment_method', paymentMethodFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Payable[];
    },
  });

  const handleDialogClose = () => {
    setSelectedPayable(null);
    setDialogOpen(false);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payables</h1>
          <p className="text-muted-foreground">Manage payments to interpreters</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Payable
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search payables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <FilterDropdown
                label="Status"
                options={statusOptions}
                value={statusFilter}
                onValueChange={setStatusFilter}
              />
              <FilterDropdown
                label="Payment"
                options={paymentMethodOptions}
                value={paymentMethodFilter}
                onValueChange={setPaymentMethodFilter}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading payables...</p>
          ) : !payables?.length ? (
            <p className="text-muted-foreground">No payables found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="bill_number" label="Bill #" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="interpreter_id" label="Interpreter" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="job_id" label="Job #" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="total" label="Total" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="paid_date" label="Paid Date" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="status" label="Status" currentSort={sort} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((payable) => (
                  <TableRow
                    key={payable.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/payables/${payable.id}`)}
                  >
                    <TableCell className="font-medium">{payable.bill_number || '-'}</TableCell>
                    <TableCell>
                      {payable.interpreter
                        ? `${payable.interpreter.first_name} ${payable.interpreter.last_name}`
                        : '-'}
                    </TableCell>
                    <TableCell>{payable.job?.job_number || '-'}</TableCell>
                    <TableCell>{formatCurrency(payable.total)}</TableCell>
                    <TableCell>
                      {payable.paid_date ? format(new Date(payable.paid_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {payable.status && (
                        <Badge variant={statusVariantMap[payable.status]}>
                          {statusDisplayMap[payable.status]}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PayableDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        payable={selectedPayable}
      />
    </div>
  );
}
