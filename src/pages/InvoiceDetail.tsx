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
import { Check, ChevronsUpDown, ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  status: z.enum(['draft', 'submitted', 'paid']),
  issued_date: z.string().optional(),
  due_date: z.string().optional(),
  paid_date: z.string().optional(),
  pdf_url: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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
};

type Job = {
  id: string;
  job_number: string | null;
  facility_id: string;
  mileage: number | null;
  facility_rate_mileage: number | null;
  interpreter_rate_mileage: number | null;
  travel_time_hours: number | null;
  travel_time_rate: number | null;
  parking: number | null;
  tolls: number | null;
  misc_fee: number | null;
  trilingual_rate_uplift: number | null;
  facility_rate_business: number | null;
  facility_rate_after_hours: number | null;
  billable_hours: number | null;
  emergency_fee_applied: boolean | null;
  holiday_fee_applied: boolean | null;
  total_facility_charge: number | null;
  facility_hourly_total: number | null;
  facility: { name: string; emergency_fee: number | null; holiday_fee: number | null } | null;
};

const statusDisplayMap: Record<string, string> = {
  draft: 'Created',
  submitted: 'Sent',
  paid: 'Paid',
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(id || null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: 'draft',
      issued_date: '',
      due_date: '',
      paid_date: '',
      pdf_url: '',
      notes: '',
    },
  });

  // Fetch all invoices for search
  const { data: invoices } = useQuery({
    queryKey: ['invoices-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, facility:facilities(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as { id: string; invoice_number: string; facility: { name: string } | null }[];
    },
  });

  // Fetch selected invoice
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select('*, facility:facilities(name)')
        .eq('id', selectedInvoiceId)
        .maybeSingle();
      if (error) throw error;
      return data as Invoice | null;
    },
    enabled: !!selectedInvoiceId,
  });

  // Fetch linked job details
  const { data: job } = useQuery({
    queryKey: ['invoice-job', invoice?.job_id],
    queryFn: async () => {
      if (!invoice?.job_id) return null;
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, job_number, facility_id,
          mileage, facility_rate_mileage,
          travel_time_hours, travel_time_rate,
          parking, tolls, misc_fee, trilingual_rate_uplift,
          facility_rate_business, facility_rate_after_hours,
          billable_hours, emergency_fee_applied, holiday_fee_applied,
          total_facility_charge, facility_hourly_total,
          facility:facilities(name, emergency_fee, holiday_fee)
        `)
        .eq('id', invoice.job_id)
        .maybeSingle();
      if (error) throw error;
      return data as Job | null;
    },
    enabled: !!invoice?.job_id,
  });

  // Update URL when invoice changes
  useEffect(() => {
    if (selectedInvoiceId && selectedInvoiceId !== id) {
      navigate(`/invoices/${selectedInvoiceId}`, { replace: true });
    }
  }, [selectedInvoiceId, id, navigate]);

  // Populate form when invoice loads
  useEffect(() => {
    if (invoice) {
      form.reset({
        status: invoice.status || 'draft',
        issued_date: invoice.issued_date || '',
        due_date: invoice.due_date || '',
        paid_date: invoice.paid_date || '',
        pdf_url: invoice.pdf_url || '',
        notes: invoice.notes || '',
      });
    }
  }, [invoice, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedInvoiceId) return;
      const { error } = await supabase
        .from('invoices')
        .update({
          status: data.status,
          issued_date: data.issued_date || null,
          due_date: data.due_date || null,
          paid_date: data.paid_date || null,
          pdf_url: data.pdf_url || null,
          notes: data.notes || null,
        } as never)
        .eq('id', selectedInvoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', selectedInvoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Invoice updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error updating invoice', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const handleGeneratePdf = async () => {
    if (!selectedInvoiceId || !job) {
      toast({
        title: 'Cannot generate PDF',
        description: 'This invoice must be linked to a job to generate a PDF.',
        variant: 'destructive'
      });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: selectedInvoiceId }
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        form.setValue('pdf_url', data.pdfUrl);
        queryClient.invalidateQueries({ queryKey: ['invoice', selectedInvoiceId] });
        toast({
          title: 'PDF Generated',
          description: data.note || 'Invoice PDF has been generated and saved.'
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error generating PDF',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const selectedInvoice = invoices?.find((i) => i.id === selectedInvoiceId);

  // Calculate derived values
  const mileageTotal = (job?.mileage || 0) * (job?.facility_rate_mileage || 0);
  const travelTimeTotal = (job?.travel_time_hours || 0) * (job?.travel_time_rate || 0);
  const facilityHourlyTotal = (job?.billable_hours || 0) * (job?.facility_rate_business || 0);
  const emergencyFee = job?.emergency_fee_applied ? (job.facility?.emergency_fee || 0) : 0;
  const holidayFee = job?.holiday_fee_applied ? (job.facility?.holiday_fee || 0) : 0;
  
  // Calculate totals for summary
  const hourlyTotal = job?.facility_hourly_total ?? 0;
  const travelFeeTotal = mileageTotal + travelTimeTotal + (job?.parking || 0) + (job?.tolls || 0) + (job?.misc_fee || 0) + emergencyFee;
  const overallTotal = hourlyTotal + travelFeeTotal;

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice Details</h1>
          <p className="text-muted-foreground">View and edit invoice information</p>
        </div>
      </div>

      {/* Invoice Search/Select */}
      <Card>
        <CardHeader>
          <CardTitle>Select Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {selectedInvoice
                  ? `${selectedInvoice.invoice_number} - ${selectedInvoice.facility?.name || 'N/A'}`
                  : 'Search for an invoice...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Search invoices..." />
                <CommandList>
                  <CommandEmpty>No invoice found.</CommandEmpty>
                  <CommandGroup>
                    {invoices?.map((inv) => (
                      <CommandItem
                        key={inv.id}
                        value={`${inv.invoice_number} ${inv.facility?.name || ''}`}
                        onSelect={() => {
                          setSelectedInvoiceId(inv.id);
                          setSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedInvoiceId === inv.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {inv.invoice_number} - {inv.facility?.name || 'N/A'}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {invoiceLoading && <p className="text-muted-foreground">Loading invoice...</p>}

      {invoice && (
        <>
          {/* Invoice Details Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invoice #{invoice.invoice_number}</CardTitle>
                {invoice.status && (
                  <Badge variant={invoice.status === 'paid' ? 'outline' : invoice.status === 'submitted' ? 'default' : 'secondary'}>
                    {statusDisplayMap[invoice.status]}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Totals Summary */}
              {job && (
                <div className="mb-6 pb-6 border-b border-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/50 rounded-lg p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Hourly Total</p>
                      <p className="text-lg font-semibold">{formatCurrency(hourlyTotal)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Travel/Fee Total</p>
                      <p className="text-lg font-semibold">{formatCurrency(travelFeeTotal)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Overall Total</p>
                      <p className="text-lg font-semibold text-primary">{formatCurrency(overallTotal)}</p>
                    </div>
                  </div>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                              <SelectItem value="draft">Created</SelectItem>
                              <SelectItem value="submitted">Sent</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="issued_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
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
                      name="pdf_url"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Invoice PDF URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGeneratePdf}
                      disabled={isGeneratingPdf || !job}
                    >
                      {isGeneratingPdf ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate PDF
                        </>
                      )}
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Job Details Section */}
          {job ? (
            <Card>
              <CardHeader>
                <CardTitle>Job Details - {job.job_number}</CardTitle>
              </CardHeader>
              <CardContent>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Facility Info */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Facility Name</p>
                    <p className="text-lg font-semibold">{job.facility?.name || '-'}</p>
                  </div>

                  {/* Mileage */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Mileage</p>
                    <p className="text-lg font-semibold">{job.mileage ?? '-'} miles</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Mileage Rate</p>
                    <p className="text-lg font-semibold">{formatCurrency(job.interpreter_rate_mileage ?? 0.7)}/mile</p>
                  </div>

                  {/* Travel Time */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Travel Time</p>
                    <p className="text-lg font-semibold">{job.travel_time_hours ?? '-'} hours</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Travel Time Rate</p>
                    <p className="text-lg font-semibold">{formatCurrency(job.travel_time_rate)}/hr</p>
                  </div>

                  {/* Fees */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Parking Fee</p>
                    <p className="text-lg font-semibold">{formatCurrency(job.parking)}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Toll Fee</p>
                    <p className="text-lg font-semibold">{formatCurrency(job.tolls)}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Misc Fee</p>
                    <p className="text-lg font-semibold">{formatCurrency(job.misc_fee)}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Trilingual Rate Uplift</p>
                    <p className="text-lg font-semibold">{formatCurrency(job.trilingual_rate_uplift)}</p>
                  </div>

                  {/* Rates & Hours */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Facility Rate</p>
                    <p className="text-lg font-semibold">{formatCurrency(job.facility_rate_business)}/hr</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Billable Hours</p>
                    <p className="text-lg font-semibold">{job.billable_hours ?? '-'} hours</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Emergency Fee</p>
                    <p className="text-lg font-semibold">
                      {job.emergency_fee_applied ? formatCurrency(emergencyFee) : '-'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Holiday Fee</p>
                    <p className="text-lg font-semibold">
                      {job.holiday_fee_applied ? formatCurrency(holidayFee) : '-'}
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>
          ) : invoice.job_id ? (
            <Card>
              <CardContent className="py-6">
                <p className="text-muted-foreground">Loading job details...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6">
                <p className="text-muted-foreground">No job linked to this invoice.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedInvoiceId && (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">Select an invoice to view details.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
