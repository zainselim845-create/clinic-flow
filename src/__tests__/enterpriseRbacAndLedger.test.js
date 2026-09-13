import { describe, it, expect, beforeEach } from 'vitest';
import { 
  hasCapability, 
  CAPABILITIES, 
  isDoctorRole, 
  canAccessFinancials 
} from '../utils/permissions';
import { 
  getNextInvoiceNumber, 
  normalizeInvoiceTotals 
} from '../services/invoicesService';
import * as Domains from '../domains';

describe('Enterprise Tier-1 SaaS Architecture: RBAC & Ledger Verification', () => {

  describe('1. Granular Capability-Based Access Control (RBAC)', () => {
    const superAdmin = { id: 'usr-sa', role: 'super_admin', isSuperAdmin: true };
    const clinicOwner = { id: 'usr-doc', role: 'doctor', clinicId: 'c1' };
    const associateDoctor = { id: 'usr-assoc', role: 'associate_doctor', clinicId: 'c1' };
    const receptionist = { id: 'usr-rec', role: 'receptionist', clinicId: 'c1' };
    const accountant = { id: 'usr-acc', role: 'accountant', clinicId: 'c1' };
    const customStaff = { 
      id: 'usr-custom', 
      role: 'staff', 
      clinicId: 'c1',
      capabilities: ['billing.revenue.view', 'custom.special.action']
    };

    it('grants SuperAdmin platform-wide wildcard capabilities', () => {
      expect(hasCapability(superAdmin, CAPABILITIES.PLATFORM_SUPERADMIN)).toBe(true);
      expect(hasCapability(superAdmin, CAPABILITIES.BILLING_REVENUE_VIEW)).toBe(true);
      expect(hasCapability(superAdmin, CAPABILITIES.CLINICAL_CONSULT)).toBe(true);
      expect(hasCapability(superAdmin, 'any.arbitrary.future.capability')).toBe(true);
    });

    it('grants Clinic Owner/Doctor all clinical, billing, and operational capabilities', () => {
      expect(hasCapability(clinicOwner, CAPABILITIES.CLINICAL_CONSULT)).toBe(true);
      expect(hasCapability(clinicOwner, CAPABILITIES.CLINICAL_PRESCRIBE)).toBe(true);
      expect(hasCapability(clinicOwner, CAPABILITIES.BILLING_REVENUE_VIEW)).toBe(true);
      expect(hasCapability(clinicOwner, CAPABILITIES.SETTINGS_CLINIC_MANAGE)).toBe(true);
      // But does NOT grant platform superadmin access
      expect(hasCapability(clinicOwner, CAPABILITIES.PLATFORM_SUPERADMIN)).toBe(false);
    });

    it('grants Associate Doctor clinical capabilities but restricts administrative settings', () => {
      expect(hasCapability(associateDoctor, CAPABILITIES.CLINICAL_CONSULT)).toBe(true);
      expect(hasCapability(associateDoctor, CAPABILITIES.CLINICAL_PRESCRIBE)).toBe(true);
      expect(hasCapability(associateDoctor, CAPABILITIES.SCHEDULING_MANAGE)).toBe(true);
      // Restricted:
      expect(hasCapability(associateDoctor, CAPABILITIES.SETTINGS_CLINIC_MANAGE)).toBe(false);
      expect(hasCapability(associateDoctor, CAPABILITIES.BILLING_REVENUE_VIEW)).toBe(false);
    });

    it('strictly denies Receptionist/Staff from viewing revenue while allowing payment collection', () => {
      expect(hasCapability(receptionist, CAPABILITIES.SCHEDULING_MANAGE)).toBe(true);
      expect(hasCapability(receptionist, CAPABILITIES.SCHEDULING_QUEUE_TRIAGE)).toBe(true);
      expect(hasCapability(receptionist, CAPABILITIES.BILLING_PAYMENT_COLLECT)).toBe(true);
      expect(hasCapability(receptionist, CAPABILITIES.BILLING_INVOICE_CREATE)).toBe(true);
      // Strictly hidden & denied:
      expect(hasCapability(receptionist, CAPABILITIES.BILLING_REVENUE_VIEW)).toBe(false);
      expect(hasCapability(receptionist, CAPABILITIES.CLINICAL_CONSULT)).toBe(false);
      expect(hasCapability(receptionist, CAPABILITIES.CLINICAL_RECORDS_WRITE)).toBe(false);
    });

    it('grants Accountant full financial access but restricts clinical notes', () => {
      expect(hasCapability(accountant, CAPABILITIES.BILLING_INVOICE_CREATE)).toBe(true);
      expect(hasCapability(accountant, CAPABILITIES.BILLING_PAYMENT_COLLECT)).toBe(true);
      expect(hasCapability(accountant, CAPABILITIES.BILLING_REVENUE_VIEW)).toBe(true);
      expect(hasCapability(accountant, CAPABILITIES.BILLING_REFUND_PROCESS)).toBe(true);
      expect(hasCapability(accountant, CAPABILITIES.CLINICAL_CONSULT)).toBe(false);
      expect(canAccessFinancials(accountant)).toBe(true);
    });

    it('honors explicit custom user capabilities array', () => {
      expect(hasCapability(customStaff, 'billing.revenue.view')).toBe(true);
      expect(hasCapability(customStaff, 'custom.special.action')).toBe(true);
      expect(hasCapability(customStaff, CAPABILITIES.CLINICAL_CONSULT)).toBe(false);
    });

    it('provides backward compatibility with legacy permissions array', () => {
      const legacyUser = { id: 'usr-leg', role: 'staff', permissions: ['invoices'] };
      expect(hasCapability(legacyUser, CAPABILITIES.BILLING_REVENUE_VIEW)).toBe(true);
      expect(hasCapability(legacyUser, CAPABILITIES.BILLING_INVOICE_CREATE)).toBe(true);
      expect(hasCapability(legacyUser, CAPABILITIES.CLINICAL_CONSULT)).toBe(false);
    });
  });

  describe('2. Monotonic Sequential Invoicing (Financial Integrity)', () => {
    const currentYear = new Date().getFullYear();

    it('initializes sequence with INV-YYYY-0001 when no invoices exist', () => {
      const nextNum = getNextInvoiceNumber('clinic-empty', { existingInvoices: [] });
      expect(nextNum).toBe(`INV-${currentYear}-0001`);
    });

    it('strictly increments existing monotonic sequences sequentially', () => {
      const existing = [
        { invoiceNumber: `INV-${currentYear}-0001` },
        { invoiceNumber: `INV-${currentYear}-0002` },
        { invoiceNumber: `INV-${currentYear}-0003` }
      ];
      const nextNum = getNextInvoiceNumber('clinic-active', { existingInvoices: existing });
      expect(nextNum).toBe(`INV-${currentYear}-0004`);
    });

    it('finds maximum sequence even if invoices are unordered in storage', () => {
      const unordered = [
        { invoiceNumber: `INV-${currentYear}-0042` },
        { invoiceNumber: `INV-${currentYear}-0010` },
        { invoiceNumber: `INV-${currentYear}-0099` },
        { invoiceNumber: `INV-${currentYear}-0005` }
      ];
      const nextNum = getNextInvoiceNumber('clinic-active', { existingInvoices: unordered });
      expect(nextNum).toBe(`INV-${currentYear}-0100`);
    });

    it('maintains strict isolation between clinics', () => {
      const clinicAInvoices = [{ invoiceNumber: `INV-${currentYear}-0015` }];
      const clinicBInvoices = [{ invoiceNumber: `INV-${currentYear}-0002` }];

      const nextA = getNextInvoiceNumber('clinic-a', { existingInvoices: clinicAInvoices });
      const nextB = getNextInvoiceNumber('clinic-b', { existingInvoices: clinicBInvoices });

      expect(nextA).toBe(`INV-${currentYear}-0016`);
      expect(nextB).toBe(`INV-${currentYear}-0003`);
    });

    it('ignores invoices from prior years when computing current year sequence', () => {
      const pastYear = currentYear - 1;
      const mixed = [
        { invoiceNumber: `INV-${pastYear}-0999` },
        { invoiceNumber: `INV-${currentYear}-0001` }
      ];
      const nextNum = getNextInvoiceNumber('clinic-year', { existingInvoices: mixed });
      expect(nextNum).toBe(`INV-${currentYear}-0002`);
    });
  });

  describe('3. Financial Ledger Invariants & Arithmetic Precision', () => {
    it('normalizes financial calculations to 2 decimal places and prevents floating drift', () => {
      // 0.1 + 0.2 floating point anomaly
      const result = normalizeInvoiceTotals({
        subtotal: 100.10,
        discount: 10.05,
        taxPercentage: 14,
        paidAmount: 50
      });

      expect(result.subtotal).toBe(100.10);
      expect(result.discount).toBe(10.05);
      // Taxable: 90.05. Tax 14%: 12.61. Total: 102.66
      expect(result.taxAmount).toBe(12.61);
      expect(result.total).toBe(102.66);
      expect(result.paidAmount).toBe(50);
      expect(result.remainingBalance).toBe(52.66);
      expect(result.paymentStatus).toBe('partial');
    });

    it('correctly sets status to paid when paidAmount equals or exceeds total', () => {
      const result = normalizeInvoiceTotals({
        subtotal: 500,
        discount: 0,
        taxPercentage: 0,
        paidAmount: 500
      });

      expect(result.total).toBe(500);
      expect(result.paidAmount).toBe(500);
      expect(result.remainingBalance).toBe(0);
      expect(result.paymentStatus).toBe('paid');
    });

    it('clamps negative inputs to non-negative zero', () => {
      const result = normalizeInvoiceTotals({
        subtotal: -100,
        discount: -20,
        taxPercentage: -5,
        paidAmount: -50
      });

      expect(result.subtotal).toBe(0);
      expect(result.discount).toBe(0);
      expect(result.taxPercentage).toBe(0);
      expect(result.total).toBe(0);
      expect(result.paidAmount).toBe(0);
      expect(result.remainingBalance).toBe(0);
      expect(result.paymentStatus).toBe('paid');
    });
  });

  describe('4. Bounded Context Domain Gateway Exports', () => {
    it('exports all 6 foundational SaaS domains cleanly', () => {
      expect(Domains.IdentityDomain).toBeDefined();
      expect(Domains.ClinicalDomain).toBeDefined();
      expect(Domains.BillingDomain).toBeDefined();
      expect(Domains.SchedulingDomain).toBeDefined();
      expect(Domains.PatientsDomain).toBeDefined();
      expect(Domains.PlatformDomain).toBeDefined();
    });

    it('verifies public API methods on Billing and Identity domains', () => {
      expect(typeof Domains.BillingDomain.getNextInvoiceNumber).toBe('function');
      expect(typeof Domains.BillingDomain.normalizeInvoiceTotals).toBe('function');
      expect(typeof Domains.IdentityDomain.hasCapability).toBe('function');
      expect(typeof Domains.ClinicalDomain.checkDrugAllergyInteractions).toBe('function');
    });
  });

});
