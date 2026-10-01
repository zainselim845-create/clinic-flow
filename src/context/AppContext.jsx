import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { combinedAppReducer } from './reducers';
import TenantContext from './TenantContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import * as patientsService from '../services/patientsService';
import * as appointmentsService from '../services/appointmentsService';
import * as blockedSlotsService from '../services/blockedSlotsService';
import * as notificationsService from '../services/notificationsService';
import * as staffService from '../services/staffService';
import * as clinicsService from '../services/clinicsService';
import * as expensesService from '../services/expensesService';
import * as recallsService from '../services/recallsService';
import { sendReminder } from '../services/smsService';
import { parseArabicTime, arabicTimeToDate } from '../utils/parseArabicTime';
import { createClinicRealtimeManager, REALTIME_STATUS, BROADCAST_EVENTS } from '../services/realtimeSyncService';
import { localDb } from '../db/localDatabase';
import { safeGetItem, safeSetJSON } from '../utils/safeStorage';
import { cloudCircuitBreaker } from '../lib/circuitBreaker';
import { migrateTenantPayload } from '../lib/schemaMigration';
import { syncOutbox } from '../lib/syncOutbox';

export const DATA_SCHEMA_VERSION = 'v5_clean_zero_state';

const AppContext = createContext(null);

export const initialState = {
  patients: [],
  appointments: [],
  notifications: [],
  blockedSlots: [],
  expenses: [],
  recalls: [],
  staffMembers: [],
  clinicInfo: null,
  theme: 'light',
  searchQuery: '',
  isLoading: true,
  useSupabase: false,
  currentTenantSlug: null
};

const generateId = () => Math.random().toString(36).substring(2, 9);

export const appReducer = combinedAppReducer;

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const stateRef = useRef(state);
  const useSupabase = isSupabaseConfigured();
  const [realtimeStatus, setRealtimeStatus] = useState(REALTIME_STATUS.DISCONNECTED);
  const realtimeManagerRef = useRef(null);

  // Resolve active tenant from TenantContext
  const tenantContext = useContext(TenantContext);
  const activeTenant = tenantContext?.tenant;
  const tenantSlug = tenantContext?.tenantSlug || activeTenant?.slug || '';
  const tenantId = activeTenant?.id || (tenantSlug ? `tenant-${tenantSlug}` : 'tenant-default');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ==========================================
  // تحميل البيانات بمعزل تام لكل عيادة (Tenant Data Isolation)
  // ==========================================
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    // Immediately cancel any pending save from previous tenant to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const currentSlug = tenantSlug || '';
    const currentClinicId = tenantId;

    // Reset previous tenant data so it never flashes or leaks into the new tenant
    dispatch({ type: 'SWITCH_TENANT_START', payload: { tenantSlug: currentSlug } });

    const loadData = async () => {
      if (useSupabase && cloudCircuitBreaker.isAvailable()) {
        try {
          // جلب البيانات من Supabase مع الفلترة بالعيادة النشطة فقط
          const [patientsRes, apptsRes, blockedRes, notifsRes, staffRes, clinicRes, expensesRes, recallsRes] = await Promise.all([
            patientsService.getPatients(currentClinicId),
            appointmentsService.getAppointments(currentClinicId),
            blockedSlotsService.getBlockedSlots(currentClinicId),
            notificationsService.getNotifications(currentClinicId),
            staffService.getStaffMembers(currentClinicId),
            clinicsService.getClinicInfo(currentClinicId),
            expensesService.getExpenses(currentClinicId),
            recallsService.getRecalls(currentClinicId)
          ]);

          // Verify whether Supabase schema is actually deployed or returned PGRST205
          const isSchemaMissing = [patientsRes, apptsRes, clinicRes].some(
            res => res?.error?.code === 'PGRST205' || String(res?.error?.message || '').includes('schema cache')
          );

          if (isSchemaMissing) {
            cloudCircuitBreaker.recordFailure('schema_missing_pgrst205');
          } else if (patientsRes?.data !== null || apptsRes?.data !== null || clinicRes?.data !== null) {
            cloudCircuitBreaker.recordSuccess();
            if (isCancelled) return;

            dispatch({
              type: 'INIT_DATA',
              payload: {
                patients: patientsRes?.data || [],
                appointments: apptsRes?.data || [],
                blockedSlots: blockedRes?.data || [],
                notifications: notifsRes?.data || [],
                staffMembers: staffRes?.data && staffRes.data.length > 0 ? staffRes.data : [],
                clinicInfo: clinicRes?.data || activeTenant || null,
                expenses: expensesRes?.data || [],
                recalls: recallsRes?.data || [],
                useSupabase: true,
                currentTenantSlug: currentSlug
              }
            });
            return;
          }

          console.warn('[AppContext] Supabase schema unmigrated or unavailable. Gracefully falling back to offline-first local storage.');
        } catch (err) {
          cloudCircuitBreaker.recordFailure(err);
          console.warn('[AppContext] Supabase scoped load failed, falling back to localStorage:', err);
        }
      }

      if (isCancelled) return;

      // وضع التخزين المحلي المعزول تماماً لكل عيادة
      const scopedKey = `clinicflow_data_${currentSlug}`;
      let savedData = currentSlug ? safeGetItem(scopedKey) : null;

      if (savedData) {
        try {
          const parsed = typeof savedData === 'string' ? JSON.parse(savedData) : savedData;
          const migratedPayload = migrateTenantPayload(parsed, currentSlug);

          if (activeTenant) {
            migratedPayload.clinicInfo = activeTenant;
          }

          dispatch({ 
            type: 'INIT_DATA', 
            payload: migratedPayload
          });
        } catch (err) {
          console.error('[AppContext] Error loading scoped localStorage:', err);
          dispatch({ 
            type: 'INIT_DATA', 
            payload: { 
              patients: [],
              appointments: [],
              notifications: [],
              blockedSlots: [],
              expenses: [],
              recalls: [],
              staffMembers: [],
              clinicInfo: activeTenant || (currentSlug ? { slug: currentSlug, name: currentSlug } : null),
              useSupabase: false,
              currentTenantSlug: currentSlug 
            } 
          });
        }
      } else {
        dispatch({ 
          type: 'INIT_DATA', 
          payload: { 
            patients: [],
            appointments: [],
            notifications: [],
            blockedSlots: [],
            expenses: [],
            recalls: [],
            staffMembers: [],
            clinicInfo: activeTenant || (currentSlug ? { slug: currentSlug, name: currentSlug } : null),
            useSupabase: false,
            currentTenantSlug: currentSlug 
          } 
        });
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [useSupabase, tenantSlug, tenantId, activeTenant]);

  // ==========================================
  // حفظ في localStorage معزول لكل عيادة بدون تجميد أو تسريب
  // ==========================================
  useEffect(() => {
    if (state.isLoading || !state.currentTenantSlug) return;
    const currentSlug = tenantSlug || '';
    if (!currentSlug) return;

    // Strict Isolation Guard: DO NOT save state if state does not match the active tenant slug!
    if (state.currentTenantSlug !== currentSlug) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const scopedKey = `clinicflow_data_${currentSlug}`;
      try {
        const payload = {
          _version: DATA_SCHEMA_VERSION,
          patients: state.patients,
          appointments: state.appointments,
          blockedSlots: state.blockedSlots,
          notifications: state.notifications,
          staffMembers: state.staffMembers,
          clinicInfo: state.clinicInfo,
          expenses: state.expenses,
          recalls: state.recalls
        };
        safeSetJSON(scopedKey, payload);

        // Asynchronous Dual-Write to high-capacity IndexedDB
        try {
          if (Array.isArray(state.patients) && state.patients.length > 0) {
            localDb.savePatientsBulk(state.patients).catch(e => console.warn('[AppContext] IndexedDB patient save note:', e));
          }
          if (Array.isArray(state.appointments) && state.appointments.length > 0) {
            localDb.saveAppointmentsBulk(state.appointments).catch(e => console.warn('[AppContext] IndexedDB appointment save note:', e));
          }
        } catch (dbErr) {
          console.warn('[AppContext] IndexedDB dual-write warning:', dbErr);
        }
      } catch (err) {
        console.warn('Storage quota warning, executing smart compaction:', err);
        try {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
          const compactedState = {
            _version: DATA_SCHEMA_VERSION,
            patients: state.patients,
            notifications: (state.notifications || []).slice(0, 50),
            appointments: (state.appointments || []).filter(a => a.status !== 'completed' || a.date >= thirtyDaysAgo),
            blockedSlots: state.blockedSlots,
            staffMembers: state.staffMembers,
            clinicInfo: state.clinicInfo,
            expenses: state.expenses,
            recalls: state.recalls
          };
          safeSetJSON(scopedKey, compactedState);
        } catch (compactErr) {
          console.error('Fatal storage quota exceeded, keeping in-memory state:', compactErr);
        }
      }
    }, 600);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.patients, state.appointments, state.blockedSlots, state.notifications, state.staffMembers, state.clinicInfo, state.expenses, state.recalls, state._freshReset, state.isLoading, state.currentTenantSlug, tenantSlug]);

  // ==========================================
  // Supabase Realtime Subscriptions معزولة بمفتاح العيادة فقط
  // ==========================================
  useEffect(() => {
    if (!useSupabase || !supabase) {
      setRealtimeStatus(REALTIME_STATUS.DISCONNECTED);
      return;
    }

    const currentClinicId = tenantId;
    const manager = createClinicRealtimeManager({
      supabaseClient: supabase,
      clinicId: currentClinicId,
      onDispatch: (action) => dispatch(action),
      onStatusChange: (status) => setRealtimeStatus(status),
      onBroadcast: (payload) => {
        if (payload?.message) {
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              id: 'rt-notif-' + Date.now(),
              type: 'system',
              title: payload.eventType === BROADCAST_EVENTS.PATIENT_ARRIVED ? 'وصول مريض' : 'تنبيه عيادة',
              message: payload.message,
              timestamp: new Date().toISOString(),
              read: false
            }
          });
        }
      }
    });

    realtimeManagerRef.current = manager;

    return () => {
      manager.unsubscribe();
      realtimeManagerRef.current = null;
    };
  }, [useSupabase, tenantId]);

  const broadcastClinicEvent = useCallback((eventType, data) => {
    if (realtimeManagerRef.current) {
      return realtimeManagerRef.current.broadcast(eventType, data);
    }
    return Promise.resolve(false);
  }, []);

  // Theme Management
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
    document.body.setAttribute('data-theme', state.theme);
    document.body.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  const toggleTheme = useCallback(() => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    dispatch({ type: 'SET_THEME', payload: newTheme });
  }, [state.theme]);

  // ==========================================
  // SMS — استخدام اسم العيادة النشطة ديناميكياً
  // ==========================================
  const sendSmsReminder = useCallback(async (appointment) => {
    try {
      const activeClinicName = stateRef.current.clinicInfo?.name || activeTenant?.name || 'العيادة';
      const activeClinicId = appointment.clinicId || stateRef.current.clinicInfo?.id || activeTenant?.id || 'default';
      await sendReminder(
        appointment.patientName,
        appointment.patientPhone,
        appointment.date,
        appointment.time,
        activeClinicName,
        activeClinicId
      );
    } catch (err) {
      console.error('SMS send failed:', err);
    }
  }, [activeTenant?.name, activeTenant?.id]);

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
          const parsed = parseArabicTime(app.time);
          if (!parsed) return;
          const appTime = new Date(now);
          appTime.setHours(parsed.hours, parsed.minutes, 0, 0);

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
      const dateA = arabicTimeToDate(a.date, a.time);
      const dateB = arabicTimeToDate(b.date, b.time);
      return dateA - dateB;
    });
  }, [state.appointments]);

  const getUnreadNotificationsCount = useCallback(() => {
    return state.notifications.filter(n => !n.read).length;
  }, [state.notifications]);

  const addAppointmentWithNotification = useCallback(async (appointment) => {
    const newAppointment = { ...appointment, id: generateId(), status: 'upcoming', reminderSent: false };
    
    if (useSupabase && cloudCircuitBreaker.isAvailable()) {
      try {
        const result = await appointmentsService.addAppointment(newAppointment);
        if (result?.data) {
          dispatch({ type: 'ADD_APPOINTMENT', payload: result.data });
          cloudCircuitBreaker.recordSuccess();
        } else {
          dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
          syncOutbox.enqueue({
            entityType: 'appointment',
            action: 'create',
            payload: newAppointment,
            clinicId: tenantId
          }).catch(console.warn);
        }
      } catch (err) {
        cloudCircuitBreaker.recordFailure(err);
        dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
        syncOutbox.enqueue({
          entityType: 'appointment',
          action: 'create',
          payload: newAppointment,
          clinicId: tenantId
        }).catch(console.warn);
      }
    } else {
      dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
      syncOutbox.enqueue({
        entityType: 'appointment',
        action: 'create',
        payload: newAppointment,
        clinicId: tenantId
      }).catch(console.warn);
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

    if (useSupabase && cloudCircuitBreaker.isAvailable()) {
      notificationsService.addNotification(notification).catch(console.warn);
    }
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }, [useSupabase, tenantId]);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    useSupabase,
    realtimeStatus,
    broadcastClinicEvent,
    BROADCAST_EVENTS,
    mobileNavOpen,
    setMobileNavOpen
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
    useSupabase,
    realtimeStatus,
    broadcastClinicEvent,
    mobileNavOpen
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
