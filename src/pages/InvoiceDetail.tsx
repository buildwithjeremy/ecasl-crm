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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: 'draft',
      issued_date: '',
      due_date: '',
      paid_date: '',
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
        notes: invoice.notes || '',
      });
      setPdfUrl(invoice.pdf_url || null);
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
          notes: data.notes || null,
        } as never)
        .eq('id', selectedInvoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', selectedInvoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      form.reset(form.getValues());
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
        setPdfUrl(data.pdfUrl);
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
  const trilingualUplift = job?.trilingual_rate_uplift || 0;
  const facilityHourlyTotal = (job?.billable_hours || 0) * ((job?.facility_rate_business || 0) + trilingualUplift);
  const emergencyFee = job?.emergency_fee_applied ? (job.facility?.emergency_fee || 0) : 0;
  const holidayFee = job?.holiday_fee_applied ? (job.facility?.holiday_fee || 0) : 0;
  
  const hourlyTotal = job?.facility_hourly_total ?? 0;
  const travelFeeTotal = mileageTotal + travelTimeTotal + (job?.parking || 0) + (job?.tolls || 0) + (job?.misc_fee || 0) + emergencyFee;
  const overallTotal = hourlyTotal + travelFeeTotal;

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-14 z-10 bg-background py-3 border-b -mx-6 px-6 -mt-6 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {invoice ? `Invoice #${invoice.invoice_number}` : 'Invoice Details'}
          </h1>
          
          {/* Compact Invoice Selector */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[220px] justify-between text-sm"
              >
                <span className="truncate">
                  {selectedInvoice
                    ? `${selectedInvoice.invoice_number} - ${selectedInvoice.facility?.name || 'N/A'}`
                    : 'Select invoice...'}
                </span>
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

          {/* Save button in header with unsaved indicator */}
          {invoice && (
            <div className="ml-auto flex items-center gap-2">
              {form.formState.isDirty && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Unsaved
                </span>
              )}
              <Button 
                type="submit" 
                form="invoice-detail-form"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {invoiceLoading && <p className="text-muted-foreground">Loading invoice...</p>}

      {invoice && (
        <>
          {/* Totals Summary */}
          {job && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          {/* Invoice Details Form */}
          <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Invoice Details</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf || !job}
                  size="sm"
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
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form id="invoice-detail-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                    <div className="md:col-span-2 space-y-2">
                      <FormLabel>Invoice PDF URL</FormLabel>
                      {pdfUrl ? (
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-primary underline hover:text-primary/80 truncate"
                        >
                          {pdfUrl}
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">No PDF generated yet</p>
                      )}
                    </div>

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
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Line Items */}
          {job && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Line Items (Job #{job.job_number})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hourlyTotal > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Interpreter Services {trilingualUplift > 0 ? '(incl. Trilingual)' : ''}</span>
                      <span className="font-medium">{formatCurrency(hourlyTotal)}</span>
                    </div>
                  )}
                  {mileageTotal > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Mileage ({job.mileage} mi × ${job.facility_rate_mileage}/mi)</span>
                      <span className="font-medium">{formatCurrency(mileageTotal)}</span>
                    </div>
                  )}
                  {travelTimeTotal > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Travel Time ({job.travel_time_hours} hrs × ${job.travel_time_rate}/hr)</span>
                      <span className="font-medium">{formatCurrency(travelTimeTotal)}</span>
                    </div>
                  )}
                  {(job.parking || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Parking</span>
                      <span className="font-medium">{formatCurrency(job.parking)}</span>
                    </div>
                  )}
                  {(job.tolls || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Tolls</span>
                      <span className="font-medium">{formatCurrency(job.tolls)}</span>
                    </div>
                  )}
                  {(job.misc_fee || 0) > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Miscellaneous Fee</span>
                      <span className="font-medium">{formatCurrency(job.misc_fee)}</span>
                    </div>
                  )}
                  {emergencyFee > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Emergency Fee</span>
                      <span className="font-medium">{formatCurrency(emergencyFee)}</span>
                    </div>
                  )}
                  {holidayFee > 0 && (
                    <div className="flex justify-between py-2 border-b">
                      <span>Holiday Fee</span>
                      <span className="font-medium">{formatCurrency(holidayFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(overallTotal)}</span>
                  </div>
                </div>
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