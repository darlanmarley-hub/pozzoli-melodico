import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejjemzuvyzmxyjteeonz.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqamVtenV2eXpteHlqdGVlb256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNDE3NjYsImV4cCI6MjEwODkxNzc2Nn0.rqTtqoQZZpN-8RoYUCJH72yDMSaE5SeLi-J-icmJFLI';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

