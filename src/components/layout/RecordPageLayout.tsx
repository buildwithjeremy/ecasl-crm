import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlocker } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnsavedChangesDialog } from '@/hooks/use-unsaved-changes-warning';

export interface RecordOption {
  id: string;
  label: string;
  searchValue?: string;
}

export interface RecordPageLayoutProps {
  /** Title displayed in the header (e.g., record name) */
  title: string;
  /** Route to navigate back to (e.g., '/jobs') */
  backRoute: string;
  /** Whether the form has unsaved changes */
  isDirty: boolean;
  /** Blocker from useUnsavedChangesWarning hook */
  blocker: ReturnType<typeof useBlocker>;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether the record exists (controls visibility of delete/save) */
  hasRecord: boolean;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Form ID for save button */
  formId: string;
  /** Record selector configuration */
  selector: {
    /** Current selected record ID */
    selectedId: string | null;
    /** Available records to select from */
    options: RecordOption[];
    /** Whether the selector popover is open */
    isOpen: boolean;
    /** Callback when popover open state changes */
    onOpenChange: (open: boolean) => void;
    /** Callback when a record is selected */
    onSelect: (id: string) => void;
    /** Placeholder text for empty selection */
    placeholder?: string;
    /** Placeholder for search input */
    searchPlaceholder?: string;
    /** Message when no results found */
    emptyMessage?: string;
    /** Width of the selector button */
    width?: string;
  };
  /** Delete configuration */
  deleteConfig?: {
    /** Title for delete dialog */
    title: string;
    /** Description for delete dialog */
    description: string;
    /** Callback when delete is confirmed */
    onDelete: () => Promise<void> | void;
    /** Whether to hide the delete button */
    hidden?: boolean;
  };
  /** Custom actions to render in the header (between selector and save/delete) */
  headerActions?: ReactNode;
  /** Page content */
  children: ReactNode;
}

export function RecordPageLayout({
  title,
  backRoute,
  isDirty,
  blocker,
  isLoading = false,
  hasRecord,
  isSaving = false,
  formId,
  selector,
  deleteConfig,
  headerActions,
  children,
}: RecordPageLayoutProps) {
  const navigate = useNavigate();

  const selectedOption = selector.options.find((o) => o.id === selector.selectedId);

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background py-3 border-b -mx-4 px-4 sm:-mx-6 sm:px-6 -mt-4 sm:-mt-6 mb-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Back Button + Title */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={() => navigate(backRoute)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{title}</h1>
          </div>

          {/* Record Selector - full width on mobile */}
          <div className="w-full sm:w-auto order-last sm:order-none">
            <Popover open={selector.isOpen} onOpenChange={selector.onOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn('justify-between text-sm w-full sm:w-auto', selector.width ?? 'sm:w-[200px]')}
                >
                  <span className="truncate">
                    {selectedOption?.label || selector.placeholder || 'Select...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[300px] p-0">
                <Command>
                  <CommandInput placeholder={selector.searchPlaceholder || 'Search...'} />
                  <CommandList>
                    <CommandEmpty>{selector.emptyMessage || 'No results found.'}</CommandEmpty>
                    <CommandGroup>
                      {selector.options.map((option) => (
                        <CommandItem
                          key={option.id}
                          value={option.searchValue || option.label}
                          onSelect={() => {
                            selector.onSelect(option.id);
                            selector.onOpenChange(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selector.selectedId === option.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Custom Header Actions */}
          {headerActions}

          {/* Save and Delete buttons */}
          {hasRecord && (
            <div className="ml-auto flex items-center gap-2">
              {/* Unsaved Indicator - hide on mobile */}
              {isDirty && (
                <span className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Unsaved
                </span>
              )}

              {/* Delete Button */}
              {deleteConfig && !deleteConfig.hidden && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle>{deleteConfig.title}</AlertDialogTitle>
                      <AlertDialogDescription>{deleteConfig.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteConfig.onDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Save Button */}
              <Button type="submit" form={formId} disabled={isSaving} className="h-9 sm:h-10">
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && selector.selectedId && (
        <div className="text-muted-foreground">Loading...</div>
      )}

      {/* Page Content */}
      {children}

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
