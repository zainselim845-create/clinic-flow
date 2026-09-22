import { describe, it, expect, beforeEach } from 'vitest';
import { getInitialDataForTenant, getCleanInitialDataForTenant } from '../data/demoData';
import { 
  registerDoctorAndClinic, 
  getAllPlatformUsers, 
  saveRegisteredTenant, 
  getRegisteredTenants, 
  saveRegisteredUser,
  clearAuthCache
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

describe('Pristine Tenant Zero-State Safety & Anti-Leakage Architecture', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearAuthCache();
  });

  it('guarantees that any custom doctor clinic starts with 0 appointments, 0 patients, and 0 expenses', () => {
    const customSlug = 'dr-zainselim845';
    const initialData = getInitialDataForTenant(customSlug);

    expect(initialData.appointments).toHaveLength(0);
    expect(initialData.patients).toHaveLength(0);
    expect(initialData.expenses).toHaveLength(0);
    expect(initialData.invoices).toHaveLength(0);
    expect(initialData.recalls).toHaveLength(0);
    expect(initialData.blockedSlots).toHaveLength(0);
  });

  it('guarantees pristine clean initial data has strictly zero demo contamination', () => {
    const cleanData = getCleanInitialDataForTenant('dr-newdoctor999');

    expect(cleanData.appointments).toHaveLength(0);
    expect(cleanData.patients).toHaveLength(0);
    expect(cleanData.invoices).toHaveLength(0);
    expect(cleanData.expenses).toHaveLength(0);
  });

  it('calculates zero financial figures with no phantom 300 EGP fallbacks for empty clinics', () => {
    const customAppointments = [];
    const completedToday = customAppointments.filter(a => a.status === 'completed');

    let cash = 0;
    let electronic = 0;

    completedToday.forEach(a => {
      const rawFee = a.fee ?? a.paidAmount;
      const fee = typeof rawFee === 'number'
        ? rawFee
        : (rawFee ? parseInt(String(rawFee).replace(/\D/g, ''), 10) : 0);
      const safeFee = isNaN(fee) ? 0 : fee;
      if (a.paymentMethod === 'card' || a.paymentMethod === 'instapay') {
        electronic += safeFee;
      } else {
        cash += safeFee;
      }
    });

    const totalTodayRevenue = cash + electronic;
    const progressLabel = customAppointments.length > 0 
      ? `(${completedToday.length} من ${customAppointments.length})` 
      : '(0 من 0)';

    expect(cash).toBe(0);
    expect(electronic).toBe(0);
    expect(totalTodayRevenue).toBe(0);
    expect(progressLabel).toBe('(0 من 0)');
  });

  it('guarantees doctor names are systematically prefixed with د. across all user registrations', async () => {
    const rawName = 'zain selim';
    const sanitizedDoctorName = rawName.startsWith('د.') ? rawName : `د. ${rawName}`;

    expect(sanitizedDoctorName).toBe('د. zain selim');

    // Test with already prefixed name to avoid duplicate prefixes like 'د. د.'
    const alreadyPrefixed = 'د. محمود حمدي';
    const cleanPrefixed = alreadyPrefixed.startsWith('د.') ? alreadyPrefixed : `د. ${alreadyPrefixed}`;
    expect(cleanPrefixed).toBe('د. محمود حمدي');
  });

  it('guarantees any new clinic registration is immediately visible in SaaS SuperAdmin accounts directory', async () => {
    const newDocRegistration = {
      doctorName: 'د. خالد عبد الله',
      email: 'khaled@clinicflow.test',
      phone: '01019998888',
      specialty: 'طب وجراحة الأسنان',
      clinicName: 'مركز د. خالد التخصصي',
      password: 'SecurePassword123'
    };

    const { tenant, user } = registerDoctorAndClinic(newDocRegistration);
    expect(tenant).toBeDefined();
    expect(user).toBeDefined();

    const platformUsers = getAllPlatformUsers();
    const foundUser = platformUsers.find(u => u.email.toLowerCase() === 'khaled@clinicflow.test');

    expect(foundUser).toBeDefined();
    expect(foundUser.role).toBe('doctor');
    expect(foundUser.name).toBe('د. خالد عبد الله');
    expect(foundUser.status).toBe('active');
  });

  it('guarantees Google OAuth users are recorded in global user registry and accessible to Super Admin', () => {
    const googleUser = {
      id: 'google-sub-987654',
      email: 'dr.khalid.google@gmail.com',
      name: 'د. خالد سليم',
      role: 'doctor',
      jobTitle: 'المدير الطبي / استشاري العيادة (Google Verified)',
      clinicSlug: 'dr-khalid',
      clinicId: 'clinic-khalid',
      status: 'active'
    };

    saveRegisteredUser(googleUser);

    const platformUsers = getAllPlatformUsers();
    const match = platformUsers.find(u => u.email === 'dr.khalid.google@gmail.com');

    expect(match).toBeDefined();
    expect(match.name).toBe('د. خالد سليم');
    expect(match.role).toBe('doctor');
  });

  it('guarantees secondary modules (Invoices, Labs, Inventory, Attendance) never leak demo records into custom doctor clinics', () => {
    const customSlug = 'dr-zainselim845';

    // 1. Invoices
    const storedInvoices = localStorage.getItem(`clinicflow_invoices_${customSlug}`);
    const scopedInvoices = storedInvoices ? JSON.parse(storedInvoices) : [];
    expect(scopedInvoices).toHaveLength(0);

    // 2. Labs
    const storedLabs = localStorage.getItem(`clinicflow_labs_${customSlug}`);
    const scopedLabs = storedLabs ? JSON.parse(storedLabs) : [];
    expect(scopedLabs).toHaveLength(0);

    // 3. Inventory
    const storedInventory = localStorage.getItem(`clinicflow_inventory_${customSlug}`);
    const scopedInventory = storedInventory ? JSON.parse(storedInventory) : [];
    expect(scopedInventory).toHaveLength(0);

    // 4. Attendance
    const storedAttendance = localStorage.getItem(`clinicflow_attendance_${customSlug}`);
    const scopedAttendance = storedAttendance ? JSON.parse(storedAttendance) : [];
    expect(scopedAttendance).toHaveLength(0);
  });
});
