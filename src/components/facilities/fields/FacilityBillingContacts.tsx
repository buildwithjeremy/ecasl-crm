import { useState, useCallback } from 'react';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { FormMode, phoneRegex } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

export interface BillingContact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface ContactErrors {
  name?: string;
  phone?: string;
  email?: string;
}

interface FacilityBillingContactsProps {
  mode: FormMode;
  disabled?: boolean;
  contacts: BillingContact[];
  onContactsChange: (contacts: BillingContact[]) => void;
  validateOnSubmit?: () => boolean;
}

// ==========================================
// Component
// ==========================================

export function FacilityBillingContacts({
  mode,
  disabled = false,
  contacts,
  onContactsChange,
}: FacilityBillingContactsProps) {
  const [contactErrors, setContactErrors] = useState<Record<string, ContactErrors>>({});

  const addContact = useCallback(() => {
    onContactsChange([
      ...contacts,
      { id: crypto.randomUUID(), name: '', phone: '', email: '' }
    ]);
  }, [contacts, onContactsChange]);

  const removeContact = useCallback((id: string) => {
    onContactsChange(contacts.filter(c => c.id !== id));
    setContactErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  }, [contacts, onContactsChange]);

  const updateContact = useCallback((id: string, field: keyof Omit<BillingContact, 'id'>, value: string) => {
    onContactsChange(contacts.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));

    // Validate on change
    if (field === 'phone' && value) {
      if (!phoneRegex.test(value)) {
        setContactErrors(prev => ({
          ...prev,
          [id]: { ...prev[id], phone: 'Please enter a valid phone number' }
        }));
      } else {
        setContactErrors(prev => ({
          ...prev,
          [id]: { ...prev[id], phone: undefined }
        }));
      }
    }

    if (field === 'email' && value) {
      if (!z.string().email().safeParse(value).success) {
        setContactErrors(prev => ({
          ...prev,
          [id]: { ...prev[id], email: 'Please enter a valid email address' }
        }));
      } else {
        setContactErrors(prev => ({
          ...prev,
          [id]: { ...prev[id], email: undefined }
        }));
      }
    }
  }, [contacts, onContactsChange]);

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
        {contacts.length === 0 ? (
          <p className="text-sm text-destructive">
            At least one billing contact with name and email is required. Click "Add Billing Contact" to add one.
          </p>
        ) : (
          contacts.map((contact, index) => (
            <div key={contact.id} className="space-y-3">
              {index > 0 && <div className="border-t pt-4" />}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {index === 0 ? 'Primary Contact' : `Contact ${index + 1}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContact(contact.id)}
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
                    value={contact.name}
                    onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                    placeholder="Contact name"
                    disabled={disabled}
                    className={contactErrors[contact.id]?.name ? 'border-destructive' : ''}
                  />
                  {contactErrors[contact.id]?.name && (
                    <p className="text-sm text-destructive">{contactErrors[contact.id].name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={contact.phone}
                    onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    disabled={disabled}
                    className={contactErrors[contact.id]?.phone ? 'border-destructive' : ''}
                  />
                  {contactErrors[contact.id]?.phone && (
                    <p className="text-sm text-destructive">{contactErrors[contact.id].phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    Email {index === 0 && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                    placeholder="email@example.com"
                    disabled={disabled}
                    className={contactErrors[contact.id]?.email ? 'border-destructive' : ''}
                  />
                  {contactErrors[contact.id]?.email && (
                    <p className="text-sm text-destructive">{contactErrors[contact.id].email}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// Validation Helper
// ==========================================

export function validateBillingContacts(contacts: BillingContact[]): { valid: boolean; errors: Record<string, ContactErrors> } {
  let valid = true;
  const errors: Record<string, ContactErrors> = {};

  if (contacts.length === 0) {
    return { valid: false, errors };
  }

  // Primary contact must have name and email
  const primaryContact = contacts[0];
  if (!primaryContact.name || primaryContact.name.trim() === '') {
    errors[primaryContact.id] = { ...errors[primaryContact.id], name: 'Name is required for primary contact' };
    valid = false;
  }
  if (!primaryContact.email || primaryContact.email.trim() === '') {
    errors[primaryContact.id] = { ...errors[primaryContact.id], email: 'Email is required for primary contact' };
    valid = false;
  }

  contacts.forEach(contact => {
    if (contact.phone && !phoneRegex.test(contact.phone)) {
      errors[contact.id] = { ...errors[contact.id], phone: 'Please enter a valid phone number' };
      valid = false;
    }
    if (contact.email && !z.string().email().safeParse(contact.email).success) {
      errors[contact.id] = { ...errors[contact.id], email: 'Please enter a valid email address' };
      valid = false;
    }
  });

  return { valid, errors };
}

export default FacilityBillingContacts;
