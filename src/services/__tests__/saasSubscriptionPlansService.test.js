import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSaaSSubscriptionPlans,
  saveSaaSSubscriptionPlan,
  deleteSaaSSubscriptionPlan,
  resetSaaSSubscriptionPlansToDefaults,
  getSaaSBillingMetrics,
  updateClinicSubscriptionDetails,
  DEFAULT_SAAS_PLANS
} from '../saasSubscriptionPlansService';
import { clearAuthCache } from '../authService';
import { safeStorage } from '../../utils/safeStorage';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createStorageMock();
}

describe('saasSubscriptionPlansService Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    safeStorage.clear();
    clearAuthCache();
  });

  it('retrieves default SaaS subscription tiers', () => {
    const plans = getSaaSSubscriptionPlans();
    expect(plans.length).toBeGreaterThanOrEqual(3);
    const starter = plans.find(p => p.id === 'starter');
    const pro = plans.find(p => p.id === 'pro');
    const enterprise = plans.find(p => p.id === 'enterprise');

    expect(starter).toBeDefined();
    expect(starter.monthlyPrice).toBe(499);
    expect(pro).toBeDefined();
    expect(pro.monthlyPrice).toBe(999);
    expect(enterprise).toBeDefined();
    expect(enterprise.monthlyPrice).toBe(1999);
  });

  it('updates an existing subscription plan tier pricing and quotas', () => {
    const res = saveSaaSSubscriptionPlan({
      id: 'starter',
      monthlyPrice: 599,
      maxDoctors: 2,
      monthlySmsQuota: 1200
    });
    expect(res).toBe(true);

    const plans = getSaaSSubscriptionPlans();
    const stored = plans.find(p => p.id === 'starter');
    expect(stored.monthlyPrice).toBe(599);
    expect(stored.maxDoctors).toBe(2);
    expect(stored.monthlySmsQuota).toBe(1200);
  });

  it('adds a new custom plan tier and allows deleting it', () => {
    const customPlan = {
      id: 'custom_vip',
      name: 'باقة VIP الخاصة',
      nameEn: 'VIP Custom',
      monthlyPrice: 4500,
      annualPrice: 45000,
      maxDoctors: 25,
      monthlySmsQuota: 15000,
      aiAssistant: true,
      customDomain: true,
      whatsappBot: true
    };

    saveSaaSSubscriptionPlan(customPlan);
    let plans = getSaaSSubscriptionPlans();
    expect(plans.find(p => p.id === 'custom_vip')).toBeDefined();

    expect(deleteSaaSSubscriptionPlan('custom_vip')).toBe(true);
    plans = getSaaSSubscriptionPlans();
    expect(plans.find(p => p.id === 'custom_vip')).toBeUndefined();
  });

  it('resets plans to default factory presets', () => {
    saveSaaSSubscriptionPlan({
      id: 'starter',
      monthlyPrice: 9999
    });
    expect(getSaaSSubscriptionPlans().find(p => p.id === 'starter').monthlyPrice).toBe(9999);

    resetSaaSSubscriptionPlansToDefaults();
    expect(getSaaSSubscriptionPlans().find(p => p.id === 'starter').monthlyPrice).toBe(499);
  });

  it('calculates SaaS billing metrics (MRR, ARR, ARPU, active, trial, suspended)', () => {
    const mockTenants = [
      { id: '1', name: 'Clinic A', subscriptionTier: 'starter', subscriptionStatus: 'active' }, // 499
      { id: '2', name: 'Clinic B', subscriptionTier: 'pro', subscriptionStatus: 'active' },     // 999
      { id: '3', name: 'Clinic C', subscriptionTier: 'enterprise', subscriptionStatus: 'active' }, // 1999
      { id: '4', name: 'Clinic D', subscriptionTier: 'pro', subscriptionStatus: 'suspended' },   // Suspended => not in MRR
      { id: '5', name: 'Clinic E', subscriptionTier: 'starter', subscriptionStatus: 'trial' },     // Trial
    ];

    const metrics = getSaaSBillingMetrics(mockTenants);
    expect(metrics.totalClinics).toBe(5);
    expect(metrics.activePayingCount).toBe(3);
    expect(metrics.suspendedCount).toBe(1);
    expect(metrics.trialCount).toBe(1);

    // MRR = 499 + 999 + 1999 = 3497
    expect(metrics.mrr).toBe(3497);
    expect(metrics.arr).toBe(3497 * 12);
    expect(metrics.arpu).toBe(Math.round(3497 / 3));
  });

  it('updates clinic subscription status and suspension reason in safeStorage', () => {
    const mockTenant = {
      id: 'clinic_test_1',
      slug: 'test-clinic',
      name: 'Test Clinic',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      quotas: { monthlySmsQuota: 2000 }
    };
    safeStorage.setItem('clinicflow_registered_tenants', [mockTenant]);

    const result = updateClinicSubscriptionDetails('test-clinic', {
      subscriptionStatus: 'suspended',
      suspensionReason: 'تأخر سداد الاشتراك الشهري'
    });

    expect(result).toBe(true);
    const updatedTenants = safeStorage.getItem('clinicflow_registered_tenants', []);
    const updated = updatedTenants.find(t => t.slug === 'test-clinic');
    expect(updated).toBeDefined();
    expect(updated.subscriptionStatus).toBe('suspended');
    expect(updated.suspensionReason).toBe('تأخر سداد الاشتراك الشهري');
  });

  it('supports custom agreed pricing, flexible billing cycles, and lifetime portal buyout licenses', () => {
    const mockTenant = {
      id: 'clinic_vip',
      slug: 'vip-clinic',
      name: 'VIP Dental Clinic',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active'
    };
    safeStorage.setItem('clinicflow_registered_tenants', [mockTenant]);

    // Update with lifetime license and buyout offline payment
    const updateRes = updateClinicSubscriptionDetails('vip-clinic', {
      isLifetimeLicense: true,
      subscriptionStatus: 'lifetime',
      customAgreedPrice: 25000,
      billingCycle: 'lifetime',
      offlinePayment: {
        amount: 25000,
        method: 'instapay',
        notes: 'شراء ترخيص البورتال بالكامل مدى الحياة',
        type: 'lifetime_buyout'
      }
    });

    expect(updateRes).toBe(true);

    const tenants = safeStorage.getItem('clinicflow_registered_tenants', []);
    const vipClinic = tenants.find(t => t.slug === 'vip-clinic');
    expect(vipClinic.isLifetimeLicense).toBe(true);
    expect(vipClinic.subscriptionStatus).toBe('lifetime');
    expect(vipClinic.customAgreedPrice).toBe(25000);
    expect(vipClinic.subscriptionPaymentHistory.length).toBe(1);
    expect(vipClinic.subscriptionPaymentHistory[0].type).toBe('lifetime_buyout');
    expect(vipClinic.subscriptionPaymentHistory[0].amount).toBe(25000);

    // Test getSaaSBillingMetrics with lifetime and custom pricing
    const allMockTenants = [
      vipClinic,
      { id: '2', name: 'Clinic Quarterly', subscriptionTier: 'starter', subscriptionStatus: 'active', billingCycle: 'quarterly', customAgreedPrice: 1500 }, // 1500 / 3 = 500/mo
      { id: '3', name: 'Clinic Annual', subscriptionTier: 'pro', subscriptionStatus: 'active', billingCycle: 'annual', customAgreedPrice: 12000 }, // 12000 / 12 = 1000/mo
    ];

    const metrics = getSaaSBillingMetrics(allMockTenants);
    expect(metrics.lifetimeCount).toBe(1);
    expect(metrics.totalLifetimeRevenue).toBe(25000);
    // MRR from quarterly (500) + annual (1000) = 1500
    expect(metrics.mrr).toBe(1500);
  });
});

