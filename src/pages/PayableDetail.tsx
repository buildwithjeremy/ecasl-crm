import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  status: z.enum(['queued', 'paid']),
  paid_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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
  job: { 
    job_number: string | null;
    interpreter_hourly_total: number | null;
    interpreter_billable_total: number | null;
  } | null;
};

const statusDisplayMap: Record<string, string> = {
  queued: 'Payment Pending',
  paid: 'Paid',
};

export default function PayableDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedPayableId, setSelectedPayableId] = useState<string | null>(id || null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: 'queued',
      paid_date: '',
      notes: '',
    },
  });

  // Fetch all payables for search
  const { data: payables } = useQuery({
    queryKey: ['payables-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interpreter_bills')
        .select('id, bill_number, interpreter:interpreters(first_name, last_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as { id: string; bill_number: string | null; interpreter: { first_name: string; last_name: string } | null }[];
    },
  });

  // Fetch selected payable
  const { data: payable, isLoading: payableLoading } = useQuery({
    queryKey: ['payable', selectedPayableId],
    queryFn: async () => {
      if (!selectedPayableId) return null;
      const { data, error } = await supabase
        .from('interpreter_bills')
        .select('*, interpreter:interpreters(first_name, last_name), job:jobs(job_number, interpreter_hourly_total, interpreter_billable_total)')
        .eq('id', selectedPayableId)
        .maybeSingle();
      if (error) throw error;
      return data as Payable | null;
    },
    enabled: !!selectedPayableId,
  });

  // Update URL when payable changes
  useEffect(() => {
    if (selectedPayableId && selectedPayableId !== id) {
      navigate(`/payables/${selectedPayableId}`, { replace: true });
    }
  }, [selectedPayableId, id, navigate]);

  // Populate form when payable loads
  useEffect(() => {
    if (payable) {
      form.reset({
        status: payable.status || 'queued',
        paid_date: payable.paid_date || '',
        notes: payable.notes || '',
      });
    }
  }, [payable, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedPayableId) return;
      const { error } = await supabase
        .from('interpreter_bills')
        .update({
          status: data.status,
          paid_date: data.paid_date || null,
          notes: data.notes || null,
        } as never)
        .eq('id', selectedPayableId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payable', selectedPayableId] });
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      toast({ title: 'Payable updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error updating payable', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const selectedPayable = payables?.find((p) => p.id === selectedPayableId);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/payables')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payable Details</h1>
          <p className="text-muted-foreground">View and edit payable information</p>
        </div>
      </div>

      {/* Payable Search/Select */}
      <Card>
        <CardHeader>
          <CardTitle>Select Payable</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {selectedPayable
                  ? `${selectedPayable.bill_number || 'N/A'} - ${selectedPayable.interpreter?.first_name} ${selectedPayable.interpreter?.last_name}`
                  : 'Search for a payable...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Search payables..." />
                <CommandList>
                  <CommandEmpty>No payable found.</CommandEmpty>
                  <CommandGroup>
                    {payables?.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.bill_number || ''} ${p.interpreter?.first_name || ''} ${p.interpreter?.last_name || ''}`}
                        onSelect={() => {
                          setSelectedPayableId(p.id);
                          setSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedPayableId === p.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {p.bill_number || 'N/A'} - {p.interpreter?.first_name} {p.interpreter?.last_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {payableLoading && <p className="text-muted-foreground">Loading payable...</p>}

      {payable && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bill #{payable.bill_number || 'N/A'}</CardTitle>
              {payable.status && (
                <Badge variant={payable.status === 'paid' ? 'outline' : 'secondary'}>
                  {statusDisplayMap[payable.status]}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Interpreter</p>
                <p className="text-lg font-semibold">
                  {payable.interpreter
                    ? `${payable.interpreter.first_name} ${payable.interpreter.last_name}`
                    : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Job #</p>
                <p className="text-lg font-semibold">{payable.job?.job_number || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Hourly Total</p>
                <p className="text-lg font-semibold">{formatCurrency(payable.job?.interpreter_hourly_total)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Travel/Fee Total</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(
                    (payable.job?.interpreter_billable_total ?? 0) - (payable.job?.interpreter_hourly_total ?? 0)
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Overall Total</p>
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency(payable.job?.interpreter_billable_total)}
                </p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="queued">Payment Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paid_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={mutation.isPending}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {!selectedPayableId && (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">Select a payable to view details.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
