import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FacilityDialog } from '@/components/facilities/FacilityDialog';
import { FacilitiesTable } from '@/components/facilities/FacilitiesTable';
import { FilterDropdown, FilterOption } from '@/components/ui/filter-dropdown';
import { useTableSort } from '@/hooks/use-table-sort';
import type { Database } from '@/types/database';

type Facility = Database['public']['Tables']['facilities']['Row'];

const statusOptions: FilterOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

const gsaOptions: FilterOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const contractStatusOptions: FilterOption[] = [
  { value: 'not_sent', label: 'Not Sent' },
  { value: 'sent', label: 'Sent' },
  { value: 'signed', label: 'Signed' },
];

export default function Facilities() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [gsaFilter, setGsaFilter] = useState('all');
  const [contractStatusFilter, setContractStatusFilter] = useState('all');
  
  const { sort, handleSort } = useTableSort('name', 'asc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: facilities, isLoading } = useQuery({
    queryKey: ['facilities', search, sort, statusFilter, gsaFilter, contractStatusFilter],
    queryFn: async () => {
      let query = supabase
        .from('facilities')
        .select('*')
        .order(sort.column, { ascending: sort.direction === 'asc' });

      if (search) {
        // Split search into words and match each word against searchable fields
        const searchTerms = search.trim().toLowerCase().split(/\s+/);
        for (const term of searchTerms) {
          query = query.or(`name.ilike.%${term}%,admin_contact_email.ilike.%${term}%,admin_contact_name.ilike.%${term}%`);
        }
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (gsaFilter === 'yes') {
        query = query.eq('is_gsa', true);
      } else if (gsaFilter === 'no') {
        query = query.eq('is_gsa', false);
      }
      
      if (contractStatusFilter !== 'all') {
        query = query.eq('contract_status', contractStatusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Facility[];
    },
  });

  const handleEdit = (facility: Facility) => {
    setSelectedFacility(facility);
    setDialogOpen(true);
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

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <FilterDropdown
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onValueChange={setStatusFilter}
          />
          <FilterDropdown
            label="GSA"
            options={gsaOptions}
            value={gsaFilter}
            onValueChange={setGsaFilter}
          />
          <FilterDropdown
            label="Contract"
            options={contractStatusOptions}
            value={contractStatusFilter}
            onValueChange={setContractStatusFilter}
          />
        </div>
      </div>

      <FacilitiesTable
        facilities={facilities || []}
        isLoading={isLoading}
        sort={sort}
        onSort={handleSort}
      />

      <FacilityDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        facility={selectedFacility}
      />
    </div>
  );
}
