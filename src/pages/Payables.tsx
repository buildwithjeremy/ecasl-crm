import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { PayableDialog } from '@/components/payables/PayableDialog';

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

export default function Payables() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: payables, isLoading } = useQuery({
    queryKey: ['payables', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('interpreter_bills')
        .select(`
          *,
          interpreter:interpreters(first_name, last_name),
          job:jobs(job_number)
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`bill_number.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Payable[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('interpreter_bills').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      toast({ title: 'Payable deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting payable', description: error.message, variant: 'destructive' });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this payable?')) {
      deleteMutation.mutate(id);
    }
  };

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
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search payables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
                  <TableHead>Bill #</TableHead>
                  <TableHead>Interpreter</TableHead>
                  <TableHead>Job #</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(payable.id);
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

      <PayableDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        payable={selectedPayable}
      />
    </div>
  );
}
