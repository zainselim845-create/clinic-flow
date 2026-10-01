import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createClinicRealtimeManager,
  mapPostgresChangeToDomainAction,
  REALTIME_STATUS,
  BROADCAST_EVENTS,
  playChime
} from '../services/realtimeSyncService';
import {
  registerDoctorAndClinic,
  provisionStaffAccount,
  authenticateUser,
  getAllPlatformUsers,
  clearAuthCache,
  broadcastTenantUpdate
} from '../services/authService';
import { hasPermission, isAdminRole, isDoctorRole, canAccessRoute } from '../utils/permissions';
import { syncOutbox, OUTBOX_STATUS } from '../lib/syncOutbox';
import { cloudCircuitBreaker, CIRCUIT_STATE } from '../lib/circuitBreaker';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

globalThis.localStorage = createStorageMock();
globalThis.sessionStorage = createStorageMock();

describe('Real-Time Interconnection & Full-Stack Architecture Test', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearAuthCache();
    cloudCircuitBreaker.reset();
    syncOutbox.clearHandlers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Real-Time Channel Lifecycle & Live Event Mapping', () => {
    it('establishes clinic-scoped realtime channel and transitions status to SUBSCRIBED', () => {
      let currentStatus = null;
      let capturedSubscribeCallback = null;

      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((cb) => {
          capturedSubscribeCallback = cb;
          return mockChannel;
        }),
        send: vi.fn().mockResolvedValue('ok')
      };

      const mockSupabase = {
        channel: vi.fn(() => mockChannel),
        removeChannel: vi.fn()
      };

      const manager = createClinicRealtimeManager({
        supabaseClient: mockSupabase,
        clinicId: 'clinic-cairo-north',
        onDispatch: vi.fn(),
        onStatusChange: (status) => { currentStatus = status; }
      });

      expect(mockSupabase.channel).toHaveBeenCalledWith('clinic-realtime-clinic-cairo-north');
      expect(currentStatus).toBe(REALTIME_STATUS.CONNECTING);

      capturedSubscribeCallback('SUBSCRIBED');
      expect(currentStatus).toBe(REALTIME_STATUS.SUBSCRIBED);
      expect(manager.status).toBe(REALTIME_STATUS.SUBSCRIBED);
    });

    it('maps incoming Postgres change events to proper domain actions for state injection', () => {
      const apptRow = {
        id: 'appt_realtime_01',
        clinic_id: 'clinic-test',
        patient_name: 'عمر شريف',
        date: '2026-10-02',
        time: '11:00',
        status: 'booked'
      };

      const insertAction = mapPostgresChangeToDomainAction('appointments', {
        eventType: 'INSERT',
        new: apptRow
      });
      expect(insertAction.type).toBe('ADD_APPOINTMENT');
      expect(insertAction.payload.patientName).toBe('عمر شريف');

      const updateAction = mapPostgresChangeToDomainAction('appointments', {
        eventType: 'UPDATE',
        new: { ...apptRow, status: 'completed' }
      });
      expect(updateAction.type).toBe('UPDATE_APPOINTMENT');
      expect(updateAction.payload.status).toBe('completed');

      const deleteAction = mapPostgresChangeToDomainAction('appointments', {
        eventType: 'DELETE',
        old: { id: 'appt_realtime_01' }
      });
      expect(deleteAction.type).toBe('DELETE_APPOINTMENT');
      expect(deleteAction.payload).toBe('appt_realtime_01');
    });
  });

  describe('2. Real-Time Peer-to-Peer Broadcast & Audio Chimes', () => {
    it('synthesizes Web Audio chimes without throwing errors in headless or standard runtimes', () => {
      expect(() => playChime('patient_arrival')).not.toThrow();
      expect(() => playChime('doctor_call')).not.toThrow();
      expect(() => playChime('notification')).not.toThrow();
    });

    it('transmits and receives broadcast events across staff and doctor screens', async () => {
      let broadcastHandler = null;
      const mockChannel = {
        on: vi.fn((type, filter, cb) => {
          if (type === 'broadcast') broadcastHandler = cb;
          return mockChannel;
        }),
        subscribe: vi.fn().mockReturnThis(),
        send: vi.fn().mockResolvedValue('ok')
      };

      const mockSupabase = {
        channel: vi.fn(() => mockChannel),
        removeChannel: vi.fn()
      };

      const receivedBroadcasts = [];
      const manager = createClinicRealtimeManager({
        supabaseClient: mockSupabase,
        clinicId: 'clinic-alex-central',
        onDispatch: vi.fn(),
        onBroadcast: (payload) => receivedBroadcasts.push(payload)
      });

      // Simulate sending broadcast
      await manager.broadcast(BROADCAST_EVENTS.PATIENT_ARRIVED, {
        patientName: 'كريم عبد العزيز',
        message: 'وصل المريض كريم عبد العزيز إلى صالة الانتظار.'
      });

      expect(mockChannel.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'broadcast',
        event: 'clinic_event',
        payload: expect.objectContaining({
          eventType: BROADCAST_EVENTS.PATIENT_ARRIVED,
          patientName: 'كريم عبد العزيز'
        })
      }));

      // Simulate receiving broadcast
      if (broadcastHandler) {
        broadcastHandler({
          payload: {
            eventType: BROADCAST_EVENTS.PATIENT_ARRIVED,
            message: 'وصل المريض كريم عبد العزيز إلى صالة الانتظار.'
          }
        });
      }

      expect(receivedBroadcasts).toHaveLength(1);
      expect(receivedBroadcasts[0].message).toContain('كريم عبد العزيز');
    });
  });

  describe('3. AuthN & AuthZ Cohesion, RBAC Gates, and Route Access', () => {
    it('authenticates doctor and verifies full administrative permissions', () => {
      const { tenant, user } = registerDoctorAndClinic({
        doctorName: 'د. هشام طلعت',
        email: 'dr.hesham@clinicflow.test',
        phone: '01011223344',
        password: 'password123',
        clinicName: 'مركز الأمل التخصصي',
        specialty: 'طب وجراحة العيون'
      });

      expect(tenant.slug).toBeDefined();
      expect(user.role).toBe('doctor');
      expect(isAdminRole(user)).toBe(true);
      expect(isDoctorRole(user)).toBe(true);
      expect(hasPermission(user, 'appointments')).toBe(true);
      expect(hasPermission(user, 'invoices')).toBe(true);
      expect(hasPermission(user, 'inventory')).toBe(true);

      const authenticated = authenticateUser('dr.hesham@clinicflow.test', 'password123');
      expect(authenticated).toBeDefined();
      expect(authenticated.email).toBe('dr.hesham@clinicflow.test');
    });

    it('provisions receptionist staff with scoped permissions and blocks unauthorized routes', () => {
      const staff = provisionStaffAccount({
        clinicId: 'clinic-test-123',
        clinicSlug: 'dr-hesham',
        name: 'سارة أحمد',
        phone: '01122334455',
        email: 'sara@clinicflow.test',
        password: 'pass456',
        role: 'receptionist',
        permissions: ['appointments', 'patients']
      });

      expect(staff.role).toBe('receptionist');
      expect(isAdminRole(staff)).toBe(false);
      expect(isDoctorRole(staff)).toBe(false);

      expect(hasPermission(staff, 'appointments')).toBe(true);
      expect(hasPermission(staff, 'patients')).toBe(true);
      expect(hasPermission(staff, 'invoices')).toBe(false);
      expect(hasPermission(staff, 'inventory')).toBe(false);

      expect(canAccessRoute(staff, '/appointments')).toBe(true);
      expect(canAccessRoute(staff, '/patients')).toBe(true);
      expect(canAccessRoute(staff, '/invoices')).toBe(false);
      expect(canAccessRoute(staff, '/doctor-agent')).toBe(false);
      expect(canAccessRoute(staff, '/settings')).toBe(false);
    });

    it('provisions accountant staff with financial permissions only', () => {
      const accountant = provisionStaffAccount({
        clinicId: 'clinic-test-123',
        clinicSlug: 'dr-hesham',
        name: 'محمود فهمي',
        phone: '01233445566',
        email: 'accountant@clinicflow.test',
        password: 'pass789',
        role: 'accountant',
        permissions: ['invoices']
      });

      expect(hasPermission(accountant, 'invoices')).toBe(true);
      expect(hasPermission(accountant, 'appointments')).toBe(false);
      expect(canAccessRoute(accountant, '/invoices')).toBe(true);
      expect(canAccessRoute(accountant, '/appointments')).toBe(false);
    });

    it('authenticates Super Admin master account and grants platform-wide access', () => {
      const superAdmin = authenticateUser('superadmin@clinicflow.com', 'cf-superadmin-sec-2026-x9');
      expect(superAdmin).toBeDefined();
      expect(superAdmin.role).toBe('super_admin');
      expect(superAdmin.isSuperAdmin).toBe(true);
      expect(isAdminRole(superAdmin)).toBe(true);
      expect(canAccessRoute(superAdmin, '/super-admin')).toBe(true);
      expect(canAccessRoute(superAdmin, '/invoices')).toBe(true);
      expect(canAccessRoute(superAdmin, '/appointments')).toBe(true);
    });
  });

  describe('4. Autonomous Offline Outbox Real-Time Drain Engine', () => {
    it('executes real backend service calls when draining outbox mutations', async () => {
      const mockAddAppointment = vi.spyOn(appointmentsService, 'addAppointment')
        .mockResolvedValue({ data: { id: 'appt-live-synced' }, error: null });

      const mockAddPatient = vi.spyOn(patientsService, 'addPatient')
        .mockResolvedValue({ data: { id: 'pat-live-synced' }, error: null });

      // Enqueue appointment
      const apptItem = {
        entityType: 'appointment',
        action: 'create',
        payload: { patientName: 'طارق حسام', date: '2026-10-05', time: '14:00' },
        clinicId: 'clinic-live'
      };
      const resultAppt = await syncOutbox.executeSyncItem(apptItem);
      expect(resultAppt).toBe(true);
      expect(mockAddAppointment).toHaveBeenCalledWith(apptItem.payload);

      // Enqueue patient
      const patientItem = {
        entityType: 'patient',
        action: 'create',
        payload: { name: 'نهى سمير', phone: '01099887766' },
        clinicId: 'clinic-live'
      };
      const resultPat = await syncOutbox.executeSyncItem(patientItem);
      expect(resultPat).toBe(true);
      expect(mockAddPatient).toHaveBeenCalledWith(patientItem.payload);
    });

    it('supports custom handler registration for extensible feature slices', async () => {
      const customHandler = vi.fn().mockResolvedValue(true);
      syncOutbox.registerHandler('custom_lab_order', customHandler);

      const item = {
        entityType: 'custom_lab_order',
        action: 'create',
        payload: { testName: 'صورة دم كاملة CBC' }
      };

      const result = await syncOutbox.executeSyncItem(item);
      expect(result).toBe(true);
      expect(customHandler).toHaveBeenCalledWith(item);
    });
  });

  describe('5. Cross-Tab & Cross-Window Reactive Dispatch', () => {
    it('dispatches broadcast updates via CustomEvent and BroadcastChannel safely', () => {
      const eventSpy = vi.fn();
      if (typeof window !== 'undefined') {
        window.addEventListener('clinicflow_sync', eventSpy);
      }

      expect(() => {
        broadcastTenantUpdate('TENANT_SWITCH', { slug: 'dr-new-clinic' });
      }).not.toThrow();

      if (typeof window !== 'undefined') {
        window.removeEventListener('clinicflow_sync', eventSpy);
      }
    });
  });
});
