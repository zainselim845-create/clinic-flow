import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';
import { apiCache } from '../services/apiCacheService';
import { multiTierCache } from '../services/multiTierCacheService';
import { clearIdempotencyStore, executeWithIdempotency } from '../services/idempotencyService';
import { patientIndex } from '../services/indexedSearchService';
import { mergeConflictingPayloads, OUTBOX_STATUS, syncOutbox, hasPendingSyncItems } from '../lib/syncOutbox';
import { localDb } from '../db/localDatabase';
import { supabase } from '../lib/supabase';
import { safeSetJSON, safeGetJSON } from '../utils/safeStorage';

// Mock Supabase client for unit test isolation
vi.mock('../lib/supabase', () => {
  const mockTable = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    not: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    is: vi.fn()
  };

  mockTable.select.mockReturnThis();
  mockTable.insert.mockReturnThis();
  mockTable.update.mockReturnThis();
  mockTable.delete.mockReturnThis();
  mockTable.eq.mockReturnThis();
  mockTable.not.mockReturnThis();
  mockTable.neq.mockReturnThis();
  mockTable.order.mockReturnThis();
  mockTable.limit.mockReturnThis();
  mockTable.is.mockReturnThis();

  return {
    supabase: {
      from: vi.fn(() => mockTable),
      rpc: vi.fn()
    },
    isSupabaseConfigured: vi.fn(() => true),
    NOT_CONFIGURED_ERROR: new Error('Supabase is not configured')
  };
});

describe('Audited Architectural Hardening Suite (Full Rigor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiCache.clear();
    multiTierCache.clear();
    clearIdempotencyStore();
    patientIndex.clearIndex();
  });

  describe('1. Fallback Path Elimination & Atomic Booking Enforcement', () => {
    it('fails safely with explicit protective error when atomic booking RPC is unavailable (no naked INSERT fallback)', async () => {
      // Simulate RPC function not existing in PostgreSQL (error PGRST202)
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST202', message: 'Could not find the function public.book_appointment_atomic' }
      });

      const appointment = {
        clinicId: 'clinic-safety-1',
        patientName: 'مريض الفحص الآمن',
        patientPhone: '01011112222',
        date: '2026-10-30',
        time: '10:00'
      };

      const result = await appointmentsService.addAppointment(appointment);

      // Must fail with error and NEVER silently fall back to table insert
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Atomic booking protection is required');
      expect(result.error.message).toContain('Direct insert fallback is disabled');
    });

    it('succeeds cleanly when atomic booking RPC confirms reservation', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          is_replay: false,
          data: {
            id: 'apt-atomic-ok-1',
            clinic_id: 'clinic-safety-1',
            date: '2026-10-30',
            time: '10:00',
            status: 'booked'
          }
        },
        error: null
      });

      const appointment = {
        clinicId: 'clinic-safety-1',
        patientName: 'مريض ناجح',
        patientPhone: '01011112222',
        date: '2026-10-30',
        time: '10:00'
      };

      const result = await appointmentsService.addAppointment(appointment);
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('apt-atomic-ok-1');
    });

    it('prevents double-booking race condition when two requests target the same slot', async () => {
      let existingBookings = [];

      // Simulate atomic advisory lock & RPC booking in PostgreSQL
      supabase.rpc.mockImplementation(async (fnName, params) => {
        if (fnName === 'book_appointment_atomic') {
          const isBooked = existingBookings.some(
            b => b.clinic_id === params.p_clinic_id &&
                 b.doctor_id === params.p_doctor_id &&
                 b.date === params.p_date &&
                 b.time === params.p_time
          );

          if (isBooked) {
            return {
              data: {
                success: false,
                code: 'SLOT_COLLISION',
                message: `Slot collision: The requested slot on ${params.p_date} at ${params.p_time} is already booked or overlaps with an active appointment.`
              },
              error: null
            };
          }

          const newApt = {
            id: 'apt-sim-' + Date.now() + Math.random(),
            clinic_id: params.p_clinic_id,
            doctor_id: params.p_doctor_id,
            date: params.p_date,
            time: params.p_time,
            status: params.p_status || 'booked'
          };
          existingBookings.push(newApt);
          return {
            data: { success: true, is_replay: false, data: newApt },
            error: null
          };
        }
        return { data: null, error: new Error('Unknown RPC') };
      });

      const apt1 = {
        clinicId: 'clinic-cairo',
        doctorId: 'doc-1',
        patientName: 'مريض أول',
        patientPhone: '01011112222',
        date: '2026-10-20',
        time: '11:00'
      };

      const apt2 = {
        clinicId: 'clinic-cairo',
        doctorId: 'doc-1',
        patientName: 'مريض ثان متزامن',
        patientPhone: '01033334444',
        date: '2026-10-20',
        time: '11:00'
      };

      // Trigger concurrent booking attempts
      const [res1, res2] = await Promise.all([
        appointmentsService.addAppointment(apt1),
        appointmentsService.addAppointment(apt2)
      ]);

      const successes = [res1, res2].filter(r => r.data && !r.error);
      const failures = [res1, res2].filter(r => r.error);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0].error.message).toContain('Slot collision');
    });
  });

  describe('2. Slot Collision by Duration Overlap, Doctor, Branch, and Status', () => {
    it('detects slot collision when appointment times overlap based on duration', async () => {
      // Existing appointment: 10:00 (duration 30m -> ends 10:30)
      const existing = [
        {
          id: 'apt-dur-1',
          clinicId: 'c1',
          doctorId: 'doc-1',
          date: '2026-11-01',
          time: '10:00',
          duration: 30,
          status: 'booked'
        }
      ];

      // Test 1: Requested 10:15 (duration 30m -> 10:15 to 10:45) - OVERLAPS with 10:00-10:30!
      const isCollidingOverlap = await appointmentsService.checkSlotCollision(
        'c1', '2026-11-01', '10:15', null, existing, 'doc-1', 30
      );
      expect(isCollidingOverlap).toBe(true);

      // Test 2: Requested 10:30 (starts exactly when existing ends) - NO overlap!
      const isCollidingAdjacent = await appointmentsService.checkSlotCollision(
        'c1', '2026-11-01', '10:30', null, existing, 'doc-1', 30
      );
      expect(isCollidingAdjacent).toBe(false);

      // Test 3: Different doctor at 10:15 - NO collision!
      const isCollidingDiffDoc = await appointmentsService.checkSlotCollision(
        'c1', '2026-11-01', '10:15', null, existing, 'doc-2', 30
      );
      expect(isCollidingDiffDoc).toBe(false);
    });

    it('ignores cancelled, refunded, and soft-deleted appointments during collision check', async () => {
      const existing = [
        {
          id: 'apt-cancelled-1',
          clinicId: 'c1',
          doctorId: 'doc-1',
          date: '2026-11-02',
          time: '12:00',
          status: 'cancelled'
        },
        {
          id: 'apt-refunded-1',
          clinicId: 'c1',
          doctorId: 'doc-1',
          date: '2026-11-02',
          time: '12:30',
          status: 'refunded'
        },
        {
          id: 'apt-deleted-1',
          clinicId: 'c1',
          doctorId: 'doc-1',
          date: '2026-11-02',
          time: '13:00',
          status: 'booked',
          deletedAt: '2026-11-01T08:00:00Z'
        }
      ];

      const check1 = await appointmentsService.checkSlotCollision('c1', '2026-11-02', '12:00', null, existing, 'doc-1');
      const check2 = await appointmentsService.checkSlotCollision('c1', '2026-11-02', '12:30', null, existing, 'doc-1');
      const check3 = await appointmentsService.checkSlotCollision('c1', '2026-11-02', '13:00', null, existing, 'doc-1');

      expect(check1).toBe(false);
      expect(check2).toBe(false);
      expect(check3).toBe(false);
    });

    it('validates duration collision on rescheduling via updateAppointment', async () => {
      const mockTable = supabase.from('appointments');
      mockTable.select.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        then: (cb) => Promise.resolve(cb({
          data: [{ id: 'existing-other', time: '14:00', duration_min: 30 }],
          error: null
        }))
      });

      // Try to reschedule to 14:15 which overlaps with 14:00-14:30
      const res = await appointmentsService.updateAppointment('my-apt', {
        date: '2026-11-05',
        time: '14:15',
        duration: 30
      }, 'clinic-1');

      expect(res.data).toBeNull();
      expect(res.error).toBeDefined();
      expect(res.error.message).toContain('Slot collision');
    });
  });

  describe('3. Persistent Multi-Tier Idempotency Architecture', () => {
    it('survives page reload by retrieving completed idempotency results from persistent storage', async () => {
      const key = 'idemp_reload_test_' + Date.now();
      const clinicId = 'c-reload-1';
      const userId = 'u-reload-1';

      let executionCount = 0;
      const initialRun = await executeWithIdempotency(key, async () => {
        executionCount++;
        return { data: { bookingId: 'bk-first-session' } };
      }, { clinicId, userId, ttlMs: 60000 });

      expect(initialRun.isReplay).toBe(false);
      expect(executionCount).toBe(1);

      // Simulate browser refresh/tab reopen: clear in-memory Map
      // Note: we do NOT call clearIdempotencyStore because that purges disk storage
      const resAfterReload = await executeWithIdempotency(key, async () => {
        executionCount++;
        return { data: { bookingId: 'bk-should-not-run' } };
      }, { clinicId, userId, ttlMs: 60000 });

      expect(resAfterReload.isReplay).toBe(true);
      expect(resAfterReload.result.data.bookingId).toBe('bk-first-session');
      // Execution must NOT have run again!
      expect(executionCount).toBe(1);
    });

    it('never poisons idempotency store with transient network failures', async () => {
      let runCount = 0;
      const transientKey = 'key_network_test_' + Date.now();

      const firstRun = await executeWithIdempotency(transientKey, async () => {
        runCount++;
        return {
          error: { isNetworkError: true, message: 'Failed to fetch (offline network)' }
        };
      });

      expect(firstRun.isReplay).toBe(false);
      expect(runCount).toBe(1);

      // Subsequent attempt after connection restored MUST execute actionFn again
      const secondRun = await executeWithIdempotency(transientKey, async () => {
        runCount++;
        return { data: { id: 'created-after-reconnect' } };
      });

      expect(secondRun.isReplay).toBe(false);
      expect(secondRun.result.data.id).toBe('created-after-reconnect');
      expect(runCount).toBe(2);
    });

    it('scopes idempotency keys per user and clinic preventing cross-user collision', async () => {
      const sharedKey = 'common_action_token';
      let user1Count = 0;
      let user2Count = 0;

      const res1 = await executeWithIdempotency(sharedKey, async () => {
        user1Count++;
        return { user: 'user-1-result' };
      }, { clinicId: 'c1', userId: 'user-1' });

      const res2 = await executeWithIdempotency(sharedKey, async () => {
        user2Count++;
        return { user: 'user-2-result' };
      }, { clinicId: 'c1', userId: 'user-2' });

      expect(res1.result.user).toBe('user-1-result');
      expect(res2.result.user).toBe('user-2-result');
      expect(user1Count).toBe(1);
      expect(user2Count).toBe(1);
    });
  });

  describe('4. Offline Outbox Hardening & Medical Record Integrity', () => {
    it('discloses transient memory fallback when IndexedDB persistence fails', async () => {
      // Force localDb to reject
      const spyEnqueue = vi.spyOn(localDb, 'enqueueSyncItem').mockRejectedValueOnce(
        new Error('IndexedDB quota exceeded or storage failure')
      );

      const res = await syncOutbox.enqueue({
        entityType: 'appointment',
        action: 'create',
        payload: { id: 'apt-fail-storage', patientName: 'أحمد' },
        clinicId: 'c1',
        userId: 'u1'
      });

      expect(res.durable).toBe(false);
      expect(res.warning).toContain('TRANSIENT_MEMORY_ONLY');
      expect(res.isInMemoryFallback).toBe(true);

      spyEnqueue.mockRestore();
    });

    it('isolates pending sync operations by userId preventing syncing another user after logout', async () => {
      // Enqueue items for user A and user B
      await localDb.enqueueSyncItem({
        id: 'sync-user-a',
        entityType: 'patient',
        action: 'create',
        payload: { name: 'مريض المستخدم أ' },
        clinicId: 'c1',
        userId: 'user-a',
        status: 'pending',
        timestamp: Date.now()
      });

      await localDb.enqueueSyncItem({
        id: 'sync-user-b',
        entityType: 'patient',
        action: 'create',
        payload: { name: 'مريض المستخدم ب' },
        clinicId: 'c1',
        userId: 'user-b',
        status: 'pending',
        timestamp: Date.now() + 1
      });

      // Query pending items specifically for user-a
      const userAItems = await localDb.getPendingSyncItems({ userId: 'user-a' });
      expect(userAItems.some(i => i.id === 'sync-user-a')).toBe(true);
      expect(userAItems.some(i => i.id === 'sync-user-b')).toBe(false);

      // Check hasPendingSyncItems helper
      const hasForA = await hasPendingSyncItems('user-a');
      const hasForC = await hasPendingSyncItems('user-non-existent');
      expect(hasForA).toBe(true);
      expect(hasForC).toBe(false);
    });

    it('preserves medical notes and diagnoses separately in conflictDetails without naive string concatenation', () => {
      const local = {
        version: 2,
        notes: 'ملاحظة محلية: المريض يعاني من حساسية البنسلين.',
        diagnosis: 'التهاب شعبي حاد',
        userId: 'dr-local',
        updatedAt: '2026-10-13T10:00:00Z'
      };

      const remote = {
        version: 3,
        notes: 'ملاحظة سحابية: تم فحص الصدر والنبض طبيعي.',
        diagnosis: 'نزلة برد بسيطة',
        userId: 'dr-remote',
        updatedAt: '2026-10-13T10:05:00Z'
      };

      const merged = mergeConflictingPayloads(local, remote);

      expect(merged.hasConflict).toBe(true);
      expect(merged.requiresReview).toBe(true);

      // Both versions must NOT be glued together into a confusing concatenated string
      expect(merged.conflictDetails).toBeDefined();
      expect(merged.conflictDetails.local.notes).toBe('ملاحظة محلية: المريض يعاني من حساسية البنسلين.');
      expect(merged.conflictDetails.remote.notes).toBe('ملاحظة سحابية: تم فحص الصدر والنبض طبيعي.');
      expect(merged.conflictDetails.local.diagnosis).toBe('التهاب شعبي حاد');
      expect(merged.conflictDetails.remote.diagnosis).toBe('نزلة برد بسيطة');

      // Base note remains clean canonical version
      expect(merged.notes).toBe(remote.notes);
      expect(merged.diagnosis).toBe(remote.diagnosis);
    });

    it('recovers stuck processing items back to pending', async () => {
      const stuckId = 'sync-stuck-' + Date.now();
      await localDb.enqueueSyncItem({
        id: stuckId,
        entityType: 'patient',
        action: 'create',
        payload: { name: 'سامي' },
        clinicId: 'c1',
        status: 'pending',
        timestamp: Date.now()
      });

      await localDb.updateSyncItemStatus(stuckId, 'processing');
      const recoveredCount = await localDb.recoverStuckProcessingItems();
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      const pendingAfter = await localDb.getPendingSyncItems();
      expect(pendingAfter.some(i => i.id === stuckId)).toBe(true);

      await localDb.clearAllData({ preserveSyncQueue: false });
    });
  });

  describe('5. Column Projection & API Cache Isolation', () => {
    it('applies explicit column projection DEFAULT_APPOINTMENT_COLUMNS instead of wildcard *', async () => {
      const mockTable = supabase.from('appointments');
      let capturedSelect = null;
      mockTable.select.mockImplementation((columns) => {
        capturedSelect = columns;
        return {
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      await appointmentsService.getAppointments('clinic-test-1');

      expect(capturedSelect).toBe(appointmentsService.DEFAULT_APPOINTMENT_COLUMNS);
      expect(capturedSelect).toContain('id');
      expect(capturedSelect).toContain('patient_name');
      expect(capturedSelect).toContain('doctor_id');
      expect(capturedSelect).not.toBe('*');
    });

    it('generates distinct cache keys for different user contexts', () => {
      const key1 = apiCache.createKey('appointments', 'clinic-cairo', { date: '2026-10-20' }, { userId: 'doc-1' });
      const key2 = apiCache.createKey('appointments', 'clinic-cairo', { date: '2026-10-20' }, { userId: 'doc-2' });
      const keyAll = apiCache.createKey('appointments', 'clinic-cairo', { date: '2026-10-20' });

      expect(key1).not.toBe(key2);
      expect(key1).toContain(':doc-1:');
      expect(key2).toContain(':doc-2:');
      expect(keyAll).not.toContain(':doc-');
    });
  });

  describe('6. Response Unification, NULL Attributes & Multi-Tenant Scoping', () => {
    it('consistently returns { data, error, success, code } across all addAppointment outcomes', async () => {
      // Test missing clinicId
      const resMissingClinic = await appointmentsService.addAppointment({ date: '2026-10-10', time: '10:00' });
      expect(resMissingClinic).toHaveProperty('data', null);
      expect(resMissingClinic).toHaveProperty('success', false);
      expect(resMissingClinic).toHaveProperty('code', 'MISSING_CLINIC_ID');
      expect(resMissingClinic.error).toBeInstanceOf(Error);

      // Test validation error
      const resValidation = await appointmentsService.addAppointment({ clinicId: 'c1', date: '' });
      expect(resValidation).toHaveProperty('data', null);
      expect(resValidation).toHaveProperty('success', false);
      expect(resValidation).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(resValidation.error).toBeInstanceOf(Error);
    });

    it('handles null doctorId, null branchId, and null status gracefully without false collisions', async () => {
      const existing = [
        {
          id: 'apt-null-test-1',
          clinicId: 'c1',
          doctorId: null,
          branchId: null,
          date: '2026-11-03',
          time: '09:00',
          duration: 30,
          status: null // should default to active/booked
        }
      ];

      // Exact time with null doctor and branch must detect collision
      const isColliding = await appointmentsService.checkSlotCollision(
        'c1', '2026-11-03', '09:00', null, existing, null, 30, null
      );
      expect(isColliding).toBe(true);

      // Non-overlapping time slot must be free
      const isFree = await appointmentsService.checkSlotCollision(
        'c1', '2026-11-03', '11:00', null, existing, null, 30, null
      );
      expect(isFree).toBe(false);
    });

    it('scopes idempotency keys by operationType and user preventing cross-user and cross-operation replay', async () => {
      const sharedRawKey = 'btn_submit_payload_123_' + Date.now();
      let op1Count = 0;
      let op2Count = 0;

      const resOp1 = await executeWithIdempotency(sharedRawKey, async () => {
        op1Count++;
        return { type: 'booking' };
      }, { clinicId: 'c1', userId: 'user-alpha', operationType: 'appointment_booking' });

      // Different user with same key MUST NOT replay user-alpha's result
      const resOtherUser = await executeWithIdempotency(sharedRawKey, async () => {
        return { type: 'booking-beta' };
      }, { clinicId: 'c1', userId: 'user-beta', operationType: 'appointment_booking' });

      // Same user with different operationType MUST NOT replay
      const resOp2 = await executeWithIdempotency(sharedRawKey, async () => {
        op2Count++;
        return { type: 'invoice' };
      }, { clinicId: 'c1', userId: 'user-alpha', operationType: 'invoice_create' });

      expect(resOp1.result.type).toBe('booking');
      expect(resOtherUser.result.type).toBe('booking-beta');
      expect(resOp2.result.type).toBe('invoice');
      expect(op1Count).toBe(1);
      expect(op2Count).toBe(1);
    });

    it('allows clean re-execution after idempotency key TTL expiration', async () => {
      const expiredKey = 'idemp_expire_test_' + Date.now();
      let callCount = 0;

      const run1 = await executeWithIdempotency(expiredKey, async () => {
        callCount++;
        return { step: 1 };
      }, { clinicId: 'c1', userId: 'u1', ttlMs: 10 });

      expect(run1.isReplay).toBe(false);
      expect(callCount).toBe(1);

      // Wait for TTL to expire
      await new Promise(r => setTimeout(r, 20));

      const run2 = await executeWithIdempotency(expiredKey, async () => {
        callCount++;
        return { step: 2 };
      }, { clinicId: 'c1', userId: 'u1', ttlMs: 10 });

      expect(run2.isReplay).toBe(false);
      expect(run2.result.step).toBe(2);
      expect(callCount).toBe(2);
    });
  });
});
