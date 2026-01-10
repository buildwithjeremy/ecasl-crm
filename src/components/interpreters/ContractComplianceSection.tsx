import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, ExternalLink, Loader2, Send, CheckCircle, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignedContractUploadDialog } from '@/components/contracts/SignedContractUploadDialog';

interface Interpreter {
  id: string;
  contract_pdf_url?: string | null;
  signed_contract_pdf_url?: string | null;
}

interface ContractComplianceSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  interpreter: Interpreter;
  onContractGenerated: () => void;
}

export function ContractComplianceSection({ 
  form, 
  interpreter,
  onContractGenerated 
}: ContractComplianceSectionProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(
    interpreter.contract_pdf_url || null
  );
  const [signedContractPdfUrl, setSignedContractPdfUrl] = useState<string | null>(
    interpreter.signed_contract_pdf_url || null
  );

  // Keep local state in sync with interpreter prop
  useEffect(() => {
    setContractPdfUrl(interpreter.contract_pdf_url || null);
    setSignedContractPdfUrl(interpreter.signed_contract_pdf_url || null);
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

  const handleMarkAsSent = () => {
    form.setValue('contract_status', 'sent', { shouldDirty: true });
  };

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

      const { data: urlData } = supabase.storage
        .from('interpreter-contracts')
        .getPublicUrl(filePath);

      const signedUrl = urlData.publicUrl;

      // Update the interpreter record with the signed contract URL and status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('interpreters') as any)
        .update({ 
          signed_contract_pdf_url: signedUrl,
          contract_status: 'signed'
        })
        .eq('id', interpreter.id);

      if (updateError) throw updateError;

      setSignedContractPdfUrl(signedUrl);
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
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="w9_received"
                checked={form.watch('w9_received')}
                onCheckedChange={(checked) => form.setValue('w9_received', !!checked, { shouldDirty: true })}
              />
              <Label htmlFor="w9_received">W-9 Received</Label>
            </div>
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

            {/* Mark as Sent Button */}
            {contractStatus === 'not_sent' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleMarkAsSent}
              >
                <Send className="h-4 w-4 mr-2" />
                Mark as Sent
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
    </>
  );
}
