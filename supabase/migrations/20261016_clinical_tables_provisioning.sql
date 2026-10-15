-- =========================================================================
-- ClinicFlow SaaS Rollout: Provision clinical_notes, treatment_plans,
-- staff_attendance + strict tenant-scoped RLS tiers
-- Migration: 20261016_clinical_tables_provisioning.sql
-- =========================================================================
-- CRITICAL GAP FIX: the three services clinicalNotesService,
-- treatmentPlansService and attendanceService already query the tables
-- `clinical_notes`, `treatment_plans` and `staff_attendance` — but those
-- tables were never provisioned by any earlier migration. Against a live
-- Supabase project every cloud call in these services fails with
-- PGRST205 (schema cache / relation does not exist).
--
-- This migration provisions the tables to EXACTLY match the service
-- mappers (fromDb*/toDb*), enables RLS, and applies the additive
-- stakeholder tiers using the SECURITY DEFINER helpers from
-- 20261015_rls_security_definer_stakeholders.sql:
--   clinical_notes / treatment_plans : read=staff, write=prescribers,
--                                      delete=leadership
--   staff_attendance                 : read=staff, write=operational,
--                                      delete=leadership
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. clinical_notes
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
    patient_id UUID REFERENCES patients ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments ON DELETE SET NULL,
    doctor_name TEXT DEFAULT '',
    chief_complaint TEXT DEFAULT '',
    diagnosis TEXT DEFAULT '',
    treatment_notes TEXT DEFAULT '',
    next_visit_plan TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_esr
    ON clinical_notes (clinic_id, patient_id, created_at)
    WHERE deleted_at IS NULL;

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinical_notes' AND policyname = 'clinical_notes_staff_read') THEN
        CREATE POLICY "clinical_notes_staff_read" ON "clinical_notes"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinical_notes' AND policyname = 'clinical_notes_prescriber_write') THEN
        CREATE POLICY "clinical_notes_prescriber_write" ON "clinical_notes"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_prescriber(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinical_notes' AND policyname = 'clinical_notes_prescriber_update') THEN
        CREATE POLICY "clinical_notes_prescriber_update" ON "clinical_notes"
            FOR UPDATE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_prescriber(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinical_notes' AND policyname = 'clinical_notes_leader_delete') THEN
        CREATE POLICY "clinical_notes_leader_delete" ON "clinical_notes"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 2. treatment_plans
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
    patient_id UUID REFERENCES patients ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'خطة علاجية',
    total_cost NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    net_cost NUMERIC DEFAULT 0,
    status TEXT CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')) DEFAULT 'draft',
    notes TEXT DEFAULT '',
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_esr
    ON treatment_plans (clinic_id, status, created_at)
    WHERE deleted_at IS NULL;

ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'treatment_plans' AND policyname = 'treatment_plans_staff_read') THEN
        CREATE POLICY "treatment_plans_staff_read" ON "treatment_plans"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'treatment_plans' AND policyname = 'treatment_plans_prescriber_write') THEN
        CREATE POLICY "treatment_plans_prescriber_write" ON "treatment_plans"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_prescriber(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'treatment_plans' AND policyname = 'treatment_plans_prescriber_update') THEN
        CREATE POLICY "treatment_plans_prescriber_update" ON "treatment_plans"
            FOR UPDATE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_prescriber(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'treatment_plans' AND policyname = 'treatment_plans_leader_delete') THEN
        CREATE POLICY "treatment_plans_leader_delete" ON "treatment_plans"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 3. staff_attendance
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
    staff_id UUID REFERENCES staff_members ON DELETE SET NULL,
    staff_name TEXT DEFAULT '',
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    total_hours NUMERIC DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_esr
    ON staff_attendance (clinic_id, check_in)
    WHERE deleted_at IS NULL;

ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_attendance' AND policyname = 'staff_attendance_staff_read') THEN
        CREATE POLICY "staff_attendance_staff_read" ON "staff_attendance"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                cf_is_platform_admin() OR
                cf_is_clinic_staff(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_attendance' AND policyname = 'staff_attendance_operational_write') THEN
        CREATE POLICY "staff_attendance_operational_write" ON "staff_attendance"
            FOR INSERT
            WITH CHECK (
                auth.role() = 'service_role' OR
                cf_is_clinic_operational(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_attendance' AND policyname = 'staff_attendance_operational_update') THEN
        CREATE POLICY "staff_attendance_operational_update" ON "staff_attendance"
            FOR UPDATE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_operational(clinic_id)
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_attendance' AND policyname = 'staff_attendance_leader_delete') THEN
        CREATE POLICY "staff_attendance_leader_delete" ON "staff_attendance"
            FOR DELETE
            USING (
                auth.role() = 'service_role' OR
                cf_is_clinic_leader(clinic_id)
            );
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 4. Verification (uncomment after applying):
-- SELECT tablename, policyname, cmd FROM pg_policies
--  WHERE tablename IN ('clinical_notes','treatment_plans','staff_attendance')
--  ORDER BY tablename, policyname;
-- \d clinical_notes  \d treatment_plans  \d staff_attendance
-- -------------------------------------------------------------------------
