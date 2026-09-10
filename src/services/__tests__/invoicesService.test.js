import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as invoicesService from '../invoicesService';
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

describe('invoicesService Integration & Financial Ledger Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Transformers', () => {
    it('correctly maps client invoice to database columns with numeric integrity', () => {
      const clientInvoice = {
        clinicId: 'clinic-1',
        patientId: 'p-100',
        appointmentId: 'appt-200',
        invoiceNumber: 'INV-2026-001',
        subtotal: 1000,
        discount: 100,
        taxPercentage: 14,
        taxAmount: 126,
        total: 1026,
        insuranceShare: 200,
        patientShare: 826,
        paidAmount: 300,
        remainingBalance: 526,
        paymentStatus: 'partial',
        items: [{ description: 'كشف', unitPrice: 1000, quantity: 1, total: 1000 }],
        notes: 'ملاحظة سداد'
      };

      const dbPayload = invoicesService.toDbInvoice(clientInvoice);

      expect(dbPayload.clinic_id).toBe('clinic-1');
      expect(dbPayload.patient_id).toBe('p-100');
      expect(dbPayload.invoice_number).toBe('INV-2026-001');
      expect(dbPayload.total).toBe(1026);
      expect(dbPayload.remaining_balance).toBe(526);
      expect(dbPayload.payment_status).toBe('partial');
    });

    it('correctly maps DB row to client invoice model with safe fallbacks', () => {
      const dbRow = {
        id: 'inv-uuid',
        clinic_id: 'clinic-1',
        patient_id: 'p-100',
        patient_name: 'أحمد علي',
        patient_phone: '01011223344',
        invoice_number: 'INV-10',
        total: '500',
        paid_amount: '500',
        remaining_balance: '0',
        payment_status: 'paid',
        created_at: '2026-09-10T12:00:00Z'
      };

      const invoice = invoicesService.fromDbInvoice(dbRow);

      expect(invoice.id).toBe('inv-uuid');
      expect(invoice.clinicId).toBe('clinic-1');
      expect(invoice.total).toBe(500);
      expect(invoice.paidAmount).toBe(500);
      expect(invoice.remainingBalance).toBe(0);
      expect(invoice.paymentStatus).toBe('paid');
    });
  });

  describe('Tenant Isolation & Gating', () => {
    it('refuses to fetch invoices when clinicId is missing', async () => {
      const result = await invoicesService.getInvoices(null);
      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });

    it('refuses to add invoice when clinicId is missing', async () => {
      const invalidInvoice = {
        patientId: 'p-1',
        total: 500
      };

      const result = await invoicesService.addInvoice(invalidInvoice);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });

    it('refuses to fetch paginated invoices without clinicId', async () => {
      const result = await invoicesService.getInvoicesPaginated({ clinicId: null });
      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Clinic ID is strictly required');
    });
  });

  describe('Payment Ledger Math & Transitions', () => {
    it('transitions status to partial when paid amount is less than total', async () => {
      const existingInvoice = {
        id: 'inv-1',
        clinic_id: 'clinic-1',
        patient_id: 'pat-1',
        total: 1000,
        patient_share: 1000,
        paid_amount: 0,
        remaining_balance: 1000,
        payment_status: 'unpaid'
      };

      const mockPaymentsChain = {
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockInvoicesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: existingInvoice, error: null }),
        update: vi.fn().mockReturnThis()
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'payments') return mockPaymentsChain;
        if (table === 'invoices') return mockInvoicesChain;
        return {};
      });

      const paymentResult = await invoicesService.recordPayment('inv-1', {
        patientId: 'pat-1',
        amount: 400,
        paymentMethod: 'cash'
      });

      expect(paymentResult.success).toBe(true);

      // Verify payment was recorded with clinic_id
      expect(mockPaymentsChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        clinic_id: 'clinic-1',
        invoice_id: 'inv-1',
        amount: 400
      }));

      // Verify invoice was updated with partial status
      expect(mockInvoicesChain.update).toHaveBeenCalledWith(expect.objectContaining({
        paid_amount: 400,
        remaining_balance: 600,
        payment_status: 'partial'
      }));
    });

    it('transitions status to paid when paid amount equals or exceeds total', async () => {
      const existingInvoice = {
        id: 'inv-2',
        clinic_id: 'clinic-1',
        patient_id: 'pat-2',
        total: 1000,
        patient_share: 1000,
        paid_amount: 600,
        remaining_balance: 400,
        payment_status: 'partial'
      };

      const mockPaymentsChain = {
        insert: vi.fn().mockResolvedValue({ error: null })
      };

      const mockInvoicesChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: existingInvoice, error: null }),
        update: vi.fn().mockReturnThis()
      };

      supabase.from.mockImplementation((table) => {
        if (table === 'payments') return mockPaymentsChain;
        if (table === 'invoices') return mockInvoicesChain;
        return {};
      });

      const paymentResult = await invoicesService.recordPayment('inv-2', {
        patientId: 'pat-2',
        amount: 400,
        paymentMethod: 'instapay'
      });

      expect(paymentResult.success).toBe(true);
      expect(mockInvoicesChain.update).toHaveBeenCalledWith(expect.objectContaining({
        paid_amount: 1000,
        remaining_balance: 0,
        payment_status: 'paid'
      }));
    });

    it('fails if invoiceId is not provided to recordPayment', async () => {
      const result = await invoicesService.recordPayment(null, { amount: 100 });
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Invoice ID is required');
    });
  });
});
