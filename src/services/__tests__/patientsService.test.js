import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as patientsService from '../patientsService';
import { supabase } from '../../lib/supabase';

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

describe('patientsService Integration & Multi-Tenant Phone Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Transformers', () => {
    it('maps client patient model to DB snake_case payload', () => {
      const clientPatient = {
        clinicId: 'clinic-derma',
        name: 'هند خالد',
        age: '29',
        gender: 'أنثى',
        phone: '01099887766',
        bloodType: 'O+',
        diagnosis: 'جلسة نضارة',
        notes: 'لا توجد حساسية',
        totalVisits: 3,
        lastVisit: '2026-09-01'
      };

      const dbPayload = patientsService.toDbPatient(clientPatient);

      expect(dbPayload.clinic_id).toBe('clinic-derma');
      expect(dbPayload.name).toBe('هند خالد');
      expect(dbPayload.age).toBe(29);
      expect(dbPayload.total_visits).toBe(3);
      expect(dbPayload.last_visit).toBe('2026-09-01');
    });

    it('maps DB snake_case patient to client model', () => {
      const dbRow = {
        id: 'pat-1',
        clinic_id: 'clinic-derma',
        name: 'هند خالد',
        age: 29,
        gender: 'أنثى',
        phone: '01099887766',
        blood_type: 'O+',
        total_visits: 3,
        last_visit: '2026-09-01T00:00:00Z',
        created_at: '2026-08-01T10:00:00Z'
      };

      const patient = patientsService.fromDbPatient(dbRow);

      expect(patient.id).toBe('pat-1');
      expect(patient.clinicId).toBe('clinic-derma');
      expect(patient.age).toBe('29');
      expect(patient.visitsCount).toBe(3);
      expect(patient.lastVisit).toBe('2026-09-01');
    });
  });

  describe('Multi-Tenant Boundaries & Phone Search', () => {
    it('refuses to fetch patients without clinicId', async () => {
      const result = await patientsService.getPatients(null);
      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });

    it('refuses to add patient without clinicId', async () => {
      const invalidPatient = {
        name: 'مريض مجهول',
        phone: '01000000000'
      };

      const result = await patientsService.addPatient(invalidPatient);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });

    it('refuses to find patient by phone without clinicId', async () => {
      const result = await patientsService.findPatientByPhone(null, '01012345678');
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });

    it('queries by phone with mandatory clinic_id filter', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{
            id: 'p-1',
            clinic_id: 'clinic-1',
            name: 'يوسف سليم',
            phone: '01012345678'
          }],
          error: null
        })
      };
      supabase.from.mockReturnValue(mockChain);

      const result = await patientsService.findPatientByPhone('clinic-1', '01012345678');

      expect(supabase.from).toHaveBeenCalledWith('patients');
      expect(mockChain.eq).toHaveBeenCalledWith('clinic_id', 'clinic-1');
      expect(mockChain.or).toHaveBeenCalled();
      expect(result.data).not.toBeNull();
      expect(result.data.name).toBe('يوسف سليم');
    });

    it('refuses to fetch paginated patients without clinicId', async () => {
      const result = await patientsService.getPatientsPaginated({ clinicId: null });
      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });
  });
});
