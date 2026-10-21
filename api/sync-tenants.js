import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rogkodgqeowiylpckspi.supabase.co';

const DEFAULT_SUPABASE_KEY = 'sb_publishable_wuceFYy_wMujWGBRRVVfUg_oTXMFKrg';
const HAS_SERVICE_ROLE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
const BUCKET_NAME = 'tenants';
const REGISTRY_FILE = 'sync/tenants_registry.json';

let supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (!HAS_SERVICE_ROLE_KEY && process.env.NODE_ENV === 'production') {
      console.warn('[SyncTenants API] Warning: SUPABASE_SERVICE_ROLE_KEY not configured in environment. Storage operations may be restricted by RLS.');
    }
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabaseAdmin;
}

const LEGACY_DEMO_SLUGS = new Set([
  'dr-ahmed', 
  'dr-sara'
]);

const ALLOWED_SUBSCRIPTION_STATUSES = new Set(['active', 'trial', 'suspended', 'cancelled', 'lifetime', 'pending_approval']);
const ALLOWED_SUBSCRIPTION_TIERS = new Set(['free', 'basic', 'pro', 'enterprise', 'lifetime']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDENTIFIER_REGEX = /^[a-zA-Z0-9_-]+$/;
const DOMAIN_REGEX = /^[a-zA-Z0-9.-]+$/;

const LEGACY_DEMO_EMAILS = new Set([
  'doctor@clinicflow.com',
  'sara.clinic@clinicflow.com',
  'owner@clinicflow.com',
  'reception@clinicflow.com'
]);

function isDemoOrCorruptedTenant(t) {
  if (!t) return true;
  const slug = (t.slug || '').toLowerCase();
  const email = (t.doctorEmail || t.email || '').toLowerCase();

  if (LEGACY_DEMO_SLUGS.has(slug)) return true;
  if (LEGACY_DEMO_EMAILS.has(email)) return true;
  return false;
}

function isDemoOrCorruptedUser(u) {
  if (!u) return true;
  const email = (u.email || '').toLowerCase();
  const id = (u.id || '').toLowerCase();

  if (LEGACY_DEMO_EMAILS.has(email)) return true;
  if (id === 'doc-master' || id === 'doc-sara-master' || id === 'user-multi-clinic-owner' || id === 'staff-reception-master') return true;
  return false;
}

async function getRegistry() {
  try {
    const { data, error } = await getSupabaseAdmin().storage
      .from(BUCKET_NAME)
      .download(REGISTRY_FILE);

    if (error || !data) {
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        tenants: [],
        users: []
      };
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.tenants)) {
      parsed.tenants = [];
    }
    if (!Array.isArray(parsed.users)) {
      parsed.users = [];
    }

    const originalTenantsLen = parsed.tenants.length;
    const originalUsersLen = parsed.users.length;

    parsed.tenants = parsed.tenants.filter(t => !isDemoOrCorruptedTenant(t));
    parsed.users = parsed.users.filter(u => !isDemoOrCorruptedUser(u));

    const hasUnsanitizedData = 
      (parsed.users || []).some(u => u.password || u.doctorPassword) ||
      (parsed.tenants || []).some(t => t.doctorPassword || t.apiKey || t.secretKey || t.secret);

    if (parsed.tenants.length !== originalTenantsLen || parsed.users.length !== originalUsersLen || hasUnsanitizedData) {
      saveRegistry(parsed).catch(err => console.warn('[Sync-Tenants API] Auto-sanitize/prune save notice:', err.message));
    }

    return parsed;
  } catch (err) {
    console.warn('[Sync-Tenants API] getRegistry error, using fallback:', err.message);
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      tenants: [],
      users: []
    };
  }
}

async function saveRegistry(registry) {
  registry.updatedAt = new Date().toISOString();
  
  // Security Hardening (CWE-312 / CWE-200): Strip all passwords, secrets, and API keys before saving to storage
  const sanitizedTenants = (registry.tenants || []).map(t => {
    const { doctorPassword, apiKey, secretKey, secret, ...safeTenant } = t;
    return safeTenant;
  });

  const sanitizedUsers = (registry.users || []).map(u => {
    const { password, doctorPassword, ...safeUser } = u;
    return safeUser;
  });

  const safeRegistry = {
    version: registry.version || 1,
    updatedAt: registry.updatedAt,
    tenants: sanitizedTenants,
    users: sanitizedUsers
  };

  const buffer = Buffer.from(JSON.stringify(safeRegistry, null, 2));

  const { error } = await getSupabaseAdmin().storage
    .from(BUCKET_NAME)
    .upload(REGISTRY_FILE, buffer, {
      contentType: 'application/json',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to save registry to storage: ${error.message}`);
  }
}

function parseJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    if (req.body.length > 1024 * 1024) {
      console.warn('[Sync-Tenants API] Payload exceeded 1MB size limit (CWE-120 mitigation)');
      return null;
    }
    try {
      return JSON.parse(req.body);
    } catch (parseErr) {
      console.warn('[Sync-Tenants API] Malformed JSON payload:', parseErr.message);
      return null;
    }
  }
  return {};
}

export default async function handler(req, res) {
  // Security & CORS Headers — allow production, vercel deployments, and localhost
  const ALLOWED_ORIGINS = new Set([
    'https://clinic-flow-lh3g.vercel.app',
    process.env.ALLOWED_ORIGIN // Optional additional origin from env
  ].filter(Boolean));
  const requestOrigin = req.headers.origin || '';
  const isVercelDomain = /^https:\/\/clinic-flow.*\.vercel\.app$/.test(requestOrigin);
  const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(requestOrigin);
  const isAllowed = ALLOWED_ORIGINS.has(requestOrigin) || isVercelDomain || isLocalhost;
  const corsOrigin = isAllowed ? requestOrigin : '';
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-sync-secret');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    // Respond to preflight
    if (corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    }
    return res.status(200).end();
  }

  // Authentication gate for mutating operations (CWE-862 / CWE-306)
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const requiredSecret = process.env.SYNC_API_SECRET;
    if (requiredSecret) {
      const clientSecret = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.headers['x-sync-secret'];
      if (clientSecret !== requiredSecret) {
        return res.status(401).json({ success: false, error: 'Unauthorized: valid API secret required' });
      }
    }
  }

  try {
    if (req.method === 'GET') {
      const registry = await getRegistry();
      const normalizedTenants = (registry.tenants || []).map(t => {
        const { doctorPassword, apiKey, secretKey, secret, ...safeTenant } = t;
        const isCompleted = Boolean(safeTenant.name && safeTenant.slug);
        return {
          ...safeTenant,
          isOnboardingCompleted: isCompleted ? true : (safeTenant.isOnboardingCompleted ?? true)
        };
      });
      const sanitizedUsers = (registry.users || []).map(u => {
        const { password, doctorPassword, ...safeUser } = u;
        const hasClinic = Boolean(safeUser.clinicSlug && safeUser.clinicSlug !== '*');
        return {
          ...safeUser,
          needsOnboarding: hasClinic ? false : (safeUser.needsOnboarding ?? false),
          isOnboardingCompleted: hasClinic ? true : (safeUser.isOnboardingCompleted ?? true)
        };
      });
      return res.status(200).json({
        success: true,
        tenants: normalizedTenants,
        users: sanitizedUsers,
        updatedAt: registry.updatedAt
      });
    }

    if (req.method === 'POST') {
      const body = parseJsonBody(req);
      if (body === null) {
        return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
      }
      const { tenant, user } = body;

      if (!tenant && !user) {
        return res.status(400).json({ success: false, error: 'Missing tenant or user payload' });
      }

      // Input Validation & Length Bounds (CWE-20 / CWE-120)
      if (tenant) {
        const rawTenantId = String(tenant.id || '').trim();
        const rawTenantSlug = String(tenant.slug || '').trim();
        if (rawTenantId && (!IDENTIFIER_REGEX.test(rawTenantId) || rawTenantId.length > 64)) {
          return res.status(400).json({ success: false, error: 'Invalid tenant id format' });
        }
        if (rawTenantSlug && (!IDENTIFIER_REGEX.test(rawTenantSlug) || rawTenantSlug.length > 64)) {
          return res.status(400).json({ success: false, error: 'Invalid tenant slug format' });
        }
        if (tenant.doctorEmail && (typeof tenant.doctorEmail !== 'string' || tenant.doctorEmail.length > 128 || !EMAIL_REGEX.test(tenant.doctorEmail))) {
          return res.status(400).json({ success: false, error: 'Invalid tenant email format' });
        }
        if (tenant.subscriptionTier && !ALLOWED_SUBSCRIPTION_TIERS.has(tenant.subscriptionTier)) {
          tenant.subscriptionTier = 'pro';
        }
        if (tenant.subscriptionStatus && !ALLOWED_SUBSCRIPTION_STATUSES.has(tenant.subscriptionStatus)) {
          tenant.subscriptionStatus = 'active';
        }
      }
      if (user) {
        const rawUserId = String(user.id || '').trim();
        if (rawUserId && (!IDENTIFIER_REGEX.test(rawUserId) || rawUserId.length > 64)) {
          return res.status(400).json({ success: false, error: 'Invalid user id format' });
        }
        if (user.email && (typeof user.email !== 'string' || user.email.length > 128 || !EMAIL_REGEX.test(user.email))) {
          return res.status(400).json({ success: false, error: 'Invalid user email format' });
        }
        if (user.clinicSlug && user.clinicSlug !== '*' && (!IDENTIFIER_REGEX.test(user.clinicSlug) || user.clinicSlug.length > 64)) {
          return res.status(400).json({ success: false, error: 'Invalid user clinic slug format' });
        }
      }

      const registry = await getRegistry();

      let safeTenant = null;
      if (tenant && (tenant.id || tenant.slug)) {
        const { doctorPassword, apiKey, secretKey, secret, ...restTenant } = tenant;
        safeTenant = { ...restTenant, isOnboardingCompleted: true };
        const tIndex = registry.tenants.findIndex(
          t => t.id === safeTenant.id || t.slug === safeTenant.slug
        );
        if (tIndex >= 0) {
          registry.tenants[tIndex] = {
            ...registry.tenants[tIndex],
            ...safeTenant,
            isOnboardingCompleted: true,
            updatedAt: new Date().toISOString()
          };
        } else {
          registry.tenants.push({
            ...safeTenant,
            isOnboardingCompleted: true,
            createdAt: safeTenant.createdAt || new Date().toISOString()
          });
        }
      }

      if (user && (user.id || user.email)) {
        const { password, doctorPassword, ...safeUser } = user;
        // Enforce Trust Boundary & Privilege Management (CWE-269 / CWE-501)
        if (safeUser.role === 'super_admin' && (safeUser.email || '').toLowerCase() !== 'superadmin@clinicflow.com') {
          console.warn('[Sync-Tenants API] Blocked unauthorized super_admin escalation attempt for:', safeUser.email);
          safeUser.role = 'doctor';
          safeUser.isSuperAdmin = false;
        }

        if (safeUser.clinicSlug && safeUser.clinicSlug !== '*') {
          safeUser.needsOnboarding = false;
          safeUser.isOnboardingCompleted = true;
        }
        const uIndex = registry.users.findIndex(
          u => u.id === safeUser.id || (safeUser.email && u.email?.toLowerCase() === safeUser.email.toLowerCase())
        );
        if (uIndex >= 0) {
          registry.users[uIndex] = {
            ...registry.users[uIndex],
            ...safeUser,
            needsOnboarding: safeUser.needsOnboarding ?? false,
            isOnboardingCompleted: safeUser.isOnboardingCompleted ?? true,
            updatedAt: new Date().toISOString()
          };
        } else {
          registry.users.push({
            ...safeUser,
            needsOnboarding: safeUser.needsOnboarding ?? false,
            isOnboardingCompleted: safeUser.isOnboardingCompleted ?? true,
            createdAt: safeUser.createdAt || new Date().toISOString()
          });
        }
      }

      await saveRegistry(registry);

      // Best effort sync to PostgreSQL clinics table if active
      if (tenant) {
        try {
          await getSupabaseAdmin().from('clinics').upsert({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            doctor_name: tenant.doctorName || tenant.name,
            doctor_email: tenant.doctorEmail || tenant.email || null,
            specialty: tenant.specialty,
            phone: tenant.phone,
            custom_domain: tenant.customDomain || tenant.custom_domain || null,
            subscription_tier: tenant.subscriptionTier || 'pro',
            subscription_status: tenant.subscriptionStatus || 'active'
          }).select().maybeSingle();
        } catch (pgErr) {
          console.warn('[Sync-Tenants API] Supabase DB upsert warning:', pgErr?.message || pgErr);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Tenant and user saved to cloud registry',
        tenant: safeTenant || (tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug } : null),
        totalTenants: registry.tenants.length
      });
    }

    if (req.method === 'PUT') {
      const body = parseJsonBody(req);
      if (body === null) {
        return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
      }
      const { id, slug, status, reason, branding, quotas, customDomain, custom_domain } = body;
      const rawIdentifier = (id || slug || '').trim();

      // Input Validation & PostgREST / SQL Injection Mitigation (CWE-89 / CWE-120)
      if (!rawIdentifier || !IDENTIFIER_REGEX.test(rawIdentifier) || rawIdentifier.length > 64) {
        return res.status(400).json({ success: false, error: 'Invalid clinic identifier format' });
      }
      if (status && !ALLOWED_SUBSCRIPTION_STATUSES.has(status)) {
        return res.status(400).json({ success: false, error: 'Invalid subscription status' });
      }
      if (reason && (typeof reason !== 'string' || reason.length > 500)) {
        return res.status(400).json({ success: false, error: 'Invalid suspension reason length or format' });
      }
      const targetIdentifier = rawIdentifier;

      const registry = await getRegistry();
      const tIndex = registry.tenants.findIndex(
        t => t.id === targetIdentifier || t.slug === targetIdentifier
      );

      if (tIndex >= 0) {
        if (status) registry.tenants[tIndex].subscriptionStatus = status;
        if (reason) registry.tenants[tIndex].suspensionReason = reason;
        if (branding) registry.tenants[tIndex].branding = branding;
        if (quotas) registry.tenants[tIndex].quotas = quotas;
        if (customDomain !== undefined || custom_domain !== undefined) {
          const rawDomain = (customDomain || custom_domain || '').trim();
          // Sanitize domain to prevent injection or XSS (CWE-79 / CWE-89)
          if (rawDomain && !DOMAIN_REGEX.test(rawDomain) || rawDomain.length > 120) {
            return res.status(400).json({ success: false, error: 'Invalid custom domain format' });
          }
          const domainVal = rawDomain || null;
          registry.tenants[tIndex].customDomain = domainVal;
          registry.tenants[tIndex].custom_domain = domainVal;
          try {
            await getSupabaseAdmin().from('clinics').update({
              custom_domain: domainVal,
              updated_at: new Date().toISOString()
            }).or(`id.eq.${targetIdentifier},slug.eq.${targetIdentifier}`);
          } catch (dbErr) {
            console.warn('[Sync-Tenants API] Supabase custom_domain sync warning:', dbErr?.message || dbErr);
          }
        }
        registry.tenants[tIndex].updatedAt = new Date().toISOString();

        await saveRegistry(registry);
        const { doctorPassword, apiKey, secretKey, secret, ...safeTenant } = registry.tenants[tIndex];
        return res.status(200).json({ success: true, tenant: safeTenant });
      } else {
        return res.status(404).json({ success: false, error: 'Clinic not found' });
      }
    }

    if (req.method === 'DELETE') {
      // Auth already verified by centralized gate above

      const body = parseJsonBody(req) || {};
      const rawIdentifier = (body.id || body.slug || req.query?.id || req.query?.slug || '').trim();

      // Input Validation & PostgREST / SQL Injection Mitigation (CWE-89)
      if (!rawIdentifier || !/^[a-zA-Z0-9_-]+$/.test(rawIdentifier)) {
        return res.status(400).json({ success: false, error: 'Invalid clinic identifier format' });
      }
      const targetIdentifier = rawIdentifier;

      const registry = await getRegistry();
      registry.tenants = registry.tenants.filter(
        t => t.id !== targetIdentifier && t.slug !== targetIdentifier
      );
      registry.users = registry.users.filter(
        u => u.clinicId !== targetIdentifier && u.clinicSlug !== targetIdentifier
      );

      await saveRegistry(registry);
      return res.status(200).json({ success: true, message: 'Deleted from cloud registry' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[Sync-Tenants API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
}
