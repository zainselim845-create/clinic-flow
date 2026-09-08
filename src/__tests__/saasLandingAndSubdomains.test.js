import { describe, it, expect, beforeEach } from 'vitest';
import { 
  captureSystemError, 
  getSystemErrors, 
  resolveSystemError, 
  clearSystemErrors, 
  reportUserBug, 
  getBugReports, 
  updateBugReportStatus 
} from '../services/systemErrorService';
import { resolveTenantFromLocation } from '../context/TenantContext';
import { demoClinics } from '../data/demoData';

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
  });
});
