import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import type { Database } from '@/types/database';

type Job = Database['public']['Tables']['jobs']['Row'];

interface JobWithRelations extends Job {
  facility?: { name: string } | null;
  interpreter?: { first_name: string; last_name: string } | null;
}

interface JobsTableProps {
  jobs: JobWithRelations[];
  isLoading: boolean;
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
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

export function JobsTable({ jobs, isLoading, onEdit, onDelete }: JobsTableProps) {
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
            <TableHead>Job #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Facility</TableHead>
            <TableHead>Interpreter</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
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
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(job);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(job.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
