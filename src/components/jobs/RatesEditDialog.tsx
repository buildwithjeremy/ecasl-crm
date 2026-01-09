import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

export interface RateField {
  key: string;
  label: string;
  value: number;
  step?: string;
  suffix?: string;
}

interface RatesEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: RateField[];
  onSave: (values: Record<string, number>) => void;
  disabled?: boolean;
}

export function RatesEditDialog({
  open,
  onOpenChange,
  title,
  fields,
  onSave,
  disabled = false,
}: RatesEditDialogProps) {
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      const initial: Record<string, number> = {};
      fields.forEach((field) => {
        initial[field.key] = field.value;
      });
      setValues(initial);
    }
  }, [open, fields]);

  const handleSave = () => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {fields.map((field) => (
            <div key={field.key} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={field.key} className="text-right text-sm">
                {field.label}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id={field.key}
                  type="number"
                  step={field.step || '0.01'}
                  value={values[field.key] ?? 0}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.key]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  disabled={disabled}
                  className="flex-1"
                />
                {field.suffix && (
                  <span className="text-sm text-muted-foreground">{field.suffix}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={disabled}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
