import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { FormMode } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

export interface BillingContact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface FacilityBillingContactsProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
}

// ==========================================
// Component
// ==========================================

export function FacilityBillingContacts({
  form,
  mode,
  disabled = false,
}: FacilityBillingContactsProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'billing_contacts',
  });

  const addContact = () => {
    append({ id: crypto.randomUUID(), name: '', phone: '', email: '' });
  };

  // Get errors for billing_contacts array
  const errors = form.formState.errors.billing_contacts as any;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Billing Contacts</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addContact}
            disabled={disabled}
            className="h-8"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Billing Contact
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show root-level array error (e.g., "At least one billing contact is required") */}
        {errors?.root?.message && (
          <p className="text-sm text-destructive">{errors.root.message}</p>
        )}
        {errors?.message && typeof errors.message === 'string' && (
          <p className="text-sm text-destructive">{errors.message}</p>
        )}
        
        {fields.length === 0 ? (
          <p className="text-sm text-destructive">
            At least one billing contact with name and email is required. Click "Add Billing Contact" to add one.
          </p>
        ) : (
          fields.map((field, index) => {
            const fieldErrors = errors?.[index];
            
            return (
              <div key={field.id} className="space-y-3">
                {index > 0 && <div className="border-t pt-4" />}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index === 0 ? 'Primary Contact' : `Contact ${index + 1}`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={disabled}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Name {index === 0 && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      {...form.register(`billing_contacts.${index}.name`)}
                      placeholder="Contact name"
                      disabled={disabled}
                      className={fieldErrors?.name ? 'border-destructive' : ''}
                    />
                    {fieldErrors?.name?.message && (
                      <p className="text-sm text-destructive">{fieldErrors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      {...form.register(`billing_contacts.${index}.phone`)}
                      placeholder="(555) 123-4567"
                      disabled={disabled}
                      className={fieldErrors?.phone ? 'border-destructive' : ''}
                    />
                    {fieldErrors?.phone?.message && (
                      <p className="text-sm text-destructive">{fieldErrors.phone.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Email {index === 0 && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      type="email"
                      {...form.register(`billing_contacts.${index}.email`)}
                      placeholder="email@example.com"
                      disabled={disabled}
                      className={fieldErrors?.email ? 'border-destructive' : ''}
                    />
                    {fieldErrors?.email?.message && (
                      <p className="text-sm text-destructive">{fieldErrors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export default FacilityBillingContacts;
