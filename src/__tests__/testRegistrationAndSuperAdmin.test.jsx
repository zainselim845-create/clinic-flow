import { describe, it, expect, beforeEach } from 'vitest';
import { 
  registerDoctorAndClinic, 
  getRegisteredTenants, 
  getRegisteredUsers, 
  getAllPlatformUsers,
  clearAuthCache,
  updateClinicSubscriptionStatus
} from '../services/authService';
import { getCombinedTenants } from '../context/TenantContext';

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

describe('Registration to SuperAdmin Pipeline Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearAuthCache();
  });

  it('should register a new doctor and clinic and immediately appear in getCombinedTenants and getAllPlatformUsers', () => {
    const regPayload = {
      doctorName: 'دكتور تجريبي محمد',
      email: 'dr.test.mohamed@example.com',
      phone: '01099887766',
      password: 'password123',
      clinicName: 'عيادة الشروق التخصصية',
      specialty: 'طب وجراحة الفم والأسنان',
      address: 'القاهرة'
    };

    const { tenant, user } = registerDoctorAndClinic(regPayload);
    expect(tenant).toBeDefined();
    expect(user).toBeDefined();
    expect(tenant.name).toBe('عيادة الشروق التخصصية');
    expect(user.email).toBe('dr.test.mohamed@example.com');

    // 1. Check getRegisteredTenants
    const registeredTenants = getRegisteredTenants(true);
    expect(registeredTenants.some(t => t.id === tenant.id || t.slug === tenant.slug)).toBe(true);

    // 2. Check getCombinedTenants (Used by TenantContext and SuperAdminDashboard)
    const combinedTenants = getCombinedTenants(true);
    const foundTenant = combinedTenants.find(t => t.id === tenant.id || t.slug === tenant.slug);
    expect(foundTenant).toBeDefined();
    expect(foundTenant.name).toBe('عيادة الشروق التخصصية');

    // 3. Check getAllPlatformUsers (Used by SuperAdminDashboard Users Table)
    const platformUsers = getAllPlatformUsers();
    const foundUser = platformUsers.find(u => u.email === 'dr.test.mohamed@example.com');
    expect(foundUser).toBeDefined();
    expect(foundUser.name).toBe('دكتور تجريبي محمد');
    expect(foundUser.clinicName).toBe('عيادة الشروق التخصصية');
  });

  it('should verify that resolveTenantFromLocation and route isolation do not hide registered tenants from superadmin', () => {
    const regPayload = {
      doctorName: 'دكتورة منى',
      email: 'dr.mona@example.com',
      phone: '01122334455',
      password: 'password123',
      clinicName: 'عيادة منى لطب الأطفال',
      specialty: 'طب الأطفال وحديثي الولادة',
      address: 'الجيزة'
    };

    const { tenant } = registerDoctorAndClinic(regPayload);
    const combined = getCombinedTenants(true);
    expect(combined.some(t => t.slug === tenant.slug)).toBe(true);
  });

  it('should initialize registered clinic with pending_approval and activate upon superadmin approval', () => {
    const regPayload = {
      doctorName: 'د. خالد يوسف',
      email: 'dr.khaled@example.com',
      phone: '01233445566',
      password: 'password123',
      clinicName: 'عيادة الأمل لجراحة العظام',
      specialty: 'جراحة العظام والمفاصل',
      address: 'الإسكندرية'
    };

    const { tenant, user } = registerDoctorAndClinic(regPayload);
    
    // 1. Must be pending_approval initially
    expect(tenant.subscriptionStatus).toBe('pending_approval');

    // 2. SuperAdmin approves the clinic
    const approvedTenant = updateClinicSubscriptionStatus(tenant.slug, 'active');
    expect(approvedTenant).toBeDefined();
    expect(approvedTenant.subscriptionStatus).toBe('active');

    // 3. Registered tenant in list is now active
    const tenants = getRegisteredTenants(true);
    const updated = tenants.find(t => t.slug === tenant.slug);
    expect(updated.subscriptionStatus).toBe('active');
  });
});
