import { createClient } from '@supabase/supabase-js';
import { safeStorage } from '../utils/safeStorage';

if (typeof globalThis !== 'undefined' && typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    send() {}
    close() {}
  };
}

export const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export const DEFAULT_SUPABASE_URL = 'https://rogkodgqeowiylpckspi.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_wuceFYy_wMujWGBRRVVfUg_oTXMFKrg';

export const getSupabaseConfig = () => {
  const storedUrl = safeStorage.getItem('clinicflow_supabase_url', null);
  const storedKey = safeStorage.getItem('clinicflow_supabase_key', null);

  if (storedKey === '' || storedKey === '__DISABLED__') {
    return { url: storedUrl || '', key: '' };
  }

  // Preserve test suite isolation where saveSupabaseConfig(null, null) explicitly resets mock storage
  if (storedKey === null && storedUrl === null && typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return { url: '', key: '' };
  }

  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL);
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY);

  const url = storedUrl || envUrl || DEFAULT_SUPABASE_URL;
  const key = storedKey || envKey || DEFAULT_SUPABASE_KEY;

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
  return Boolean(
    url && 
    key && 
    key.length > 20 && 
    !key.includes('clinicflow_preconfigured')
  );
};

let clientInstance = null;

export const getSupabase = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const { url, key } = getSupabaseConfig();
  if (!clientInstance) {
    clientInstance = createClient(url, key);
  }
  return clientInstance;
};

const createOfflineQueryBuilder = () => {
  const chain = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    upsert: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    like: () => chain,
    ilike: () => chain,
    is: () => chain,
    in: () => chain,
    contains: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: () => Promise.resolve({ data: null, error: NOT_CONFIGURED_ERROR }),
    maybeSingle: () => Promise.resolve({ data: null, error: NOT_CONFIGURED_ERROR }),
    then: (resolve) => resolve({ data: null, error: NOT_CONFIGURED_ERROR })
  };
  return chain;
};

export const supabase = new Proxy({}, {
  get: (target, prop) => {
    const client = getSupabase();
    if (client && prop in client) {
      const val = client[prop];
      return typeof val === 'function' ? val.bind(client) : val;
    }
    if (prop === 'from') {
      return () => createOfflineQueryBuilder();
    }
    if (prop === 'channel') {
      return () => ({
        on: () => ({ on: () => ({ subscribe: () => {} }) }),
        subscribe: (cb) => {
          if (typeof cb === 'function') cb('CLOSED');
          return { unsubscribe: () => {} };
        },
        send: () => Promise.resolve('error')
      });
    }
    return undefined;
  }
});
