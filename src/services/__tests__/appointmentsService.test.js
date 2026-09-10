import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as appointmentsService from '../appointmentsService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

// Mock supabase client
vi.mock('../../lib/supabase', () => {
  const mockSupabase = {
    from: vi.fn()
  };
  return {
    supabase: mockSupabase,
    isSupabaseConfigured: vi.fn(() => true),
    NOT_CONFIGURED_ERROR: new Error('Supabase is not configured')
  };
});

describe('appointmentsService Integration & Multi-Tenant Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Transformers (toDbAppointment & fromDbAppointment)', () => {
    it('correctly maps client camelCase to database snake_case fields', () => {
      const clientAppt = {
        bookingCode: 'BK-102',
        clinicId: 'clinic-xyz',
        patientId: 'pat-1',
        patientName: 'محمد أحمد',
        patientPhone: '01012345678',
        date: '2026-09-10',
        time: '14:00',
        type: 'كشف أسنان',
        fee: '400 ج.م',
        status: 'booked',
        notes: 'ملاحظة',
        checkedInAt: '2026-09-10T14:00:00Z',
        consultationStartedAt: '2026-09-10T14:05:00Z',
        reminderSent: true
      };

      const dbPayload = appointmentsService.toDbAppointment(clientAppt);

      expect(dbPayload.booking_code).toBe('BK-102');
      expect(dbPayload.clinic_id).toBe('clinic-xyz');
      expect(dbPayload.patient_id).toBe('pat-1');
      expect(dbPayload.patient_name).toBe('محمد أحمد');
      expect(dbPayload.patient_phone).toBe('01012345678');
      expect(dbPayload.checked_in_at).toBe('2026-09-10T14:00:00Z');
      expect(dbPayload.consultation_started_at).toBe('2026-09-10T14:05:00Z');
      expect(dbPayload.reminder_sent).toBe(true);
    });

    it('correctly parses DB snake_case row into client model with safe defaults', () => {
      const dbRow = {
        id: 'appt-123',
        booking_code: 'BK-999',
        clinic_id: 'clinic-1',
        patient_id: 'p-1',
        patient_name: 'سارة خالد',
        patient_phone: '01122334455',
        date: '2026-09-11',
        time: '11:30',
        type: 'تنظيف وتلميع',
        fee: '500 ج.م',
        status: 'completed',
        notes: 'حالة ممتازة',
        reminder_sent: true,
        created_at: '2026-09-10T10:00:00Z'
      };

      const model = appointmentsService.fromDbAppointment(dbRow);

      expect(model.id).toBe('appt-123');
      expect(model.bookingCode).toBe('BK-999');
      expect(model.clinicId).toBe('clinic-1');
      expect(model.patientName).toBe('سارة خالد');
      expect(model.fee).toBe('500 ج.م');
      expect(model.status).toBe('completed');
      expect(model.reminderSent).toBe(true);
    });

    it('returns null if fromDbAppointment receives null or undefined', () => {
      expect(appointmentsService.fromDbAppointment(null)).toBeNull();
      expect(appointmentsService.fromDbAppointment(undefined)).toBeNull();
    });
  });

  describe('Tenant Boundary Security & Queries', () => {
    it('refuses to fetch appointments when clinicId is missing', async () => {
      const result = await appointmentsService.getAppointments(null);
      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });

    it('queries Supabase strictly with clinic_id filter', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: '1', clinic_id: 'clinic-test', patient_name: 'مريض 1', date: '2026-09-10', time: '10:00' }
          ],
          error: null
        })
      };
      supabase.from.mockReturnValue(mockChain);

      const result = await appointmentsService.getAppointments('clinic-test', { status: 'waiting', date: '2026-09-10' });

      expect(supabase.from).toHaveBeenCalledWith('appointments');
      expect(mockChain.eq).toHaveBeenCalledWith('clinic_id', 'clinic-test');
      expect(mockChain.eq).toHaveBeenCalledWith('status', 'waiting');
      expect(mockChain.eq).toHaveBeenCalledWith('date', '2026-09-10');
      expect(result.data.length).toBe(1);
      expect(result.data[0].clinicId).toBe('clinic-test');
      expect(result.error).toBeNull();
    });

    it('rejects adding an appointment without clinicId', async () => {
      const invalidAppt = {
        patientName: 'مريض بدون عيادة',
        date: '2026-09-10',
        time: '12:00'
      };

      const result = await appointmentsService.addAppointment(invalidAppt);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });

    it('successfully adds an appointment when clinicId is present', async () => {
      const validAppt = {
        clinicId: 'clinic-dental',
        patientName: 'أحمد شريف',
        date: '2026-09-10',
        time: '13:00'
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-id', clinic_id: 'clinic-dental', patient_name: 'أحمد شريف' },
          error: null
        })
      };
      supabase.from.mockReturnValue(mockChain);

      const result = await appointmentsService.addAppointment(validAppt);
      expect(result.error).toBeNull();
      expect(result.data.id).toBe('new-id');
      expect(result.data.clinicId).toBe('clinic-dental');
    });

    it('refuses to fetch booked slots without clinicId', async () => {
      const result = await appointmentsService.getBookedSlotsForDate(null, '2026-09-10');
      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });

    it('refuses to fetch paginated appointments without clinicId', async () => {
      const result = await appointmentsService.getAppointmentsPaginated({ clinicId: null });
      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });
  });
});
