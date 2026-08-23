import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext({});

const DEMO_USER = {
  id: 'demo-user-123',
  email: 'demo@clinicflow.com',
  user_metadata: { name: 'د. أحمد محمد' }
};

const DEMO_CLINIC = {
  id: 'demo-clinic-123',
  owner_id: 'demo-user-123',
  name: 'عيادة الأمل',
  specialty: 'عام',
  settings: {}
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(() => localStorage.getItem('clinicflow_role') || 'doctor'); // 'doctor' | 'secretary'
  
  const isDemoMode = !isSupabaseConfigured();

  const switchRole = (newRole) => {
    setRole(newRole);
    localStorage.setItem('clinicflow_role', newRole);
  };

  useEffect(() => {
    if (isDemoMode) {
      console.log('Supabase not configured. Running in Demo Mode.');
      setSession({ access_token: 'demo-token' });
      setUser(DEMO_USER);
      setClinic(DEMO_CLINIC);
      setLoading(false);
      return;
    }

    // Get initial session
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

  const signIn = async (email, password) => {
    if (isDemoMode) {
      setUser(DEMO_USER);
      setClinic(DEMO_CLINIC);
      return { data: { user: DEMO_USER }, error: null };
    }
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email, password, clinicData) => {
    if (isDemoMode) return { data: null, error: new Error('Cannot sign up in demo mode') };
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) return { data: null, error: authError };

    if (authData.user) {
      const { error: clinicError } = await supabase.from('clinics').insert([
        { 
          owner_id: authData.user.id,
          ...clinicData
        }
      ]);
      
      if (clinicError) {
        console.error('Error creating clinic:', clinicError);
      }
    }

    return { data: authData, error: null };
  };

  const signOut = async () => {
    if (isDemoMode) {
      setUser(null);
      setSession(null);
      setClinic(null);
      return { error: null };
    }
    return supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    clinic,
    loading,
    role,
    switchRole,
    signIn,
    signUp,
    signOut,
    isDemoMode
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
