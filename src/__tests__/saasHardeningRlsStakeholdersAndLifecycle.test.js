import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';

import {
  fromDbPrescription,
  toDbPrescription,
  fetchPrescriptionsFromCloud,
  savePrescriptionToCloud,
  savePrescriptionHybrid
} from '@/features/clinical/services/prescriptionService';
import { canAccessFinancials, canEditMedicalRecords, isDoctorRole, isAdminRole } from '@/utils/permissions';
import ScreenState from '@/components/ui/ScreenState';

const MIGRATION = fs.readFileSync(
  path.resolve(__dirname, '../../supabase/migrations/20261015_rls_security_definer_stakeholders.sql'),
  'utf8'
);

describe('SaaS Hardening: RLS Security-Definer Fix, Stakeholder Matrix & Screen Lifecycle', () => {
  describe('1. Infinite-recursion fix for member/organization RLS (42P17)', () => {
    it('provides SECURITY DEFINER helpers that are STABLE with pinned search_path', () => {
      for (const fn of [
        'cf_current_user_id',
        'cf_user_org_ids',
        'cf_is_org_member',
        'cf_is_org_admin',
        'cf_is_platform_admin',
        'cf_user_clinic_role',
        'cf_is_clinic_staff',
        'cf_is_clinic_leader',
        'cf_is_clinic_prescriber',
        'cf_is_clinic_financial',
        'cf_is_clinic_operational'
      ]) {
        const fnBlock = MIGRATION.match(new RegExp(`CREATE OR REPLACE FUNCTION ${fn}\\([\\s\\S]*?\\$\\$`, 'm'));
        expect(fnBlock, `${fn} must exist`).toBeTruthy();
        const body = fnBlock[0];
        expect(body).toContain('SECURITY DEFINER');
        expect(body).toContain('STABLE');
        expect(body).toContain('SET search_path = public');
      }
    });

    it('recreates the member SELECT policy without any self-reference on member', () => {
      const policyStart = MIGRATION.indexOf('CREATE POLICY "member_org_read_policy"');
      const policyEnd = MIGRATION.indexOf(';', policyStart);
      const policyBlock = MIGRATION.slice(policyStart, policyEnd);
      expect(policyBlock).not.toMatch(/FROM\s+"?member"?/i);
      expect(policyBlock).toContain('cf_current_user_id()');
      expect(policyBlock).toContain('cf_user_org_ids()');
    });

    it('recreates the organization policy via the helper (never subquerying member directly)', () => {
      const policyStart = MIGRATION.indexOf('CREATE POLICY "org_member_read_policy"');
      const policyEnd = MIGRATION.indexOf(';', policyStart);
      const policyBlock = MIGRATION.slice(policyStart, policyEnd);
      expect(policyBlock).not.toMatch(/FROM\s+"?member"?/i);
      expect(policyBlock).toContain('cf_user_org_ids()');
    });

    it('gates membership writes to organization admins / platform admins', () => {
      expect(MIGRATION).toContain('member_admin_write_policy');
      expect(MIGRATION).toContain('cf_is_org_admin("member"."organizationId")');
      expect(MIGRATION).toContain('cf_is_platform_admin()');
    });

    it('grants helper execution to authenticated and service roles only', () => {
      expect(MIGRATION).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]*TO authenticated, service_role/);
    });
  });

  describe('2. Stakeholder separation matrix on clinic tables', () => {
    const policyBlock = (name) => {
      const start = MIGRATION.indexOf(`"${name}"`);
      const end = MIGRATION.indexOf('END IF;', start);
      return MIGRATION.slice(start, end);
    };

    it('restricts prescriptions writes to prescribers (doctor/associate_doctor + leadership)', () => {
      expect(MIGRATION).toContain('cf_is_clinic_prescriber');
      const writeBlock = MIGRATION.slice(
        MIGRATION.indexOf('CREATE OR REPLACE FUNCTION cf_is_clinic_prescriber'),
        MIGRATION.indexOf('$$;', MIGRATION.indexOf('CREATE OR REPLACE FUNCTION cf_is_clinic_prescriber'))
      );
      expect(writeBlock).toContain("'doctor'");
      expect(writeBlock).toContain("'associate_doctor'");
      expect(writeBlock).not.toContain("'accountant'");
      expect(policyBlock('prescriptions_prescriber_write')).toContain('cf_is_clinic_prescriber(clinic_id)');
    });

    it('restricts financial writes (invoices/payments/ledger) to leadership + accountant', () => {
      const finBlock = MIGRATION.slice(
        MIGRATION.indexOf('CREATE OR REPLACE FUNCTION cf_is_clinic_financial'),
        MIGRATION.indexOf('$$;', MIGRATION.indexOf('CREATE OR REPLACE FUNCTION cf_is_clinic_financial'))
      );
      expect(finBlock).toContain("'accountant'");
      expect(finBlock).toContain("'multi_clinic_owner'");
      expect(policyBlock('invoices_financial_write')).toContain('cf_is_clinic_financial(clinic_id)');
      expect(policyBlock('payments_financial_write')).toContain('cf_is_clinic_financial(clinic_id)');
      expect(policyBlock('journal_entries_financial_write')).toContain('cf_is_clinic_financial(clinic_id)');
      expect(policyBlock('journal_lines_financial_write')).toContain('cf_is_clinic_financial(clinic_id)');
    });

    it('allows operational (front desk) writes on patients/appointments/inventory but not on ledger', () => {
      expect(policyBlock('patients_operational_write')).toContain('cf_is_clinic_operational(clinic_id)');
      expect(policyBlock('appointments_operational_write')).toContain('cf_is_clinic_operational(clinic_id)');
      expect(policyBlock('inventory_operational_write')).toContain('cf_is_clinic_operational(clinic_id)');
      // accountants must never appear in the operational tier
      const opBlock = MIGRATION.slice(
        MIGRATION.indexOf('CREATE OR REPLACE FUNCTION cf_is_clinic_operational'),
        MIGRATION.indexOf('$$;', MIGRATION.indexOf('CREATE OR REPLACE FUNCTION cf_is_clinic_operational'))
      );
      expect(opBlock).not.toContain("'accountant'");
      expect(opBlock).toContain("'receptionist'");
    });

    it('concentrates destructive deletes in clinic leadership across all tables', () => {
      for (const policy of [
        'prescriptions_leader_delete',
        'patients_leader_delete',
        'appointments_leader_delete',
        'invoices_leader_delete',
        'payments_leader_delete',
        'journal_entries_leader_delete',
        'journal_lines_leader_delete',
        'inventory_leader_delete'
      ]) {
        expect(policyBlock(policy)).toContain('cf_is_clinic_leader(clinic_id)');
      }
    });

    it('mirrors the same separation in the UI permission layer', () => {
      const accountant = { role: 'accountant' };
      const doctor = { role: 'doctor' };
      const owner = { role: 'owner' };
      const receptionist = { role: 'receptionist' };

      expect(canAccessFinancials(accountant)).toBe(true);
      expect(canAccessFinancials(owner)).toBe(true);
      expect(canEditMedicalRecords(doctor)).toBe(true);
      expect(canEditMedicalRecords(accountant)).toBe(false);
      expect(isAdminRole(owner)).toBe(true);
      expect(isAdminRole(receptionist)).toBe(false);
      expect(isDoctorRole(doctor)).toBe(true);
      expect(isDoctorRole(accountant)).toBe(false);
    });
  });

  describe('3. Real cloud wiring for prescriptions (Supabase PostgreSQL)', () => {
    it('scopes every cloud fetch strictly by clinic_id', () => {
      // source-level guard: the query must contain the tenant filter before any order/limit
      const src = fs.readFileSync(
        path.resolve(__dirname, '../features/clinical/services/prescriptionService.js'),
        'utf8'
      );
      const fetchFn = src.slice(src.indexOf('fetchPrescriptionsFromCloud'), src.indexOf('syncPrescriptionsFromCloud'));
      expect(fetchFn).toContain(".eq('clinic_id', clinicId)");
      expect(fetchFn).toContain(".from('prescriptions')");
    });

    it('round-trips prescription payloads between app shape and DB shape losslessly', () => {
      const appPrescription = {
        id: 'rx-1',
        clinicId: 'clinic-1',
        patientId: 'pat-9',
        patientName: 'محمد علي',
        patientPhone: '01012345678',
        date: '2026-10-15',
        doctorName: 'د. سارة',
        specialty: 'أسنان',
        diagnosis: 'تسوس موضعي',
        medications: [{ name: 'أوجمنتين', dose: 'قرص', frequency: 'كل 12 ساعة' }],
        labTests: 'none',
        followUpDate: '2026-10-25',
        generalAdvice: 'نظافة الفم',
        verificationCode: 'CF-1234'
      };
      const db = toDbPrescription(appPrescription);
      expect(db.clinic_id).toBe('clinic-1');
      expect(db.patient_name).toBe('محمد علي');
      expect(db.medications).toHaveLength(1);
      const back = fromDbPrescription(db);
      expect(back.clinicId).toBe('clinic-1');
      expect(back.patientName).toBe('محمد علي');
      expect(back.medications[0].name).toBe('أوجمنتين');
      expect(back.followUpDate).toBe('2026-10-25');
    });

    it('refuses cloud operations without a strict tenant (clinicId) bound', async () => {
      await expect(fetchPrescriptionsFromCloud('')).rejects.toThrow(/clinicId is strictly required/);
      await expect(savePrescriptionToCloud({ patientName: 'بلا عيادة' })).rejects.toThrow(/clinicId is strictly required/);
    });

    it('hybrid save never rejects: local persists even when cloud is unavailable', async () => {
      const result = await savePrescriptionHybrid({
        id: 'rx-hybrid-1',
        clinicId: 'clinic-hybrid',
        patientName: 'مريض الأوفلاين',
        date: '2026-10-15',
        medications: []
      });
      expect(result.local.id).toBe('rx-hybrid-1');
      expect(result.cloud).toBeDefined();
    });
  });

  describe('4. Canonical four-state screen lifecycle (ScreenState)', () => {
    it('renders a Loading state with status semantics', () => {
      const html = renderToString(React.createElement(ScreenState, { isLoading: true }, React.createElement('div', null, 'DATA')));
      expect(html).toContain('data-testid="screen-state-loading"');
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).not.toContain('DATA');
    });

    it('renders an Error state with a retry CTA', () => {
      const html = renderToString(
        React.createElement(ScreenState, { loadError: 'انقطع الاتصال بقاعدة البيانات', onRetry: () => {} })
      );
      expect(html).toContain('data-testid="screen-state-error"');
      expect(html).toContain('role="alert"');
      expect(html).toContain('إعادة المحاولة');
      expect(html).toContain('انقطع الاتصال بقاعدة البيانات');
    });

    it('renders an Empty state with a primary CTA and optional secondary action', () => {
      const html = renderToString(
        React.createElement(ScreenState, {
          isEmpty: true,
          emptyTitle: 'المخزن فارغ',
          emptyMessage: 'ابدأ بإضافة أول مستلزم',
          emptyActionLabel: 'إضافة أول مستلزم',
          onEmptyAction: () => {},
          secondaryActionLabel: 'إعادة ضبط الفلاتر',
          onSecondaryAction: () => {}
        })
      );
      expect(html).toContain('data-testid="screen-state-empty"');
      expect(html).toContain('data-testid="screen-state-empty-cta"');
      expect(html).toContain('إضافة أول مستلزم');
      expect(html).toContain('data-testid="screen-state-empty-secondary"');
    });

    it('renders Loaded content only when not loading, errored, or empty', () => {
      const html = renderToString(
        React.createElement(ScreenState, { isEmpty: false }, React.createElement('table', null, 'ROWS-HERE'))
      );
      expect(html).toContain('ROWS-HERE');
      expect(html).not.toContain('screen-state-loading');
      expect(html).not.toContain('screen-state-error');
      expect(html).not.toContain('screen-state-empty');
    });

    it('prioritizes states deterministically (loading beats error beats empty)', () => {
      const html = renderToString(
        React.createElement(ScreenState, { isLoading: true, loadError: 'x', isEmpty: true })
      );
      expect(html).toContain('screen-state-loading');
      const html2 = renderToString(
        React.createElement(ScreenState, { isLoading: false, loadError: 'x', isEmpty: true })
      );
      expect(html2).toContain('screen-state-error');
    });

    it('supports a custom skeleton node to preserve complex layouts (tables)', () => {
      const html = renderToString(
        React.createElement(
          ScreenState,
          { isLoading: true, skeleton: React.createElement('table', null, 'SKELETON-TABLE') }
        )
      );
      expect(html).toContain('SKELETON-TABLE');
      expect(html).toContain('data-testid="screen-state-loading"');
    });
  });
});
