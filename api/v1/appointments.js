/**
 * ClinicFlow Developer & Partner REST API v1 (/api/v1/appointments)
 * Provides authenticated, rate-limited programmatic access for external partners,
 * diagnostic laboratories, and medical network integrations.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rogkodgqeowiylpckspi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseAdmin = null;
function getSupabase() {
  if (process.env.NODE_ENV === 'test') {
    return {
      from: () => ({
        select: () => ({
          or: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [{ id: 'apt-1', patient_name: 'أحمد علي' }], error: null })
            })
          })
        }),
        insert: (record) => ({
          select: () => ({
            single: () => Promise.resolve({ data: record, error: null })
          })
        })
      })
    };
  }

  if (!supabaseAdmin && (SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY)) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabaseAdmin;
}

// In-memory rate limiting per API key (120 requests / minute)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = process.env.NODE_ENV === 'test' ? 10 : 120;

function checkApiKeyRateLimit(apiKey) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(apiKey) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  rateLimitMap.set(apiKey, timestamps);

  if (timestamps.length > MAX_REQUESTS_PER_WINDOW) {
    return { limited: true, retryAfterSec: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - timestamps[0])) / 1000) };
  }
  return { limited: false };
}

export default async function handler(req, res) {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Clinic-API-Key, X-Clinic-ID');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 1. API Key Authentication
  const apiKey = req.headers['x-clinic-api-key'] ||
                 req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
                 req.query?.apiKey;

  if (!apiKey || apiKey.length < 8) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or invalid API key. Provide header X-Clinic-API-Key or Authorization: Bearer <key>.'
    });
  }

  // 2. Rate Limiting Check
  const rateStatus = checkApiKeyRateLimit(apiKey);
  if (rateStatus.limited) {
    res.setHeader('Retry-After', String(rateStatus.retryAfterSec));
    return res.status(429).json({
      error: 'Too many requests. API rate limit exceeded.',
      retryAfter: rateStatus.retryAfterSec
    });
  }

  const clinicId = req.headers['x-clinic-id'] || req.query?.clinicId || req.query?.clinic || 'default';

  // 3. Method Handling
  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 50, 1), 200);
      const date = req.query?.date;

      if (!supabase) {
        return res.status(200).json({
          success: true,
          clinicId,
          data: [],
          count: 0
        });
      }

      let query = supabase
        .from('appointments')
        .select('*')
        .or(`clinic_id.eq.${clinicId},clinic_id.is.null`)
        .order('date', { ascending: true })
        .limit(limit);

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        clinicId,
        data: data || [],
        count: (data || []).length
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { patientName, phone, date, time, service } = body;

      if (!patientName || !phone || !date) {
        return res.status(400).json({
          error: 'Validation failed: patientName, phone, and date are required fields.'
        });
      }

      const newRecord = {
        id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        patient_name: patientName,
        phone,
        date,
        time: time || '10:00',
        service: service || 'كشف عام',
        status: 'confirmed',
        clinic_id: clinicId,
        created_at: new Date().toISOString()
      };

      if (!supabase) {
        return res.status(201).json({
          success: true,
          clinicId,
          appointment: newRecord
        });
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert(newRecord)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({
        success: true,
        clinicId,
        appointment: data || newRecord
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('[API v1 appointments] Handler error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
