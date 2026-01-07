import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// NOTE: Lovable deployments do not reliably expose Vite env vars at runtime.
// Since the Supabase URL + anon key are public, we inline them here.
const SUPABASE_URL = 'https://umyjqvmpvjfikljhoofy.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteWpxdm1wdmpmaWtsamhvb2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NTcwMzYsImV4cCI6MjA4MzIzMzAzNn0.r5ZxgXrbAz9M_mnFjvh7CfKbIUIzpPwm1vUJLKNhmdY';

export const supabase: SupabaseClient<Database> = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
