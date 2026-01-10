import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, List, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { JobDialog } from '@/components/jobs/JobDialog';
import { JobsTable } from '@/components/jobs/JobsTable';
import { JobsCalendar } from '@/components/jobs/JobsCalendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterDropdown, FilterOption } from '@/components/ui/filter-dropdown';
import { useTableSort } from '@/hooks/use-table-sort';
import type { Database } from '@/types/database';

type Job = Database['public']['Tables']['jobs']['Row'];

const statusOptions: FilterOption[] = [
  { value: 'new', label: 'New' },
  { value: 'outreach_in_progress', label: 'Outreach' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'complete', label: 'Complete' },
  { value: 'ready_to_bill', label: 'Ready to Bill' },
  { value: 'billed', label: 'Billed' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const locationTypeOptions: FilterOption[] = [
  { value: 'in_person', label: 'In-Person' },
  { value: 'remote', label: 'Remote' },
];

const sourceOptions: FilterOption[] = [
  { value: 'direct', label: 'Direct' },
  { value: 'agency', label: 'Agency' },
  { value: 'gsa', label: 'GSA' },
  { value: 'referral', label: 'Referral' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'other', label: 'Other' },
];

export default function Jobs() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationTypeFilter, setLocationTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  
  const { sort, handleSort } = useTableSort('job_date', 'desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs', search, sort, statusFilter, locationTypeFilter, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          facility:facilities(name),
          interpreter:interpreters(first_name, last_name)
        `)
        .order(sort.column, { ascending: sort.direction === 'asc' });

      if (search) {
        // Split search into words and match each word against searchable fields
        const searchTerms = search.trim().toLowerCase().split(/\s+/);
        for (const term of searchTerms) {
          query = query.or(`job_number.ilike.%${term}%,deaf_client_name.ilike.%${term}%`);
        }
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (locationTypeFilter !== 'all') {
        query = query.eq('location_type', locationTypeFilter);
      }
      
      if (sourceFilter !== 'all') {
        query = query.eq('opportunity_source', sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (job: Job) => {
    setSelectedJob(job);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedJob(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Jobs</h1>
          <p className="text-muted-foreground">Manage interpreting assignments</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Job
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
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
            label="Location"
            options={locationTypeOptions}
            value={locationTypeFilter}
            onValueChange={setLocationTypeFilter}
          />
          <FilterDropdown
            label="Source"
            options={sourceOptions}
            value={sourceFilter}
            onValueChange={setSourceFilter}
          />
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'calendar')}>
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <List className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === 'table' ? (
        <JobsTable
          jobs={jobs || []}
          isLoading={isLoading}
          sort={sort}
          onSort={handleSort}
        />
      ) : (
        <JobsCalendar jobs={jobs || []} isLoading={isLoading} />
      )}

      <JobDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        job={selectedJob}
      />
    </div>
  );
}
