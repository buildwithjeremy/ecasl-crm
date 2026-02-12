
-- Create template_snippets table
CREATE TABLE public.template_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  label text NOT NULL,
  content text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.template_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage template snippets" ON public.template_snippets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Team members can view template snippets" ON public.template_snippets
  FOR SELECT USING (is_team_member(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_template_snippets_updated_at
  BEFORE UPDATE ON public.template_snippets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed snippets
INSERT INTO public.template_snippets (name, label, content, sort_order) VALUES
  ('15_min_wait', '15-Min Wait Policy', '<p><strong>Please note:</strong> Per our policy, interpreters are expected to wait up to 15 minutes past the scheduled start time. If the assignment has not begun within 15 minutes, please contact our office for further instructions.</p>', 0),
  ('workers_comp', 'Workers Comp', '<p><strong>Workers Compensation Notice:</strong> This is a Workers'' Compensation assignment. You must call our office within 10 minutes of arrival. If we do not receive your call within 10 minutes of the scheduled start time, payment for this assignment will be forfeited.</p>', 1);
