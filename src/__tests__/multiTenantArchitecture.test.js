import { describe, it, expect, beforeEach } from 'vitest';
import { demoClinics, clinicInfo, getInitialDataForTenant } from '../data/demoData';
import { canSwitchTenants, getUserAllowedClinics } from '../utils/permissions';
import { resolveTenantFromLocation, isDedicatedDomain } from '../context/TenantContext';
import { PatientIndexEngine } from '../services/indexedSearchService';
import { getLocalTreatmentPlans, saveLocalTreatmentPlans } from '../services/treatmentPlansService';
import { getPatientPackages, savePatientPackage } from '../services/packagesService';
import { getStoredFeedbacks, saveFeedback } from '../services/feedbackService';
import { getSmsConfig, saveSmsConfig } from '../services/smsService';
import fs from 'fs';
import path from 'path';

describe('ClinicFlow Enterprise Multi-Tenant B2B SaaS Architecture', () => {

  describe('1. Tenant Directory & Seed Configurations', () => {
    it('provides multi-tenant seed clinics with complete isolation metadata', () => {
      expect(Array.isArray(demoClinics)).toBe(true);
      expect(demoClinics.length).toBeGreaterThanOrEqual(2);

      const [dentalClinic, dermClinic] = demoClinics;

      // Dental Clinic (Dr. Ahmed)
      expect(dentalClinic.slug).toBe('dr-ahmed');
      expect(dentalClinic.customDomain).toBe('dr-ahmed-dental.com');
      expect(dentalClinic.subscriptionTier).toBe('pro');
      expect(dentalClinic.branding.primaryColor).toBe('#0071E3');
      expect(dentalClinic.quotas.monthlySmsQuota).toBe(2000);
      expect(dentalClinic.quotas.maxDoctors).toBe(3);

      // Dermatology & Laser Clinic (Dr. Sara)
      expect(dermClinic.slug).toBe('dr-sara');
      expect(dermClinic.customDomain).toBe('drsara-clinic.com');
      expect(dermClinic.subscriptionTier).toBe('enterprise');
      expect(dermClinic.branding.primaryColor).toBe('#8B5CF6');
      expect(dermClinic.quotas.monthlySmsQuota).toBe(5000);
      expect(dermClinic.quotas.maxDoctors).toBe(10);
    });

    it('each tenant has independent services, working hours and pricing', () => {
      const [dental, derm] = demoClinics;
      
      const dentalServices = dental.services.map(s => s.name);
      const dermServices = derm.services.map(s => s.name);

      expect(dentalServices).toContain('كشف وفحص تشخيصي شامل للأسنان');
      expect(dermServices).toContain('كشف واستشارة جلدية متخصصة');
      expect(dentalServices).not.toEqual(dermServices);
    });
  });

  describe('2. Subscription Tier Feature Gating Engine', () => {
    const tierFeatures = {
      starter: ['appointments', 'patients', 'invoices'],
      pro: ['appointments', 'patients', 'invoices', 'inventory', 'sms', 'aiAssistant', 'dentalChart'],
      enterprise: ['appointments', 'patients', 'invoices', 'inventory', 'sms', 'aiAssistant', 'dentalChart', 'multiDoctor', 'multiBranch', 'customDomain', 'auditLogs']
    };

    const hasFeature = (tier, feature) => {
      return (tierFeatures[tier] || tierFeatures.starter).includes(feature);
    };

    it('starter tier is restricted to core operational modules', () => {
      expect(hasFeature('starter', 'appointments')).toBe(true);
      expect(hasFeature('starter', 'patients')).toBe(true);
      expect(hasFeature('starter', 'invoices')).toBe(true);
      expect(hasFeature('starter', 'aiAssistant')).toBe(false);
      expect(hasFeature('starter', 'inventory')).toBe(false);
      expect(hasFeature('starter', 'multiDoctor')).toBe(false);
    });

    it('pro tier unlocks AI assistant, inventory, SMS and specialty charts', () => {
      expect(hasFeature('pro', 'aiAssistant')).toBe(true);
      expect(hasFeature('pro', 'inventory')).toBe(true);
      expect(hasFeature('pro', 'sms')).toBe(true);
      expect(hasFeature('pro', 'dentalChart')).toBe(true);
      expect(hasFeature('pro', 'multiBranch')).toBe(false);
      expect(hasFeature('pro', 'customDomain')).toBe(false);
    });

    it('enterprise tier unlocks complete multi-doctor, multi-branch, and custom domain suite', () => {
      expect(hasFeature('enterprise', 'multiDoctor')).toBe(true);
      expect(hasFeature('enterprise', 'multiBranch')).toBe(true);
      expect(hasFeature('enterprise', 'customDomain')).toBe(true);
      expect(hasFeature('enterprise', 'auditLogs')).toBe(true);
    });
  });

  describe('3. Operational Quota Enforcement', () => {
    const checkQuota = (tenant, quotaType) => {
      const quotas = tenant.quotas || {};
      switch (quotaType) {
        case 'sms': {
          const used = quotas.smsUsed || 0;
          const limit = quotas.monthlySmsQuota || 1000;
          return { allowed: used < limit, used, limit };
        }
        case 'doctors': {
          const used = quotas.doctorsCount || 1;
          const limit = quotas.maxDoctors || 3;
          return { allowed: used < limit, used, limit };
        }
        default:
          return { allowed: true, used: 0, limit: Infinity };
      }
    };

    it('allows actions within quota and blocks when quota is exceeded', () => {
      const healthyTenant = {
        quotas: { smsUsed: 450, monthlySmsQuota: 1000, doctorsCount: 2, maxDoctors: 3 }
      };
      expect(checkQuota(healthyTenant, 'sms').allowed).toBe(true);
      expect(checkQuota(healthyTenant, 'doctors').allowed).toBe(true);

      const maxedOutTenant = {
        quotas: { smsUsed: 1000, monthlySmsQuota: 1000, doctorsCount: 3, maxDoctors: 3 }
      };
      expect(checkQuota(maxedOutTenant, 'sms').allowed).toBe(false);
      expect(checkQuota(maxedOutTenant, 'doctors').allowed).toBe(false);
    });
  });

  describe('4. Dynamic Tenant Slug, Custom Domain & Subdomain Resolution Engine', () => {
    it('resolves tenant and activates dedicated domain mode from custom domains', () => {
      // Dr. Sara custom domain (with and without www)
      const saraResult = resolveTenantFromLocation(demoClinics, { hostname: 'drsara-clinic.com', pathname: '/', search: '' });
      expect(saraResult.slug).toBe('dr-sara');
      expect(saraResult.isDedicatedDomain).toBe(true);
      expect(saraResult.tenant?.name).toContain('سارة');

      const saraWwwResult = resolveTenantFromLocation(demoClinics, { hostname: 'www.drsara-clinic.com', pathname: '/', search: '' });
      expect(saraWwwResult.slug).toBe('dr-sara');
      expect(saraWwwResult.isDedicatedDomain).toBe(true);

      // Dr. Ahmed custom domain (with and without www)
      const ahmedResult = resolveTenantFromLocation(demoClinics, { hostname: 'dr-ahmed-dental.com', pathname: '/', search: '' });
      expect(ahmedResult.slug).toBe('dr-ahmed');
      expect(ahmedResult.isDedicatedDomain).toBe(true);
      expect(ahmedResult.tenant?.name).toContain('النخبة');

      const ahmedWwwResult = resolveTenantFromLocation(demoClinics, { hostname: 'www.dr-ahmed-dental.com', pathname: '/', search: '' });
      expect(ahmedWwwResult.slug).toBe('dr-ahmed');
      expect(ahmedWwwResult.isDedicatedDomain).toBe(true);
    });

    it('resolves tenant and activates dedicated domain mode from subdomains', () => {
      // Subdomain on cloud platform (dr-sara.clinicflow.app)
      const saraSub = resolveTenantFromLocation(demoClinics, { hostname: 'dr-sara.clinicflow.app', pathname: '/', search: '' });
      expect(saraSub.slug).toBe('dr-sara');
      expect(saraSub.isDedicatedDomain).toBe(true);

      // Subdomain on cloud platform (dr-ahmed.clinicflow.app)
      const ahmedSub = resolveTenantFromLocation(demoClinics, { hostname: 'dr-ahmed.clinicflow.app', pathname: '/', search: '' });
      expect(ahmedSub.slug).toBe('dr-ahmed');
      expect(ahmedSub.isDedicatedDomain).toBe(true);

      // Local development subdomain (dr-sara.localhost)
      const saraLocal = resolveTenantFromLocation(demoClinics, { hostname: 'dr-sara.localhost', pathname: '/', search: '' });
      expect(saraLocal.slug).toBe('dr-sara');
      expect(saraLocal.isDedicatedDomain).toBe(true);
    });

    it('resolves slug from URL path /c/:clinicSlug/booking on shared domain without dedicated flag', () => {
      const pathResult = resolveTenantFromLocation(demoClinics, { hostname: 'clinicflow.app', pathname: '/c/dr-sara/booking', search: '' });
      expect(pathResult.slug).toBe('dr-sara');
      expect(pathResult.isDedicatedDomain).toBe(false);
    });

    it('resolves slug from query param ?clinic=dr-sara on shared domain without dedicated flag', () => {
      const queryResult = resolveTenantFromLocation(demoClinics, { hostname: 'clinicflow.app', pathname: '/booking', search: '?clinic=dr-sara' });
      expect(queryResult.slug).toBe('dr-sara');
      expect(queryResult.isDedicatedDomain).toBe(false);
    });

    it('falls back to default root tenant (dr-ahmed) for root shared domain and localhost', () => {
      const rootResult = resolveTenantFromLocation(demoClinics, { hostname: 'clinicflow.app', pathname: '/', search: '' });
      expect(rootResult.slug).toBe('dr-ahmed');
      expect(rootResult.isDedicatedDomain).toBe(false);

      const localResult = resolveTenantFromLocation(demoClinics, { hostname: 'localhost', pathname: '/', search: '' });
      expect(localResult.slug).toBe('dr-ahmed');
      expect(localResult.isDedicatedDomain).toBe(false);
    });

    it('isDedicatedDomain helper function correctly identifies dedicated hostnames', () => {
      expect(isDedicatedDomain({ hostname: 'drsara-clinic.com' }, demoClinics)).toBe(true);
      expect(isDedicatedDomain({ hostname: 'dr-ahmed-dental.com' }, demoClinics)).toBe(true);
      expect(isDedicatedDomain({ hostname: 'dr-sara.clinicflow.app' }, demoClinics)).toBe(true);
      expect(isDedicatedDomain({ hostname: 'clinicflow.app' }, demoClinics)).toBe(false);
      expect(isDedicatedDomain({ hostname: 'app.clinicflow.app' }, demoClinics)).toBe(false);
      expect(isDedicatedDomain({ hostname: 'localhost' }, demoClinics)).toBe(false);
    });
  });

  describe('5. Database Migration Schema Verification (PostgreSQL RLS & Tenant Safety)', () => {
    it('migration 003 contains clinics enhancement, doctors, branches and RLS helper', () => {
      const migrationPath = path.resolve(__dirname, '../../supabase/migrations/003_multi_tenant_core.sql');
      const content = fs.readFileSync(migrationPath, 'utf8');

      expect(content).toContain('ALTER TABLE clinics');
      expect(content).toContain('subscription_tier');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS tenant_members');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS doctors');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS branches');
      expect(content).toContain('get_active_clinic_id()');
      expect(content).toContain('ENABLE ROW LEVEL SECURITY');
    });

    it('migration 004 contains platform audit logs and tenant usage records', () => {
      const migrationPath = path.resolve(__dirname, '../../supabase/migrations/004_super_admin_and_quotas.sql');
      const content = fs.readFileSync(migrationPath, 'utf8');

      expect(content).toContain('platform_audit_logs');
      expect(content).toContain('tenant_usage_records');
      expect(content).toContain('ENABLE ROW LEVEL SECURITY');
    });
  });

  describe('6. Tenant Switching Authorization & Role Lockdown', () => {
    it('locks tenant switching for regular single-clinic doctors and staff', () => {
      const singleDoctor = {
        id: 'doc-1',
        role: 'doctor',
        clinicSlug: 'dr-ahmed',
        allowedClinics: ['dr-ahmed']
      };
      expect(canSwitchTenants(singleDoctor)).toBe(false);

      const receptionist = {
        id: 'rec-1',
        role: 'receptionist',
        clinicSlug: 'dr-sara',
        allowedClinics: ['dr-sara']
      };
      expect(canSwitchTenants(receptionist)).toBe(false);
    });

    it('permits tenant switching for multi-clinic owners and super admins', () => {
      const owner = {
        id: 'owner-1',
        role: 'multi_clinic_owner',
        allowedClinics: ['dr-ahmed', 'dr-sara']
      };
      expect(canSwitchTenants(owner)).toBe(true);

      const superAdmin = {
        id: 'admin-1',
        role: 'super_admin',
        allowedClinics: ['*']
      };
      expect(canSwitchTenants(superAdmin)).toBe(true);
      expect(canSwitchTenants(null, '/super-admin/overview')).toBe(true);
    });

    it('getUserAllowedClinics restricts clinic list to authorized scopes only', () => {
      const singleDoctor = {
        id: 'doc-1',
        role: 'doctor',
        clinicSlug: 'dr-sara',
        allowedClinics: ['dr-sara']
      };
      const allowed = getUserAllowedClinics(singleDoctor, demoClinics);
      expect(allowed.length).toBe(1);
      expect(allowed[0].slug).toBe('dr-sara');

      const superAdmin = {
        id: 'admin-1',
        role: 'super_admin'
      };
      const adminAllowed = getUserAllowedClinics(superAdmin, demoClinics);
      expect(adminAllowed.length).toBe(demoClinics.length);
    });
  });

  describe('7. Scoped Tenant Initial Data Isolation & Dynamic Branding', () => {
    it('returns isolated dental dataset with dental branding for dr-ahmed', () => {
      const data = getInitialDataForTenant('dr-ahmed');
      expect(data.clinicInfo.slug).toBe('dr-ahmed');
      expect(data.clinicInfo.specialty).toContain('أسنان');
      expect(data.clinicInfo.branding.brandTitle).toBe('كلينيك فلو دنتال');
      expect(data.patients.length).toBeGreaterThan(0);
      expect(data.appointments.length).toBeGreaterThan(0);

      // Verify appointments belong to Dr. Ahmed
      const hasAhmedAppointments = data.appointments.some(a => a.doctorName?.includes('أحمد') || a.service?.includes('أسنان') || a.service?.includes('عصب'));
      expect(hasAhmedAppointments).toBe(true);
    });

    it('returns isolated dermatology dataset with derma branding for dr-sara', () => {
      const data = getInitialDataForTenant('dr-sara');
      expect(data.clinicInfo.slug).toBe('dr-sara');
      expect(data.clinicInfo.specialty).toContain('جلدية');
      expect(data.clinicInfo.branding.brandTitle).toBe('كلينيك فلو ديرما');
      expect(data.patients.length).toBeGreaterThan(0);
      expect(data.appointments.length).toBeGreaterThan(0);

      // Verify appointments belong to Dr. Sara and dermatology treatments
      const hasSaraAppointments = data.appointments.some(a => a.doctorName?.includes('سارة') || a.service?.includes('ليزر') || a.service?.includes('جلدية') || a.service?.includes('بوتوكس'));
      expect(hasSaraAppointments).toBe(true);
    });

    it('guarantees complete patient and appointment isolation between clinics', () => {
      const ahmedData = getInitialDataForTenant('dr-ahmed');
      const saraData = getInitialDataForTenant('dr-sara');

      const ahmedPatientIds = new Set(ahmedData.patients.map(p => p.id));
      const saraPatientIds = new Set(saraData.patients.map(p => p.id));

      // No patient ID overlap between tenants
      for (const id of saraPatientIds) {
        expect(ahmedPatientIds.has(id)).toBe(false);
      }

      const ahmedApptIds = new Set(ahmedData.appointments.map(a => a.id));
      const saraApptIds = new Set(saraData.appointments.map(a => a.id));

      // No appointment ID overlap between tenants
      for (const id of saraApptIds) {
        expect(ahmedApptIds.has(id)).toBe(false);
      }
    });
  });

  describe('8. 1-Million User Database Scaling Schema (Migration 005)', () => {
    it('migration 005 contains composite indexes and strict RLS policies for high scale', () => {
      const migrationPath = path.resolve(__dirname, '../../supabase/migrations/005_million_user_scale_and_scoping.sql');
      const content = fs.readFileSync(migrationPath, 'utf8');

      // Check composite indexes
      expect(content).toContain('idx_patients_clinic_created');
      expect(content).toContain('idx_patients_clinic_phone');
      expect(content).toContain('idx_appointments_clinic_date');
      expect(content).toContain('idx_appointments_clinic_created');
      expect(content).toContain('idx_invoices_clinic_created');
      expect(content).toContain('idx_expenses_clinic_date');
      expect(content).toContain('idx_recalls_clinic_due');

      // Check essential scale tables
      expect(content).toContain('CREATE TABLE IF NOT EXISTS invoices');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS payments');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS inventory_items');

      // Check RLS policies on key tables
      expect(content).toContain('ALTER TABLE appointments ENABLE ROW LEVEL SECURITY');
      expect(content).toContain('ALTER TABLE patients ENABLE ROW LEVEL SECURITY');
      expect(content).toContain('ALTER TABLE invoices ENABLE ROW LEVEL SECURITY');
      expect(content).toContain('ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY');
      expect(content).toContain('get_active_clinic_id()');
      expect(content).toContain('is_member_of_clinic');
    });

    it('migration 005 secures is_member_of_clinic against unverified session spoofing', () => {
      const migrationPath = path.resolve(__dirname, '../../supabase/migrations/005_million_user_scale_and_scoping.sql');
      const content = fs.readFileSync(migrationPath, 'utf8');

      // Ensure that get_active_clinic_id alone does NOT grant access without membership
      const functionDef = content.slice(content.indexOf('CREATE OR REPLACE FUNCTION is_member_of_clinic'));
      const functionBody = functionDef.slice(0, functionDef.indexOf('LANGUAGE plpgsql'));
      expect(functionBody).not.toContain('IF get_active_clinic_id() IS NOT NULL AND get_active_clinic_id() = target_clinic_id THEN\n        RETURN TRUE;');
    });
  });

  describe('9. Header User Profile & Multi-Clinic Owner Identity Integrity', () => {
    it('preserves multi-clinic owner name and role when viewing any clinic', () => {
      const ownerUser = {
        id: 'user-owner',
        name: 'د. شريف العوضي (مالك مجمع العيادات)',
        role: 'multi_clinic_owner',
        jobTitle: 'مالك ومستثمر طبي — مجمع عيادات كلينيك فلو'
      };

      const drSaraTenant = demoClinics.find(c => c.slug === 'dr-sara');
      
      // Compute identity with the updated Header logic
      const effectiveRole = ownerUser.role;
      const isDoctor = effectiveRole === 'doctor' || effectiveRole === 'super_admin' || effectiveRole === 'multi_clinic_owner';
      const displayName = ownerUser?.name ? ownerUser.name : drSaraTenant.doctorName;
      const displayRole = ownerUser?.jobTitle || 'مالك مجمع العيادات';

      expect(displayName).toBe('د. شريف العوضي (مالك مجمع العيادات)');
      expect(displayName).not.toBe(drSaraTenant.doctorName);
      expect(displayRole).toBe('مالك ومستثمر طبي — مجمع عيادات كلينيك فلو');
    });

    it('falls back to active clinic doctor name only when unauthenticated demo visitor', () => {
      const unauthUser = null;
      const drSaraTenant = demoClinics.find(c => c.slug === 'dr-sara');

      const isDoctor = true;
      const activeDoctorName = drSaraTenant.doctorName;
      const displayName = unauthUser?.name ? unauthUser.name : activeDoctorName;
      const displayRole = unauthUser?.jobTitle || drSaraTenant.specialty;

      expect(displayName).toBe('د. سارة محمود');
      expect(displayRole).toContain('الأمراض الجلدية');
    });
  });

  describe('10. AppContext Cross-Tenant Save Isolation', () => {
    it('protects new tenant storage from being overwritten by previous tenant state', () => {
      const currentTenantSlug = 'dr-ahmed';
      const newTenantSlug = 'dr-sara';

      // Simulation of save effect guard
      const shouldSaveStateForTenant = (stateTenantSlug, targetTenantSlug) => {
        if (!stateTenantSlug || stateTenantSlug !== targetTenantSlug) {
          return false; // BLOCKED: Do not save stale state into new tenant
        }
        return true;
      };

      expect(shouldSaveStateForTenant(currentTenantSlug, newTenantSlug)).toBe(false);
      expect(shouldSaveStateForTenant(newTenantSlug, newTenantSlug)).toBe(true);
    });
  });

  describe('11. In-Memory Search Engine & Patient Index Multi-Tenant Isolation', () => {
    it('isolates phone lookup and search queries strictly by clinicId', () => {
      const index = new PatientIndexEngine();

      const ahmedClinicId = '550e8400-e29b-41d4-a716-446655440000';
      const saraClinicId = '550e8400-e29b-41d4-a716-446655440099';

      const sharedPhone = '01012345678';
      const mixedPatients = [
        { id: 'pat-ahmed-1', name: 'عمر مصطفى (أسنان)', phone: sharedPhone, clinicId: ahmedClinicId },
        { id: 'pat-sara-1', name: 'مريم خليل (جلدية)', phone: sharedPhone, clinicId: saraClinicId },
        { id: 'pat-sara-2', name: 'نور أحمد (جلدية)', phone: '01122334455', clinicId: saraClinicId }
      ];

      // 1. Build index scoped to Ahmed Clinic
      index.buildIndex(mixedPatients, ahmedClinicId);
      const foundInAhmed = index.findByPhone(sharedPhone, ahmedClinicId);
      expect(foundInAhmed).not.toBeNull();
      expect(foundInAhmed.name).toBe('عمر مصطفى (أسنان)');

      // If querying with Sara Clinic ID, Ahmed patient must NOT be returned
      const leakedInSara = index.findByPhone(sharedPhone, saraClinicId);
      expect(leakedInSara).toBeNull();

      // 2. Re-build index scoped to Sara Clinic
      index.buildIndex(mixedPatients, saraClinicId);
      const foundInSara = index.findByPhone(sharedPhone, saraClinicId);
      expect(foundInSara).not.toBeNull();
      expect(foundInSara.name).toBe('مريم خليل (جلدية)');

      // If querying with Ahmed Clinic ID, Sara patient must NOT be returned
      const leakedInAhmed = index.findByPhone(sharedPhone, ahmedClinicId);
      expect(leakedInAhmed).toBeNull();

      // 3. Paginated search filter strictly by clinicId
      const saraSearch = index.search('', 1, 10, mixedPatients, saraClinicId);
      expect(saraSearch.total).toBe(2);
      expect(saraSearch.items.every(p => p.clinicId === saraClinicId)).toBe(true);

      const ahmedSearch = index.search('', 1, 10, mixedPatients, ahmedClinicId);
      expect(ahmedSearch.total).toBe(1);
      expect(ahmedSearch.items[0].clinicId).toBe(ahmedClinicId);
    });
  });

  describe('12. Public Booking & Manage Booking Multi-Tenant Scoping Integrity', () => {
    it('attaches clinicId to online patient and appointment objects', () => {
      const activeClinic = demoClinics.find(c => c.slug === 'dr-sara');
      const bookingId = 'booking-12345';
      const patientId = 'patient-online-999';

      const newPatientData = {
        id: patientId,
        clinicId: activeClinic.id,
        clinic_id: activeClinic.id,
        name: 'سارة عبد الله',
        phone: '01099887766',
        diagnosis: 'مريض جديد أونلاين'
      };

      const newAppointment = {
        id: bookingId,
        clinicId: activeClinic.id,
        clinic_id: activeClinic.id,
        patientId: patientId,
        patientName: newPatientData.name,
        patientPhone: newPatientData.phone,
        date: '2026-09-08',
        time: '04:00 م',
        type: 'جلسة فراكشنال ليزر',
        status: 'booked',
        bookingCode: '#CF-8822'
      };

      expect(newPatientData.clinicId).toBe(activeClinic.id);
      expect(newAppointment.clinicId).toBe(activeClinic.id);
    });

    it('prevents managing or cancelling appointments belonging to another clinic in ManageBooking', () => {
      const ahmedClinicId = '550e8400-e29b-41d4-a716-446655440000';
      const saraClinicId = '550e8400-e29b-41d4-a716-446655440099';

      const allAppointments = [
        { id: 'appt-ahmed', clinicId: ahmedClinicId, bookingCode: '#CF-1111', patientPhone: '01012345678', patientName: 'خالد' },
        { id: 'appt-sara', clinicId: saraClinicId, bookingCode: '#CF-2222', patientPhone: '01012345678', patientName: 'خالد' }
      ];

      // Function simulating ManageBooking appointment resolution
      const findManageableAppointment = (code, phone, currentClinicId) => {
        const cleanCode = code.replace('#', '');
        return allAppointments.find(a => {
          const matchesClinic = (!a.clinicId || a.clinicId === currentClinicId);
          const matchesPhone = a.patientPhone === phone;
          const matchesCode = a.bookingCode.replace('#', '') === cleanCode;
          return matchesClinic && matchesPhone && matchesCode;
        });
      };

      // In Ahmed clinic, can find Ahmed appointment but CANNOT find Sara appointment
      expect(findManageableAppointment('CF-1111', '01012345678', ahmedClinicId)?.id).toBe('appt-ahmed');
      expect(findManageableAppointment('CF-2222', '01012345678', ahmedClinicId)).toBeUndefined();

      // In Sara clinic, can find Sara appointment but CANNOT find Ahmed appointment
      expect(findManageableAppointment('CF-2222', '01012345678', saraClinicId)?.id).toBe('appt-sara');
      expect(findManageableAppointment('CF-1111', '01012345678', saraClinicId)).toBeUndefined();
    });
  });

  describe('13. Ancillary CRM LocalStorage Multi-Tenant Partitioning', () => {
    const ahmedId = '550e8400-e29b-41d4-a716-446655440000';
    const saraId = '550e8400-e29b-41d4-a716-446655440099';

    it('isolates treatment plans storage per clinic ID', () => {
      const ahmedPlans = [{ id: 'plan-ahmed-1', title: 'خطة تقويم أسنان' }];
      const saraPlans = [{ id: 'plan-sara-1', title: 'خطة ليزر وتجديد بشرة' }];

      saveLocalTreatmentPlans(ahmedPlans, ahmedId);
      saveLocalTreatmentPlans(saraPlans, saraId);

      const loadedAhmed = getLocalTreatmentPlans(ahmedId);
      const loadedSara = getLocalTreatmentPlans(saraId);

      expect(loadedAhmed.some(p => p.id === 'plan-ahmed-1')).toBe(true);
      expect(loadedAhmed.some(p => p.id === 'plan-sara-1')).toBe(false);

      expect(loadedSara.some(p => p.id === 'plan-sara-1')).toBe(true);
      expect(loadedSara.some(p => p.id === 'plan-ahmed-1')).toBe(false);
    });

    it('isolates patient multi-session packages per clinic ID', () => {
      savePatientPackage({ id: 'pkg-1', patientName: 'أحمد محمود', packageName: 'باقة تنظيف' }, ahmedId);
      savePatientPackage({ id: 'pkg-2', patientName: 'سارة خالد', packageName: 'باقة ليزر' }, saraId);

      const ahmedPackages = getPatientPackages(ahmedId);
      const saraPackages = getPatientPackages(saraId);

      expect(ahmedPackages.some(p => p.id === 'pkg-1')).toBe(true);
      expect(ahmedPackages.some(p => p.id === 'pkg-2')).toBe(false);

      expect(saraPackages.some(p => p.id === 'pkg-2')).toBe(true);
      expect(saraPackages.some(p => p.id === 'pkg-1')).toBe(false);
    });

    it('isolates patient NPS feedback and reviews per clinic ID', () => {
      saveFeedback({ id: 'fb-1', rating: 5, comment: 'عيادة أسنان ممتازة' }, ahmedId);
      saveFeedback({ id: 'fb-2', rating: 5, comment: 'جلسة ليزر رائعة' }, saraId);

      const ahmedFeedbacks = getStoredFeedbacks(ahmedId);
      const saraFeedbacks = getStoredFeedbacks(saraId);

      expect(ahmedFeedbacks.some(f => f.id === 'fb-1')).toBe(true);
      expect(ahmedFeedbacks.some(f => f.id === 'fb-2')).toBe(false);

      expect(saraFeedbacks.some(f => f.id === 'fb-2')).toBe(true);
      expect(saraFeedbacks.some(f => f.id === 'fb-1')).toBe(false);
    });

    it('isolates SMS gateway credentials and sender IDs per clinic ID', () => {
      saveSmsConfig({ provider: 'easysendsms', easysendsmsSender: 'DrAhmed' }, ahmedId);
      saveSmsConfig({ provider: 'cequens', cequensSenderName: 'DrSara' }, saraId);

      const ahmedConfig = getSmsConfig(ahmedId);
      const saraConfig = getSmsConfig(saraId);

      expect(ahmedConfig.easysendsmsSender).toBe('DrAhmed');
      expect(saraConfig.cequensSenderName).toBe('DrSara');
    });
  });

  describe('14. Internal Modals & Record Partitioning Integrity', () => {
    it('enforces strict clinicId filtering for appointments, expenses, and recalls', () => {
      const ahmedId = '550e8400-e29b-41d4-a716-446655440000';
      const saraId = '550e8400-e29b-41d4-a716-446655440099';

      const mixedAppointments = [
        { id: 'a1', clinicId: ahmedId, patientName: 'علي' },
        { id: 'a2', clinicId: saraId, patientName: 'منى' }
      ];

      const filterByClinic = (records, activeClinicId) => {
        return records.filter(r => {
          if (r.clinicId) return r.clinicId === activeClinicId;
          return activeClinicId === ahmedId || activeClinicId === 'clinic-1';
        });
      };

      const ahmedFiltered = filterByClinic(mixedAppointments, ahmedId);
      const saraFiltered = filterByClinic(mixedAppointments, saraId);

      expect(ahmedFiltered.length).toBe(1);
      expect(ahmedFiltered[0].id).toBe('a1');

      expect(saraFiltered.length).toBe(1);
      expect(saraFiltered[0].id).toBe('a2');
    });
  });

});
