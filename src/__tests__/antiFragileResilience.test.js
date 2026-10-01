import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cloudCircuitBreaker, CIRCUIT_STATE } from '../lib/circuitBreaker';
import { syncOutbox, OUTBOX_STATUS } from '../lib/syncOutbox';
import { migrateTenantPayload, CURRENT_SCHEMA_VERSION, sanitizeAppointment, sanitizePatient } from '../lib/schemaMigration';
import { executeResilientOperation } from '../lib/resilientService';
import PageErrorBoundary from '../components/PageErrorBoundary';

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

describe('Anti-Fragile Resilience Architecture', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    cloudCircuitBreaker.reset();
  });

  describe('Pillar 1: Cloud Circuit Breaker', () => {
    it('initializes in CLOSED state with available status', () => {
      expect(cloudCircuitBreaker.state).toBe(CIRCUIT_STATE.CLOSED);
      expect(cloudCircuitBreaker.isAvailable()).toBe(true);
    });

    it('trips immediately to OPEN upon PGRST205 schema cache missing error', () => {
      const pgrstError = { code: 'PGRST205', message: 'Could not find the table in public schema cache' };
      cloudCircuitBreaker.recordFailure(pgrstError);

      expect(cloudCircuitBreaker.state).toBe(CIRCUIT_STATE.OPEN);
      expect(cloudCircuitBreaker.isAvailable()).toBe(false);
      expect(cloudCircuitBreaker.tripReason).toBe('schema_missing_pgrst205');
    });

    it('trips immediately when auth credentials are invalid', () => {
      cloudCircuitBreaker.recordFailure('invalid_api_key provided');
      expect(cloudCircuitBreaker.state).toBe(CIRCUIT_STATE.OPEN);
      expect(cloudCircuitBreaker.isAvailable()).toBe(false);
      expect(cloudCircuitBreaker.tripReason).toBe('auth_credentials_invalid');
    });

    it('trips to OPEN after consecutive threshold failures', () => {
      cloudCircuitBreaker.recordFailure('network timeout 1');
      expect(cloudCircuitBreaker.state).toBe(CIRCUIT_STATE.CLOSED);

      cloudCircuitBreaker.recordFailure('network timeout 2');
      expect(cloudCircuitBreaker.state).toBe(CIRCUIT_STATE.CLOSED);

      cloudCircuitBreaker.recordFailure('network timeout 3');
      expect(cloudCircuitBreaker.state).toBe(CIRCUIT_STATE.OPEN);
      expect(cloudCircuitBreaker.isAvailable()).toBe(false);
    });

    it('resets to CLOSED and clears failure counts on manual reset or recordSuccess', () => {
      cloudCircuitBreaker.trip('manual_test');
      expect(cloudCircuitBreaker.state).toBe(CIRCUIT_STATE.OPEN);

      cloudCircuitBreaker.recordSuccess();
      expect(cloudCircuitBreaker.state).toBe(CIRCUIT_STATE.CLOSED);
      expect(cloudCircuitBreaker.consecutiveFailures).toBe(0);
      expect(cloudCircuitBreaker.isAvailable()).toBe(true);
    });

    it('notifies subscribers on state transitions', () => {
      const listener = vi.fn();
      const unsubscribe = cloudCircuitBreaker.subscribe(listener);

      cloudCircuitBreaker.trip('listener_test');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        oldState: CIRCUIT_STATE.CLOSED,
        newState: CIRCUIT_STATE.OPEN,
        reason: 'listener_test'
      }));

      unsubscribe();
      cloudCircuitBreaker.reset();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pillar 2: Non-Destructive Schema Auto-Migration', () => {
    it('preserves existing patient and appointment data when version is old or missing', () => {
      const legacyPayload = {
        _version: 'v1_legacy_initial',
        patients: [
          { id: 'p1', name: 'أحمد محمود', phone: '01012345678' }
        ],
        appointments: [
          { id: 'a1', patientName: 'أحمد محمود', date: '2026-10-01', time: '12:00' }
        ],
        expenses: [
          { id: 'e1', amount: 500, category: 'إيجار' }
        ],
        recalls: [
          { id: 'r1', patientName: 'سارة علي' }
        ]
      };

      const migrated = migrateTenantPayload(legacyPayload, 'dr-samir');

      expect(migrated._version).toBe(CURRENT_SCHEMA_VERSION);
      expect(migrated.patients).toHaveLength(1);
      expect(migrated.patients[0].name).toBe('أحمد محمود');
      expect(migrated.patients[0].clinicSlug).toBe('dr-samir');

      expect(migrated.appointments).toHaveLength(1);
      expect(migrated.appointments[0].patientName).toBe('أحمد محمود');
      expect(migrated.appointments[0].status).toBe('booked');

      expect(migrated.expenses).toHaveLength(1);
      expect(migrated.expenses[0].amount).toBe(500);

      expect(migrated.recalls).toHaveLength(1);
      expect(migrated.recalls[0].patientName).toBe('سارة علي');
    });

    it('returns a clean validated zero-state object if input is null or non-object', () => {
      const resultNull = migrateTenantPayload(null, 'dr-tarek');
      expect(resultNull._version).toBe(CURRENT_SCHEMA_VERSION);
      expect(resultNull.patients).toEqual([]);
      expect(resultNull.appointments).toEqual([]);
      expect(resultNull.currentTenantSlug).toBe('dr-tarek');

      const resultString = migrateTenantPayload('corrupted_string', 'dr-tarek');
      expect(resultString.patients).toEqual([]);
    });

    it('sanitizes individual appointments with defaults for missing properties', () => {
      const incompleteAppt = { patientName: 'مريض تجريبي' };
      const sanitized = sanitizeAppointment(incompleteAppt, 'dr-test');

      expect(sanitized.id).toBeDefined();
      expect(sanitized.status).toBe('booked');
      expect(sanitized.patientName).toBe('مريض تجريبي');
      expect(sanitized.fee).toBe(200);
      expect(sanitized.clinicSlug).toBe('dr-test');
    });

    it('sanitizes individual patients with defaults for missing properties', () => {
      const incompletePatient = {};
      const sanitized = sanitizePatient(incompletePatient, 'dr-test');

      expect(sanitized.id).toBeDefined();
      expect(sanitized.name).toBe('مريض غير مسمى');
      expect(sanitized.status).toBe('active');
      expect(sanitized.visitsCount).toBe(1);
    });
  });

  describe('Pillar 3: Autonomous Offline Outbox', () => {
    it('enqueues mutations with unique IDs and pending status', async () => {
      const item = await syncOutbox.enqueue({
        entityType: 'appointment',
        action: 'create',
        payload: { patientName: 'خالد إبراهيم', date: '2026-10-02' },
        clinicId: 'clinic-123'
      });

      expect(item.id).toBeDefined();
      expect(item.status).toBe(OUTBOX_STATUS.PENDING);
      expect(item.entityType).toBe('appointment');
      expect(item.timestamp).toBeGreaterThan(0);
    });

    it('notifies listeners when new items are enqueued', async () => {
      const listener = vi.fn();
      const unsubscribe = syncOutbox.subscribe(listener);

      await syncOutbox.enqueue({
        entityType: 'patient',
        action: 'create',
        payload: { name: 'منى السيد' },
        clinicId: 'clinic-456'
      });

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'ENQUEUED'
      }));

      unsubscribe();
    });
  });

  describe('Pillar 4: Resilient Service Layer Execution', () => {
    it('executes remoteFn and returns remote result when healthy', async () => {
      const mockRemote = vi.fn().mockResolvedValue({ data: [{ id: 1, name: 'سجل سليم' }], error: null });
      const mockLocal = vi.fn();

      const result = await executeResilientOperation({
        operationName: 'fetchPatients',
        remoteFn: mockRemote,
        localFn: mockLocal,
        defaultValue: []
      });

      expect(result.success).toBe(true);
      expect(result.isLocal).toBe(false);
      expect(result.data).toEqual([{ id: 1, name: 'سجل سليم' }]);
      expect(mockRemote).toHaveBeenCalledTimes(1);
      expect(mockLocal).not.toHaveBeenCalled();
    });

    it('falls back to localFn without throwing when remoteFn throws an error', async () => {
      const mockRemote = vi.fn().mockRejectedValue(new Error('503 Service Unavailable'));
      const mockLocal = vi.fn().mockResolvedValue([{ id: 'local-1', name: 'بيانات محلية محفوظة' }]);

      const result = await executeResilientOperation({
        operationName: 'fetchPatientsWithFallback',
        remoteFn: mockRemote,
        localFn: mockLocal,
        defaultValue: []
      });

      expect(result.success).toBe(true);
      expect(result.isLocal).toBe(true);
      expect(result.data).toEqual([{ id: 'local-1', name: 'بيانات محلية محفوظة' }]);
      expect(cloudCircuitBreaker.consecutiveFailures).toBeGreaterThan(0);
    });

    it('bypasses remoteFn entirely when circuit is OPEN, giving 0ms local response', async () => {
      cloudCircuitBreaker.trip('offline_mode');

      const mockRemote = vi.fn();
      const mockLocal = vi.fn().mockResolvedValue([{ id: 'fast-local' }]);

      const result = await executeResilientOperation({
        operationName: 'fastLocalBypass',
        remoteFn: mockRemote,
        localFn: mockLocal,
        defaultValue: []
      });

      expect(mockRemote).not.toHaveBeenCalled();
      expect(mockLocal).toHaveBeenCalledTimes(1);
      expect(result.isLocal).toBe(true);
      expect(result.data).toEqual([{ id: 'fast-local' }]);
    });

    it('returns defaultValue and structured error if both remote and local fail', async () => {
      cloudCircuitBreaker.trip('offline_mode');
      const mockLocal = vi.fn().mockRejectedValue(new Error('IndexedDB disk error'));

      const result = await executeResilientOperation({
        operationName: 'catastrophicDoubleFailure',
        localFn: mockLocal,
        defaultValue: []
      });

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('IndexedDB disk error');
    });
  });

  describe('Pillar 5: PageErrorBoundary Route Isolation', () => {
    it('updates state via getDerivedStateFromError when component crashes', () => {
      const testError = new Error('Unexpected render crash in component');
      const state = PageErrorBoundary.getDerivedStateFromError(testError);

      expect(state.hasError).toBe(true);
      expect(state.error).toBe(testError);
    });

    it('resets error state when handleRetry is invoked', () => {
      const boundary = new PageErrorBoundary({ pageName: 'المرضى' });
      boundary.state = { hasError: true, error: new Error('Crash') };
      boundary.setState = (updates) => {
        boundary.state = { ...boundary.state, ...updates };
      };

      boundary.handleRetry();
      expect(boundary.state.hasError).toBe(false);
      expect(boundary.state.error).toBe(null);
    });

    it('renders localized fallback card when hasError is true', () => {
      const boundary = new PageErrorBoundary({ pageName: 'المرضى', children: 'صفحة المرضى الأصلية' });
      boundary.state = { hasError: true, error: new Error('Crash') };
      const fallback = boundary.render();
      expect(fallback).toBeDefined();
      expect(fallback.props.className).toBe('page-error-boundary-container');
    });

    it('renders normal children when hasError is false', () => {
      const boundary = new PageErrorBoundary({ pageName: 'المرضى', children: 'صفحة المرضى الأصلية' });
      boundary.state = { hasError: false, error: null };
      const children = boundary.render();
      expect(children).toBe('صفحة المرضى الأصلية');
    });
  });
});
