import { describe, it, expect, beforeEach } from 'vitest';
import * as staffService from '@/features/platform/services/staffService';
import { provisionStaffAccount, authenticateUser, getRegisteredUsers, deleteRegisteredUser, clearAuthCache } from '@/features/auth/services/authService';
import { safeGetJSON, safeSetJSON } from '@/utils/safeStorage';

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

describe('Staff Account Persistence, Caching & Instant Login Authentication', () => {
  const clinicSlug = 'persisted-clinic';
  const clinicId = 'tenant-persisted-clinic';

  beforeEach(() => {
    globalThis.localStorage.clear();
    clearAuthCache();
  });

  it('provisions a staff account and persists it in auth registry for instant login', () => {
    const staff = provisionStaffAccount({
      clinicId,
      clinicSlug,
      name: 'سارة الاستقبال',
      phone: '01123456789',
      password: 'password123',
      role: 'receptionist',
      permissions: ['appointments', 'patients', 'sms']
    });

    expect(staff).toBeDefined();
    expect(staff.name).toBe('سارة الاستقبال');
    expect(staff.roleKey).toBe('receptionist');

    // Authenticate with phone and password
    const authUser = authenticateUser('01123456789', 'password123');
    expect(authUser).toBeDefined();
    expect(authUser.name).toBe('سارة الاستقبال');
    expect(authUser.clinicSlug).toBe(clinicSlug);
    expect(authUser.permissions).toContain('appointments');
  });

  it('saves staff member locally and retrieves them even when Supabase is offline', async () => {
    const staffData = {
      id: 'staff-unit-1',
      clinicId,
      clinicSlug,
      name: 'أحمد التمريض',
      phone: '01234567890',
      password: 'pass456',
      role: 'مساعد تمريض سريري',
      roleKey: 'assistant',
      shift: 'صباحي (09:00 ص - 03:00 م)',
      status: 'active',
      permissions: ['appointments', 'patients', 'inventory'],
      createdAt: '2026-10-18'
    };

    // Provision account
    provisionStaffAccount({
      id: staffData.id,
      clinicId,
      clinicSlug,
      name: staffData.name,
      phone: staffData.phone,
      password: staffData.password,
      role: staffData.roleKey,
      permissions: staffData.permissions
    });

    // Add via staffService
    const addResult = await staffService.addStaffMember(staffData);
    expect(addResult.data).toBeDefined();

    // Verify it is saved in local storage cache
    const cachedStaff = safeGetJSON(`clinicflow_staff_${clinicSlug}`, []);
    expect(cachedStaff).toHaveLength(1);
    expect(cachedStaff[0].name).toBe('أحمد التمريض');

    // getStaffMembers retrieves it via fallback
    const fetchResult = await staffService.getStaffMembers(clinicSlug);
    expect(fetchResult.data).toHaveLength(1);
    expect(fetchResult.data[0].phone).toBe('01234567890');
  });

  it('reconciles registered auth users into staff list if staff cache was empty', async () => {
    // Provision staff directly into auth registry
    provisionStaffAccount({
      id: 'staff-auto-recon',
      clinicId,
      clinicSlug,
      name: 'نور المحاسبة',
      phone: '01511223344',
      password: 'accPass2026',
      role: 'accountant',
      permissions: ['invoices']
    });

    // Ensure clinicflow_staff_${clinicSlug} is empty
    safeSetJSON(`clinicflow_staff_${clinicSlug}`, []);

    // Calling getStaffMembers should automatically reconcile with getRegisteredUsers()
    const result = await staffService.getStaffMembers(clinicSlug);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    const found = result.data.find(s => s.phone === '01511223344');
    expect(found).toBeDefined();
    expect(found.name).toBe('نور المحاسبة');
    expect(found.roleKey).toBe('accountant');
  });

  it('updates and deletes staff member cleanly across auth registry and local cache', async () => {
    const staffData = {
      id: 'staff-to-delete',
      clinicId,
      clinicSlug,
      name: 'علي للاختبار',
      phone: '01011112222',
      password: 'delPass123',
      role: 'receptionist',
      roleKey: 'receptionist',
      status: 'active',
      permissions: ['appointments']
    };

    provisionStaffAccount(staffData);
    await staffService.addStaffMember(staffData);

    // Update status
    await staffService.updateStaffMember(staffData.id, { status: 'inactive' }, clinicSlug);
    const updatedList = await staffService.getStaffMembers(clinicSlug);
    const updatedMember = updatedList.data.find(s => s.id === staffData.id);
    expect(updatedMember.status).toBe('inactive');

    // Delete staff
    await staffService.deleteStaffMember(staffData.id, clinicSlug);
    deleteRegisteredUser(staffData.id, clinicId);

    const afterDelete = await staffService.getStaffMembers(clinicSlug);
    expect(afterDelete.data.find(s => s.id === staffData.id)).toBeUndefined();
    expect(getRegisteredUsers().find(u => u.id === staffData.id)).toBeUndefined();
  });
});
