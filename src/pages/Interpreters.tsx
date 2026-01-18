import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { InterpretersTable } from '@/components/interpreters/InterpretersTable';
import { FilterDropdown, FilterOption } from '@/components/ui/filter-dropdown';
import { useTableSort } from '@/hooks/use-table-sort';
import { RecordCount } from '@/components/ui/record-count';
import type { Database } from '@/types/database';

type Interpreter = Database['public']['Tables']['interpreters']['Row'];

const statusOptions: FilterOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

const certificationOptions: FilterOption[] = [
  { value: 'rid', label: 'RID' },
  { value: 'nic', label: 'NIC' },
  { value: 'both', label: 'Both' },
  { value: 'none', label: 'None' },
];

const paymentMethodOptions: FilterOption[] = [
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
];

export default function Interpreters() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [certificationFilter, setCertificationFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  
  const { sort, handleSort } = useTableSort('last_name', 'asc');

  const { data: interpreters, isLoading } = useQuery({
    queryKey: ['interpreters', search, sort, statusFilter, certificationFilter, paymentMethodFilter],
    queryFn: async () => {
      let query = supabase
        .from('interpreters')
        .select('*')
        .order(sort.column, { ascending: sort.direction === 'asc' });

      if (search) {
        // Split search into words and match each word against first_name, last_name, or email
        const searchTerms = search.trim().toLowerCase().split(/\s+/);
        for (const term of searchTerms) {
          query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);
        }
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (paymentMethodFilter !== 'all') {
        query = query.eq('payment_method', paymentMethodFilter);
      }
      
      // Certification filter requires special handling
      if (certificationFilter === 'rid') {
        query = query.eq('rid_certified', true);
      } else if (certificationFilter === 'nic') {
        query = query.eq('nic_certified', true);
      } else if (certificationFilter === 'both') {
        query = query.eq('rid_certified', true).eq('nic_certified', true);
      } else if (certificationFilter === 'none') {
        query = query.eq('rid_certified', false).eq('nic_certified', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Interpreter[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Interpreters</h1>
          <p className="text-muted-foreground">Manage ASL interpreters in your network</p>
        </div>
        <Button onClick={() => navigate('/interpreters/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Interpreter
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search interpreters..."
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
            label="Certification"
            options={certificationOptions}
            value={certificationFilter}
            onValueChange={setCertificationFilter}
          />
          <FilterDropdown
            label="Payment"
            options={paymentMethodOptions}
            value={paymentMethodFilter}
            onValueChange={setPaymentMethodFilter}
          />
        </div>
      </div>

      <RecordCount count={interpreters?.length ?? 0} label="interpreter" isLoading={isLoading} />

      <InterpretersTable
        interpreters={interpreters || []}
        isLoading={isLoading}
        sort={sort}
        onSort={handleSort}
      />
    </div>
  );
}
