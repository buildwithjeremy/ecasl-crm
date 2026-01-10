import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SortableTableHead, SortDirection } from '@/components/ui/sortable-table-head';
import type { Database } from '@/types/database';

type Job = Database['public']['Tables']['jobs']['Row'];

interface JobWithRelations extends Job {
  facility?: { name: string } | null;
  interpreter?: { first_name: string; last_name: string } | null;
}

interface JobsTableProps {
  jobs: JobWithRelations[];
  isLoading: boolean;
  sort: { column: string; direction: SortDirection };
  onSort: (column: string) => void;
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'secondary',
  outreach_in_progress: 'secondary',
  confirmed: 'default',
  complete: 'default',
  ready_to_bill: 'outline',
  billed: 'outline',
  paid: 'default',
  cancelled: 'destructive',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  outreach_in_progress: 'Outreach',
  confirmed: 'Confirmed',
  complete: 'Complete',
  ready_to_bill: 'Ready to Bill',
  billed: 'Billed',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export function JobsTable({ jobs, isLoading, sort, onSort }: JobsTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="text-muted-foreground">Loading jobs...</div>;
  }

  if (jobs.length === 0) {
    return <div className="text-muted-foreground">No jobs found.</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead column="job_number" label="Job #" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="job_date" label="Date" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="start_time" label="Time" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="facility_id" label="Facility" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="interpreter_id" label="Interpreter" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="location_type" label="Location" currentSort={sort} onSort={onSort} />
            <SortableTableHead column="status" label="Status" currentSort={sort} onSort={onSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/jobs/${job.id}`)}
            >
              <TableCell className="font-medium">{job.job_number}</TableCell>
              <TableCell>{format(new Date(job.job_date), 'MMM d, yyyy')}</TableCell>
              <TableCell>
                {job.start_time.slice(0, 5)} - {job.end_time.slice(0, 5)}
              </TableCell>
              <TableCell>{job.facility?.name || '-'}</TableCell>
              <TableCell>
                {job.interpreter
                  ? `${job.interpreter.first_name} ${job.interpreter.last_name}`
                  : <span className="text-muted-foreground">Unassigned</span>
                }
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {job.location_type === 'in_person' ? 'In-Person' : 'Remote'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[job.status] || 'secondary'}>
                  {statusLabels[job.status] || job.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
