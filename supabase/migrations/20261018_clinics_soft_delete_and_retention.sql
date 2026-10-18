-- =========================================================================
-- ClinicFlow Enterprise Multi-Tenant Lifecycle Hardening
-- Migration: 20261018_clinics_soft_delete_and_retention.sql
-- 1. Adds deleted_at TIMESTAMPTZ to public.clinics for audit & compliance
-- 2. Partial Index on active clinics for high-performance tenant lookup
-- 3. Soft-delete RPC for safe clinic decommissioning without orphan cascades
-- =========================================================================

-- 1. Add deleted_at column to public.clinics if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'clinics' 
          AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.clinics ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- 2. Create partial index for active clinics (Zero-overhead index scan)
CREATE INDEX IF NOT EXISTS idx_clinics_active_lookup
ON public.clinics (slug, id)
WHERE deleted_at IS NULL;

-- 3. Dedicated safe soft-delete RPC for platform admins
CREATE OR REPLACE FUNCTION public.soft_delete_clinic(p_clinic_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clinic RECORD;
BEGIN
    SELECT * INTO v_clinic FROM public.clinics WHERE id = p_clinic_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clinic not found');
    END IF;

    UPDATE public.clinics
    SET deleted_at = NOW(),
        subscription_status = 'cancelled'
    WHERE id = p_clinic_id;

    RETURN jsonb_build_object(
        'success', true,
        'clinic_id', p_clinic_id,
        'deleted_at', NOW()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_clinic(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_clinic(UUID) TO authenticated, service_role;
