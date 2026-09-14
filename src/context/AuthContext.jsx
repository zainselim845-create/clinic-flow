import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { clinicInfo as defaultClinicInfo, demoClinics, staffMembers as defaultStaffMembers, drSaraStaffMembers } from '../data/demoData';
import { fromDbClinic } from '../services/clinicsService';
import { 
  registerDoctorAndClinic, 
  authenticateUser, 
  getRegisteredTenants, 
  saveRegisteredTenant, 
  slugifyClinic,
  completeClinicOnboarding,
  saveRegisteredUser 
} from '../services/authService';
import { recordAuditEvent, AUDIT_EVENT_TYPES } from '../services/auditLoggerService';
import TenantContext from './TenantContext';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const tenantContext = useContext(TenantContext);
  const activeTenant = tenantContext?.tenant;
  const switchTenant = tenantContext?.switchTenant;
  const registerNewTenant = tenantContext?.registerNewTenant;

  const getInitialUser = () => {
    try {
      const saved = localStorage.getItem('clinicflow_auth_user') || sessionStorage.getItem('clinicflow_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const persistUser = (userData) => {
    if (userData) {
      try {
        localStorage.setItem('clinicflow_auth_user', JSON.stringify(userData));
        sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(userData));
        saveRegisteredUser(userData);
        recordAuditEvent({
          eventType: AUDIT_EVENT_TYPES.USER_LOGIN,
          user: userData.name || userData.email || 'مستخدم النظام',
          action: 'تسجيل دخول للنظام',
          details: `تم تسجيل الدخول بصلاحية ${userData.role || 'طبيب'} في العيادة ${userData.clinicSlug || 'الافتراضية'}`,
          entityId: userData.id || '',
          entityType: 'auth'
        });
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem('clinicflow_auth_user');
        sessionStorage.removeItem('clinicflow_auth_user');
      } catch (_) {}
    }
  };

  const [user, setUser] = useState(getInitialUser);

  const [session, setSession] = useState(null);
  const [clinic, setClinic] = useState(activeTenant || defaultClinicInfo);
  const [loading, setLoading] = useState(false);

  // SaaS Impersonation State: track original superadmin across sessions
  const [impersonatorAdmin, setImpersonatorAdmin] = useState(() => {
    try {
      const stored = sessionStorage.getItem('clinicflow_impersonator_admin');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });

  const isImpersonating = Boolean(impersonatorAdmin);

  const stopImpersonating = () => {
    if (impersonatorAdmin) {
      persistUser(impersonatorAdmin);
      setUser(impersonatorAdmin);
      setRole(impersonatorAdmin.role || 'super_admin');
      localStorage.setItem('clinicflow_role', impersonatorAdmin.role || 'super_admin');
      setImpersonatorAdmin(null);
      try {
        sessionStorage.removeItem('clinicflow_impersonator_admin');
      } catch (_) {}
    }
  };

  const [role, setRole] = useState(() => {
    const savedUser = getInitialUser();
    if (savedUser) {
      return savedUser.role || 'doctor';
    }
    return localStorage.getItem('clinicflow_role') || 'doctor';
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
          setUser(session?.user || null);
          if (session?.user) {
            fetchClinic(session.user.id);
          } else {
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to get Supabase session:', err);
          setLoading(false);
        });
    }

    // Listen for auth changes
    let subscription = null;
    if (supabase?.auth?.onAuthStateChange) {
      const authListener = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        if (session?.user) {
          fetchClinic(session.user.id);
        } else {
          setClinic(null);
          setLoading(false);
        }
      });
      subscription = authListener?.data?.subscription;
    }

    return () => subscription?.unsubscribe?.();
  }, [isDemoMode]);

  const fetchClinic = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('owner_id', userId)
        .single();
        
      if (error) throw error;
      setClinic(fromDbClinic(data));
    } catch (error) {
      console.error('Error fetching clinic:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (identifier, password) => {
    if (isDemoMode) {
      const cleanId = (identifier || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();
      const cleanPhoneInput = cleanId.replace(/\D/g, '');

      // Priority 0: Authenticate against registered users & custom tenants
      try {
        const authUser = authenticateUser(cleanId, cleanPass);
        if (authUser) {
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
          return { data: { user: authUser }, error: null };
        }
      } catch (authErr) {
        if (authErr.message && !authErr.message.includes('يرجى إدخال')) {
          return { data: null, error: authErr };
        }
      }

      // Read current state from localStorage or defaults
      let currentStaff = defaultStaffMembers;
      let currentClinic = activeTenant || defaultClinicInfo;
      try {
        const stored = localStorage.getItem('clinicflow_data');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.staffMembers) currentStaff = parsed.staffMembers;
          if (parsed.clinicInfo) currentClinic = parsed.clinicInfo;
        }
      } catch (e) {
        console.warn('Could not read stored staff from localStorage', e);
      }

      // 1. Check Super Admin Login
      if (cleanId === 'superadmin@clinicflow.com' || cleanId === 'superadmin' || cleanId === 'super_admin') {
        if (cleanPass !== 'admin') {
          return { data: null, error: new Error('كلمة المرور غير صحيحة لحساب مدير المنصة العام.') };
        }
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

      // 2. Check Multi-Clinic Owner Login
      if (cleanId === 'owner@clinicflow.com' || cleanId === 'multidoctor@clinicflow.com' || cleanId === 'owner') {
        if (cleanPass !== 'admin') {
          return { data: null, error: new Error('كلمة المرور غير صحيحة لحساب مالك مجمع العيادات.') };
        }
        const ownerUser = {
          id: 'user-multi-clinic-owner',
          name: 'د. شريف العوضي (مالك مجمع العيادات)',
          email: 'owner@clinicflow.com',
          role: 'multi_clinic_owner',
          jobTitle: 'مالك ومستثمر طبي — مجمع عيادات كلينيك فلو',
          allowedClinics: ['dr-ahmed', 'dr-sara'],
          clinicSlug: 'dr-ahmed',
          authenticatedAt: new Date().toISOString()
        };
        persistUser(ownerUser);
        localStorage.setItem('clinicflow_role', 'doctor');
        setUser(ownerUser);
        setRole('doctor');
        return { data: { user: ownerUser }, error: null };
      }

      // 3. Check Single-Clinic Doctor Logins across demoClinics
      // Match Dr. Sara
      if (cleanId === 'sara.clinic@clinicflow.com' || cleanId === 'dr-sara') {
        if (cleanPass !== 'admin') {
          return { data: null, error: new Error('كلمة المرور غير صحيحة لحساب د. سارة محمود.') };
        }
        const saraClinic = demoClinics.find(c => c.slug === 'dr-sara') || demoClinics[1];
        const saraDoctorUser = {
          id: 'doc-sara-master',
          name: saraClinic.doctorName || 'د. سارة محمود',
          email: 'sara.clinic@clinicflow.com',
          phone: saraClinic.phone || '01123456780',
          role: 'doctor',
          jobTitle: saraClinic.specialty || 'استشاري الأمراض الجلدية وتجميل الليزر والحقن التجميلي',
          clinicSlug: 'dr-sara',
          allowedClinics: ['dr-sara'],
          authenticatedAt: new Date().toISOString()
        };
        persistUser(saraDoctorUser);
        localStorage.setItem('clinicflow_role', 'doctor');
        setUser(saraDoctorUser);
        setRole('doctor');
        switchTenant?.('dr-sara');
        isolateTenantStorage('dr-sara');
        return { data: { user: saraDoctorUser }, error: null };
      }

      // Match Dr. Zain Selim
      if (cleanId === 'zainselim845@gmail.com' || cleanId === 'dr-zainselim845') {
        if (cleanPass !== 'admin') {
          return { data: null, error: new Error('كلمة المرور غير صحيحة لحساب د. zain selim.') };
        }
        const zainClinic = demoClinics.find(c => c.slug === 'dr-zainselim845') || demoClinics[2];
        const zainDoctorUser = {
          id: 'doc-zainselim-master',
          name: zainClinic?.doctorName || 'د. zain selim',
          email: 'zainselim845@gmail.com',
          phone: zainClinic?.phone || '01006285031',
          role: 'doctor',
          jobTitle: zainClinic?.specialty || 'استشاري طب وجراحة الأسنان',
          clinicSlug: 'dr-zainselim845',
          clinicName: zainClinic?.name || 'عيادة د. zain selim',
          allowedClinics: ['dr-zainselim845'],
          authenticatedAt: new Date().toISOString()
        };
        persistUser(zainDoctorUser);
        localStorage.setItem('clinicflow_role', 'doctor');
        setUser(zainDoctorUser);
        setRole('doctor');
        switchTenant?.('dr-zainselim845');
        isolateTenantStorage('dr-zainselim845');
        return { data: { user: zainDoctorUser }, error: null };
      }

      // Match Dr. Ahmed (Dental Doctor Master Login)
      const ahmedClinic = demoClinics.find(c => c.slug === 'dr-ahmed') || currentClinic || defaultClinicInfo;
      const doctorEmail = (ahmedClinic.doctorEmail || 'doctor@clinicflow.com').toLowerCase();
      const doctorPhone = (ahmedClinic.phone || '01006285031').replace(/\D/g, '');
      const isDoctorIdentifier = cleanId === doctorEmail || 
        cleanId === 'doctor' || 
        cleanId === 'admin' ||
        cleanId === 'dr-ahmed' ||
        (cleanPhoneInput && cleanPhoneInput.length >= 10 && cleanPhoneInput === doctorPhone);

      if (isDoctorIdentifier) {
        // In demo mode, require exact doctor admin password
        const isDemoDoctorPass = cleanPass === 'admin';
        if (!isDemoDoctorPass) {
          return {
            data: null,
            error: new Error('كلمة المرور غير صحيحة لحساب الطبيب.')
          };
        }

        const doctorUser = {
          id: 'doc-master',
          name: ahmedClinic.doctorName || 'د. أحمد الشريف',
          email: doctorEmail,
          phone: ahmedClinic.phone,
          role: 'doctor',
          jobTitle: ahmedClinic.specialty || 'المدير الطبي / استشاري طب وجراحة وتجميل الأسنان',
          clinicSlug: 'dr-ahmed',
          allowedClinics: ['dr-ahmed'],
          authenticatedAt: new Date().toISOString()
        };
        persistUser(doctorUser);
        localStorage.setItem('clinicflow_role', 'doctor');
        setUser(doctorUser);
        setRole('doctor');
        switchTenant?.('dr-ahmed');
        isolateTenantStorage('dr-ahmed');
        return { data: { user: doctorUser }, error: null };
      }

      // 4. Check Dedicated Receptionist & Staff Login
      if (cleanId === 'reception@clinicflow.com' || cleanId === 'staff@clinicflow.com' || cleanId === 'reception') {
        if (cleanPass !== '123') {
          return { data: null, error: new Error('كلمة المرور غير صحيحة لحساب موظف الاستقبال.') };
        }
        const receptionStaffUser = {
          id: 'staff-reception-master',
          name: 'سارة كمال (استقبال العيادة)',
          email: 'reception@clinicflow.com',
          phone: '01012345678',
          role: 'staff',
          jobTitle: 'سكرتارية واستقبال العيادة',
          permissions: ['appointments', 'patients', 'sms'],
          clinicSlug: 'dr-ahmed',
          allowedClinics: ['dr-ahmed'],
          authenticatedAt: new Date().toISOString()
        };
        persistUser(receptionStaffUser);
        localStorage.setItem('clinicflow_role', 'staff');
        setUser(receptionStaffUser);
        setRole('staff');
        switchTenant?.('dr-ahmed');
        isolateTenantStorage('dr-ahmed');
        return { data: { user: receptionStaffUser }, error: null };
      }

      // 5. Check Staff Members List
      const allStaff = [
        ...(Array.isArray(currentStaff) ? currentStaff : []),
        ...(Array.isArray(defaultStaffMembers) ? defaultStaffMembers : []),
        ...(Array.isArray(drSaraStaffMembers) ? drSaraStaffMembers : [])
      ];

      const matchedStaff = allStaff.find(s => {
        const staffEmail = (s.email || '').toLowerCase();
        const staffPhone = (s.phone || '').replace(/\D/g, '');
        return (cleanId === staffEmail || (cleanPhoneInput && cleanPhoneInput.length >= 10 && cleanPhoneInput === staffPhone)) && (s.password === cleanPass);
      });

      if (matchedStaff) {
        if (matchedStaff.status === 'inactive') {
          return { data: null, error: new Error('هذا الحساب معطل حالياً من قِبل إدارة العيادة.') };
        }
        const staffClinicSlug = matchedStaff.clinicSlug || 'dr-ahmed';
        const staffUser = {
          id: matchedStaff.id,
          name: matchedStaff.name,
          email: matchedStaff.email,
          phone: matchedStaff.phone,
          role: 'staff',
          jobTitle: matchedStaff.role || 'سكرتارية واستقبال العيادة',
          permissions: matchedStaff.permissions || ['appointments', 'patients', 'sms'],
          clinicSlug: staffClinicSlug,
          allowedClinics: [staffClinicSlug],
          authenticatedAt: new Date().toISOString()
        };
        persistUser(staffUser);
        localStorage.setItem('clinicflow_role', 'staff');
        setUser(staffUser);
        setRole('staff');
        switchTenant?.(staffClinicSlug);
        isolateTenantStorage(staffClinicSlug);
        return { data: { user: staffUser }, error: null };
      }

      return {
        data: null,
        error: new Error('بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني أو الهاتف وكلمة المرور.')
      };
    }

    // Live Supabase Authentication
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const loginWithGoogleProfile = async (googleProfile, desiredRole = 'doctor') => {
    if (!googleProfile || !googleProfile.email) {
      throw new Error('بيانات حساب Google غير مكتملة.');
    }

    const assignedRole = desiredRole || 'doctor';

    // 1. Check if a dedicated clinic tenant already exists for this Google user
    const existingTenants = getRegisteredTenants();
    let userTenant = existingTenants.find(t => 
      (t.doctorEmail && t.doctorEmail.toLowerCase() === googleProfile.email.toLowerCase()) ||
      (googleProfile.sub && t.ownerId === googleProfile.sub)
    );

    const isNewUser = !userTenant;
    const needsOnboarding = assignedRole !== 'super_admin' && (isNewUser || userTenant?.isOnboardingCompleted === false);

    // 2. If not, auto-provision a real, clean dedicated clinic draft for this doctor
    if (!userTenant && assignedRole !== 'super_admin') {
      const docRawName = googleProfile.name || googleProfile.email.split('@')[0];
      const doctorDisplayName = docRawName.startsWith('د.') ? docRawName : `د. ${docRawName}`;
      const clinicDisplayName = `عيادة ${doctorDisplayName}`;
      const clinicSlug = slugifyClinic(docRawName);

      userTenant = {
        id: `clinic-${googleProfile.sub || Date.now()}`,
        slug: clinicSlug,
        name: clinicDisplayName,
        doctorName: doctorDisplayName,
        doctorEmail: googleProfile.email.toLowerCase(),
        ownerId: googleProfile.sub || null,
        specialty: 'طب وجراحة الفم والأسنان العام',
        address: 'القاهرة، جمهورية مصر العربية',
        phone: '',
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        isOnboardingCompleted: false,
        branding: {
          primaryColor: '#0071E3',
          accentColor: '#10B981',
          badgeText: 'العيادة الخاصة'
        }
      };

      saveRegisteredTenant(userTenant);
      if (registerNewTenant) {
        registerNewTenant(userTenant);
      }
    }

    const currentSlug = userTenant?.slug || (assignedRole === 'super_admin' ? '*' : 'dr-ahmed');
    const currentId = userTenant?.id || (assignedRole === 'super_admin' ? 'superadmin-root' : '550e8400-e29b-41d4-a716-446655440000');

    const docRawName = googleProfile.name || googleProfile.email.split('@')[0];
    const doctorDisplayName = (assignedRole === 'doctor' && !docRawName.startsWith('د.')) 
      ? `د. ${docRawName}` 
      : docRawName;

    const realUser = {
      id: googleProfile.sub || googleProfile.id || `google-${Date.now()}`,
      email: googleProfile.email,
      name: doctorDisplayName,
      avatar: googleProfile.picture || null,
      role: assignedRole,
      jobTitle: assignedRole === 'super_admin' 
        ? 'مدير عام المنصة (Google Verified)'
        : assignedRole === 'staff'
        ? 'سكرتارية واستقبال العيادة (Google Verified)'
        : 'المدير الطبي / استشاري العيادة (Google Verified)',
      clinicSlug: currentSlug,
      clinicId: currentId,
      allowedClinics: [currentSlug],
      authProvider: 'google',
      isEmailVerified: true,
      needsOnboarding,
      isOnboardingCompleted: !needsOnboarding
    };

    persistUser(realUser);
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

    return { data: { user: realUser, tenant: userTenant }, isNewUser, needsOnboarding, error: null };
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
      if (switchTenant && result.tenant?.slug) {
        switchTenant(result.tenant.slug);
      }
      if (result.tenant?.slug) {
        isolateTenantStorage(result.tenant.slug);
      }

      if (typeof document !== 'undefined' && result.tenant?.branding) {
        const root = document.documentElement;
        if (result.tenant.branding.primaryColor) {
          root.style.setProperty('--primary', result.tenant.branding.primaryColor);
        }
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

    const personaRole = typeof personaOrProfile === 'string' ? personaOrProfile : 'doctor';

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

    const personaUser = (personaRole === 'staff' || personaRole === 'reception') ? {
      id: 'google-staff-sara',
      email: 'sara.kamal.reception@gmail.com',
      name: 'سارة كمال (Google Verified)',
      role: 'staff',
      jobTitle: 'سكرتارية واستقبال العيادة',
      permissions: ['appointments', 'patients', 'sms'],
      clinicSlug: 'dr-ahmed',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      allowedClinics: ['dr-ahmed'],
      authProvider: 'google',
      isEmailVerified: true
    } : personaRole === 'superadmin' ? {
      id: 'google-superadmin',
      email: 'admin.google@clinicflow.com',
      name: 'مدير المنصة العام (Google Verified)',
      role: 'super_admin',
      jobTitle: 'مدير عام المنصة والسحابة السريرية',
      allowedClinics: ['*'],
      authProvider: 'google',
      isEmailVerified: true
    } : {
      id: 'google-doctor-ahmed',
      email: 'dr.ahmed.google@gmail.com',
      name: 'د. أحمد الشريف (Google Verified)',
      role: 'doctor',
      jobTitle: 'المدير الطبي / استشاري طب وجراحة الأسنان',
      clinicSlug: 'dr-ahmed',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      allowedClinics: ['dr-ahmed'],
      authProvider: 'google',
      isEmailVerified: true
    };

    persistUser(personaUser);
    localStorage.setItem('clinicflow_role', personaUser.role);
    setUser(personaUser);
    setRole(personaUser.role);
    if (personaUser.clinicSlug && activeTenant?.slug !== personaUser.clinicSlug) {
      switchTenant?.(personaUser.clinicSlug);
    }
    if (personaUser.role !== 'super_admin' && personaUser.clinicSlug) {
      isolateTenantStorage(personaUser.clinicSlug);
    }
    return { data: { user: personaUser }, error: null };
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
    setUser(null);
    setRole('doctor');
    if (!isDemoMode) {
      await supabase.auth.signOut().catch(() => {});
    }
  };

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
    try {
      sessionStorage.setItem('clinicflow_impersonator_admin', JSON.stringify(currentAdmin));
    } catch (_) {}

    persistUser(targetUser);
    localStorage.setItem('clinicflow_role', targetUser.role || 'doctor');
    setUser(targetUser);
    setRole(targetUser.role || 'doctor');
    if (targetUser.clinicSlug && targetUser.clinicSlug !== '*') {
      try {
        localStorage.setItem('clinicflow_current_tenant', targetUser.clinicSlug);
        sessionStorage.setItem('clinicflow_current_tenant', targetUser.clinicSlug);
        window.dispatchEvent(new CustomEvent('clinicflow:tenant-changed', { detail: targetUser.clinicSlug }));
      } catch (_) {}
    }
  };

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
      isDemoMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
