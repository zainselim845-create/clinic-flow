import { describe, it, expect, beforeEach } from 'vitest';
import { safeStorage } from '../utils/safeStorage';
import { deleteExpense, addExpense } from '../services/expensesService';
import { 
  createPrescription, 
  getStoredPrescriptions, 
  savePrescriptionToStorage, 
  getPatientPrescriptionsFromStorage 
} from '../services/prescriptionService';
import { 
  saveBookingDraft, 
  getBookingDrafts 
} from '../services/leadRecoveryService';
import { 
  submitRegionalPaymentProof, 
  getRegionalPaymentReceipts, 
  approveRegionalPayment 
} from '../services/stripeBillingService';

describe('TDD: Strict Tenant Isolation & Data Integrity Invariants', () => {
  beforeEach(() => {
    safeStorage.clear();
  });

  describe('1. Expenses Service Tenant Scoping & Validation', () => {
    it('requires clinicId when deleting an expense and rejects un-scoped calls', async () => {
      const resWithoutClinic = await deleteExpense('exp-123', null);
      expect(resWithoutClinic.error).toBeDefined();
      expect(resWithoutClinic.error.message).toContain('clinicId');
    });

    it('requires clinicId and valid amount when adding an expense', async () => {
      const resNoClinic = await addExpense({ title: 'أدوات طبية', amount: 500 });
      expect(resNoClinic.error).toBeDefined();
      expect(resNoClinic.error.message).toContain('clinicId');

      const resNegativeAmount = await addExpense({ clinicId: 'clinic-a', title: 'أدوات', amount: -200 });
      expect(resNegativeAmount.error).toBeDefined();
    });
  });

  describe('2. Prescription Service Strict Tenant Isolation', () => {
    it('rejects createPrescription without an explicit clinicId', () => {
      expect(() => {
        createPrescription({
          patient: { id: 'pat-1', name: 'أحمد' },
          medications: [{ name: 'Panadol' }]
        });
      }).toThrow(/clinicId/i);
    });

    it('rejects getStoredPrescriptions and savePrescriptionToStorage without clinicId', () => {
      expect(() => getStoredPrescriptions(null)).toThrow(/clinicId/i);
      expect(() => savePrescriptionToStorage({ id: 'rx-1' })).toThrow(/clinicId/i);
    });

    it('guarantees complete isolation between two clinics for patient prescriptions', () => {
      const rxA = {
        id: 'rx-a1',
        clinicId: 'clinic-alpha',
        patientId: 'pat-same-id',
        patientName: 'مريض تجريبي',
        medications: [{ name: 'Amoxicillin' }]
      };
      const rxB = {
        id: 'rx-b1',
        clinicId: 'clinic-beta',
        patientId: 'pat-same-id',
        patientName: 'مريض تجريبي',
        medications: [{ name: 'Ibuprofen' }]
      };

      savePrescriptionToStorage(rxA);
      savePrescriptionToStorage(rxB);

      const alphaRecords = getPatientPrescriptionsFromStorage('pat-same-id', 'clinic-alpha');
      expect(alphaRecords).toHaveLength(1);
      expect(alphaRecords[0].id).toBe('rx-a1');

      const betaRecords = getPatientPrescriptionsFromStorage('pat-same-id', 'clinic-beta');
      expect(betaRecords).toHaveLength(1);
      expect(betaRecords[0].id).toBe('rx-b1');
    });
  });

  describe('3. Lead Recovery Drafts Zero-Cross-Tenant Leaks', () => {
    it('requires clinicId in getBookingDrafts and never returns drafts from other clinics', () => {
      saveBookingDraft({
        phone: '01012345678',
        patientName: 'عميل محتمل أ',
        step: 1
      }, 'clinic-a');

      saveBookingDraft({
        phone: '01087654321',
        patientName: 'عميل محتمل ب',
        step: 2
      }, 'clinic-b');

      const draftsA = getBookingDrafts('clinic-a');
      expect(draftsA).toHaveLength(1);
      expect(draftsA[0].patientName).toBe('عميل محتمل أ');

      const draftsB = getBookingDrafts('clinic-b');
      expect(draftsB).toHaveLength(1);
      expect(draftsB[0].patientName).toBe('عميل محتمل ب');

      expect(() => getBookingDrafts(null)).toThrow(/clinicId/i);
    });
  });

  describe('4. Billing Regional Receipts Tenant Isolation', () => {
    it('requires clinicId in getRegionalPaymentReceipts and isolates receipts per tenant', () => {
      submitRegionalPaymentProof({
        clinicId: 'clinic-c',
        referenceNumber: 'INSTA-111',
        amount: 1500,
        provider: 'instapay'
      });

      submitRegionalPaymentProof({
        clinicId: 'clinic-d',
        referenceNumber: 'VODA-222',
        amount: 800,
        provider: 'vodafone_cash'
      });

      const receiptsC = getRegionalPaymentReceipts('clinic-c');
      expect(receiptsC).toHaveLength(1);
      expect(receiptsC[0].referenceNumber).toBe('INSTA-111');

      const receiptsD = getRegionalPaymentReceipts('clinic-d');
      expect(receiptsD).toHaveLength(1);
      expect(receiptsD[0].referenceNumber).toBe('VODA-222');

      expect(() => getRegionalPaymentReceipts(null)).toThrow(/clinicId/i);
    });

    it('rejects approval when the receipt belongs to a different clinic', () => {
      const receipt = submitRegionalPaymentProof({
        clinicId: 'clinic-legit-owner',
        referenceNumber: 'INSTA-999',
        amount: 1200,
        provider: 'instapay'
      });

      expect(() => {
        approveRegionalPayment(receipt.id, 'clinic-rogue-attacker');
      }).toThrow(/tenant|mismatch|unauthorized/i);
    });
  });
});
