import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { clinicInfo as defaultClinicInfo, demoClinics as fallbackDemoClinics } from '../data/demoData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fromDbClinic, getAllClinicsFromDb } from '../services/clinicsService';
import { canSwitchTenants } from '../utils/permissions';
import { patientIndex } from '../services/indexedSearchService';
import { getRegisteredTenants, saveRegisteredTenant, updateClinicSubscriptionStatus, deleteRegisteredTenant } from '../services/authService';
import { getClinicDomainSettings } from '../services/customDomainService';

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
      primaryColor: '#09090B',
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
  
  // Merge registered tenants with base (updating base if slug/id matches)
  const combined = base.map(b => {
    const override = registered.find(rt => rt.id === b.id || rt.slug === b.slug);
    return override ? { ...b, ...override } : b;
  });

  for (const rt of registered) {
    if (!combined.some(b => b.id === rt.id || b.slug === rt.slug)) {
      combined.push(rt);
    }
  }

  // Enrich with custom domain settings saved via CustomDomainTab
  return combined.map(tenant => {
    const domainConfig = getClinicDomainSettings(tenant.id);
    if (domainConfig && domainConfig.domain) {
      return {
        ...tenant,
        customDomain: domainConfig.domain,
        custom_domain: domainConfig.domain
      };
    }
    return tenant;
  });
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

  // 1. Cross-tab and Broadcast Synchronization (Multi-window & Multi-tab reactivity)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e || e.key === 'clinicflow_registered_tenants' || e.key === 'clinicflow_active_tenant_slug') {
        const fresh = getCombinedTenants();
        setAllTenants(fresh);
      }
    };

    let channel = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('clinicflow_tenants_sync');
        channel.onmessage = () => {
          const fresh = getCombinedTenants();
          setAllTenants(fresh);
        };
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
      if (channel) {
        channel.close();
      }
    };
  }, []);

  // 2. Background Supabase Cloud Clinics Synchronization
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let isMounted = true;
    getAllClinicsFromDb().then(({ data: dbClinics }) => {
      if (!isMounted || !Array.isArray(dbClinics) || dbClinics.length === 0) return;
      setAllTenants(prev => {
        const merged = [...prev];
        dbClinics.forEach(dbc => {
          const idx = merged.findIndex(t => t.id === dbc.id || t.slug === dbc.slug);
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...dbc };
          } else {
            merged.push(dbc);
          }
        });
        return merged;
      });
    }).catch(err => console.warn('Cloud clinics fetch notice:', err));
    return () => { isMounted = false; };
  }, []);

  // 3. Resolve Tenant from Subdomain, Custom Domain, or URL Path
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
      // Offline / Demo Mode: find in demo clinics and all registered clinics
      const currentCombined = getCombinedTenants();
      let match = currentCombined.find(t => t.slug === targetSlug || t.id === targetSlug);
      if (!match) match = locationResolution.tenant || currentCombined[0];
      setActiveTenant(match);
      if (!locationResolution.isDedicatedDomain && match?.slug) {
        localStorage.setItem('clinicflow_active_tenant_slug', match.slug);
      }
      applyBranding(match?.branding);
      setIsLoadingTenant(false);
      return match;
    }

    try {
      // Online Supabase Mode
      // 1. Check if accessing via a custom domain first
      const hostname = (typeof window !== 'undefined' ? window.location?.hostname : '')?.toLowerCase()?.trim()?.replace(/^www\./i, '');
      const isPlatformHost = !hostname || 
                             hostname.endsWith('.vercel.app') || 
                             hostname.endsWith('.netlify.app') || 
                             hostname.endsWith('.pages.dev') ||
                             hostname.endsWith('.onrender.com') ||
                             hostname.endsWith('.github.io') ||
                             hostname.includes('clinicflow') ||
                             hostname === 'localhost' ||
                             hostname.match(/^(127\.0\.0\.1|0\.0\.0\.0)$/);

      if (hostname && !isPlatformHost) {
        const { data: domainClinic } = await supabase
          .from('clinics')
          .select('*')
          .or(`custom_domain.eq.${hostname},custom_domain.eq.www.${hostname}`)
          .maybeSingle();

        if (domainClinic) {
          const parsed = fromDbClinic(domainClinic);
          const merged = {
            ...parsed,
            slug: domainClinic.slug,
            customDomain: domainClinic.custom_domain || parsed.customDomain,
            subscriptionTier: domainClinic.subscription_tier || 'pro',
            subscriptionStatus: domainClinic.subscription_status || 'active',
            branding: domainClinic.branding || { primaryColor: '#09090B', accentColor: '#10B981' },
            quotas: domainClinic.quotas || { maxDoctors: 3, monthlySmsQuota: 1000, smsUsed: 0 }
          };
          setActiveTenant(merged);
          setDedicatedDomainActive(true);
          applyBranding(merged.branding);
          setIsLoadingTenant(false);
          return merged;
        }
      }

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
          branding: data.branding || { primaryColor: '#09090B', accentColor: '#10B981' },
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

  // 3. Inject Tenant Brand Colors into CSS Variables Dynamically (Monochrome Bedrock + Curated Accent)
  const applyBranding = (branding) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const primary = branding?.primaryColor;
    const isMonochrome = !primary || primary === 'monochrome' || primary === '#000000' || primary === '#09090B' || primary === '#18181B';

    if (isMonochrome) {
      const isDark = root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark';
      root.style.setProperty('--clinic-primary', isDark ? '#FFFFFF' : '#09090B');
      root.style.setProperty('--clinic-primary-hover', isDark ? '#E4E4E7' : '#27272A');
      root.style.setProperty('--clinic-primary-light', isDark ? 'rgba(255, 255, 255, 0.12)' : '#F4F4F5');
      root.style.setProperty('--clinic-primary-glow', isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.08)');
      root.style.setProperty('--clinic-gradient-primary', isDark ? '#FFFFFF' : '#09090B');
      root.style.setProperty('--clinic-on-primary', isDark ? '#09090B' : '#FFFFFF');
      root.style.setProperty('--primary', isDark ? '#FFFFFF' : '#09090B');
      root.style.setProperty('--primary-hover', isDark ? '#E4E4E7' : '#27272A');
      root.style.setProperty('--primary-light', isDark ? 'rgba(255, 255, 255, 0.12)' : '#F4F4F5');
      root.style.setProperty('--primary-glow', isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.08)');
      root.style.setProperty('--md-sys-color-primary', isDark ? '#FFFFFF' : '#09090B');
      root.style.setProperty('--md-sys-color-on-primary', isDark ? '#09090B' : '#FFFFFF');
    } else {
      root.style.setProperty('--clinic-primary', primary);
      root.style.setProperty('--clinic-primary-hover', primary);
      root.style.setProperty('--clinic-primary-light', `${primary}18`);
      root.style.setProperty('--clinic-primary-glow', `${primary}33`);
      root.style.setProperty('--clinic-gradient-primary', `linear-gradient(135deg, ${primary} 0%, ${primary}E6 100%)`);
      root.style.setProperty('--clinic-on-primary', '#FFFFFF');
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--primary-hover', primary);
      root.style.setProperty('--primary-light', `${primary}18`);
      root.style.setProperty('--primary-glow', `${primary}33`);
      root.style.setProperty('--md-sys-color-primary', primary);
      root.style.setProperty('--md-sys-color-on-primary', '#FFFFFF');
    }

    if (branding?.accentColor) {
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

      const savedUserStr = sessionStorage.getItem('clinicflow_auth_user') || localStorage.getItem('clinicflow_auth_user');
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

  // 7. Update Tenant Custom Domain
  const updateTenantDomain = useCallback((clinicIdOrSlug, newDomain) => {
    const cleanDomain = newDomain ? newDomain.toLowerCase().trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '') : '';
    setAllTenants(prev => prev.map(t => {
      if (t.id === clinicIdOrSlug || t.slug === clinicIdOrSlug) {
        return {
          ...t,
          customDomain: cleanDomain || undefined,
          custom_domain: cleanDomain || undefined
        };
      }
      return t;
    }));
    setActiveTenant(prev => {
      if (prev && (prev.id === clinicIdOrSlug || prev.slug === clinicIdOrSlug)) {
        return {
          ...prev,
          customDomain: cleanDomain || undefined,
          custom_domain: cleanDomain || undefined
        };
      }
      return prev;
    });
  }, []);

  // 8. Delete Tenant Permanently
  const deleteTenant = useCallback((clinicIdOrSlug) => {
    deleteRegisteredTenant(clinicIdOrSlug);
    setAllTenants(prev => prev.filter(t => t.id !== clinicIdOrSlug && t.slug !== clinicIdOrSlug));
    setActiveTenant(prev => {
      if (prev && (prev.id === clinicIdOrSlug || prev.slug === clinicIdOrSlug)) {
        const remaining = allTenants.filter(t => t.id !== clinicIdOrSlug && t.slug !== clinicIdOrSlug);
        return remaining[0] || null;
      }
      return prev;
    });
  }, [allTenants]);

  // 9. Update Tenant Profile & Branding Info Live
  const updateTenantInfo = useCallback((updatedInfo) => {
    if (!updatedInfo) return;
    const targetId = updatedInfo.id || activeTenant?.id;
    const targetSlug = updatedInfo.slug || activeTenant?.slug;

    setAllTenants(prev => prev.map(t => {
      if ((targetId && t.id === targetId) || (targetSlug && t.slug === targetSlug)) {
        return { ...t, ...updatedInfo };
      }
      return t;
    }));

    setActiveTenant(prev => {
      if (prev && ((targetId && prev.id === targetId) || (targetSlug && prev.slug === targetSlug))) {
        const merged = { ...prev, ...updatedInfo };
        applyBranding(merged?.branding);
        return merged;
      }
      return prev;
    });

    try {
      const stored = localStorage.getItem('clinicflow_registered_tenants');
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex(t => (targetId && t.id === targetId) || (targetSlug && t.slug === targetSlug));
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...updatedInfo };
          localStorage.setItem('clinicflow_registered_tenants', JSON.stringify(list));
        }
      }
    } catch (_) {}
  }, [activeTenant]);

  // 10. Feature Gating & Quota Checks
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
    deleteTenant,
    updateTenantInfo,
    updateTenantStatus,
    updateTenantDomain,
    hasFeature,
    checkQuota,
    tier: activeTenant?.subscriptionTier || 'pro',
    isMultiTenant: true
  }), [activeTenant, resolveTenantSlug, isolatedTenantsCatalog, dedicatedDomainActive, isLoadingTenant, switchTenant, registerNewTenant, deleteTenant, updateTenantInfo, updateTenantStatus, updateTenantDomain, hasFeature, checkQuota]);

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
