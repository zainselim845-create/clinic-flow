import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';

/**
 * Standard Medical RBAC Roles & Permissions Matrix
 */
export const CLINIC_PERMISSIONS = {
  // Appointments
  APPOINTMENTS_READ: 'appointments:read',
  APPOINTMENTS_WRITE: 'appointments:write',
  APPOINTMENTS_DELETE: 'appointments:delete',
  
  // Patients
  PATIENTS_READ: 'patients:read',
  PATIENTS_WRITE: 'patients:write',
  PATIENTS_DELETE: 'patients:delete',
  
  // Medical Records & Prescriptions
  PRESCRIPTIONS_WRITE: 'prescriptions:write',
  MEDICAL_HISTORY_READ: 'medical_history:read',
  MEDICAL_HISTORY_WRITE: 'medical_history:write',
  
  // Financials & Billing
  FINANCIALS_READ: 'financials:read',
  FINANCIALS_WRITE: 'financials:write',
  EXPENSES_MANAGE: 'expenses:manage',
  
  // Staff & Settings
  STAFF_MANAGE: 'staff:manage',
  SETTINGS_MANAGE: 'settings:manage',
  AUDIT_LOGS_READ: 'audit_logs:read'
};

export const CLINIC_ROLE_PERMISSIONS = {
  owner: Object.values(CLINIC_PERMISSIONS),
  admin: [
    CLINIC_PERMISSIONS.APPOINTMENTS_READ,
    CLINIC_PERMISSIONS.APPOINTMENTS_WRITE,
    CLINIC_PERMISSIONS.APPOINTMENTS_DELETE,
    CLINIC_PERMISSIONS.PATIENTS_READ,
    CLINIC_PERMISSIONS.PATIENTS_WRITE,
    CLINIC_PERMISSIONS.FINANCIALS_READ,
    CLINIC_PERMISSIONS.FINANCIALS_WRITE,
    CLINIC_PERMISSIONS.EXPENSES_MANAGE,
    CLINIC_PERMISSIONS.STAFF_MANAGE,
    CLINIC_PERMISSIONS.SETTINGS_MANAGE,
    CLINIC_PERMISSIONS.AUDIT_LOGS_READ
  ],
  doctor: [
    CLINIC_PERMISSIONS.APPOINTMENTS_READ,
    CLINIC_PERMISSIONS.APPOINTMENTS_WRITE,
    CLINIC_PERMISSIONS.PATIENTS_READ,
    CLINIC_PERMISSIONS.PATIENTS_WRITE,
    CLINIC_PERMISSIONS.PRESCRIPTIONS_WRITE,
    CLINIC_PERMISSIONS.MEDICAL_HISTORY_READ,
    CLINIC_PERMISSIONS.MEDICAL_HISTORY_WRITE
  ],
  receptionist: [
    CLINIC_PERMISSIONS.APPOINTMENTS_READ,
    CLINIC_PERMISSIONS.APPOINTMENTS_WRITE,
    CLINIC_PERMISSIONS.PATIENTS_READ,
    CLINIC_PERMISSIONS.PATIENTS_WRITE,
    CLINIC_PERMISSIONS.FINANCIALS_WRITE // registering consultation fees
  ],
  accountant: [
    CLINIC_PERMISSIONS.FINANCIALS_READ,
    CLINIC_PERMISSIONS.FINANCIALS_WRITE,
    CLINIC_PERMISSIONS.EXPENSES_MANAGE,
    CLINIC_PERMISSIONS.AUDIT_LOGS_READ
  ],
  nurse: [
    CLINIC_PERMISSIONS.APPOINTMENTS_READ,
    CLINIC_PERMISSIONS.PATIENTS_READ,
    CLINIC_PERMISSIONS.MEDICAL_HISTORY_READ
  ]
};

/**
 * Better Auth Configuration
 */
export const authOptions = {
  appName: 'ClinicFlow',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // 1 day
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 10,
      membershipLimit: 50,
      creatorRole: 'owner',
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
      cancelPendingInvitationsOnReInvite: true
    })
  ]
};

export const hasClinicPermission = (role, permission) => {
  if (!role || !permission) return false;
  const allowed = CLINIC_ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
};
