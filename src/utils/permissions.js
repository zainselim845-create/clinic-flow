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
    id: 'prescriptions',
    name: 'الروشتات والعلاج الإلكتروني',
    description: 'إنشاء وطباعة ومشاركة الروشتات الطبية للمرضى',
    badgeColor: '#EC4899'
  }
];

export const ROUTE_PERMISSION_MAP = {
  '/appointments': 'appointments',
  '/patients': 'patients',
  '/invoices': 'invoices',
  '/inventory': 'inventory',
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
