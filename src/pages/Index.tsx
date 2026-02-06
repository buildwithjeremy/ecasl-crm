import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, Building2, Clock, AlertTriangle } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { data: jobsCount } = useQuery({
    queryKey: ['jobs-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'outreach_in_progress', 'confirmed']);
      return count || 0;
    },
  });

  const { data: pendingJobsCount } = useQuery({
    queryKey: ['pending-jobs-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');
      return count || 0;
    },
  });

  const { data: interpretersCount } = useQuery({
    queryKey: ['interpreters-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('interpreters')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count || 0;
    },
  });

  const { data: facilitiesCount } = useQuery({
    queryKey: ['facilities-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('facilities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count || 0;
    },
  });

  // Count interpreters with data issues (missing email OR missing business rate)
  const { data: incompleteInterpretersCount } = useQuery({
    queryKey: ['incomplete-interpreters-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interpreters')
        .select('id, email, rate_business_hours');
      if (error) throw error;
      return (data ?? []).filter(i => !i.email || !i.rate_business_hours).length;
    },
  });

  // Count facilities with data issues
  const { data: incompleteFacilitiesCount } = useQuery({
    queryKey: ['incomplete-facilities-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('id, billing_contacts, rate_business_hours, timezone, contractor');
      if (error) throw error;
      return (data ?? []).filter(f => {
        const hasBillingContactWithEmail = Array.isArray(f.billing_contacts) && 
          (f.billing_contacts as any[]).some(c => c?.email);
        const hasBusinessRate = f.rate_business_hours != null;
        const hasTimezone = !!f.timezone;
        if (f.contractor) {
          return !hasBillingContactWithEmail || !hasBusinessRate;
        }
        return !hasBillingContactWithEmail || !hasBusinessRate || !hasTimezone;
      }).length;
    },
  });

  const hasIncompleteRecords = (incompleteInterpretersCount ?? 0) > 0 || (incompleteFacilitiesCount ?? 0) > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Welcome to Effective Communication CRM</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">New, Outreach, Confirmed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingJobsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Interpreters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interpretersCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Available for assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Facilities</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilitiesCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Client organizations</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Section */}
      {hasIncompleteRecords && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Needs Attention</h2>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {(incompleteInterpretersCount ?? 0) > 0 && (
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors border-destructive/30"
                onClick={() => navigate('/interpreters?issues=any_issue')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Incomplete Interpreters</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {incompleteInterpretersCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Missing email or rates</p>
                </CardContent>
              </Card>
            )}

            {(incompleteFacilitiesCount ?? 0) > 0 && (
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors border-destructive/30"
                onClick={() => navigate('/facilities?issues=any_issue')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Incomplete Facilities</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {incompleteFacilitiesCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Missing contact, rates, or timezone</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
