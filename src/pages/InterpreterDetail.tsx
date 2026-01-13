import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RecordPageLayout } from '@/components/layout/RecordPageLayout';
import { ContractComplianceSection } from '@/components/interpreters/ContractComplianceSection';
import {
  InterpreterCoreFields,
  InterpreterAddressFields,
  InterpreterCertifications,
  InterpreterRatesFields,
  InterpreterPaymentFields,
  InterpreterNotesFields,
} from '@/components/interpreters/fields';
import {
  interpreterFullSchema,
  type InterpreterFullFormData,
  getInterpreterFullDefaults,
} from '@/lib/schemas/interpreter.schema';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

type Interpreter = Tables<'interpreters'>;
type InterpreterUpdate = TablesUpdate<'interpreters'>;

export default function InterpreterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedInterpreterId, setSelectedInterpreterId] = useState<string | null>(id || null);

  // Sync URL id to selectedInterpreterId state (for browser back/forward navigation)
  useEffect(() => {
    if (id && id !== selectedInterpreterId) {
      setSelectedInterpreterId(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch all interpreters for the search
  const { data: interpreters } = useQuery({
    queryKey: ['interpreters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interpreters')
        .select('*')
        .order('last_name', { ascending: true });
      if (error) throw error;
      return data as Interpreter[];
    },
  });

  // Fetch the selected interpreter
  const { data: interpreter, isLoading } = useQuery({
    queryKey: ['interpreter', selectedInterpreterId],
    queryFn: async () => {
      if (!selectedInterpreterId) return null;
      const { data, error } = await supabase
        .from('interpreters')
        .select('*')
        .eq('id', selectedInterpreterId)
        .single();
      if (error) throw error;
      return data as Interpreter;
    },
    enabled: !!selectedInterpreterId,
  });

  const form = useForm<InterpreterFullFormData>({
    resolver: zodResolver(interpreterFullSchema),
    defaultValues: getInterpreterFullDefaults(),
    mode: 'onChange',
  });

  // Unsaved changes warning
  const blocker = useUnsavedChangesWarning({ isDirty: form.formState.isDirty });

  // Update URL when interpreter changes
  useEffect(() => {
    if (selectedInterpreterId && selectedInterpreterId !== id) {
      navigate(`/interpreters/${selectedInterpreterId}`, { replace: true });
    }
  }, [selectedInterpreterId, id, navigate]);

  // Populate form when interpreter data loads
  useEffect(() => {
    if (interpreter) {
      form.reset({
        first_name: interpreter.first_name,
        last_name: interpreter.last_name,
        email: interpreter.email,
        phone: interpreter.phone ?? '',
        address: interpreter.address ?? '',
        city: interpreter.city ?? '',
        state: interpreter.state ?? '',
        zip_code: interpreter.zip_code ?? '',
        status: interpreter.status ?? 'pending',
        rid_certified: interpreter.rid_certified ?? false,
        nic_certified: interpreter.nic_certified ?? false,
        other_certifications: interpreter.other_certifications ?? '',
        rate_business_hours: interpreter.rate_business_hours ?? undefined,
        rate_after_hours: interpreter.rate_after_hours ?? undefined,
        minimum_hours: interpreter.minimum_hours ?? 2,
        eligible_emergency_fee: interpreter.eligible_emergency_fee ?? false,
        eligible_holiday_fee: interpreter.eligible_holiday_fee ?? false,
        payment_method: interpreter.payment_method ?? null,
        payment_details: interpreter.payment_details ?? '',
        contract_status: interpreter.contract_status ?? 'not_sent',
        w9_received: interpreter.w9_received ?? false,
        insurance_end_date: interpreter.insurance_end_date ? new Date(interpreter.insurance_end_date) : null,
        notes: interpreter.notes ?? '',
      }, { keepDefaultValues: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interpreter]);

  const mutation = useMutation({
    mutationFn: async (data: InterpreterFullFormData) => {
      if (!selectedInterpreterId) return;

      const updatePayload: InterpreterUpdate = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        status: data.status || null,
        rid_certified: data.rid_certified,
        nic_certified: data.nic_certified,
        other_certifications: data.other_certifications || null,
        rate_business_hours: data.rate_business_hours ?? null,
        rate_after_hours: data.rate_after_hours ?? null,
        minimum_hours: data.minimum_hours ?? 2,
        eligible_emergency_fee: data.eligible_emergency_fee ?? false,
        eligible_holiday_fee: data.eligible_holiday_fee ?? false,
        payment_method: data.payment_method || null,
        payment_details: data.payment_details || null,
        contract_status: data.contract_status || null,
        w9_received: data.w9_received,
        insurance_end_date: data.insurance_end_date ? format(data.insurance_end_date, 'yyyy-MM-dd') : null,
        notes: data.notes || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('interpreters') as any)
        .update(updatePayload)
        .eq('id', selectedInterpreterId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interpreters'] });
      queryClient.invalidateQueries({ queryKey: ['interpreter', selectedInterpreterId] });
      toast({ title: 'Interpreter updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: InterpreterFullFormData) => {
    mutation.mutate(data);
  };

  const handleDelete = useCallback(async () => {
    if (!interpreter) return;
    const { error } = await supabase.from('interpreters').delete().eq('id', interpreter.id);
    if (error) {
      toast({ title: 'Error deleting interpreter', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Interpreter deleted successfully' });
      navigate('/interpreters');
    }
  }, [interpreter, navigate, toast]);

  // Build options for the selector
  const selectorOptions = (interpreters ?? []).map((i) => ({
    id: i.id,
    label: `${i.first_name} ${i.last_name}`,
    searchValue: `${i.first_name} ${i.last_name}`,
  }));

  const interpreterName = interpreter 
    ? `${interpreter.first_name} ${interpreter.last_name}` 
    : 'Interpreter Details';

  return (
    <RecordPageLayout
      title={interpreterName}
      backRoute="/interpreters"
      isDirty={form.formState.isDirty}
      blocker={blocker}
      isLoading={isLoading}
      hasRecord={!!interpreter}
      isSaving={mutation.isPending}
      formId="interpreter-detail-form"
      selector={{
        selectedId: selectedInterpreterId,
        options: selectorOptions,
        isOpen: searchOpen,
        onOpenChange: setSearchOpen,
        onSelect: setSelectedInterpreterId,
        placeholder: 'Select interpreter...',
        searchPlaceholder: 'Search interpreters...',
        emptyMessage: 'No interpreter found.',
        width: 'w-[200px]',
      }}
      deleteConfig={{
        title: 'Delete Interpreter',
        description: `Are you sure you want to delete ${interpreterName}? This action cannot be undone.`,
        onDelete: handleDelete,
      }}
    >
      {interpreter && (
        <form id="interpreter-detail-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Personal Information */}
          <InterpreterCoreFields form={form} mode="edit" />

          {/* Address */}
          <InterpreterAddressFields form={form} mode="edit" />

          {/* Certifications */}
          <InterpreterCertifications form={form} mode="edit" />

          {/* Rates */}
          <InterpreterRatesFields form={form} mode="edit" />

          {/* Payment */}
          <InterpreterPaymentFields form={form} mode="edit" />

          {/* Contract & Compliance */}
          <ContractComplianceSection 
            form={form} 
            interpreter={{
              id: interpreter.id,
              contract_pdf_url: interpreter.contract_pdf_url,
              signed_contract_pdf_url: interpreter.signed_contract_pdf_url
            }}
            onContractGenerated={() => {
              queryClient.invalidateQueries({ queryKey: ['interpreter', selectedInterpreterId] });
            }}
          />

          {/* Notes */}
          <InterpreterNotesFields form={form} mode="edit" />
        </form>
      )}

      {!selectedInterpreterId && (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">Select an interpreter to view details.</p>
          </CardContent>
        </Card>
      )}
    </RecordPageLayout>
  );
}
