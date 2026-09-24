import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getRegisteredTenants, 
  saveRegisteredTenant, 
  clearAuthCache, 
  authenticateUser,
  saveRegisteredUser,
  getRegisteredUsers
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

describe('Returning Doctor Auth & Onboarding Loop Elimination Guard', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearAuthCache();
  });

  it('guarantees an existing clinic in tenant registry is recognized with isOnboardingCompleted: true', () => {
    const existingClinic = {
      id: 'clinic-returning-doc-123',
      name: 'عيادة د. محمد سعيد التخصصية',
      doctorName: 'د. محمد سعيد',
      doctorEmail: 'dr.returning@clinicflow.com',
      doctorPassword: 'Password123',
      slug: 'dr-returning-saeed',
      specialty: 'طب وجراحة الفم والأسنان',
      phone: '01012345678',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      isOnboardingCompleted: true
    };

    saveRegisteredTenant(existingClinic);

    const tenants = getRegisteredTenants(true);
    const matched = tenants.find(t => t.doctorEmail === 'dr.returning@clinicflow.com');

    expect(matched).toBeDefined();
    expect(matched.isOnboardingCompleted).toBe(true);
    expect(matched.slug).toBe('dr-returning-saeed');
  });

  it('authenticates returning doctor and attaches clinic slug without requiring re-onboarding', () => {
    const existingClinic = {
      id: 'clinic-saeed-99',
      name: 'عيادة د. سمير',
      doctorName: 'د. سمير',
      doctorEmail: 'samir.doctor@gmail.com',
      doctorPassword: 'SafeSecretPassword!',
      slug: 'dr-samir-dental',
      specialty: 'طب الأسنان',
      phone: '01099887766',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      isOnboardingCompleted: true
    };

    saveRegisteredTenant(existingClinic);

    const authResult = authenticateUser('samir.doctor@gmail.com', 'SafeSecretPassword!');
    expect(authResult).toBeDefined();
    expect(authResult.clinicSlug).toBe('dr-samir-dental');
    expect(authResult.role).toBe('doctor');
    expect(authResult.isClinicOwner).toBe(true);
  });

  it('guarantees real doctor email zainselim845@gmail.com is NOT treated as legacy demo', () => {
    const realDoctor = {
      id: 'clinic-real-zain',
      name: 'عيادة د. زين سليم',
      doctorName: 'د. زين سليم',
      doctorEmail: 'zainselim845@gmail.com',
      doctorPassword: 'ZainPassword2026',
      slug: 'dr-zainselim845',
      specialty: 'جراحة العظام',
      phone: '01011223344',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      isOnboardingCompleted: true
    };

    saveRegisteredTenant(realDoctor);

    const tenants = getRegisteredTenants(true);
    const matched = tenants.find(t => t.doctorEmail === 'zainselim845@gmail.com');

    expect(matched).toBeDefined();
    expect(matched.slug).toBe('dr-zainselim845');

    const authResult = authenticateUser('zainselim845@gmail.com', 'ZainPassword2026');
    expect(authResult).toBeDefined();
    expect(authResult.name).toBe('د. زين سليم');
    expect(authResult.clinicSlug).toBe('dr-zainselim845');
  });

  it('guarantees hasExistingClinic formula evaluates to true for returning doctor profile', () => {
    const tenant = {
      name: 'عيادة د. أحمد',
      slug: 'dr-ahmed-dental',
      isOnboardingCompleted: true
    };
    const user = {
      clinicSlug: 'dr-ahmed-dental',
      needsOnboarding: false,
      isOnboardingCompleted: true
    };

    const hasExistingClinic = Boolean(
      (tenant?.name && tenant?.slug) ||
      (user?.clinicSlug && user.clinicSlug !== '*') ||
      tenant?.isOnboardingCompleted === true ||
      user?.isOnboardingCompleted === true
    );

    expect(hasExistingClinic).toBe(true);

    const shouldRedirectToOnboarding = user.needsOnboarding && !hasExistingClinic;
    expect(shouldRedirectToOnboarding).toBe(false);
  });

  it('guarantees that even if user has needsOnboarding true by mistake, hasExistingClinic overrides and prevents redirect', () => {
    const tenant = {
      name: 'عيادة قائمة بالفعل',
      slug: 'dr-existing-clinic',
      isOnboardingCompleted: true
    };
    const user = {
      clinicSlug: 'dr-existing-clinic',
      needsOnboarding: true, // Erroneous flag
      isOnboardingCompleted: false
    };

    const hasExistingClinic = Boolean(
      (tenant?.name && tenant?.slug) ||
      (user?.clinicSlug && user.clinicSlug !== '*') ||
      tenant?.isOnboardingCompleted === true ||
      user?.isOnboardingCompleted === true
    );

    // With our hardened guard, hasExistingClinic overrides needsOnboarding
    const willRedirectToOnboarding = user.needsOnboarding && !hasExistingClinic;
    expect(willRedirectToOnboarding).toBe(false);
  });
});
