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
import { Plus, Search, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { InvoiceDialog } from '@/components/invoices/InvoiceDialog';
import { FilterDropdown, FilterOption } from '@/components/ui/filter-dropdown';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import { useTableSort } from '@/hooks/use-table-sort';

type Invoice = {
  id: string;
  invoice_number: string;
  facility_id: string;
  job_id: string | null;
  status: 'draft' | 'submitted' | 'paid' | null;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  pdf_url: string | null;
  notes: string | null;
  total: number | null;
  facility: { name: string } | null;
  job: { job_number: string | null; deaf_client_name: string | null } | null;
};

const statusDisplayMap: Record<string, string> = {
  draft: 'Created',
  submitted: 'Sent',
  paid: 'Paid',
};

const statusVariantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  submitted: 'default',
  paid: 'outline',
};

const statusOptions: FilterOption[] = [
  { value: 'draft', label: 'Created' },
  { value: 'submitted', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
];

const hasPdfOptions: FilterOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const dueDateOptions: FilterOption[] = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'this_week', label: 'Due This Week' },
  { value: 'this_month', label: 'Due This Month' },
];

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [hasPdfFilter, setHasPdfFilter] = useState('all');
  const [dueDateFilter, setDueDateFilter] = useState('all');
  
  const { sort, handleSort } = useTableSort('created_at', 'desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', searchQuery, sort, statusFilter, hasPdfFilter, dueDateFilter],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          facility:facilities(name),
          job:jobs(job_number, deaf_client_name)
        `)
        .order(sort.column, { ascending: sort.direction === 'asc' });

      if (searchQuery) {
        // Split search into words and match each word against searchable fields
        const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/);
        for (const term of searchTerms) {
          query = query.or(`invoice_number.ilike.%${term}%,notes.ilike.%${term}%`);
        }
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (hasPdfFilter === 'yes') {
        query = query.not('pdf_url', 'is', null);
      } else if (hasPdfFilter === 'no') {
        query = query.is('pdf_url', null);
      }
      
      // Due date filter
      if (dueDateFilter !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dueDateFilter === 'overdue') {
          query = query.lt('due_date', today.toISOString().split('T')[0]).neq('status', 'paid');
        } else if (dueDateFilter === 'this_week') {
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          query = query.gte('due_date', today.toISOString().split('T')[0]).lte('due_date', weekEnd.toISOString().split('T')[0]);
        } else if (dueDateFilter === 'this_month') {
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          query = query.gte('due_date', today.toISOString().split('T')[0]).lte('due_date', monthEnd.toISOString().split('T')[0]);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const handleDialogClose = () => {
    setSelectedInvoice(null);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage invoices to facilities</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
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
                label="Has PDF"
                options={hasPdfOptions}
                value={hasPdfFilter}
                onValueChange={setHasPdfFilter}
              />
              <FilterDropdown
                label="Due Date"
                options={dueDateOptions}
                value={dueDateFilter}
                onValueChange={setDueDateFilter}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading invoices...</p>
          ) : !invoices?.length ? (
            <p className="text-muted-foreground">No invoices found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="invoice_number" label="Invoice #" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="job_id" label="Job #" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="facility_id" label="Facility" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="issued_date" label="Invoice Date" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="due_date" label="Due Date" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="paid_date" label="Paid Date" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="status" label="Status" currentSort={sort} onSort={handleSort} />
                  <SortableTableHead column="pdf_url" label="PDF" currentSort={sort} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.job?.job_number || '-'}</TableCell>
                    <TableCell>{invoice.facility?.name || '-'}</TableCell>
                    <TableCell>
                      {invoice.issued_date ? format(new Date(invoice.issued_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {invoice.paid_date ? format(new Date(invoice.paid_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {invoice.status && (
                        <Badge variant={statusVariantMap[invoice.status]}>
                          {statusDisplayMap[invoice.status]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {invoice.pdf_url ? (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText className="h-4 w-4 text-primary" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        invoice={selectedInvoice}
      />
    </div>
  );
}
