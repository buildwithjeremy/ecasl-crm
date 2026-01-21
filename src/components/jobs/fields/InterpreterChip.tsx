import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface InterpreterChipProps {
  label: string;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function InterpreterChip({
  label,
  onRemove,
  disabled = false,
  className,
}: InterpreterChipProps) {
  return (
    <Badge variant="secondary" className={className}>
      <span className="truncate">{label}</span>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="ml-1 h-5 w-5 rounded-full"
          onClick={(e) => {
            // Prevent toggling the parent combobox popover
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label}`}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  );
}
