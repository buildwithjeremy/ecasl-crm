import { UseFormReturn } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormMode } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

interface InterpreterNotesFieldsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
}

// ==========================================
// Component
// ==========================================

export function InterpreterNotesFields({
  form,
  mode,
  disabled = false,
}: InterpreterNotesFieldsProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          id="notes"
          rows={4}
          placeholder="Additional notes about this interpreter..."
          disabled={disabled}
          {...form.register('notes')}
        />
      </CardContent>
    </Card>
  );
}

export default InterpreterNotesFields;
