-- =========================================================================
-- ClinicFlow Enterprise Database Hardening (P0 Gates)
-- Migration: 20261018_enterprise_database_hardening_and_patient_unique_index.sql
-- 1. Partial Unique Index on Patients Phone per clinic (Race Condition Proof)
-- 2. Strict Database-level Constraint on Appointments Double-Booking
-- 3. pg_policies Audit Function & Anonymous Access Lock-Down
-- =========================================================================

-- 1. Clean any existing active duplicates before applying unique index (Safety Gate)
DO $$
DECLARE
    v_dup_count INT;
BEGIN
    SELECT COUNT(*) INTO v_dup_count
    FROM (
        SELECT clinic_id, phone
        FROM public.patients
        WHERE phone IS NOT NULL AND phone != '' AND deleted_at IS NULL
        GROUP BY clinic_id, phone
        HAVING COUNT(*) > 1
    ) dups;

    IF v_dup_count > 0 THEN
        RAISE NOTICE 'Found % duplicate active patient phone(s). Soft-deleting older duplicates...', v_dup_count;
        UPDATE public.patients
        SET deleted_at = NOW()
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY clinic_id, phone 
                    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
                ) as rn
                FROM public.patients
                WHERE phone IS NOT NULL AND phone != '' AND deleted_at IS NULL
            ) ranked
            WHERE rn > 1
        );
    END IF;
END $$;

-- 2. Create Partial Unique Index for Patients Phone (Strict Multi-Tenant Scoped)
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_clinic_phone_unique_active
ON public.patients (clinic_id, phone)
WHERE phone IS NOT NULL AND phone != '' AND deleted_at IS NULL;

-- 3. Table-Level Double-Booking Guarantee on public.appointments
-- Ensures NO TWO active appointments can EVER occupy the same clinic, doctor, date, and time
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_clinic_doc_slot_unique
ON public.appointments (
    clinic_id,
    COALESCE(doctor_id, '00000000-0000-0000-0000-000000000000'::uuid),
    date,
    time
)
WHERE COALESCE(status, 'booked') NOT IN ('cancelled', 'refunded') AND deleted_at IS NULL;

-- 4. Audit Helper Function: pg_policies inspection for security and compliance audits
CREATE OR REPLACE FUNCTION public.get_pg_policies_audit()
RETURNS TABLE (
    schemaname TEXT,
    tablename TEXT,
    policyname TEXT,
    permissive TEXT,
    roles TEXT[],
    cmd TEXT,
    qual TEXT,
    with_check TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT 
        p.schemaname::text, 
        p.tablename::text, 
        p.policyname::text, 
        p.permissive::text, 
        p.roles::text[], 
        p.cmd::text, 
        p.qual::text, 
        p.with_check::text
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    ORDER BY p.tablename, p.policyname;
$$;

REVOKE ALL ON FUNCTION public.get_pg_policies_audit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pg_policies_audit() TO authenticated, service_role;

-- 5. Anon Lock-Down: Guarantee Zero Data Leak on Sensitive Tables
REVOKE SELECT, UPDATE, DELETE ON TABLE public.patients FROM anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.invoices FROM anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.staff_members FROM anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.staff_attendance FROM anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.clinical_notes FROM anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.treatment_plans FROM anon;
