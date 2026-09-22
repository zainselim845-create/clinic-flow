import { describe, it, expect, beforeEach } from 'vitest';
import { 
  registerDoctorAndClinic,
  saveRegisteredTenant, 
  getRegisteredTenants, 
  deleteRegisteredTenant,
  saveRegisteredUser,
  getRegisteredUsers,
  getAllPlatformUsers,
  updateUserAccount,
  resetUserPassword,
  toggleUserAccountStatus,
  deleteUserAccount
} from '../services/authService';
import { getCombinedTenants } from '../context/TenantContext';
import { formatSenderId } from '../services/smsService';
import { 
  getClinicUsage, 
  topUpClinicCredits 
} from '../services/usageMeteringService';
import { 
  captureSystemError, 
  getSystemErrors, 
  resolveSystemError, 
  resolveAllSystemErrors,
  deleteSystemError,
  clearSystemErrors,
  reportUserBug,
  getBugReports,
  updateBugReportStatus,
  deleteBugReport,
  clearBugReports
} from '../services/systemErrorService';

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

describe('Super Admin Platform Control Plane & Tenant Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearSystemErrors();
  });

  it('provisions a new tenant with dedicated sender ID, quotas, and admin user credentials', () => {
    const clinicId = 'clinic_' + Date.now();
    const slug = 'el-nokhba-medical';
    const senderId = formatSenderId('elnokhba', 'ClinicFlow');

    const newClinic = {
      id: clinicId,
      name: 'مركز النخبة الطبي التخصصي',
      doctorName: 'د. كريم عبد العزيز',
      specialty: 'طب وجراحة العيون',
      phone: '01012345678',
      slug,
      senderId,
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      quotas: {
        maxDoctors: 10,
        monthlySmsQuota: 5000,
        smsUsed: 0,
        aiTokensQuota: 10000000,
        aiTokensUsed: 0
      }
    };

    saveRegisteredTenant(newClinic);

    const savedTenants = getRegisteredTenants();
    const found = savedTenants.find(t => t.id === clinicId || t.slug === slug);
    expect(found).toBeDefined();
    expect(found.name).toBe('مركز النخبة الطبي التخصصي');
    expect(found.subscriptionTier).toBe('enterprise');
    expect(found.senderId).toBe('elnokhba');

    saveRegisteredUser({
      id: 'doc-' + clinicId,
      name: 'د. كريم عبد العزيز',
      email: 'dr.karim@elnokhba.com',
      phone: '01012345678',
      password: 'securePass123!',
      role: 'doctor',
      isClinicOwner: true,
      clinicId,
      clinicSlug: slug,
      allowedClinics: [slug]
    });

    const users = getRegisteredUsers();
    const docUser = users.find(u => u.email === 'dr.karim@elnokhba.com');
    expect(docUser).toBeDefined();
    expect(docUser.clinicSlug).toBe(slug);
    expect(docUser.isClinicOwner).toBe(true);
  });

  it('supports tenant suspension (kill-switch) and reactivation', () => {
    const clinic = {
      id: 'clinic-suspend-test',
      slug: 'suspend-clinic',
      name: 'عيادة تحت الاختبار',
      subscriptionStatus: 'active',
      subscriptionTier: 'pro'
    };

    saveRegisteredTenant(clinic);

    // Suspend clinic
    const suspendedClinic = {
      ...clinic,
      subscriptionStatus: 'suspended',
      suspensionReason: 'تأخر سداد الفاتورة الشهرية'
    };
    saveRegisteredTenant(suspendedClinic);

    let current = getRegisteredTenants().find(t => t.id === clinic.id);
    expect(current.subscriptionStatus).toBe('suspended');
    expect(current.suspensionReason).toBe('تأخر سداد الفاتورة الشهرية');

    // Reactivate clinic
    const reactivatedClinic = {
      ...suspendedClinic,
      subscriptionStatus: 'active',
      suspensionReason: null
    };
    saveRegisteredTenant(reactivatedClinic);

    current = getRegisteredTenants().find(t => t.id === clinic.id);
    expect(current.subscriptionStatus).toBe('active');
  });

  it('permanently deletes a tenant and purges all associated doctor and staff accounts', () => {
    const clinicId = 'clinic-to-delete-99';
    const clinicSlug = 'test-delete-slug';

    saveRegisteredTenant({
      id: clinicId,
      slug: clinicSlug,
      name: 'عيادة للحذف التجريبي'
    });

    saveRegisteredUser({
      id: 'staff-del-1',
      name: 'سكرتير العيادة',
      email: 'sec@test-delete.com',
      phone: '01000000099',
      role: 'receptionist',
      clinicId,
      clinicSlug
    });

    expect(getRegisteredTenants().some(t => t.id === clinicId)).toBe(true);
    expect(getRegisteredUsers().some(u => u.clinicId === clinicId)).toBe(true);

    deleteRegisteredTenant(clinicSlug);

    expect(getRegisteredTenants().some(t => t.id === clinicId || t.slug === clinicSlug)).toBe(false);
    expect(getRegisteredUsers().some(u => u.clinicId === clinicId || u.clinicSlug === clinicSlug)).toBe(false);
  });

  it('meters SMS usage and processes quota top-ups accurately', () => {
    const clinicId = 'clinic-quota-test';
    const quotas = {
      monthlySmsQuota: 1000,
      smsUsed: 250,
      extraSmsCredits: 0
    };

    const initialUsage = getClinicUsage(clinicId, quotas, 'pro');
    expect(initialUsage.smsUsed).toBe(250);
    expect(initialUsage.totalSmsAllowed).toBe(1000);
    expect(initialUsage.remainingSms).toBe(750);
    expect(initialUsage.isSmsDepleted).toBe(false);

    topUpClinicCredits({ clinicId, smsCredits: 500 });

    const updatedUsage = getClinicUsage(clinicId, quotas, 'pro');
    expect(updatedUsage.totalSmsAllowed).toBe(1500);
    expect(updatedUsage.remainingSms).toBe(1250);
  });

  it('logs runtime exceptions to Telemetry Center and allows resolving and clearing them', () => {
    captureSystemError({
      type: 'NETWORK_ERROR',
      message: 'Failed to fetch external SMS gateway endpoint',
      severity: 'critical',
      clinicId: 'dr-ahmed',
      path: '/settings'
    });

    let errors = getSystemErrors();
    expect(errors.length).toBeGreaterThanOrEqual(1);
    const targetError = errors[0];
    expect(targetError.type).toBe('NETWORK_ERROR');
    expect(targetError.severity).toBe('critical');

    resolveSystemError(targetError.id);
    errors = getSystemErrors();
    const resolved = errors.find(e => e.id === targetError.id);
    expect(resolved.status).toBe('resolved');

    // Test resolveAllSystemErrors
    captureSystemError({
      type: 'test_err_1',
      message: 'Unresolved error 1'
    });
    captureSystemError({
      type: 'test_err_2',
      message: 'Unresolved error 2'
    });
    let unres = getSystemErrors().filter(e => e.status !== 'resolved');
    expect(unres.length).toBe(2);

    resolveAllSystemErrors();
    unres = getSystemErrors().filter(e => e.status !== 'resolved');
    expect(unres.length).toBe(0);

    // Test deleteSystemError
    const errorToDelete = getSystemErrors()[0];
    deleteSystemError(errorToDelete.id);
    expect(getSystemErrors().some(e => e.id === errorToDelete.id)).toBe(false);

    clearSystemErrors();
    expect(getSystemErrors().length).toBe(0);
  });

  it('manages doctor bug reports and status transitions, deletion, and bulk clear', () => {
    const report1 = reportUserBug({
      title: 'بطء في تحميل جدول المواعيد',
      description: 'يستغرق الجدول 3 ثوان للظهور عند وجود 50 موعد',
      category: 'performance',
      clinicId: 'dr-sara',
      clinicName: 'مركز د. سارة للجلدية',
      doctorEmail: 'doctor@drsara.com',
      path: '/appointments'
    });

    const report2 = reportUserBug({
      title: 'تعطل غير متوقع في الواجهة',
      description: 'useEffect is not defined',
      category: 'bug',
      clinicId: 'general',
      path: '/settings'
    });

    expect(report1.id).toBeDefined();
    expect(report1.status).toBe('open');

    let reports = getBugReports();
    expect(reports.some(b => b.id === report1.id)).toBe(true);
    expect(reports.some(b => b.id === report2.id)).toBe(true);

    updateBugReportStatus(report1.id, 'in_progress');
    expect(getBugReports().find(b => b.id === report1.id).status).toBe('in_progress');

    updateBugReportStatus(report1.id, 'resolved');
    expect(getBugReports().find(b => b.id === report1.id).status).toBe('resolved');

    // Test deleteBugReport
    deleteBugReport(report1.id);
    reports = getBugReports();
    expect(reports.some(b => b.id === report1.id)).toBe(false);
    expect(reports.some(b => b.id === report2.id)).toBe(true);

    // Test clearBugReports
    clearBugReports();
    expect(getBugReports().length).toBe(0);
  });

  it('manages client user accounts (list, update, password reset, toggle status, and delete)', () => {
    // 1. Check all platform users retrieval
    const initialUsers = getAllPlatformUsers();
    expect(initialUsers.length).toBeGreaterThanOrEqual(1);
    expect(initialUsers.some(u => u.role === 'super_admin')).toBe(true);
    expect(initialUsers.some(u => u.email === 'superadmin@clinicflow.com')).toBe(true);

    // 2. Register a new doctor user
    const testDoc = {
      id: 'doc-test-99',
      name: 'د. يوسف الشناوي',
      email: 'dr.youssef@testclinic.com',
      phone: '01099988877',
      password: 'initialPassword123',
      role: 'doctor',
      isClinicOwner: true,
      jobTitle: 'استشاري المخ والأعصاب',
      clinicSlug: 'dr-youssef',
      clinicName: 'مركز الشناوي للأعصاب',
      status: 'active'
    };
    saveRegisteredUser(testDoc);

    let users = getAllPlatformUsers();
    const foundUser = users.find(u => u.id === 'doc-test-99' || u.email === 'dr.youssef@testclinic.com');
    expect(foundUser).toBeDefined();
    expect(foundUser.name).toBe('د. يوسف الشناوي');
    expect(foundUser.status).toBe('active');

    // 3. Update account details
    updateUserAccount('doc-test-99', {
      jobTitle: 'رئيس قسم جراحة المخ والأعصاب',
      phone: '01155544433'
    });
    users = getAllPlatformUsers();
    const updatedUser = users.find(u => u.id === 'doc-test-99');
    expect(updatedUser.jobTitle).toBe('رئيس قسم جراحة المخ والأعصاب');
    expect(updatedUser.phone).toBe('01155544433');

    // 4. Reset password
    const pwReset = resetUserPassword('doc-test-99', 'newSecurePassword456');
    expect(pwReset).toBe(true);

    // 5. Toggle status (suspend and reactivate)
    toggleUserAccountStatus('doc-test-99', 'suspended');
    users = getAllPlatformUsers();
    expect(users.find(u => u.id === 'doc-test-99').status).toBe('suspended');

    toggleUserAccountStatus('doc-test-99', 'active');
    users = getAllPlatformUsers();
    expect(users.find(u => u.id === 'doc-test-99').status).toBe('active');

    // 6. Delete user account
    deleteUserAccount('doc-test-99');
    users = getAllPlatformUsers();
    expect(users.some(u => u.id === 'doc-test-99')).toBe(false);
  });

  it('ensures newly registered doctors and clinics immediately appear in getCombinedTenants and getAllPlatformUsers across calls', () => {
    const newDocRegistration = {
      doctorName: 'د. سامي العزازي',
      email: 'sami.elazazi@clinicflow.com',
      phone: '01019998877',
      password: 'password123',
      clinicName: 'مركز العزازي للجراحة',
      specialty: 'جراحة العظام والمفاصل'
    };

    const { tenant, user } = registerDoctorAndClinic(newDocRegistration);
    expect(tenant).toBeDefined();
    expect(user).toBeDefined();

    // 1. Check getCombinedTenants immediately includes the clinic
    const combined = getCombinedTenants();
    const foundClinic = combined.find(t => t.id === tenant.id || t.slug === tenant.slug);
    expect(foundClinic).toBeDefined();
    expect(foundClinic.name).toBe('مركز العزازي للجراحة');

    // 2. Check getAllPlatformUsers immediately includes the doctor
    const platformUsers = getAllPlatformUsers();
    const foundUser = platformUsers.find(u => u.email === 'sami.elazazi@clinicflow.com');
    expect(foundUser).toBeDefined();
    expect(foundUser.name).toBe('د. سامي العزازي');
    expect(foundUser.clinicSlug).toBe(tenant.slug);
  });
});

