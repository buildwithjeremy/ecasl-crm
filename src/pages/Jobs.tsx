import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, List, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { JobDialog } from '@/components/jobs/JobDialog';
import { JobsTable } from '@/components/jobs/JobsTable';
import { JobsCalendar } from '@/components/jobs/JobsCalendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SortSelect, SortOption } from '@/components/ui/sort-select';
import type { Database } from '@/types/database';

type Job = Database['public']['Tables']['jobs']['Row'];

const sortOptions: SortOption[] = [
  { value: 'job_date-desc', label: 'Date (Newest)' },
  { value: 'job_date-asc', label: 'Date (Oldest)' },
  { value: 'job_number-asc', label: 'Job # (A-Z)' },
  { value: 'job_number-desc', label: 'Job # (Z-A)' },
  { value: 'status-asc', label: 'Status (A-Z)' },
  { value: 'status-desc', label: 'Status (Z-A)' },
  { value: 'created_at-desc', label: 'Created (Newest)' },
  { value: 'created_at-asc', label: 'Created (Oldest)' },
];

export default function Jobs() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [sortBy, setSortBy] = useState('job_date-desc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs', search, sortBy],
    queryFn: async () => {
      const [field, direction] = sortBy.split('-') as [string, 'asc' | 'desc'];
      let query = supabase
        .from('jobs')
        .select(`
          *,
          facility:facilities(name),
          interpreter:interpreters(first_name, last_name)
        `)
        .order(field, { ascending: direction === 'asc' });

      if (search) {
        query = query.or(`job_number.ilike.%${search}%,deaf_client_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: 'Job deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting job', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (job: Job) => {
    setSelectedJob(job);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
      deleteMutation.mutate(id);
    }
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

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-4">
          <SortSelect options={sortOptions} value={sortBy} onValueChange={setSortBy} />
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
      </div>

      {viewMode === 'table' ? (
        <JobsTable
          jobs={jobs || []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
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
