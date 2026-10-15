-- =========================================================================
-- ClinicFlow Migration: 20261016_superadmin_clinics_rls.sql
-- Shopify-Grade Super Admin Visibility, Audit Logs & Guarded Public Access
-- =========================================================================

-- 1. Hardened Row Level Security on public.clinics
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies
DROP POLICY IF EXISTS "Clinics owner CRUD" ON public.clinics;
DROP POLICY IF EXISTS "clinics_platform_admin_all" ON public.clinics;
DROP POLICY IF EXISTS "clinics_read_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_insert_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_update_policy" ON public.clinics;
DROP POLICY IF EXISTS "clinics_delete_policy" ON public.clinics;

-- A. Granular SELECT policy:
-- Strictly authenticated: SuperAdmin can see ALL clinics across the platform.
-- Clinic Owner sees their own clinic.
-- Clinic Staff (Doctors, Receptionists, Accountants) see their clinic.
-- (Public access is gated through public_get_active_clinic_by_slug RPC to prevent catalog scraping)
CREATE POLICY "clinics_read_policy" ON public.clinics
    FOR SELECT
    TO authenticated
    USING (
        cf_is_platform_admin() OR
        auth.uid() = owner_id OR
        cf_is_clinic_staff(id)
    );

-- B. Granular INSERT policy:
-- SuperAdmin or authenticated user registering their own clinic
CREATE POLICY "clinics_insert_policy" ON public.clinics
    FOR INSERT
    TO authenticated
    WITH CHECK (
        cf_is_platform_admin() OR
        auth.uid() = owner_id
    );

-- C. Granular UPDATE policy:
-- SuperAdmin, clinic owner, or clinic leadership (cf_is_clinic_leader)
CREATE POLICY "clinics_update_policy" ON public.clinics
    FOR UPDATE
    TO authenticated
    USING (
        cf_is_platform_admin() OR
        auth.uid() = owner_id OR
        cf_is_clinic_leader(id)
    )
    WITH CHECK (
        cf_is_platform_admin() OR
        auth.uid() = owner_id OR
        cf_is_clinic_leader(id)
    );

-- D. Controlled DELETE (Shopify Pattern: Guarded Purge):
-- Client-side direct hard-DELETE is completely disallowed to prevent cascading data loss.
-- Deletion is strictly audited and executed via serverless service_role after archiving.

-- -------------------------------------------------------------------------
-- 2. Public Safe Access RPC for Patient Booking
-- -------------------------------------------------------------------------
-- Exposes ONLY public clinic display fields for active clinics by unique slug
CREATE OR REPLACE FUNCTION public.public_get_active_clinic_by_slug(p_slug text)
RETURNS TABLE (
    id uuid,
    name text,
    slug text,
    doctor_name text,
    specialty text,
    phone text,
    custom_domain text,
    is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.doctor_name, 
        c.specialty, 
        c.phone, 
        c.custom_domain, 
        c.is_active
    FROM clinics c
    WHERE c.slug = p_slug 
      AND (c.is_active = true OR c.is_active IS NULL)
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_active_clinic_by_slug(text) TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 3. Row Level Security on public.platform_audit_logs
-- -------------------------------------------------------------------------
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_audit_logs_superadmin_read" ON public.platform_audit_logs;
DROP POLICY IF EXISTS "platform_audit_logs_append_policy" ON public.platform_audit_logs;

-- Read: Platform admins only
CREATE POLICY "platform_audit_logs_superadmin_read" ON public.platform_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        cf_is_platform_admin()
    );

-- Append: Platform admins only (Regular user audits logged via secure service_role)
CREATE POLICY "platform_audit_logs_append_policy" ON public.platform_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        cf_is_platform_admin()
    );

-- -------------------------------------------------------------------------
-- 4. Row Level Security on public.tenant_usage_records
-- -------------------------------------------------------------------------
ALTER TABLE public.tenant_usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_usage_records_superadmin_read" ON public.tenant_usage_records;
CREATE POLICY "tenant_usage_records_superadmin_read" ON public.tenant_usage_records
    FOR SELECT
    TO authenticated
    USING (
        cf_is_platform_admin()
    );

-- -------------------------------------------------------------------------
-- 5. High-Performance ESR Indexes
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clinics_owner_id ON public.clinics(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinics_created_at_desc ON public.clinics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_logs_action_created ON public.platform_audit_logs(action, created_at DESC);

-- -------------------------------------------------------------------------
-- 6. Realtime Publication Binding
-- -------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.clinics;
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN RAISE WARNING 'Realtime publication binding warning for clinics: %', SQLERRM;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_audit_logs;
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN RAISE WARNING 'Realtime publication binding warning for platform_audit_logs: %', SQLERRM;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_usage_records;
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN RAISE WARNING 'Realtime publication binding warning for tenant_usage_records: %', SQLERRM;
    END;
END $$;
