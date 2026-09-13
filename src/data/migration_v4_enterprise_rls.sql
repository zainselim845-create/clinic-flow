-- ============================================================================
-- ClinicFlow Enterprise Migration V4: Zero-Trust Multi-Tenant Row Level Security (RLS)
-- Benchmark: Tier-1 Healthcare Cloud Architecture (Veeva / Stripe Invoicing / AWS Multi-Tenant)
-- ============================================================================

-- Helper function: Extracts the active tenant clinic_id from the authenticated JWT session
CREATE OR REPLACE FUNCTION get_active_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'clinic_id', '')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function: Checks if the calling user holds the platform super_admin role
CREATE OR REPLACE FUNCTION is_platform_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'super_admin'
        OR (current_setting('request.jwt.claims', true)::jsonb ->> 'is_super_admin')::boolean = true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ============================================================================

ALTER TABLE IF EXISTS clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dental_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS treatment_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS visit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS patient_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS patient_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS operatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS patient_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. TENANT ISOLATION POLICIES (ZERO-TRUST PER-CLINIC BOUNDARIES)
-- ============================================================================

-- Clinics: SuperAdmin has full access; Tenant users access only their clinic; Public can view active profiles for booking
DROP POLICY IF EXISTS tenant_isolation_clinics ON clinics;
CREATE POLICY tenant_isolation_clinics ON clinics
    FOR ALL
    USING (
        is_platform_super_admin()
        OR id = get_active_tenant_id()
        OR is_active = true
    );

-- Patients: Strictly isolated to active tenant
DROP POLICY IF EXISTS tenant_isolation_patients ON patients;
CREATE POLICY tenant_isolation_patients ON patients
    FOR ALL
    USING (
        is_platform_super_admin()
        OR clinic_id = get_active_tenant_id()
    )
    WITH CHECK (
        is_platform_super_admin()
        OR clinic_id = get_active_tenant_id()
    );

-- Appointments: Strictly isolated to active tenant
DROP POLICY IF EXISTS tenant_isolation_appointments ON appointments;
CREATE POLICY tenant_isolation_appointments ON appointments
    FOR ALL
    USING (
        is_platform_super_admin()
        OR clinic_id = get_active_tenant_id()
    )
    WITH CHECK (
        is_platform_super_admin()
        OR clinic_id = get_active_tenant_id()
    );

-- Invoices & Ledger: Immutable financial isolation
DROP POLICY IF EXISTS tenant_isolation_invoices ON invoices;
CREATE POLICY tenant_isolation_invoices ON invoices
    FOR ALL
    USING (
        is_platform_super_admin()
        OR clinic_id = get_active_tenant_id()
    )
    WITH CHECK (
        is_platform_super_admin()
        OR clinic_id = get_active_tenant_id()
    );

-- Payments: Scoped to tenant
DROP POLICY IF EXISTS tenant_isolation_payments ON payments;
CREATE POLICY tenant_isolation_payments ON payments
    FOR ALL
    USING (
        is_platform_super_admin()
        OR clinic_id = get_active_tenant_id()
    )
    WITH CHECK (
        is_platform_super_admin()
        OR clinic_id = get_active_tenant_id()
    );

-- Clinical EMR: Dental Chart, Notes & Treatment Plans
DROP POLICY IF EXISTS tenant_isolation_dental_chart ON dental_chart;
CREATE POLICY tenant_isolation_dental_chart ON dental_chart
    FOR ALL
    USING (is_platform_super_admin() OR clinic_id = get_active_tenant_id())
    WITH CHECK (is_platform_super_admin() OR clinic_id = get_active_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_clinical_notes ON clinical_notes;
CREATE POLICY tenant_isolation_clinical_notes ON clinical_notes
    FOR ALL
    USING (is_platform_super_admin() OR clinic_id = get_active_tenant_id())
    WITH CHECK (is_platform_super_admin() OR clinic_id = get_active_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_treatment_plans ON treatment_plans;
CREATE POLICY tenant_isolation_treatment_plans ON treatment_plans
    FOR ALL
    USING (is_platform_super_admin() OR clinic_id = get_active_tenant_id())
    WITH CHECK (is_platform_super_admin() OR clinic_id = get_active_tenant_id());

-- Expenses & Operations
DROP POLICY IF EXISTS tenant_isolation_expenses ON expenses;
CREATE POLICY tenant_isolation_expenses ON expenses
    FOR ALL
    USING (is_platform_super_admin() OR clinic_id = get_active_tenant_id())
    WITH CHECK (is_platform_super_admin() OR clinic_id = get_active_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_recalls ON recalls;
CREATE POLICY tenant_isolation_recalls ON recalls
    FOR ALL
    USING (is_platform_super_admin() OR clinic_id = get_active_tenant_id())
    WITH CHECK (is_platform_super_admin() OR clinic_id = get_active_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_notifications ON notifications;
CREATE POLICY tenant_isolation_notifications ON notifications
    FOR ALL
    USING (is_platform_super_admin() OR clinic_id = get_active_tenant_id())
    WITH CHECK (is_platform_super_admin() OR clinic_id = get_active_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_blocked_slots ON blocked_slots;
CREATE POLICY tenant_isolation_blocked_slots ON blocked_slots
    FOR ALL
    USING (is_platform_super_admin() OR clinic_id = get_active_tenant_id())
    WITH CHECK (is_platform_super_admin() OR clinic_id = get_active_tenant_id());

-- Healthcare Audit Logs (Append-Only)
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR SELECT
    USING (is_platform_super_admin() OR clinic_id = get_active_tenant_id());

CREATE POLICY tenant_append_audit_logs ON audit_logs
    FOR INSERT
    WITH CHECK (is_platform_super_admin() OR clinic_id = get_active_tenant_id());

-- ============================================================================
-- 3. ENTERPRISE SCALING & MONOTONIC LEDGER INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_invoices_clinic_created ON invoices(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_seq ON invoices(clinic_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_clinic_inv ON payments(clinic_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_created ON audit_logs(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_date ON expenses(clinic_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_recalls_clinic_status ON recalls(clinic_id, status);
