/**
 * ClinicFlow Authentication & Tenant Provisioning Service
 * Manages doctor onboarding, clinic creation, staff account provisioning,
 * and high-speed O(1) indexed authentication for enterprise multi-tenancy.
 */

import { CLINIC_SPECIALTIES } from '../data/specialtiesData';
import { formatSenderId } from './smsService';
import { isSupabaseConfigured } from '../lib/supabase';
import { createClinicInDb, deleteClinicFromDb } from './clinicsService';

const REGISTERED_TENANTS_KEY = 'clinicflow_registered_tenants';
const REGISTERED_USERS_KEY = 'clinicflow_registered_users';

export function broadcastTenantUpdate(type, payload) {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel('clinicflow_tenants_sync');
      channel.postMessage({ type, payload, timestamp: Date.now() });
      channel.close();
    } catch (err) {
      console.warn('[AuthService] BroadcastChannel update error:', err);
    }
  }
}

/**
 * Creates a URL-friendly slug from Arabic/English name
 */
export function slugifyClinic(name, specialty = '') {
  if (!name) return 'clinic-' + Date.now();
  
  // Clean special characters
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0621-\u064A\s-]/g, '')
    .replace(/\s+/g, '-');

  // If pure Arabic or special, generate hybrid slug
  if (!clean || clean.length < 2 || !/[a-zA-Z0-9]/.test(clean)) {
    const specTag = specialty.includes('جلدية') ? 'derma' : specialty.includes('أسنان') ? 'dental' : 'clinic';
    return `${specTag}-${Date.now().toString(36)}`;
  }

  return clean;
}

let memoryTenantsCache = null;
let memoryUsersCache = null;
const registeredSlugsSet = new Set();
const registeredEmailsSet = new Set();
const registeredPhonesSet = new Set();

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
export function getRegisteredTenants() {
  if (memoryTenantsCache) return memoryTenantsCache;
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REGISTERED_TENANTS_KEY);
    memoryTenantsCache = raw ? JSON.parse(raw) : [];
    memoryTenantsCache.forEach(t => {
      if (t.slug) registeredSlugsSet.add(t.slug);
      if (t.doctorEmail) registeredEmailsSet.add(t.doctorEmail.toLowerCase());
      if (t.phone) registeredPhonesSet.add(t.phone.replace(/\D/g, ''));
    });
    return memoryTenantsCache;
  } catch (err) {
    console.warn('Failed to load registered tenants:', err);
    return [];
  }
}

/**
 * Saves a new clinic tenant to persistent storage
 */
export function saveRegisteredTenant(tenant) {
  if (!tenant) return;
  const existing = getRegisteredTenants();
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

  // Background Cloud Sync if Supabase is connected
  try {
    if (isSupabaseConfigured()) {
      createClinicInDb(tenant).catch(err => console.warn('Supabase tenant creation sync note:', err));
    }
  } catch (syncErr) {
    console.warn('[AuthService] Supabase sync trigger error:', syncErr);
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

  // Cloud Supabase sync if connected
  try {
    if (isSupabaseConfigured()) {
      deleteClinicFromDb(targetId).catch(err => console.warn('Supabase tenant deletion sync note:', err));
    }
  } catch (syncErr) {
    console.warn('[AuthService] Supabase delete sync trigger error:', syncErr);
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
export function getRegisteredUsers() {
  if (memoryUsersCache) return memoryUsersCache;
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    memoryUsersCache = raw ? JSON.parse(raw) : [];
    memoryUsersCache.forEach(u => {
      if (u.email) registeredEmailsSet.add(u.email.toLowerCase());
      if (u.phone) registeredPhonesSet.add(u.phone.replace(/\D/g, ''));
    });
    return memoryUsersCache;
  } catch (err) {
    console.warn('Failed to load registered users:', err);
    return [];
  }
}

/**
 * Saves or updates a registered user
 */
export function saveRegisteredUser(user) {
  if (!user) return;
  const existing = getRegisteredUsers();
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
    if (clinicSlugOrId && u.clinicSlug && u.clinicId && u.clinicSlug !== clinicSlugOrId && u.clinicId !== clinicSlugOrId) {
      return true;
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
  const registered = getRegisteredUsers();
  const tenants = getRegisteredTenants();

  const defaultUsers = [
    {
      id: 'doc-master',
      name: 'د. أحمد الشريف',
      email: 'doctor@clinicflow.com',
      phone: '01006285031',
      role: 'doctor',
      isClinicOwner: true,
      jobTitle: 'المدير الطبي / استشاري طب وجراحة وتجميل الأسنان',
      clinicSlug: 'dr-ahmed',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      clinicName: 'مركز النخبة لطب وجراحة الأسنان',
      status: 'active',
      authProvider: 'password',
      createdAt: '2026-01-10T08:00:00.000Z'
    },
    {
      id: 'doc-sara-master',
      name: 'د. سارة محمود',
      email: 'sara.clinic@clinicflow.com',
      phone: '01123456780',
      role: 'doctor',
      isClinicOwner: true,
      jobTitle: 'استشاري الأمراض الجلدية وتجميل الليزر',
      clinicSlug: 'dr-sara',
      clinicId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      clinicName: 'عيادة د. سارة للجلدية والتجميل والليزر',
      status: 'active',
      authProvider: 'password',
      createdAt: '2026-02-01T09:30:00.000Z'
    },
    {
      id: 'user-multi-clinic-owner',
      name: 'د. شريف العوضي',
      email: 'owner@clinicflow.com',
      phone: '01200000001',
      role: 'multi_clinic_owner',
      isClinicOwner: true,
      jobTitle: 'مالك ومستثمر طبي — مجمع عيادات كلينيك فلو',
      clinicSlug: 'dr-ahmed',
      clinicName: 'مجمع عيادات كلينيك فلو (فروع متعددة)',
      status: 'active',
      authProvider: 'password',
      createdAt: '2026-02-15T11:00:00.000Z'
    },
    {
      id: 'staff-reception-master',
      name: 'سارة كمال',
      email: 'reception@clinicflow.com',
      phone: '01012345678',
      role: 'staff',
      jobTitle: 'سكرتارية واستقبال العيادة',
      clinicSlug: 'dr-ahmed',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      clinicName: 'مركز النخبة لطب وجراحة الأسنان',
      status: 'active',
      authProvider: 'password',
      createdAt: '2026-01-12T10:00:00.000Z'
    },
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
    },
    {
      id: 'doc-zainselim-master',
      name: 'د. zain selim',
      email: 'zainselim845@gmail.com',
      phone: '01006285031',
      role: 'doctor',
      isClinicOwner: true,
      jobTitle: 'المدير الطبي / استشاري العيادة (Verified)',
      clinicSlug: 'dr-zainselim845',
      clinicId: 'clinic-zainselim845',
      clinicName: 'عيادة د. zain selim',
      status: 'active',
      authProvider: 'google',
      createdAt: '2026-01-15T10:00:00.000Z'
    }
  ];

  const clinicLookup = new Map();
  clinicLookup.set('dr-ahmed', 'مركز النخبة لطب وجراحة الأسنان');
  clinicLookup.set('dr-sara', 'عيادة د. سارة للجلدية والتجميل والليزر');
  clinicLookup.set('dr-zainselim845', 'عيادة د. zain selim');
  tenants.forEach(t => {
    if (t.slug) clinicLookup.set(t.slug, t.name || t.slug);
    if (t.id) clinicLookup.set(t.id, t.name || t.slug);
  });

  const userMap = new Map();
  defaultUsers.forEach(u => userMap.set((u.email || u.id).toLowerCase(), u));

  registered.forEach(u => {
    const key = (u.email || u.id || '').toLowerCase();
    const existing = userMap.get(key) || {};
    const resolvedClinicSlug = u.clinicSlug || existing.clinicSlug || 'dr-ahmed';
    const resolvedClinicName = u.clinicName || clinicLookup.get(resolvedClinicSlug) || existing.clinicName || 'عيادة خاصة';
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
          const resolvedClinicSlug = authUser.clinicSlug || existing.clinicSlug || 'dr-ahmed';
          const resolvedClinicName = authUser.clinicName || clinicLookup.get(resolvedClinicSlug) || existing.clinicName || (authUser.name ? `عيادة ${authUser.name}` : 'عيادة خاصة');
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
  const existing = getRegisteredUsers();
  const filtered = existing.filter(u => u.id !== userId && u.email?.toLowerCase() !== userId.toLowerCase());
  memoryUsersCache = filtered;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn('[AuthService] Failed to persist user deletion:', err);
    }
  }
  return true;
}

export const RESERVED_USERNAMES = new Set([
  'admin', 'super-admin', 'superadmin', 'saas-admin', 'administrator', 
  'root', 'api', 'support', 'booking', 'manage-booking', 'dashboard', 
  'settings', 'login', 'onboarding', 'auth', 'staff', 'doctor', 
  'clinic', 'system', 'clinicflow', 'help', 'app', 'portal', 'account'
]);

/**
 * Validates if a chosen username/handle is available for registration
 * @param {string} username - Chosen username or handle
 * @param {string} [currentUserId] - ID of current user (to permit keeping their own handle)
 * @returns {{ available: boolean, reason?: string, suggestions?: string[] }}
 */
export function isUsernameAvailable(username, currentUserId = null) {
  if (!username) {
    return {
      available: false,
      reason: 'يرجى إدخال اسم مستخدم للعيادة.'
    };
  }

  const clean = username.trim().toLowerCase().replace(/^@/, '');

  if (clean.length < 3) {
    return {
      available: false,
      reason: 'اسم المستخدم قصير جداً. يجب أن يتكون من 3 أحرف بالإنجليزية على الأقل.'
    };
  }

  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$|^[a-z0-9]{3,}$/.test(clean)) {
    return {
      available: false,
      reason: 'يجب أن يحتوي اسم المستخدم على أحرف إنجليزية وأرقام وعلامات (-) أو (_) فقط.'
    };
  }

  if (RESERVED_USERNAMES.has(clean)) {
    return {
      available: false,
      reason: 'اسم المستخدم هذا محجوز لنظام ClinicFlow، يرجى اختيار اسم مستخدم آخر.',
      suggestions: [
        `dr-${clean}`,
        `${clean}-clinic`,
        `${clean}-${Math.floor(10 + Math.random() * 89)}`
      ]
    };
  }

  // Check demo clinics
  if (clean === 'dr-ahmed' || clean === 'dr-sara') {
    return {
      available: false,
      reason: 'اسم المستخدم هذا محجوز مسبقاً لعيادة أخرى، يرجى تغييره واختيار اسم متاح.',
      suggestions: [
        `dr-${clean.replace(/^dr-?/, '')}-care`,
        `${clean}-clinic`,
        `the-${clean}`
      ]
    };
  }

  // Check registered users
  const registeredUsers = getRegisteredUsers();
  const takenByUser = registeredUsers.find(u => {
    if (currentUserId && (u.id === currentUserId || u.ownerId === currentUserId)) return false;
    const uUsername = (u.username || '').toLowerCase().replace(/^@/, '');
    const uSlug = (u.clinicSlug || '').toLowerCase();
    return uUsername === clean || uSlug === clean;
  });

  if (takenByUser) {
    return {
      available: false,
      reason: 'اسم المستخدم هذا مستخدم بالفعل من قِبل طبيب أو عيادة أخرى، يرجى تغييره واختيار اسم متاح.',
      suggestions: [
        `dr-${clean}`,
        `${clean}-clinic`,
        `${clean}-${Math.floor(10 + Math.random() * 89)}`
      ]
    };
  }

  // Check registered clinics / tenants
  const registeredTenants = getRegisteredTenants();
  const takenByTenant = registeredTenants.find(t => {
    if (currentUserId && (t.ownerId === currentUserId || t.id === `clinic-${currentUserId}`)) return false;
    const tSlug = (t.slug || '').toLowerCase();
    const tUsername = (t.username || '').toLowerCase().replace(/^@/, '');
    return tSlug === clean || tUsername === clean;
  });

  if (takenByTenant) {
    return {
      available: false,
      reason: 'اسم المستخدم هذا محجوز مسبقاً لعيادة مسجلة، يرجى تغييره واختيار اسم متاح.',
      suggestions: [
        `dr-${clean}`,
        `${clean}-clinic`,
        `${clean}-${Math.floor(10 + Math.random() * 89)}`
      ]
    };
  }

  return {
    available: true,
    reason: 'اسم المستخدم متاح ومناسب لعيادتك'
  };
}

/**
 * Registers a new Doctor and creates their Clinic
 * @param {Object} params
 * @param {string} params.doctorName - Doctor's full name
 * @param {string} params.email - Doctor's email
 * @param {string} params.phone - Doctor's mobile phone
 * @param {string} params.password - Account password
 * @param {string} params.clinicName - Name of the clinic
 * @param {string} params.specialty - Clinic specialty
 * @param {string} [params.address] - Clinic physical address
 * @param {string} [params.customSlug] - Optional customized clinic slug
 * @returns {{ tenant: Object, user: Object }}
 */
export function registerDoctorAndClinic({
  doctorName,
  email,
  phone,
  password,
  clinicName,
  specialty = 'طب وجراحة الفم والأسنان',
  address = 'القاهرة، جمهورية مصر العربية',
  customSlug,
  senderId
}) {
  if (!doctorName?.trim()) throw new Error('يرجى إدخال اسم الطبيب بالكامل.');
  if (!email?.trim() || !email.includes('@')) throw new Error('يرجى إدخال بريد إلكتروني صالح.');
  if (!phone?.trim() || phone.replace(/\D/g, '').length < 10) throw new Error('يرجى إدخال رقم هاتف محمول صالح.');
  if (!password || password.length < 6) throw new Error('يجب ألا تقل كلمة المرور عن 6 أحرف.');
  if (!clinicName?.trim()) throw new Error('يرجى إدخال اسم العيادة.');

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim().replace(/\D/g, '');
  const cleanName = doctorName.trim();
  const cleanClinicName = clinicName.trim();

  // O(1) Uniqueness check via indexed sets
  getRegisteredUsers();
  getRegisteredTenants();
  if (registeredEmailsSet.has(cleanEmail) || registeredPhonesSet.has(cleanPhone)) {
    throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل في النظام.');
  }

  // Generate unique Tenant ID and clean Slug in O(1)
  const tenantId = `clinic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const baseSlug = customSlug?.trim() || slugifyClinic(cleanClinicName, specialty);
  let uniqueSlug = baseSlug;
  let counter = 1;
  while (registeredSlugsSet.has(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter++}`;
  }

  const isDerma = specialty.includes('جلدية') || specialty.includes('تجميل');
  const isDental = specialty.includes('أسنان') || specialty.includes('فم');

  const defaultServices = isDerma ? [
    { id: 1, name: 'كشف واستشارة جلدية', price: 400, duration: 25 },
    { id: 2, name: 'جلسة ليزر كربوني / فراكشنال', price: 900, duration: 45 },
    { id: 3, name: 'جلسة حقن بوتوكس / فيلر', price: 1800, duration: 30 },
    { id: 4, name: 'تنظيف بشرة علاجي هيدرافيشل', price: 650, duration: 40 }
  ] : isDental ? [
    { id: 1, name: 'كشف أسنان واستشارة سريرية', price: 300, duration: 20 },
    { id: 2, name: 'تنظيف جير وتلميع الأسنان', price: 500, duration: 30 },
    { id: 3, name: 'حشو كمبوزيت تجميلي ضوئي', price: 750, duration: 40 },
    { id: 4, name: 'علاج جذور وحشو عصب آلي', price: 1200, duration: 50 }
  ] : [
    { id: 1, name: 'كشف طبي واستشارة متخصصة', price: 350, duration: 20 },
    { id: 2, name: 'إعادة كشف ومتابعة', price: 150, duration: 15 },
    { id: 3, name: 'فحص سريري شامل مع تقرير', price: 600, duration: 30 }
  ];

  const newTenant = {
    id: tenantId,
    name: cleanClinicName,
    slug: uniqueSlug,
    senderId: formatSenderId(senderId || uniqueSlug, 'ClinicFlow'),
    doctorName: cleanName,
    doctorEmail: cleanEmail,
    doctorPassword: password,
    phone: cleanPhone,
    specialty,
    address,
    workingHours: {
      days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
      from: '14:00',
      to: '22:00',
      slotDuration: 30
    },
    services: defaultServices,
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    branding: {
      primaryColor: '#09090B',
      accentColor: '#10B981',
      brandTitle: cleanClinicName
    },
    quotas: {
      maxDoctors: 3,
      monthlySmsQuota: 1000,
      smsUsed: 0
    },
    createdAt: new Date().toISOString()
  };

  const doctorUser = {
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    password,
    role: 'doctor',
    isClinicOwner: true,
    jobTitle: specialty || 'المدير الطبي واستشاري العيادة',
    clinicId: tenantId,
    clinicSlug: uniqueSlug,
    allowedClinics: [uniqueSlug],
    permissions: ['*'],
    authenticatedAt: new Date().toISOString()
  };

  // Persist tenant and doctor account
  saveRegisteredTenant(newTenant);
  saveRegisteredUser(doctorUser);

  return { tenant: newTenant, user: doctorUser };
}

/**
 * Provisions a new staff member account under a specific clinic
 * @param {Object} params
 * @param {string} params.clinicId
 * @param {string} params.clinicSlug
 * @param {string} params.name
 * @param {string} params.phone
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.role - 'receptionist' | 'associate_doctor' | 'accountant' | 'assistant' | 'staff'
 * @param {string[]} [params.permissions]
 * @param {string} [params.shift]
 * @returns {Object} staffUser
 */
export function provisionStaffAccount({
  id,
  clinicId,
  clinicSlug,
  name,
  phone,
  email,
  password,
  role = 'receptionist',
  permissions,
  shift = 'مسائي (04:00 م - 10:00 م)'
}) {
  if (!name?.trim() || !phone?.trim()) {
    throw new Error('يرجى إدخال اسم ورقم هاتف الموظف.');
  }
  if (!password || password.trim().length < 4) {
    throw new Error('يرجى إدخال كلمة مرور للموظف (4 أحرف على الأقل).');
  }

  const cleanPhone = phone.trim().replace(/\D/g, '');
  const cleanEmail = (email || '').trim().toLowerCase();

  // Validate phone collision across registered users
  const existingUsers = getRegisteredUsers();
  const existingCollision = existingUsers.find(u => {
    // If it's the exact same staff member being edited (same id), that's allowed
    if (id && u.id === id) return false;
    const uPhone = (u.phone || '').replace(/\D/g, '');
    return cleanPhone && uPhone && uPhone === cleanPhone;
  });

  if (existingCollision) {
    const isDoc = existingCollision.role === 'doctor';
    throw new Error(
      isDoc
        ? `رقم الهاتف (${phone}) مسجل بالفعل كحساب طبيب مسؤول. يرجى استخدام رقم هاتف مخصص للموظف.`
        : `رقم الهاتف (${phone}) مسجل بالفعل لموظف آخر في النظام.`
    );
  }

  // Determine default permissions based on role
  let assignedPermissions = permissions;
  if (!assignedPermissions || !Array.isArray(assignedPermissions)) {
    if (role === 'accountant') {
      assignedPermissions = ['invoices'];
    } else if (role === 'associate_doctor') {
      assignedPermissions = ['appointments', 'patients', 'sms'];
    } else if (role === 'assistant') {
      assignedPermissions = ['appointments', 'patients', 'inventory'];
    } else {
      // receptionist / staff
      assignedPermissions = ['appointments', 'patients', 'sms'];
    }
  }

  const roleTitle = role === 'associate_doctor' ? 'طبيب ممارس / أخصائي مساعد' :
                    role === 'accountant' ? 'محاسب مالي للعيادة' :
                    role === 'assistant' ? 'مساعد تمريض سريري' : 'سكرتارية واستقبال العيادة';

  const staffUser = {
    id: id || `staff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    clinicId,
    clinicSlug,
    name: name.trim(),
    phone: cleanPhone,
    email: cleanEmail,
    password: password.trim(),
    role,
    roleKey: role,
    jobTitle: roleTitle,
    shift: shift || 'مسائي (04:00 م - 10:00 م)',
    status: 'active',
    permissions: assignedPermissions,
    allowedClinics: [clinicSlug],
    createdAt: new Date().toISOString().split('T')[0]
  };

  saveRegisteredUser(staffUser);
  return staffUser;
}

/**
 * Authenticates user credentials across memory and persistent storage
 * @param {string} identifier - Email or Phone
 * @param {string} password - User password
 * @param {Object} [options]
 * @returns {Object|null} user account if authenticated, or throws Error
 */
export function authenticateUser(identifier, password, _options = {}) {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  const cleanPhoneInput = cleanId.replace(/\D/g, '');

  if (!cleanId || !cleanPass) {
    throw new Error('يرجى إدخال البريد الإلكتروني أو الهاتف وكلمة المرور.');
  }

  // 1. Check registered users list (persisted doctors and staff)
  const registeredUsers = getRegisteredUsers();
  const matchedUser = registeredUsers.find(u => {
    const uEmail = (u.email || '').toLowerCase();
    const uPhone = (u.phone || '').replace(/\D/g, '');
    const uRawPhone = (u.phone || '').trim().toLowerCase();
    const uUsername = (u.username || '').toLowerCase();
    const idMatches = 
      (cleanId && cleanId === uEmail) || 
      (cleanPhoneInput && cleanPhoneInput.length >= 7 && cleanPhoneInput === uPhone) ||
      (cleanId && cleanId === uRawPhone) ||
      (cleanId && cleanId === uUsername);
    return idMatches;
  });

  if (matchedUser) {
    if (matchedUser.status === 'inactive') {
      throw new Error('هذا الحساب معطل حالياً من قِبل إدارة العيادة.');
    }
    if (matchedUser.password !== cleanPass) {
      throw new Error('كلمة المرور غير صحيحة.');
    }
    return {
      ...matchedUser,
      authenticatedAt: new Date().toISOString()
    };
  }

  // Built-in demo staff accounts removed for production security.
  // Staff must be provisioned through provisionStaffAccount().

  // 3. Check registered clinic tenant doctor credentials
  const registeredTenants = getRegisteredTenants();
  const matchedTenant = registeredTenants.find(t => {
    const tEmail = (t.doctorEmail || '').toLowerCase();
    const tPhone = (t.phone || '').replace(/\D/g, '');
    const idMatches = cleanId === tEmail || (cleanPhoneInput && cleanPhoneInput.length >= 10 && cleanPhoneInput === tPhone) || cleanId === t.slug;
    return idMatches;
  });

  if (matchedTenant) {
    const validPass = matchedTenant.doctorPassword;
    if (!validPass || cleanPass !== validPass) {
      throw new Error('كلمة المرور غير صحيحة لحساب الطبيب.');
    }
    return {
      id: `doc-${matchedTenant.id}`,
      name: matchedTenant.doctorName,
      email: matchedTenant.doctorEmail,
      phone: matchedTenant.phone,
      role: 'doctor',
      isClinicOwner: true,
      jobTitle: matchedTenant.specialty || 'المدير الطبي واستشاري العيادة',
      clinicId: matchedTenant.id,
      clinicSlug: matchedTenant.slug,
      allowedClinics: [matchedTenant.slug],
      permissions: ['*'],
      authenticatedAt: new Date().toISOString()
    };
  }

  return null;
}

/**
 * Completes clinic onboarding for a doctor (custom handle, clinic name, specialty, branding colors, team)
 */
export function completeClinicOnboarding({
  userId,
  userEmail,
  username,
  doctorName,
  clinicName,
  specialty,
  primaryColor = '#09090B',
  accentColor = '#10B981',
  teamSize = 'solo',
  phone = '',
  address = 'القاهرة، جمهورية مصر العربية',
  initialStaff = null,
  senderId
}) {
  const cleanDoctorName = (doctorName || '').trim() || 'د. طبيب العيادة';
  const cleanClinicName = (clinicName || '').trim() || `عيادة ${cleanDoctorName}`;
  const rawUser = (username || '').trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_-]/g, '');
  const cleanUsername = rawUser || slugifyClinic(cleanDoctorName);

  if (rawUser) {
    const availability = isUsernameAvailable(rawUser, userId);
    if (!availability.available) {
      throw new Error(availability.reason);
    }
  }

  const cleanPhone = (phone || '').trim().replace(/\D/g, '');
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  const cleanSpecialty = (specialty || '').trim() || 'طب وجراحة الفم والأسنان العام';

  // Load appropriate default services from CLINIC_SPECIALTIES
  const specMatch = CLINIC_SPECIALTIES.find(s => s.name === cleanSpecialty || s.id === cleanSpecialty);
  const assignedServices = specMatch?.defaultServices || [
    { id: 'srv-1', name: 'كشف واستشارة طبية تخصصية', price: '350 ج.م', duration: 25 },
    { id: 'srv-2', name: 'إعادة كشف ومتابعة', price: '150 ج.م', duration: 15 },
    { id: 'srv-3', name: 'فحص سريري كامل مع تقرير', price: '600 ج.م', duration: 30 }
  ];
  const assignedVisitTypes = specMatch?.defaultVisitTypes || [
    { name: 'كشف واستشارة أولية', value: 0, color: primaryColor },
    { name: 'إعادة كشف ومتابعة', value: 0, color: accentColor }
  ];

  const uniqueSlug = rawUser || slugifyClinic(cleanClinicName) || 'clinic-' + Date.now();

  const existingTenants = getRegisteredTenants();
  const tenantIdx = existingTenants.findIndex(t => 
    (cleanEmail && t.doctorEmail?.toLowerCase() === cleanEmail) ||
    (userId && t.ownerId === userId) ||
    t.id === `clinic-${userId}`
  );

  const tenantId = tenantIdx >= 0 ? existingTenants[tenantIdx].id : `clinic-${userId || Date.now()}`;

  const updatedTenant = {
    ...(tenantIdx >= 0 ? existingTenants[tenantIdx] : {}),
    id: tenantId,
    name: cleanClinicName,
    slug: uniqueSlug,
    senderId: formatSenderId(senderId || cleanUsername || uniqueSlug, 'ClinicFlow'),
    doctorName: cleanDoctorName,
    doctorEmail: cleanEmail,
    ownerId: userId || null,
    username: cleanUsername,
    phone: cleanPhone,
    specialty: cleanSpecialty,
    address,
    teamSize,
    isOnboardingCompleted: true,
    services: assignedServices,
    visitTypes: assignedVisitTypes,
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    branding: {
      primaryColor,
      accentColor,
      brandTitle: cleanClinicName,
      badgeText: 'العيادة التخصصية'
    },
    quotas: {
      maxDoctors: teamSize === 'large' ? 10 : teamSize === 'medium' ? 5 : 3,
      monthlySmsQuota: 1000,
      smsUsed: 0
    },
    updatedAt: new Date().toISOString()
  };

  saveRegisteredTenant(updatedTenant);

  // Update user profile
  const registeredUsers = getRegisteredUsers();
  const userIdx = registeredUsers.findIndex(u => 
    (userId && u.id === userId) || 
    (cleanEmail && u.email?.toLowerCase() === cleanEmail)
  );

  const updatedUser = {
    ...(userIdx >= 0 ? registeredUsers[userIdx] : {}),
    id: userId || `doc-${Date.now()}`,
    name: cleanDoctorName,
    username: cleanUsername,
    email: cleanEmail,
    phone: cleanPhone,
    role: 'doctor',
    isClinicOwner: true,
    jobTitle: cleanSpecialty || 'المدير الطبي واستشاري العيادة',
    clinicId: tenantId,
    clinicSlug: uniqueSlug,
    clinicName: cleanClinicName,
    allowedClinics: [uniqueSlug],
    permissions: ['*'],
    isOnboardingCompleted: true,
    needsOnboarding: false,
    authenticatedAt: new Date().toISOString()
  };

  saveRegisteredUser(updatedUser);

  // If initial staff member provided, provision account
  let provisionedStaff = null;
  if (initialStaff && initialStaff.name && initialStaff.phone) {
    try {
      provisionedStaff = provisionStaffAccount({
        clinicId: tenantId,
        clinicSlug: uniqueSlug,
        name: initialStaff.name,
        phone: initialStaff.phone,
        email: initialStaff.email || '',
        password: initialStaff.password || '1234',
        role: initialStaff.role || 'receptionist',
        permissions: initialStaff.permissions,
        shift: initialStaff.shift || 'مسائي (04:00 م - 10:00 م)'
      });
    } catch (e) {
      console.warn('Could not auto-provision initial staff:', e);
    }
  }

  // Pre-seed scoped tenant data in localStorage so AppContext immediately loads the new clinic and staff
  if (typeof localStorage !== 'undefined') {
    try {
      const scopedKey = `clinicflow_data_${uniqueSlug}`;
      const initialScopedData = {
        patients: [],
        appointments: [],
        invoices: [],
        expenses: [],
        recalls: [],
        notifications: [
          {
            id: `notif-welcome-${Date.now()}`,
            title: 'مرحباً بك في نظام عيادتك!',
            message: `تم إعداد عيادتك (${cleanClinicName}) بنجاح. يمكنك الآن إدارة المرضى والحجوزات وفريق العمل.`,
            time: 'الآن',
            read: false,
            type: 'system'
          }
        ],
        blockedSlots: [],
        staffMembers: provisionedStaff ? [provisionedStaff] : [],
        clinicInfo: updatedTenant,
        _version: 'v4_google_material_3'
      };
      localStorage.setItem(scopedKey, JSON.stringify(initialScopedData));
    } catch (err) {
      console.warn('Could not initialize scoped tenant storage:', err);
    }
  }

  return {
    tenant: updatedTenant,
    user: updatedUser,
    staff: provisionedStaff
  };
}
