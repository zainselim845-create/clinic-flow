import { describe, it, expect } from 'vitest';
import * as Features from '../features';
import * as AppointmentsFeature from '../features/appointments';
import * as PatientsFeature from '../features/patients';
import * as ClinicalFeature from '../features/clinical';
import * as BillingFeature from '../features/billing';
import * as InventoryFeature from '../features/inventory';
import * as AuthFeature from '../features/auth';
import * as MarketingFeature from '../features/marketing';
import * as PlatformFeature from '../features/platform';
import * as EgyptNationalFeature from '../features/egypt-national';

describe('Vertical Feature Slices Architecture & Clean Code Compliance', () => {
  describe('1. Master Features Registry Exports', () => {
    it('exports all 9 feature modules from the root features barrel', () => {
      expect(Features.AppointmentsFeature).toBeDefined();
      expect(Features.PatientsFeature).toBeDefined();
      expect(Features.ClinicalFeature).toBeDefined();
      expect(Features.BillingFeature).toBeDefined();
      expect(Features.InventoryFeature).toBeDefined();
      expect(Features.AuthFeature).toBeDefined();
      expect(Features.MarketingFeature).toBeDefined();
      expect(Features.PlatformFeature).toBeDefined();
      expect(Features.EgyptNationalFeature).toBeDefined();
    });
  });

  describe('2. Appointments Feature Slice', () => {
    it('provides appointment components and calendar utilities', () => {
      expect(AppointmentsFeature.AppointmentCard).toBeDefined();
      expect(AppointmentsFeature.BookingCalendar).toBeDefined();
      expect(AppointmentsFeature.BookingShareModal).toBeDefined();
      expect(AppointmentsFeature.getAppointments).toBeDefined();
      expect(AppointmentsFeature.addAppointment).toBeDefined();
      expect(AppointmentsFeature.getSlotsForDate).toBeDefined();
      expect(AppointmentsFeature.parseArabicTime).toBeDefined();
    });
  });

  describe('3. Patients Feature Slice', () => {
    it('provides patient cards, dossiers, recalls, and import handlers', () => {
      expect(PatientsFeature.PatientCard).toBeDefined();
      expect(PatientsFeature.PatientRecallModal).toBeDefined();
      expect(PatientsFeature.TreatmentPlanModal).toBeDefined();
      expect(PatientsFeature.ExcelPatientImportModal).toBeDefined();
      expect(PatientsFeature.PatientWalletPanel).toBeDefined();
      expect(PatientsFeature.getPatients).toBeDefined();
      expect(PatientsFeature.addPatient).toBeDefined();
      expect(PatientsFeature.parseNationalId).toBeDefined();
      expect(PatientsFeature.validateEgyptianPhone).toBeDefined();
    });
  });

  describe('4. Clinical Feature Slice', () => {
    it('provides clinical notes, prescriptions, treatments, and labs', () => {
      expect(ClinicalFeature.ClinicalNotesPanel).toBeDefined();
      expect(ClinicalFeature.PrescriptionPrintModal).toBeDefined();
      expect(ClinicalFeature.DoctorAiFloatingWidget).toBeDefined();
      expect(ClinicalFeature.LabOrderModal).toBeDefined();
      expect(ClinicalFeature.savePrescriptionToStorage).toBeDefined();
      expect(ClinicalFeature.getPatientClinicalNotes).toBeDefined();
      expect(ClinicalFeature.askDoctorAiAssistant).toBeDefined();
    });
  });

  describe('5. Billing & Ledger Feature Slice', () => {
    it('provides invoicing, expense modals, stripe billing, and Egyptian rails', () => {
      expect(BillingFeature.InvoiceModal).toBeDefined();
      expect(BillingFeature.ExpensesModal).toBeDefined();
      expect(BillingFeature.getInvoices).toBeDefined();
      expect(BillingFeature.addInvoice).toBeDefined();
      expect(BillingFeature.addExpense).toBeDefined();
      expect(BillingFeature.EGYPT_PAYMENT_METHODS).toBeDefined();
      expect(BillingFeature.validateInstaPayAddress).toBeDefined();
    });
  });

  describe('6. Inventory Feature Slice', () => {
    it('provides inventory item modals and inventory tracking services', () => {
      expect(InventoryFeature.InventoryItemModal).toBeDefined();
      expect(InventoryFeature.getInventoryItems).toBeDefined();
      expect(InventoryFeature.adjustItemStock).toBeDefined();
    });
  });

  describe('7. Auth & Access Control Feature Slice', () => {
    it('provides RBAC guards, authentication services, and audit logging', () => {
      expect(AuthFeature.Can).toBeDefined();
      expect(AuthFeature.useCapability).toBeDefined();
      expect(AuthFeature.ProtectedRoute).toBeDefined();
      expect(AuthFeature.authenticateUser).toBeDefined();
      expect(AuthFeature.triggerGoogleOAuthPopup).toBeDefined();
      expect(AuthFeature.logAuditEvent).toBeDefined();
    });
  });

  describe('8. Marketing & CRM Feature Slice', () => {
    it('provides campaigns, lead recovery, reactivation, and SMS services', () => {
      expect(MarketingFeature.sendSMS).toBeDefined();
      expect(MarketingFeature.getBookingDrafts).toBeDefined();
      expect(MarketingFeature.getOccasionCampaignCandidates).toBeDefined();
      expect(MarketingFeature.generateReactivationMessage).toBeDefined();
      expect(MarketingFeature.getReferralsLedger).toBeDefined();
    });
  });

  describe('9. Platform & Multi-Tenant Infrastructure Feature Slice', () => {
    it('provides tenant switcher, multi-tier cache, and domain services', () => {
      expect(PlatformFeature.TenantSwitcher).toBeDefined();
      expect(PlatformFeature.ClinicLogoUploader).toBeDefined();
      expect(PlatformFeature.ClinicPalettePicker).toBeDefined();
      expect(PlatformFeature.FeatureErrorBoundary).toBeDefined();
      expect(PlatformFeature.getClinicInfo).toBeDefined();
      expect(PlatformFeature.multiTierCache).toBeDefined();
      expect(PlatformFeature.globalAsyncQueue).toBeDefined();
      expect(PlatformFeature.verifyDomainDnsAndSsl).toBeDefined();
    });
  });

  describe('10. Egypt National Feature Slice', () => {
    it('provides governorates, syndicate verification, and national ID logic', () => {
      expect(EgyptNationalFeature.EGYPT_GOVERNORATES).toBeDefined();
      expect(EgyptNationalFeature.validateNationalId).toBeDefined();
      expect(EgyptNationalFeature.validateSyndicateId).toBeDefined();
      expect(EgyptNationalFeature.isMeezaCard).toBeDefined();
    });
  });
});
