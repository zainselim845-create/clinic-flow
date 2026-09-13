import { describe, it, expect, beforeEach } from 'vitest';
import { 
  clearAuthCache,
  getRegisteredUsers,
  saveRegisteredUser,
  getRegisteredTenants,
  saveRegisteredTenant,
  isUsernameAvailable,
  completeClinicOnboarding,
  authenticateUser,
  provisionStaffAccount,
  updateStaffAccountStatus,
  deleteRegisteredUser,
  RESERVED_USERNAMES
} from '../services/authService';

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

describe('Doctor Onboarding & Staff Management (Arabic SaaS Workflow)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearAuthCache();
  });

  describe('1. Real-time Username Uniqueness Validation (isUsernameAvailable)', () => {
    it('rejects empty or short usernames (< 3 characters)', () => {
      const emptyCheck = isUsernameAvailable('');
      expect(emptyCheck.available).toBe(false);

      const shortCheck = isUsernameAvailable('ab');
      expect(shortCheck.available).toBe(false);
      expect(shortCheck.reason).toContain('3 أحرف');
    });

    it('rejects invalid characters in usernames', () => {
      const invalidChars = isUsernameAvailable('dr ahmed!');
      expect(invalidChars.available).toBe(false);
      expect(invalidChars.reason).toContain('أحرف إنجليزية وأرقام');
    });

    it('rejects reserved system usernames and offers alternative suggestions', () => {
      expect(RESERVED_USERNAMES.has('admin')).toBe(true);
      expect(RESERVED_USERNAMES.has('super-admin')).toBe(true);
      expect(RESERVED_USERNAMES.has('booking')).toBe(true);

      const adminCheck = isUsernameAvailable('admin');
      expect(adminCheck.available).toBe(false);
      expect(adminCheck.reason).toContain('محجوز لنظام ClinicFlow');
      expect(adminCheck.suggestions).toBeDefined();
      expect(adminCheck.suggestions.length).toBeGreaterThan(0);
      expect(adminCheck.suggestions[0]).toBe('dr-admin');
    });

    it('rejects usernames already taken by demo clinics (dr-ahmed, dr-sara)', () => {
      const ahmedCheck = isUsernameAvailable('dr-ahmed');
      expect(ahmedCheck.available).toBe(false);
      expect(ahmedCheck.reason).toContain('محجوز مسبقاً');
      expect(ahmedCheck.suggestions.length).toBeGreaterThan(0);

      const saraCheck = isUsernameAvailable('dr-sara');
      expect(saraCheck.available).toBe(false);
      expect(saraCheck.reason).toContain('محجوز مسبقاً');
    });

    it('rejects usernames already taken by an existing registered doctor or clinic', () => {
      // Register existing clinic with username 'elite-dental'
      saveRegisteredTenant({
        id: 'clinic-existing-1',
        name: 'عيادة النخبة',
        slug: 'elite-dental',
        username: 'elite-dental',
        doctorEmail: 'dr.elite@example.com'
      });

      const checkTaken = isUsernameAvailable('elite-dental');
      expect(checkTaken.available).toBe(false);
      expect(checkTaken.reason).toContain('محجوز مسبقاً لعيادة مسجلة');
      expect(checkTaken.suggestions).toBeDefined();
      expect(checkTaken.suggestions).toContain('dr-elite-dental');
    });

    it('allows a doctor to keep their own username when updating profile', () => {
      const myUserId = 'user-me-123';
      saveRegisteredTenant({
        id: 'clinic-user-me-123',
        ownerId: myUserId,
        name: 'عيادتي',
        slug: 'dr-myname',
        username: 'dr-myname'
      });

      const checkSelf = isUsernameAvailable('dr-myname', myUserId);
      expect(checkSelf.available).toBe(true);
    });

    it('accepts valid, unique usernames and handles with leading @ symbol', () => {
      const validCheck = isUsernameAvailable('@dr-tamer-smile');
      expect(validCheck.available).toBe(true);
      expect(validCheck.reason).toContain('متاح ومناسب لعيادتك');
    });
  });

  describe('2. Complete Onboarding Pipeline (completeClinicOnboarding)', () => {
    it('provisions clean clinic, sets custom handle, loads specialty services and configures colors', () => {
      const result = completeClinicOnboarding({
        userId: 'google-uid-777',
        userEmail: 'dr.karim.derma@gmail.com',
        username: 'dr-karim-derma',
        doctorName: 'د. كريم عبد العزيز',
        clinicName: 'مركز د. كريم للجلدية والتجميل والليزر',
        specialty: 'الجلدية والتناسلية والتجميل والليزر',
        primaryColor: '#7C3AED',
        accentColor: '#EC4899',
        teamSize: 'medium',
        phone: '01012345678',
        address: 'القاهرة - التجمع الخامس'
      });

      expect(result.tenant).toBeDefined();
      expect(result.tenant.name).toBe('مركز د. كريم للجلدية والتجميل والليزر');
      expect(result.tenant.slug).toBe('dr-karim-derma');
      expect(result.tenant.branding.primaryColor).toBe('#7C3AED');
      expect(result.tenant.branding.accentColor).toBe('#EC4899');
      expect(result.tenant.isOnboardingCompleted).toBe(true);
      expect(result.tenant.subscriptionStatus).toBe('active');

      // Specialty services pre-loaded
      expect(result.tenant.services.length).toBeGreaterThan(2);

      // User profile updated
      expect(result.user).toBeDefined();
      expect(result.user.name).toBe('د. كريم عبد العزيز');
      expect(result.user.username).toBe('dr-karim-derma');
      expect(result.user.isOnboardingCompleted).toBe(true);
      expect(result.user.needsOnboarding).toBe(false);
      expect(result.user.clinicSlug).toBe('dr-karim-derma');

      // Scoped localStorage initialized
      const scopedRaw = localStorage.getItem('clinicflow_data_dr-karim-derma');
      expect(scopedRaw).toBeDefined();
      const parsedScoped = JSON.parse(scopedRaw);
      expect(parsedScoped.clinicInfo.name).toBe('مركز د. كريم للجلدية والتجميل والليزر');
      expect(Array.isArray(parsedScoped.staffMembers)).toBe(true);
    });

    it('blocks onboarding if chosen username is already taken and throws descriptive error', () => {
      // First doctor claims 'dr-sherif'
      completeClinicOnboarding({
        userId: 'doc-1',
        userEmail: 'doc1@example.com',
        username: 'dr-sherif',
        doctorName: 'د. شريف الأول',
        clinicName: 'عيادة شريف الأولى'
      });

      // Second doctor tries claiming the exact same username
      expect(() => {
        completeClinicOnboarding({
          userId: 'doc-2',
          userEmail: 'doc2@example.com',
          username: 'dr-sherif',
          doctorName: 'د. شريف الثاني',
          clinicName: 'عيادة شريف الثانية'
        });
      }).toThrow(/محجوز مسبقاً|مستخدم بالفعل/);
    });

    it('provisions initial staff member during onboarding with granular permissions', () => {
      const result = completeClinicOnboarding({
        userId: 'google-uid-888',
        userEmail: 'dr.nour@gmail.com',
        username: 'dr-nour-dental',
        doctorName: 'د. نور الدين',
        clinicName: 'مركز نور لطب وجراحة الأسنان',
        specialty: 'طب وجراحة الفم والأسنان العام',
        initialStaff: {
          name: 'مروة الشافعي',
          phone: '01088776655',
          email: 'marwa@clinic.com',
          password: 'staff-secret-pass',
          role: 'receptionist',
          permissions: ['appointments', 'patients', 'sms'],
          shift: 'صباحي (09:00 ص - 03:00 م)'
        }
      });

      expect(result.staff).toBeDefined();
      expect(result.staff.name).toBe('مروة الشافعي');
      expect(result.staff.phone).toBe('01088776655');
      expect(result.staff.role).toBe('receptionist');
      expect(result.staff.permissions).toEqual(['appointments', 'patients', 'sms']);
      expect(result.staff.clinicSlug).toBe('dr-nour-dental');

      // Staff member can immediately log in with phone & password
      const loggedStaff = authenticateUser('01088776655', 'staff-secret-pass');
      expect(loggedStaff).toBeDefined();
      expect(loggedStaff.name).toBe('مروة الشافعي');
      expect(loggedStaff.role).toBe('receptionist');
      expect(loggedStaff.permissions).toContain('appointments');

      // Scoped localStorage contains staff member
      const scopedRaw = localStorage.getItem('clinicflow_data_dr-nour-dental');
      const parsedScoped = JSON.parse(scopedRaw);
      expect(parsedScoped.staffMembers.length).toBe(1);
      expect(parsedScoped.staffMembers[0].name).toBe('مروة الشافعي');
    });
  });

  describe('3. In-App Staff Management & Authentication by Phone / Username', () => {
    it('allows provisioning multiple staff members with distinct roles and permissions', () => {
      const clinicId = 'clinic-test-roles';
      const clinicSlug = 'test-roles';

      // 1. Receptionist
      const s1 = provisionStaffAccount({
        clinicId,
        clinicSlug,
        name: 'أحمد استقبال',
        phone: '01011112222',
        password: 'pass1',
        role: 'receptionist',
        permissions: ['appointments', 'patients', 'sms']
      });

      // 2. Accountant
      const s2 = provisionStaffAccount({
        clinicId,
        clinicSlug,
        name: 'محمود محاسب',
        phone: '01033334444',
        password: 'pass2',
        role: 'accountant',
        permissions: ['invoices']
      });

      // 3. Associate Doctor
      const s3 = provisionStaffAccount({
        clinicId,
        clinicSlug,
        name: 'د. ياسمين مساعدة',
        phone: '01055556666',
        password: 'pass3',
        role: 'associate_doctor',
        permissions: ['appointments', 'patients', 'sms']
      });

      expect(s1.role).toBe('receptionist');
      expect(s2.role).toBe('accountant');
      expect(s3.role).toBe('associate_doctor');

      // Verify each staff can authenticate by phone
      const a1 = authenticateUser('01011112222', 'pass1');
      expect(a1.name).toBe('أحمد استقبال');

      const a2 = authenticateUser('01033334444', 'pass2');
      expect(a2.name).toBe('محمود محاسب');

      const a3 = authenticateUser('01055556666', 'pass3');
      expect(a3.name).toBe('د. ياسمين مساعدة');
    });

    it('forbids inactive staff members from authenticating', () => {
      const s = provisionStaffAccount({
        clinicId: 'c-inactive',
        clinicSlug: 'c-inactive',
        name: 'موظف موقف',
        phone: '01099998888',
        password: 'secret',
        role: 'receptionist'
      });

      // Deactivate staff member
      s.status = 'inactive';
      saveRegisteredUser(s);

      expect(() => {
        authenticateUser('01099998888', 'secret');
      }).toThrow('هذا الحساب معطل حالياً من قِبل إدارة العيادة.');
    });

    it('toggles staff status via updateStaffAccountStatus dynamically', () => {
      const s = provisionStaffAccount({
        clinicId: 'c-toggle',
        clinicSlug: 'c-toggle',
        name: 'موظف تجربة',
        phone: '01077778888',
        password: 'pass',
        role: 'receptionist'
      });

      // Initially active
      expect(authenticateUser('01077778888', 'pass').name).toBe('موظف تجربة');

      // Deactivate
      updateStaffAccountStatus(s.id, 'inactive');
      expect(() => authenticateUser('01077778888', 'pass')).toThrow('معطل');

      // Re-activate
      updateStaffAccountStatus(s.id, 'active');
      expect(authenticateUser('01077778888', 'pass').name).toBe('موظف تجربة');
    });

    it('deletes staff member via deleteRegisteredUser permanently', () => {
      const s = provisionStaffAccount({
        clinicId: 'c-del',
        clinicSlug: 'c-del',
        name: 'موظف محذوف',
        phone: '01066665555',
        password: 'pass',
        role: 'receptionist'
      });

      expect(authenticateUser('01066665555', 'pass').name).toBe('موظف محذوف');

      // Delete staff
      deleteRegisteredUser(s.id);

      expect(authenticateUser('01066665555', 'pass')).toBeNull();
    });

    it('synchronizes custom UI staff IDs and deletes staff by formatted phone or ID', () => {
      const customUiId = 'staff-ui-custom-12345';
      const staffPhone = '010-3333-4444';

      const s = provisionStaffAccount({
        id: customUiId,
        clinicId: 'c-sync',
        clinicSlug: 'c-sync',
        name: 'موظف مزامنة',
        phone: staffPhone,
        password: 'pass',
        role: 'receptionist'
      });

      expect(s.id).toBe(customUiId);
      expect(authenticateUser('01033334444', 'pass').name).toBe('موظف مزامنة');

      // Delete using phone or custom UI ID
      deleteRegisteredUser(staffPhone);
      expect(authenticateUser('01033334444', 'pass')).toBeNull();
    });

    it('ensures completeClinicOnboarding configures dedicated senderId for the clinic', () => {
      const result = completeClinicOnboarding({
        userId: 'doc-sender-test',
        userEmail: 'sender@clinic.com',
        username: 'nile-care',
        doctorName: 'د. يوسف النيل',
        clinicName: 'مركز نايل كير'
      });

      expect(result.tenant.senderId).toBeDefined();
      expect(result.tenant.senderId).toBe('NileCare');
    });
  });
});
