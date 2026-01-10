import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, ExternalLink, Loader2, Send, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Facility {
  id: string;
  contract_pdf_url?: string | null;
}

interface FacilityContractSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  facility: Facility;
  onContractGenerated: () => void;
}

export function FacilityContractSection({ 
  form, 
  facility,
  onContractGenerated 
}: FacilityContractSectionProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(
    facility.contract_pdf_url || null
  );

  // Keep local state in sync with facility prop
  useEffect(() => {
    setContractPdfUrl(facility.contract_pdf_url || null);
  }, [facility.contract_pdf_url]);

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
      // Update local state immediately with the new URL
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

  const handleMarkAsSigned = () => {
    form.setValue('contract_status', 'signed', { shouldDirty: true });
  };

  return (
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
              onClick={handleMarkAsSigned}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Signed
            </Button>
          )}
        </div>

        {/* Contract PDF Link */}
        {contractPdfUrl && (
          <div className="pt-2 border-t">
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
      </CardContent>
    </Card>
  );
}
