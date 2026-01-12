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
  interpreter_id: z.string().min(1, 'Interpreter is required'),
  job_id: z.string().min(1, 'Job is required'),
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
};

interface PayableDialogProps {
  open: boolean;
  onOpenChange: () => void;
  payable: Payable | null;
}

export function PayableDialog({ open, onOpenChange, payable }: PayableDialogProps) {
  const [interpreterOpen, setInterpreterOpen] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      interpreter_id: '',
      job_id: '',
      status: 'queued',
      paid_date: '',
      notes: '',
    },
  });

  const { data: interpreters } = useQuery({
    queryKey: ['interpreters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interpreters')
        .select('id, first_name, last_name')
        .order('last_name');
      if (error) throw error;
      return data as { id: string; first_name: string; last_name: string }[];
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
    if (payable) {
      form.reset({
        interpreter_id: payable.interpreter_id,
        job_id: payable.job_id,
        status: payable.status || 'queued',
        paid_date: payable.paid_date || '',
        notes: payable.notes || '',
      });
    } else {
      form.reset({
        interpreter_id: '',
        job_id: '',
        status: 'queued',
        paid_date: '',
        notes: '',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payable]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: Record<string, unknown> = {
        interpreter_id: data.interpreter_id,
        job_id: data.job_id,
        status: data.status,
        paid_date: data.paid_date || null,
        notes: data.notes || null,
      };

      if (payable) {
        const { error } = await supabase
          .from('interpreter_bills')
          .update(payload as never)
          .eq('id', payable.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('interpreter_bills').insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payables'] });
      toast({ title: payable ? 'Payable updated' : 'Payable created' });
      onOpenChange();
    },
    onError: (error) => {
      toast({ title: 'Error saving payable', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const selectedInterpreter = interpreters?.find((i) => i.id === form.watch('interpreter_id'));
  const selectedJob = jobs?.find((j) => j.id === form.watch('job_id'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{payable ? 'Edit Payable' : 'New Payable'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Interpreter Select */}
              <FormField
                control={form.control}
                name="interpreter_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Interpreter *</FormLabel>
                    <Popover open={interpreterOpen} onOpenChange={setInterpreterOpen}>
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
                            {selectedInterpreter
                              ? `${selectedInterpreter.first_name} ${selectedInterpreter.last_name}`
                              : 'Select interpreter...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search interpreters..." />
                          <CommandList>
                            <CommandEmpty>No interpreter found.</CommandEmpty>
                            <CommandGroup>
                              {interpreters?.map((interpreter) => (
                                <CommandItem
                                  key={interpreter.id}
                                  value={`${interpreter.first_name} ${interpreter.last_name}`}
                                  onSelect={() => {
                                    field.onChange(interpreter.id);
                                    setInterpreterOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.value === interpreter.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {interpreter.first_name} {interpreter.last_name}
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
                    <FormLabel>Job *</FormLabel>
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
                        <SelectItem value="queued">Payment Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
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
                {payable ? 'Update' : 'Create'} Payable
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
