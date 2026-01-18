import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { FacilitiesTable } from '@/components/facilities/FacilitiesTable';
import { FilterDropdown, FilterOption } from '@/components/ui/filter-dropdown';
import { useTableSort } from '@/hooks/use-table-sort';
import { RecordCount } from '@/components/ui/record-count';
import type { Database } from '@/integrations/supabase/types';

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
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [gsaFilter, setGsaFilter] = useState('all');
  const [contractStatusFilter, setContractStatusFilter] = useState('all');
  
  const { sort, handleSort } = useTableSort('name', 'asc');

  const { data: facilities, isLoading } = useQuery({
    queryKey: ['facilities', search, sort, statusFilter, gsaFilter, contractStatusFilter],
    queryFn: async () => {
      let query = supabase
        .from('facilities')
        .select('*')
        .order(sort.column, { ascending: sort.direction === 'asc' });

      if (search) {
        // Split search into words and match each word against searchable fields
        // Search name and within billing_contacts JSONB array
        const searchTerms = search.trim().toLowerCase().split(/\s+/);
        for (const term of searchTerms) {
          // Search name or within billing_contacts JSONB (name and email fields)
          query = query.or(`name.ilike.%${term}%,billing_contacts.cs.[{"name":"${term}"}],billing_contacts.cs.[{"email":"${term}"}]`);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Facilities</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage client organizations</p>
        </div>
        <Button onClick={() => navigate('/facilities/new')} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Facility
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-base sm:text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap items-center gap-2">
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
          <RecordCount count={facilities?.length ?? 0} label="facility" isLoading={isLoading} />
        </div>
      </div>

      <FacilitiesTable
        facilities={facilities || []}
        isLoading={isLoading}
        sort={sort}
        onSort={handleSort}
      />
    </div>
  );
}
