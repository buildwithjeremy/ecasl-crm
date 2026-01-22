import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Send, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InvoiceBillingContact, InvoiceRecipientsPicker } from '@/components/invoices/InvoiceRecipientsPicker';

function parseEmailList(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[\n,;\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

const formSchema = z.object({
  selectedRecipients: z.array(z.string().email('Please enter a valid email address')).default([]),
  manualRecipients: z.string().optional().default(''),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message body is required'),
}).superRefine((val, ctx) => {
  const manual = parseEmailList(val.manualRecipients || '');
  const combined = [...(val.selectedRecipients || []), ...manual];
  const unique = Array.from(new Set(combined.map((e) => e.trim()).filter(Boolean)));

  if (unique.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please select or enter at least one recipient email.',
      path: ['manualRecipients'],
    });
    return;
  }

  // Validate any manual emails (selected already validated by zod)
  for (const email of manual) {
    const ok = z.string().email().safeParse(email).success;
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid email: ${email}`,
        path: ['manualRecipients'],
      });
      return;
    }
  }
});

type FormData = z.infer<typeof formSchema>;

interface SendInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  facilityName: string;
  billingContacts?: InvoiceBillingContact[] | null;
  defaultTo?: string | null;
  pdfStoragePath: string | null;
  dueDate: string | null;
  total: number;
  onSuccess: () => void;
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  facilityName,
  billingContacts,
  defaultTo,
  pdfStoragePath,
  dueDate,
  total,
  onSuccess,
}: SendInvoiceDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const defaultSubject = `Invoice ${invoiceNumber} from ECASL`;
  const defaultBody = `Dear ${facilityName},

Please find attached Invoice ${invoiceNumber} for interpreter services.

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Total Amount: ${formatCurrency(total)}
- Due Date: ${formatDate(dueDate)}

Please remit payment by the due date. If you have any questions regarding this invoice, please don't hesitate to contact us.

Thank you for your business.

Best regards,
ECASL`;

  const initialSelectedRecipients = useMemo(() => {
    const email = (defaultTo || '').trim();
    return email ? [email] : [];
  }, [defaultTo]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedRecipients: initialSelectedRecipients,
      manualRecipients: '',
      subject: defaultSubject,
      body: defaultBody,
    },
  });

  useEffect(() => {
    if (!open) return;
    // On open, seed selected recipients only if user hasn't changed them.
    const currentSelected = form.getValues('selectedRecipients');
    if ((!currentSelected || currentSelected.length === 0) && initialSelectedRecipients.length > 0) {
      form.setValue('selectedRecipients', initialSelectedRecipients, { shouldDirty: false });
    }
  }, [open, form, initialSelectedRecipients]);

  const handleSend = async (data: FormData) => {
    if (!pdfStoragePath) {
      toast({
        title: 'No PDF available',
        description: 'Please generate a PDF before sending the invoice.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      const manual = parseEmailList(data.manualRecipients || '');
      const recipients = Array.from(
        new Set([...(data.selectedRecipients || []), ...manual].map((e) => e.trim()).filter(Boolean))
      );

      const { data: result, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId,
          to: recipients,
          subject: data.subject,
          body: data.body,
          pdfStoragePath,
        },
      });

      if (error) throw error;

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to send email');
      }

      toast({
        title: 'Invoice sent successfully',
        description: `Invoice has been sent to ${recipients.join(', ')}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error sending invoice:', error);
      toast({
        title: 'Failed to send invoice',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send Invoice</DialogTitle>
          <DialogDescription>
            Send Invoice {invoiceNumber} to the recipient via email with the PDF attached.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSend)} className="space-y-4">
            <FormField
              control={form.control}
              name="selectedRecipients"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <InvoiceRecipientsPicker
                      label="Recipient(s)"
                      contacts={(billingContacts || []).filter((c) => !!c?.email)}
                      value={field.value || []}
                      onChange={(next) => field.onChange(next)}
                      disabled={isSending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="manualRecipients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional recipients</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add emails separated by commas"
                      {...field}
                      disabled={isSending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea rows={10} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {pdfStoragePath && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                <Paperclip className="h-4 w-4" />
                <span>Invoice PDF will be attached</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSending || !pdfStoragePath}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invoice
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

