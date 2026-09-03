import { createClient } from '@supabase/supabase-js';
import { safeStorage } from '../utils/safeStorage';

export const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export const getSupabaseConfig = () => {
  const storedUrl = safeStorage.getItem('clinicflow_supabase_url', null);
  const storedKey = safeStorage.getItem('clinicflow_supabase_key', null);

  const url = storedUrl || import.meta.env.VITE_SUPABASE_URL || 'https://rogkodgqeowiylpckspi.supabase.co';
  const key = storedKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return { url, key };
};

export const saveSupabaseConfig = (url, key) => {
  if (url) {
    safeStorage.setItem('clinicflow_supabase_url', url);
  } else {
    safeStorage.removeItem('clinicflow_supabase_url');
  }

  if (key) {
    safeStorage.setItem('clinicflow_supabase_key', key);
  } else {
    safeStorage.removeItem('clinicflow_supabase_key');
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
