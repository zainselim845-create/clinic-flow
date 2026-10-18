/**
 * ClinicFlow Offline-First Auth Registry
 * Single source of truth for registered tenants/users with memory caches,
 * O(1) lookup indexes, and best-effort cloud synchronization.
 * (Extracted from authService.js — public API re-exported by the facade.)
 */

import { isSupabaseConfigured, CLOUD_TENANTS_REGISTRY_URL } from '@/lib/supabase';
import { createClinicInDb, deleteClinicFromDb } from '@/features/platform/services/clinicsService';
import { safeStorage } from '@/utils/safeStorage';
import { broadcastTenantUpdate } from '@/features/auth/services/auth/authBroadcast';
import { isDemoOrCorruptedTenant, isDemoOrCorruptedUser } from '@/features/auth/services/auth/authValidation';

const REGISTERED_TENANTS_KEY = 'clinicflow_registered_tenants';
const REGISTERED_USERS_KEY = 'clinicflow_registered_users';

let memoryTenantsCache = null;
let memoryUsersCache = null;
export const registeredSlugsSet = new Set();
export const registeredEmailsSet = new Set();
export const registeredPhonesSet = new Set();

/**
 * Resets memory cache (useful for test suites and hot restarts)
 */
export function clearAuthCache() {
  memoryTenantsCache = null;
  memoryUsersCache = null;
  registeredSlugsSet.clear();
  registeredEmailsSet.clear();
  registeredPhonesSet.clear();
}

/**
 * Retrieves all custom registered clinics from persistent storage
 */
export function getRegisteredTenants(forceRefresh = true) {
  if (!forceRefresh && memoryTenantsCache && memoryTenantsCache.length > 0) return memoryTenantsCache;
  if (typeof localStorage === 'undefined') return memoryTenantsCache || [];
  try {
    const raw = localStorage.getItem(REGISTERED_TENANTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    memoryTenantsCache = list.filter(t => !isDemoOrCorruptedTenant(t));
    if (memoryTenantsCache.length !== list.length) {
      localStorage.setItem(REGISTERED_TENANTS_KEY, JSON.stringify(memoryTenantsCache));
    }
    memoryTenantsCache.forEach(t => {
      if (t.slug) registeredSlugsSet.add(t.slug);
      if (t.doctorEmail) registeredEmailsSet.add(t.doctorEmail.toLowerCase());
      if (t.phone) registeredPhonesSet.add(t.phone.replace(/\D/g, ''));
    });
    return memoryTenantsCache;
  } catch (err) {
    console.warn('Failed to load registered tenants:', err);
    return memoryTenantsCache || [];
  }
}

/**
 * Saves a new clinic tenant to persistent storage
 */

/**
 * Safe fetch wrapper for Vercel Serverless Sync API (/api/sync-tenants)
 * Ensures absolute URL formation in non-browser or test environments to prevent ERR_INVALID_URL.
 */
function safeFetchSyncTenants(endpointUrl, options = {}) {
  if (typeof fetch === 'undefined') return Promise.resolve({ ok: false, json: async () => ({}) });
  let finalUrl = endpointUrl;
  if (endpointUrl.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('null')) {
      finalUrl = `${window.location.origin}${endpointUrl}`;
    } else if (typeof process !== 'undefined' && process.env?.VERCEL_URL) {
      finalUrl = `https://${process.env.VERCEL_URL}${endpointUrl}`;
    } else {
      finalUrl = `https://clinic-flow-ten-sigma.vercel.app${endpointUrl}`;
    }
  }
  return fetch(finalUrl, options);
}

/**
 * Synchronizes registered tenants and users from the cloud registry
 * Checks both local Vercel Serverless Sync API and Supabase Storage public CDN
 */
export async function syncTenantsFromCloud() {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return memoryTenantsCache || [];
  try {
    let cloudTenants = [];
    let cloudUsers = [];

    // 1. Try local serverless endpoint first
    try {
      const res = await safeFetchSyncTenants('/api/sync-tenants', { signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tenants) && data.tenants.length > 0) {
          cloudTenants = data.tenants;
        }
        if (Array.isArray(data.users) && data.users.length > 0) {
          cloudUsers = data.users;
        }
      }
    } catch (apiErr) {
      console.warn('[AuthService] /api/sync-tenants sync fallback:', apiErr);
    }

    // 2. Fallback to direct public CDN storage endpoint if API route returned nothing
    if (cloudTenants.length === 0 && CLOUD_TENANTS_REGISTRY_URL) {
      try {
        const cdnRes = await fetch(CLOUD_TENANTS_REGISTRY_URL, { signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined });
        if (cdnRes.ok) {
          const cdnData = await cdnRes.json();
          if (Array.isArray(cdnData.tenants)) {
            cloudTenants = cdnData.tenants;
          }
          if (Array.isArray(cdnData.users)) {
            cloudUsers = cdnData.users;
          }
        }
      } catch (cdnErr) {
        console.warn('[AuthService] CDN tenants fetch notice:', cdnErr);
      }
    }

    if (cloudTenants.length === 0 && cloudUsers.length === 0) return memoryTenantsCache || [];

    // Merge into memoryTenantsCache and localStorage
    if (cloudTenants.length > 0) {
      const local = getRegisteredTenants(true);
      const merged = [...local];
      cloudTenants.forEach(ct => {
        if (!ct || !ct.slug || isDemoOrCorruptedTenant(ct)) return;
        const idx = merged.findIndex(m => m.id === ct.id || m.slug === ct.slug);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...ct };
        } else {
          merged.push(ct);
        }
        if (ct.slug) registeredSlugsSet.add(ct.slug);
        if (ct.doctorEmail) registeredEmailsSet.add(ct.doctorEmail.toLowerCase());
        if (ct.phone) registeredPhonesSet.add(ct.phone.replace(/\D/g, ''));
      });

      memoryTenantsCache = merged;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(REGISTERED_TENANTS_KEY, JSON.stringify(merged));
        } catch (storageErr) {
          console.warn('[AuthService] Failed to persist merged tenants to localStorage:', storageErr);
        }
      }
    }

    // Also merge users if any
    if (cloudUsers.length > 0) {
      const localUsers = getRegisteredUsers(true);
      const mergedUsers = [...localUsers];
      cloudUsers.forEach(cu => {
        if (!cu || (!cu.id && !cu.email) || isDemoOrCorruptedUser(cu)) return;
        const idx = mergedUsers.findIndex(u => u.id === cu.id || (cu.email && u.email?.toLowerCase() === cu.email.toLowerCase()));
        if (idx >= 0) {
          mergedUsers[idx] = { ...mergedUsers[idx], ...cu };
        } else {
          mergedUsers.push(cu);
        }
      });
      memoryUsersCache = mergedUsers;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(mergedUsers));
        } catch (storageErr) {
          console.warn('[AuthService] Failed to persist merged users to localStorage:', storageErr);
        }
      }
    }

    // Upward Reconciliation: Flush pending queue and ensure any local tenants/users missing from cloud are immediately pushed
    flushPendingCloudSyncQueue().catch(() => {});

    if (cloudTenants.length > 0) {
      const missingTenantsFromCloud = local.filter(lt => 
        lt && (lt.slug || lt.id) && !isDemoOrCorruptedTenant(lt) && 
        !cloudTenants.some(ct => (lt.id && ct.id === lt.id) || (lt.slug && ct.slug === lt.slug))
      );
      for (const missingTenant of missingTenantsFromCloud) {
        safeFetchSyncTenants('/api/sync-tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: missingTenant })
        }).catch(err => console.warn('[AuthService] Upward sync tenant note:', err));
      }
    }

    if (cloudUsers.length > 0) {
      const localUsers = getRegisteredUsers(true);
      const missingUsersFromCloud = localUsers.filter(lu =>
        lu && (lu.id || lu.email) && !isDemoOrCorruptedUser(lu) &&
        !cloudUsers.some(cu => (lu.id && cu.id === lu.id) || (lu.email && cu.email && cu.email.toLowerCase() === lu.email.toLowerCase()))
      );
      for (const missingUser of missingUsersFromCloud) {
        safeFetchSyncTenants('/api/sync-tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: missingUser })
        }).catch(err => console.warn('[AuthService] Upward sync user note:', err));
      }
    }

    return merged;
  } catch (err) {
    console.warn('[AuthService] syncTenantsFromCloud notice:', err);
    return memoryTenantsCache || [];
  }
}

const PENDING_SYNC_KEY = 'clinicflow_pending_cloud_sync';

function queuePendingCloudSync(payload) {
  if (!payload) return;
  try {
    const raw = safeStorage.getItem(PENDING_SYNC_KEY);
    const queue = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    const list = Array.isArray(queue) ? queue : [];
    list.push({ ...payload, queuedAt: new Date().toISOString() });
    safeStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(list.slice(-20)));
  } catch (err) {
    console.warn('[AuthService] Failed to queue pending cloud sync:', err);
  }
}

export async function flushPendingCloudSyncQueue() {
  if (typeof fetch === 'undefined') return;
  try {
    const raw = safeStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return;
    const queue = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(queue) || queue.length === 0) return;

    const remaining = [];
    for (const item of queue) {
      try {
        const res = await safeFetchSyncTenants('/api/sync-tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        if (!res || !res.ok) {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
    if (remaining.length > 0) {
      safeStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
    } else {
      safeStorage.removeItem(PENDING_SYNC_KEY);
    }
  } catch (err) {
    console.warn('[AuthService] Pending sync flush notice:', err);
  }
}

/**
 * Mandatory atomic push of a registered clinic tenant and doctor account to the cloud registry.
 * Eliminates browser-only account stranding.
 * @param {Object} tenant
 * @param {Object} user
 * @returns {Promise<boolean>}
 */
export async function syncTenantAndUserToCloud(tenant, user) {
  const payload = { tenant, user };
  if (typeof fetch === 'undefined') return true;
  try {
    const res = await safeFetchSyncTenants('/api/sync-tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res && res.ok) {
      const data = await res.json();
      return Boolean(data.success);
    }
    queuePendingCloudSync(payload);
    return false;
  } catch (err) {
    console.warn('[AuthService] Mandatory cloud sync notice:', err);
    queuePendingCloudSync(payload);
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingCloudSyncQueue().catch(() => {});
    syncTenantsFromCloud().catch(() => {});
  });
}

export function saveRegisteredTenant(tenant) {
  if (!tenant) return;
  const existing = getRegisteredTenants(true);
  if (tenant.slug) registeredSlugsSet.add(tenant.slug);
  if (tenant.doctorEmail) registeredEmailsSet.add(tenant.doctorEmail.toLowerCase());
  if (tenant.phone) registeredPhonesSet.add(tenant.phone.replace(/\D/g, ''));

  const idx = existing.findIndex(t => t.id === tenant.id || t.slug === tenant.slug);
  if (idx >= 0) {
    existing[idx] = tenant;
  } else {
    existing.push(tenant);
  }
  memoryTenantsCache = existing;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_TENANTS_KEY, JSON.stringify(memoryTenantsCache));
    } catch (err) {
      console.warn('[AuthService] Failed to save registered tenants:', err);
    }
  }

  // Cross-tab broadcast
  broadcastTenantUpdate('REGISTER_TENANT', tenant);

  // Background Cloud Sync to Vercel Serverless Sync API & Supabase
  try {
    if (typeof fetch !== 'undefined') {
      safeFetchSyncTenants('/api/sync-tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant })
      }).catch(apiErr => console.warn('[AuthService] /api/sync-tenants sync note:', apiErr));
    }
    if (isSupabaseConfigured()) {
      createClinicInDb(tenant).catch(err => console.warn('Supabase tenant creation sync note:', err));
    }
  } catch (syncErr) {
    console.warn('[AuthService] Cloud sync trigger error:', syncErr);
  }
}

/**
 * Permanently deletes a registered clinic from persistent storage and cleans up associated users
 * @param {string} clinicIdOrSlug
 * @returns {boolean}
 */
export function deleteRegisteredTenant(clinicIdOrSlug) {
  if (!clinicIdOrSlug) return false;
  const clean = String(clinicIdOrSlug).trim();
  const existing = getRegisteredTenants();

  const target = existing.find(t => t.id === clean || t.slug === clean);
  const targetId = target?.id || clean;
  const targetSlug = target?.slug || clean;

  memoryTenantsCache = existing.filter(t => t.id !== targetId && t.slug !== targetSlug);
  registeredSlugsSet.delete(targetSlug);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_TENANTS_KEY, JSON.stringify(memoryTenantsCache));
    } catch (err) {
      console.warn('[AuthService] Failed to persist tenant deletion:', err);
    }
  }

  // Also clean up users registered specifically for this clinic
  const users = getRegisteredUsers();
  const filteredUsers = users.filter(u => {
    const isThisClinic = u.clinicId === targetId || u.clinicSlug === targetSlug || 
      (Array.isArray(u.allowedClinics) && u.allowedClinics.length === 1 && u.allowedClinics[0] === targetSlug);
    // Never delete super admin accounts
    if (u.role === 'super_admin' || u.isSuperAdmin) return true;
    return !isThisClinic;
  });

  memoryUsersCache = filteredUsers;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(filteredUsers));
    } catch (err) {
      console.warn('[AuthService] Failed to persist filtered users:', err);
    }
  }

  // Broadcast deletion to all open tabs
  broadcastTenantUpdate('DELETE_TENANT', { id: targetId, slug: targetSlug });

  // Cloud Sync to Vercel Serverless Sync API & Supabase
  try {
    if (typeof fetch !== 'undefined') {
      safeFetchSyncTenants('/api/sync-tenants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, slug: targetSlug })
      }).catch(apiErr => console.warn('[AuthService] /api/sync-tenants delete note:', apiErr));
    }
    if (isSupabaseConfigured()) {
      deleteClinicFromDb(targetId).catch(err => console.warn('Supabase tenant deletion sync note:', err));
    }
  } catch (syncErr) {
    console.warn('[AuthService] Cloud delete sync trigger error:', syncErr);
  }

  return true;
}

/**
 * Updates a clinic's subscription status (active, suspended, pending_approval, past_due)
 * @param {string} clinicIdOrSlug
 * @param {'active'|'suspended'|'pending_approval'|'past_due'} status
 * @param {string} [reason]
 * @returns {Object|null}
 */
export function updateClinicSubscriptionStatus(clinicIdOrSlug, status, reason = '') {
  if (!clinicIdOrSlug) return null;
  const existing = getRegisteredTenants();
  let updatedTenant = null;
  memoryTenantsCache = existing.map(t => {
    if (t.id === clinicIdOrSlug || t.slug === clinicIdOrSlug) {
      updatedTenant = {
        ...t,
        subscriptionStatus: status,
        suspensionReason: status === 'suspended' ? (reason || 'عدم سداد الاشتراك الدوري') : undefined,
        statusUpdatedAt: new Date().toISOString()
      };
      return updatedTenant;
    }
    return t;
  });

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_TENANTS_KEY, JSON.stringify(memoryTenantsCache));
    } catch (err) {
      console.warn('[AuthService] Failed to persist subscription status:', err);
    }
  }

  // If approved and activated, also ensure any doctor accounts for this clinic are active
  if (status === 'active' && updatedTenant) {
    const users = getRegisteredUsers();
    let usersChanged = false;
    const updatedUsers = users.map(u => {
      if ((u.clinicId === updatedTenant.id || u.clinicSlug === updatedTenant.slug) && u.status !== 'active') {
        usersChanged = true;
        return { ...u, status: 'active', updatedAt: new Date().toISOString() };
      }
      return u;
    });
    if (usersChanged) {
      memoryUsersCache = updatedUsers;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedUsers));
        } catch (err) {
          console.warn('[AuthService] Failed to persist activated users:', err);
        }
      }
    }
  }

  if (updatedTenant) {
    broadcastTenantUpdate('UPDATE_TENANT_STATUS', { id: clinicIdOrSlug, status, reason, tenant: updatedTenant });

    // Cloud Sync update
    if (typeof fetch !== 'undefined') {
      try {
        safeFetchSyncTenants('/api/sync-tenants', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: updatedTenant.id,
            slug: updatedTenant.slug,
            status,
            reason,
            branding: updatedTenant.branding,
            quotas: updatedTenant.quotas
          })
        }).catch(apiErr => console.warn('[AuthService] /api/sync-tenants PUT note:', apiErr));
      } catch (fetchErr) {
        console.warn('[AuthService] /api/sync-tenants request error:', fetchErr);
      }
    }
  }

  return updatedTenant;
}

/**
 * Approves and activates a pending clinic
 * @param {string} clinicIdOrSlug
 */
export function approveClinic(clinicIdOrSlug) {
  return updateClinicSubscriptionStatus(clinicIdOrSlug, 'active');
}

/**
 * Suspends a clinic for non-payment or administrative lock
 * @param {string} clinicIdOrSlug
 * @param {string} [reason]
 */
export function suspendClinic(clinicIdOrSlug, reason = 'عدم سداد الاشتراك الدوري') {
  return updateClinicSubscriptionStatus(clinicIdOrSlug, 'suspended', reason);
}

/**
 * Retrieves all registered users (doctors and staff)
 */
export function getRegisteredUsers(forceRefresh = true) {
  if (!forceRefresh && memoryUsersCache && memoryUsersCache.length > 0) return memoryUsersCache;
  if (typeof localStorage === 'undefined') return memoryUsersCache || [];
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    memoryUsersCache = list.filter(u => !isDemoOrCorruptedUser(u));
    if (memoryUsersCache.length !== list.length) {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(memoryUsersCache));
    }
    memoryUsersCache.forEach(u => {
      if (u.email) registeredEmailsSet.add(u.email.toLowerCase());
      if (u.phone) registeredPhonesSet.add(u.phone.replace(/\D/g, ''));
    });
    return memoryUsersCache;
  } catch (err) {
    console.warn('Failed to load registered users:', err);
    return memoryUsersCache || [];
  }
}

/**
 * Saves or updates a registered user
 */
export function saveRegisteredUser(user) {
  if (!user) return;
  // Ensure superadmin never gets persisted without a password to avoid auth lockouts
  if (user.role === 'super_admin' || user.isSuperAdmin) {
    const defaultSecret = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPER_ADMIN_SECRET) || 'cf-superadmin-sec-2026-x9';
    user.password = user.password || defaultSecret;
  }
  const existing = getRegisteredUsers(true);
  if (user.email) registeredEmailsSet.add(user.email.toLowerCase());
  if (user.phone) registeredPhonesSet.add(user.phone.replace(/\D/g, ''));

  // 1. Primary match strictly by user ID
  let idx = existing.findIndex(u => u.id === user.id);

  // 2. If no ID match, only match by exact email/phone if it's within the SAME role and SAME clinic
  if (idx < 0) {
    const cleanPhone = (user.phone || '').replace(/\D/g, '');
    idx = existing.findIndex(u => {
      const uPhone = (u.phone || '').replace(/\D/g, '');
      const sameRole = u.role === user.role;
      const sameClinic = u.clinicSlug === user.clinicSlug || u.clinicId === user.clinicId;
      const emailMatches = user.email && u.email && u.email.toLowerCase() === user.email.toLowerCase();
      const phoneMatches = cleanPhone && uPhone && cleanPhone === uPhone;
      return (emailMatches || phoneMatches) && sameRole && sameClinic;
    });
  }

  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...user };
  } else {
    existing.push(user);
  }
  memoryUsersCache = existing;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(memoryUsersCache));
    } catch (err) {
      console.warn('[AuthService] Failed to persist registered user:', err);
    }
  }

  // Cross-tab broadcast for real-time reactivity
  broadcastTenantUpdate('REGISTER_USER', user);

  // Background Cloud Sync to Vercel Serverless Sync API & Supabase
  try {
    if (typeof fetch !== 'undefined' && user) {
      safeFetchSyncTenants('/api/sync-tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user })
      }).catch(apiErr => console.warn('[AuthService] /api/sync-tenants user sync note:', apiErr));
    }
  } catch (syncErr) {
    console.warn('[AuthService] User cloud sync trigger error:', syncErr);
  }
}


/**
 * Removes a registered user from auth registry
 * Protected against cross-tenant or doctor account deletion
 */
export function deleteRegisteredUser(userIdOrPhone, clinicSlugOrId = null) {
  if (!userIdOrPhone) return;
  const clean = String(userIdOrPhone).trim();
  const cleanDigits = clean.replace(/\D/g, '');
  const existing = getRegisteredUsers();
  const filtered = existing.filter(u => {
    // If clinic scope provided, do not touch accounts belonging to another clinic
    if (clinicSlugOrId && (u.clinicSlug || u.clinicId)) {
      const cleanScope = String(clinicSlugOrId).trim().replace(/^tenant-/, '');
      const uSlug = (u.clinicSlug || '').replace(/^tenant-/, '');
      const uId = (u.clinicId || '').replace(/^tenant-/, '');
      const belongsToClinic = 
        u.clinicSlug === clinicSlugOrId || 
        u.clinicId === clinicSlugOrId || 
        (uSlug && uSlug === cleanScope) || 
        (uId && uId === cleanScope);
      if (!belongsToClinic) {
        return true;
      }
    }
    // Delete by exact user ID
    if (u.id === clean) return false;
    // For staff members only: allow deleting by phone/email to keep auth registry in sync
    // NEVER delete a doctor or super_admin account via phone/email matching
    if (u.role !== 'doctor' && u.role !== 'super_admin' && !u.isClinicOwner) {
      if (u.phone === clean) return false;
      if (cleanDigits && cleanDigits.length >= 7 && u.phone && u.phone.replace(/\D/g, '') === cleanDigits) return false;
      if (clean.includes('@') && u.email && u.email.toLowerCase() === clean.toLowerCase()) return false;
    }
    return true;
  });
  memoryUsersCache = filtered;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn('[AuthService] Failed to persist user deletion:', err);
    }
  }
}

/**
 * Updates a staff account active/inactive status
 */
export function updateStaffAccountStatus(staffIdOrPhone, status) {
  if (!staffIdOrPhone) return;
  const clean = String(staffIdOrPhone).trim();
  const cleanDigits = clean.replace(/\D/g, '');
  const existing = getRegisteredUsers();
  memoryUsersCache = existing.map(u => {
    const matchesId = u.id === clean;
    const matchesPhone = u.phone === clean || (cleanDigits && u.phone && u.phone.replace(/\D/g, '') === cleanDigits);
    const matchesEmail = clean.includes('@') && u.email && u.email.toLowerCase() === clean.toLowerCase();
    if (matchesId || matchesPhone || matchesEmail) {
      return { ...u, status };
    }
    return u;
  });
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(memoryUsersCache));
    } catch (err) {
      console.warn('[AuthService] Failed to persist staff status:', err);
    }
  }
}

/**
 * Returns all platform users (doctors, clinic owners, staff, superadmins)
 * Merges demo/built-in accounts + all registered accounts + clinic owners
 * @returns {Array<Object>}
 */
export function getAllPlatformUsers() {
  const registered = getRegisteredUsers(true);
  const tenants = getRegisteredTenants(true);

  const defaultUsers = [
    {
      id: 'user-superadmin-master',
      name: 'مدير المنصة العام (Super Admin)',
      email: 'superadmin@clinicflow.com',
      phone: '01000000000',
      role: 'super_admin',
      isSuperAdmin: true,
      jobTitle: 'مدير عام المنصة والسحابة السريرية',
      clinicSlug: '*',
      clinicName: 'إدارة المنصة المركزية (Control Plane)',
      status: 'active',
      authProvider: 'password',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ];

  const clinicLookup = new Map();
  tenants.forEach(t => {
    if (t.slug) clinicLookup.set(t.slug, t.name || t.slug);
    if (t.id) clinicLookup.set(t.id, t.name || t.slug);
  });

  const userMap = new Map();
  defaultUsers.forEach(u => userMap.set((u.email || u.id).toLowerCase(), u));

  registered.forEach(u => {
    const key = (u.email || u.id || '').toLowerCase();
    const existing = userMap.get(key) || {};
    const resolvedClinicSlug = u.clinicSlug || existing.clinicSlug || '';
    const resolvedClinicName = u.clinicName || (resolvedClinicSlug ? clinicLookup.get(resolvedClinicSlug) : '') || existing.clinicName || 'عيادة خاصة';
    userMap.set(key, {
      ...existing,
      ...u,
      clinicSlug: resolvedClinicSlug,
      clinicName: resolvedClinicName,
      status: u.status || existing.status || 'active'
    });
  });

  // Include active session user from localStorage if present
  if (typeof localStorage !== 'undefined') {
    try {
      const activeAuthStr = localStorage.getItem('clinicflow_auth_user');
      if (activeAuthStr) {
        const authUser = JSON.parse(activeAuthStr);
        if (authUser && (authUser.email || authUser.id)) {
          const key = (authUser.email || authUser.id).toLowerCase();
          const existing = userMap.get(key) || {};
          const resolvedClinicSlug = authUser.clinicSlug || existing.clinicSlug || '';
          const resolvedClinicName = authUser.clinicName || (resolvedClinicSlug ? clinicLookup.get(resolvedClinicSlug) : '') || existing.clinicName || (authUser.name ? `عيادة ${authUser.name}` : 'عيادة خاصة');
          userMap.set(key, {
            ...existing,
            ...authUser,
            clinicSlug: resolvedClinicSlug,
            clinicName: resolvedClinicName,
            status: authUser.status || existing.status || 'active'
          });
        }
      }
    } catch (err) {
      console.warn('[AuthService] Failed to read active auth user in getAllPlatformUsers:', err);
    }
  }

  // Guarantee every tenant has its primary doctor owner account listed
  tenants.forEach(t => {
    const docEmail = t.doctorEmail || (t.slug ? `${t.slug.replace(/^dr-?/, '')}@clinicflow.com` : null);
    if (docEmail) {
      const key = docEmail.toLowerCase();
      if (!userMap.has(key)) {
        userMap.set(key, {
          id: `doc-${t.id || t.slug}`,
          name: t.doctorName || t.name,
          email: docEmail,
          phone: t.phone || '',
          role: 'doctor',
          isClinicOwner: true,
          jobTitle: t.specialty || 'المدير الطبي واستشاري العيادة',
          clinicSlug: t.slug,
          clinicId: t.id,
          clinicName: t.name || t.slug,
          status: t.subscriptionStatus === 'suspended' ? 'suspended' : 'active',
          authProvider: 'password',
          createdAt: t.createdAt || new Date().toISOString()
        });
      }
    }
  });

  // Also discover any staff members saved under clinic-scoped storage (clinicflow_data_*)
  if (typeof localStorage !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('clinicflow_data_')) {
          const slug = k.replace('clinicflow_data_', '');
          const dataStr = localStorage.getItem(k);
          if (dataStr) {
            const parsed = JSON.parse(dataStr);
            if (Array.isArray(parsed.staffMembers)) {
              parsed.staffMembers.forEach(sm => {
                const staffKey = (sm.email || sm.phone || sm.id || '').toLowerCase();
                if (staffKey && !userMap.has(staffKey)) {
                  userMap.set(staffKey, {
                    id: sm.id || `staff-${Date.now()}-${Math.random()}`,
                    name: sm.name,
                    email: sm.email || '',
                    phone: sm.phone || '',
                    role: sm.role || 'staff',
                    jobTitle: sm.jobTitle || (sm.role === 'nurse' ? 'تمريض' : sm.role === 'accountant' ? 'محاسب' : 'سكرتارية واستقبال'),
                    clinicSlug: slug,
                    clinicName: clinicLookup.get(slug) || slug,
                    status: sm.status || 'active',
                    authProvider: 'password',
                    createdAt: sm.createdAt || new Date().toISOString()
                  });
                }
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[AuthService] Failed to scan local data keys for staff:', err);
    }
  }

  return Array.from(userMap.values());
}

/**
 * Updates a user account's profile details
 * @param {string} userId
 * @param {Object} updates
 */
export function updateUserAccount(userId, updates = {}) {
  if (!userId) return null;
  const existing = getRegisteredUsers();
  const allUsers = getAllPlatformUsers();
  const targetUser = allUsers.find(u => u.id === userId || u.email === userId);
  if (!targetUser) return null;

  const updatedUser = { ...targetUser, ...updates };

  const idx = existing.findIndex(u => u.id === targetUser.id || (u.email && u.email.toLowerCase() === targetUser.email.toLowerCase()));
  if (idx >= 0) {
    existing[idx] = updatedUser;
  } else {
    existing.push(updatedUser);
  }

  memoryUsersCache = existing;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(existing));
    } catch (err) {
      console.warn('[AuthService] Failed to persist updated user:', err);
    }
  }

  broadcastTenantUpdate('UPDATE_USER', updatedUser);
  return updatedUser;
}

/**
 * Resets or updates a user's password
 * @param {string} userId
 * @param {string} newPassword
 */
export function resetUserPassword(userId, newPassword) {
  if (!userId || !newPassword) return false;
  return !!updateUserAccount(userId, { password: newPassword.trim() });
}

/**
 * Toggles a user's active/inactive/suspended status
 * @param {string} userId
 * @param {'active'|'inactive'|'suspended'} status
 */
export function toggleUserAccountStatus(userId, status) {
  if (!userId) return null;
  return updateUserAccount(userId, { status });
}

/**
 * Permanently deletes a user account from registry
 * @param {string} userId
 * @returns {boolean}
 */
export function deleteUserAccount(userId) {
  if (!userId) return false;
  const existing = getRegisteredUsers(true);
  const filtered = existing.filter(u => u.id !== userId && u.email?.toLowerCase() !== userId.toLowerCase());
  memoryUsersCache = filtered;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn('[AuthService] Failed to persist user deletion:', err);
    }
  }
  broadcastTenantUpdate('DELETE_USER', { id: userId });
  return true;
}

