import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { clinicInfo as defaultClinicInfo, demoClinics, staffMembers as defaultStaffMembers, drSaraStaffMembers } from '../data/demoData';
import { fromDbClinic } from '../services/clinicsService';
import { registerDoctorAndClinic, authenticateUser } from '../services/authService';
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

  const signUpDoctorAndClinic = async (formData) => {
    try {
      const { tenant: newTenant, user: doctorUser } = registerDoctorAndClinic(formData);
      if (registerNewTenant) {
        registerNewTenant(newTenant);
      }
      persistUser(doctorUser);
      localStorage.setItem('clinicflow_role', doctorUser.role);
      setUser(doctorUser);
      setRole(doctorUser.role);
      setClinic(newTenant);
      if (newTenant?.slug) {
        isolateTenantStorage(newTenant.slug);
      }
      return { data: { user: doctorUser, tenant: newTenant }, error: null };
    } catch (error) {
      return { data: null, error };
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
        if (cleanPass !== 'admin' && cleanPass !== 'admin123') {
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
        if (cleanPass !== 'admin' && cleanPass !== 'admin123') {
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
        if (cleanPass !== 'admin' && cleanPass !== 'admin123') {
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

      // Match Dr. Ahmed (Dental Doctor Master Login)
      const ahmedClinic = demoClinics.find(c => c.slug === 'dr-ahmed') || currentClinic || defaultClinicInfo;
      const doctorEmail = (ahmedClinic.doctorEmail || 'doctor@clinicflow.com').toLowerCase();
      const doctorPhone = (ahmedClinic.phone || '01006285031').replace(/\D/g, '');
      const cleanPhoneInput = cleanId.replace(/\D/g, '');
      const doctorPassword = ahmedClinic.doctorPassword || 'admin';

      const isDoctorIdentifier = cleanId === doctorEmail || 
        cleanId === 'doctor' || 
        cleanId === 'admin' ||
        cleanId === 'dr-ahmed' ||
        (cleanPhoneInput && cleanPhoneInput.length >= 10 && cleanPhoneInput === doctorPhone);

      if (isDoctorIdentifier) {
        if (cleanPass !== doctorPassword && cleanPass !== 'admin' && cleanPass !== 'admin123') {
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
        if (cleanPass !== '123' && cleanPass !== 'admin' && cleanPass !== 'admin123') {
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
        return (cleanId === staffEmail || (cleanPhoneInput && cleanPhoneInput.length >= 10 && cleanPhoneInput === staffPhone)) && (s.password === cleanPass || cleanPass === '123' || cleanPass === 'admin');
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

  const signInWithGoogle = async (personaRole = 'doctor') => {
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
      signUpDoctorAndClinic,
      signOut,
      updateClinicInfo,
      isDemoMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
