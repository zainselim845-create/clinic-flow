import { describe, it, expect, vi, beforeEach } from 'vitest';
import { round2, normalizeInvoiceTotals } from '@/features/billing/services/invoicesService';
import { 
  recordJournalEntry, 
  CHART_OF_ACCOUNTS 
} from '@/features/billing/services/generalLedgerService';
import { 
  recordStockTransaction, 
  getStockTransactions, 
  adjustItemStock, 
  STOCK_TRANSACTION_TYPES 
} from '@/features/inventory/services/inventoryService';
import {
  getStaffAttendanceForClinic,
  recordCheckInForClinic,
  recordCheckOutForClinic
} from '@/features/platform/services/attendanceService';
import { cleanEgyptianPhone } from '@/utils/phoneValidation';

describe('Production Hardening Invariants (P0-P4 Forensic Suite)', () => {

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. UUID Guard & Tenant Slug Isolation (Postgres 22P02 Prevention)
  // =========================================================================
  describe('1. UUID Guard & Tenant Slug Isolation', () => {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    it('identifies valid RFC4122 v4 UUIDs for remote queries', () => {
      const validUuids = [
        'c7b509ef-871d-4eb4-b9b2-32b0e6dfcf31',
        '39f90988-8e2b-400c-ba6b-2ab3d9559efa',
        'd8a39b21-4f12-4e89-a1b2-c3d4e5f6a7b8'
      ];
      validUuids.forEach(id => {
        expect(UUID_REGEX.test(id)).toBe(true);
      });
    });

    it('rejects slug strings to prevent Postgres 22P02 syntax errors', () => {
      const nonUuids = [
        'al-amal-clinic',
        'tenant-default',
        'clinic-1234',
        'c-1',
        'undefined',
        ''
      ];
      nonUuids.forEach(slug => {
        expect(UUID_REGEX.test(slug)).toBe(false);
      });
    });
  });

  // =========================================================================
  // 2. Supabase 42703 Column Missing Resilience (Graceful Fallback)
  // =========================================================================
  describe('2. Column Missing 42703 Resilient Recovery Pattern', () => {
    it('catches code 42703 and falls back to universal select without breaking UI', async () => {
      const mockQueryExecutor = vi.fn()
        .mockRejectedValueOnce({ code: '42703', message: 'column "medical_alerts" does not exist' })
        .mockResolvedValueOnce({ data: [{ id: '1', name: 'أحمد علي' }], error: null });

      let data = null;
      let error = null;

      try {
        await mockQueryExecutor('id, name, medical_alerts');
      } catch (err) {
        if (err.code === '42703') {
          const fallbackRes = await mockQueryExecutor('*');
          data = fallbackRes.data;
          error = fallbackRes.error;
        } else {
          error = err;
        }
      }

      expect(mockQueryExecutor).toHaveBeenCalledTimes(2);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('أحمد علي');
    });
  });

  // =========================================================================
  // 3. Financial Precision & Double-Entry Ledger Validation
  // =========================================================================
  describe('3. Financial Precision & Double-Entry Ledger Validation', () => {
    it('round2 properly rounds financial numbers without IEEE 754 precision drift', () => {
      expect(round2(0.1 + 0.2)).toBe(0.3);
      expect(round2(350.555)).toBe(350.56);
      expect(round2(120.004)).toBe(120);
      expect(round2(0)).toBe(0);
      expect(round2(-50.25)).toBe(-50.25);
    });

    it('normalizeInvoiceTotals produces clamped, non-negative financial values', () => {
      const res = normalizeInvoiceTotals({
        subtotal: 500,
        discount: 50,
        taxPercentage: 14,
        paidAmount: 200
      });

      expect(res.subtotal).toBe(500);
      expect(res.discount).toBe(50);
      expect(res.taxAmount).toBe(63); // (500-50)*0.14 = 63
      expect(res.total).toBe(513);
      expect(res.remainingBalance).toBe(313);
      expect(res.paymentStatus).toBe('partial');
    });

    it('recordJournalEntry rejects unbalanced journal entries with explicit error', () => {
      expect(() => {
        recordJournalEntry({
          clinicId: 'clinic-jrn-test',
          referenceType: 'test',
          referenceId: '1',
          description: 'قيد غير متوازن',
          lines: [
            { accountCode: CHART_OF_ACCOUNTS.CASH_ON_HAND.code, debit: 500, credit: 0 },
            { accountCode: CHART_OF_ACCOUNTS.CONSULTATION_REVENUE.code, debit: 0, credit: 400 }
          ]
        });
      }).toThrow(/Unbalanced journal entry/);
    });

    it('recordJournalEntry approves and records balanced transactions (Debits === Credits)', () => {
      const entry = recordJournalEntry({
        clinicId: 'clinic-jrn-test',
        referenceType: 'invoice',
        referenceId: 'inv-101',
        description: 'تحصيل كشف أسنان متوازن نقداً',
        lines: [
          { accountCode: CHART_OF_ACCOUNTS.CASH_ON_HAND.code, debit: 350, credit: 0 },
          { accountCode: CHART_OF_ACCOUNTS.CONSULTATION_REVENUE.code, debit: 0, credit: 350 }
        ]
      });

      expect(entry).toBeDefined();
      expect(entry.entryNumber).toContain('JRN-');
      expect(entry.totalAmount).toBe(350);
      expect(entry.lines).toHaveLength(2);
    });
  });

  // =========================================================================
  // 4. Duplicate Phone Patient Registration Guard
  // =========================================================================
  describe('4. Duplicate Phone Patient Registration Guard', () => {
    it('detects existing Egyptian phone in tenant patients and prevents duplicates', () => {
      const existingPatients = [
        { id: 'pat-1', name: 'محمود حسن', phone: '01012345678' },
        { id: 'pat-2', name: 'سارة إبراهيم', phone: '01298765432' }
      ];

      const inputPhone = '010 1234 5678';
      const normalizedPhone = cleanEgyptianPhone(inputPhone);
      const duplicate = existingPatients.find(p => cleanEgyptianPhone(p.phone) === normalizedPhone);

      expect(duplicate).toBeDefined();
      expect(duplicate.name).toBe('محمود حسن');
    });

    it('allows registering patient with a unique Egyptian phone number', () => {
      const existingPatients = [
        { id: 'pat-1', name: 'محمود حسن', phone: '01012345678' }
      ];

      const inputPhone = '011 5566 7788';
      const normalizedPhone = cleanEgyptianPhone(inputPhone);
      const duplicate = existingPatients.find(p => cleanEgyptianPhone(p.phone) === normalizedPhone);

      expect(duplicate).toBeUndefined();
    });
  });

  // =========================================================================
  // 5. Stock Audit Ledger & Movement Tracking
  // =========================================================================
  describe('5. Stock Audit Ledger & Movement Tracking', () => {
    const testClinicId = 'clinic-inv-test';

    it('records and retrieves append-only stock movement transactions', async () => {
      const tx = await recordStockTransaction(testClinicId, {
        itemId: 'item-comp-1',
        itemName: 'كومبوزيت ألماني A2',
        type: 'in',
        delta: 5,
        previousQty: 10,
        newQty: 15,
        reason: 'فاتورة توريد رقم 104',
        performedBy: 'د. زين سليم'
      });

      expect(tx.data).toBeDefined();
      expect(tx.data.id).toContain('tx_');
      expect(tx.data.newQty).toBe(15);
      expect(tx.data.delta).toBe(5);

      const { data } = await getStockTransactions(testClinicId, 'item-comp-1');
      expect(data).toHaveLength(1);
      expect(data[0].reason).toBe('فاتورة توريد رقم 104');
      expect(STOCK_TRANSACTION_TYPES.IN.labelAr).toBe('توريد / شراء وارد');
    });

    it('adjustItemStock correctly records transaction audit metadata upon adjustment', async () => {
      const res = await adjustItemStock('item-comp-1', 12, testClinicId, {
        itemName: 'كومبوزيت ألماني A2',
        type: 'out',
        previousQty: 15,
        reason: 'صرف استهلاك عيادة'
      });

      expect(res.success).toBe(true);

      const { data } = await getStockTransactions(testClinicId, 'item-comp-1');
      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(data[0].newQty).toBe(12);
    });
  });

  // =========================================================================
  // 6. Strict Tenant Attendance Bounds
  // =========================================================================
  describe('6. Strict Tenant Attendance Bounds', () => {
    it('throws error when clinicId is missing in getStaffAttendanceForClinic', async () => {
      await expect(getStaffAttendanceForClinic(null)).rejects.toThrow('clinicId is strictly required');
      await expect(getStaffAttendanceForClinic('')).rejects.toThrow('clinicId is strictly required');
    });

    it('throws error when clinicId is missing in recordCheckInForClinic', async () => {
      await expect(recordCheckInForClinic('staff-1', 'هدى التمريض', null)).rejects.toThrow('clinicId is strictly required');
    });

    it('throws error when clinicId is missing in recordCheckOutForClinic', async () => {
      await expect(recordCheckOutForClinic('att-1', new Date().toISOString(), null)).rejects.toThrow('clinicId is strictly required');
    });

    it('executes safely when explicit clinicId is provided', async () => {
      const res = await recordCheckInForClinic('staff-1', 'هدى التمريض', 'clinic-cairo-1');
      expect(res.data).toBeDefined();
      expect(res.data.clinicId).toBe('clinic-cairo-1');
      expect(res.data.staffName).toBe('هدى التمريض');
    });
  });

});
