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

