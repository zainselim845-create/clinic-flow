import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rogkodgqeowiylpckspi.supabase.co';

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const BUCKET_NAME = 'tenants';
const REGISTRY_FILE = 'sync/tenants_registry.json';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const LEGACY_DEMO_SLUGS = new Set([
  'dr-ahmed', 
  'dr-sara', 
  'dr-domyaauto', 
  'dr-ramasarg0', 
  'dr-mo1momo3mo16', 
  'dr-mohammedsaeed6u'
]);
const LEGACY_DEMO_EMAILS = new Set([
  'doctor@clinicflow.com',
  'sara.clinic@clinicflow.com',
  'owner@clinicflow.com',
  'reception@clinicflow.com',
  'domyaauto@gmail.com',
  'ramasarg@gmail.com'
]);

function isDemoOrCorruptedTenant(t) {
  if (!t) return true;
  const slug = (t.slug || '').toLowerCase();
  const email = (t.doctorEmail || t.email || '').toLowerCase();
  const name = (t.name || '').toLowerCase();
  const id = (t.id || '').toLowerCase();

  if (LEGACY_DEMO_SLUGS.has(slug)) return true;
  if (LEGACY_DEMO_EMAILS.has(email)) return true;
  if (slug === 'domya-auto' || slug === 'dr-domyaauto' || id === 'clinic-domya-auto' || id === 'clinic-111261498014278193869') return true;
  if (slug.includes('domya') || name.includes('domya') || email.includes('domya') || id.includes('domya')) return true;
  if (slug.includes('ramasarg') || email.includes('ramasarg') || id.includes('ramasarg')) return true;
  if (slug.includes('mo1momo3mo16') || id.includes('mo1momo3mo16')) return true;
  if (slug.includes('mohammedsaeed6u') || id.includes('mohammedsaeed6u')) return true;
  return false;
}

function isDemoOrCorruptedUser(u) {
  if (!u) return true;
  const email = (u.email || '').toLowerCase();
  const name = (u.name || '').toLowerCase();
  const id = (u.id || '').toLowerCase();
  const slug = (u.clinicSlug || '').toLowerCase();

  if (LEGACY_DEMO_EMAILS.has(email)) return true;
  if (id === 'doc-master' || id === 'doc-sara-master' || id === 'user-multi-clinic-owner' || id === 'staff-reception-master') return true;
  if (email.includes('domya') || name.includes('domya') || slug.includes('domya') || id.includes('domya')) return true;
  if (email.includes('ramasarg') || name.includes('ramasarg') || slug.includes('ramasarg') || id.includes('ramasarg')) return true;
  if (slug.includes('mo1momo3mo16') || slug.includes('mohammedsaeed6u')) return true;
  return false;
}

async function getRegistry() {
  try {
    const { data, error } = await supabaseAdmin.storage
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

    if (parsed.tenants.length !== originalTenantsLen || parsed.users.length !== originalUsersLen) {
      saveRegistry(parsed).catch(err => console.warn('[Sync-Tenants API] Prune save notice:', err.message));
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
  const buffer = Buffer.from(JSON.stringify(registry, null, 2));

  const { error } = await supabaseAdmin.storage
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
  // Security & CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const registry = await getRegistry();
      const normalizedTenants = (registry.tenants || []).map(t => {
        const isCompleted = Boolean(t.name && t.slug);
        return {
          ...t,
          isOnboardingCompleted: isCompleted ? true : (t.isOnboardingCompleted ?? true)
        };
      });
      const sanitizedUsers = (registry.users || []).map(u => {
        const { password: _password, ...safeUser } = u;
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

      const registry = await getRegistry();

      if (tenant && (tenant.id || tenant.slug)) {
        tenant.isOnboardingCompleted = true;
        const tIndex = registry.tenants.findIndex(
          t => t.id === tenant.id || t.slug === tenant.slug
        );
        if (tIndex >= 0) {
          registry.tenants[tIndex] = {
            ...registry.tenants[tIndex],
            ...tenant,
            isOnboardingCompleted: true,
            updatedAt: new Date().toISOString()
          };
        } else {
          registry.tenants.push({
            ...tenant,
            isOnboardingCompleted: true,
            createdAt: tenant.createdAt || new Date().toISOString()
          });
        }
      }

      if (user && (user.id || user.email)) {
        // Enforce Trust Boundary & Privilege Management (CWE-269 / CWE-501)
        if (user.role === 'super_admin' && (user.email || '').toLowerCase() !== 'superadmin@clinicflow.com') {
          console.warn('[Sync-Tenants API] Blocked unauthorized super_admin escalation attempt for:', user.email);
          user.role = 'doctor';
          user.isSuperAdmin = false;
        }

        if (user.clinicSlug && user.clinicSlug !== '*') {
          user.needsOnboarding = false;
          user.isOnboardingCompleted = true;
        }
        const uIndex = registry.users.findIndex(
          u => u.id === user.id || (user.email && u.email?.toLowerCase() === user.email.toLowerCase())
        );
        if (uIndex >= 0) {
          registry.users[uIndex] = {
            ...registry.users[uIndex],
            ...user,
            needsOnboarding: user.needsOnboarding ?? false,
            isOnboardingCompleted: user.isOnboardingCompleted ?? true,
            updatedAt: new Date().toISOString()
          };
        } else {
          registry.users.push({
            ...user,
            needsOnboarding: user.needsOnboarding ?? false,
            isOnboardingCompleted: user.isOnboardingCompleted ?? true,
            createdAt: user.createdAt || new Date().toISOString()
          });
        }
      }

      await saveRegistry(registry);

      // Best effort sync to PostgreSQL clinics table if active
      if (tenant) {
        try {
          await supabaseAdmin.from('clinics').upsert({
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
        tenant,
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

      // Input Validation & PostgREST / SQL Injection Mitigation (CWE-89)
      if (!rawIdentifier || !/^[a-zA-Z0-9_-]+$/.test(rawIdentifier)) {
        return res.status(400).json({ success: false, error: 'Invalid clinic identifier format' });
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
          if (rawDomain && !/^[a-zA-Z0-9.-]+$/.test(rawDomain)) {
            return res.status(400).json({ success: false, error: 'Invalid custom domain format' });
          }
          const domainVal = rawDomain || null;
          registry.tenants[tIndex].customDomain = domainVal;
          registry.tenants[tIndex].custom_domain = domainVal;
          try {
            await supabaseAdmin.from('clinics').update({
              custom_domain: domainVal,
              updated_at: new Date().toISOString()
            }).or(`id.eq.${targetIdentifier},slug.eq.${targetIdentifier}`);
          } catch (dbErr) {
            console.warn('[Sync-Tenants API] Supabase custom_domain sync warning:', dbErr?.message || dbErr);
          }
        }
        registry.tenants[tIndex].updatedAt = new Date().toISOString();

        await saveRegistry(registry);
        return res.status(200).json({ success: true, tenant: registry.tenants[tIndex] });
      } else {
        return res.status(404).json({ success: false, error: 'Clinic not found' });
      }
    }

    if (req.method === 'DELETE') {
      // Authorization Check for Critical Resource Deletion (CWE-862 / CWE-306)
      const requiredSecret = process.env.SYNC_API_SECRET;
      if (requiredSecret) {
        const clientSecret = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.headers['x-sync-secret'];
        if (clientSecret !== requiredSecret) {
          return res.status(401).json({ success: false, error: 'Unauthorized: Administrative secret required for tenant deletion' });
        }
      }

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
    return res.status(500).json({ success: false, error: error.message });
  }
}
