import { describe, it, expect, beforeEach } from 'vitest';
import { checkSlotCollision } from '../services/appointmentsService';
import { 
  recordAuditEvent, 
  getAuditLogs, 
  verifyAuditChainIntegrity, 
  generateAuditComplianceCertificate,
  GENESIS_HASH
} from '../services/auditLoggerService';
import { 
  recordJournalEntry, 
  recordInvoiceJournalEntry, 
  recordPaymentJournalEntry, 
  getClinicTrialBalance, 
  CHART_OF_ACCOUNTS 
} from '../services/generalLedgerService';
import { 
  registerWebhookEndpoint, 
  dispatchWebhookEvent, 
  verifyWebhookSignature, 
  computeHmacSha256 
} from '../services/webhookService';

describe('Advanced Enterprise SaaS: Concurrency, Ledger, Cryptographic Audit & Webhooks', () => {

  describe('1. Concurrency Control & Double-Booking Prevention', () => {
    const existingAppointments = [
      { id: 'appt-1', clinicId: 'clinic-alpha', date: '2026-10-15', time: '05:00 م', status: 'booked' },
      { id: 'appt-2', clinicId: 'clinic-alpha', date: '2026-10-15', time: '06:00 م', status: 'completed' },
      { id: 'appt-3', clinicId: 'clinic-alpha', date: '2026-10-15', time: '07:00 م', status: 'cancelled' },
      { id: 'appt-4', clinicId: 'clinic-beta', date: '2026-10-15', time: '05:00 م', status: 'booked' }
    ];

    it('detects collision when attempting to book an already occupied slot', async () => {
      const isColliding = await checkSlotCollision('clinic-alpha', '2026-10-15', '05:00 م', null, existingAppointments);
      expect(isColliding).toBe(true);
    });

    it('allows booking an available time slot on the same day', async () => {
      const isColliding = await checkSlotCollision('clinic-alpha', '2026-10-15', '08:00 م', null, existingAppointments);
      expect(isColliding).toBe(false);
    });

    it('ignores cancelled appointments allowing slot reuse', async () => {
      const isColliding = await checkSlotCollision('clinic-alpha', '2026-10-15', '07:00 م', null, existingAppointments);
      expect(isColliding).toBe(false);
    });

    it('permits same time slot on a different clinic (tenant isolation)', async () => {
      // 06:00 PM is booked on clinic-alpha, but should be free on clinic-beta
      const isColliding = await checkSlotCollision('clinic-beta', '2026-10-15', '06:00 م', null, existingAppointments);
      expect(isColliding).toBe(false);
    });

    it('excludes specified appointment ID during updates', async () => {
      // When updating appt-1 itself, it should not collide with itself
      const isColliding = await checkSlotCollision('clinic-alpha', '2026-10-15', '05:00 م', 'appt-1', existingAppointments);
      expect(isColliding).toBe(false);
    });
  });

  describe('2. Cryptographic Tamper-Evident Audit Ledger (Merkle Hash Chaining)', () => {
    it('creates chained hashes where each block references its predecessor', () => {
      const entry1 = recordAuditEvent({
        eventType: 'USER_LOGIN',
        user: 'د. سارة',
        action: 'تسجيل دخول للنظام',
        details: 'IP: 192.168.1.1',
        clinicId: 'clinic-audit'
      });

      const entry2 = recordAuditEvent({
        eventType: 'CONSULTATION_COMPLETED',
        user: 'د. سارة',
        action: 'إنهاء كشف سريري',
        details: 'تشخيص تسوس أسنان',
        clinicId: 'clinic-audit'
      });

      expect(entry1.hash).toBeDefined();
      expect(entry1.hash.length).toBe(64); // SHA-256 hex length
      expect(entry2.previousHash).toBe(entry1.hash);
    });

    it('verifies integrity of legitimate audit trail', () => {
      const logs = getAuditLogs();
      const verification = verifyAuditChainIntegrity(logs);
      expect(verification.isValid).toBe(true);
      expect(verification.totalChecked).toBeGreaterThan(0);
      expect(verification.brokenAt).toBeNull();
    });

    it('detects tampering if any historical audit entry is altered', () => {
      const logs = JSON.parse(JSON.stringify(getAuditLogs()));
      if (logs.length >= 2) {
        // Tamper with action or details in a historical entry
        const targetIndex = logs.length - 1;
        logs[targetIndex].details = 'محتوى تم التلاعب به بصورة غير مصرحة';

        const verification = verifyAuditChainIntegrity(logs);
        expect(verification.isValid).toBe(false);
        expect(verification.brokenAt).toBeDefined();
        expect(verification.reason).toContain('Tampered');
      }
    });

    it('generates a verified cryptographic compliance certificate', () => {
      const cert = generateAuditComplianceCertificate('clinic-test');
      expect(cert.isTamperFree).toBe(true);
      expect(cert.digitalSeal).toBeDefined();
      expect(cert.standardCompliance).toContain('HIPAA-Security-164.312');
      expect(cert.standardCompliance).toContain('Egyptian-Health-Data-Law-151');
    });
  });

  describe('3. Double-Entry General Ledger (Accounting Invariants)', () => {
    it('successfully records a balanced double-entry transaction', () => {
      const entry = recordJournalEntry({
        clinicId: 'clinic-acc',
        referenceType: 'manual',
        description: 'شراء مواد تخدير نقداً',
        lines: [
          { accountCode: CHART_OF_ACCOUNTS.MEDICAL_SUPPLIES_EXPENSE.code, debit: 750, credit: 0 },
          { accountCode: CHART_OF_ACCOUNTS.CASH_ON_HAND.code, debit: 0, credit: 750 }
        ]
      });

      expect(entry.entryNumber).toMatch(/^JRN-\d{4}-\d{4}$/);
      expect(entry.totalAmount).toBe(750);
    });

    it('strictly rejects an unbalanced journal transaction', () => {
      expect(() => {
        recordJournalEntry({
          clinicId: 'clinic-acc',
          referenceType: 'manual',
          description: 'قيد غير متوازن',
          lines: [
            { accountCode: '1010', debit: 500, credit: 0 },
            { accountCode: '4010', debit: 0, credit: 300 } // Unbalanced: 500 vs 300
          ]
        });
      }).toThrow(/Unbalanced journal entry/i);
    });

    it('automates journal entry when issuing an invoice', () => {
      const mockInvoice = {
        id: 'inv-test-99',
        invoiceNumber: 'INV-2026-0001',
        clinicId: 'clinic-acc',
        patientName: 'أحمد محمود',
        total: 600,
        patientShare: 600,
        paidAmount: 0,
        paymentStatus: 'unpaid'
      };

      const entry = recordInvoiceJournalEntry(mockInvoice);
      expect(entry).not.toBeNull();
      // Line 1: Debit Accounts Receivable (1050): 600
      expect(entry.lines[0].accountCode).toBe('1050');
      expect(entry.lines[0].debit).toBe(600);
      // Line 2: Credit Consultation Revenue (4010): 600
      expect(entry.lines[1].accountCode).toBe('4010');
      expect(entry.lines[1].credit).toBe(600);
    });

    it('automates journal entry when collecting patient payment', () => {
      const mockPayment = {
        id: 'pay-test-1',
        clinicId: 'clinic-acc',
        amount: 400,
        paymentMethod: 'instapay'
      };

      const entry = recordPaymentJournalEntry(mockPayment);
      expect(entry).not.toBeNull();
      // Line 1: Debit Bank/InstaPay (1020): 400
      expect(entry.lines[0].accountCode).toBe('1020');
      expect(entry.lines[0].debit).toBe(400);
      // Line 2: Credit Accounts Receivable (1050): 400
      expect(entry.lines[1].accountCode).toBe('1050');
      expect(entry.lines[1].credit).toBe(400);
    });

    it('computes trial balance where grand debits strictly equal grand credits', () => {
      const trialBalance = getClinicTrialBalance('clinic-acc');
      expect(trialBalance.isBalanced).toBe(true);
      expect(trialBalance.grandTotalDebit).toBe(trialBalance.grandTotalCredit);
    });
  });

  describe('4. Outgoing HMAC Webhooks & Event Bus', () => {
    const testSecret = 'whsec_enterprise_top_secret_key_1234567890';
    const clinicId = 'clinic-webhook';

    it('registers webhook endpoint with custom secret and event subscriptions', () => {
      const endpoint = registerWebhookEndpoint({
        clinicId,
        url: 'https://api.clinic-erp.com/webhooks/clinicflow',
        secret: testSecret,
        events: ['appointment.created', 'payment.collected']
      });

      expect(endpoint.id).toMatch(/^ep_\d+/);
      expect(endpoint.url).toBe('https://api.clinic-erp.com/webhooks/clinicflow');
    });

    it('computes and verifies HMAC-SHA256 signatures correctly', () => {
      const payload = JSON.stringify({ event: 'appointment.created', patientId: 'p-100' });
      const timestamp = '1700000000';
      const signature = computeHmacSha256(testSecret, `${timestamp}.${payload}`);
      const header = `t=${timestamp},v1=${signature}`;

      const isValid = verifyWebhookSignature(payload, header, testSecret);
      expect(isValid).toBe(true);
    });

    it('rejects tampered webhook payloads or incorrect secrets', () => {
      const payload = JSON.stringify({ event: 'payment.collected', amount: 500 });
      const tamperedPayload = JSON.stringify({ event: 'payment.collected', amount: 5000 });
      const timestamp = '1700000000';
      const signature = computeHmacSha256(testSecret, `${timestamp}.${payload}`);
      const header = `t=${timestamp},v1=${signature}`;

      // Tampered payload
      expect(verifyWebhookSignature(tamperedPayload, header, testSecret)).toBe(false);
      // Wrong secret
      expect(verifyWebhookSignature(payload, header, 'wrong_secret')).toBe(false);
    });

    it('dispatches event and attaches valid HMAC signature header', async () => {
      const result = await dispatchWebhookEvent({
        clinicId,
        eventType: 'appointment.created',
        data: { patientName: 'سارة إبراهيم', time: '05:00 م' }
      });

      expect(result.dispatchedCount).toBeGreaterThan(0);
      const delivery = result.deliveries[0];
      expect(delivery.signatureHeader).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });
  });

});
