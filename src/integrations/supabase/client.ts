import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get environment variables with validation
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Validate URL format
if (!SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.startsWith('http://')) {
  throw new Error('VITE_SUPABASE_URL must be a valid URL starting with https:// or http://');
}

// Create Supabase client with enhanced configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application': 'timebank-ng',
      'x-environment': import.meta.env.VITE_ENVIRONMENT || 'development'
    }
  }
});