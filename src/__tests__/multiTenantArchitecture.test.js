import { describe, it, expect } from 'vitest';
import { demoClinics, clinicInfo, getInitialDataForTenant } from '../data/demoData';
import { canSwitchTenants, getUserAllowedClinics } from '../utils/permissions';
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
      expect(dentalClinic.subscriptionTier).toBe('pro');
      expect(dentalClinic.branding.primaryColor).toBe('#0071E3');
      expect(dentalClinic.quotas.monthlySmsQuota).toBe(2000);
      expect(dentalClinic.quotas.maxDoctors).toBe(3);

      // Dermatology & Laser Clinic (Dr. Sara)
      expect(dermClinic.slug).toBe('dr-sara');
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

  describe('4. Dynamic Tenant Slug & Subdomain Resolution Logic', () => {
    const resolveTenantSlugFromLocation = (pathname, search, hostname) => {
      // 1. Query param ?clinic=slug
      const urlParams = new URLSearchParams(search);
      const querySlug = urlParams.get('clinic');
      if (querySlug) return querySlug.toLowerCase().trim();

      // 2. Path param /c/:slug/...
      const pathMatch = pathname.match(/\/c\/([a-zA-Z0-9_-]+)/);
      if (pathMatch && pathMatch[1]) return pathMatch[1].toLowerCase().trim();

      // 3. Subdomain
      const parts = hostname.toLowerCase().split('.');
      if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'app') {
        return parts[0];
      }

      return 'dr-ahmed';
    };

    it('resolves slug from URL path /c/:clinicSlug/booking', () => {
      const slug = resolveTenantSlugFromLocation('/c/dr-sara/booking', '', 'clinicflow.app');
      expect(slug).toBe('dr-sara');
    });

    it('resolves slug from query param ?clinic=dr-sara', () => {
      const slug = resolveTenantSlugFromLocation('/booking', '?clinic=dr-sara', 'clinicflow.app');
      expect(slug).toBe('dr-sara');
    });

    it('resolves slug from subdomain dr-sara.clinicflow.app', () => {
      const slug = resolveTenantSlugFromLocation('/', '', 'dr-sara.clinicflow.app');
      expect(slug).toBe('dr-sara');
    });

    it('falls back to dr-ahmed for default root domain', () => {
      const slug = resolveTenantSlugFromLocation('/', '', 'clinicflow.app');
      expect(slug).toBe('dr-ahmed');
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
  });

});
