-- =========================================================================
-- Migration 003: Core Multi-Tenant Architecture & Data Isolation
-- =========================================================================

-- 1. Enhance clinics table with Multi-Tenant SaaS columns
ALTER TABLE clinics 
    ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'pro' CHECK (subscription_tier IN ('trial', 'starter', 'pro', 'enterprise')),
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{"primaryColor": "#0071E3", "accentColor": "#34C759"}'::jsonb,
    ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"smsProvider": "none", "currency": "EGP", "allowOnlineBooking": true}'::jsonb,
    ADD COLUMN IF NOT EXISTS quotas JSONB DEFAULT '{"maxPatients": 10000, "maxDoctors": 3, "monthlySmsQuota": 1000, "smsUsed": 0, "aiTokensQuota": 5000000, "aiTokensUsed": 0}'::jsonb;

-- Backfill default slug for existing clinics
UPDATE clinics 
SET slug = 'dr-ahmed' 
WHERE slug IS NULL AND (name ILIKE '%أحمد%' OR doctor_name ILIKE '%أحمد%');

UPDATE clinics 
SET slug = 'clinic-' || substr(id::text, 1, 8) 
WHERE slug IS NULL;

ALTER TABLE clinics ALTER COLUMN slug SET NOT NULL;

-- 2. Tenant Memberships Table (Multi-clinic user roles & access control)
CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'clinic_owner', 'doctor', 'receptionist', 'accountant', 'nurse')) DEFAULT 'receptionist',
    permissions JSONB DEFAULT '["appointments", "patients"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, user_id)
);

-- 3. Multi-Doctor Support (Doctors linked to clinic)
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users ON DELETE SET NULL,
    name TEXT NOT NULL,
    specialty TEXT,
    phone TEXT,
    email TEXT,
    regular_fee TEXT DEFAULT '300 ج.م',
    consultation_fee TEXT DEFAULT '150 ج.م',
    working_hours TEXT DEFAULT 'السبت - الخميس: ٥:٠٠ م - ١٠:٠٠ م',
    schedule_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Multi-Branch Support (Branches / Polyclinics)
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add branch_id and doctor_id to appointments & prescriptions
ALTER TABLE appointments 
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors ON DELETE SET NULL;

ALTER TABLE prescriptions 
    ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors ON DELETE SET NULL;

-- 5. Helper Function for Active Clinic Resolution in Postgres
CREATE OR REPLACE FUNCTION get_active_clinic_id() 
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_clinic_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Enable RLS on newly created tables
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- 7. High-Performance Multi-Tenant Composite Indexes
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_clinics_custom_domain ON clinics(custom_domain);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_clinic_id ON tenant_members(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_branches_clinic_id ON branches(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_phone ON patients(clinic_id, phone);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, date);
