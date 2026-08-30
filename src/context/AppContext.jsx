import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { getInitialData } from '../data/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import * as patientsService from '../services/patientsService';
import * as appointmentsService from '../services/appointmentsService';
import * as blockedSlotsService from '../services/blockedSlotsService';
import * as notificationsService from '../services/notificationsService';
import * as staffService from '../services/staffService';
import * as clinicsService from '../services/clinicsService';
import * as prescriptionsService from '../services/prescriptionsService';
import * as expensesService from '../services/expensesService';
import * as recallsService from '../services/recallsService';
import { sendReminder } from '../services/smsService';

const AppContext = createContext(null);

export const initialState = {
  patients: [],
  appointments: [],
  notifications: [],
  blockedSlots: [],
  prescriptions: [],
  expenses: [],
  recalls: [],
  staffMembers: [],
  clinicInfo: null,
  theme: 'light',
  searchQuery: '',
  isLoading: true,
  useSupabase: false
};

const generateId = () => Math.random().toString(36).substring(2, 9);

export function appReducer(state, action) {
  switch (action.type) {
    // Initialization
    case 'INIT_DATA':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    // Patients
    case 'ADD_PATIENT':
      return { ...state, patients: [action.payload, ...state.patients] };
    case 'UPDATE_PATIENT':
      return { 
        ...state, 
        patients: state.patients.map(p => p.id === action.payload.id ? action.payload : p) 
      };
    case 'UPDATE_PATIENT_MEDICAL_HISTORY': {
      const { patientId, diagnosis, prescription, notes, lastVisit } = action.payload;
      return {
        ...state,
        patients: state.patients.map(p => {
          if (p.id === patientId) {
            return {
              ...p,
              ...(diagnosis !== undefined ? { diagnosis } : {}),
              ...(prescription !== undefined ? { prescription } : {}),
              ...(notes !== undefined ? { notes } : {}),
              ...(lastVisit !== undefined ? { lastVisit } : {})
            };
          }
          return p;
        })
      };
    }
    case 'DELETE_PATIENT':

      return {
        ...state,
        patients: state.patients.filter(p => p.id !== action.payload),
        appointments: state.appointments.filter(a => a.patientId !== action.payload)
      };
    case 'SET_PATIENTS':
      return { ...state, patients: action.payload };

    // Appointments
    case 'ADD_APPOINTMENT': {
      const newNotif = {
        id: 'notif-' + Date.now(),
        type: 'appointment',
        title: 'حجز موعد جديد',
        message: `تم حجز موعد للمريض ${action.payload.patientName || 'مريض'} يوم ${action.payload.date} الساعة ${action.payload.time}`,
        timestamp: new Date().toISOString(),
        read: false,
        relatedId: action.payload.id
      };
      return { 
        ...state, 
        appointments: [...state.appointments, action.payload],
        notifications: [newNotif, ...(state.notifications || [])].slice(0, 100)
      };
    }
    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map(a => a.id === action.payload.id ? action.payload : a)
      };
    case 'DELETE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.filter(a => a.id !== action.payload)
      };
    case 'UPDATE_APPOINTMENT_STATUS': {
      const { id, status } = action.payload;
      const targetAppt = state.appointments.find(a => a.id === id);

      let updatedPatients = state.patients;
      let newNotifs = state.notifications || [];

      if (status === 'completed' && targetAppt) {
        // Increment patient visits and update lastVisit
        if (targetAppt.patientId) {
          updatedPatients = state.patients.map(p => {
            if (p.id === targetAppt.patientId) {
              const count = (p.totalVisits || p.visitsCount || 0) + 1;
              return {
                ...p,
                lastVisit: targetAppt.date || new Date().toISOString().split('T')[0],
                totalVisits: count,
                visitsCount: count
              };
            }
            return p;
          });
        }
        // Add completion notification
        newNotifs = [
          {
            id: 'notif-' + Date.now(),
            type: 'completed',
            title: 'إتمام كشف ',
            message: `تم الانتهاء من كشف المريض ${targetAppt.patientName || 'مريض'} وحفظ السجل`,
            timestamp: new Date().toISOString(),
            read: false,
            relatedId: id
          },
          ...newNotifs
        ].slice(0, 100);
      }

      return {
        ...state,
        patients: updatedPatients,
        notifications: newNotifs,
        appointments: state.appointments.map(a => 
          a.id === id ? { 
            ...a, 
            status,
            ...(status === 'waiting' && !a.checkedInAt ? { checkedInAt: new Date().toISOString() } : {}),
            ...(status === 'in_progress' && !a.consultationStartedAt ? { consultationStartedAt: new Date().toISOString() } : {})
          } : a
        )
      };
    }
    case 'UPDATE_CLINIC_INFO':
      return {
        ...state,
        clinicInfo: { ...(state.clinicInfo || {}), ...action.payload }
      };
    case 'SET_APPOINTMENTS':
      return { ...state, appointments: action.payload };

    // Blocked Slots
    case 'TOGGLE_BLOCK_SLOT': {
      const { date, time, reason = 'مغلق من السكرتارية' } = action.payload;
      const exists = state.blockedSlots.some(b => b.date === date && b.time === time);
      if (exists) {
        return {
          ...state,
          blockedSlots: state.blockedSlots.filter(b => !(b.date === date && b.time === time))
        };
      } else {
        return {
          ...state,
          blockedSlots: [...state.blockedSlots, { date, time, reason }]
        };
      }
    }
    case 'BLOCK_FULL_DAY': {
      const { date, reason = 'إجازة الطبيب / عطلة العيادة' } = action.payload;
      const cleanList = state.blockedSlots.filter(b => b.date !== date);
      return {
        ...state,
        blockedSlots: [...cleanList, { date, time: 'FULL_DAY', isFullDay: true, reason }]
      };
    }
    case 'UNBLOCK_FULL_DAY': {
      const { date } = action.payload;
      return {
        ...state,
        blockedSlots: state.blockedSlots.filter(b => b.date !== date)
      };
    }
    case 'SET_BLOCKED_SLOTS':
      return { ...state, blockedSlots: action.payload };

    // Notifications
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, read: true } : n
        )
      };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      };
    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    case 'CLEAR_ALL_NOTIFICATIONS':
      return { ...state, notifications: [] };
    // Staff & Team Management (Doctor / Admin)
    case 'ADD_STAFF':
      return { 
        ...state, 
        staffMembers: [action.payload, ...(state.staffMembers || [])],
        notifications: [
          {
            id: 'notif-' + Date.now(),
            type: 'staff',
            title: 'إضافة موظف جديد ',
            message: `تم إضافة ${action.payload.name} (${action.payload.role}) إلى فريق العيادة`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...(state.notifications || [])
        ].slice(0, 100)
      };
    case 'UPDATE_STAFF':
      return {
        ...state,
        staffMembers: (state.staffMembers || []).map(s => s.id === action.payload.id ? action.payload : s)
      };
    case 'DELETE_STAFF':
      return {
        ...state,
        staffMembers: (state.staffMembers || []).filter(s => s.id !== action.payload)
      };
    case 'TOGGLE_STAFF_STATUS':
      return {
        ...state,
        staffMembers: (state.staffMembers || []).map(s => 
          s.id === action.payload 
            ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } 
            : s
        )
      };

    // Prescriptions (E-Prescription & Rx System)
    case 'ADD_PRESCRIPTION':
      return {
        ...state,
        prescriptions: [action.payload, ...(state.prescriptions || [])],
        notifications: [
          {
            id: 'notif-' + Date.now(),
            type: 'prescription',
            title: 'إصدار روشتة طبية',
            message: `تم إصدار روشتة إلكترونية للمريض ${action.payload.patientName}`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...(state.notifications || [])
        ].slice(0, 100)
      };
    case 'DELETE_PRESCRIPTION':
      return {
        ...state,
        prescriptions: (state.prescriptions || []).filter(p => p.id !== action.payload)
      };

    // Services Catalog
    case 'ADD_SERVICE': {
      const existingServices = state.clinicInfo?.services || [];
      const newServices = [...existingServices, action.payload];
      return {
        ...state,
        clinicInfo: { ...(state.clinicInfo || {}), services: newServices }
      };
    }
    case 'UPDATE_SERVICE': {
      const existingServices = state.clinicInfo?.services || [];
      const newServices = existingServices.map(s => s.id === action.payload.id ? action.payload : s);
      return {
        ...state,
        clinicInfo: { ...(state.clinicInfo || {}), services: newServices }
      };
    }
    case 'DELETE_SERVICE': {
      const existingServices = state.clinicInfo?.services || [];
      const newServices = existingServices.filter(s => s.id !== action.payload);
      return {
        ...state,
        clinicInfo: { ...(state.clinicInfo || {}), services: newServices }
      };
    }

    // Expenses & Petty Cash Ledger
    case 'ADD_EXPENSE':
      return {
        ...state,
        expenses: [action.payload, ...(state.expenses || [])],
        notifications: [
          {
            id: 'notif-' + Date.now(),
            type: 'expense',
            title: 'تسجيل مصروف جديد',
            message: `تم تسجيل مصروف بقيمة ${action.payload.amount} ج.م [${action.payload.title}]`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...(state.notifications || [])
        ].slice(0, 100)
      };
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: (state.expenses || []).map(e => e.id === action.payload.id ? action.payload : e)
      };
    case 'DELETE_EXPENSE':
      return {
        ...state,
        expenses: (state.expenses || []).filter(e => e.id !== action.payload)
      };

    // Patient Recall System
    case 'ADD_RECALL':
      return {
        ...state,
        recalls: [action.payload, ...(state.recalls || [])],
        notifications: [
          {
            id: 'notif-' + Date.now(),
            type: 'recall',
            title: 'جدولة استدعاء مريض',
            message: `تمت جدولة استدعاء دوري للمريض ${action.payload.patientName} (${action.payload.reason})`,
            timestamp: new Date().toISOString(),
            read: false
          },
          ...(state.notifications || [])
        ].slice(0, 100)
      };
    case 'UPDATE_RECALL_STATUS':
      return {
        ...state,
        recalls: (state.recalls || []).map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r)
      };
    case 'DELETE_RECALL':
      return {
        ...state,
        recalls: (state.recalls || []).filter(r => r.id !== action.payload)
      };

    // UI Settings
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'RESET_ALL_DATA': {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('clinicflow_data');
      }
      return {
        ...state,
        patients: [],
        appointments: [],
        notifications: [],
        blockedSlots: [],
        prescriptions: [],
        expenses: [],
        recalls: []
      };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const stateRef = useRef(state);
  const useSupabase = isSupabaseConfigured();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ==========================================
  // تحميل البيانات — Supabase أو localStorage
  // ==========================================
  useEffect(() => {
    const loadData = async () => {
      if (useSupabase) {
        try {
          // جلب البيانات من Supabase
          const [patientsRes, apptsRes, blockedRes, notifsRes, staffRes, clinicRes, rxList, expensesRes, recallsRes] = await Promise.all([
            patientsService.getPatients(),
            appointmentsService.getAppointments(),
            blockedSlotsService.getBlockedSlots(),
            notificationsService.getNotifications(),
            staffService.getStaffMembers(),
            clinicsService.getClinicInfo(),
            prescriptionsService.getPrescriptions(),
            expensesService.getExpenses(),
            recallsService.getRecalls()
          ]);

          // Fallback to local storage for expenses/recalls if remote is still empty
          let fallbackExpenses = [];
          let fallbackRecalls = [];
          try {
            const stored = localStorage.getItem('clinicflow_data');
            if (stored) {
              const p = JSON.parse(stored);
              fallbackExpenses = p.expenses || [];
              fallbackRecalls = p.recalls || [];
            }
          } catch (_) {}

          dispatch({
            type: 'INIT_DATA',
            payload: {
              patients: patientsRes?.data || [],
              appointments: apptsRes?.data || [],
              blockedSlots: blockedRes?.data || [],
              notifications: notifsRes?.data || [],
              staffMembers: staffRes?.data && staffRes.data.length > 0 ? staffRes.data : [],
              clinicInfo: clinicRes?.data || null,
              prescriptions: rxList || [],
              expenses: (expensesRes?.data && expensesRes.data.length > 0) ? expensesRes.data : fallbackExpenses,
              recalls: (recallsRes?.data && recallsRes.data.length > 0) ? recallsRes.data : fallbackRecalls,
              useSupabase: true
            }
          });
        } catch (err) {
          console.error('Supabase load failed, falling back to localStorage:', err);
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      const savedData = localStorage.getItem('clinicflow_data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          dispatch({ 
            type: 'INIT_DATA', 
            payload: { 
              patients: parsed.patients || [],
              appointments: parsed.appointments || [],
              notifications: parsed.notifications || [],
              blockedSlots: parsed.blockedSlots || [],
              prescriptions: parsed.prescriptions || [],
              expenses: parsed.expenses || [],
              recalls: parsed.recalls || [],
              staffMembers: parsed.staffMembers || [],
              clinicInfo: parsed.clinicInfo || null,
              useSupabase: false 
            } 
          });
        } catch (err) {
          console.error('Error loading localStorage:', err);
          const initial = getInitialData();
          dispatch({ type: 'INIT_DATA', payload: { ...initial, useSupabase: false } });
        }
      } else {
        const initial = getInitialData();
        dispatch({ type: 'INIT_DATA', payload: { ...initial, useSupabase: false } });
      }
    };

    loadData();
  }, [useSupabase]);

  // ==========================================
  // حفظ في localStorage آمن وبدون تجميد (Debounced & Quota-Protected)
  // ==========================================
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (state.isLoading) return;
    if (state.patients.length === 0 && state.appointments.length === 0) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const payload = JSON.stringify({
          patients: state.patients,
          appointments: state.appointments,
          blockedSlots: state.blockedSlots,
          notifications: state.notifications,
          staffMembers: state.staffMembers,
          clinicInfo: state.clinicInfo,
          prescriptions: state.prescriptions,
          expenses: state.expenses,
          recalls: state.recalls
        });
        localStorage.setItem('clinicflow_data', payload);
      } catch (err) {
        console.warn('LocalStorage quota warning, executing smart compaction:', err);
        try {
          // Smart Compaction: prune notifications and archive old completed visits
          const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
          const compactedState = {
            patients: state.patients,
            notifications: (state.notifications || []).slice(0, 50),
            appointments: (state.appointments || []).filter(a => a.status !== 'completed' || a.date >= thirtyDaysAgo),
            blockedSlots: state.blockedSlots,
            staffMembers: state.staffMembers,
            clinicInfo: state.clinicInfo,
            prescriptions: state.prescriptions,
            expenses: state.expenses,
            recalls: state.recalls
          };
          localStorage.setItem('clinicflow_data', JSON.stringify(compactedState));
        } catch (compactErr) {
          console.error('Fatal LocalStorage quota exceeded, keeping in-memory state:', compactErr);
        }
      }
    }, 600);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    state.patients, 
    state.appointments, 
    state.blockedSlots, 
    state.notifications, 
    state.staffMembers, 
    state.clinicInfo, 
    state.prescriptions, 
    state.expenses, 
    state.recalls, 
    useSupabase, 
    state.isLoading
  ]);


  // ==========================================
  // Supabase Realtime Subscriptions
  // ==========================================
  useEffect(() => {
    if (!useSupabase || !supabase) return;

    const channel = supabase
      .channel('clinic-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_APPOINTMENT', payload: appointmentsService.fromDbAppointment(payload.new) });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_APPOINTMENT', payload: appointmentsService.fromDbAppointment(payload.new) });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_APPOINTMENT', payload: payload.old.id });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_NOTIFICATION', payload: notificationsService.fromDbNotification(payload.new) });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_PATIENT', payload: patientsService.fromDbPatient(payload.new) });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_PATIENT', payload: patientsService.fromDbPatient(payload.new) });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_members' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_STAFF', payload: staffService.fromDbStaff(payload.new) });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_STAFF', payload: staffService.fromDbStaff(payload.new) });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_STAFF', payload: payload.old.id });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_slots' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'TOGGLE_BLOCK_SLOT', payload: blockedSlotsService.fromDbBlockedSlot(payload.new) });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [useSupabase]);

  // Theme Management
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  const toggleTheme = useCallback(() => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    dispatch({ type: 'SET_THEME', payload: newTheme });
  }, [state.theme]);

  // ==========================================
  // SMS — Simulation أو حقيقي
  // ==========================================
  const sendSmsReminder = useCallback(async (appointment) => {
    try {
      await sendReminder(
        appointment.patientName,
        appointment.patientPhone,
        appointment.date,
        appointment.time,
        'عيادة د. أحمد الشريف'
      );
    } catch (err) {
      console.error('SMS send failed:', err);
    }
  }, []);

  // ==========================================
  // نظام التذكيرات التلقائي (كل 60 ثانية)
  // ==========================================
  useEffect(() => {
    const checkUpcomingReminders = () => {
      const currentState = stateRef.current;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      currentState.appointments.forEach(app => {
        if (app.status === 'upcoming' && !app.reminderSent && app.date === todayStr) {
          const [hours, minutes] = app.time.split(':').map(Number);
          const appTime = new Date(now);
          appTime.setHours(hours, minutes, 0, 0);

          const timeDiffMs = appTime.getTime() - now.getTime();
          const timeDiffMinutes = Math.floor(timeDiffMs / 60000);

          if (timeDiffMinutes >= 0 && timeDiffMinutes <= 30) {
            dispatch({
              type: 'UPDATE_APPOINTMENT',
              payload: { ...app, reminderSent: true }
            });

            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: generateId(),
                type: 'reminder',
                title: 'تذكير بموعد',
                message: `موعد المريض ${app.patientName} خلال ${timeDiffMinutes} دقيقة.`,
                timestamp: new Date().toISOString(),
                read: false,
                relatedId: app.id
              }
            });

            sendSmsReminder(app);

            // تحديث في Supabase أيضاً
            if (useSupabase) {
              appointmentsService.markReminderSent(app.id);
            }
          }
        }
      });
    };

    const intervalId = setInterval(checkUpcomingReminders, 60000);
    checkUpcomingReminders();

    return () => clearInterval(intervalId);
  }, [sendSmsReminder, useSupabase]);

  // ==========================================
  // Helper Functions
  // ==========================================
  const getPatientById = useCallback((id) => {
    return state.patients.find(p => p.id === id);
  }, [state.patients]);

  const getAppointmentsByPatientId = useCallback((id) => {
    return state.appointments.filter(a => a.patientId === id);
  }, [state.appointments]);

  const getAppointmentsByDate = useCallback((date) => {
    return state.appointments.filter(a => a.date === date);
  }, [state.appointments]);

  const getTodayAppointments = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return state.appointments.filter(a => a.date === todayStr);
  }, [state.appointments]);

  const getUpcomingAppointments = useCallback(() => {
    return state.appointments.filter(a => a.status === 'upcoming').sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });
  }, [state.appointments]);

  const getUnreadNotificationsCount = useCallback(() => {
    return state.notifications.filter(n => !n.read).length;
  }, [state.notifications]);

  const addAppointmentWithNotification = useCallback(async (appointment) => {
    const newAppointment = { ...appointment, id: generateId(), status: 'upcoming', reminderSent: false };
    
    if (useSupabase) {
      const result = await appointmentsService.addAppointment(newAppointment);
      if (result?.data) {
        dispatch({ type: 'ADD_APPOINTMENT', payload: result.data });
      }
    } else {
      dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
    }

    const notification = {
      id: generateId(),
      type: 'appointment',
      title: 'موعد جديد',
      message: `تم حجز موعد جديد للمريض ${newAppointment.patientName}`,
      timestamp: new Date().toISOString(),
      read: false,
      relatedId: newAppointment.id
    };

    if (useSupabase) {
      await notificationsService.addNotification(notification);
    }
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }, [useSupabase]);

  const value = useMemo(() => ({
    state,
    dispatch,
    toggleTheme,
    getPatientById,
    getAppointmentsByPatientId,
    getAppointmentsByDate,
    getTodayAppointments,
    getUpcomingAppointments,
    getUnreadNotificationsCount,
    addAppointmentWithNotification,
    sendSmsReminder,
    useSupabase
  }), [
    state,
    dispatch,
    toggleTheme,
    getPatientById,
    getAppointmentsByPatientId,
    getAppointmentsByDate,
    getTodayAppointments,
    getUpcomingAppointments,
    getUnreadNotificationsCount,
    addAppointmentWithNotification,
    sendSmsReminder,
    useSupabase
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
