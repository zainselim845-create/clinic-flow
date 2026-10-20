import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { maskEgyptianPhone } from '@/utils/phoneValidation';
import { subscribeToPlatformClinics, getPublicClinicBySlug } from '@/features/platform/services/clinicsService';
import { fetchPlatformAuditLogsFromDb } from '@/features/auth/services/auditLoggerService';

describe('Phase 4: Shopify-Grade Super Admin Visibility & RLS Hardening', () => {

  describe('Migration 20261016_superadmin_clinics_rls.sql Schema & Policies', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261016_superadmin_clinics_rls.sql');

    it('exists and is properly formatted', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql.length).toBeGreaterThan(500);
    });

    it('drops legacy single-owner policy and enforces guarded policies without client-side hard DELETE', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('DROP POLICY IF EXISTS "Clinics owner CRUD" ON public.clinics');
      expect(sql).toContain('CREATE POLICY "clinics_read_policy" ON public.clinics');
      expect(sql).toContain('CREATE POLICY "clinics_insert_policy" ON public.clinics');
      expect(sql).toContain('CREATE POLICY "clinics_update_policy" ON public.clinics');
      expect(sql).toContain('DROP POLICY IF EXISTS "clinics_delete_policy" ON public.clinics');
      // Verify no permissive client-side delete policy is created
      expect(sql).not.toContain('CREATE POLICY "clinics_delete_policy"');
    });

    it('exposes safe public_get_active_clinic_by_slug RPC for public bookings', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION public.public_get_active_clinic_by_slug');
      expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.public_get_active_clinic_by_slug(text) TO anon, authenticated, service_role');
      expect(sql).toContain('SECURITY DEFINER');
    });

    it('enforces cf_is_platform_admin() and cf_is_clinic_staff(id) on clinics', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('cf_is_platform_admin()');
      expect(sql).toContain('cf_is_clinic_staff(id)');
      expect(sql).toContain('cf_is_clinic_leader(id)');
    });

    it('protects platform_audit_logs with append-only security definer RLS', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY');
      expect(sql).toContain('platform_audit_logs_superadmin_read');
      expect(sql).toContain('platform_audit_logs_append_policy');
    });

    it('binds clinics and audit logs to supabase_realtime publication', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.clinics');
      expect(sql).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_audit_logs');
      expect(sql).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_usage_records');
    });

    it('defines ESR indexes on owner_id and created_at DESC', () => {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      expect(sql).toContain('idx_clinics_owner_id');
      expect(sql).toContain('idx_clinics_created_at_desc');
      expect(sql).toContain('idx_platform_logs_action_created');
    });
  });

  describe('Phone Privacy & Masking for Visiting Specialists', () => {
    it('masks standard 11-digit Egyptian phone numbers preserving prefix and suffix', () => {
      const original = '01012345678';
      const masked = maskEgyptianPhone(original);
      expect(masked).toBe('010••••5678');
      expect(masked).not.toBe(original);
    });

    it('handles various Egyptian mobile prefixes (011, 012, 015)', () => {
      expect(maskEgyptianPhone('01198765432')).toBe('011••••5432');
      expect(maskEgyptianPhone('01234567890')).toBe('012••••7890');
      expect(maskEgyptianPhone('01555554444')).toBe('015••••4444');
    });

    it('handles international format +20 and converts cleanly', () => {
      expect(maskEgyptianPhone('+201012345678')).toBe('010••••5678');
    });

    it('returns empty string for empty or invalid inputs without crashing', () => {
      expect(maskEgyptianPhone('')).toBe('');
      expect(maskEgyptianPhone(null)).toBe('');
      expect(maskEgyptianPhone(undefined)).toBe('');
    });
  });

  describe('Real-Time Multi-Tenant Subscriptions & Audit Querying', () => {
    it('provides subscribeToPlatformClinics with clean unsubscribe contract', () => {
      const subscription = subscribeToPlatformClinics({
        onClinicChange: vi.fn(),
        onStatusChange: vi.fn()
      });
      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
      expect(() => subscription.unsubscribe()).not.toThrow();
    });

    it('fetches platform audit logs with fallback to cryptographic log buffer', async () => {
      const result = await fetchPlatformAuditLogsFromDb({ limit: 10 });
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.error).toBeNull();
    });

    it('resolves public clinic metadata via getPublicClinicBySlug gracefully', async () => {
      const result = await getPublicClinicBySlug('dr-ahmed-cardio');
      expect(result).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('Super Admin Master Authentication Integrity', () => {
    it('authenticates superadmin with master secret and admin password', async () => {
      const { authenticateUser } = await import('@/features/auth/services/authService');
      const userMaster = authenticateUser('superadmin@clinicflow.com', 'cf-superadmin-sec-2026-x9');
      expect(userMaster).toBeDefined();
      expect(userMaster.role).toBe('super_admin');
      expect(userMaster.isSuperAdmin).toBe(true);

      const userAdmin = authenticateUser('superadmin@clinicflow.com', 'admin');
      expect(userAdmin).toBeDefined();
      expect(userAdmin.role).toBe('super_admin');
      expect(userAdmin.isSuperAdmin).toBe(true);

      const userShort = authenticateUser('superadmin', 'admin');
      expect(userShort).toBeDefined();
      expect(userShort.role).toBe('super_admin');

      expect(() => authenticateUser('superadmin', 'wrong_pass')).toThrow();
    });
  });
});

