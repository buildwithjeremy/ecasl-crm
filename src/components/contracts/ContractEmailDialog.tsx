import { useState } from 'react';
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
import { Loader2, Mail, Send, Paperclip } from 'lucide-react';

// ==========================================
// Types
// ==========================================

export interface ContractEmailRecipient {
  id: string;
  email: string;
  name: string;
}

export interface ContractEmailData {
  entityType: 'facility' | 'interpreter';
  subject: string;
  body: string;
  recipient: ContractEmailRecipient;
  contractPdfUrl?: string | null;
}

interface ContractEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailData: ContractEmailData | null;
  onConfirmSend: () => void;
  isSending: boolean;
}

// ==========================================
// Component
// ==========================================

export function ContractEmailDialog({
  open,
  onOpenChange,
  emailData,
  onConfirmSend,
  isSending,
}: ContractEmailDialogProps) {
  if (!emailData) return null;

  const typeLabel = emailData.entityType === 'facility' ? 'Facility' : 'Interpreter';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Contract Email - {typeLabel}
          </DialogTitle>
          <DialogDescription>
            Review the email before sending the contract.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Recipient */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">To:</div>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">
                {emailData.recipient.name} &lt;{emailData.recipient.email}&gt;
              </Badge>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Subject:</div>
            <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
              {emailData.subject}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2 flex-1 min-h-0">
            <div className="text-sm font-medium text-muted-foreground">Message:</div>
            <ScrollArea className="h-[250px] rounded-md border bg-muted/50 p-4">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: emailData.body }}
              />
            </ScrollArea>
          </div>

          {/* Attachment indicator */}
          {emailData.contractPdfUrl && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Attachment:</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Paperclip className="h-4 w-4" />
                <span>Contract PDF link will be included in the email</span>
              </div>
            </div>
          )}
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
                Send Contract Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ContractEmailDialog;
