import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InterpreterDialog } from '@/components/interpreters/InterpreterDialog';
import { InterpretersTable } from '@/components/interpreters/InterpretersTable';
import { SortSelect, SortOption } from '@/components/ui/sort-select';
import type { Database } from '@/types/database';

type Interpreter = Database['public']['Tables']['interpreters']['Row'];

const sortOptions: SortOption[] = [
  { value: 'last_name-asc', label: 'Last Name (A-Z)' },
  { value: 'last_name-desc', label: 'Last Name (Z-A)' },
  { value: 'first_name-asc', label: 'First Name (A-Z)' },
  { value: 'first_name-desc', label: 'First Name (Z-A)' },
  { value: 'status-asc', label: 'Status (A-Z)' },
  { value: 'status-desc', label: 'Status (Z-A)' },
  { value: 'created_at-desc', label: 'Created (Newest)' },
  { value: 'created_at-asc', label: 'Created (Oldest)' },
];

export default function Interpreters() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInterpreter, setSelectedInterpreter] = useState<Interpreter | null>(null);
  const [sortBy, setSortBy] = useState('last_name-asc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: interpreters, isLoading } = useQuery({
    queryKey: ['interpreters', search, sortBy],
    queryFn: async () => {
      const [field, direction] = sortBy.split('-') as [string, 'asc' | 'desc'];
      let query = supabase
        .from('interpreters')
        .select('*')
        .order(field, { ascending: direction === 'asc' });

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Interpreter[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('interpreters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interpreters'] });
      toast({ title: 'Interpreter deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting interpreter', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (interpreter: Interpreter) => {
    setSelectedInterpreter(interpreter);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this interpreter?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedInterpreter(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Interpreters</h1>
          <p className="text-muted-foreground">Manage ASL interpreters in your network</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Interpreter
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search interpreters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <SortSelect options={sortOptions} value={sortBy} onValueChange={setSortBy} />
      </div>

      <InterpretersTable
        interpreters={interpreters || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <InterpreterDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        interpreter={selectedInterpreter}
      />
    </div>
  );
}
