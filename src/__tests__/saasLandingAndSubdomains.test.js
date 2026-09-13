import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  captureSystemError, 
  getSystemErrors, 
  resolveSystemError, 
  clearSystemErrors, 
  reportUserBug, 
  getBugReports, 
  updateBugReportStatus 
} from '../services/systemErrorService';
import { resolveTenantFromLocation, getCombinedTenants } from '../context/TenantContext';
import { 
  DEFAULT_CNAME_TARGET, 
  DEFAULT_A_TARGET, 
  VERCEL_CNAME_TARGET,
  VERCEL_DIRECT_TARGET,
  DOMAIN_STATUS,
  getRequiredDnsRecords,
  verifyDomainDnsAndSsl,
  saveClinicDomainSettings,
  getClinicDomainSettings,
  generateVerificationToken
} from '../services/customDomainService';
import { demoClinics } from '../data/demoData';
import { matchesSpecialtyFilter } from '../utils/specialtyUtils';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

globalThis.localStorage = createStorageMock();
globalThis.sessionStorage = createStorageMock();

describe('Enterprise SaaS Multi-Tenant & Telemetry Pipeline Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearSystemErrors();
  });

  describe('1. Central System Error & Diagnostic Telemetry Pipeline', () => {
    it('captures runtime exceptions with context, stack, and clinic scoping', () => {
      const error = captureSystemError({
        type: 'runtime_exception',
        message: 'Cannot read properties of undefined (reading calculateTax)',
        stack: 'TypeError: Cannot read properties\n  at Invoices.jsx:45:12',
        severity: 'critical',
        clinicId: 'clinic-derma-2',
        path: '/invoices'
      });

      expect(error.id).toBeDefined();
      expect(error.type).toBe('runtime_exception');
      expect(error.status).toBe('unresolved');
      expect(error.clinicId).toBe('clinic-derma-2');
      expect(error.severity).toBe('critical');

      const allErrors = getSystemErrors();
      expect(allErrors.length).toBe(1);
      expect(allErrors[0].id).toBe(error.id);
    });

    it('allows marking system errors as resolved', () => {
      const err = captureSystemError({
        type: 'unhandled_promise_rejection',
        message: 'Network request failed: Supabase unreachable',
        severity: 'high'
      });

      expect(getSystemErrors()[0].status).toBe('unresolved');

      const updated = resolveSystemError(err.id);
      expect(updated[0].status).toBe('resolved');
      expect(updated[0].resolvedAt).toBeDefined();
    });

    it('submits and manages doctor/user bug reports across clinics', () => {
      const bug = reportUserBug({
        title: 'تعطل في طباعة الفاتورة',
        description: 'عند النقر على زر طباعة الفاتورة الضريبية لا تظهر نافذة الطباعة',
        category: 'bug',
        clinicId: 'dr-sara',
        clinicName: 'عيادة د. سارة للجلدية',
        doctorEmail: 'drsara@clinic.com',
        path: '/invoices'
      });

      expect(bug.id).toBeDefined();
      expect(bug.title).toBe('تعطل في طباعة الفاتورة');
      expect(bug.status).toBe('open');

      const allBugs = getBugReports();
      expect(allBugs.length).toBe(1);

      const resolvedBugs = updateBugReportStatus(bug.id, 'resolved');
      expect(resolvedBugs[0].status).toBe('resolved');
    });
  });

  describe('2. Subdomain & Custom Domain Routing Architecture', () => {
    it('locks to dedicated domain mode when visiting custom domain (e.g. dr-sara-clinic.com)', () => {
      const mockTenants = [
        ...demoClinics,
        {
          id: 'custom-tenant-99',
          name: 'عيادة د. حازم للعيون',
          doctorName: 'د. حازم النجار',
          slug: 'dr-hazem',
          customDomain: 'drhazem-eyes.com',
          specialty: 'طب وجراحة العيون'
        }
      ];

      const res = resolveTenantFromLocation(mockTenants, {
        hostname: 'drhazem-eyes.com',
        pathname: '/booking',
        search: ''
      });

      expect(res.slug).toBe('dr-hazem');
      expect(res.isDedicatedDomain).toBe(true);
      expect(res.tenant?.name).toBe('عيادة د. حازم للعيون');
    });

    it('locks to dedicated domain mode when visiting a tenant subdomain (e.g. dr-sara.clinicflow.app)', () => {
      const res = resolveTenantFromLocation(demoClinics, {
        hostname: 'dr-sara.clinicflow.app',
        pathname: '/booking',
        search: ''
      });

      expect(res.slug).toBe('dr-sara');
      expect(res.isDedicatedDomain).toBe(true);
    });

    it('resolves tenant cleanly from path /c/:clinicSlug/booking on shared domain', () => {
      const res = resolveTenantFromLocation(demoClinics, {
        hostname: 'clinicflow.app',
        pathname: '/c/dr-sara/booking',
        search: ''
      });

      expect(res.slug).toBe('dr-sara');
      expect(res.isDedicatedDomain).toBe(false);
    });

    it('treats platform deployment domain (e.g. clinic-flow-lh3g.vercel.app) as shared platform, NOT dedicated domain', () => {
      const res = resolveTenantFromLocation(demoClinics, {
        hostname: 'clinic-flow-lh3g.vercel.app',
        pathname: '/booking',
        search: ''
      });

      expect(res.isDedicatedDomain).toBe(false);
    });

    it('resolves dedicated clinic from 4-segment subdomain on platform (e.g. dr-sara.clinic-flow-lh3g.vercel.app)', () => {
      const res = resolveTenantFromLocation(demoClinics, {
        hostname: 'dr-sara.clinic-flow-lh3g.vercel.app',
        pathname: '/booking',
        search: ''
      });

      expect(res.slug).toBe('dr-sara');
      expect(res.isDedicatedDomain).toBe(true);
      expect(res.tenant?.slug).toBe('dr-sara');
    });

    it('correctly resolves /c/:slug on deployment domain without dedicated lock', () => {
      const res = resolveTenantFromLocation(demoClinics, {
        hostname: 'clinic-flow-lh3g.vercel.app',
        pathname: '/c/dr-sara/booking',
        search: ''
      });

      expect(res.slug).toBe('dr-sara');
      expect(res.isDedicatedDomain).toBe(false);
      expect(res.tenant?.slug).toBe('dr-sara');
    });
  });

  describe('3. Public Clinic Discovery & Search Filtering Logic', () => {
    it('filters active clinics by search query (doctor name, specialty, or address)', () => {
      const clinics = [
        { id: '1', name: 'مركز الأمل للأسنان', doctorName: 'د. يوسف الشافعي', specialty: 'طب وجراحة الأسنان', address: 'مدينة نصر' },
        { id: '2', name: 'عيادة النور للجلدية', doctorName: 'د. منى زكي', specialty: 'الأمراض الجلدية والتجميل', address: 'المعادي' },
        { id: '3', name: 'مجمع العظام الدولي', doctorName: 'د. خالد سليم', specialty: 'جراحة العظام والمفاصل', address: 'مصر الجديدة' }
      ];

      const searchKeyword = 'جلدية';
      const results = clinics.filter(c => 
        c.name.includes(searchKeyword) || 
        c.doctorName.includes(searchKeyword) || 
        c.specialty.includes(searchKeyword)
      );

      expect(results.length).toBe(1);
      expect(results[0].doctorName).toBe('د. منى زكي');
    });

    it('matches Dr. Sara dermatology clinic when selecting "الأمراض الجلدية والتجميل" pill', () => {
      const saraSpecialty = 'استشاري الأمراض الجلدية وتجميل الليزر والحقن التجميلي';
      expect(matchesSpecialtyFilter(saraSpecialty, 'الأمراض الجلدية والتجميل')).toBe(true);
      expect(matchesSpecialtyFilter(saraSpecialty, 'طب وجراحة الأسنان')).toBe(false);
      expect(matchesSpecialtyFilter(saraSpecialty, 'الكل')).toBe(true);
    });

    it('matches Dr. Ahmed dental clinic when selecting "طب وجراحة الأسنان" pill', () => {
      const ahmedSpecialty = 'طب وجراحة الفم والأسنان وتجميل الابتسامة';
      expect(matchesSpecialtyFilter(ahmedSpecialty, 'طب وجراحة الأسنان')).toBe(true);
      expect(matchesSpecialtyFilter(ahmedSpecialty, 'الأمراض الجلدية والتجميل')).toBe(false);
      expect(matchesSpecialtyFilter(ahmedSpecialty, 'الكل')).toBe(true);
    });
  });

  describe('4. Production Custom Domain & Dedicated Routing Engine', () => {
    it('exports production-ready Vercel and Cloudflare DNS targets', () => {
      expect(DEFAULT_CNAME_TARGET).toBe('cname.vercel-dns.com');
      expect(VERCEL_CNAME_TARGET).toBe('cname.vercel-dns.com');
      expect(VERCEL_DIRECT_TARGET).toBe('clinic-flow-lh3g.vercel.app');
      expect(DEFAULT_A_TARGET).toBe('76.76.21.21');
    });

    it('generates accurate DNS records for apex domain (e.g. dr-sara.com)', () => {
      const records = getRequiredDnsRecords('dr-sara.com', 'clinic-123');
      expect(records.length).toBe(3);

      const aRecord = records.find(r => r.type === 'A');
      expect(aRecord).toBeDefined();
      expect(aRecord.name).toBe('@');
      expect(aRecord.value).toBe('76.76.21.21');

      const cnameRecord = records.find(r => r.type === 'CNAME');
      expect(cnameRecord).toBeDefined();
      expect(cnameRecord.name).toBe('www');
      expect(cnameRecord.value).toBe('cname.vercel-dns.com');

      const txtRecord = records.find(r => r.type === 'TXT');
      expect(txtRecord).toBeDefined();
      expect(txtRecord.name).toBe('_clinicflow-challenge');
      expect(txtRecord.value).toMatch(/^clinicflow-verify-/);
    });

    it('generates accurate DNS records for subdomain (e.g. booking.dr-sara.com)', () => {
      const records = getRequiredDnsRecords('booking.dr-sara.com', 'clinic-123');
      expect(records.length).toBe(2);

      const cnameRecord = records.find(r => r.type === 'CNAME');
      expect(cnameRecord).toBeDefined();
      expect(cnameRecord.name).toBe('booking');
      expect(cnameRecord.value).toBe('cname.vercel-dns.com');

      const txtRecord = records.find(r => r.type === 'TXT');
      expect(txtRecord).toBeDefined();
      expect(txtRecord.name).toBe('_clinicflow-challenge.booking');
      expect(txtRecord.value).toMatch(/^clinicflow-verify-/);
    });

    it('instantly verifies pre-configured demo domains (dr-ahmed-dental.com)', async () => {
      const res = await verifyDomainDnsAndSsl('dr-ahmed-dental.com', 'clinic-1');
      expect(res.isValid).toBe(true);
      expect(res.dnsConfigured).toBe(true);
      expect(res.sslStatus).toBe(DOMAIN_STATUS.ACTIVE);
      expect(res.sslIssuer).toContain('TLS 1.3');
    });

    it('verifies custom domain pointing to Vercel CNAME target (cname.vercel-dns.com)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [{ name: 'booking.mydoctor.com.', type: 5, data: 'cname.vercel-dns.com.' }]
        })
      });

      const res = await verifyDomainDnsAndSsl('booking.mydoctor.com', 'clinic-1', mockFetch);
      expect(res.isValid).toBe(true);
      expect(res.dnsConfigured).toBe(true);
      expect(res.sslStatus).toBe(DOMAIN_STATUS.ACTIVE);
    });

    it('verifies custom domain pointing to direct Vercel deployment (clinic-flow-lh3g.vercel.app)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [{ name: 'booking.mydoctor.com.', type: 5, data: 'clinic-flow-lh3g.vercel.app.' }]
        })
      });

      const res = await verifyDomainDnsAndSsl('booking.mydoctor.com', 'clinic-1', mockFetch);
      expect(res.isValid).toBe(true);
      expect(res.dnsConfigured).toBe(true);
      expect(res.sslStatus).toBe(DOMAIN_STATUS.ACTIVE);
    });

    it('verifies apex domain pointing to Vercel Anycast A Record (76.76.21.21)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [{ name: 'mydoctor.com.', type: 1, data: '76.76.21.21' }]
        })
      });

      const res = await verifyDomainDnsAndSsl('mydoctor.com', 'clinic-1', mockFetch);
      expect(res.isValid).toBe(true);
      expect(res.dnsConfigured).toBe(true);
      expect(res.sslStatus).toBe(DOMAIN_STATUS.ACTIVE);
    });

    it('verifies domain routed through Cloudflare Proxy (104.21.x.x / 172.67.x.x)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [
            { name: 'mydoctor.com.', type: 1, data: '104.21.44.120' },
            { name: 'mydoctor.com.', type: 1, data: '172.67.180.22' }
          ]
        })
      });

      const res = await verifyDomainDnsAndSsl('mydoctor.com', 'clinic-1', mockFetch);
      expect(res.isValid).toBe(true);
      expect(res.dnsConfigured).toBe(true);
      expect(res.sslStatus).toBe(DOMAIN_STATUS.ACTIVE);
    });

    it('supports Cloudflare CNAME flattening by falling back to A-record lookup', async () => {
      const mockFetch = vi.fn().mockImplementation((url) => {
        if (url.includes('type=CNAME')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ Status: 0, Answer: [] })
          });
        }
        if (url.includes('type=A')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              Status: 0,
              Answer: [{ name: 'booking.flattened.com.', type: 1, data: '76.76.21.21' }]
            })
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ Status: 0, Answer: [] }) });
      });

      const res = await verifyDomainDnsAndSsl('booking.flattened.com', 'clinic-1', mockFetch);
      expect(res.isValid).toBe(true);
      expect(res.dnsConfigured).toBe(true);
      expect(res.sslStatus).toBe(DOMAIN_STATUS.ACTIVE);
    });

    it('verifies domain via TXT verification token challenge', async () => {
      const clinicId = 'clinic-challenge-xyz';
      const domain = 'dr-challenge.com';
      const expectedToken = generateVerificationToken(clinicId, domain);

      const mockFetch = vi.fn().mockImplementation((url) => {
        if (url.includes('type=TXT')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              Status: 0,
              Answer: [{ name: `_clinicflow-challenge.${domain}.`, type: 16, data: `"${expectedToken}"` }]
            })
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ Status: 0, Answer: [] }) });
      });

      const res = await verifyDomainDnsAndSsl(domain, clinicId, mockFetch);
      expect(res.isValid).toBe(true);
      expect(res.dnsConfigured).toBe(true);
      expect(res.sslStatus).toBe(DOMAIN_STATUS.ACTIVE);
    });

    it('persists clinic domain settings and merges them into getCombinedTenants', () => {
      const testClinicId = '550e8400-e29b-41d4-a716-446655440000';
      saveClinicDomainSettings(testClinicId, {
        domain: 'custom-ahmed-smile.com',
        sslStatus: DOMAIN_STATUS.ACTIVE,
        verifiedAt: new Date().toISOString()
      });

      const loaded = getClinicDomainSettings(testClinicId);
      expect(loaded).toBeDefined();
      expect(loaded.domain).toBe('custom-ahmed-smile.com');

      const combined = getCombinedTenants();
      const ahmedTenant = combined.find(t => t.id === testClinicId);
      expect(ahmedTenant).toBeDefined();
      expect(ahmedTenant.customDomain).toBe('custom-ahmed-smile.com');
    });

    it('resolves dedicated domain mode for newly configured custom domain', () => {
      const testClinicId = '550e8400-e29b-41d4-a716-446655440000';
      saveClinicDomainSettings(testClinicId, {
        domain: 'ahmed-smile-hub.com',
        sslStatus: DOMAIN_STATUS.ACTIVE,
        verifiedAt: new Date().toISOString()
      });

      const combined = getCombinedTenants();
      const resolved = resolveTenantFromLocation(combined, {
        hostname: 'ahmed-smile-hub.com',
        pathname: '/',
        search: ''
      });

      expect(resolved.isDedicatedDomain).toBe(true);
      expect(resolved.slug).toBe('dr-ahmed');
      expect(resolved.tenant?.doctorName).toContain('أحمد');
      expect(resolved.tenant?.name).toContain('الأسنان');
    });
  });
});
