import { describe, it, expect, beforeEach } from 'vitest';
import { 
  CLINIC_PERMISSIONS, 
  CLINIC_ROLE_PERMISSIONS, 
  hasClinicPermission,
  authOptions 
} from '../lib/better-auth.config';
import { 
  createOrganization, 
  setActiveOrganization, 
  getActiveOrganizationId, 
  listOrganizations, 
  inviteStaffMember, 
  canAccess 
} from '../services/organizationService';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

globalThis.localStorage = createStorageMock();
globalThis.sessionStorage = createStorageMock();

describe('Better Auth Medical RBAC & Permissions Matrix', () => {
  it('should grant full permissions to clinic owner', () => {
    expect(hasClinicPermission('owner', CLINIC_PERMISSIONS.APPOINTMENTS_WRITE)).toBe(true);
    expect(hasClinicPermission('owner', CLINIC_PERMISSIONS.FINANCIALS_WRITE)).toBe(true);
    expect(hasClinicPermission('owner', CLINIC_PERMISSIONS.STAFF_MANAGE)).toBe(true);
    expect(hasClinicPermission('owner', CLINIC_PERMISSIONS.PRESCRIPTIONS_WRITE)).toBe(true);
  });

  it('should restrict doctor permissions to clinical duties', () => {
    expect(hasClinicPermission('doctor', CLINIC_PERMISSIONS.APPOINTMENTS_READ)).toBe(true);
    expect(hasClinicPermission('doctor', CLINIC_PERMISSIONS.PRESCRIPTIONS_WRITE)).toBe(true);
    expect(hasClinicPermission('doctor', CLINIC_PERMISSIONS.FINANCIALS_READ)).toBe(false);
    expect(hasClinicPermission('doctor', CLINIC_PERMISSIONS.STAFF_MANAGE)).toBe(false);
  });

  it('should restrict receptionist to appointments and patient registration', () => {
    expect(hasClinicPermission('receptionist', CLINIC_PERMISSIONS.APPOINTMENTS_WRITE)).toBe(true);
    expect(hasClinicPermission('receptionist', CLINIC_PERMISSIONS.PATIENTS_WRITE)).toBe(true);
    expect(hasClinicPermission('receptionist', CLINIC_PERMISSIONS.PRESCRIPTIONS_WRITE)).toBe(false);
    expect(hasClinicPermission('receptionist', CLINIC_PERMISSIONS.STAFF_MANAGE)).toBe(false);
  });

  it('should restrict accountant to financials and reports only', () => {
    expect(hasClinicPermission('accountant', CLINIC_PERMISSIONS.FINANCIALS_READ)).toBe(true);
    expect(hasClinicPermission('accountant', CLINIC_PERMISSIONS.EXPENSES_MANAGE)).toBe(true);
    expect(hasClinicPermission('accountant', CLINIC_PERMISSIONS.PRESCRIPTIONS_WRITE)).toBe(false);
    expect(hasClinicPermission('accountant', CLINIC_PERMISSIONS.APPOINTMENTS_WRITE)).toBe(false);
  });

  it('should configure session and organization plugins correctly', () => {
    expect(authOptions.appName).toBe('ClinicFlow');
    expect(authOptions.session.expiresIn).toBe(60 * 60 * 24 * 7);
    expect(authOptions.plugins.length).toBeGreaterThan(0);
  });
});

describe('Organization Service & Multi-Tenancy', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should create an organization with slug and metadata', async () => {
    const res = await createOrganization({
      name: 'عيادة الشفاء التخصصية',
      slug: 'al-shifa-clinic',
      metadata: { specialty: 'dentistry' }
    });

    expect(res.success).toBe(true);
    expect(res.data.name).toBe('عيادة الشفاء التخصصية');
    expect(res.data.slug).toBe('al-shifa-clinic');
    expect(getActiveOrganizationId()).toBe(res.data.id);
  });

  it('should set and retrieve active organization', async () => {
    const orgRes = await createOrganization({ name: 'عيادة الأمل', slug: 'al-amal' });
    expect(orgRes.success).toBe(true);

    const activeRes = await setActiveOrganization(orgRes.data.id);
    expect(activeRes.success).toBe(true);
    expect(getActiveOrganizationId()).toBe(orgRes.data.id);
  });

  it('should invite a staff member with specified role', async () => {
    const orgRes = await createOrganization({ name: 'عيادة النور', slug: 'al-nour' });
    const orgId = orgRes.data.id;

    const inviteRes = await inviteStaffMember({
      organizationId: orgId,
      email: 'nurse.fatma@example.com',
      role: 'nurse'
    });

    expect(inviteRes.success).toBe(true);
    expect(inviteRes.data.email).toBe('nurse.fatma@example.com');
    expect(inviteRes.data.role).toBe('nurse');
    expect(inviteRes.data.status).toBe('pending');
  });

  it('should reject invitation if email is missing', async () => {
    const res = await inviteStaffMember({
      organizationId: 'org-test',
      email: '',
      role: 'receptionist'
    });

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('should verify access via canAccess', () => {
    expect(canAccess('owner', CLINIC_PERMISSIONS.SETTINGS_MANAGE)).toBe(true);
    expect(canAccess('nurse', CLINIC_PERMISSIONS.SETTINGS_MANAGE)).toBe(false);
  });
});
