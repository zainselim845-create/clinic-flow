-- ============================================================================
-- ClinicFlow Enterprise Migration V5: Concurrency, Double-Entry Ledger & Webhooks
-- Benchmark: Tier-1 High-Scale Cloud Architecture (Stripe Invoicing / AWS Multi-Tenant)
-- ============================================================================

-- 1. CONCURRENCY CONTROL & DOUBLE-BOOKING PREVENTION
-- Partial unique index ensures NO TWO ACTIVE APPOINTMENTS can ever exist
-- for the same clinic, date, and time slot at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_appointment 
ON appointments(clinic_id, date, time) 
WHERE status NOT IN ('cancelled', 'refunded');

-- Optimistic Concurrency Control (OCC) version tracking
ALTER TABLE IF EXISTS appointments ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 2. DOUBLE-ENTRY GENERAL LEDGER (دفتر الأستاذ العام المحاسبي)
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_type VARCHAR(50) NOT NULL, -- invoice, payment, expense, adjustment
    reference_id VARCHAR(100),
    description TEXT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, entry_number)
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL, -- 1010 (Cash), 1020 (Bank), 1050 (AR), 4010 (Revenue)
    account_name VARCHAR(150) NOT NULL,
    debit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    credit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRYPTOGRAPHIC TAMPER-EVIDENT AUDIT TRAIL
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS hash VARCHAR(64);
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS sequence_number BIGINT;

-- 4. OUTGOING WEBHOOKS & EVENT BUS
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(128) NOT NULL,
    events JSONB NOT NULL DEFAULT '["*"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    attempt INTEGER DEFAULT 1,
    delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for New Enterprise Tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_journal_entries ON journal_entries
    FOR ALL USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid OR (auth.jwt() ->> 'role') = 'super_admin');

CREATE POLICY tenant_isolation_journal_lines ON journal_lines
    FOR ALL USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid OR (auth.jwt() ->> 'role') = 'super_admin');

CREATE POLICY tenant_isolation_webhooks ON webhook_endpoints
    FOR ALL USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid OR (auth.jwt() ->> 'role') = 'super_admin');

CREATE POLICY tenant_isolation_webhook_deliveries ON webhook_deliveries
    FOR ALL USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid OR (auth.jwt() ->> 'role') = 'super_admin');
