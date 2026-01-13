import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export interface RateItem {
  label: string;
  value: number;
  format?: 'currency' | 'number';
  suffix?: string;
}

interface RateChipsProps {
  rates: RateItem[];
  linkTo?: string;
  linkLabel?: string;
  disabled?: boolean;
}

export function RateChips({ rates, linkTo, linkLabel = 'View', disabled = false }: RateChipsProps) {
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
        {linkTo && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            disabled={disabled}
            className="h-7 px-2"
          >
            <Link to={linkTo}>
              <ExternalLink className="h-3 w-3 mr-1" />
              {linkLabel}
            </Link>
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
      {linkTo && (
        <Button
          variant="ghost"
          size="sm"
          asChild
          disabled={disabled}
          className="h-7 px-2"
        >
          <Link to={linkTo}>
            <ExternalLink className="h-3 w-3 mr-1" />
            {linkLabel}
          </Link>
        </Button>
      )}
    </div>
  );
}
