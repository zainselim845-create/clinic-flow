/**
 * ClinicFlow Roles & Permissions Management
 * Provides centralized access control rules for Doctor/Admin and Staff roles.
 */

export const SYSTEM_PERMISSIONS = [
  {
    id: 'appointments',
    name: 'المواعيد والتقويم',
    description: 'عرض وحجز وتعديل المواعيد وتسجيل حضور ودخول المرضى',
    badgeColor: '#0071E3'
  },
  {
    id: 'patients',
    name: 'سجلات وملفات المرضى',
    description: 'عرض وإضافة وتعديل بيانات المرضى والملف السريري والملاحظات',
    badgeColor: '#10B981'
  },
  {
    id: 'invoices',
    name: 'الفوترة والتحصيلات المالية',
    description: 'إصدار الفواتير وتحصيل المدفوعات وطباعة إيصالات السداد',
    badgeColor: '#8B5CF6'
  },
  {
    id: 'inventory',
    name: 'المخزون والمستلزمات الطبية',
    description: 'متابعة أرصدة المواد والمستهلكات وتسجيل الاستهلاك والتوريد',
    badgeColor: '#F59E0B'
  },
  {
    id: 'sms',
    name: 'إرسال رسائل SMS والحملات',
    description: 'إرسال تذكيرات المواعيد واستدعاء المتابعة ورسائل الـ SMS',
    badgeColor: '#0284C7'
  },
  {
    id: 'labs',
    name: 'المعامل والتركيبات الطبية',
    description: 'متابعة أوامر المعامل والتركيبات وحالات التسليم',
    badgeColor: '#EC4899'
  }
];

export const ROUTE_PERMISSION_MAP = {
  '/appointments': 'appointments',
  '/patients': 'patients',
  '/invoices': 'invoices',
  '/inventory': 'inventory',
  '/labs': 'labs',
  '/doctor-agent': 'doctor_only',
  '/settings': 'doctor_only',
  '/notifications': null // available to all authenticated users
};

/**
 * Checks if a user has a specific permission
 * @param {Object} user - User object from AuthContext
 * @param {string} permissionKey - Permission key to verify
 * @returns {boolean}
 */
export function hasPermission(user, permissionKey) {
  if (!user) return false;

  const role = user.role || 'staff';
  // Doctor/Admin has full system-wide permissions
  if (role === 'doctor' || role === 'admin') {
    return true;
  }

  // Doctor-only features cannot be accessed by staff
  if (permissionKey === 'doctor_only') {
    return false;
  }

  // If no specific permission requested, grant access to authenticated staff
  if (!permissionKey) {
    return true;
  }

  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return permissions.includes(permissionKey);
}

/**
 * Checks if a user can access a specific route
 * @param {Object} user - User object from AuthContext
 * @param {string} pathname - Current route path
 * @returns {boolean}
 */
export function canAccessRoute(user, pathname) {
  if (!user) return false;
  
  const role = user.role || 'staff';
  if (role === 'doctor' || role === 'admin') return true;

  const cleanPath = pathname.split('?')[0].replace(/\/$/, '') || '/';
  if (cleanPath === '/' || cleanPath === '/dashboard') return true;

  const requiredPerm = ROUTE_PERMISSION_MAP[cleanPath];
  if (requiredPerm === undefined) return true; // Unmapped routes are accessible

  return hasPermission(user, requiredPerm);
}

/**
 * Checks if a user has authority to switch between tenants/clinics.
 * In enterprise SaaS architecture, tenant switching is strictly forbidden
 * for single-clinic doctors and staff. Only permitted for:
 *  (a) Multi-clinic owners / doctors with multiple allowed clinics
 *  (b) Super Admins (role === 'super_admin', isSuperAdmin === true, or in /super-admin)
 * 
 * If isDedicatedDomain is true, returns false unless explicitly on /super-admin.
 * 
 * @param {Object} user - User object from AuthContext
 * @param {string} pathname - Current route path
 * @param {boolean} isDedicatedDomain - Whether app is running on dedicated domain/subdomain
 * @returns {boolean}
 */
export function canSwitchTenants(user, pathname = '', isDedicatedDomain = false) {
  if (typeof pathname === 'string' && pathname.startsWith('/super-admin')) return true;
  const dedicated = isDedicatedDomain || user?.isDedicatedDomain;
  if (dedicated) return false;
  if (!user) return false;
  if (user.role === 'super_admin' || user.isSuperAdmin === true) return true;
  if (user.role === 'multi_clinic_owner') return true;
  if (Array.isArray(user.allowedClinics) && user.allowedClinics.length > 1) return true;
  if (Array.isArray(user.tenantMemberships) && user.tenantMemberships.length > 1) return true;
  return false;
}

/**
 * Returns the list of clinics a user is authorized to access.
 * Single-clinic doctors and receptionists only get their specific clinic.
 * 
 * @param {Object} user - User object from AuthContext
 * @param {Array} allTenants - Full catalog of registered tenants
 * @param {boolean} isDedicatedDomain - Whether app is running on dedicated domain/subdomain
 * @returns {Array}
 */
export function getUserAllowedClinics(user, allTenants = [], isDedicatedDomain = false) {
  if (!Array.isArray(allTenants) || allTenants.length === 0) return [];

  const isSuperAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/super-admin');

  // If on a dedicated domain and not in super-admin portal, restrict catalog strictly to current clinic
  if (isDedicatedDomain && !isSuperAdminRoute) {
    const userClinicSlug = user?.clinicSlug || user?.clinicId;
    if (userClinicSlug) {
      const matched = allTenants.filter(t => t.slug === userClinicSlug || t.id === userClinicSlug);
      if (matched.length > 0) return matched;
    }
    return allTenants.slice(0, 1);
  }

  if (!user) return allTenants.slice(0, 1);

  // Super Admin has access to all tenants across the entire platform
  if (user.role === 'super_admin' || user.isSuperAdmin === true || isSuperAdminRoute) {
    return allTenants;
  }

  // Explicit allowed clinics list (array of slugs or ids)
  if (Array.isArray(user.allowedClinics) && user.allowedClinics.length > 0) {
    if (user.allowedClinics.includes('*')) return allTenants;
    const filtered = allTenants.filter(t => user.allowedClinics.includes(t.slug) || user.allowedClinics.includes(t.id));
    return filtered.length > 0 ? filtered : allTenants.slice(0, 1);
  }

  // Database tenant memberships
  if (Array.isArray(user.tenantMemberships) && user.tenantMemberships.length > 0) {
    const allowedIds = user.tenantMemberships.map(m => (typeof m === 'string' ? m : (m.clinic_id || m.clinicId || m.slug)));
    const filtered = allTenants.filter(t => allowedIds.includes(t.id) || allowedIds.includes(t.slug));
    return filtered.length > 0 ? filtered : allTenants.slice(0, 1);
  }

  // Bound to single clinic slug or ID
  const userClinicSlug = user.clinicSlug || user.clinicId;
  if (userClinicSlug) {
    const matched = allTenants.filter(t => t.slug === userClinicSlug || t.id === userClinicSlug);
    if (matched.length > 0) return matched;
  }

  // Default fallback: single locked active clinic only
  return allTenants.slice(0, 1);
}

