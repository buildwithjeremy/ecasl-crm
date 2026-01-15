import { useEffect, useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UseFormReturn, Controller } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, ExternalLink, Loader2, Send, CheckCircle, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignedContractUploadDialog } from '@/components/contracts/SignedContractUploadDialog';
import { ContractEmailDialog, ContractEmailData } from '@/components/contracts/ContractEmailDialog';

interface Interpreter {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contract_pdf_url?: string | null;
  signed_contract_pdf_url?: string | null;
}

interface ContractComplianceSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  interpreter: Interpreter;
  onContractGenerated: () => void;
}

// Helper to check if a string looks like a storage path vs full URL
function isStoragePath(url: string): boolean {
  return !url.startsWith('http://') && !url.startsWith('https://');
}

export function ContractComplianceSection({ 
  form, 
  interpreter,
  onContractGenerated 
}: ContractComplianceSectionProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailData, setEmailData] = useState<ContractEmailData | null>(null);
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(null);
  const [signedContractPdfUrl, setSignedContractPdfUrl] = useState<string | null>(null);

  // Generate signed URLs for storage paths
  useEffect(() => {
    async function getSignedUrls() {
      // Handle contract PDF URL
      if (interpreter.contract_pdf_url) {
        if (isStoragePath(interpreter.contract_pdf_url)) {
          const { data } = await supabase.storage
            .from('interpreter-contracts')
            .createSignedUrl(interpreter.contract_pdf_url, 3600);
          setContractPdfUrl(data?.signedUrl || null);
        } else {
          setContractPdfUrl(interpreter.contract_pdf_url);
        }
      } else {
        setContractPdfUrl(null);
      }

      // Handle signed contract PDF URL
      if (interpreter.signed_contract_pdf_url) {
        if (isStoragePath(interpreter.signed_contract_pdf_url)) {
          const { data } = await supabase.storage
            .from('interpreter-contracts')
            .createSignedUrl(interpreter.signed_contract_pdf_url, 3600);
          setSignedContractPdfUrl(data?.signedUrl || null);
        } else {
          setSignedContractPdfUrl(interpreter.signed_contract_pdf_url);
        }
      } else {
        setSignedContractPdfUrl(null);
      }
    }

    getSignedUrls();
  }, [interpreter.contract_pdf_url, interpreter.signed_contract_pdf_url]);

  const generateContractMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-interpreter-contract', {
        body: { interpreterId: interpreter.id }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      toast({ title: 'Contract PDF generated successfully' });
      if (data?.pdf_url) {
        setContractPdfUrl(data.pdf_url);
      }
      onContractGenerated();
    },
    onError: (error) => {
      toast({ 
        title: 'Error generating contract', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  const contractStatus = form.watch('contract_status');
  const canGenerateContract = contractStatus === 'not_sent';

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'signed':
        return 'default';
      case 'sent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'signed':
        return 'Signed';
      case 'sent':
        return 'Sent';
      default:
        return 'Not Sent';
    }
  };

  const handleSendContract = useCallback(() => {
    const interpreterName = `${interpreter.first_name} ${interpreter.last_name}`;
    const interpreterEmail = interpreter.email;

    if (!interpreterEmail) {
      toast({ 
        title: 'No email address', 
        description: 'This interpreter does not have an email address.',
        variant: 'destructive' 
      });
      return;
    }
    
    // Build email content
    const subject = `Contract from Effective Communication - ${interpreterName}`;
    const body = `
      <p>Dear ${interpreter.first_name},</p>
      <p>Please find attached your interpreter contract from Effective Communication ASL Services.</p>
      ${contractPdfUrl ? `<p><a href="${contractPdfUrl}">Click here to view and download the contract PDF</a></p>` : ''}
      <p>Please review the contract at your earliest convenience. If you have any questions or need any modifications, please don't hesitate to reach out.</p>
      <p>Once reviewed, please sign and return the contract to complete the onboarding process.</p>
      <p>Thank you for partnering with Effective Communication ASL Services.</p>
      <p>Best regards,<br>Effective Communication ASL Services</p>
    `;

    setEmailData({
      entityType: 'interpreter',
      subject,
      body,
      recipient: {
        id: interpreter.id,
        email: interpreterEmail,
        name: interpreterName,
      },
      contractPdfUrl,
    });
    setShowEmailDialog(true);
  }, [interpreter, contractPdfUrl, toast]);

  const handleConfirmSendEmail = useCallback(async () => {
    if (!emailData) return;
    
    setIsSendingEmail(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('https://umyjqvmpvjfikljhoofy.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          to: emailData.recipient.email,
          subject: emailData.subject,
          body: emailData.body,
          template_name: 'interpreter_contract',
          interpreter_id: interpreter.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      // Update contract status to sent
      form.setValue('contract_status', 'sent', { shouldDirty: true });
      setShowEmailDialog(false);
      setEmailData(null);
      toast({ title: 'Contract email sent successfully' });
    } catch (error) {
      console.error('Error sending contract email:', error);
      toast({ 
        title: 'Error sending email', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setIsSendingEmail(false);
    }
  }, [emailData, interpreter.id, form, toast]);

  const handleMarkAsSignedClick = () => {
    setShowUploadDialog(true);
  };

  const handleUploadSignedContract = async (file: File) => {
    setIsUploading(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `signed-contracts/${interpreter.id}/signed_contract_${timestamp}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('interpreter-contracts')
        .upload(filePath, file, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      // Generate a signed URL for immediate display
      const { data: signedUrlData } = await supabase.storage
        .from('interpreter-contracts')
        .createSignedUrl(filePath, 3600);

      // Update the interpreter record with the file path (not public URL)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('interpreters') as any)
        .update({ 
          signed_contract_pdf_url: filePath,
          contract_status: 'signed'
        })
        .eq('id', interpreter.id);

      if (updateError) throw updateError;

      setSignedContractPdfUrl(signedUrlData?.signedUrl || null);
      form.setValue('contract_status', 'signed', { shouldDirty: false });
      setShowUploadDialog(false);
      toast({ title: 'Signed contract uploaded successfully' });
      onContractGenerated();
    } catch (error) {
      toast({ 
        title: 'Error uploading signed contract', 
        description: error instanceof Error ? error.message : 'Unknown error', 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkipUpload = () => {
    form.setValue('contract_status', 'signed', { shouldDirty: true });
    setShowUploadDialog(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Contract & Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contract Status</Label>
              <div className="pt-1">
                <Badge variant={getStatusBadgeVariant(contractStatus)}>
                  {getStatusLabel(contractStatus)}
                </Badge>
              </div>
            </div>
            <Controller
              control={form.control}
              name="w9_received"
              render={({ field }) => (
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="w9_received"
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="w9_received">W-9 Received</Label>
                </div>
              )}
            />
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap gap-2 pt-2">
            {/* Generate Contract Button */}
            {canGenerateContract && (
              <Button
                type="button"
                variant="outline"
                onClick={() => generateContractMutation.mutate()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Contract PDF
                  </>
                )}
              </Button>
            )}

            {/* Send Contract Button */}
            {contractStatus === 'not_sent' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSendContract}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Contract
              </Button>
            )}

            {/* Mark as Signed Button */}
            {contractStatus === 'sent' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleMarkAsSignedClick}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Signed
              </Button>
            )}

            {/* Upload Signed PDF Button (when already signed but no PDF uploaded) */}
            {contractStatus === 'signed' && !signedContractPdfUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={handleMarkAsSignedClick}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Signed PDF
              </Button>
            )}
          </div>

          {/* Contract PDF Links */}
          {(contractPdfUrl || signedContractPdfUrl) && (
            <div className="pt-2 border-t space-y-2">
              {contractPdfUrl && (
                <div>
                  <Label className="text-sm text-muted-foreground">Contract PDF</Label>
                  <div className="mt-1">
                    <a
                      href={contractPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      View Contract PDF
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
              {signedContractPdfUrl && (
                <div>
                  <Label className="text-sm text-muted-foreground">Signed PDF</Label>
                  <div className="mt-1">
                    <a
                      href={signedContractPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <CheckCircle className="h-4 w-4" />
                      View Signed PDF
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SignedContractUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleUploadSignedContract}
        onSkip={handleSkipUpload}
        isUploading={isUploading}
        entityType="interpreter"
      />

      <ContractEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        emailData={emailData}
        onConfirmSend={handleConfirmSendEmail}
        isSending={isSendingEmail}
      />
    </>
  );
}
