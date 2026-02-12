import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnsavedChangesWarning, UnsavedChangesDialog } from '@/hooks/use-unsaved-changes-warning';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Save, Plus, Trash2 } from 'lucide-react';

// ==========================================
// Types
// ==========================================

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string | null;
  updated_at: string | null;
};

type TemplateSnippet = {
  id: string;
  name: string;
  label: string;
  content: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

// ==========================================
// Template display names
// ==========================================

const templateDisplayNames: Record<string, string> = {
  interpreter_outreach: 'Interpreter Outreach',
  interpreter_confirmation: 'Interpreter Confirmation',
};

// ==========================================
// Email Template Editor Component
// ==========================================

function EmailTemplateEditor({ template, onSaved }: { template: EmailTemplate; onSaved: () => void }) {
  const { toast } = useToast();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [isOpen, setIsOpen] = useState(false);
  const isDirty = subject !== template.subject || body !== template.body;

  useEffect(() => {
    setSubject(template.subject);
    setBody(template.body);
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('email_templates')
        .update({ subject, body } as never)
        .eq('id', template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Template saved' });
      onSaved();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
          <span className="font-medium">
            {templateDisplayNames[template.name] || template.name}
          </span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-4 space-y-3">
        <div className="space-y-1">
          <Label htmlFor={`subject-${template.id}`}>Subject</Label>
          <Input
            id={`subject-${template.id}`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`body-${template.id}`}>Body (HTML)</Label>
          <Textarea
            id={`body-${template.id}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="font-mono text-xs min-h-[200px]"
          />
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending}
          size="sm"
        >
          <Save className="h-4 w-4 mr-1" />
          {saveMutation.isPending ? 'Saving...' : 'Save Template'}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ==========================================
// Snippet Editor Component
// ==========================================

function SnippetEditor({
  snippet,
  onSaved,
  onDeleted,
}: {
  snippet: TemplateSnippet;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [label, setLabel] = useState(snippet.label);
  const [content, setContent] = useState(snippet.content);
  const isDirty = label !== snippet.label || content !== snippet.content;

  useEffect(() => {
    setLabel(snippet.label);
    setContent(snippet.content);
  }, [snippet]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('template_snippets') as any)
        .update({ label, content })
        .eq('id', snippet.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Snippet saved' });
      onSaved();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('template_snippets') as any)
        .delete()
        .eq('id', snippet.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Snippet deleted' });
      onDeleted();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="border rounded-md p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1 mr-2">
          <Label>Button Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive shrink-0 mt-5"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1">
        <Label>Content (HTML)</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="font-mono text-xs min-h-[100px]"
        />
      </div>
      <Button
        onClick={() => saveMutation.mutate()}
        disabled={!isDirty || saveMutation.isPending}
        size="sm"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}

// ==========================================
// Main Settings Component
// ==========================================

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

  // Fetch email templates
  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  // Fetch template snippets
  const { data: templateSnippets } = useQuery({
    queryKey: ['template-snippets'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('template_snippets') as any)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as TemplateSnippet[];
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
      setOriginalMileageRate(mileageRate);
      toast({ title: 'Default mileage rate updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const addSnippetMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('template_snippets') as any)
        .insert({
          name: 'new_snippet',
          label: 'New Snippet',
          content: '<p>Enter snippet content here</p>',
          sort_order: (templateSnippets?.length ?? 0) + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-snippets'] });
      toast({ title: 'Snippet added' });
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

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>Edit the default email templates used for outreach and confirmation emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {emailTemplates?.map((template) => (
              <EmailTemplateEditor
                key={template.id}
                template={template}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['email-templates'] })}
              />
            ))}
            {(!emailTemplates || emailTemplates.length === 0) && (
              <p className="text-sm text-muted-foreground">No email templates found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Email Snippets</CardTitle>
                <CardDescription>Quick-insert text blocks available in the email composer</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addSnippetMutation.mutate()}
                disabled={addSnippetMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Snippet
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {templateSnippets?.map((snippet) => (
              <SnippetEditor
                key={snippet.id}
                snippet={snippet}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['template-snippets'] })}
                onDeleted={() => queryClient.invalidateQueries({ queryKey: ['template-snippets'] })}
              />
            ))}
            {(!templateSnippets || templateSnippets.length === 0) && (
              <p className="text-sm text-muted-foreground">No snippets configured. Add one to get started.</p>
            )}
          </CardContent>
        </Card>
      )}

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
