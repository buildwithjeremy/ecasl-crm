import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Check, ChevronsUpDown, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormMode } from '@/lib/schemas/shared';

// ==========================================
// Types
// ==========================================

export interface InterpreterOption {
  id: string;
  first_name: string;
  last_name: string;
  rate_business_hours: number | null;
  rate_after_hours: number | null;
  minimum_hours: number | null;
}

interface JobInterpreterSectionProps {
  form: UseFormReturn<any>;
  mode: FormMode;
  disabled?: boolean;
  interpreters?: InterpreterOption[];
  onSendOutreach?: () => void;
  onConfirmInterpreter?: () => void;
  isSendingOutreach?: boolean;
  isConfirmingInterpreter?: boolean;
  canSendOutreach?: boolean;
  canConfirmInterpreter?: boolean;
}

// ==========================================
// Component
// ==========================================

export function JobInterpreterSection({
  form,
  mode,
  disabled = false,
  interpreters: externalInterpreters,
  onSendOutreach,
  onConfirmInterpreter,
  isSendingOutreach = false,
  isConfirmingInterpreter = false,
  canSendOutreach = false,
  canConfirmInterpreter = false,
}: JobInterpreterSectionProps) {
  const [potentialInterpretersOpen, setPotentialInterpretersOpen] = useState(false);
  const [interpreterOpen, setInterpreterOpen] = useState(false);

  // Fetch interpreters if not provided externally
  const { data: fetchedInterpreters } = useQuery({
    queryKey: ['interpreters-with-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interpreters')
        .select('id, first_name, last_name, rate_business_hours, rate_after_hours, minimum_hours')
        .order('last_name');
      if (error) throw error;
      return data as InterpreterOption[];
    },
    enabled: !externalInterpreters,
  });

  const interpreters = externalInterpreters || fetchedInterpreters;

  const watchedPotentialInterpreterIds = form.watch('potential_interpreter_ids') || [];
  const watchedInterpreterId = form.watch('interpreter_id');

  const selectedPotentialInterpreters = interpreters?.filter((i) =>
    watchedPotentialInterpreterIds.includes(i.id)
  ) || [];

  const selectedInterpreter = interpreters?.find((i) => i.id === watchedInterpreterId);

  // Filter interpreters for "Selected" dropdown to only show potential interpreters
  const filteredInterpretersForSelection = interpreters?.filter((interpreter) =>
    watchedPotentialInterpreterIds.includes(interpreter.id)
  ) || [];

  const handleTogglePotentialInterpreter = (interpreterId: string) => {
    const currentIds = watchedPotentialInterpreterIds;
    const isSelected = currentIds.includes(interpreterId);
    
    if (isSelected) {
      form.setValue(
        'potential_interpreter_ids',
        currentIds.filter((id: string) => id !== interpreterId),
        { shouldDirty: true }
      );
    } else {
      form.setValue(
        'potential_interpreter_ids',
        [...currentIds, interpreterId],
        { shouldDirty: true }
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Interpreter Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Potential Interpreters */}
        <div className="space-y-2">
          <Label>Potential Interpreters</Label>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
            <Popover open={potentialInterpretersOpen} onOpenChange={setPotentialInterpretersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={disabled}
                  className={cn(
                    'w-full justify-between h-auto min-h-10',
                    selectedPotentialInterpreters.length === 0 && 'text-muted-foreground'
                  )}
                >
                  <div className="flex flex-wrap gap-1">
                    {selectedPotentialInterpreters.length > 0 ? (
                      selectedPotentialInterpreters.map((interpreter) => (
                        <Badge key={interpreter.id} variant="secondary" className="mr-1">
                          {interpreter.first_name} {interpreter.last_name}
                        </Badge>
                      ))
                    ) : (
                      'Select potential interpreters...'
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search interpreters..." />
                  <CommandList>
                    <CommandEmpty>No interpreter found.</CommandEmpty>
                    <CommandGroup>
                      {interpreters?.map((interpreter) => {
                        const isSelected = watchedPotentialInterpreterIds.includes(interpreter.id);
                        return (
                          <CommandItem
                            key={interpreter.id}
                            value={`${interpreter.first_name} ${interpreter.last_name}`}
                            onSelect={() => handleTogglePotentialInterpreter(interpreter.id)}
                          >
                            <Check
                              className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                            />
                            {interpreter.first_name} {interpreter.last_name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {onSendOutreach && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 whitespace-nowrap"
                    disabled={disabled || !canSendOutreach || isSendingOutreach}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {isSendingOutreach ? 'Sending...' : 'Send Outreach'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send Outreach Email?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will send an email to {watchedPotentialInterpreterIds.length} potential interpreter
                      {watchedPotentialInterpreterIds.length !== 1 ? 's' : ''} and change the job status to "Outreach In Progress".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onSendOutreach}>
                      Send Email
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Selected Interpreter */}
        <div className="space-y-2">
          <Label>Selected Interpreter</Label>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
            <Popover open={interpreterOpen} onOpenChange={setInterpreterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={disabled}
                  className={cn('w-full justify-between h-10', !watchedInterpreterId && 'text-muted-foreground')}
                >
                  {selectedInterpreter
                    ? `${selectedInterpreter.first_name} ${selectedInterpreter.last_name}`
                    : 'Select interpreter...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search interpreters..." />
                  <CommandList>
                    <CommandEmpty>No interpreter found.</CommandEmpty>
                    <CommandGroup>
                      {filteredInterpretersForSelection.map((interpreter) => (
                        <CommandItem
                          key={interpreter.id}
                          value={`${interpreter.first_name} ${interpreter.last_name}`}
                          onSelect={() => {
                            form.setValue('interpreter_id', interpreter.id, { shouldDirty: true });
                            setInterpreterOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              watchedInterpreterId === interpreter.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {interpreter.first_name} {interpreter.last_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {onConfirmInterpreter && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 whitespace-nowrap"
                    disabled={disabled || !canConfirmInterpreter || isConfirmingInterpreter}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {isConfirmingInterpreter ? 'Confirming...' : 'Confirm Interpreter'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Interpreter?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will assign {selectedInterpreter ? `${selectedInterpreter.first_name} ${selectedInterpreter.last_name}` : 'the interpreter'} to this job, save all changes, and update the job status to "Confirmed".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirmInterpreter}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default JobInterpreterSection;
