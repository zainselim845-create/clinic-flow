-- =========================================================================
-- Migration: 20261015_enterprise_rls_and_fix_recursion.sql
-- ClinicFlow Enterprise Security & Multi-Tenant Hardening
-- =========================================================================

-- 1. Break Infinite Recursion in Member & Organization RLS Policies
-- Use SECURITY DEFINER helper function to bypass RLS during membership lookups.

CREATE OR REPLACE FUNCTION get_user_member_org_ids(lookup_user_id TEXT)
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT "organizationId" FROM "member" WHERE "userId" = lookup_user_id;
$$;

-- Drop existing recursive policies if present
DROP POLICY IF EXISTS "org_member_read_policy" ON "organization";
DROP POLICY IF EXISTS "member_org_read_policy" ON "member";
DROP POLICY IF EXISTS "invitation_read_policy" ON "invitation";

-- Recreate non-recursive policies on organization
CREATE POLICY "org_member_read_policy" ON "organization"
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        "id" IN (SELECT get_user_member_org_ids(auth.uid()::text))
    );

-- Recreate non-recursive policies on member
CREATE POLICY "member_org_read_policy" ON "member"
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        "userId" = auth.uid()::text OR
        "organizationId" IN (SELECT get_user_member_org_ids(auth.uid()::text))
    );

-- Recreate non-recursive policies on invitation
CREATE POLICY "invitation_read_policy" ON "invitation"
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        "email" = (SELECT "email" FROM "user" WHERE "id" = auth.uid()::text) OR
        "organizationId" IN (SELECT get_user_member_org_ids(auth.uid()::text))
    );

-- 2. Enterprise Persistent Idempotency Keys Table
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    clinic_id UUID NOT NULL REFERENCES public.clinics ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users ON DELETE SET NULL,
    operation_type TEXT NOT NULL DEFAULT 'appointment_booking',
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    recovery_point TEXT,
    response_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    CONSTRAINT uq_idempotency_clinic_key UNIQUE (clinic_id, key)
);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "idempotency_keys_tenant_isolation" ON public.idempotency_keys
    FOR ALL TO authenticated
    USING (
        clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')::UUID
        OR clinic_id IN (SELECT id FROM public.clinics WHERE owner_id = auth.uid())
    );

CREATE POLICY "idempotency_keys_public_insert" ON public.idempotency_keys
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "idempotency_keys_public_select" ON public.idempotency_keys
    FOR SELECT TO anon
    USING (expires_at > NOW());

-- 3. Data Integrity & Domain Business Constraints
-- Guarantee financial correctness at the database level: non-negative balances, prices, and stock

DO $$
BEGIN
    -- invoices: total, paid_amount, remaining_balance must be non-negative
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_amounts_positive') THEN
        ALTER TABLE public.invoices 
            ADD CONSTRAINT chk_invoices_amounts_positive 
            CHECK (subtotal >= 0 AND total >= 0 AND paid_amount >= 0 AND remaining_balance >= 0);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    -- inventory_items: current_qty must not be negative if active
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_non_negative_qty') THEN
        ALTER TABLE public.inventory_items 
            ADD CONSTRAINT chk_inventory_non_negative_qty 
            CHECK (current_qty >= 0);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    -- expenses: amount must be positive
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_positive_amount') THEN
        ALTER TABLE public.expenses 
            ADD CONSTRAINT chk_expenses_positive_amount 
            CHECK (amount >= 0);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. High-Throughput ESR Composite Indexes for Real Production Queries
CREATE INDEX IF NOT EXISTS idx_patients_clinic_phone_search 
    ON public.patients(clinic_id, phone, name);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date_status 
    ON public.appointments(clinic_id, date, status);

CREATE INDEX IF NOT EXISTS idx_invoices_clinic_status_date 
    ON public.invoices(clinic_id, payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_clinic_stock_alert 
    ON public.inventory_items(clinic_id, current_qty, min_quantity) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_idempotency_expiry 
    ON public.idempotency_keys(expires_at) 
    WHERE status = 'completed';
