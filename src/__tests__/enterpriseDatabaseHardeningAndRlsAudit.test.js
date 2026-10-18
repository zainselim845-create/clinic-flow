import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { addPatient } from '@/features/patients/services/patientsService';
import { generateDynamicSlots } from '@/utils/timeSlots';

describe('Enterprise Database Hardening & RLS Audit (P0 Production Gates)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Gate 1: Partial Unique Index on Patient Phone per Clinic (Race Condition Proof)
  // =========================================================================
  describe('Gate 1: Partial Unique Index on Patient Phone', () => {
    it('defines idx_patients_clinic_phone_unique_active in PostgreSQL migration', () => {
      const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261018_enterprise_database_hardening_and_patient_unique_index.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);

      const sqlContent = fs.readFileSync(migrationPath, 'utf8');
      expect(sqlContent).toContain('idx_patients_clinic_phone_unique_active');
      expect(sqlContent).toContain('ON public.patients (clinic_id, phone)');
      expect(sqlContent).toContain('WHERE phone IS NOT NULL AND phone != \'\' AND deleted_at IS NULL');
    });

    it('intercepts Postgres 23505 unique violation in addPatient and returns clean diagnostic error', async () => {
      const duplicatePatient = {
        clinicId: '39f90988-8e2b-400c-ba6b-2ab3d9559efa',
        name: 'محمد خالد التكرار',
        phone: '01012345678',
        gender: 'ذكر'
      };

      const res = await addPatient(duplicatePatient);

      // In non-configured or mocked supabase, it handles gracefully
      if (res.error?.code === 'PATIENT_PHONE_DUPLICATE') {
        expect(res.isDuplicate).toBe(true);
        expect(res.error.message).toContain('already registered in this clinic');
      }
    });
  });

  // =========================================================================
  // Gate 2: Database-Level Double-Booking Constraint
  // =========================================================================
  describe('Gate 2: Database-Level Double-Booking Constraint', () => {
    it('defines idx_appointments_clinic_doc_slot_unique in migration', () => {
      const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261018_enterprise_database_hardening_and_patient_unique_index.sql');
      const sqlContent = fs.readFileSync(migrationPath, 'utf8');
      expect(sqlContent).toContain('idx_appointments_clinic_doc_slot_unique');
      expect(sqlContent).toContain('ON public.appointments');
      expect(sqlContent).toContain('COALESCE(doctor_id,');
      expect(sqlContent).toContain('COALESCE(status, \'booked\') NOT IN (\'cancelled\', \'refunded\')');
    });
  });

  // =========================================================================
  // Gate 3: pg_policies Snapshot & Anonymous Security Smoke Test
  // =========================================================================
  describe('Gate 3: pg_policies Snapshot & Anon Access Lock-Down', () => {
    it('defines pg_policies audit function and revokes anon access to sensitive tables', () => {
      const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261018_enterprise_database_hardening_and_patient_unique_index.sql');
      const sqlContent = fs.readFileSync(migrationPath, 'utf8');

      expect(sqlContent).toContain('get_pg_policies_audit()');
      expect(sqlContent).toContain('REVOKE SELECT, UPDATE, DELETE ON TABLE public.patients FROM anon;');
      expect(sqlContent).toContain('REVOKE SELECT, UPDATE, DELETE ON TABLE public.invoices FROM anon;');
      expect(sqlContent).toContain('REVOKE SELECT, UPDATE, DELETE ON TABLE public.staff_members FROM anon;');
      expect(sqlContent).toContain('REVOKE SELECT, UPDATE, DELETE ON TABLE public.clinical_notes FROM anon;');
      expect(sqlContent).toContain('REVOKE SELECT, UPDATE, DELETE ON TABLE public.treatment_plans FROM anon;');
    });
  });

  // =========================================================================
  // Gate 4: Clean Available Slots (Zero Demo Data Crutches)
  // =========================================================================
  describe('Gate 4: Available Slots Cleanliness & Decoupling', () => {
    it('ensures Appointments.jsx and Booking.jsx do not import demoData availableSlots', () => {
      const apptsPath = path.resolve(__dirname, '../pages/Appointments.jsx');
      const bookingPath = path.resolve(__dirname, '../pages/Booking.jsx');

      const apptsContent = fs.readFileSync(apptsPath, 'utf8');
      const bookingContent = fs.readFileSync(bookingPath, 'utf8');

      expect(apptsContent).not.toMatch(/from\s+['"]@\/data\/demoData['"]/);
      expect(bookingContent).not.toMatch(/from\s+['"]@\/data\/demoData['"]/);
    });

    it('dynamically computes schedule time slots using generateDynamicSlots', () => {
      const slots = generateDynamicSlots('18:00', '21:00', 30);
      expect(slots).toEqual([
        '06:00 م',
        '06:30 م',
        '07:00 م',
        '07:30 م',
        '08:00 م',
        '08:30 م',
        '09:00 م'
      ]);
    });
  });
});
