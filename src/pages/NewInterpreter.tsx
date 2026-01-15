import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { interpreterBaseSchema, InterpreterBaseFormData } from '@/lib/schemas/interpreter.schema';
import {
  InterpreterCoreFields,
  InterpreterAddressFields,
  InterpreterCertifications,
  InterpreterRatesFields,
  InterpreterPaymentFields,
  InterpreterNotesFields,
} from '@/components/interpreters/fields';

export default function NewInterpreter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InterpreterBaseFormData>({
    resolver: zodResolver(interpreterBaseSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      rid_certified: false,
      nic_certified: false,
      w9_received: false,
      insurance_end_date: null,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InterpreterBaseFormData) => {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        status: 'pending',
        rid_certified: data.rid_certified,
        rid_number: data.rid_number || null,
        nic_certified: data.nic_certified,
        other_certifications: data.other_certifications || null,
        rate_business_hours: data.rate_business_hours || null,
        rate_after_hours: data.rate_after_hours || null,
        rate_holiday_hours: data.rate_holiday_hours || null,
        minimum_hours: 2,
        eligible_emergency_fee: false,
        eligible_holiday_fee: false,
        payment_method: data.payment_method || null,
        payment_details: data.payment_details || null,
        contract_status: 'not_sent',
        w9_received: data.w9_received,
        insurance_end_date: data.insurance_end_date ? format(data.insurance_end_date, 'yyyy-MM-dd') : null,
        notes: data.notes || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newInterpreter, error } = await (supabase.from('interpreters') as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return newInterpreter;
    },
    onSuccess: (newInterpreter) => {
      queryClient.invalidateQueries({ queryKey: ['interpreters'] });
      toast({ title: 'Interpreter created successfully' });
      navigate(`/interpreters/${newInterpreter.id}`);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: InterpreterBaseFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-14 z-10 bg-background py-3 border-b -mx-6 px-6 -mt-6 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/interpreters')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">New Interpreter</h1>

          <div className="ml-auto">
            <Button 
              type="submit" 
              form="new-interpreter-form"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Creating...' : 'Create Interpreter'}
            </Button>
          </div>
        </div>
      </div>

      <form id="new-interpreter-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <InterpreterCoreFields form={form} mode="create" />
        
        <InterpreterAddressFields form={form} mode="create" />
        
        <InterpreterCertifications form={form} mode="create" />
        
        <InterpreterRatesFields form={form} mode="create" />
        
        <InterpreterPaymentFields form={form} mode="create" />
        
        <InterpreterNotesFields form={form} mode="create" />
      </form>
    </div>
  );
}
