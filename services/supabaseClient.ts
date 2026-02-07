import { createClient } from '@supabase/supabase-js';

// Get env vars handling both standard Vite and some sandbox environments
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key];
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    return process.env[key];
  }
  return '';
};

// Storage keys for manual configuration via UI
const LS_KEY = 'cla_supabase_key';
const LS_URL = 'cla_supabase_url';
const storedKey = localStorage.getItem(LS_KEY);
const storedUrl = localStorage.getItem(LS_URL);

// Use provided URL and Key as default if not in Env or Storage
// NOTE: These defaults are placeholders to prevent crashes, but should NOT be treated as valid configuration.
const DEFAULT_URL = 'https://taubsuolhawpdibrhtkb.supabase.co';
const DEFAULT_KEY = 'sb_publishable_8ZQqb0ErWyz5oP_BWQqECQ_Ospm1Q08';

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || storedUrl || DEFAULT_URL;
const SUPABASE_KEY = getEnv('VITE_SUPABASE_KEY') || storedKey || DEFAULT_KEY;

// Validate configuration
export const isSupabaseConfigured = 
  SUPABASE_URL && 
  SUPABASE_KEY && 
  SUPABASE_KEY.length > 30 && 
  !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
  SUPABASE_URL !== DEFAULT_URL && // Treat default URL as not configured
  SUPABASE_KEY !== DEFAULT_KEY;   // Treat default Key as not configured

// Helper to save credentials from UI
export const configureSupabase = (key: string, url?: string) => {
  if (key) localStorage.setItem(LS_KEY, key);
  if (url) localStorage.setItem(LS_URL, url);
  window.location.reload(); // Reload to re-init client
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_URL);
  window.location.reload();
};

// Create client (with fallback to avoid crash if key is missing)
export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder'
);