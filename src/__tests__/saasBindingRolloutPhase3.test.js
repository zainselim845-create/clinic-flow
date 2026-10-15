import { describe, it, expect, vi } from 'vitest';

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({ state: { clinic: { id: 'c-ctx', name: 'عيادة' } }, dispatch: () => {} })
}));
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';

import {
  fromDbClinicalNote,
  toDbClinicalNote,
  getClinicClinicalNotes,
  addClinicalNoteForClinic
} from '@/features/clinical/services/clinicalNotesService';
import {
  fromDbTreatmentPlan,
  toDbTreatmentPlan,
  getClinicTreatmentPlans,
  saveTreatmentPlanHybrid,
  syncTreatmentPlansFromCloud
} from '@/features/patients/services/treatmentPlansService';
import {
  fromDbAttendance,
  getStaffAttendanceForClinic,
  recordCheckInForClinic
} from '@/features/platform/services/attendanceService';
import InvoicesTable from '@/components/invoices/InvoicesTable';
import PatientsGrid from '@/components/patients/PatientsGrid';
import { ClinicsTable } from '@/pages/superadmin/components/ClinicsTable';
import BookingCalendar from '@/components/BookingCalendar';

const MIGRATION = fs.readFileSync(
  path.resolve(__dirname, '../../supabase/migrations/20261016_clinical_tables_provisioning.sql'),
  'utf8'
);

describe('SaaS Rollout Phase 3: clinical tables provisioning, strict tenant binding & ScreenState generalization', () => {
  describe('1. Migration provisions the three previously-missing tables', () => {
    it('creates clinical_notes / treatment_plans / staff_attendance with mandatory clinic_id', () => {
      for (const table of ['clinical_notes', 'treatment_plans', 'staff_attendance']) {
        const block = MIGRATION.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?\\);`));
        expect(block, `${table} must be provisioned`).toBeTruthy();
        expect(block[0]).toContain('clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE');
        expect(block[0]).toContain('deleted_at TIMESTAMPTZ DEFAULT NULL');
      }
    });

    it('enables RLS on all three tables', () => {
      for (const table of ['clinical_notes', 'treatment_plans', 'staff_attendance']) {
        expect(MIGRATION).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      }
    });

    it('applies the full stakeholder tier per domain (prescriber vs operational writes, leadership deletes)', () => {
      expect(MIGRATION).toContain('clinical_notes_prescriber_write');
      expect(MIGRATION).toContain('treatment_plans_prescriber_write');
      expect(MIGRATION).toContain('staff_attendance_operational_write');
      expect(MIGRATION).toContain('clinical_notes_leader_delete');
      expect(MIGRATION).toContain('treatment_plans_leader_delete');
      expect(MIGRATION).toContain('staff_attendance_leader_delete');
      expect(MIGRATION).toContain('cf_is_clinic_prescriber(clinic_id)');
      expect(MIGRATION).toContain('cf_is_clinic_operational(clinic_id)');
      expect(MIGRATION).toContain('cf_is_clinic_leader(clinic_id)');
    });

    it('adds ESR composite indexes for scale', () => {
      expect(MIGRATION).toContain('idx_clinical_notes_esr');
      expect(MIGRATION).toContain('idx_treatment_plans_esr');
      expect(MIGRATION).toContain('idx_staff_attendance_esr');
    });
  });

  describe('2. Strict tenant binding across the three services', () => {
    it('rejects clinic-scoped reads/writes without an explicit clinicId', async () => {
      await expect(getClinicTreatmentPlans('')).rejects.toThrow(/clinicId is strictly required/);
      await expect(getClinicClinicalNotes('')).rejects.toThrow(/clinicId is strictly required/);
      await expect(getStaffAttendanceForClinic(null)).rejects.toThrow(/clinicId is strictly required/);
      await expect(recordCheckInForClinic('st-1', 'موظف', undefined)).rejects.toThrow(/clinicId is strictly required/);
      await expect(addClinicalNoteForClinic({ chiefComplaint: 'بدون عيادة' })).rejects.toThrow(/clinicId is strictly required/);
    });

    it('persists plan items through toDb (regression: items were silently dropped on insert)', () => {
      const plan = {
        id: 'tp-1',
        clinicId: 'clinic-1',
        patientId: 'pat-1',
        title: 'علاج جذور',
        totalCost: 3000,
        discount: 300,
        netCost: 2700,
        status: 'in_progress',
        notes: '',
        items: [{ procedureName: 'علاج عصب', status: 'pending' }]
      };
      const db = toDbTreatmentPlan(plan);
      expect(db.items).toHaveLength(1);
      expect(db.items[0].procedureName).toBe('علاج عصب');
      const back = fromDbTreatmentPlan(db);
      expect(back.items[0].procedureName).toBe('علاج عصب');
      expect(back.netCost).toBe(2700);
    });

    it('round-trips clinical notes and attendance losslessly', () => {
      const noteRow = {
        id: 'cn-1', clinic_id: 'c1', patient_id: 'p1', appointment_id: null,
        doctor_name: 'د. سارة', chief_complaint: 'ألم', diagnosis: 'تسوس',
        treatment_notes: 'حشو', next_visit_plan: 'أسبوع', created_at: '2026-10-16T10:00:00Z'
      };
      const note = fromDbClinicalNote(noteRow);
      expect(note.clinicId).toBe('c1');
      expect(toDbClinicalNote(note).chief_complaint).toBe('ألم');

      const attRow = {
        id: 'at-1', clinic_id: 'c1', staff_id: 's1', staff_name: 'منى',
        check_in: '2026-10-16T08:00:00Z', check_out: '2026-10-16T16:00:00Z',
        total_hours: 8, notes: ''
      };
      const att = fromDbAttendance(attRow);
      expect(att.clinicId).toBe('c1');
      expect(att.date).toBe('2026-10-16');
      expect(att.totalHours).toBe(8);
    });

    it('hybrid treatment-plan save persists locally and never rejects', async () => {
      const result = await saveTreatmentPlanHybrid({
        id: 'tp-hybrid-1',
        clinicId: 'clinic-hybrid',
        patientId: 'p9',
        title: 'تنظيف وتلميع',
        items: []
      });
      expect(result.local.id).toBe('tp-hybrid-1');
      expect(result.cloud).toBeDefined();
    });

    it('cloud sync helpers report envelopes instead of throwing when unconfigured', async () => {
      const sync = await syncTreatmentPlansFromCloud('clinic-sync');
      expect(sync).toHaveProperty('synced');
      expect(sync).toHaveProperty('error');
      const notes = await getClinicClinicalNotes('clinic-notes');
      expect(notes).toHaveProperty('data');
      expect(notes).toHaveProperty('error');
    });
  });

  describe('3. ScreenState generalization across the four core views', () => {
    const invoiceHandlers = {
      fetchInvoices: () => {},
      handleOpenNew: () => {},
      handleOpenNewExpense: () => {},
      handleViewInvoice: () => {},
      handleDeleteExpense: () => {}
    };

    it('InvoicesTable renders a loading skeleton state', () => {
      const html = renderToString(React.createElement(InvoicesTable, { isLoading: true, ...invoiceHandlers }));
      expect(html).toContain('data-testid="screen-state-loading"');
    });

    it('InvoicesTable renders an error state with retry', () => {
      const html = renderToString(React.createElement(InvoicesTable, { loadError: 'تعذر الوصول للخزينة', ...invoiceHandlers }));
      expect(html).toContain('data-testid="screen-state-error"');
      expect(html).toContain('إعادة المحاولة الآن');
    });

    it('InvoicesTable cash-flow empty state carries the dual CTAs', () => {
      const html = renderToString(React.createElement(InvoicesTable, { viewMode: 'all', ...invoiceHandlers }));
      expect(html).toContain('data-testid="screen-state-empty"');
      expect(html).toContain('إصدار فاتورة (داخل)');
      expect(html).toContain('تسجيل مصروف (خارج)');
    });

    it('InvoicesTable renders loaded rows when data exists', () => {
      const html = renderToString(React.createElement(InvoicesTable, {
        viewMode: 'in',
        filteredInvoices: [{ id: 'inv-1', invoiceNumber: 'INV-100', patientName: 'أحمد علي', createdAt: '2026-10-16', total: 500, paidAmount: 500, remainingBalance: 0, paymentStatus: 'paid' }],
        ...invoiceHandlers
      }));
      expect(html).toContain('INV-100');
      expect(html).toContain('أحمد علي');
      expect(html).not.toContain('screen-state-empty');
    });

    it('InvoicesTable outflow empty state offers the first-expense CTA', () => {
      const html = renderToString(React.createElement(InvoicesTable, { viewMode: 'out', ...invoiceHandlers }));
      expect(html).toContain('تسجيل أول مصروف تشغيلي');
    });

    it('PatientsGrid empty state keeps add-patient CTA and search cancel variant', () => {
      const emptyHtml = renderToString(React.createElement(PatientsGrid, {
        paginatedPatients: [], searchQuery: '', onOpenNewPatient: () => {}, setSearchQuery: () => {}
      }));
      expect(emptyHtml).toContain('data-testid="screen-state-empty"');
      expect(emptyHtml).toContain('إضافة أول مريض');

      const searchHtml = renderToString(React.createElement(PatientsGrid, {
        paginatedPatients: [], searchQuery: 'خالد', onOpenNewPatient: () => {}, setSearchQuery: () => {}
      }));
      expect(searchHtml).toContain('إلغاء البحث');
      expect(searchHtml).toContain('لا يوجد مرضى مطابقين لمعايير البحث');
    });

    it('PatientsGrid renders loaded patient cards', () => {
      const html = renderToString(React.createElement(PatientsGrid, {
        paginatedPatients: [{ id: 'p1', name: 'منى إبراهيم', phone: '01011112222', gender: 'أنثى', age: 30 }],
        searchQuery: '',
        onOpenNewPatient: () => {},
        setSearchQuery: () => {}
      }));
      expect(html).toContain('منى إبراهيم');
    });

    it('ClinicsTable empty state offers refresh + filter-reset CTAs', () => {
      const html = renderToString(React.createElement(ClinicsTable, {
        filteredTenants: [],
        searchTerm: '',
        setSearchTerm: () => {},
        tierFilter: 'all',
        setTierFilter: () => {},
        statusFilter: 'all',
        setStatusFilter: () => {},
        activeClinics: [],
        pendingClinics: [],
        suspendedClinics: [],
        copiedSlug: '',
        onCopyLink: () => {},
        onCopyHandover: () => {},
        onApproveClinic: () => {},
        onSuspendClinic: () => {},
        onReactivateClinic: () => {},
        onSwitchAndVisit: () => {},
        onTopUpClinic: () => {},
        onCustomizeBrand: () => {},
        onManageSubscription: () => {},
        onDeleteClinic: () => {},
        onRefresh: () => {}
      }));
      expect(html).toContain('data-testid="screen-state-empty"');
      expect(html).toContain('تحديث القائمة');
      expect(html).toContain('إعادة ضبط الفلاتر');
    });

    it('ClinicsTable renders loaded tenant rows', () => {
      const noop = () => {};
      const html = renderToString(React.createElement(ClinicsTable, {
        filteredTenants: [{ id: 't1', slug: 'clinic-one', name: 'عيادة النيل', doctorName: 'د. طارق', subscriptionStatus: 'active', tier: 'pro' }],
        searchTerm: '',
        setSearchTerm: noop,
        tierFilter: 'all',
        setTierFilter: noop,
        statusFilter: 'all',
        setStatusFilter: noop,
        activeClinics: [],
        pendingClinics: [],
        suspendedClinics: [],
        copiedSlug: '',
        onCopyLink: noop,
        onCopyHandover: noop,
        onApproveClinic: noop,
        onSuspendClinic: noop,
        onReactivateClinic: noop,
        onSwitchAndVisit: noop,
        onTopUpClinic: noop,
        onCustomizeBrand: noop,
        onManageSubscription: noop,
        onDeleteClinic: noop,
        onRefresh: noop
      }));
      expect(html).toContain('عيادة النيل');
      expect(html).not.toContain('screen-state-empty');
    });

    it('BookingCalendar renders the canonical empty state when the day has no open slots', () => {
      const html = renderToString(React.createElement(BookingCalendar, {
        selectedDate: null,
        onSelectDate: () => {},
        onSelectTime: () => {}
      }));
      expect(html).toContain('data-testid="screen-state-empty"');
      expect(html).toContain('لا توجد مواعيد متاحة في هذا اليوم');
    });
  });
});
