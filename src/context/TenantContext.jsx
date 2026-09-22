import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useInRouterContext } from 'react-router-dom';
import { demoClinics as fallbackDemoClinics } from '../data/demoData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fromDbClinic, getAllClinicsFromDb } from '../services/clinicsService';
import { canSwitchTenants } from '../utils/permissions';
import { patientIndex } from '../services/indexedSearchService';
import { getRegisteredTenants, saveRegisteredTenant, updateClinicSubscriptionStatus, deleteRegisteredTenant } from '../services/authService';
import { getClinicDomainSettings } from '../services/customDomainService';
import { safeGetItem, safeGetJSON, safeSetJSON, safeSessionGetJSON } from '../utils/safeStorage';

const TenantContext = createContext(null);

// Fallback seed clinics: zero demo clinics in production
const initialClinics = [];

export function getCombinedTenants(forceRefresh = true) {
  const registered = getRegisteredTenants(forceRefresh);

  // Enrich with custom domain settings saved via CustomDomainTab
  return registered.map(tenant => {
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
 *  6. Default fallback -> isDedicatedDomain: false
 */
export function resolveTenantFromLocation(
  tenants = [],
  locationObj = (typeof window !== 'undefined' ? window.location : null)
) {
  if (!locationObj) {
    const defaultClinic = tenants?.[0] || null;
    return {
      slug: defaultClinic?.slug || '',
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
  const saved = safeGetItem('clinicflow_active_tenant_slug');
  if (saved) {
    const savedSlug = saved.toLowerCase().trim();
    const match = (tenants || []).find(t => t.slug?.toLowerCase() === savedSlug || t.id === savedSlug);
    return {
      slug: savedSlug,
      isDedicatedDomain: false,
      tenant: match || null
    };
  }

  // 6. Fallback
  const defaultFallback = (tenants && tenants[0]) ? tenants[0] : null;
  return {
    slug: defaultFallback?.slug || '',
    isDedicatedDomain: false,
    tenant: defaultFallback
  };
}

/**
 * Returns whether current or given location is a dedicated domain / subdomain
 */
export function isDedicatedDomain(
  locationObj = (typeof window !== 'undefined' ? window.location : null),
  tenants = []
) {
  return resolveTenantFromLocation(tenants, locationObj).isDedicatedDomain;
}

export function applyTenantBranding(branding) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = branding?.primaryColor || '#09090B';
  const accent = branding?.accentColor || '#10B981';
  const isMonochrome = !primary || primary === 'monochrome' || primary === '#000000' || primary === '#09090B' || primary === '#18181B';
  const isDark = root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark';

  // 1. Degree 1: Primary Brand Tone
  if (isMonochrome) {
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

  // 2. Degree 2: Accent / Secondary Tone
  root.style.setProperty('--clinic-accent', accent);
  root.style.setProperty('--clinic-accent-hover', accent);
  root.style.setProperty('--clinic-accent-light', `${accent}18`);
  root.style.setProperty('--clinic-accent-glow', `${accent}33`);
  root.style.setProperty('--clinic-on-accent', '#FFFFFF');
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-hover', accent);
  root.style.setProperty('--accent-light', `${accent}18`);
  root.style.setProperty('--accent-glow', `${accent}33`);

  // 3. Degree 3: Neutral Surface & Harmonic Borders
  const surface = branding?.surfaceColor || (isDark ? '#18181B' : '#FFFFFF');
  const bgSubtle = isDark ? '#09090B' : '#F8FAFC';
  const borderSubtle = isDark ? '#27272A' : '#E2E8F0';

  root.style.setProperty('--clinic-surface', surface);
  root.style.setProperty('--clinic-bg-subtle', bgSubtle);
  root.style.setProperty('--clinic-border-subtle', borderSubtle);
  root.style.setProperty('--clinic-ring', accent);
}

const LocationBridge = ({ onPathChange }) => {
  const location = useLocation();
  useEffect(() => {
    if (location?.pathname) {
      onPathChange(location.pathname);
    }
  }, [location?.pathname, onPathChange]);
  return null;
};

export const TenantProvider = ({ children }) => {
  const inRouter = useInRouterContext();
  const [currentPath, setCurrentPath] = useState(() => 
    typeof window !== 'undefined' ? window.location.pathname : ''
  );
  const applyBranding = applyTenantBranding;
  const [allTenants, setAllTenants] = useState(() => getCombinedTenants(true));
  const initialResolution = useMemo(() => resolveTenantFromLocation(allTenants), [allTenants]);
  const [activeTenant, setActiveTenant] = useState(initialResolution.tenant || allTenants[0] || null);
  const [dedicatedDomainActive, setDedicatedDomainActive] = useState(initialResolution.isDedicatedDomain);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);

  // Expose immediate force-refresh helper for tenants directory
  const refreshTenants = useCallback(() => {
    const fresh = getCombinedTenants(true);
    setAllTenants(fresh);
    return fresh;
  }, []);

  // 1. Cross-tab and Broadcast Synchronization (Multi-window & Multi-tab reactivity)
  useEffect(() => {
    const handleSync = () => {
      const fresh = getCombinedTenants(true);
      setAllTenants(fresh);
    };

    const handleStorageChange = (e) => {
      if (!e || e.key === 'clinicflow_registered_tenants' || e.key === 'clinicflow_active_tenant_slug' || e.key === 'clinicflow_registered_users' || e.key === 'clinicflow_auth_user') {
        handleSync();
      }
    };

    let channel = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('clinicflow_tenants_sync');
        channel.onmessage = () => {
          handleSync();
        };
      } catch (channelErr) {
        console.warn('[TenantContext] BroadcastChannel init warning:', channelErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('focus', handleSync);
      window.addEventListener('clinicflow_sync', handleSync);
      document.addEventListener('visibilitychange', handleSync);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('focus', handleSync);
        window.removeEventListener('clinicflow_sync', handleSync);
        document.removeEventListener('visibilitychange', handleSync);
      }
      if (channel) {
        try { channel.close(); } catch (_) {}
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
      if (!match) match = locationResolution.tenant || currentCombined[0] || null;
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
    const fallback = locationResolution.tenant || allTenants[0] || null;
    setActiveTenant(fallback);
    applyBranding(fallback?.branding);
    setIsLoadingTenant(false);
    return fallback;
  }, [allTenants]);

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

      const currentUser = safeSessionGetJSON('clinicflow_auth_user') || safeGetJSON('clinicflow_auth_user');
      if (currentUser) {
        const canSwitch = canSwitchTenants(currentUser, currentPath, dedicatedDomainActive);
        if (!canSwitch) {
          const userAllowedSlug = currentUser.allowedClinics?.[0] || currentUser.clinicSlug || currentUser.clinicId;
          if (slugOrId && slugOrId !== userAllowedSlug && slugOrId !== currentUser.clinicId) {
            console.warn(`[Tenant Isolation Enforcement] Tenant switch blocked: User is restricted to clinic '${userAllowedSlug}'`);
            return false;
          }
        }
      }
    } catch (parseErr) {
      console.warn('[TenantContext] Error verifying user permissions for switchTenant:', parseErr);
    }

    patientIndex.clearIndex();
    return loadTenant(slugOrId);
  }, [dedicatedDomainActive, loadTenant]);

  // 5. Register and Bind New Tenant dynamically
  const registerNewTenant = useCallback((newTenant) => {
    if (!newTenant) return;
    saveRegisteredTenant(newTenant);
    const freshCombined = getCombinedTenants(true);
    setAllTenants(freshCombined);
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

    const storedList = safeGetJSON('clinicflow_registered_tenants');
    if (storedList && Array.isArray(storedList)) {
      const idx = storedList.findIndex(t => (targetId && t.id === targetId) || (targetSlug && t.slug === targetSlug));
      if (idx >= 0) {
        storedList[idx] = { ...storedList[idx], ...updatedInfo };
        safeSetJSON('clinicflow_registered_tenants', storedList);
      }
    }
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

  const isSuperAdminRoute = useMemo(() => {
    const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');
    return path.startsWith('/super-admin') ||
      path.startsWith('/superadmin') ||
      path.startsWith('/saas') ||
      path.startsWith('/admin') ||
      path.startsWith('/control-plane');
  }, [currentPath]);

  const isolatedTenantsCatalog = useMemo(() => {
    const storedUser = safeSessionGetJSON('clinicflow_auth_user') || safeGetJSON('clinicflow_auth_user');
    const isSuperUser = storedUser?.role === 'super_admin' || storedUser?.isSuperAdmin === true;

    if (isSuperAdminRoute || isSuperUser) {
      return allTenants;
    }

    if (dedicatedDomainActive) {
      return activeTenant ? [activeTenant] : allTenants.slice(0, 1);
    }
    return allTenants;
  }, [dedicatedDomainActive, isSuperAdminRoute, activeTenant, allTenants]);

  const value = useMemo(() => ({
    tenant: activeTenant,
    tenantSlug: activeTenant?.slug || '',
    resolveTenantSlug,
    allTenants: (isSuperAdminRoute ? allTenants : isolatedTenantsCatalog),
    rawAllTenants: allTenants,
    setAllTenants,
    refreshTenants,
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
  }), [activeTenant, resolveTenantSlug, isSuperAdminRoute, allTenants, isolatedTenantsCatalog, refreshTenants, dedicatedDomainActive, isLoadingTenant, switchTenant, registerNewTenant, deleteTenant, updateTenantInfo, updateTenantStatus, updateTenantDomain, hasFeature, checkQuota]);

  return (
    <TenantContext.Provider value={value}>
      {inRouter && <LocationBridge onPathChange={setCurrentPath} />}
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
