-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- clinics
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    specialty TEXT,
    address TEXT,
    phone TEXT,
    working_hours JSONB,
    owner_id UUID REFERENCES auth.users,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT CHECK (gender IN ('ذكر', 'أنثى', 'غير محدد')),
    phone TEXT,
    email TEXT,
    blood_type TEXT,
    diagnosis TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_visit TIMESTAMPTZ,
    total_visits INTEGER DEFAULT 0
);

-- appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    patient_id UUID REFERENCES patients ON DELETE CASCADE,
    patient_name TEXT,
    patient_phone TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    type TEXT DEFAULT 'كشف عادي',
    status TEXT CHECK (status IN ('upcoming', 'completed', 'cancelled')) DEFAULT 'upcoming',
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- blocked_slots
CREATE TABLE blocked_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, date, time)
);

-- notifications
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

-- Enable RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies

-- Authenticated users (Clinics)
CREATE POLICY "Clinics owner CRUD" ON clinics FOR ALL TO authenticated USING (auth.uid() = owner_id);

-- Authenticated users (Patients)
CREATE POLICY "Patients owner CRUD" ON patients FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

-- Authenticated users (Appointments)
CREATE POLICY "Appointments owner CRUD" ON appointments FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

-- Authenticated users (Blocked slots)
CREATE POLICY "Blocked slots owner CRUD" ON blocked_slots FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

-- Authenticated users (Notifications)
CREATE POLICY "Notifications owner CRUD" ON notifications FOR ALL TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
);

-- Anonymous policies
-- SELECT appointments
CREATE POLICY "Anon SELECT appointments" ON appointments FOR SELECT TO anon USING (true);
-- SELECT blocked_slots
CREATE POLICY "Anon SELECT blocked_slots" ON blocked_slots FOR SELECT TO anon USING (true);
-- INSERT appointments
CREATE POLICY "Anon INSERT appointments" ON appointments FOR INSERT TO anon WITH CHECK (true);
-- INSERT patients
CREATE POLICY "Anon INSERT patients" ON patients FOR INSERT TO anon WITH CHECK (true);

-- Indexes
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_blocked_slots_date_clinic ON blocked_slots(date, clinic_id);
CREATE INDEX idx_notifications_clinic_id ON notifications(clinic_id);

-- Seed default clinic
INSERT INTO clinics (id, name, specialty, address, phone) 
VALUES ('00000000-0000-0000-0000-000000000000', 'العيادة الافتراضية', 'عام', 'العنوان الافتراضي', '0000000000') ON CONFLICT DO NOTHING;
