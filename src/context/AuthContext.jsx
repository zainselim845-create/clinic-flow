import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fromDbClinic, findClinicByEmailOrIdentifier } from '../services/clinicsService';
import { 
  registerDoctorAndClinic, 
  authenticateUser, 
  getRegisteredTenants, 
  saveRegisteredTenant, 
  slugifyClinic,
  completeClinicOnboarding,
  saveRegisteredUser,
  syncTenantsFromCloud,
  syncTenantAndUserToCloud
} from '../services/authService';
import { recordAuditEvent, AUDIT_EVENT_TYPES } from '../services/auditLoggerService';
import { 
  safeGetItem, 
  safeSetItem, 
  safeRemoveItem, 
  safeSetJSON, 
  safeSessionGetJSON, 
  safeSessionSetJSON, 
  safeSessionRemoveItem,
  safeSessionSetItem
} from '../utils/safeStorage';
import TenantContext from './TenantContext';
import { canAccess, CLINIC_PERMISSIONS, CLINIC_ROLE_PERMISSIONS } from '../services/organizationService';

const AuthContext = createContext({});

const failedLoginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for regular users
const SESSION_TTL_SUPER_ADMIN_MS = 2 * 60 * 60 * 1000; // 2 hours for super admin

function checkLoginRateLimit(identifier) {
  const record = failedLoginAttempts.get(identifier);
  if (!record) return null;
  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return `تم حظر محاولات تسجيل الدخول مؤقتاً لحماية الحساب. يرجى الانتظار ${remainingSec} ثانية.`;
  }
  if (record.lockedUntil && now >= record.lockedUntil) {
    failedLoginAttempts.delete(identifier);
  }
  return null;
}

function recordFailedLogin(identifier) {
  const now = Date.now();
  const record = failedLoginAttempts.get(identifier) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOGIN_LOCKOUT_MS;
  }
  failedLoginAttempts.set(identifier, record);
}

function resetFailedLogin(identifier) {
  failedLoginAttempts.delete(identifier);
}

export const AuthProvider = ({ children }) => {
  const tenantContext = useContext(TenantContext);
  const activeTenant = tenantContext?.tenant;
  const switchTenant = tenantContext?.switchTenant;
  const registerNewTenant = tenantContext?.registerNewTenant;

  const getInitialUser = () => {
    try {
      const saved = localStorage.getItem('clinicflow_auth_user') || sessionStorage.getItem('clinicflow_auth_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object') return null;

      // Reject and purge any legacy demo accounts
      const email = (parsed.email || '').toLowerCase().trim();
      const id = parsed.id || '';
      const legacyDemoEmails = [
        'doctor@clinicflow.com',
        'sara.clinic@clinicflow.com',
        'owner@clinicflow.com',
        'reception@clinicflow.com',
        'admin@clinicflow.com'
      ];
      const legacyDemoIds = [
        'doc-master',
        'doc-sara-master',
        'user-multi-clinic-owner',
        'staff-reception-master',
        'admin-master'
      ];

      if (legacyDemoIds.includes(id) || legacyDemoEmails.includes(email)) {
        localStorage.removeItem('clinicflow_auth_user');
        sessionStorage.removeItem('clinicflow_auth_user');
        return null;
      }

      // Anti-Tampering Check for Super Admin Privileges:
      // Prevent local privilege escalation via localStorage manipulation.
      if (parsed.role === 'super_admin' || parsed.isSuperAdmin) {
        const isValidSuperAdmin = email === 'superadmin@clinicflow.com' || 
          parsed.id === 'user-superadmin-master' || 
          parsed.id === 'superadmin-root' || 
          parsed.authProvider === 'supabase';
        if (!isValidSuperAdmin) {
          console.warn('[Security Guard] Unauthorized role escalation attempt detected and neutralized.');
          parsed.role = 'doctor';
          parsed.isSuperAdmin = false;
        }
      }

      // Session TTL Enforcement: auto-expire stale sessions
      // Super Admin: 2 hours, Regular users: 24 hours
      if (parsed.authenticatedAt) {
        const sessionAgeMs = Date.now() - new Date(parsed.authenticatedAt).getTime();
        const isSuperUser = parsed.role === 'super_admin' || parsed.isSuperAdmin;
        const maxSessionMs = isSuperUser ? SESSION_TTL_SUPER_ADMIN_MS : SESSION_TTL_MS;
        if (sessionAgeMs > maxSessionMs) {
          console.warn('[Session Guard] Session expired after', Math.round(sessionAgeMs / 3600000), 'hours. Auto-logout enforced.');
          localStorage.removeItem('clinicflow_auth_user');
          sessionStorage.removeItem('clinicflow_auth_user');
          localStorage.removeItem('clinicflow_role');
          return null;
        }
      }

      return parsed;
    } catch {
      return null;
    }
  };

  const persistUser = (userData) => {
    if (userData) {
      // Stamp session creation time for TTL enforcement on next load
      if (!userData.authenticatedAt) {
        userData.authenticatedAt = new Date().toISOString();
      }
      safeSetJSON('clinicflow_auth_user', userData);
      safeSessionSetJSON('clinicflow_auth_user', userData);
      saveRegisteredUser(userData);
      recordAuditEvent({
        eventType: AUDIT_EVENT_TYPES.USER_LOGIN,
        user: userData.name || userData.email || 'مستخدم النظام',
        action: 'تسجيل دخول للنظام',
        details: `تم تسجيل الدخول بصلاحية ${userData.role || 'طبيب'} في العيادة ${userData.clinicSlug || 'الافتراضية'}`,
        entityId: userData.id || '',
        entityType: 'auth'
      });
    } else {
      safeRemoveItem('clinicflow_auth_user');
      safeSessionRemoveItem('clinicflow_auth_user');
    }
  };

  const [user, setUser] = useState(getInitialUser);

  const [session, setSession] = useState(null);
  const [clinic, setClinic] = useState(activeTenant || null);
  const [loading, setLoading] = useState(false);

  // SaaS Impersonation State: track original superadmin across sessions
  const [impersonatorAdmin, setImpersonatorAdmin] = useState(() => {
    return safeSessionGetJSON('clinicflow_impersonator_admin', null);
  });

  const isImpersonating = Boolean(impersonatorAdmin);

  const stopImpersonating = () => {
    if (impersonatorAdmin) {
      persistUser(impersonatorAdmin);
      setUser(impersonatorAdmin);
      setRole(impersonatorAdmin.role || 'super_admin');
      safeSetItem('clinicflow_role', impersonatorAdmin.role || 'super_admin');
      setImpersonatorAdmin(null);
      safeSessionRemoveItem('clinicflow_impersonator_admin');
    }
  };

  const [role, setRole] = useState(() => {
    const savedUser = getInitialUser();
    if (savedUser) {
      return savedUser.role || 'doctor';
    }
    const storedRole = safeGetItem('clinicflow_role');
    if (storedRole === 'super_admin') {
      return 'doctor'; // Deny bare string tampering unless authenticated user object exists
    }
    return storedRole || 'doctor';
  });
  
  const isDemoMode = !isSupabaseConfigured();

  // Safe storage isolation: keep tenant data scoped without wiping coexisting clinics
  const isolateTenantStorage = (_activeSlug) => {
    // Intentionally non-destructive: scoped keys (clinicflow_data_{slug}) coexist safely
  };

  // Keep clinic info aligned with active tenant
  useEffect(() => {
    if (activeTenant) {
      setClinic(activeTenant);
    }
  }, [activeTenant]);

  const switchRole = (newRole) => {
    setRole(newRole);
    localStorage.setItem('clinicflow_role', newRole);
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      persistUser(updatedUser);
    }
  };

  const fetchClinic = useCallback(async (userId, userEmail) => {
    try {
      let query = supabase.from('clinics').select('*');
      const cleanEmail = (userEmail || '').trim().toLowerCase();
      if (userId && cleanEmail) {
        query = query.or(`owner_id.eq.${userId},doctor_email.ilike.${cleanEmail}`);
      } else if (userId) {
        query = query.eq('owner_id', userId);
      } else if (cleanEmail) {
        query = query.ilike('doctor_email', cleanEmail);
      }
      const { data, error } = await query.limit(1).maybeSingle();
        
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        const tenantData = fromDbClinic(data);
        tenantData.isOnboardingCompleted = true;
        setClinic(tenantData);
        saveRegisteredTenant(tenantData);
      }
    } catch (error) {
      console.warn('[AuthContext] Notice fetching clinic:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      const saved = getInitialUser();
      if (saved) {
        setUser(saved);
        setRole(saved.role || 'doctor');
      }
      setLoading(false);
      return;
    }

    // Get initial Supabase session
    if (supabase?.auth?.getSession) {
      supabase.auth.getSession()
        .then(({ data: { session } = {} }) => {
          setSession(session);
          if (session?.user) {
            setUser(session.user);
            fetchClinic(session.user.id, session.user.email);
          } else {
            const saved = getInitialUser();
            if (saved) {
              setUser(saved);
              setRole(saved.role || 'doctor');
            }
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to get Supabase session:', err);
          const saved = getInitialUser();
          if (saved) {
            setUser(saved);
            setRole(saved.role || 'doctor');
          }
          setLoading(false);
        });
    } else {
      const saved = getInitialUser();
      if (saved) {
        setUser(saved);
        setRole(saved.role || 'doctor');
      }
      setLoading(false);
    }

    // Listen for auth changes
    let subscription = null;
    if (supabase?.auth?.onAuthStateChange) {
      const authListener = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        if (session?.user) {
          setUser(session.user);
          fetchClinic(session.user.id, session.user.email);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          persistUser(null);
          setLoading(false);
        } else {
          const saved = getInitialUser();
          if (saved) {
            setUser(saved);
            setRole(saved.role || 'doctor');
          }
          setLoading(false);
        }
      });
      subscription = authListener?.data?.subscription;
    }

    return () => subscription?.unsubscribe?.();
  }, [isDemoMode, fetchClinic]);

  const signIn = async (identifier, password) => {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanId || !cleanPass) {
      return { data: null, error: new Error('يرجى إدخال البريد الإلكتروني أو الهاتف وكلمة المرور.') };
    }

    // Rate Limiting & Brute-Force Defense (OWASP A07)
    const rateLimitError = checkLoginRateLimit(cleanId);
    if (rateLimitError) {
      return { data: null, error: new Error(rateLimitError) };
    }

    // Priority 0: Check Super Admin Master Login
    if (cleanId === 'superadmin@clinicflow.com' || cleanId === 'superadmin' || cleanId === 'super_admin') {
      const configuredSecret = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPER_ADMIN_SECRET) || '';
      const isTestEnv = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') || 
                        (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test');
      // Security: Super Admin password MUST come from environment variable.
      // No hardcoded fallback in production. Test env allows 'admin' for automated suites.
      const isMasterPass = configuredSecret
        ? cleanPass === configuredSecret
        : (isTestEnv && cleanPass === 'admin');

      if (!isMasterPass) {
        recordFailedLogin(cleanId);
        return { data: null, error: new Error('كلمة المرور غير صحيحة لحساب مدير المنصة العام.') };
      }
      resetFailedLogin(cleanId);
      const superAdminUser = {
        id: 'user-superadmin-master',
        name: 'مدير المنصة العام (Super Admin)',
        email: 'superadmin@clinicflow.com',
        role: 'super_admin',
        isSuperAdmin: true,
        jobTitle: 'مدير عام المنصة والسحابة السريرية',
        allowedClinics: ['*'],
        authenticatedAt: new Date().toISOString()
      };
      persistUser(superAdminUser);
      localStorage.setItem('clinicflow_role', 'super_admin');
      setUser(superAdminUser);
      setRole('super_admin');
      return { data: { user: superAdminUser }, error: null };
    }

    // Priority 1: Authenticate against registered users & custom tenants
    try {
      let authUser = authenticateUser(cleanId, cleanPass);

      // On new device / incognito / empty local storage: sync from cloud if user was not found locally
      if (!authUser) {
        try {
          await syncTenantsFromCloud();
          authUser = authenticateUser(cleanId, cleanPass);
        } catch (syncErr) {
          console.warn('[AuthContext] Cloud sync notice during signIn:', syncErr);
        }
      }

      // If still not found and Supabase is configured, check Supabase clinics directly
      if (!authUser && isSupabaseConfigured()) {
        try {
          const { data: cloudClinic } = await findClinicByEmailOrIdentifier(cleanId);
          if (cloudClinic) {
            const tenantObj = { ...cloudClinic, isOnboardingCompleted: true };
            saveRegisteredTenant(tenantObj);
            authUser = authenticateUser(cleanId, cleanPass);
          }
        } catch (dbErr) {
          console.warn('[AuthContext] Direct clinic DB lookup notice during signIn:', dbErr);
        }
      }

      if (authUser) {
        if (authUser.clinicSlug && authUser.clinicSlug !== '*') {
          authUser.needsOnboarding = false;
          authUser.isOnboardingCompleted = true;
        }
        persistUser(authUser);
        localStorage.setItem('clinicflow_role', authUser.role || 'doctor');
        setUser(authUser);
        setRole(authUser.role || 'doctor');
        if (authUser.clinicSlug) {
          switchTenant?.(authUser.clinicSlug);
          if (authUser.role !== 'super_admin' && authUser.role !== 'multi_clinic_owner') {
            isolateTenantStorage(authUser.clinicSlug);
          }
        }
        resetFailedLogin(cleanId);
        return { data: { user: authUser }, error: null };
      }
    } catch (authErr) {
      recordFailedLogin(cleanId);
      if (authErr.message && !authErr.message.includes('يرجى إدخال')) {
        return { data: null, error: authErr };
      }
    }

    if (isDemoMode) {
      recordFailedLogin(cleanId);
      return {
        data: null,
        error: new Error('بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني أو الهاتف وكلمة المرور أو إنشاء حساب جديد.')
      };
    }

    // Live Supabase Authentication
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password
      });
      if (error) throw error;
      resetFailedLogin(cleanId);
      return { data, error: null };
    } catch (error) {
      // Fallback: If Supabase connection fails or user is registered locally
      try {
        const fallbackUser = authenticateUser(cleanId, cleanPass);
        if (fallbackUser) {
          persistUser(fallbackUser);
          safeSetItem('clinicflow_role', fallbackUser.role || 'doctor');
          setUser(fallbackUser);
          setRole(fallbackUser.role || 'doctor');
          resetFailedLogin(cleanId);
          return { data: { user: fallbackUser }, error: null };
        }
      } catch (fallbackErr) {
        console.warn('[AuthContext] Local authentication fallback error:', fallbackErr);
      }
      recordFailedLogin(cleanId);
      return { data: null, error };
    }
  };

  const loginWithGoogleProfile = async (googleProfile, desiredRole = 'doctor') => {
    if (!googleProfile || !googleProfile.email) {
      throw new Error('بيانات حساب Google غير مكتملة.');
    }

    const assignedRole = desiredRole || 'doctor';
    const cleanEmail = googleProfile.email.toLowerCase().trim();

    // 1. Check local registered tenants
    let existingTenants = getRegisteredTenants();
    let userTenant = existingTenants.find(t => 
      (t.doctorEmail && t.doctorEmail.toLowerCase() === cleanEmail) ||
      (t.email && t.email.toLowerCase() === cleanEmail) ||
      (googleProfile.sub && t.ownerId === googleProfile.sub)
    );

    // 2. If not found locally, sync from cloud storage registry (/api/sync-tenants & CDN)
    if (!userTenant) {
      try {
        const synced = await syncTenantsFromCloud();
        if (Array.isArray(synced)) {
          userTenant = synced.find(t => 
            (t.doctorEmail && t.doctorEmail.toLowerCase() === cleanEmail) ||
            (t.email && t.email.toLowerCase() === cleanEmail) ||
            (googleProfile.sub && t.ownerId === googleProfile.sub)
          );
        }
      } catch (err) {
        console.warn('[AuthContext] syncTenantsFromCloud notice in Google login:', err);
      }
    }

    // 3. If still not found and Supabase is configured, check database clinics directly
    if (!userTenant && isSupabaseConfigured()) {
      try {
        const { data: cloudClinic } = await findClinicByEmailOrIdentifier(cleanEmail);
        if (cloudClinic) {
          userTenant = {
            ...cloudClinic,
            doctorEmail: cloudClinic.doctorEmail || cleanEmail,
            ownerId: googleProfile.sub || null,
            isOnboardingCompleted: true
          };
          saveRegisteredTenant(userTenant);
        }
      } catch (err) {
        console.warn('[AuthContext] Supabase clinic lookup notice:', err);
      }
    }

    // 4. Determine if clinic is already established
    const hasExistingClinic = Boolean(
      userTenant &&
      userTenant.name &&
      userTenant.slug &&
      userTenant.slug !== ''
    );

    // An existing clinic NEVER needs onboarding and is NEVER a new user
    const isNewUser = !userTenant && !hasExistingClinic;
    const needsOnboarding = assignedRole !== 'super_admin' && isNewUser;

    // 5. Auto-provision draft ONLY IF user has NO existing clinic and is NOT super_admin
    if (!userTenant && !hasExistingClinic && assignedRole !== 'super_admin') {
      const docRawName = googleProfile.name || cleanEmail.split('@')[0];
      const doctorDisplayName = docRawName.startsWith('د.') ? docRawName : `د. ${docRawName}`;
      const clinicDisplayName = `عيادة ${doctorDisplayName}`;
      const clinicSlug = slugifyClinic(docRawName);

      userTenant = {
        id: `clinic-${googleProfile.sub || Date.now()}`,
        slug: clinicSlug,
        name: clinicDisplayName,
        doctorName: doctorDisplayName,
        doctorEmail: cleanEmail,
        ownerId: googleProfile.sub || null,
        specialty: 'طب وجراحة الفم والأسنان العام',
        address: 'القاهرة، جمهورية مصر العربية',
        phone: '',
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        isOnboardingCompleted: true,
        branding: {
          primaryColor: '#09090B',
          accentColor: '#10B981',
          badgeText: 'العيادة الخاصة'
        }
      };

      saveRegisteredTenant(userTenant);
      if (registerNewTenant) {
        registerNewTenant(userTenant);
      }
    }

    // Ensure existing tenant is explicitly marked as onboarding completed
    if (userTenant) {
      userTenant.isOnboardingCompleted = true;
      saveRegisteredTenant(userTenant);
    }

    const currentSlug = userTenant?.slug || (assignedRole === 'super_admin' ? '*' : '');
    const currentId = userTenant?.id || (assignedRole === 'super_admin' ? 'superadmin-root' : (currentSlug ? `clinic-${currentSlug}` : ''));

    const docRawName = googleProfile.name || cleanEmail.split('@')[0];
    const doctorDisplayName = (assignedRole === 'doctor' && !docRawName.startsWith('د.')) 
      ? `د. ${docRawName}` 
      : docRawName;

    const realUser = {
      id: googleProfile.sub || googleProfile.id || `google-${Date.now()}`,
      email: cleanEmail,
      name: doctorDisplayName,
      avatar: googleProfile.picture || null,
      role: assignedRole,
      jobTitle: assignedRole === 'super_admin' 
        ? 'مدير عام المنصة (Google Verified)'
        : assignedRole === 'staff'
        ? 'سكرتارية واستقبال العيادة (Google Verified)'
        : (userTenant?.specialty || 'المدير الطبي / استشاري العيادة (Google Verified)'),
      clinicSlug: currentSlug,
      clinicId: currentId,
      allowedClinics: [currentSlug],
      authProvider: 'google',
      isEmailVerified: true,
      needsOnboarding: hasExistingClinic ? false : needsOnboarding,
      isOnboardingCompleted: hasExistingClinic ? true : !needsOnboarding
    };

    persistUser(realUser);
    saveRegisteredUser(realUser);
    if (userTenant) {
      await syncTenantAndUserToCloud(userTenant, realUser);
    }
    localStorage.setItem('clinicflow_role', realUser.role);
    setUser(realUser);
    setRole(realUser.role);
    if (userTenant?.slug) {
      setClinic(userTenant);
      localStorage.setItem('clinicflow_active_tenant_slug', userTenant.slug);
      switchTenant?.(userTenant.slug);
    } else if (realUser.clinicSlug && realUser.clinicSlug !== '*' && activeTenant?.slug !== realUser.clinicSlug) {
      switchTenant?.(realUser.clinicSlug);
    }
    if (realUser.role !== 'super_admin' && realUser.clinicSlug && realUser.clinicSlug !== '*') {
      isolateTenantStorage(realUser.clinicSlug);
    }

    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.USER_LOGIN,
      user: realUser.name,
      action: 'تسجيل دخول بحساب Google حقيقي',
      details: `تم تسجيل الدخول عبر Google بالحساب ${realUser.email} وتفعيل العيادة الخاصة ${userTenant?.name || currentSlug}`,
      entityId: realUser.id,
      entityType: 'auth'
    });

    return { data: { user: realUser, tenant: userTenant }, isNewUser, needsOnboarding: realUser.needsOnboarding, error: null };
  };

  const completeOnboarding = async (onboardingPayload) => {
    try {
      const result = completeClinicOnboarding({
        userId: user?.id,
        userEmail: user?.email,
        ...onboardingPayload
      });

      const updatedUser = {
        ...user,
        ...result.user,
        needsOnboarding: false,
        isOnboardingCompleted: true
      };

      persistUser(updatedUser);
      setUser(updatedUser);
      setClinic(result.tenant);

      if (registerNewTenant) {
        registerNewTenant(result.tenant);
      }
      if (result.tenant) {
        await syncTenantAndUserToCloud(result.tenant, updatedUser);
      }
      if (switchTenant && result.tenant?.slug) {
        switchTenant(result.tenant.slug);
      }
      if (result.tenant?.slug) {
        isolateTenantStorage(result.tenant.slug);
      }

      if (typeof document !== 'undefined' && result.tenant?.branding) {
        const root = document.documentElement;
        const pc = result.tenant.branding.primaryColor;
        const isMono = !pc || pc === 'monochrome' || pc === '#09090B' || pc === '#000000';
        const finalPrimary = isMono ? '#09090B' : pc;
        root.style.setProperty('--primary', finalPrimary);
        root.style.setProperty('--clinic-primary', finalPrimary);
        if (result.tenant.branding.accentColor) {
          root.style.setProperty('--accent', result.tenant.branding.accentColor);
        }
      }

      return { data: { user: updatedUser, tenant: result.tenant, staff: result.staff }, error: null };
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      return { data: null, error: err };
    }
  };

  const signUpDoctorAndClinic = async (formData) => {
    try {
      const { tenant, user: newUser } = registerDoctorAndClinic(formData);
      
      // CRITICAL: Await mandatory cloud push so account is immediately in the cloud registry
      await syncTenantAndUserToCloud(tenant, newUser);

      persistUser(newUser);
      setUser(newUser);
      setRole(newUser.role);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('clinicflow_role', newUser.role);
      }
      if (tenant?.slug) {
        setClinic(tenant);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('clinicflow_active_tenant_slug', tenant.slug);
        }
        if (registerNewTenant) {
          registerNewTenant(tenant);
        }
        if (switchTenant) {
          switchTenant(tenant.slug);
        }
        isolateTenantStorage(tenant.slug);
      }
      return { data: { user: newUser, tenant }, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signInWithGoogle = async (personaOrProfile = 'doctor') => {
    // If a real Google profile object was passed in:
    if (typeof personaOrProfile === 'object' && personaOrProfile?.email) {
      return loginWithGoogleProfile(personaOrProfile);
    }

    if (!isDemoMode && supabase?.auth?.signInWithOAuth) {
      try {
        const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent'
            }
          }
        });
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }

    const personaRole = typeof personaOrProfile === 'string' ? personaOrProfile : 'doctor';
    if (personaRole === 'superadmin' || personaRole === 'super_admin') {
      const superAdminUser = {
        id: 'user-superadmin-master',
        name: 'مدير المنصة العام (Super Admin)',
        email: 'superadmin@clinicflow.com',
        role: 'super_admin',
        isSuperAdmin: true,
        jobTitle: 'مدير عام المنصة والسحابة السريرية',
        allowedClinics: ['*'],
        authProvider: 'google',
        isEmailVerified: true,
        authenticatedAt: new Date().toISOString()
      };
      persistUser(superAdminUser);
      localStorage.setItem('clinicflow_role', 'super_admin');
      setUser(superAdminUser);
      setRole('super_admin');
      return { data: { user: superAdminUser }, error: null };
    }

    return {
      data: null,
      error: new Error('تسجيل الدخول عبر Google يتطلب اتصالاً مباشراً بالخدمة السحابية. يرجى تسجيل حساب طبيب جديد أو الدخول بالبريد الإلكتروني وكلمة المرور.')
    };
  };

  const signOut = async () => {
    if (user) {
      recordAuditEvent({
        eventType: AUDIT_EVENT_TYPES.USER_LOGOUT,
        user: user.name || user.email || 'مستخدم النظام',
        action: 'تسجيل خروج من النظام',
        details: `تسجيل خروج المستخدم ${user.name || user.email}`,
        entityId: user.id || '',
        entityType: 'auth'
      });
    }
    persistUser(null);
    localStorage.removeItem('clinicflow_role');
    sessionStorage.removeItem('clinicflow_role');
    safeSessionRemoveItem('clinicflow_impersonator_admin');
    setImpersonatorAdmin(null);
    setUser(null);
    setRole('doctor');
    setSession(null);
    if (!isDemoMode && supabase?.auth?.signOut) {
      await supabase.auth.signOut().catch(() => {});
    }
  };

  // Active session heartbeat: auto-evict expired sessions in open browser tabs
  useEffect(() => {
    if (!user) return;
    const checkExpiration = () => {
      const stored = safeSessionGetJSON('clinicflow_auth_user') || safeGetJSON('clinicflow_auth_user');
      if (!stored || !stored.authenticatedAt) return;
      const ageMs = Date.now() - new Date(stored.authenticatedAt).getTime();
      const isSuper = stored.role === 'super_admin' || stored.isSuperAdmin;
      const maxAge = isSuper ? SESSION_TTL_SUPER_ADMIN_MS : SESSION_TTL_MS;
      if (ageMs > maxAge) {
        console.warn('[AuthContext] Session expired via background timer, signing out');
        signOut();
      }
    };

    const interval = setInterval(checkExpiration, 60000);
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkExpiration();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [user]);

  const updateClinicInfo = (newInfo) => {
    setClinic(prev => ({ ...prev, ...newInfo }));
    if (user && role === 'doctor') {
      const updatedUser = {
        ...user,
        name: newInfo.doctorName || user.name,
        jobTitle: newInfo.specialty || user.jobTitle
      };
      setUser(updatedUser);
      persistUser(updatedUser);
    }
  };

  const impersonateUser = (targetUser) => {
    if (!targetUser) return;
    // Save current admin if we are super admin
    const currentAdmin = (user?.role === 'super_admin' || user?.isSuperAdmin) ? user : (impersonatorAdmin || {
      id: 'sa-root',
      email: 'superadmin@clinicflow.com',
      name: 'مدير المنصة العام',
      role: 'super_admin',
      isSuperAdmin: true,
      permissions: ['*'],
      clinicSlug: '*'
    });
    setImpersonatorAdmin(currentAdmin);
    safeSessionSetJSON('clinicflow_impersonator_admin', currentAdmin);

    persistUser(targetUser);
    safeSetItem('clinicflow_role', targetUser.role || 'doctor');
    setUser(targetUser);
    setRole(targetUser.role || 'doctor');
    if (targetUser.clinicSlug && targetUser.clinicSlug !== '*') {
      safeSetItem('clinicflow_current_tenant', targetUser.clinicSlug);
      safeSessionSetItem('clinicflow_current_tenant', targetUser.clinicSlug);
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('clinicflow:tenant-changed', { detail: targetUser.clinicSlug }));
        } catch (eventErr) {
          console.warn('[AuthContext] Tenant change event dispatch warning:', eventErr);
        }
      }
    }
  };

  const can = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.isSuperAdmin) return true;
    return canAccess(role || user.role, permission);
  }, [user, role]);

  const hasRole = useCallback((expectedRole) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.isSuperAdmin) return true;
    if (Array.isArray(expectedRole)) {
      return expectedRole.includes(role || user.role);
    }
    return (role || user.role) === expectedRole;
  }, [user, role]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      clinic,
      role,
      loading,
      switchRole,
      signIn,
      signInWithGoogle,
      loginWithGoogleProfile,
      signUpDoctorAndClinic,
      completeOnboarding,
      signOut,
      updateClinicInfo,
      impersonateUser,
      stopImpersonating,
      isImpersonating,
      isDemoMode,
      can,
      hasRole,
      CLINIC_PERMISSIONS,
      CLINIC_ROLE_PERMISSIONS
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
