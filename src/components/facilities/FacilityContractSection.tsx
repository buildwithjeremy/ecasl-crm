import { useEffect, useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, ExternalLink, Loader2, Send, CheckCircle, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignedContractUploadDialog } from '@/components/contracts/SignedContractUploadDialog';
import { ContractEmailDialog, ContractEmailData } from '@/components/contracts/ContractEmailDialog';

interface Facility {
  id: string;
  name: string;
  contract_pdf_url?: string | null;
  signed_contract_pdf_url?: string | null;
}

interface BillingContact {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface FacilityContractSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  facility: Facility;
  /**
   * Optional wrapper used by parents to ensure pending form changes are saved
   * before any contract-related side effect runs.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveIfDirty?: <T>(action: () => Promise<T> | T) => Promise<T | undefined>;
  onContractGenerated: () => void;
}

// Helper to check if a string looks like a storage path vs full URL
function isStoragePath(url: string): boolean {
  return !url.startsWith('http://') && !url.startsWith('https://');
}

export function FacilityContractSection({ 
  form, 
  facility,
  saveIfDirty,
  onContractGenerated 
}: FacilityContractSectionProps) {
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
      if (facility.contract_pdf_url) {
        if (isStoragePath(facility.contract_pdf_url)) {
          const { data } = await supabase.storage
            .from('facility-contracts')
            .createSignedUrl(facility.contract_pdf_url, 3600);
          setContractPdfUrl(data?.signedUrl || null);
        } else {
          setContractPdfUrl(facility.contract_pdf_url);
        }
      } else {
        setContractPdfUrl(null);
      }

      // Handle signed contract PDF URL
      if (facility.signed_contract_pdf_url) {
        if (isStoragePath(facility.signed_contract_pdf_url)) {
          const { data } = await supabase.storage
            .from('facility-contracts')
            .createSignedUrl(facility.signed_contract_pdf_url, 3600);
          setSignedContractPdfUrl(data?.signedUrl || null);
        } else {
          setSignedContractPdfUrl(facility.signed_contract_pdf_url);
        }
      } else {
        setSignedContractPdfUrl(null);
      }
    }

    getSignedUrls();
  }, [facility.contract_pdf_url, facility.signed_contract_pdf_url]);

  const generateContractMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-facility-contract', {
        body: { facilityId: facility.id }
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
    // Get primary billing contact from form
    const billingContacts = form.getValues('billing_contacts') as BillingContact[] | undefined;
    const primaryContact = billingContacts?.find(c => c.email && c.name);
    
    if (!primaryContact || !primaryContact.email) {
      toast({ 
        title: 'No billing contact', 
        description: 'Please add a billing contact with an email address first.',
        variant: 'destructive' 
      });
      return;
    }

    const facilityName = facility.name || 'Facility';
    const firstName = primaryContact.name.split(' ')[0];
    
    // Build email content with logo, personal tone, and signature
    const subject = `Contract from Effective Communication - ${facilityName}`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px 0 10px;">
          <img src="https://ecasl-crm.lovable.app/images/ecasl-logo.png" alt="Effective Communication ASL Services" style="max-width: 220px; height: auto;" />
        </div>
        <div style="padding: 20px;">
          <p>Hi ${firstName},</p>
          <p>I hope this message finds you well! I'm sending over the contract for <strong>${facilityName}</strong> for your review.</p>
          ${contractPdfUrl ? `<p><a href="${contractPdfUrl}" style="color: #2563eb;">Click here to view and download the contract PDF</a></p>` : ''}
          <p>Please take a look when you get a chance, and feel free to reach out if you have any questions or need any changes — I'm happy to work through anything with you.</p>
          <p>Once everything looks good, just sign and return it and we'll be all set!</p>
          <p>Looking forward to working together.</p>
          <br/>
          <p style="margin-bottom: 2px;">Warm regards,</p>
          <p style="margin: 0; font-weight: bold;">Denise Corino</p>
          <p style="margin: 0; color: #555;">Effective Communication</p>
          <p style="margin: 0;"><a href="https://www.ecasl.com" style="color: #2563eb;">www.ecasl.com</a></p>
          <p style="margin: 0; color: #555;">917-330-0517</p>
          <p style="margin: 0; color: #555;">admin@ecasl.com</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #888;">GSA Schedule Contract 47QRAA25D00AR</p>
        </div>
      </div>
    `;

    setEmailData({
      entityType: 'facility',
      subject,
      body,
      recipient: {
        id: primaryContact.id,
        email: primaryContact.email,
        name: primaryContact.name,
      },
      contractPdfUrl,
    });
    setShowEmailDialog(true);
  }, [form, facility.name, contractPdfUrl, toast]);

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
          template_name: 'facility_contract',
          facility_id: facility.id,
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
  }, [emailData, facility.id, form, toast]);

  const handleMarkAsSignedClick = () => {
    setShowUploadDialog(true);
  };

  const handleUploadSignedContract = async (file: File) => {
    setIsUploading(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `signed-contracts/${facility.id}/signed_contract_${timestamp}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('facility-contracts')
        .upload(filePath, file, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      // Generate a signed URL for immediate display
      const { data: signedUrlData } = await supabase.storage
        .from('facility-contracts')
        .createSignedUrl(filePath, 3600);

      // Update the facility record with the file path (not public URL)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('facilities') as any)
        .update({ 
          signed_contract_pdf_url: filePath,
          contract_status: 'signed'
        })
        .eq('id', facility.id);

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
          <CardTitle className="text-lg">Contract</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Contract Status</Label>
            <div className="pt-1">
              <Badge variant={getStatusBadgeVariant(contractStatus)}>
                {getStatusLabel(contractStatus)}
              </Badge>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap gap-2 pt-2">
            {/* Generate Contract Button */}
            {canGenerateContract && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  (saveIfDirty
                    ? saveIfDirty(() => generateContractMutation.mutateAsync())
                    : generateContractMutation.mutateAsync()
                  ).catch((e) => {
                    toast({
                      title: 'Could not save changes',
                      description: e instanceof Error ? e.message : 'Please try again.',
                      variant: 'destructive',
                    });
                  })
                }
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
                onClick={() =>
                  (saveIfDirty ? saveIfDirty(() => handleSendContract()) : Promise.resolve(handleSendContract()))
                    .catch((e) => {
                      toast({
                        title: 'Could not save changes',
                        description: e instanceof Error ? e.message : 'Please try again.',
                        variant: 'destructive',
                      });
                    })
                }
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
                onClick={() =>
                  (saveIfDirty
                    ? saveIfDirty(() => handleMarkAsSignedClick())
                    : Promise.resolve(handleMarkAsSignedClick())
                  ).catch((e) => {
                    toast({
                      title: 'Could not save changes',
                      description: e instanceof Error ? e.message : 'Please try again.',
                      variant: 'destructive',
                    });
                  })
                }
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
                onClick={() =>
                  (saveIfDirty
                    ? saveIfDirty(() => handleMarkAsSignedClick())
                    : Promise.resolve(handleMarkAsSignedClick())
                  ).catch((e) => {
                    toast({
                      title: 'Could not save changes',
                      description: e instanceof Error ? e.message : 'Please try again.',
                      variant: 'destructive',
                    });
                  })
                }
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
        entityType="facility"
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
