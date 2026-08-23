import React, { createContext, useReducer, useEffect, useContext, useRef, useCallback } from 'react';
import { getInitialData } from '../data/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import * as patientsService from '../services/patientsService';
import * as appointmentsService from '../services/appointmentsService';
import * as blockedSlotsService from '../services/blockedSlotsService';
import * as notificationsService from '../services/notificationsService';
import { sendReminder } from '../services/smsService';

const AppContext = createContext(null);

const initialState = {
  patients: [],
  appointments: [],
  notifications: [],
  blockedSlots: [],
  theme: 'light',
  searchQuery: '',
  isLoading: true,
  useSupabase: false // سيتم تحديده عند التحميل
};

const generateId = () => Math.random().toString(36).substring(2, 9);

function appReducer(state, action) {
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
    case 'DELETE_PATIENT':
      return {
        ...state,
        patients: state.patients.filter(p => p.id !== action.payload),
        appointments: state.appointments.filter(a => a.patientId !== action.payload)
      };
    case 'SET_PATIENTS':
      return { ...state, patients: action.payload };

    // Appointments
    case 'ADD_APPOINTMENT':
      return { ...state, appointments: [...state.appointments, action.payload] };
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
    case 'UPDATE_APPOINTMENT_STATUS':
      return {
        ...state,
        appointments: state.appointments.map(a => 
          a.id === action.payload.id ? { ...a, status: action.payload.status } : a
        )
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
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };

    // UI Settings
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

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
          const [patientsRes, apptsRes, blockedRes, notifsRes] = await Promise.all([
            patientsService.getPatients(),
            appointmentsService.getAppointments(),
            blockedSlotsService.getBlockedSlots(),
            notificationsService.getNotifications()
          ]);

          dispatch({
            type: 'INIT_DATA',
            payload: {
              patients: patientsRes?.data || [],
              appointments: apptsRes?.data || [],
              blockedSlots: blockedRes?.data || [],
              notifications: notifsRes?.data || [],
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
        dispatch({ type: 'INIT_DATA', payload: { ...JSON.parse(savedData), useSupabase: false } });
      } else {
        const initial = getInitialData();
        dispatch({ type: 'INIT_DATA', payload: { ...initial, useSupabase: false } });
      }
    };

    loadData();
  }, [useSupabase]);

  // ==========================================
  // حفظ في localStorage (وضع تجريبي فقط)
  // ==========================================
  useEffect(() => {
    if (!useSupabase && !state.isLoading && (state.patients.length > 0 || state.appointments.length > 0)) {
      localStorage.setItem('clinicflow_data', JSON.stringify(state));
    }
  }, [state, useSupabase]);

  // ==========================================
  // Supabase Realtime Subscriptions
  // ==========================================
  useEffect(() => {
    if (!useSupabase || !supabase) return;

    const channel = supabase
      .channel('clinic-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_APPOINTMENT', payload: payload.new });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_APPOINTMENT', payload: payload.new });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_APPOINTMENT', payload: payload.old.id });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_NOTIFICATION', payload: payload.new });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_PATIENT', payload: payload.new });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_PATIENT', payload: payload.new });
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

  const value = {
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
  };

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
