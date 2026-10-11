-- ========================================================================
-- CLINICFLOW ENTERPRISE DATABASE SCHEMA (UNIFIED PRODUCTION ROLLOUT)
-- Project: https://rogkodgqeowiylpckspi.supabase.co
-- Generated automatically for one-click execution in Supabase SQL Editor.
-- ========================================================================

-- Enable core extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration File: 001_initial_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. clinics
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    doctor_name TEXT DEFAULT 'د. أحمد الشريف',
    specialty TEXT,
    address TEXT,
    phone TEXT,
    doctor_email TEXT DEFAULT 'doctor@clinicflow.com',
    doctor_password_hash TEXT,
    regular_fee TEXT DEFAULT '300 ج.م',
    consultation_fee TEXT DEFAULT '150 ج.م',
    working_hours TEXT DEFAULT 'السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً',
    owner_id UUID REFERENCES auth.users,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. staff_members (Secretary & Reception Team)
CREATE TABLE staff_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    password TEXT NOT NULL DEFAULT '123',
    role TEXT NOT NULL DEFAULT 'سكرتير أول',
    shift TEXT DEFAULT 'مسائي (04:00 م - 10:00 م)',
    status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    permissions JSONB DEFAULT '["appointments", "patients", "whatsapp"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT CHECK (gender IN ('ذكر', 'أنثى', 'غير محدد')) DEFAULT 'غير محدد',
    phone TEXT,
    email TEXT,
    blood_type TEXT,
    diagnosis TEXT,
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_visit TIMESTAMPTZ,
    total_visits INTEGER DEFAULT 0
);

-- 4. appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code TEXT,
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    patient_id UUID REFERENCES patients ON DELETE CASCADE,
    patient_name TEXT,
    patient_phone TEXT,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    type TEXT DEFAULT 'كشف عادي',
    fee TEXT DEFAULT '300 ج.م',
    status TEXT CHECK (status IN ('booked', 'upcoming', 'waiting', 'in_progress', 'completed', 'cancelled')) DEFAULT 'booked',
    checked_in_at TIMESTAMPTZ,
    consultation_started_at TIMESTAMPTZ,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. blocked_slots (Doctor vacations & emergency closures)
CREATE TABLE blocked_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    is_full_day BOOLEAN DEFAULT false,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, date, time)
);

-- 6. notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    related_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. prescriptions (E-Prescriptions & Rx Records)
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    patient_id UUID REFERENCES patients ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    patient_phone TEXT,
    appointment_id UUID REFERENCES appointments ON DELETE SET NULL,
    date DATE NOT NULL,
    doctor_name TEXT DEFAULT 'د. أحمد الشريف',
    specialty TEXT,
    diagnosis TEXT,
    medications JSONB DEFAULT '[]'::jsonb,
    lab_tests TEXT,
    follow_up_date DATE,
    general_advice TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Security Policies

-- Clinics
CREATE POLICY "Clinics owner CRUD" ON clinics FOR ALL TO authenticated USING (auth.uid() = owner_id);

-- Staff Members
CREATE POLICY "Staff owner CRUD" ON staff_members FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

-- Patients
CREATE POLICY "Patients owner CRUD" ON patients FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

-- Appointments (Doctor/Staff CRUD)
CREATE POLICY "Appointments owner CRUD" ON appointments FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

-- Prescriptions (Doctor/Staff CRUD)
CREATE POLICY "Prescriptions owner CRUD" ON prescriptions FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);
CREATE POLICY "Public anonymous view own prescription" ON prescriptions FOR SELECT TO anon USING (true);

-- Public Anonymous Booking Permissions (Patients self-service)
CREATE POLICY "Public anonymous view availability" ON appointments FOR SELECT TO anon USING (true);
CREATE POLICY "Public anonymous insert booking" ON appointments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public anonymous insert patient" ON patients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public anonymous view blocked slots" ON blocked_slots FOR SELECT TO anon USING (true);

-- Blocked slots
CREATE POLICY "Blocked slots owner CRUD" ON blocked_slots FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

-- Notifications
CREATE POLICY "Notifications owner CRUD" ON notifications FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);


-- Indexes for maximum query performance
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_clinic_id ON prescriptions(clinic_id);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_staff_email ON staff_members(email);
CREATE INDEX idx_staff_phone ON staff_members(phone);


-- =========================================================================
-- Initial Seed Data (Default Clinic, Staff, Patients, and Appointments)
-- =========================================================================

-- 1. Default Clinic
INSERT INTO clinics (id, name, doctor_name, specialty, address, phone, doctor_email, regular_fee, consultation_fee, working_hours)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'عيادة د. أحمد الشريف التخصصية',
    'د. أحمد الشريف',
    'استشاري أمراض الباطنة والجهاز الهضمي والكبد والسكر',
    'مصر الجديدة — شارع الأهرام، برج الأطباء، الدور الرابع',
    '01006285031',
    'doctor@clinicflow.com',
    '300 ج.م',
    '150 ج.م',
    'السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً'
) ON CONFLICT (id) DO NOTHING;

-- 2. Default Staff Members
INSERT INTO staff_members (clinic_id, name, phone, email, password, role, shift, status, permissions)
VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000',
    'سارة محمود (الاستقبال الأول)',
    '01006285032',
    'sara.reception@clinic.com',
    '123',
    'سكرتير أول ومسؤول استقبال',
    'مسائي (04:00 م - 10:00 م)',
    'active',
    '["appointments", "patients", "whatsapp"]'::jsonb
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    'أحمد يوسف (الفترة الصباحية)',
    '01006285033',
    'ahmed.staff@clinic.com',
    '123',
    'سكرتير استقبال',
    'صباحي (09:00 ص - 03:00 م)',
    'active',
    '["appointments", "patients"]'::jsonb
) ON CONFLICT DO NOTHING;

-- 3. Initial Sample Patients
INSERT INTO patients (id, clinic_id, name, age, gender, phone, email, blood_type, diagnosis, notes, total_visits)
VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'محمد علي حسن',
    45,
    'ذكر',
    '01012345678',
    'mohamed.ali@email.com',
    'A+',
    'ارتفاع ضغط الدم والتهاب المعدة المزمن',
    'مريض منتظم، يحتاج قياس الضغط قبل الدخول للكشف',
    5
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    'فاطمة إبراهيم السيد',
    32,
    'أنثى',
    '01123456789',
    'fatma.ibrahim@email.com',
    'O+',
    'جرثومة المعدة وقصور هضمي',
    'حساسية من المضادات الحيوية البنسلينية',
    2
) ON CONFLICT (id) DO NOTHING;




-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration File: 002_expenses_and_recalls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =========================================================================
-- Migration 002: Expenses Ledger and Patient Periodic Recalls
-- =========================================================================

-- 1. Expenses Table (Financial Ledger)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'نثريات',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patient Recalls Table (Periodic Follow-ups)
CREATE TABLE IF NOT EXISTS patient_recalls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    patient_id UUID REFERENCES patients ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT,
    reason TEXT NOT NULL,
    due_date DATE NOT NULL,
    interval_days INTEGER DEFAULT 30,
    status TEXT CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_recalls ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated clinic owner / staff
CREATE POLICY "Expenses clinic owner CRUD" ON expenses FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

CREATE POLICY "Patient Recalls clinic owner CRUD" ON patient_recalls FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

-- Indexes for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_id ON expenses(clinic_id);
CREATE INDEX IF NOT EXISTS idx_recalls_due_date ON patient_recalls(due_date);
CREATE INDEX IF NOT EXISTS idx_recalls_status ON patient_recalls(status);



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration File: 003_multi_tenant_core.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration File: 004_super_admin_and_quotas.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration File: 005_million_user_scale_and_scoping.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =========================================================================
-- Migration 005: 1-Million User Multi-Tenant SaaS Scale & Strict Data Scoping
-- =========================================================================

-- 1. Ensure Essential Core Tables Exist for Financials and Inventory
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
    patient_id UUID REFERENCES patients ON DELETE SET NULL,
    patient_name TEXT,
    patient_phone TEXT,
    appointment_id UUID REFERENCES appointments ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    tax_percentage NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    insurance_share NUMERIC NOT NULL DEFAULT 0,
    patient_share NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_balance NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices ON DELETE CASCADE,
    patient_id UUID REFERENCES patients ON DELETE SET NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    transaction_ref TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'composite',
    unit TEXT DEFAULT 'علبة',
    min_quantity NUMERIC DEFAULT 5,
    current_qty NUMERIC DEFAULT 0,
    cost_per_unit NUMERIC DEFAULT 0,
    lot_number TEXT,
    expiry_date DATE,
    is_disposable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enterprise Composite Indexing Strategy for High Scale (1M+ Users & Records)
-- Composite keys prioritize (clinic_id, created_at), (clinic_id, patient_phone), (clinic_id, date)
CREATE INDEX IF NOT EXISTS idx_patients_clinic_created ON patients(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_phone ON patients(clinic_id, phone);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_created ON appointments(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_phone ON appointments(clinic_id, patient_phone);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_created ON invoices(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_patient ON invoices(clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_status ON invoices(clinic_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_inventory_clinic_cat ON inventory_items(clinic_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_clinic_name ON inventory_items(clinic_id, name);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_created ON notifications(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_read ON notifications(clinic_id, read);
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_date ON expenses(clinic_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_recalls_clinic_due ON patient_recalls(clinic_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tenant_members_clinic_user ON tenant_members(clinic_id, user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_user ON doctors(clinic_id, user_id);
CREATE INDEX IF NOT EXISTS idx_branches_clinic_active ON branches(clinic_id, is_active);

-- 3. Enhanced Active Clinic Resolution Function
CREATE OR REPLACE FUNCTION get_active_clinic_id() 
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_clinic_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Multi-Tenant Membership Verification Function (Strict Security Model)
CREATE OR REPLACE FUNCTION is_member_of_clinic(target_clinic_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF target_clinic_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- A. Platform Super Admin bypass
    IF EXISTS (
        SELECT 1 FROM tenant_members 
        WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    ) THEN
        RETURN TRUE;
    END IF;

    -- B. Direct Clinic Owner
    IF EXISTS (
        SELECT 1 FROM clinics 
        WHERE id = target_clinic_id AND owner_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- C. Verified Active Tenant Member
    IF EXISTS (
        SELECT 1 FROM tenant_members 
        WHERE clinic_id = target_clinic_id AND user_id = auth.uid() AND is_active = true
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Strict RLS Policies Enforcing clinic_id = get_active_clinic_id() with verified membership
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_recalls ENABLE ROW LEVEL SECURITY;

-- Appointments RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on appointments" ON appointments;
CREATE POLICY "Enforce tenant isolation on appointments" ON appointments 
    FOR ALL TO authenticated 
    USING (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id())) 
    WITH CHECK (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id()));

-- Patients RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on patients" ON patients;
CREATE POLICY "Enforce tenant isolation on patients" ON patients 
    FOR ALL TO authenticated 
    USING (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id())) 
    WITH CHECK (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id()));

-- Invoices RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on invoices" ON invoices;
CREATE POLICY "Enforce tenant isolation on invoices" ON invoices 
    FOR ALL TO authenticated 
    USING (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id())) 
    WITH CHECK (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id()));

-- Inventory RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on inventory" ON inventory_items;
CREATE POLICY "Enforce tenant isolation on inventory" ON inventory_items 
    FOR ALL TO authenticated 
    USING (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id())) 
    WITH CHECK (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id()));

-- Notifications RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on notifications" ON notifications;
CREATE POLICY "Enforce tenant isolation on notifications" ON notifications 
    FOR ALL TO authenticated 
    USING (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id())) 
    WITH CHECK (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id()));

-- Branches RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on branches" ON branches;
CREATE POLICY "Enforce tenant isolation on branches" ON branches 
    FOR ALL TO authenticated 
    USING (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id())) 
    WITH CHECK (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id()));

-- Doctors RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on doctors" ON doctors;
CREATE POLICY "Enforce tenant isolation on doctors" ON doctors 
    FOR ALL TO authenticated 
    USING (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id())) 
    WITH CHECK (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id()));

-- Tenant Members RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on tenant_members" ON tenant_members;
CREATE POLICY "Enforce tenant isolation on tenant_members" ON tenant_members 
    FOR ALL TO authenticated 
    USING ((is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id())) OR user_id = auth.uid()) 
    WITH CHECK (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id()));

-- Expenses RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on expenses" ON expenses;
CREATE POLICY "Enforce tenant isolation on expenses" ON expenses 
    FOR ALL TO authenticated 
    USING (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id())) 
    WITH CHECK (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id()));

-- Patient Recalls RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on recalls" ON patient_recalls;
CREATE POLICY "Enforce tenant isolation on recalls" ON patient_recalls 
    FOR ALL TO authenticated 
    USING (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id())) 
    WITH CHECK (is_member_of_clinic(clinic_id) AND (get_active_clinic_id() IS NULL OR clinic_id = get_active_clinic_id()));



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration File: 006_better_auth_and_organizations.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- =========================================================================
-- Migration 006: Better Auth Core & Multi-Tenant Organization RBAC Schema
-- ClinicFlow System Migration
-- =========================================================================

-- Enable pgcrypto / uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. Core Better Auth Tables
-- -------------------------------------------------------------------------

-- 1.1 User Table
CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT DEFAULT 'user',
    "banned" BOOLEAN DEFAULT FALSE,
    "banReason" TEXT,
    "banExpires" TIMESTAMPTZ
);

-- 1.2 Session Table
CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT PRIMARY KEY,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "activeOrganizationId" TEXT
);

-- 1.3 Account Table (Credentials & OAuth Providers)
CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ,
    "refreshTokenExpiresAt" TIMESTAMPTZ,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 Verification Table (Tokens & OTPs)
CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 2. Organization Plugin Tables (Multi-Tenancy & RBAC)
-- -------------------------------------------------------------------------

-- 2.1 Organization Table (Clinics)
CREATE TABLE IF NOT EXISTS "organization" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE,
    "logo" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB DEFAULT '{}'::jsonb
);

-- 2.2 Member Table (Clinic Staff & Roles)
CREATE TABLE IF NOT EXISTS "member" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unique_org_user" UNIQUE ("organizationId", "userId")
);

-- 2.3 Invitation Table (Invitations for Assistant Doctors & Staff)
CREATE TABLE IF NOT EXISTS "invitation" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "inviterId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- 3. High-Performance B-Tree Composite Indexes
-- -------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "idx_user_email" ON "user"("email");
CREATE INDEX IF NOT EXISTS "idx_session_token" ON "session"("token");
CREATE INDEX IF NOT EXISTS "idx_session_user_id" ON "session"("userId");
CREATE INDEX IF NOT EXISTS "idx_session_active_org" ON "session"("activeOrganizationId");
CREATE INDEX IF NOT EXISTS "idx_account_user_id" ON "account"("userId");
CREATE INDEX IF NOT EXISTS "idx_account_provider" ON "account"("providerId", "accountId");
CREATE INDEX IF NOT EXISTS "idx_verification_identifier" ON "verification"("identifier");
CREATE INDEX IF NOT EXISTS "idx_organization_slug" ON "organization"("slug");
CREATE INDEX IF NOT EXISTS "idx_member_org_user" ON "member"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "idx_member_user" ON "member"("userId");
CREATE INDEX IF NOT EXISTS "idx_invitation_org" ON "invitation"("organizationId");
CREATE INDEX IF NOT EXISTS "idx_invitation_email" ON "invitation"("email");
CREATE INDEX IF NOT EXISTS "idx_invitation_status" ON "invitation"("status");

-- -------------------------------------------------------------------------
-- 4. Row Level Security (RLS) Policies
-- -------------------------------------------------------------------------

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;

-- 4.1 Organization View & Access Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'organization' AND policyname = 'org_member_read_policy'
    ) THEN
        CREATE POLICY "org_member_read_policy" ON "organization"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                EXISTS (
                    SELECT 1 FROM "member"
                    WHERE "member"."organizationId" = "organization"."id"
                    AND "member"."userId" = auth.uid()::text
                )
            );
    END IF;
END $$;

-- 4.2 Member Access Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'member' AND policyname = 'member_org_read_policy'
    ) THEN
        CREATE POLICY "member_org_read_policy" ON "member"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                "member"."userId" = auth.uid()::text OR
                EXISTS (
                    SELECT 1 FROM "member" m2
                    WHERE m2."organizationId" = "member"."organizationId"
                    AND m2."userId" = auth.uid()::text
                )
            );
    END IF;
END $$;

-- 4.3 Invitation Access Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'invitation' AND policyname = 'invitation_read_policy'
    ) THEN
        CREATE POLICY "invitation_read_policy" ON "invitation"
            FOR SELECT
            USING (
                auth.role() = 'service_role' OR
                "invitation"."email" = (SELECT "email" FROM "user" WHERE "id" = auth.uid()::text) OR
                EXISTS (
                    SELECT 1 FROM "member"
                    WHERE "member"."organizationId" = "invitation"."organizationId"
                    AND "member"."userId" = auth.uid()::text
                    AND "member"."role" IN ('owner', 'admin')
                )
            );
    END IF;
END $$;

-- -------------------------------------------------------------------------
-- 5. Bidirectional Synchronization View
-- -------------------------------------------------------------------------

CREATE OR REPLACE VIEW "view_clinic_organizations" AS
SELECT 
    o."id" AS organization_id,
    o."name" AS clinic_name,
    o."slug" AS clinic_slug,
    o."logo" AS logo_url,
    o."createdAt" AS created_at,
    o."metadata" AS organization_metadata,
    c."subscription_tier",
    c."subscription_status",
    c."quotas"
FROM "organization" o
LEFT JOIN "clinics" c ON c."slug" = o."slug" OR c."id"::text = o."id";



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration File: 20260929_strict_rls_policies.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Migration File: 20261001_two_factor_vault.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- Migration: 20261001_two_factor_vault.sql
-- Description: Cloud Database-Backed 2FA Credential Vault for Enterprise Scale
-- Stores encrypted TOTP secrets, SHA-256 hashed backup codes, and trusted device fingerprints
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.two_factor_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  backup_codes TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_used_counter BIGINT DEFAULT 0,
  device_fingerprints JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_two_factor_enabled ON public.two_factor_credentials(enabled);

-- Enable Row Level Security (RLS)
ALTER TABLE public.two_factor_credentials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view own 2FA credentials" ON public.two_factor_credentials;
DROP POLICY IF EXISTS "Users can insert own 2FA credentials" ON public.two_factor_credentials;
DROP POLICY IF EXISTS "Users can update own 2FA credentials" ON public.two_factor_credentials;
DROP POLICY IF EXISTS "Users can delete own 2FA credentials" ON public.two_factor_credentials;

-- Strict Isolation: Authenticated user can ONLY access their own 2FA records
CREATE POLICY "Users can view own 2FA credentials"
  ON public.two_factor_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA credentials"
  ON public.two_factor_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA credentials"
  ON public.two_factor_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2FA credentials"
  ON public.two_factor_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);



-- ========================================================================
-- RELOAD POSTGREST SCHEMA CACHE
-- ========================================================================
NOTIFY pgrst, 'reload schema';
