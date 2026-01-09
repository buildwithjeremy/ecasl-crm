import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

export interface RateItem {
  label: string;
  value: number;
  format?: 'currency' | 'number';
  suffix?: string;
}

interface RateChipsProps {
  rates: RateItem[];
  onEditClick: () => void;
  disabled?: boolean;
  showEdit?: boolean;
}

export function RateChips({ rates, onEditClick, disabled = false, showEdit = true }: RateChipsProps) {
  const formatValue = (rate: RateItem): string => {
    if (rate.format === 'number') {
      return `${rate.value}${rate.suffix || ''}`;
    }
    return `$${rate.value.toFixed(2)}${rate.suffix || ''}`;
  };

  // Filter out rates with zero values for cleaner display
  const nonZeroRates = rates.filter((r) => r.value !== 0);

  if (nonZeroRates.length === 0 && rates.length > 0) {
    return (
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">No rates set</span>
        {showEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditClick}
            disabled={disabled}
            className="h-7 px-2"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {rates.map((rate, index) => (
        <Badge key={index} variant="outline" className="font-normal">
          {rate.label}: {formatValue(rate)}
        </Badge>
      ))}
      {showEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditClick}
          disabled={disabled}
          className="h-7 px-2"
        >
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
      )}
    </div>
  );
}
