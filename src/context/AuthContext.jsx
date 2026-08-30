import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { clinicInfo as defaultClinicInfo, staffMembers as defaultStaffMembers } from '../data/demoData';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('clinicflow_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [session, setSession] = useState(null);
  const [clinic, setClinic] = useState(defaultClinicInfo);
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

  const switchRole = (newRole) => {
    setRole(newRole);
    localStorage.setItem('clinicflow_role', newRole);
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(updatedUser));
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        fetchClinic(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        fetchClinic(session.user.id);
      } else {
        setClinic(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isDemoMode]);

  const fetchClinic = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('owner_id', userId)
        .single();
        
      if (error) throw error;
      setClinic(data);
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

      // Read current state from localStorage or defaults
      let currentStaff = defaultStaffMembers;
      let currentClinic = defaultClinicInfo;
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

      // 1. Check Doctor Master Login
      const doctorEmail = (currentClinic.doctorEmail || 'doctor@clinicflow.com').toLowerCase();
      const doctorPhone = (currentClinic.phone || '01006285031').replace(/\D/g, '');
      const cleanPhoneInput = cleanId.replace(/\D/g, '');
      const doctorPassword = currentClinic.doctorPassword || 'admin123';

      const isDoctorIdentifier = cleanId === doctorEmail || 
        cleanId === 'doctor' || 
        cleanId === 'admin' ||
        (cleanPhoneInput && cleanPhoneInput.length >= 10 && cleanPhoneInput === doctorPhone);

      if (isDoctorIdentifier) {
        if (cleanPass !== doctorPassword && cleanPass !== 'admin') {
          return {
            data: null,
            error: new Error('كلمة المرور غير صحيحة لحساب الطبيب.')
          };
        }

        const doctorUser = {
          id: 'doc-master',
          name: currentClinic.doctorName || 'د. أحمد الشريف',
          email: doctorEmail,
          phone: currentClinic.phone,
          role: 'doctor',
          jobTitle: currentClinic.specialty || 'المدير الطبي / استشاري الباطنة',
          authenticatedAt: new Date().toISOString()
        };
        sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(doctorUser));
        localStorage.setItem('clinicflow_role', 'doctor');
        setUser(doctorUser);
        setRole('doctor');
        return { data: { user: doctorUser }, error: null };
      }

      // 2. Check Staff Login
      const matchedStaff = currentStaff.find(s => {
        const staffEmail = (s.email || '').toLowerCase();
        const staffPhone = (s.phone || '').replace(/\D/g, '');
        return (cleanId === staffEmail || (cleanPhoneInput && cleanPhoneInput.length >= 10 && cleanPhoneInput === staffPhone)) && s.password === cleanPass;
      });

      if (matchedStaff) {
        if (matchedStaff.status === 'inactive') {
          return { data: null, error: new Error('هذا الحساب معطل حالياً من قِبل إدارة العيادة.') };
        }
        const staffUser = {
          id: matchedStaff.id,
          name: matchedStaff.name,
          email: matchedStaff.email,
          phone: matchedStaff.phone,
          role: 'staff',
          jobTitle: matchedStaff.role || 'سكرتارية واستقبال العيادة',
          permissions: matchedStaff.permissions || ['appointments', 'patients', 'whatsapp'],
          authenticatedAt: new Date().toISOString()
        };
        sessionStorage.setItem('clinicflow_auth_user', JSON.stringify(staffUser));
        localStorage.setItem('clinicflow_role', 'staff');
        setUser(staffUser);
        setRole('staff');
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
      signOut,
      updateClinicInfo,
      isDemoMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
