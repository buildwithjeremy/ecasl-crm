import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnsavedChangesWarning, UnsavedChangesDialog } from '@/hooks/use-unsaved-changes-warning';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

export default function Settings() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mileageRate, setMileageRate] = useState<string>('0.7');
  const [originalMileageRate, setOriginalMileageRate] = useState<string>('0.7');

  // Fetch default mileage rate setting
  const { data: defaultMileageRateSetting, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings', 'default_mileage_rate'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('settings') as any)
        .select('*')
        .eq('key', 'default_mileage_rate')
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; key: string; value: number; description: string | null } | null;
    },
  });

  // Update mileageRate when setting loads
  useEffect(() => {
    if (defaultMileageRateSetting && defaultMileageRateSetting.value !== undefined && defaultMileageRateSetting.value !== null) {
      const rateString = String(defaultMileageRateSetting.value);
      setMileageRate(rateString);
      setOriginalMileageRate(rateString);
    }
  }, [defaultMileageRateSetting]);

  // Track if there are unsaved changes
  const hasUnsavedChanges = mileageRate !== originalMileageRate;

  // Unsaved changes warning
  const blocker = useUnsavedChangesWarning({ isDirty: hasUnsavedChanges });

  const updateMileageRateMutation = useMutation({
    mutationFn: async (newRate: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('settings') as any)
        .update({ value: newRate })
        .eq('key', 'default_mileage_rate');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setOriginalMileageRate(mileageRate); // Reset original to current after successful save
      toast({ title: 'Default mileage rate updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSaveMileageRate = () => {
    const rate = parseFloat(mileageRate);
    if (isNaN(rate) || rate < 0) {
      toast({ title: 'Invalid rate', description: 'Please enter a valid positive number', variant: 'destructive' });
      return;
    }
    updateMileageRateMutation.mutate(rate);
  };

  const isAdmin = roles.includes('admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-foreground">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Roles</label>
            <div className="flex gap-2 mt-1">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground">No roles assigned</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Default Rates</CardTitle>
            <CardDescription>Configure default rates used in job calculations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_mileage_rate">Default Mileage Rate ($/mi)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="default_mileage_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={mileageRate}
                      onChange={(e) => setMileageRate(e.target.value)}
                      className="pl-7"
                      disabled={settingsLoading}
                    />
                  </div>
                  <Button
                    onClick={handleSaveMileageRate}
                    disabled={updateMileageRateMutation.isPending || settingsLoading}
                  >
                    {updateMileageRateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This rate is used for both facility and interpreter mileage calculations unless overridden on a specific job.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
