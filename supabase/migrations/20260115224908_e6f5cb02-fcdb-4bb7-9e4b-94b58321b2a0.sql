-- Allow null emails for interpreters
ALTER TABLE public.interpreters ALTER COLUMN email DROP NOT NULL;