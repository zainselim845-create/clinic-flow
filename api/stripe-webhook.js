import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rogkodgqeowiylpckspi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

let supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin && (SUPABASE_SERVICE_KEY || process.env.NODE_ENV === 'test')) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || 'test-mock-key-for-local-runs');
  }
  return supabaseAdmin;
}

const processedEvents = new Set();

function verifyStripeSignature(payload, signatureHeader, secret) {
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  if (!signatureHeader) return false;

  try {
    const parts = signatureHeader.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const signature = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !signature) return false;

    const toleranceSec = 300;
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - parseInt(timestamp, 10)) > toleranceSec) {
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification error:', err);
    return false;
  }
}

async function updateClinicSubscription(clinicId, updates) {
  if (!clinicId) return { error: new Error('Missing clinicId') };

  try {
    const client = getSupabaseAdmin();
    if (!client) return { data: null, error: null };

    const { data, error } = await client
      .from('clinics')
      .update({
        subscription_status: updates.status,
        subscription_tier: updates.tier || 'pro',
        updated_at: new Date().toISOString()
      })
      .or(`id.eq.${clinicId},slug.eq.${clinicId}`);

    if (error) {
      console.warn('[Stripe Webhook] Supabase update notice:', error.message);
    }
    return { data, error };
  } catch (err) {
    console.error('[Stripe Webhook] Database update error:', err);
    return { error: err };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signature = req.headers['stripe-signature'];
  let rawBody = '';

  if (typeof req.body === 'string') {
    rawBody = req.body;
  } else if (Buffer.isBuffer(req.body)) {
    rawBody = req.body.toString('utf8');
  } else {
    rawBody = JSON.stringify(req.body || {});
  }

  const isValid = verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const eventId = event?.id;
  const eventType = event?.type;

  if (!eventId || !eventType) {
    return res.status(400).json({ error: 'Missing event ID or type' });
  }

  if (processedEvents.has(eventId)) {
    return res.status(200).json({ received: true, deduplicated: true });
  }

  processedEvents.add(eventId);
  if (processedEvents.size > 5000) {
    const first = processedEvents.values().next().value;
    processedEvents.delete(first);
  }

  const dataObject = event.data?.object || {};
  const clinicId = dataObject.metadata?.clinicId || dataObject.client_reference_id;

  try {
    switch (eventType) {
      case 'checkout.session.completed': {
        const tier = dataObject.metadata?.tier || 'pro';
        if (clinicId) {
          await updateClinicSubscription(clinicId, {
            status: 'active',
            tier
          });
        }
        break;
      }

      case 'invoice.paid': {
        if (clinicId) {
          await updateClinicSubscription(clinicId, {
            status: 'active'
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        if (clinicId) {
          await updateClinicSubscription(clinicId, {
            status: 'past_due'
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        if (clinicId) {
          await updateClinicSubscription(clinicId, {
            status: 'cancelled'
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const status = dataObject.status === 'active' ? 'active' : 'suspended';
        if (clinicId) {
          await updateClinicSubscription(clinicId, {
            status
          });
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true, eventId, eventType });
  } catch (processError) {
    console.error('[Stripe Webhook] Processing failed:', processError);
    return res.status(500).json({ error: 'Internal processing error' });
  }
}
