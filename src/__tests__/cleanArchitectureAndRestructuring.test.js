import { describe, it, expect } from 'vitest';
import * as Features from '../features';
import * as Domains from '../domains';
import { ENV_CONFIG, validateEnvironment } from '../config';
import * as SharedUI from '../components/ui';
import { createSuccessResult, createFailureResult } from '../lib/apiResult';

describe('Clean Architecture, Modular Restructuring & Domain Quality Gate', () => {
  describe('1. Feature-Based Organization & Domain Boundaries', () => {
    it('exports all 9 core feature slices from src/features', () => {
      expect(Features.AuthFeature).toBeDefined();
      expect(Features.AppointmentsFeature).toBeDefined();
      expect(Features.PatientsFeature).toBeDefined();
      expect(Features.BillingFeature).toBeDefined();
      expect(Features.ClinicalFeature).toBeDefined();
      expect(Features.InventoryFeature).toBeDefined();
      expect(Features.MarketingFeature).toBeDefined();
      expect(Features.PlatformFeature).toBeDefined();
      expect(Features.EgyptNationalFeature).toBeDefined();
    });

    it('re-exports domain contexts seamlessly from src/domains for backward compatibility', () => {
      expect(Domains.IdentityDomain).toBeDefined();
      expect(Domains.ClinicalDomain).toBeDefined();
      expect(Domains.BillingDomain).toBeDefined();
      expect(Domains.SchedulingDomain).toBeDefined();
      expect(Domains.PatientsDomain).toBeDefined();
      expect(Domains.PlatformDomain).toBeDefined();
      expect(Domains.MarketingDomain).toBeDefined();
      expect(Domains.NationalEgyptDomain).toBeDefined();
    });
  });

  describe('2. Centralized Environment & Configuration Layer', () => {
    it('provides an immutable frozen ENV_CONFIG object with complete service trees', () => {
      expect(Object.isFrozen(ENV_CONFIG)).toBe(true);
      expect(ENV_CONFIG.appName).toBe('ClinicFlow');
      expect(ENV_CONFIG.supabase).toBeDefined();
      expect(ENV_CONFIG.googleAuth).toBeDefined();
      expect(ENV_CONFIG.ai).toBeDefined();
      expect(ENV_CONFIG.sms).toBeDefined();
    });

    it('validates environment without throwing unhandled exceptions', () => {
      expect(typeof validateEnvironment).toBe('function');
      const result = validateEnvironment();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('3. Shared UI System Primitives (src/components/ui)', () => {
    it('exports complete set of normalized design system components', () => {
      expect(SharedUI.Button).toBeDefined();
      expect(SharedUI.Input).toBeDefined();
      expect(SharedUI.Dialog).toBeDefined();
      expect(SharedUI.Tabs).toBeDefined();
      expect(SharedUI.Card).toBeDefined();
      expect(SharedUI.Badge).toBeDefined();
      expect(SharedUI.Avatar).toBeDefined();
      expect(SharedUI.Tooltip).toBeDefined();
      expect(SharedUI.Pagination).toBeDefined();
      expect(SharedUI.EmptyState).toBeDefined();
      expect(SharedUI.Skeleton).toBeDefined();
    });
  });

  describe('4. Standardized API Response Contracts', () => {
    it('creates consistent success result envelopes', () => {
      const payload = { clinicId: 'c1', totalAppointments: 42 };
      const res = createSuccessResult(payload, { cached: true });
      expect(res.success).toBe(true);
      expect(res.data).toEqual(payload);
      expect(res.meta.cached).toBe(true);
      expect(res.error).toBeNull();
    });

    it('creates structured failure result envelopes with error codes', () => {
      const res = createFailureResult('Unauthorized access to tenant records', 'FORBIDDEN', { tenantId: 'c2' });
      expect(res.success).toBe(false);
      expect(res.error.message).toContain('Unauthorized');
      expect(res.code).toBe('FORBIDDEN');
      expect(res.details.tenantId).toBe('c2');
      expect(res.data).toBeNull();
    });
  });
});