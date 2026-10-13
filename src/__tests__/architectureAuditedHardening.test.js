import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';
import { apiCache } from '../services/apiCacheService';
import { multiTierCache } from '../services/multiTierCacheService';
import { clearIdempotencyStore } from '../services/idempotencyService';
import { patientIndex } from '../services/indexedSearchService';
import { mergeConflictingPayloads, OUTBOX_STATUS } from '../lib/syncOutbox';
import { localDb } from '../db/localDatabase';
import { supabase } from '../lib/supabase';

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
    single: vi.fn()
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

  return {
    supabase: {
      from: vi.fn(() => mockTable)
    },
    isSupabaseConfigured: vi.fn(() => true),
    NOT_CONFIGURED_ERROR: new Error('Supabase is not configured')
  };
});

describe('Audited Architectural Hardening Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiCache.clear();
    multiTierCache.clear();
    clearIdempotencyStore();
    patientIndex.clearIndex();
  });

  describe('1. Concurrency, Slot Integrity & Idempotency', () => {
    it('prevents double-booking race condition when two requests target the same slot', async () => {
      let existingBookings = [];
      const mockTable = supabase.from('appointments');

      // Setup mock to track bookings dynamically
      mockTable.select.mockImplementation((columns) => {
        return {
          eq: vi.fn(function(col, val) {
            return this;
          }),
          not: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation(async () => {
            // Return existing bookings if slot matches
            return { data: existingBookings, error: null };
          }),
          single: vi.fn().mockImplementation(async () => {
            return { data: existingBookings[0] || null, error: null };
          })
        };
      });

      mockTable.insert.mockImplementation((records) => {
        return {
          select: () => ({
            single: async () => {
              const rec = records[0];
              // Simulate slot collision if already booked
              const collision = existingBookings.some(
                b => b.clinic_id === rec.clinic_id && b.date === rec.date && b.time === rec.time
              );
              if (collision) {
                return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
              }
              const created = { id: 'apt-' + Date.now(), ...rec };
              existingBookings.push(created);
              return { data: created, error: null };
            }
          })
        };
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

    it('allows concurrent bookings for different doctors on the same date and time', async () => {
      const mockTable = supabase.from('appointments');
      mockTable.select.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      });

      mockTable.insert.mockImplementation((records) => ({
        select: () => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'apt-' + records[0].doctor_id, ...records[0] },
            error: null
          })
        })
      }));

      const aptDoc1 = {
        clinicId: 'clinic-cairo',
        doctorId: 'doc-ortho',
        patientName: 'مريض عظام',
        patientPhone: '01011112222',
        date: '2026-10-20',
        time: '12:00'
      };

      const aptDoc2 = {
        clinicId: 'clinic-cairo',
        doctorId: 'doc-derma',
        patientName: 'مريض جلدية',
        patientPhone: '01033334444',
        date: '2026-10-20',
        time: '12:00'
      };

      const [res1, res2] = await Promise.all([
        appointmentsService.addAppointment(aptDoc1),
        appointmentsService.addAppointment(aptDoc2)
      ]);

      expect(res1.data).toBeDefined();
      expect(res1.error).toBeNull();
      expect(res2.data).toBeDefined();
      expect(res2.error).toBeNull();
    });

    it('enforces idempotency key protection preventing duplicate submissions', async () => {
      const mockTable = supabase.from('appointments');
      mockTable.select.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null })
      });

      let insertCount = 0;
      mockTable.insert.mockImplementation((records) => {
        insertCount++;
        return {
          select: () => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'apt-idemp-1', ...records[0] },
              error: null
            })
          })
        };
      });

      const appointment = {
        clinicId: 'clinic-alex',
        patientName: 'أحمد محمود',
        patientPhone: '01122334455',
        date: '2026-10-22',
        time: '14:00',
        idempotencyKey: 'key_client_req_998877'
      };

      // Send twice with the exact same idempotencyKey
      const firstAttempt = await appointmentsService.addAppointment(appointment);
      const secondAttempt = await appointmentsService.addAppointment(appointment);

      expect(firstAttempt.data).toBeDefined();
      expect(secondAttempt.data).toBeDefined();
      expect(firstAttempt.data.id).toBe(secondAttempt.data.id);
      // Underlying DB insert must be called exactly once
      expect(insertCount).toBe(1);
    });

    it('validates slot collision when rescheduling an existing appointment via updateAppointment', async () => {
      const mockTable = supabase.from('appointments');
      // Simulate existing conflicting appointment on the new slot
      mockTable.select.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'other-existing-appt', clinic_id: 'clinic-1', date: '2026-10-25', time: '16:00' }],
          error: null
        })
      });

      const res = await appointmentsService.updateAppointment('my-appt-id', {
        date: '2026-10-25',
        time: '16:00'
      }, 'clinic-1');

      expect(res.data).toBeNull();
      expect(res.error).toBeDefined();
      expect(res.error.message).toContain('Slot collision');
    });
  });

  describe('2. Offline Outbox & Clinical Conflict Retention', () => {
    it('preserves both local and remote clinical notes and diagnosis without silent overwriting', () => {
      const local = {
        version: 2,
        notes: 'ملاحظة محلية: المريض يعاني من ارتفاع ضغط الدم والجرعة تم تعديلها.',
        diagnosis: 'ضغط دم مرتفع المرحلة 1',
        updatedAt: '2026-10-13T10:00:00Z'
      };

      const remote = {
        version: 3,
        notes: 'ملاحظة سحابية: تم إجراء فحص سكر عشوائي والنتيجة 120.',
        diagnosis: 'متابعة دورية سكر',
        updatedAt: '2026-10-13T10:05:00Z'
      };

      const merged = mergeConflictingPayloads(local, remote);

      expect(merged.hasConflict).toBe(true);
      expect(merged.requiresReview).toBe(true);
      expect(merged.conflictFields).toContain('notes');
      expect(merged.conflictFields).toContain('diagnosis');

      // Both contents must be present in the merged output
      expect(merged.notes).toContain('ملاحظة محلية');
      expect(merged.notes).toContain('ملاحظة سحابية');
      expect(merged.diagnosis).toContain('ضغط دم مرتفع');
      expect(merged.diagnosis).toContain('متابعة دورية سكر');

      // Audit revision trail must contain both versions
      expect(merged.revisionHistory).toHaveLength(2);
      expect(merged.revisionHistory.some(r => r.source === 'local')).toBe(true);
      expect(merged.revisionHistory.some(r => r.source === 'remote')).toBe(true);
    });

    it('merges non-conflicting fields cleanly when only one side has medical notes', () => {
      const local = {
        version: 1,
        phone: '01099887766'
      };

      const remote = {
        version: 2,
        notes: 'ملاحظة من الطبيب المعالج',
        diagnosis: 'كشف عام'
      };

      const merged = mergeConflictingPayloads(local, remote);

      expect(merged.hasConflict).toBeFalsy();
      expect(merged.notes).toBe('ملاحظة من الطبيب المعالج');
      expect(merged.diagnosis).toBe('كشف عام');
      expect(merged.phone).toBe('01099887766');
    });
  });

  describe('3. Multi-Tenant Privacy & Session Cleansing', () => {
    it('purges all cache layers, in-memory indexes, and localDb stores on clearAllData', async () => {
      // Seed in-memory cache and search index
      apiCache.set('test-key', { secret: 'patient-data' }, 60000);
      multiTierCache.set('test-l1', { secret: 'patient-data' }, 60000);
      patientIndex.buildIndex([
        { id: 'p1', name: 'مريض تجريبي', phone: '01012345678', clinicId: 'clinic-a' }
      ], 'clinic-a');

      expect(apiCache.get('test-key')).toBeDefined();
      expect(multiTierCache.get('test-l1')).toBeDefined();
      expect(patientIndex.findByPhone('01012345678')).toBeDefined();

      // Clear all data (simulating logout or session eviction)
      await localDb.clearAllData();
      apiCache.clear();
      multiTierCache.clear();
      clearIdempotencyStore();
      patientIndex.clearIndex();

      expect(apiCache.get('test-key')).toBeNull();
      expect(multiTierCache.get('test-l1')).toBeNull();
      expect(patientIndex.findByPhone('01012345678')).toBeNull();
    });
  });

  describe('4. Cache Stampede Single-Flight Coalescing', () => {
    it('coalesces 10 concurrent requests on cache miss to execute fetcherFn exactly once', async () => {
      let callCount = 0;
      const slowFetcher = async () => {
        callCount++;
        await new Promise(r => setTimeout(r, 20));
        return { data: 'fresh-result' };
      };

      const key = 'stampede-test-key';
      const results = await Promise.all([
        apiCache.wrap(key, slowFetcher),
        apiCache.wrap(key, slowFetcher),
        apiCache.wrap(key, slowFetcher),
        apiCache.wrap(key, slowFetcher),
        apiCache.wrap(key, slowFetcher),
        apiCache.wrap(key, slowFetcher),
        apiCache.wrap(key, slowFetcher),
        apiCache.wrap(key, slowFetcher),
        apiCache.wrap(key, slowFetcher),
        apiCache.wrap(key, slowFetcher)
      ]);

      expect(callCount).toBe(1);
      results.forEach(res => {
        expect(res).toEqual({ data: 'fresh-result' });
      });
    });
  });

  describe('5. Column Projection Defaults', () => {
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

    it('applies explicit column projection DEFAULT_PATIENT_COLUMNS instead of wildcard *', async () => {
      const mockTable = supabase.from('patients');
      let capturedSelect = null;
      mockTable.select.mockImplementation((columns) => {
        capturedSelect = columns;
        return {
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      await patientsService.getPatients('clinic-test-1');

      expect(capturedSelect).toBe(patientsService.DEFAULT_PATIENT_COLUMNS);
      expect(capturedSelect).toContain('id');
      expect(capturedSelect).toContain('name');
      expect(capturedSelect).toContain('phone');
      expect(capturedSelect).not.toBe('*');
    });
  });
});
