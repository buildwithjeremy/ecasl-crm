import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  facility_id: z.string().min(1, 'Facility is required'),
  job_id: z.string().optional(),
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
};

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: () => void;
  invoice: Invoice | null;
}

export function InvoiceDialog({ open, onOpenChange, invoice }: InvoiceDialogProps) {
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      facility_id: '',
      job_id: '',
      status: 'draft',
      issued_date: '',
      due_date: '',
      paid_date: '',
      pdf_url: '',
      notes: '',
    },
  });

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_number, deaf_client_name')
        .order('job_date', { ascending: false });
      if (error) throw error;
      return data as { id: string; job_number: string | null; deaf_client_name: string | null }[];
    },
  });

  useEffect(() => {
    if (invoice) {
      form.reset({
        facility_id: invoice.facility_id,
        job_id: invoice.job_id || '',
        status: invoice.status || 'draft',
        issued_date: invoice.issued_date || '',
        due_date: invoice.due_date || '',
        paid_date: invoice.paid_date || '',
        pdf_url: invoice.pdf_url || '',
        notes: invoice.notes || '',
      });
    } else {
      form.reset({
        facility_id: '',
        job_id: '',
        status: 'draft',
        issued_date: '',
        due_date: '',
        paid_date: '',
        pdf_url: '',
        notes: '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: Record<string, unknown> = {
        facility_id: data.facility_id,
        job_id: data.job_id || null,
        status: data.status,
        issued_date: data.issued_date || null,
        due_date: data.due_date || null,
        paid_date: data.paid_date || null,
        pdf_url: data.pdf_url || null,
        notes: data.notes || null,
      };

      if (invoice) {
        const { error } = await supabase
          .from('invoices')
          .update(payload as never)
          .eq('id', invoice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('invoices').insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: invoice ? 'Invoice updated' : 'Invoice created' });
      onOpenChange();
    },
    onError: (error) => {
      toast({ title: 'Error saving invoice', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const selectedFacility = facilities?.find((f) => f.id === form.watch('facility_id'));
  const selectedJob = jobs?.find((j) => j.id === form.watch('job_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Edit Invoice' : 'New Invoice'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Facility Select */}
              <FormField
                control={form.control}
                name="facility_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Facility *</FormLabel>
                    <Popover open={facilityOpen} onOpenChange={setFacilityOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedFacility?.name || 'Select facility...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search facilities..." />
                          <CommandList>
                            <CommandEmpty>No facility found.</CommandEmpty>
                            <CommandGroup>
                              {facilities?.map((facility) => (
                                <CommandItem
                                  key={facility.id}
                                  value={facility.name}
                                  onSelect={() => {
                                    field.onChange(facility.id);
                                    setFacilityOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.value === facility.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {facility.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Job Select */}
              <FormField
                control={form.control}
                name="job_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Job</FormLabel>
                    <Popover open={jobOpen} onOpenChange={setJobOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedJob
                              ? `${selectedJob.job_number} - ${selectedJob.deaf_client_name || 'N/A'}`
                              : 'Select job...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search jobs..." />
                          <CommandList>
                            <CommandEmpty>No job found.</CommandEmpty>
                            <CommandGroup>
                              {jobs?.map((job) => (
                                <CommandItem
                                  key={job.id}
                                  value={`${job.job_number} ${job.deaf_client_name || ''}`}
                                  onSelect={() => {
                                    field.onChange(job.id);
                                    setJobOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.value === job.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {job.job_number} - {job.deaf_client_name || 'N/A'}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
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

              {/* Invoice Date */}
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

              {/* Due Date */}
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

              {/* Paid Date */}
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

              {/* PDF URL */}
              <FormField
                control={form.control}
                name="pdf_url"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Invoice PDF URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
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
              <Button type="button" variant="outline" onClick={onOpenChange}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {invoice ? 'Update' : 'Create'} Invoice
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
