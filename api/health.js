/**
 * ClinicFlow Enterprise Health & Diagnostics API (/api/health)
 * Serves real-time availability probes for uptime monitors (BetterStack, Datadog, Pingdom)
 * and Kubernetes/Vercel liveness/readiness probes.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rogkodgqeowiylpckspi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseAdmin = null;
function getSupabase() {
  if (!supabaseAdmin && (SUPABASE_SERVICE_KEY || process.env.NODE_ENV === 'test')) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || 'mock-health-key');
  }
  return supabaseAdmin;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startTime = Date.now();
  const checks = {
    edge: 'healthy',
    database: 'unknown'
  };

  try {
    const supabase = getSupabase();
    if (supabase) {
      // Light query to verify connection
      const { error } = await supabase.from('clinics').select('count', { count: 'exact', head: true }).limit(1);
      checks.database = error ? 'degraded' : 'healthy';
    } else {
      checks.database = 'offline_mode_ready';
    }

    const latencyMs = Date.now() - startTime;
    const isDegraded = checks.database === 'degraded';

    return res.status(isDegraded ? 503 : 200).json({
      status: isDegraded ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime ? process.uptime() : 0),
      version: '5.2.0',
      latencyMs,
      checks
    });
  } catch (err) {
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      error: err.message || 'Health probe failed',
      checks
    });
  }
}
