import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FacilityDialog } from '@/components/facilities/FacilityDialog';
import { FacilitiesTable } from '@/components/facilities/FacilitiesTable';
import type { Database } from '@/types/database';

type Facility = Database['public']['Tables']['facilities']['Row'];

export default function Facilities() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: facilities, isLoading } = useQuery({
    queryKey: ['facilities', search],
    queryFn: async () => {
      let query = supabase
        .from('facilities')
        .select('*')
        .order('name', { ascending: true });

      if (search) {
        query = query.or(`name.ilike.%${search}%,admin_contact_email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Facility[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('facilities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      toast({ title: 'Facility deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting facility', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (facility: Facility) => {
    setSelectedFacility(facility);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this facility?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedFacility(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Facilities</h1>
          <p className="text-muted-foreground">Manage client organizations</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Facility
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <FacilitiesTable
        facilities={facilities || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FacilityDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        facility={selectedFacility}
      />
    </div>
  );
}
