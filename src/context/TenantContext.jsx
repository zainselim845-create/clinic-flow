import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { clinicInfo as defaultClinicInfo, demoClinics as fallbackDemoClinics } from '../data/demoData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fromDbClinic } from '../services/clinicsService';
import { canSwitchTenants } from '../utils/permissions';

const TenantContext = createContext(null);

// Fallback seed clinics if demoClinics not exported
const initialClinics = fallbackDemoClinics || [
  {
    ...defaultClinicInfo,
    id: '550e8400-e29b-41d4-a716-446655440000',
    slug: 'dr-ahmed',
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    branding: {
      primaryColor: '#0071E3',
      accentColor: '#10B981',
      badgeText: 'العيادة التخصصية'
    },
    quotas: {
      maxDoctors: 3,
      monthlySmsQuota: 2000,
      smsUsed: 340,
      aiTokensQuota: 10000000,
      aiTokensUsed: 1250000
    }
  }
];

export const TenantProvider = ({ children }) => {
  const [allTenants, setAllTenants] = useState(initialClinics);
  const [activeTenant, setActiveTenant] = useState(initialClinics[0]);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);

  // 1. Resolve Tenant from Subdomain, Custom Domain, or URL Path
  const resolveTenantSlug = useCallback(() => {
    if (typeof window === 'undefined') return 'dr-ahmed';

    // A. Check URL query param (e.g. ?clinic=dr-sara)
    const urlParams = new URLSearchParams(window.location.search);
    const querySlug = urlParams.get('clinic');
    if (querySlug) return querySlug.toLowerCase().trim();

    // B. Check URL path (e.g. /c/dr-sara/...)
    const pathMatch = window.location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1].toLowerCase().trim();
    }

    // C. Check Subdomain (e.g. dr-sara.clinicflow.app or dr-sara.localhost)
    const hostname = window.location.hostname.toLowerCase();
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'app') {
      return parts[0];
    }

    // D. Check stored preference in localStorage
    const saved = localStorage.getItem('clinicflow_active_tenant_slug');
    if (saved) return saved.toLowerCase().trim();

    return 'dr-ahmed';
  }, []);

  // 2. Load and Bind Active Tenant
  const loadTenant = useCallback(async (slug) => {
    setIsLoadingTenant(true);
    const targetSlug = slug || resolveTenantSlug();

    if (!isSupabaseConfigured()) {
      // Offline / Demo Mode: find in demo clinics
      let match = allTenants.find(t => t.slug === targetSlug || t.id === targetSlug);
      if (!match) match = allTenants[0];
      setActiveTenant(match);
      localStorage.setItem('clinicflow_active_tenant_slug', match.slug);
      applyBranding(match.branding);
      setIsLoadingTenant(false);
      return match;
    }

    try {
      // Online Supabase Mode
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .or(`slug.eq.${targetSlug},id.eq.${targetSlug}`)
        .maybeSingle();

      if (data && !error) {
        const parsed = fromDbClinic(data);
        const merged = {
          ...parsed,
          slug: data.slug || targetSlug,
          subscriptionTier: data.subscription_tier || 'pro',
          subscriptionStatus: data.subscription_status || 'active',
          branding: data.branding || { primaryColor: '#0071E3', accentColor: '#10B981' },
          quotas: data.quotas || { maxDoctors: 3, monthlySmsQuota: 1000, smsUsed: 0 }
        };
        setActiveTenant(merged);
        localStorage.setItem('clinicflow_active_tenant_slug', merged.slug);
        applyBranding(merged.branding);
        setIsLoadingTenant(false);
        return merged;
      }
    } catch (err) {
      console.warn('Could not fetch tenant from Supabase, falling back to local:', err);
    }

    // Fallback to first tenant
    const fallback = allTenants[0];
    setActiveTenant(fallback);
    applyBranding(fallback?.branding);
    setIsLoadingTenant(false);
    return fallback;
  }, [allTenants, resolveTenantSlug]);

  // 3. Inject Tenant Brand Colors into CSS Variables Dynamically
  const applyBranding = (branding) => {
    if (typeof document === 'undefined' || !branding) return;
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty('--primary', branding.primaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty('--accent', branding.accentColor);
    }
  };

  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  // 4. Switch Tenant Action (for Multi-Clinic Owner / Super Admin)
  const switchTenant = useCallback((slugOrId) => {
    try {
      const savedUserStr = sessionStorage.getItem('clinicflow_auth_user');
      if (savedUserStr) {
        const currentUser = JSON.parse(savedUserStr);
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const canSwitch = canSwitchTenants(currentUser, currentPath);
        if (!canSwitch) {
          const userAllowedSlug = currentUser.allowedClinics?.[0] || currentUser.clinicSlug || currentUser.clinicId;
          if (slugOrId && slugOrId !== userAllowedSlug && slugOrId !== currentUser.clinicId) {
            console.warn(`[Tenant Isolation Enforcement] Tenant switch blocked: User is restricted to clinic '${userAllowedSlug}'`);
            return false;
          }
        }
      }
    } catch (_) {}
    return loadTenant(slugOrId);
  }, [loadTenant]);

  // 5. Feature Gating & Quota Checks
  const hasFeature = useCallback((featureName) => {
    if (!activeTenant) return false;
    const tier = activeTenant.subscriptionTier || 'starter';

    const tierFeatures = {
      starter: ['appointments', 'patients', 'invoices'],
      pro: ['appointments', 'patients', 'invoices', 'inventory', 'sms', 'aiAssistant', 'dentalChart'],
      enterprise: ['appointments', 'patients', 'invoices', 'inventory', 'sms', 'aiAssistant', 'dentalChart', 'multiDoctor', 'multiBranch', 'customDomain', 'auditLogs']
    };

    const allowed = tierFeatures[tier] || tierFeatures.starter;
    return allowed.includes(featureName);
  }, [activeTenant]);

  const checkQuota = useCallback((quotaType) => {
    if (!activeTenant || !activeTenant.quotas) {
      return { allowed: true, used: 0, limit: Infinity };
    }

    const quotas = activeTenant.quotas;
    switch (quotaType) {
      case 'sms': {
        const used = quotas.smsUsed || 0;
        const limit = quotas.monthlySmsQuota || 1000;
        return { allowed: used < limit, used, limit };
      }
      case 'doctors': {
        const used = quotas.doctorsCount || 1;
        const limit = quotas.maxDoctors || 3;
        return { allowed: used < limit, used, limit };
      }
      case 'aiTokens': {
        const used = quotas.aiTokensUsed || 0;
        const limit = quotas.aiTokensQuota || 5000000;
        return { allowed: used < limit, used, limit };
      }
      default:
        return { allowed: true, used: 0, limit: Infinity };
    }
  }, [activeTenant]);

  const value = useMemo(() => ({
    tenant: activeTenant,
    tenantSlug: activeTenant?.slug || 'dr-ahmed',
    allTenants,
    setAllTenants,
    isLoadingTenant,
    switchTenant,
    hasFeature,
    checkQuota,
    tier: activeTenant?.subscriptionTier || 'pro',
    isMultiTenant: true
  }), [activeTenant, allTenants, isLoadingTenant, switchTenant, hasFeature, checkQuota]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export default TenantContext;
