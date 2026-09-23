-- =========================================================================
-- ClinicFlow B2B SaaS Master Database Migration & Setup
-- Project: rogkodgqeowiylpckspi.supabase.co
-- =========================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clinics Table (Tenants)
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    doctor_name TEXT DEFAULT 'طبيب العيادة',
    specialty TEXT DEFAULT 'الطب العام والتخصصي',
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    doctor_email TEXT DEFAULT '',
    doctor_password_hash TEXT,
    regular_fee TEXT DEFAULT '300 ج.م',
    consultation_fee TEXT DEFAULT '150 ج.م',
    working_hours TEXT DEFAULT 'السبت - الخميس: ٥:٠٠ م - ١٠:٠٠ م',
    schedule_config JSONB,
    custom_domain TEXT UNIQUE,
    logo_url TEXT,
    subscription_tier TEXT DEFAULT 'pro' CHECK (subscription_tier IN ('trial', 'starter', 'pro', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', 'lifetime', 'pending_approval', 'suspended')),
    is_lifetime_license BOOLEAN DEFAULT false,
    agreement_amount NUMERIC DEFAULT 0,
    trial_ends_at TIMESTAMPTZ,
    subscription_renews_at TIMESTAMPTZ,
    branding JSONB DEFAULT '{"primaryColor": "#09090B", "accentColor": "#10B981"}'::jsonb,
    settings JSONB DEFAULT '{"smsProvider": "none", "currency": "EGP", "allowOnlineBooking": true}'::jsonb,
    quotas JSONB DEFAULT '{"maxPatients": 10000, "maxDoctors": 3, "monthlySmsQuota": 1000, "smsUsed": 0, "aiTokensQuota": 5000000, "aiTokensUsed": 0}'::jsonb,
    owner_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Staff Members Table
CREATE TABLE IF NOT EXISTS staff_members (
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

-- 4. Patients Table
CREATE TABLE IF NOT EXISTS patients (
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

-- 5. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
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
    paid_amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    status TEXT CHECK (status IN ('booked', 'upcoming', 'waiting', 'in_progress', 'completed', 'cancelled')) DEFAULT 'booked',
    checked_in_at TIMESTAMPTZ,
    consultation_started_at TIMESTAMPTZ,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Blocked Slots Table
CREATE TABLE IF NOT EXISTS blocked_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    is_full_day BOOLEAN DEFAULT false,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, date, time)
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    related_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    patient_id UUID REFERENCES patients ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments ON DELETE SET NULL,
    diagnosis TEXT,
    medicines JSONB DEFAULT '[]'::jsonb,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Expenses Table
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

-- 10. Patient Recalls Table
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

-- 11. Invoices Table
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

-- 12. Payments Table
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

-- 13. Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'عام',
    unit TEXT DEFAULT 'قطعة',
    min_quantity NUMERIC DEFAULT 5,
    current_qty NUMERIC DEFAULT 0,
    cost_per_unit NUMERIC DEFAULT 0,
    lot_number TEXT,
    expiry_date DATE,
    is_disposable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_id ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_id ON expenses(clinic_id);
CREATE INDEX IF NOT EXISTS idx_recalls_clinic_id ON patient_recalls(clinic_id);

-- 15. Enable Row Level Security (RLS) on all tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- 16. Universal Access Policies for ClinicFlow Web Client (Anon & Authenticated)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'clinics', 'staff_members', 'patients', 'appointments', 
            'blocked_slots', 'notifications', 'prescriptions', 'expenses', 
            'patient_recalls', 'invoices', 'payments', 'inventory_items'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_open_access ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_open_access ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- 17. Seed the 3 Clinics Registered Across Devices
INSERT INTO clinics (id, name, slug, doctor_name, specialty, subscription_tier, subscription_status, is_lifetime_license, agreement_amount, quotas)
VALUES 
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'عيادة د. domya auto',
    'dr-domyaauto',
    'د. domya auto',
    'جراحة العظام والمفاصل والعمود الفقري',
    'pro',
    'active',
    false,
    0,
    '{"maxPatients": 10000, "maxDoctors": 3, "monthlySmsQuota": 1000, "smsUsed": 0}'::jsonb
),
(
    'b2c3d4e5-f6a1-4b5c-9d0e-1f2a3b4c5d6e',
    'عيادة د. Mohamed Saeed',
    'dr-mo1momo3mo16',
    'د. Mohamed Saeed',
    'النساء والتوليد ورعاية الحوامل وعلاج العقم',
    'pro',
    'lifetime',
    true,
    25000,
    '{"maxPatients": 10000, "maxDoctors": 3, "monthlySmsQuota": 1000, "smsUsed": 0}'::jsonb
),
(
    'c3d4e5f6-a1b2-4c5d-0e1f-2a3b4c5d6e7f',
    'عيادة د. Mohamed Saeed',
    'dr-mohammedsaeed6u',
    'د. Mohamed Saeed',
    'طب وجراحة الفم والأسنان العام',
    'pro',
    'active',
    false,
    0,
    '{"maxPatients": 10000, "maxDoctors": 3, "monthlySmsQuota": 1000, "smsUsed": 0}'::jsonb
),
(
    'd4e5f6a1-b2c3-4d5e-0f1a-2b3c4d5e6f7a',
    'عيادة د. Rama Sarg',
    'dr-ramasarg0',
    'د. Rama Sarg',
    'طب وجراحة الفم والأسنان العام',
    'pro',
    'active',
    false,
    0,
    '{"maxPatients": 10000, "maxDoctors": 3, "monthlySmsQuota": 1000, "smsUsed": 0}'::jsonb
)
ON CONFLICT (slug) DO UPDATE 
SET 
    name = EXCLUDED.name,
    doctor_name = EXCLUDED.doctor_name,
    specialty = EXCLUDED.specialty,
    subscription_tier = EXCLUDED.subscription_tier,
    subscription_status = EXCLUDED.subscription_status,
    is_lifetime_license = EXCLUDED.is_lifetime_license,
    agreement_amount = EXCLUDED.agreement_amount;

-- 18. ESR Composite Indexes for 100M-Scale Keyset Cursor Pagination
CREATE INDEX IF NOT EXISTS idx_patients_clinic_created ON patients (clinic_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date_time ON appointments (clinic_id, date, time);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_status_date ON appointments (clinic_id, status, date);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_created ON invoices (clinic_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_staff_clinic_status ON staff_members (clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_created ON notifications (clinic_id, created_at DESC);

