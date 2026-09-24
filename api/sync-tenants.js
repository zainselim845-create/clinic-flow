import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rogkodgqeowiylpckspi.supabase.co';

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const BUCKET_NAME = 'tenants';
const REGISTRY_FILE = 'sync/tenants_registry.json';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FALLBACK_CLINICS = [
  {
    id: 'clinic-domya-auto',
    name: 'عيادة د. domya auto',
    doctorName: 'د. domya auto',
    specialty: 'جراحة العظام والمفاصل والعمود الفقري',
    slug: 'dr-domyaauto',
    senderId: 'DrDomyaauto',
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    quotas: { maxDoctors: 3, monthlySmsQuota: 1000, smsUsed: 0 },
    createdAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'clinic-mohamed-saeed-obgyn',
    name: 'عيادة د. Mohamed Saeed',
    doctorName: 'د. Mohamed Saeed',
    specialty: 'النساء والتوليد ورعاية الحوامل وعلاج العقم',
    slug: 'dr-mo1momo3mo16',
    senderId: 'DrMo1momo3m',
    subscriptionTier: 'pro',
    subscriptionStatus: 'lifetime',
    isLifetimeLicense: true,
    agreementAmount: 25000,
    customAgreedPrice: 25000,
    quotas: { maxDoctors: 3, monthlySmsQuota: 1000, smsUsed: 0 },
    createdAt: '2026-09-20T11:00:00.000Z'
  },
  {
    id: 'clinic-mohammed-saeed-dental',
    name: 'عيادة د. Mohamed Saeed',
    doctorName: 'د. Mohamed Saeed',
    specialty: 'طب وجراحة الفم والأسنان العام',
    slug: 'dr-mohammedsaeed6u',
    senderId: 'DrMohammeds',
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    quotas: { maxDoctors: 3, monthlySmsQuota: 1000, smsUsed: 0 },
    createdAt: '2026-09-20T12:00:00.000Z'
  },
  {
    id: 'clinic-rama-sarg-dental',
    name: 'عيادة د. Rama Sarg',
    doctorName: 'د. Rama Sarg',
    specialty: 'طب وجراحة الفم والأسنان العام',
    slug: 'dr-ramasarg0',
    senderId: 'DrRamaSarg',
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    quotas: { maxDoctors: 3, monthlySmsQuota: 1000, smsUsed: 0 },
    createdAt: '2026-09-23T08:00:00.000Z'
  }
];

async function getRegistry() {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(REGISTRY_FILE);

    if (error || !data) {
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        tenants: FALLBACK_CLINICS,
        users: []
      };
    }

    const text = await data.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.tenants)) {
      parsed.tenants = FALLBACK_CLINICS;
    }
    if (!Array.isArray(parsed.users)) {
      parsed.users = [];
    }
    return parsed;
  } catch (err) {
    console.warn('[Sync-Tenants API] getRegistry error, using fallback:', err.message);
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      tenants: FALLBACK_CLINICS,
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

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const registry = await getRegistry();
      const sanitizedUsers = (registry.users || []).map(u => {
        const { password, ...safeUser } = u;
        return safeUser;
      });
      return res.status(200).json({
        success: true,
        tenants: registry.tenants,
        users: sanitizedUsers,
        updatedAt: registry.updatedAt
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { tenant, user } = body;

      if (!tenant && !user) {
        return res.status(400).json({ success: false, error: 'Missing tenant or user payload' });
      }

      const registry = await getRegistry();

      if (tenant && (tenant.id || tenant.slug)) {
        const tIndex = registry.tenants.findIndex(
          t => t.id === tenant.id || t.slug === tenant.slug
        );
        if (tIndex >= 0) {
          registry.tenants[tIndex] = {
            ...registry.tenants[tIndex],
            ...tenant,
            updatedAt: new Date().toISOString()
          };
        } else {
          registry.tenants.push({
            ...tenant,
            createdAt: tenant.createdAt || new Date().toISOString()
          });
        }
      }

      if (user && (user.id || user.email)) {
        const uIndex = registry.users.findIndex(
          u => u.id === user.id || (user.email && u.email?.toLowerCase() === user.email.toLowerCase())
        );
        if (uIndex >= 0) {
          registry.users[uIndex] = {
            ...registry.users[uIndex],
            ...user,
            updatedAt: new Date().toISOString()
          };
        } else {
          registry.users.push({
            ...user,
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
            specialty: tenant.specialty,
            phone: tenant.phone,
            subscription_tier: tenant.subscriptionTier || 'pro',
            subscription_status: tenant.subscriptionStatus || 'active'
          }).select().maybeSingle();
        } catch (_) {}
      }

      return res.status(200).json({
        success: true,
        message: 'Tenant and user saved to cloud registry',
        tenant,
        totalTenants: registry.tenants.length
      });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { id, slug, status, reason, branding, quotas } = body;
      const targetIdentifier = id || slug;

      if (!targetIdentifier) {
        return res.status(400).json({ success: false, error: 'Missing clinic id or slug' });
      }

      const registry = await getRegistry();
      const tIndex = registry.tenants.findIndex(
        t => t.id === targetIdentifier || t.slug === targetIdentifier
      );

      if (tIndex >= 0) {
        if (status) registry.tenants[tIndex].subscriptionStatus = status;
        if (reason) registry.tenants[tIndex].suspensionReason = reason;
        if (branding) registry.tenants[tIndex].branding = branding;
        if (quotas) registry.tenants[tIndex].quotas = quotas;
        registry.tenants[tIndex].updatedAt = new Date().toISOString();

        await saveRegistry(registry);
        return res.status(200).json({ success: true, tenant: registry.tenants[tIndex] });
      } else {
        return res.status(404).json({ success: false, error: 'Clinic not found' });
      }
    }

    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const targetIdentifier = body.id || body.slug || req.query?.id || req.query?.slug;

      if (!targetIdentifier) {
        return res.status(400).json({ success: false, error: 'Missing clinic id or slug' });
      }

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
