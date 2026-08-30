import { createClient } from '@supabase/supabase-js';

export const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export const getSupabaseConfig = () => {

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('clinicflow_supabase_url') : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem('clinicflow_supabase_key') : null;

  const url = storedUrl || import.meta.env.VITE_SUPABASE_URL || 'https://rogkodgqeowiylpckspi.supabase.co';
  const key = storedKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return { url, key };
};

export const saveSupabaseConfig = (url, key) => {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem('clinicflow_supabase_url', url);
    if (key) localStorage.setItem('clinicflow_supabase_key', key);
  }
  clientInstance = null;
};


export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key && key.length > 20);
};

let clientInstance = null;

export const getSupabase = () => {
  const { url, key } = getSupabaseConfig();
  if (url && key && key.length > 20) {
    if (!clientInstance) {
      clientInstance = createClient(url, key);
    }
    return clientInstance;
  }
  return null;
};

export const supabase = new Proxy({}, {
  get: (target, prop) => {
    const client = getSupabase();
    if (client && prop in client) {
      const val = client[prop];
      return typeof val === 'function' ? val.bind(client) : val;
    }
    return undefined;
  }
});
