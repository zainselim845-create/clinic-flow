-- =========================================================================
-- Migration 004: Super Admin & SaaS Quota Management
-- =========================================================================

-- 1. Platform Audit Logs
CREATE TABLE IF NOT EXISTS platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE SET NULL,
    actor_id UUID REFERENCES auth.users ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Granular Usage Tracking (SMS, AI Tokens, Storage)
CREATE TABLE IF NOT EXISTS tenant_usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    sms_count INTEGER DEFAULT 0,
    ai_tokens_count BIGINT DEFAULT 0,
    voice_minutes NUMERIC(10,2) DEFAULT 0,
    storage_mb NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, period_start)
);

-- Indexes for Super Admin queries
CREATE INDEX IF NOT EXISTS idx_platform_logs_created_at ON platform_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_logs_clinic_id ON platform_audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_clinic_period ON tenant_usage_records(clinic_id, period_start);

-- Row Level Security (RLS)
ALTER TABLE tenant_usage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants view own usage" ON tenant_usage_records
    FOR SELECT USING (clinic_id = get_active_clinic_id());

ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;
