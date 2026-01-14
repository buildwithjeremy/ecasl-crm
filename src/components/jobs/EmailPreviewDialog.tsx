import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Send } from 'lucide-react';

// ==========================================
// Types
// ==========================================

export interface EmailPreviewRecipient {
  id: string;
  email: string;
  name: string;
}

export interface EmailPreviewData {
  type: 'outreach' | 'confirmation';
  subject: string;
  body: string;
  recipients: EmailPreviewRecipient[];
  templateVariables: Record<string, string>;
}

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailData: EmailPreviewData | null;
  onConfirmSend: () => void;
  isSending: boolean;
}

// ==========================================
// Helper: Replace template variables in text
// ==========================================

function replaceTemplateVariables(
  text: string,
  variables: Record<string, string>
): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    // Handle both {{variable}} and {variable} patterns
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// ==========================================
// Component
// ==========================================

export function EmailPreviewDialog({
  open,
  onOpenChange,
  emailData,
  onConfirmSend,
  isSending,
}: EmailPreviewDialogProps) {
  if (!emailData) return null;

  const renderedSubject = replaceTemplateVariables(
    emailData.subject,
    emailData.templateVariables
  );
  const renderedBody = replaceTemplateVariables(
    emailData.body,
    emailData.templateVariables
  );

  const typeLabel = emailData.type === 'outreach' ? 'Outreach' : 'Confirmation';
  const recipientCount = emailData.recipients.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preview - {typeLabel}
          </DialogTitle>
          <DialogDescription>
            Review the email before sending to {recipientCount} recipient
            {recipientCount !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Recipients */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">To:</div>
            <div className="flex flex-wrap gap-1">
              {emailData.recipients.map((recipient) => (
                <Badge key={recipient.id} variant="secondary">
                  {recipient.name} &lt;{recipient.email}&gt;
                </Badge>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Subject:</div>
            <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
              {renderedSubject}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2 flex-1 min-h-0">
            <div className="text-sm font-medium text-muted-foreground">Message:</div>
            <ScrollArea className="h-[300px] rounded-md border bg-muted/50 p-4">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderedBody }}
              />
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirmSend}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send {typeLabel} Email{recipientCount > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EmailPreviewDialog;
