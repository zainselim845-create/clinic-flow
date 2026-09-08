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

-- 4. Multi-Tenant Membership Verification Function
CREATE OR REPLACE FUNCTION is_member_of_clinic(target_clinic_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF target_clinic_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- A. Transaction current_clinic_id match
    IF get_active_clinic_id() IS NOT NULL AND get_active_clinic_id() = target_clinic_id THEN
        RETURN TRUE;
    END IF;

    -- B. Platform Super Admin bypass
    IF EXISTS (
        SELECT 1 FROM tenant_members 
        WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    ) THEN
        RETURN TRUE;
    END IF;

    -- C. Direct Clinic Owner
    IF EXISTS (
        SELECT 1 FROM clinics 
        WHERE id = target_clinic_id AND owner_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- D. Verified Tenant Member
    IF EXISTS (
        SELECT 1 FROM tenant_members 
        WHERE clinic_id = target_clinic_id AND user_id = auth.uid() AND is_active = true
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Strict RLS Policies Enforcing clinic_id = get_active_clinic_id()
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
    USING (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id)) 
    WITH CHECK (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id));

-- Patients RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on patients" ON patients;
CREATE POLICY "Enforce tenant isolation on patients" ON patients 
    FOR ALL TO authenticated 
    USING (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id)) 
    WITH CHECK (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id));

-- Invoices RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on invoices" ON invoices;
CREATE POLICY "Enforce tenant isolation on invoices" ON invoices 
    FOR ALL TO authenticated 
    USING (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id)) 
    WITH CHECK (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id));

-- Inventory RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on inventory" ON inventory_items;
CREATE POLICY "Enforce tenant isolation on inventory" ON inventory_items 
    FOR ALL TO authenticated 
    USING (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id)) 
    WITH CHECK (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id));

-- Notifications RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on notifications" ON notifications;
CREATE POLICY "Enforce tenant isolation on notifications" ON notifications 
    FOR ALL TO authenticated 
    USING (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id)) 
    WITH CHECK (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id));

-- Branches RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on branches" ON branches;
CREATE POLICY "Enforce tenant isolation on branches" ON branches 
    FOR ALL TO authenticated 
    USING (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id)) 
    WITH CHECK (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id));

-- Doctors RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on doctors" ON doctors;
CREATE POLICY "Enforce tenant isolation on doctors" ON doctors 
    FOR ALL TO authenticated 
    USING (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id)) 
    WITH CHECK (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id));

-- Tenant Members RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on tenant_members" ON tenant_members;
CREATE POLICY "Enforce tenant isolation on tenant_members" ON tenant_members 
    FOR ALL TO authenticated 
    USING (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id) OR user_id = auth.uid()) 
    WITH CHECK (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id));

-- Expenses RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on expenses" ON expenses;
CREATE POLICY "Enforce tenant isolation on expenses" ON expenses 
    FOR ALL TO authenticated 
    USING (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id)) 
    WITH CHECK (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id));

-- Patient Recalls RLS
DROP POLICY IF EXISTS "Enforce tenant isolation on recalls" ON patient_recalls;
CREATE POLICY "Enforce tenant isolation on recalls" ON patient_recalls 
    FOR ALL TO authenticated 
    USING (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id)) 
    WITH CHECK (clinic_id = get_active_clinic_id() OR is_member_of_clinic(clinic_id));
