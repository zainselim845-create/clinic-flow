/**
 * Username availability policy (reserved platform handles).
 * (Extracted from authService.js — public API re-exported by the facade.)
 */

import { getRegisteredTenants, getRegisteredUsers } from './authRegistry';
import { isDemoOrCorruptedTenant } from './auth/authValidation';

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
export function isUsernameAvailable(username, currentUserId = null, currentUserEmail = null) {
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
  if (clean === 'dr-ahmed' || clean === 'dr-sara' || isDemoOrCorruptedTenant({ slug: clean })) {
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
  const cleanEmail = (currentUserEmail || '').trim().toLowerCase();
  const registeredUsers = getRegisteredUsers();
  const takenByUser = registeredUsers.find(u => {
    if (currentUserId && (u.id === currentUserId || u.ownerId === currentUserId)) return false;
    if (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) return false;
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
    if (cleanEmail && t.doctorEmail && t.doctorEmail.toLowerCase() === cleanEmail) return false;
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
