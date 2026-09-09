import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { clinicInfo as defaultClinicInfo, demoClinics as fallbackDemoClinics } from '../data/demoData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fromDbClinic } from '../services/clinicsService';
import { canSwitchTenants } from '../utils/permissions';
import { patientIndex } from '../services/indexedSearchService';
import { getRegisteredTenants, saveRegisteredTenant, updateClinicSubscriptionStatus } from '../services/authService';

const TenantContext = createContext(null);

// Fallback seed clinics if demoClinics not exported
const initialClinics = fallbackDemoClinics || [
  {
    ...defaultClinicInfo,
    id: '550e8400-e29b-41d4-a716-446655440000',
    slug: 'dr-ahmed',
    customDomain: 'dr-ahmed-dental.com',
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

export function getCombinedTenants() {
  const base = fallbackDemoClinics || initialClinics;
  const registered = getRegisteredTenants();
  const filtered = registered.filter(rt => !base.some(b => b.slug === rt.slug || b.id === rt.id));
  return [...base, ...filtered];
}

/**
 * Resolves tenant and dedicated domain status based on window location.
 * Priority:
 *  1. Custom domain match (customDomain / custom_domain against hostname without www) -> isDedicatedDomain: true
 *  2. Dedicated subdomain (e.g. dr-sara.clinicflow.app or dr-sara.localhost) -> isDedicatedDomain: true
 *  3. URL path (/c/:slug/...) -> isDedicatedDomain: false
 *  4. URL query (?clinic=slug) -> isDedicatedDomain: false
 *  5. LocalStorage stored preference -> isDedicatedDomain: false
 *  6. Default fallback ('dr-ahmed') -> isDedicatedDomain: false
 */
export function resolveTenantFromLocation(
  tenants = fallbackDemoClinics || initialClinics,
  locationObj = (typeof window !== 'undefined' ? window.location : null)
) {
  if (!locationObj) {
    const defaultClinic = tenants?.[0] || null;
    return {
      slug: defaultClinic?.slug || 'dr-ahmed',
      isDedicatedDomain: false,
      tenant: defaultClinic
    };
  }

  const hostname = (locationObj.hostname || '').toLowerCase().trim();
  const cleanHostname = hostname.replace(/^www\./i, '');
  const pathname = locationObj.pathname || '';
  const search = locationObj.search || '';

  // 1. Custom domain match: match custom_domain or customDomain against hostname without www
  if (cleanHostname) {
    const customMatch = (tenants || []).find(t => {
      const cd = (t.customDomain || t.custom_domain || '').toLowerCase().trim().replace(/^www\./i, '');
      return cd && cd === cleanHostname;
    });
    if (customMatch) {
      return {
        slug: customMatch.slug,
        isDedicatedDomain: true,
        tenant: customMatch
      };
    }
  }

  // 2. Dedicated subdomain (e.g. dr-sara.clinicflow.app or dr-sara.localhost)
  if (cleanHostname && !cleanHostname.match(/^(127\.0\.0\.1|0\.0\.0\.0)$/)) {
    const parts = cleanHostname.split('.');
    let sub = null;

    const isHostingPlatform = cleanHostname.endsWith('.vercel.app') || 
                              cleanHostname.endsWith('.netlify.app') || 
                              cleanHostname.endsWith('.pages.dev') ||
                              cleanHostname.endsWith('.onrender.com') ||
                              cleanHostname.endsWith('.github.io');

    if (isHostingPlatform) {
      // On platforms like *.vercel.app, 3 parts (e.g. clinic-flow-lh3g.vercel.app) is the root platform host.
      // Subdomains require >= 4 parts (e.g. dr-sara.clinic-flow-lh3g.vercel.app).
      if (parts.length >= 4 && parts[0] !== 'www' && parts[0] !== 'app') {
        sub = parts[0];
      }
    } else if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'app') {
      sub = parts[0];
    } else if (parts.length === 2 && parts[1] === 'localhost' && parts[0] !== 'www' && parts[0] !== 'app') {
      sub = parts[0];
    }

    if (sub) {
      const subMatch = (tenants || []).find(t => t.slug?.toLowerCase() === sub || t.id === sub);
      if (subMatch) {
        return {
          slug: subMatch.slug,
          isDedicatedDomain: true,
          tenant: subMatch
        };
      }
    }
  }

  // 3. URL path (e.g. /c/:slug/...)
  const pathMatch = pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
  if (pathMatch && pathMatch[1]) {
    const pathSlug = pathMatch[1].toLowerCase().trim();
    const match = (tenants || []).find(t => t.slug?.toLowerCase() === pathSlug || t.id === pathSlug);
    return {
      slug: pathSlug,
      isDedicatedDomain: false,
      tenant: match || null
    };
  }

  // 4. URL query param (e.g. ?clinic=dr-sara)
  const urlParams = new URLSearchParams(search);
  const querySlug = urlParams.get('clinic');
  if (querySlug) {
    const qSlug = querySlug.toLowerCase().trim();
    const match = (tenants || []).find(t => t.slug?.toLowerCase() === qSlug || t.id === qSlug);
    return {
      slug: qSlug,
      isDedicatedDomain: false,
      tenant: match || null
    };
  }

  // 5. Stored preference in localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('clinicflow_active_tenant_slug');
      if (saved) {
        const savedSlug = saved.toLowerCase().trim();
        const match = (tenants || []).find(t => t.slug?.toLowerCase() === savedSlug || t.id === savedSlug);
        return {
          slug: savedSlug,
          isDedicatedDomain: false,
          tenant: match || null
        };
      }
    } catch (_) {}
  }

  // 6. Fallback
  const defaultFallback = (tenants && tenants[0]) ? tenants[0] : null;
  return {
    slug: defaultFallback?.slug || 'dr-ahmed',
    isDedicatedDomain: false,
    tenant: defaultFallback
  };
}

/**
 * Returns whether current or given location is a dedicated domain / subdomain
 */
export function isDedicatedDomain(
  locationObj = (typeof window !== 'undefined' ? window.location : null),
  tenants = fallbackDemoClinics || initialClinics
) {
  return resolveTenantFromLocation(tenants, locationObj).isDedicatedDomain;
}

export const TenantProvider = ({ children }) => {
  const [allTenants, setAllTenants] = useState(() => getCombinedTenants());
  const initialResolution = useMemo(() => resolveTenantFromLocation(allTenants), [allTenants]);
  const [activeTenant, setActiveTenant] = useState(initialResolution.tenant || allTenants[0]);
  const [dedicatedDomainActive, setDedicatedDomainActive] = useState(initialResolution.isDedicatedDomain);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);

  // 1. Resolve Tenant from Subdomain, Custom Domain, or URL Path
  const resolveTenantSlug = useCallback(() => {
    return resolveTenantFromLocation(allTenants).slug;
  }, [allTenants]);

  // 2. Load and Bind Active Tenant
  const loadTenant = useCallback(async (slug) => {
    setIsLoadingTenant(true);
    const locationResolution = resolveTenantFromLocation(allTenants);
    setDedicatedDomainActive(locationResolution.isDedicatedDomain);

    const targetSlug = slug || locationResolution.slug;

    if (!isSupabaseConfigured()) {
      // Offline / Demo Mode: find in demo clinics
      let match = allTenants.find(t => t.slug === targetSlug || t.id === targetSlug);
      if (!match) match = locationResolution.tenant || allTenants[0];
      setActiveTenant(match);
      if (!locationResolution.isDedicatedDomain) {
        localStorage.setItem('clinicflow_active_tenant_slug', match.slug);
      }
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
          customDomain: data.custom_domain || parsed.customDomain,
          subscriptionTier: data.subscription_tier || 'pro',
          subscriptionStatus: data.subscription_status || 'active',
          branding: data.branding || { primaryColor: '#0071E3', accentColor: '#10B981' },
          quotas: data.quotas || { maxDoctors: 3, monthlySmsQuota: 1000, smsUsed: 0 }
        };
        setActiveTenant(merged);
        if (!locationResolution.isDedicatedDomain) {
          localStorage.setItem('clinicflow_active_tenant_slug', merged.slug);
        }
        applyBranding(merged.branding);
        setIsLoadingTenant(false);
        return merged;
      }
    } catch (err) {
      console.warn('Could not fetch tenant from Supabase, falling back to local:', err);
    }

    // Fallback to first tenant
    const fallback = locationResolution.tenant || allTenants[0];
    setActiveTenant(fallback);
    applyBranding(fallback?.branding);
    setIsLoadingTenant(false);
    return fallback;
  }, [allTenants]);

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
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isSuperAdminRoute = currentPath.startsWith('/super-admin');

      // Locked in dedicated domain mode unless explicitly on super admin
      if (dedicatedDomainActive && !isSuperAdminRoute) {
        console.warn(`[Tenant Isolation Enforcement] Tenant switch blocked: Locked to dedicated domain`);
        return false;
      }

      const savedUserStr = sessionStorage.getItem('clinicflow_auth_user');
      if (savedUserStr) {
        const currentUser = JSON.parse(savedUserStr);
        const canSwitch = canSwitchTenants(currentUser, currentPath, dedicatedDomainActive);
        if (!canSwitch) {
          const userAllowedSlug = currentUser.allowedClinics?.[0] || currentUser.clinicSlug || currentUser.clinicId;
          if (slugOrId && slugOrId !== userAllowedSlug && slugOrId !== currentUser.clinicId) {
            console.warn(`[Tenant Isolation Enforcement] Tenant switch blocked: User is restricted to clinic '${userAllowedSlug}'`);
            return false;
          }
        }
      }
    } catch (_) {}

    patientIndex.clearIndex();
    return loadTenant(slugOrId);
  }, [dedicatedDomainActive, loadTenant]);

  // 5. Register and Bind New Tenant dynamically
  const registerNewTenant = useCallback((newTenant) => {
    if (!newTenant) return;
    saveRegisteredTenant(newTenant);
    setAllTenants(prev => {
      const exists = prev.some(t => t.id === newTenant.id || t.slug === newTenant.slug);
      return exists 
        ? prev.map(t => (t.id === newTenant.id || t.slug === newTenant.slug) ? newTenant : t) 
        : [newTenant, ...prev];
    });
    setActiveTenant(newTenant);
    if (newTenant.slug) {
      localStorage.setItem('clinicflow_active_tenant_slug', newTenant.slug);
    }
    applyBranding(newTenant.branding);
  }, []);

  // 6. Update Tenant Subscription Status (Active, Suspended, Pending Approval, Past Due)
  const updateTenantStatus = useCallback((slugOrId, newStatus, reason = '') => {
    updateClinicSubscriptionStatus(slugOrId, newStatus, reason);
    const updater = t => {
      if (t.id === slugOrId || t.slug === slugOrId) {
        return {
          ...t,
          subscriptionStatus: newStatus,
          suspensionReason: newStatus === 'suspended' ? (reason || 'عدم سداد الاشتراك الدوري') : undefined,
          statusUpdatedAt: new Date().toISOString()
        };
      }
      return t;
    };
    setAllTenants(prev => prev.map(updater));
    setActiveTenant(prev => (prev && (prev.id === slugOrId || prev.slug === slugOrId)) ? updater(prev) : prev);
  }, []);

  // 7. Feature Gating & Quota Checks
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

  const isSuperAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/super-admin');
  const isolatedTenantsCatalog = useMemo(() => {
    if (dedicatedDomainActive && !isSuperAdminRoute) {
      return activeTenant ? [activeTenant] : allTenants.slice(0, 1);
    }
    return allTenants;
  }, [dedicatedDomainActive, isSuperAdminRoute, activeTenant, allTenants]);

  const value = useMemo(() => ({
    tenant: activeTenant,
    tenantSlug: activeTenant?.slug || 'dr-ahmed',
    resolveTenantSlug,
    allTenants: isolatedTenantsCatalog,
    setAllTenants,
    isLoadingTenant,
    isDedicatedDomain: dedicatedDomainActive,
    switchTenant,
    registerNewTenant,
    updateTenantStatus,
    hasFeature,
    checkQuota,
    tier: activeTenant?.subscriptionTier || 'pro',
    isMultiTenant: true
  }), [activeTenant, resolveTenantSlug, isolatedTenantsCatalog, dedicatedDomainActive, isLoadingTenant, switchTenant, registerNewTenant, updateTenantStatus, hasFeature, checkQuota]);

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
