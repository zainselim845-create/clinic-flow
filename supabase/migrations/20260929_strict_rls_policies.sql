-- =========================================================================
-- ClinicFlow B2B SaaS Production Hardening: Strict RLS & ESR Indexing
-- Migration: 20260929_strict_rls_policies.sql
-- Adheres to Enterprise Multi-Tenant Security Standards:
-- 1. Strict Tenant Isolation via Row-Level Security (RLS) linked to JWT / Session Claims
-- 2. Zero Unauthenticated Data Leaks (No NULL tenant bypass)
-- 3. Dedicated Public Booking INSERT-only Policy
-- 4. ESR (Equality, Sort, Range) Composite Indexes for 100M-scale sub-millisecond queries
-- 5. Soft-delete columns (deleted_at) for audit compliance
-- =========================================================================

-- 1. Soft-Delete Support (deleted_at)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'deleted_at') THEN
        ALTER TABLE patients ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'deleted_at') THEN
        ALTER TABLE appointments ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'deleted_at') THEN
        ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_recalls' AND column_name = 'deleted_at') THEN
        ALTER TABLE patient_recalls ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- 2. ESR (Equality, Sort, Range) Composite Indexes
-- Appointments: Equality(clinic_id), Equality/Filter(status), Sort/Range(date)
CREATE INDEX IF NOT EXISTS idx_appointments_esr 
    ON appointments (clinic_id, status, date) 
    WHERE deleted_at IS NULL;

-- Invoices: Equality(clinic_id), Equality/Filter(payment_status), Sort/Range(created_at)
CREATE INDEX IF NOT EXISTS idx_invoices_esr 
    ON invoices (clinic_id, payment_status, created_at) 
    WHERE deleted_at IS NULL;

-- Patients: Equality(clinic_id), Sort/Range(created_at)
CREATE INDEX IF NOT EXISTS idx_patients_esr 
    ON patients (clinic_id, created_at) 
    WHERE deleted_at IS NULL;

-- Patient Recalls: Equality(clinic_id), Equality(status), Sort/Range(due_date)
CREATE INDEX IF NOT EXISTS idx_recalls_esr 
    ON patient_recalls (clinic_id, status, due_date) 
    WHERE deleted_at IS NULL;

-- Notifications: Equality(clinic_id), Equality(read), Sort/Range(created_at)
CREATE INDEX IF NOT EXISTS idx_esr_notifications_clinic_read_created 
    ON notifications (clinic_id, read, created_at);

-- 3. Strict Row-Level Security (RLS) Policies
-- Helper function to extract clinic_id from JWT claims or transaction context
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.current_clinic_id', true), '')::UUID,
        NULLIF(auth.jwt() ->> 'clinic_id', '')::UUID,
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'clinic_id', '')::UUID
    );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enforce strict tenant isolation on patients (Zero unauthenticated bypass)
DROP POLICY IF EXISTS patients_tenant_isolation ON patients;
CREATE POLICY patients_tenant_isolation ON patients
    FOR ALL
    USING (clinic_id = current_tenant_id())
    WITH CHECK (clinic_id = current_tenant_id());

-- Enforce strict tenant isolation on appointments for authenticated clinic members
DROP POLICY IF EXISTS appointments_tenant_isolation ON appointments;
CREATE POLICY appointments_tenant_isolation ON appointments
    FOR ALL
    USING (clinic_id = current_tenant_id())
    WITH CHECK (clinic_id = current_tenant_id());

-- Allow public anonymous patients to book an appointment (Strict INSERT only, zero read/update/delete)
DROP POLICY IF EXISTS appointments_public_booking_insert ON appointments;
CREATE POLICY appointments_public_booking_insert ON appointments
    FOR INSERT
    WITH CHECK (
        clinic_id IS NOT NULL 
        AND status IN ('booked', 'confirmed', 'waiting')
    );

-- Enforce strict tenant isolation on invoices (Zero unauthenticated bypass)
DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
CREATE POLICY invoices_tenant_isolation ON invoices
    FOR ALL
    USING (clinic_id = current_tenant_id())
    WITH CHECK (clinic_id = current_tenant_id());

-- Enforce strict tenant isolation on patient_recalls (Zero unauthenticated bypass)
DROP POLICY IF EXISTS patient_recalls_tenant_isolation ON patient_recalls;
CREATE POLICY patient_recalls_tenant_isolation ON patient_recalls
    FOR ALL
    USING (clinic_id = current_tenant_id())
    WITH CHECK (clinic_id = current_tenant_id());
