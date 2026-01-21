import { useEffect, useState } from 'react';
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

const formSchema = z.object({
  to: z.string().email('Please enter a valid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message body is required'),
});

type FormData = z.infer<typeof formSchema>;

interface SendInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  facilityName: string;
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      to: defaultTo || '',
      subject: defaultSubject,
      body: defaultBody,
    },
  });

  // When the dialog opens, prefill the recipient with the facility's primary billing contact
  // (but don't clobber if the user already typed something).
  useEffect(() => {
    if (!open) return;
    if (!defaultTo) return;
    const currentTo = form.getValues('to');
    if (!currentTo) {
      form.setValue('to', defaultTo, { shouldDirty: false });
    }
  }, [open, defaultTo, form]);

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
      const { data: result, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId,
          to: data.to,
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
        description: `Invoice has been sent to ${data.to}`,
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
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Email</FormLabel>
                  <FormControl>
                    <Input placeholder="recipient@example.com" {...field} />
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
