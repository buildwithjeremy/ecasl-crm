import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, ExternalLink, Loader2 } from 'lucide-react';

interface Interpreter {
  id: string;
  contract_pdf_url?: string | null;
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
  const [contractPdfUrl, setContractPdfUrl] = useState<string | null>(
    interpreter.contract_pdf_url || null
  );

  // Keep local state in sync with interpreter prop
  useState(() => {
    if (interpreter.contract_pdf_url !== contractPdfUrl) {
      setContractPdfUrl(interpreter.contract_pdf_url || null);
    }
  });

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

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Contract & Compliance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract_status">Contract Status</Label>
            <Select
              value={contractStatus}
              onValueChange={(value) => form.setValue('contract_status', value as 'not_sent' | 'sent' | 'signed', { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_sent">Not Sent</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
              </SelectContent>
            </Select>
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

        {/* Generate Contract Button */}
        {canGenerateContract && (
          <div className="pt-2">
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
          </div>
        )}

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
