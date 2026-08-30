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
