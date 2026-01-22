import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type InvoiceBillingContact = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
};

interface InvoiceRecipientsPickerProps {
  label?: string;
  contacts: InvoiceBillingContact[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function InvoiceRecipientsPicker({
  label = 'Billing Contacts',
  contacts,
  value,
  onChange,
  disabled,
}: InvoiceRecipientsPickerProps) {
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    // de-dupe by email and ignore blank emails
    const byEmail = new Map<string, InvoiceBillingContact>();
    for (const c of contacts) {
      const email = (c.email || '').trim();
      if (!email) continue;
      if (!byEmail.has(email)) byEmail.set(email, c);
    }
    return Array.from(byEmail.entries()).map(([email, c]) => ({
      email,
      label: c.name ? `${c.name} <${email}>` : email,
    }));
  }, [contacts]);

  const toggle = (email: string) => {
    const normalized = email.trim();
    if (!normalized) return;
    const set = new Set(value);
    if (set.has(normalized)) set.delete(normalized);
    else set.add(normalized);
    onChange(Array.from(set));
  };

  const remove = (email: string) => {
    onChange(value.filter((v) => v !== email));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className={cn('w-full justify-between', value.length === 0 && 'text-muted-foreground')}
            disabled={disabled}
          >
            {value.length > 0 ? `${value.length} selected` : 'Select billing contacts...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search contacts..." />
            <CommandList>
              <CommandEmpty>No billing contacts found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const selected = value.includes(opt.email);
                  return (
                    <CommandItem
                      key={opt.email}
                      value={opt.label}
                      onSelect={() => toggle(opt.email)}
                    >
                      <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1">
              <span className="max-w-[260px] truncate">{email}</span>
              <button
                type="button"
                onClick={() => remove(email)}
                className="rounded-sm text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${email}`}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default InvoiceRecipientsPicker;
