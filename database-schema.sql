-- =============================================
-- EFFECTIVE COMMUNICATION CRM DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'gsa_contributor', 'bookkeeper');
CREATE TYPE public.interpreter_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.facility_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.job_status AS ENUM ('new', 'outreach_in_progress', 'confirmed', 'complete', 'ready_to_bill', 'billed', 'paid', 'cancelled');
CREATE TYPE public.job_location_type AS ENUM ('in_person', 'remote');
CREATE TYPE public.contract_status AS ENUM ('not_sent', 'sent', 'signed');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'submitted', 'paid');
CREATE TYPE public.payment_method AS ENUM ('zelle', 'check');
CREATE TYPE public.bill_status AS ENUM ('queued', 'paid');
CREATE TYPE public.opportunity_source AS ENUM ('direct', 'agency', 'gsa', 'referral', 'repeat', 'other');
CREATE TYPE public.billing_hours_type AS ENUM ('business', 'after_hours', 'emergency');

-- PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- INTERPRETERS TABLE
CREATE TABLE public.interpreters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  timezone TEXT,
  status public.interpreter_status DEFAULT 'pending',
  rid_certified BOOLEAN DEFAULT FALSE,
  nic_certified BOOLEAN DEFAULT FALSE,
  other_certifications TEXT,
  rate_business_hours DECIMAL(10, 2),
  rate_after_hours DECIMAL(10, 2),
  rate_mileage DECIMAL(10, 2),
  minimum_hours DECIMAL(4, 2) DEFAULT 2,
  eligible_emergency_fee BOOLEAN DEFAULT FALSE,
  eligible_holiday_fee BOOLEAN DEFAULT FALSE,
  payment_method public.payment_method,
  payment_details TEXT,
  contract_status public.contract_status DEFAULT 'not_sent',
  contract_signed_date DATE,
  w9_received BOOLEAN DEFAULT FALSE,
  w9_received_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interpreters ENABLE ROW LEVEL SECURITY;

-- FACILITIES TABLE
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  billing_name TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,
  physical_address TEXT,
  physical_city TEXT,
  physical_state TEXT,
  physical_zip TEXT,
  admin_contact_name TEXT,
  admin_contact_phone TEXT,
  admin_contact_email TEXT,
  status public.facility_status DEFAULT 'pending',
  rate_business_hours DECIMAL(10, 2),
  rate_after_hours DECIMAL(10, 2),
  rate_mileage DECIMAL(10, 2),
  minimum_billable_hours DECIMAL(4, 2) DEFAULT 2,
  emergency_fee DECIMAL(10, 2),
  holiday_fee DECIMAL(10, 2),
  invoice_prefix TEXT,
  billing_code TEXT,
  net_terms INTEGER DEFAULT 30,
  contract_status public.contract_status DEFAULT 'not_sent',
  contract_signed_date DATE,
  is_gsa BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- JOBS TABLE
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT UNIQUE,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE RESTRICT NOT NULL,
  interpreter_id UUID REFERENCES public.interpreters(id) ON DELETE SET NULL,
  deaf_client_name TEXT,
  job_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_type public.job_location_type DEFAULT 'in_person',
  location_address TEXT,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  video_call_link TEXT,
  status public.job_status DEFAULT 'new',
  opportunity_source public.opportunity_source,
  billing_hours_type public.billing_hours_type DEFAULT 'business',
  business_hours_worked DECIMAL(4, 2),
  after_hours_worked DECIMAL(4, 2),
  actual_start_time TIME,
  actual_end_time TIME,
  facility_rate_business DECIMAL(10, 2),
  facility_rate_after_hours DECIMAL(10, 2),
  facility_rate_mileage DECIMAL(10, 2),
  interpreter_rate_business DECIMAL(10, 2),
  interpreter_rate_after_hours DECIMAL(10, 2),
  interpreter_rate_mileage DECIMAL(10, 2),
  mileage DECIMAL(10, 2),
  parking DECIMAL(10, 2),
  tolls DECIMAL(10, 2),
  travel_time_hours DECIMAL(4, 2),
  emergency_fee_applied BOOLEAN DEFAULT FALSE,
  holiday_fee_applied BOOLEAN DEFAULT FALSE,
  billable_hours DECIMAL(4, 2),
  total_facility_charge DECIMAL(10, 2),
  total_interpreter_pay DECIMAL(10, 2),
  internal_notes TEXT,
  confirmation_sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  invoice_reminder_sent_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- INVOICES TABLE
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE RESTRICT NOT NULL,
  status public.invoice_status DEFAULT 'draft',
  subtotal DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  issued_date DATE,
  due_date DATE,
  paid_date DATE,
  quickbooks_invoice_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- INVOICE ITEMS TABLE
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- INTERPRETER BILLS TABLE
CREATE TABLE public.interpreter_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interpreter_id UUID REFERENCES public.interpreters(id) ON DELETE RESTRICT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE RESTRICT NOT NULL,
  status public.bill_status DEFAULT 'queued',
  hours_amount DECIMAL(10, 2) DEFAULT 0,
  mileage_amount DECIMAL(10, 2) DEFAULT 0,
  expenses_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  pay_period_start DATE,
  pay_period_end DATE,
  paid_date DATE,
  payment_method public.payment_method,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interpreter_bills ENABLE ROW LEVEL SECURITY;

-- EMAIL TEMPLATES TABLE
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- EMAIL LOGS TABLE
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  interpreter_id UUID REFERENCES public.interpreters(id) ON DELETE SET NULL,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  template_name TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Auto-generate job number (YYYY-00001 format)
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM NEW.job_date)::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.jobs
  WHERE job_number LIKE current_year || '-%';
  
  NEW.job_number := current_year || '-' || LPAD(next_number::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_job_number
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  WHEN (NEW.job_number IS NULL)
  EXECUTE FUNCTION public.generate_job_number();

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_interpreters_updated_at BEFORE UPDATE ON public.interpreters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_interpreter_bills_updated_at BEFORE UPDATE ON public.interpreter_bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Handle new user signup - create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is a team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- USER ROLES POLICIES
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- INTERPRETERS POLICIES
CREATE POLICY "Team members can view interpreters" ON public.interpreters
  FOR SELECT USING (public.is_team_member(auth.uid()));

CREATE POLICY "Admins can manage interpreters" ON public.interpreters
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- FACILITIES POLICIES
CREATE POLICY "Admins can manage facilities" ON public.facilities
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "GSA contributors can view GSA facilities" ON public.facilities
  FOR SELECT USING (
    public.has_role(auth.uid(), 'gsa_contributor') AND is_gsa = TRUE
  );

CREATE POLICY "Bookkeepers can view all facilities" ON public.facilities
  FOR SELECT USING (public.has_role(auth.uid(), 'bookkeeper'));

-- JOBS POLICIES
CREATE POLICY "Admins can manage all jobs" ON public.jobs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "GSA contributors can view GSA jobs" ON public.jobs
  FOR SELECT USING (
    public.has_role(auth.uid(), 'gsa_contributor') AND 
    facility_id IN (SELECT id FROM public.facilities WHERE is_gsa = TRUE)
  );

CREATE POLICY "Bookkeepers can view all jobs" ON public.jobs
  FOR SELECT USING (public.has_role(auth.uid(), 'bookkeeper'));

-- INVOICES POLICIES
CREATE POLICY "Admins can manage invoices" ON public.invoices
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Bookkeepers can view invoices" ON public.invoices
  FOR SELECT USING (public.has_role(auth.uid(), 'bookkeeper'));

-- INVOICE ITEMS POLICIES
CREATE POLICY "Admins can manage invoice items" ON public.invoice_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Bookkeepers can view invoice items" ON public.invoice_items
  FOR SELECT USING (public.has_role(auth.uid(), 'bookkeeper'));

-- INTERPRETER BILLS POLICIES
CREATE POLICY "Admins can manage interpreter bills" ON public.interpreter_bills
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Bookkeepers can view interpreter bills" ON public.interpreter_bills
  FOR SELECT USING (public.has_role(auth.uid(), 'bookkeeper'));

-- EMAIL TEMPLATES POLICIES
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can view email templates" ON public.email_templates
  FOR SELECT USING (public.is_team_member(auth.uid()));

-- EMAIL LOGS POLICIES
CREATE POLICY "Admins can manage email logs" ON public.email_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can view email logs" ON public.email_logs
  FOR SELECT USING (public.is_team_member(auth.uid()));
