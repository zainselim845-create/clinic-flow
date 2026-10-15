-- =========================================================================
-- ClinicFlow Migration: 20261016_superadmin_clinics_rls.sql
-- Shopify-Grade Super Admin Visibility & Platform Audit Logs RLS Hardening
-- =========================================================================

-- 1. Hardened Row Level Security on public.clinics
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Drop legacy single-owner policy if exists
DROP POLICY IF EXISTS "Clinics owner CRUD" ON public.clinics;
DROP POLICY IF EXISTS "clinics_platform_admin_all" ON public.clinics;
DROP POLICY IF EXISTS "clinics_read_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_insert_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_update_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_delete_policy" ON public.clinics;

-- A. Granular SELECT policy:
-- SuperAdmin can see ALL clinics across the entire database.
-- Clinic Owner sees their own clinic.
-- Clinic Staff (Doctors, Receptionists, Accountants) see their clinic.
-- Public/Anon can resolve active clinics for public booking and landing pages.
CREATE POLICY "clinics_read_policy" ON public.clinics
    FOR SELECT
    TO authenticated, anon
    USING (
        auth.role() = 'service_role' OR
        cf_is_platform_admin() OR
        auth.uid() = owner_id OR
        cf_is_clinic_staff(id) OR
        (is_active = true OR is_active IS NULL)
    );

-- B. Granular INSERT policy:
-- SuperAdmin, service_role, or authenticated user registering their own clinic
CREATE POLICY "clinics_insert_policy" ON public.clinics
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.role() = 'service_role' OR
        cf_is_platform_admin() OR
        auth.uid() = owner_id
    );

-- C. Granular UPDATE policy:
-- SuperAdmin, service_role, clinic owner, or clinic leadership (cf_is_clinic_leader)
CREATE POLICY "clinics_update_policy" ON public.clinics
    FOR UPDATE
    TO authenticated
    USING (
        auth.role() = 'service_role' OR
        cf_is_platform_admin() OR
        auth.uid() = owner_id OR
        cf_is_clinic_leader(id)
    )
    WITH CHECK (
        auth.role() = 'service_role' OR
        cf_is_platform_admin() OR
        auth.uid() = owner_id OR
        cf_is_clinic_leader(id)
    );

-- D. Controlled DELETE policy (Shopify pattern: guarded purge):
-- Only SuperAdmin or clinic owner can trigger clinic deletion
CREATE POLICY "clinics_delete_policy" ON public.clinics
    FOR DELETE
    TO authenticated
    USING (
        auth.role() = 'service_role' OR
        cf_is_platform_admin() OR
        auth.uid() = owner_id
    );

-- -------------------------------------------------------------------------
-- 2. Row Level Security on public.platform_audit_logs
-- -------------------------------------------------------------------------
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_audit_logs_superadmin_read" ON public.platform_audit_logs;
DROP POLICY IF EXISTS "platform_audit_logs_append_policy" ON public.platform_audit_logs;

-- Read: Platform admins & service_role only
CREATE POLICY "platform_audit_logs_superadmin_read" ON public.platform_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'service_role' OR
        cf_is_platform_admin()
    );

-- Append-only: SuperAdmin, service_role, or authenticated actors logging events
CREATE POLICY "platform_audit_logs_append_policy" ON public.platform_audit_logs
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (
        auth.role() = 'service_role' OR
        cf_is_platform_admin() OR
        auth.uid() IS NOT NULL
    );

-- -------------------------------------------------------------------------
-- 3. Row Level Security on public.tenant_usage_records
-- -------------------------------------------------------------------------
ALTER TABLE public.tenant_usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_usage_records_superadmin_read" ON public.tenant_usage_records;
CREATE POLICY "tenant_usage_records_superadmin_read" ON public.tenant_usage_records
    FOR SELECT
    TO authenticated
    USING (
        auth.role() = 'service_role' OR
        cf_is_platform_admin()
    );

-- -------------------------------------------------------------------------
-- 4. High-Performance ESR Indexes
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clinics_owner_id ON public.clinics(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinics_created_at_desc ON public.clinics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_logs_action_created ON public.platform_audit_logs(action, created_at DESC);

-- -------------------------------------------------------------------------
-- 5. Realtime Publication Binding
-- -------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.clinics;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_audit_logs;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_usage_records;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    WHEN OTHERS THEN
        NULL;
    END;
END $$;
