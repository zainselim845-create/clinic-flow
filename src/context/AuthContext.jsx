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

  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('clinicflow_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [session, setSession] = useState(null);
  const [clinic, setClinic] = useState(activeTenant || defaultClinicInfo);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(() => {
    const savedUser = sessionStorage.getItem('clinicflow_auth_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser).role || 'doctor';
      } catch {
        return 'doctor';
      }
    }
    return localStorage.getItem('clinicflow_role') || 'doctor';
  });
  
  const isDemoMode = !isSupabaseConfigured();

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
      sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(updatedUser));
    }
  };

  const signUpDoctorAndClinic = async (formData) => {
    try {
      const { tenant: newTenant, user: doctorUser } = registerDoctorAndClinic(formData);
      if (registerNewTenant) {
        registerNewTenant(newTenant);
      }
      sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(doctorUser));
      localStorage.setItem('clinicflow_role', doctorUser.role);
      setUser(doctorUser);
      setRole(doctorUser.role);
      setClinic(newTenant);
      return { data: { user: doctorUser, tenant: newTenant }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      const saved = sessionStorage.getItem('clinicflow_auth_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUser(parsed);
          setRole(parsed.role || 'doctor');
        } catch {
          setUser(null);
        }
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
          sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(authUser));
          localStorage.setItem('clinicflow_role', authUser.role || 'doctor');
          setUser(authUser);
          setRole(authUser.role || 'doctor');
          if (authUser.clinicSlug) {
            switchTenant?.(authUser.clinicSlug);
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
        sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(superAdminUser));
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
        sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(ownerUser));
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
        sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(saraDoctorUser));
        localStorage.setItem('clinicflow_role', 'doctor');
        setUser(saraDoctorUser);
        setRole('doctor');
        switchTenant?.('dr-sara');
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
        sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(doctorUser));
        localStorage.setItem('clinicflow_role', 'doctor');
        setUser(doctorUser);
        setRole('doctor');
        switchTenant?.('dr-ahmed');
        return { data: { user: doctorUser }, error: null };
      }

      // 4. Check Staff Login
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
        sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(staffUser));
        localStorage.setItem('clinicflow_role', 'staff');
        setUser(staffUser);
        setRole('staff');
        switchTenant?.(staffClinicSlug);
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

  const signOut = async () => {
    sessionStorage.removeItem('clinicflow_auth_user');
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
      try {
        sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(updatedUser));
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
