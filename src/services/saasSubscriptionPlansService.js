import { safeStorage } from '../utils/safeStorage';
import { updateClinicSubscriptionStatus } from './authService';

export const SAAS_PLANS_STORAGE_KEY = 'clinicflow_saas_custom_plans';

export const DEFAULT_SAAS_PLANS = [
  {
    id: 'starter',
    name: 'باقة Starter (الأساسية)',
    nameEn: 'Starter',
    monthlyPrice: 499,
    annualPrice: 4990,
    monthlySmsQuota: 500,
    maxDoctors: 1,
    maxAppointmentsPerMonth: 300,
    maxPatients: 1000,
    aiAssistant: false,
    customDomain: false,
    whatsappBot: false,
    labModule: false,
    inventoryModule: false,
    dentalChart: false,
    badge: 'العيادات الفردية',
    accentColor: '#71717A',
    description: 'مثالية للعيادات الفردية والأطباء المستقلين في بداية تأسيس عيادتهم الخاصة.'
  },
  {
    id: 'pro',
    name: 'باقة Pro (العيادة الذكية)',
    nameEn: 'Pro',
    monthlyPrice: 999,
    annualPrice: 9990,
    monthlySmsQuota: 2000,
    maxDoctors: 3,
    maxAppointmentsPerMonth: 1500,
    maxPatients: 5000,
    aiAssistant: true,
    customDomain: false,
    whatsappBot: true,
    labModule: true,
    inventoryModule: true,
    dentalChart: true,
    badge: 'الأكثر طلباً ⭐',
    accentColor: '#007AFF',
    description: 'الحل الشامل للعيادات التخصصية التي تبحث عن أتمتة كاملة، ومساعد طبيب ذكي، وإدارة فواتير ومخزون.'
  },
  {
    id: 'enterprise',
    name: 'باقة Enterprise (المراكز الكبرى)',
    nameEn: 'Enterprise',
    monthlyPrice: 1999,
    annualPrice: 19990,
    monthlySmsQuota: 6000,
    maxDoctors: 10,
    maxAppointmentsPerMonth: 10000,
    maxPatients: 50000,
    aiAssistant: true,
    customDomain: true,
    whatsappBot: true,
    labModule: true,
    inventoryModule: true,
    dentalChart: true,
    badge: 'مراكز ومستشفيات VIP',
    accentColor: '#10B981',
    description: 'للمجمعات والمراكز الطبية مع ربط دومين مخصص، صلاحيات متعددة الأطباء، وتدقيق حسابي وسحابي كامل.'
  }
];

export function getSaaSSubscriptionPlans() {
  const saved = safeStorage.getItem(SAAS_PLANS_STORAGE_KEY, null);
  if (Array.isArray(saved) && saved.length > 0) {
    return saved;
  }
  return DEFAULT_SAAS_PLANS;
}

export function saveSaaSSubscriptionPlan(planData) {
  if (!planData || !planData.id) return false;
  const current = getSaaSSubscriptionPlans();
  const index = current.findIndex(p => p.id === planData.id);
  let updated;
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...planData };
  } else {
    updated = [...current, planData];
  }
  safeStorage.setItem(SAAS_PLANS_STORAGE_KEY, updated);
  return true;
}

export function deleteSaaSSubscriptionPlan(planId) {
  if (!planId) return false;
  const current = getSaaSSubscriptionPlans();
  const filtered = current.filter(p => p.id !== planId);
  safeStorage.setItem(SAAS_PLANS_STORAGE_KEY, filtered);
  return true;
}

export function resetSaaSSubscriptionPlansToDefaults() {
  safeStorage.setItem(SAAS_PLANS_STORAGE_KEY, DEFAULT_SAAS_PLANS);
  return DEFAULT_SAAS_PLANS;
}

export function getSaaSBillingMetrics(tenants = []) {
  const plans = getSaaSSubscriptionPlans();
  const planPriceMap = {};
  plans.forEach(p => {
    planPriceMap[p.id] = Number(p.monthlyPrice) || 0;
  });

  let mrr = 0;
  let activePayingCount = 0;
  let suspendedCount = 0;
  let pendingCount = 0;
  let lifetimeCount = 0;
  let totalLifetimeRevenue = 0;

  tenants.forEach(t => {
    const status = t.subscriptionStatus || 'active';
    const isLifetime = Boolean(t.isLifetimeLicense || status === 'lifetime');
    const tier = t.subscriptionTier || 'pro';
    const defaultPrice = planPriceMap[tier] || 999;
    const agreedPrice = (t.customAgreedPrice !== undefined && t.customAgreedPrice !== null && t.customAgreedPrice !== '') 
      ? Number(t.customAgreedPrice) 
      : defaultPrice;

    if (isLifetime) {
      lifetimeCount++;
      // Calculate any lifetime buyout revenue collected
      if (Array.isArray(t.subscriptionPaymentHistory)) {
        t.subscriptionPaymentHistory.forEach(p => {
          if (p.type === 'lifetime_buyout') {
            totalLifetimeRevenue += Number(p.amount) || 0;
          }
        });
      }
      if (t.lastPayment && t.lastPayment.type === 'lifetime_buyout' && (!t.subscriptionPaymentHistory || t.subscriptionPaymentHistory.length === 0)) {
        totalLifetimeRevenue += Number(t.lastPayment.amount) || 0;
      }
    } else if (status === 'suspended') {
      suspendedCount++;
    } else if (status === 'pending_approval') {
      pendingCount++;
    } else {
      activePayingCount++;
      const cycle = t.billingCycle || 'monthly';
      if (cycle === 'quarterly') {
        mrr += Math.round(agreedPrice / 3);
      } else if (cycle === 'semi_annual') {
        mrr += Math.round(agreedPrice / 6);
      } else if (cycle === 'annual') {
        mrr += Math.round(agreedPrice / 12);
      } else {
        mrr += agreedPrice;
      }
    }
  });

  const arr = mrr * 12;
  const totalClinics = tenants.length;
  const arpu = activePayingCount > 0 ? Math.round(mrr / activePayingCount) : 0;

  return {
    mrr,
    arr,
    totalClinics,
    activePayingCount,
    suspendedCount,
    pendingCount,
    lifetimeCount,
    totalLifetimeRevenue,
    arpu
  };
}

export function updateClinicSubscriptionDetails(clinicSlugOrId, updates = {}) {
  if (!clinicSlugOrId) return false;

  // 1. Update registered tenants in storage
  const registered = safeStorage.getItem('clinicflow_registered_tenants', []);
  const index = registered.findIndex(t => t.id === clinicSlugOrId || t.slug === clinicSlugOrId);

  if (index >= 0) {
    const existing = registered[index];
    const history = Array.isArray(existing.subscriptionPaymentHistory) ? [...existing.subscriptionPaymentHistory] : [];
    
    if (updates.offlinePayment) {
      history.push({
        id: `pay_${Date.now()}`,
        amount: Number(updates.offlinePayment.amount) || 0,
        method: updates.offlinePayment.method || 'cash',
        notes: updates.offlinePayment.notes || '',
        type: updates.offlinePayment.type || 'recurring',
        date: updates.offlinePayment.date || new Date().toISOString()
      });
    }

    const updated = {
      ...existing,
      ...updates,
      subscriptionPaymentHistory: history,
      updatedAt: new Date().toISOString()
    };

    if (updates.isLifetimeLicense) {
      updated.isLifetimeLicense = true;
      updated.subscriptionStatus = 'lifetime';
      updated.billingCycle = 'lifetime';
      delete updated.suspensionReason;
    } else if (updates.subscriptionStatus) {
      updated.subscriptionStatus = updates.subscriptionStatus;
      if (updates.subscriptionStatus === 'suspended') {
        updated.suspensionReason = updates.suspensionReason || 'عدم سداد الاشتراك الدوري';
      } else {
        delete updated.suspensionReason;
      }
    }

    registered[index] = updated;
    safeStorage.setItem('clinicflow_registered_tenants', registered);
  }

  // 2. Also update status in auth service
  if (updates.subscriptionStatus || updates.isLifetimeLicense) {
    const nextStatus = updates.isLifetimeLicense ? 'lifetime' : updates.subscriptionStatus;
    updateClinicSubscriptionStatus(clinicSlugOrId, nextStatus, updates.suspensionReason);
  }

  // 3. Update usage limits in metering store
  if (updates.quotas) {
    const usageKey = `clinicflow_usage_${clinicSlugOrId}`;
    const currentUsage = safeStorage.getItem(usageKey, {}) || {};
    safeStorage.setItem(usageKey, {
      ...currentUsage,
      ...updates.quotas,
      clinicId: clinicSlugOrId
    });
  }

  return true;
}
