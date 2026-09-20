/**
 * ClinicFlow Roles & Permissions Management
 * Provides centralized access control rules for Doctor/Admin and Staff roles.
 */

export const SYSTEM_PERMISSIONS = [
  {
    id: 'appointments',
    name: 'المواعيد والتقويم',
    description: 'عرض وحجز وتعديل المواعيد وتسجيل حضور ودخول المرضى',
    badgeColor: '#09090B'
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
  }
];

export const ROUTE_PERMISSION_MAP = {
  '/appointments': 'appointments',
  '/patients': 'patients',
  '/invoices': 'invoices',
  '/inventory': 'inventory',
  '/attendance': null,
  '/doctor-agent': 'doctor_only',
  '/labs': 'labs',
  '/sms-integration': 'admin_only',
  '/settings': 'admin_only',
  '/notifications': null // available to all authenticated users
};

/**
 * Determines if user holds a clinic management/administrative leadership role
 * In private clinic practice, the Doctor is the clinic owner & administrator with full access.
 * @param {Object} user
 * @returns {boolean}
 */
export function isAdminRole(user) {
  if (!user) return false;
  const role = user.role || 'staff';
  return ['doctor', 'admin', 'clinic_admin', 'owner', 'multi_clinic_owner', 'super_admin'].includes(role) || user.isAdmin === true || user.isSuperAdmin === true;
}

/**
 * Determines if user holds a clinical doctor role
 * @param {Object} user
 * @returns {boolean}
 */
export function isDoctorRole(user) {
  if (!user) return false;
  const role = user.role || 'staff';
  return ['doctor', 'associate_doctor', 'owner', 'clinic_admin', 'admin'].includes(role);
}

/**
 * Checks if user has permission to manage and provision staff accounts
 * @param {Object} user
 * @returns {boolean}
 */
export function canManageStaff(user) {
  return isAdminRole(user);
}

/**
 * Checks if user has permission to view financial metrics and invoices
 * @param {Object} user
 * @returns {boolean}
 */
export function canAccessFinancials(user) {
  if (isAdminRole(user)) return true;
  if (!user) return false;
  if (user.role === 'accountant') return true;
  return hasPermission(user, 'invoices');
}

/**
 * Checks if user is authorized to edit clinical medical records / EMR
 * @param {Object} user
 * @returns {boolean}
 */
export function canEditMedicalRecords(user) {
  if (isDoctorRole(user)) return true;
  if (!user) return false;
  return user.role === 'associate_doctor';
}

/**
 * Checks if a user has a specific permission
 * @param {Object} user - User object from AuthContext
 * @param {string} permissionKey - Permission key to verify
 * @returns {boolean}
 */
export function hasPermission(user, permissionKey) {
  if (!user) return false;

  // Super admin has full platform permissions
  if (user.role === 'super_admin' || user.isSuperAdmin === true) {
    return true;
  }

  // Doctor/Owner/Admin has full system-wide permissions across all features
  if (isAdminRole(user)) {
    return true;
  }

  // Admin-only management features (Settings, SMS gateway, etc.)
  if (permissionKey === 'admin_only') {
    return isAdminRole(user);
  }

  // Doctor-only clinical features (Doctor AI agent, etc.)
  if (permissionKey === 'doctor_only') {
    return isDoctorRole(user);
  }

  // Clinic Owner has full access
  if (user.role === 'owner' || user.role === 'multi_clinic_owner') {
    return true;
  }

  // If no specific permission requested, grant access to authenticated staff
  if (!permissionKey) {
    return true;
  }

  // Role defaults for specific job titles
  const role = user.role || 'staff';
  if (role === 'admin' || role === 'clinic_admin') {
    return true;
  }
  if (role === 'doctor' || role === 'associate_doctor') {
    return true;
  }
  if (role === 'accountant') {
    if (permissionKey === 'invoices') return true;
  }

  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return permissions.includes(permissionKey);
}

/**
 * Fine-grained Enterprise Capability Matrix (Tier-1 SaaS RBAC)
 */
export const CAPABILITIES = {
  // Clinical
  CLINICAL_CONSULT: 'clinical.consultation.conduct',
  CLINICAL_RECORDS_WRITE: 'clinical.records.write',
  CLINICAL_RECORDS_READ: 'clinical.records.read',
  CLINICAL_PRESCRIBE: 'clinical.prescribe',

  // Billing & Finance
  BILLING_INVOICE_CREATE: 'billing.invoice.create',
  BILLING_PAYMENT_COLLECT: 'billing.payment.collect',
  BILLING_REVENUE_VIEW: 'billing.revenue.view',
  BILLING_REFUND_PROCESS: 'billing.refund.process',

  // Scheduling & Front Desk
  SCHEDULING_MANAGE: 'scheduling.appointment.manage',
  SCHEDULING_QUEUE_TRIAGE: 'scheduling.queue.triage',

  // Settings & Team
  SETTINGS_CLINIC_MANAGE: 'settings.clinic.manage',
  SETTINGS_TEAM_MANAGE: 'settings.team.manage',
  PLATFORM_SUPERADMIN: 'platform.superadmin.access'
};

export const ROLE_CAPABILITIES = {
  super_admin: ['*'],
  owner: ['clinical.*', 'billing.*', 'scheduling.*', 'settings.*', 'team.*', 'sms.*', 'inventory.*'],
  admin: ['clinical.*', 'billing.*', 'scheduling.*', 'settings.*', 'team.*', 'sms.*', 'inventory.*'],
  clinic_admin: ['clinical.*', 'billing.*', 'scheduling.*', 'settings.*', 'team.*', 'sms.*', 'inventory.*'],
  multi_clinic_owner: ['clinical.*', 'billing.*', 'scheduling.*', 'settings.*', 'team.*', 'sms.*', 'inventory.*'],
  doctor: [
    'clinical.*',
    'billing.*',
    'scheduling.*',
    'settings.*',
    'team.*',
    'sms.*',
    'inventory.*'
  ],
  associate_doctor: [
    'clinical.consultation.conduct',
    'clinical.records.write',
    'clinical.records.read',
    'clinical.prescribe',
    'scheduling.appointment.manage',
    'scheduling.queue.triage'
  ],
  accountant: [
    'billing.invoice.create',
    'billing.payment.collect',
    'billing.revenue.view',
    'billing.refund.process',
    'clinical.records.read'
  ],
  staff: [
    'scheduling.appointment.manage',
    'scheduling.queue.triage',
    'billing.invoice.create',
    'billing.payment.collect',
    'clinical.records.read'
  ],
  receptionist: [
    'scheduling.appointment.manage',
    'scheduling.queue.triage',
    'billing.invoice.create',
    'billing.payment.collect',
    'clinical.records.read'
  ]
};

/**
 * Checks if a user has a specific granular capability
 * @param {Object} user - User object
 * @param {string} capability - Capability key e.g. 'billing.revenue.view'
 * @returns {boolean}
 */
export function hasCapability(user, capability) {
  if (!user || !capability) return false;
  if (user.role === 'super_admin' || user.isSuperAdmin === true) return true;
  if (capability === CAPABILITIES.PLATFORM_SUPERADMIN) return false;
  if (user.role === 'owner' || user.role === 'multi_clinic_owner') return true;

  // Explicit user capabilities array
  if (Array.isArray(user.capabilities)) {
    if (user.capabilities.includes('*') || user.capabilities.includes(capability)) return true;
    const [domain] = capability.split('.');
    if (user.capabilities.includes(`${domain}.*`)) return true;
  }

  // Legacy permissions array interoperability
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  if (permissions.includes('invoices') && capability.startsWith('billing.')) return true;
  if (permissions.includes('appointments') && capability.startsWith('scheduling.')) return true;
  if (permissions.includes('patients') && capability === 'clinical.records.read') return true;

  const role = user.role || 'staff';
  const roleCaps = ROLE_CAPABILITIES[role] || ROLE_CAPABILITIES.staff;

  if (roleCaps.includes('*') || roleCaps.includes(capability)) return true;

  const [domain] = capability.split('.');
  if (roleCaps.includes(`${domain}.*`)) return true;

  return false;
}

/**
 * Checks if a user can access a specific route
 * @param {Object} user - User object from AuthContext
 * @param {string} pathname - Current route path
 * @returns {boolean}
 */
export function canAccessRoute(user, pathname) {
  if (!user) return false;
  
  const cleanPath = pathname.split('?')[0].replace(/\/$/, '') || '/';

  // Super Admin Control Plane is strictly zero-trust: only platform super_admin can access
  if (cleanPath === '/super-admin' || cleanPath.startsWith('/super-admin/')) {
    return user.role === 'super_admin' || user.isSuperAdmin === true;
  }

  if (isDoctorRole(user)) return true;

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

