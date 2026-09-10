import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getInitialData, getInitialDataForTenant, demoClinics } from '../data/demoData';
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
import { getTodayDateStr } from '../utils/timeSlots';
import { createClinicRealtimeManager, REALTIME_STATUS, BROADCAST_EVENTS } from '../services/realtimeSyncService';

export const DATA_SCHEMA_VERSION = 'v4_google_material_3';

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

export function appReducer(state, action) {
  switch (action.type) {
    // Initialization & Fresh Start
    case 'SWITCH_TENANT_START':
      return {
        ...state,
        isLoading: true,
        currentTenantSlug: action.payload.tenantSlug,
        patients: [],
        appointments: [],
        notifications: [],
        blockedSlots: [],
        expenses: [],
        recalls: []
      };
    case 'INIT_DATA':
      return { 
        ...state, 
        ...action.payload, 
        currentTenantSlug: action.payload.currentTenantSlug || state.currentTenantSlug,
        isLoading: false 
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'RESET_TO_FRESH_START': {
      const fresh = getInitialData();
      return {
        ...state,
        ...fresh,
        _freshReset: Date.now(),
        isLoading: false
      };
    }
    case 'WIPE_ALL_DATA_CLEAN': {
      const initial = getInitialData();
      const cleanEmpty = {
        patients: [],
        appointments: [],
        expenses: [],
        recalls: [],
        invoices: [],
        notifications: [
          {
            id: 'notif-fresh-start',
            type: 'system',
            title: 'بدء تشغيل العيادة',
            message: 'تم مسح البيانات القديمة وإعادة تهيئة النظام بحالة نظيفة جاهزة لاستقبال المرضى.',
            timestamp: new Date().toISOString(),
            read: false
          }
        ],
        blockedSlots: [],
        staffMembers: (state.staffMembers && state.staffMembers.length > 0) ? state.staffMembers : initial.staffMembers,
        clinicInfo: state.clinicInfo || initial.clinicInfo
      };
      return {
        ...state,
        ...cleanEmpty,
        _freshReset: Date.now(),
        isLoading: false
      };
    }

    // Patients
    case 'ADD_PATIENT':
      return { ...state, patients: [action.payload, ...state.patients] };
    case 'UPDATE_PATIENT':
      return { 
        ...state, 
        patients: state.patients.map(p => p.id === action.payload.id ? action.payload : p) 
      };
    case 'UPDATE_PATIENT_MEDICAL_HISTORY': {
      const { patientId, diagnosis, notes, lastVisit } = action.payload;
      return {
        ...state,
        patients: state.patients.map(p => {
          if (p.id === patientId) {
            return {
              ...p,
              ...(diagnosis !== undefined ? { diagnosis } : {}),
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
        appointments: state.appointments.filter(a => a.patientId !== action.payload),
        recalls: (state.recalls || []).filter(r => r.patientId !== action.payload),
        invoices: (state.invoices || []).filter(inv => inv.patientId !== action.payload)
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

      if (status === 'completed' && targetAppt && targetAppt.status !== 'completed') {
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

    case 'REFRESH_TODAY_DEMO_DATA': {
      const slug = state.currentTenantSlug || 'dr-ahmed';
      const freshSeed = getInitialDataForTenant(state.clinicInfo || slug);
      const today = getTodayDateStr();
      const nonToday = (state.appointments || []).filter(a => a.date !== today);
      const existingPatIds = new Set((state.patients || []).map(p => p.id));
      const missingPatients = freshSeed.patients.filter(p => !existingPatIds.has(p.id));

      return {
        ...state,
        appointments: [...freshSeed.appointments, ...nonToday],
        patients: [...missingPatients, ...(state.patients || [])],
        expenses: freshSeed.expenses && freshSeed.expenses.length > 0 ? freshSeed.expenses : (state.expenses || []),
        recalls: freshSeed.recalls && freshSeed.recalls.length > 0 ? freshSeed.recalls : (state.recalls || []),
        notifications: [
          {
            id: 'notif-' + Date.now(),
            type: 'system',
            title: 'تحديث بيانات اليوم الحية',
            message: 'تم تحديث جدول اليوم المباشر وصالة الانتظار بنجاح وفق معايير Google Material 3',
            timestamp: new Date().toISOString(),
            read: false
          },
          ...(state.notifications || [])
        ].slice(0, 100)
      };
    }

    case 'RESET_ALL_DATA': {
      if (typeof window !== 'undefined') {
        const slug = state.currentTenantSlug || 'dr-ahmed';
        localStorage.removeItem(`clinicflow_data_${slug}`);
        localStorage.removeItem('clinicflow_data');
      }
      return {
        ...state,
        patients: [],
        appointments: [],
        notifications: [],
        blockedSlots: [],
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
  const [realtimeStatus, setRealtimeStatus] = useState(REALTIME_STATUS.DISCONNECTED);
  const realtimeManagerRef = useRef(null);

  // Resolve active tenant from TenantContext
  const tenantContext = useContext(TenantContext);
  const activeTenant = tenantContext?.tenant;
  const resolvedClinic = (demoClinics || []).find(c => c.slug === tenantSlug);
  const tenantId = activeTenant?.id || resolvedClinic?.id || (tenantSlug ? `tenant-${tenantSlug}` : 'tenant-default');

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

    const currentSlug = tenantSlug || 'dr-ahmed';
    const currentClinicId = tenantId;

    // Reset previous tenant data so it never flashes or leaks into the new tenant
    dispatch({ type: 'SWITCH_TENANT_START', payload: { tenantSlug: currentSlug } });

    const loadData = async () => {
      if (useSupabase) {
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
        } catch (err) {
          console.error('Supabase scoped load failed, falling back to localStorage:', err);
        }
      }

      if (isCancelled) return;

      // وضع الأوفلاين / العرض التجريبي: مفتاح تخزين منفصل ومعزول تماماً لكل عيادة
      const scopedKey = `clinicflow_data_${currentSlug}`;
      let savedData = null;
      try {
        savedData = localStorage.getItem(scopedKey);
        // التوافق الرجعي مع الحساب الافتراضي
        if (!savedData && currentSlug === 'dr-ahmed') {
          savedData = localStorage.getItem('clinicflow_data');
        }
      } catch (_) {}

      const seedData = getInitialDataForTenant(activeTenant || currentSlug);
      const today = getTodayDateStr();

      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          const hasTodayAppts = Array.isArray(parsed.appointments) && parsed.appointments.some(a => a.date === today);
          const isUpToDate = parsed._version === DATA_SCHEMA_VERSION;

          let finalAppointments = Array.isArray(parsed.appointments) ? parsed.appointments : [];
          let finalPatients = Array.isArray(parsed.patients) ? parsed.patients : [];
          let finalExpenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
          let finalRecalls = Array.isArray(parsed.recalls) ? parsed.recalls : [];

          // Auto-heal / migrate: If there are no appointments for today OR schema version changed,
          // ensure the live operational floor has today's dynamic seed data active
          if (!hasTodayAppts || !isUpToDate) {
            const nonTodayAppointments = finalAppointments.filter(a => a.date !== today);
            finalAppointments = [...seedData.appointments, ...nonTodayAppointments];

            const existingPatIds = new Set(finalPatients.map(p => p.id));
            const missingSeedPatients = seedData.patients.filter(p => !existingPatIds.has(p.id));
            finalPatients = [...missingSeedPatients, ...finalPatients];

            if (finalExpenses.length === 0 && seedData.expenses) {
              finalExpenses = seedData.expenses;
            }
            if (finalRecalls.length === 0 && seedData.recalls) {
              finalRecalls = seedData.recalls;
            }
          }

          dispatch({ 
            type: 'INIT_DATA', 
            payload: { 
              patients: finalPatients.length > 0 ? finalPatients : seedData.patients,
              appointments: finalAppointments.length > 0 ? finalAppointments : seedData.appointments,
              notifications: (parsed.notifications && parsed.notifications.length > 0) ? parsed.notifications : seedData.notifications,
              blockedSlots: parsed.blockedSlots || seedData.blockedSlots,
              expenses: finalExpenses.length > 0 ? finalExpenses : seedData.expenses,
              recalls: finalRecalls.length > 0 ? finalRecalls : seedData.recalls,
              staffMembers: (parsed.staffMembers && parsed.staffMembers.length > 0) ? parsed.staffMembers : seedData.staffMembers,
              clinicInfo: activeTenant || parsed.clinicInfo || seedData.clinicInfo,
              useSupabase: false,
              currentTenantSlug: currentSlug
            } 
          });
        } catch (err) {
          console.error('Error loading scoped localStorage:', err);
          dispatch({ 
            type: 'INIT_DATA', 
            payload: { 
              ...seedData, 
              clinicInfo: activeTenant || seedData.clinicInfo, 
              useSupabase: false,
              currentTenantSlug: currentSlug 
            } 
          });
        }
      } else {
        dispatch({ 
          type: 'INIT_DATA', 
          payload: { 
            ...seedData, 
            clinicInfo: activeTenant || seedData.clinicInfo, 
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
    if (state.isLoading) return;
    const currentSlug = tenantSlug || 'dr-ahmed';

    // Strict Isolation Guard: DO NOT save state if state does not match the active tenant slug!
    if (state.currentTenantSlug && state.currentTenantSlug !== currentSlug) {
      return;
    }

    if (state.patients.length === 0 && state.appointments.length === 0 && !state._freshReset) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const scopedKey = `clinicflow_data_${currentSlug}`;
      try {
        const payload = JSON.stringify({
          _version: DATA_SCHEMA_VERSION,
          patients: state.patients,
          appointments: state.appointments,
          blockedSlots: state.blockedSlots,
          notifications: state.notifications,
          staffMembers: state.staffMembers,
          clinicInfo: state.clinicInfo,
          expenses: state.expenses,
          recalls: state.recalls
        });
        localStorage.setItem(scopedKey, payload);
        if (currentSlug === 'dr-ahmed') {
          localStorage.setItem('clinicflow_data', payload);
        }
      } catch (err) {
        console.warn('LocalStorage quota warning, executing smart compaction:', err);
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
          localStorage.setItem(scopedKey, JSON.stringify(compactedState));
          if (currentSlug === 'dr-ahmed') {
            localStorage.setItem('clinicflow_data', JSON.stringify(compactedState));
          }
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
      const activeClinicName = stateRef.current.clinicInfo?.name || (tenantSlug === 'dr-sara' ? 'عيادة د. سارة للجلدية والتجميل' : 'مركز النخبة لطب الأسنان');
      await sendReminder(
        appointment.patientName,
        appointment.patientPhone,
        appointment.date,
        appointment.time,
        activeClinicName
      );
    } catch (err) {
      console.error('SMS send failed:', err);
    }
  }, [tenantSlug]);

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
