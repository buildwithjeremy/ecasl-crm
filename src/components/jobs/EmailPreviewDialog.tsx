import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Send, Plus, Eye, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  onConfirmSend: (editedSubject: string, editedBody: string) => void;
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
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch template snippets
  const { data: snippets } = useQuery({
    queryKey: ['template-snippets'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('template_snippets') as any)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as { id: string; name: string; label: string; content: string; sort_order: number }[];
    },
  });

  // Initialize edited content when emailData changes
  useEffect(() => {
    if (emailData) {
      setEditedSubject(replaceTemplateVariables(emailData.subject, emailData.templateVariables));
      setEditedBody(replaceTemplateVariables(emailData.body, emailData.templateVariables));
      setViewMode('edit');
    }
  }, [emailData]);

  const handleInsertSnippet = useCallback((snippetContent: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = editedBody.substring(0, start) + snippetContent + editedBody.substring(end);
      setEditedBody(newBody);
      // Restore cursor position after insert
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + snippetContent.length;
        textarea.focus();
      });
    } else {
      setEditedBody(prev => prev + snippetContent);
    }
  }, [editedBody]);

  if (!emailData) return null;

  const typeLabel = emailData.type === 'outreach' ? 'Outreach' : 'Confirmation';
  const recipientCount = emailData.recipients.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Composer - {typeLabel}
          </DialogTitle>
          <DialogDescription>
            Edit the email before sending to {recipientCount} recipient
            {recipientCount !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Recipients */}
          <div className="space-y-1">
            <Label className="text-muted-foreground">To:</Label>
            <div className="flex flex-wrap gap-1">
              {emailData.recipients.map((recipient) => (
                <Badge key={recipient.id} variant="secondary">
                  {recipient.name} &lt;{recipient.email}&gt;
                </Badge>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <Label htmlFor="email-subject" className="text-muted-foreground">Subject:</Label>
            <Input
              id="email-subject"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              disabled={isSending}
            />
          </div>

          {/* Snippet toolbar */}
          {snippets && snippets.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">Insert:</span>
              {snippets.map((snippet) => (
                <Button
                  key={snippet.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleInsertSnippet(snippet.content)}
                  disabled={isSending}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {snippet.label}
                </Button>
              ))}
            </div>
          )}

          {/* Toggle edit/preview */}
          <div className="flex items-center gap-1 border-b pb-1">
            <Button
              type="button"
              variant={viewMode === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('edit')}
              className="h-7 text-xs"
            >
              <Code className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              type="button"
              variant={viewMode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="h-7 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
          </div>

          {/* Body editor / preview */}
          <div className="flex-1 min-h-0">
            {viewMode === 'edit' ? (
              <Textarea
                ref={textareaRef}
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                disabled={isSending}
                className="h-[300px] font-mono text-xs"
              />
            ) : (
              <ScrollArea className="h-[300px] rounded-md border bg-muted/50 p-4">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: editedBody }}
                />
              </ScrollArea>
            )}
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
            onClick={() => onConfirmSend(editedSubject, editedBody)}
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
