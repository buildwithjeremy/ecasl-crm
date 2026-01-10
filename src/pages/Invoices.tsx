import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { InvoiceDialog } from '@/components/invoices/InvoiceDialog';
import { SortSelect, SortOption } from '@/components/ui/sort-select';

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

const sortOptions: SortOption[] = [
  { value: 'created_at-desc', label: 'Created (Newest)' },
  { value: 'created_at-asc', label: 'Created (Oldest)' },
  { value: 'invoice_number-asc', label: 'Invoice # (A-Z)' },
  { value: 'invoice_number-desc', label: 'Invoice # (Z-A)' },
  { value: 'issued_date-desc', label: 'Issue Date (Newest)' },
  { value: 'issued_date-asc', label: 'Issue Date (Oldest)' },
  { value: 'due_date-asc', label: 'Due Date (Soonest)' },
  { value: 'due_date-desc', label: 'Due Date (Latest)' },
  { value: 'status-asc', label: 'Status (A-Z)' },
  { value: 'status-desc', label: 'Status (Z-A)' },
];

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sortBy, setSortBy] = useState('created_at-desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', searchQuery, sortBy],
    queryFn: async () => {
      const [field, direction] = sortBy.split('-') as [string, 'asc' | 'desc'];
      let query = supabase
        .from('invoices')
        .select(`
          *,
          facility:facilities(name),
          job:jobs(job_number, deaf_client_name)
        `)
        .order(field, { ascending: direction === 'asc' });

      if (searchQuery) {
        query = query.or(`invoice_number.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Invoice deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting invoice', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteMutation.mutate(id);
    }
  };

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
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <SortSelect options={sortOptions} value={sortBy} onValueChange={setSortBy} />
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
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Job #</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(invoice.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
