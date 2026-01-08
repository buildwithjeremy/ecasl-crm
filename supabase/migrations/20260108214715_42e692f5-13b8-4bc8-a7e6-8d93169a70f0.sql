-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the auto-complete-jobs function to run every 5 minutes
SELECT cron.schedule(
  'auto-complete-jobs',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://umyjqvmpvjfikljhoofy.supabase.co/functions/v1/auto-complete-jobs',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteWpxdm1wdmpmaWtsamhvb2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTcwMzYsImV4cCI6MjA4MzIzMzAzNn0.r5ZxgXrbAz9M_mnFjvh7CfKbIUIzpPwm1vUJLKNhmdY"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);