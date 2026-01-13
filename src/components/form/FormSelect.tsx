import { FieldPath, FieldValues, UseFormReturn, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ==========================================
// Constants
// ==========================================

// Sentinel value for "no selection" - keeps Select always controlled
export const SELECT_NONE_VALUE = '__none__';

// ==========================================
// Types
// ==========================================

export interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  options: readonly SelectOption[] | SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  /** 
   * If true, uses the sentinel value for null/undefined to keep Select controlled.
   * This is the default behavior for nullable fields.
   */
  nullable?: boolean;
  /**
   * Custom label for the "unspecified" option when nullable is true.
   * Defaults to "Unspecified"
   */
  unspecifiedLabel?: string;
  /**
   * If true, hides the unspecified option even when nullable is true.
   * Use this when you want the field to be required but still handle null values.
   */
  hideUnspecified?: boolean;
}

// ==========================================
// Component
// ==========================================

/**
 * FormSelect - A Controller-based Select component for React Hook Form.
 * 
 * This component ensures Radix Select is always controlled by using a sentinel
 * value for null/undefined states, preventing the "uncontrolled to controlled"
 * warning and ensuring consistent value display after form resets.
 */
export function FormSelect<TFieldValues extends FieldValues>({
  form,
  name,
  label,
  options,
  placeholder = 'Select...',
  disabled = false,
  required = false,
  className,
  triggerClassName,
  nullable = true,
  unspecifiedLabel = 'Unspecified',
  hideUnspecified = false,
}: FormSelectProps<TFieldValues>) {
  const error = form.formState.errors[name];

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name}>
          {label}
          {required && ' *'}
        </Label>
      )}
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => {
          // Always provide a string value to keep Select controlled
          // Map null/undefined to sentinel, actual values stay as-is
          const selectValue = field.value === null || field.value === undefined
            ? (nullable ? SELECT_NONE_VALUE : '')
            : String(field.value);

          return (
            <Select
              value={selectValue}
              onValueChange={(value) => {
                // Map sentinel back to null for storage
                const newValue = value === SELECT_NONE_VALUE ? null : value;
                field.onChange(newValue);
              }}
              disabled={disabled}
            >
              <SelectTrigger
                id={name}
                className={cn(
                  error && 'border-destructive',
                  triggerClassName
                )}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {/* Show unspecified option for nullable fields */}
                {nullable && !hideUnspecified && (
                  <SelectItem value={SELECT_NONE_VALUE}>
                    <span className="text-muted-foreground">{unspecifiedLabel}</span>
                  </SelectItem>
                )}
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }}
      />
      {error && (
        <p className="text-sm text-destructive">
          {error.message as string}
        </p>
      )}
    </div>
  );
}

export default FormSelect;

