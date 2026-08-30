-- ============================================================================
-- DentaLore-Cloud / ClinicFlow Comprehensive Dental Schema Migration (v2.0)
-- Matches Enterprise Dental Architecture (Nebras Dentalore / Hayat Dent)
-- ============================================================================

-- 1. CLINICAL: DENTAL CHART (مخطط الأسنان FDI Two-Digit)
CREATE TABLE IF NOT EXISTS dental_chart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    tooth_number INTEGER NOT NULL, -- 11-48 (Adults) or 51-85 (Pediatric)
    surface VARCHAR(20) DEFAULT 'WHOLE', -- M (Mesial), D (Distal), O (Occlusal), B (Buccal), L (Lingual), ROOT, WHOLE
    condition_code VARCHAR(50) NOT NULL, -- caries, restoration, crown, bridge, implant, missing, rct, veneer, extraction
    status VARCHAR(20) DEFAULT 'existing', -- existing, planned, completed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLINICAL: NOTES & DIAGNOSIS (الملاحظات السريرية والتشخيص)
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    doctor_name VARCHAR(150),
    chief_complaint TEXT,
    diagnosis TEXT,
    treatment_notes TEXT,
    next_visit_plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLINICAL: TREATMENT PLANS (خطط العلاج متعددة الجلسات)
CREATE TABLE IF NOT EXISTS treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    total_cost NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    net_cost NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'draft', -- draft, presented, accepted, in_progress, completed
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS treatment_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,
    tooth_number INTEGER,
    surface VARCHAR(20),
    procedure_name VARCHAR(200) NOT NULL,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    net_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'pending', -- pending, scheduled, completed
    sequence_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONFIG: VISIT TYPES (أنواع الزيارات وخدمات العيادة)
CREATE TABLE IF NOT EXISTS visit_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name_ar VARCHAR(150) NOT NULL,
    name_en VARCHAR(150),
    duration_min INTEGER DEFAULT 30,
    standard_fee NUMERIC(10, 2) DEFAULT 0.00,
    color_code VARCHAR(20) DEFAULT '#0D9488',
    is_default BOOLEAN DEFAULT false,
    is_online BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FINANCIAL: INVOICES & PAYMENTS (الفواتير والمدفوعات والضرائب)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    tax_percentage NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    insurance_share NUMERIC(12, 2) DEFAULT 0.00,
    patient_share NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) DEFAULT 0.00,
    payment_status VARCHAR(30) DEFAULT 'unpaid', -- unpaid, partial, paid, refunded
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'cash', -- cash, card, instapay, wallet
    transaction_ref VARCHAR(100),
    notes TEXT,
    payment_date TIMESTAMPTZ DEFAULT NOW()
);

-- 6. FINANCIAL: PATIENT WALLET (محفظة المريض والأرصدة المقدمة)
CREATE TABLE IF NOT EXISTS patient_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- deposit, deduction, refund
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. OPERATIONS: LAB ORDERS (معامل الأسنان وتتبع التركيبات)
CREATE TABLE IF NOT EXISTS labs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    contact_person VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    lab_id UUID REFERENCES labs(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    work_type VARCHAR(100) NOT NULL, -- zirkon_crown, emax, pfm, bridge, partial_denture, full_denture, appliance
    tooth_number INTEGER,
    shade VARCHAR(30), -- A1, A2, A3, B1, bleach...
    cost NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'pending', -- pending, sent, first_try, adjustment, final_try, delivered
    sent_date DATE,
    due_date DATE,
    received_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. OPERATIONS: INVENTORY (مخزون المستلزمات والإنذارات)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100), -- composite, anesthetics, impression, burs, instruments, infection_control
    unit VARCHAR(30) DEFAULT 'piece', -- piece, box, pack, bottle, syringe
    min_quantity INTEGER DEFAULT 5,
    current_qty INTEGER DEFAULT 0,
    cost_per_unit NUMERIC(10, 2) DEFAULT 0.00,
    lot_number VARCHAR(50),
    expiry_date DATE,
    is_disposable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL, -- in, out, damaged, returned
    quantity INTEGER NOT NULL,
    cost_total NUMERIC(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. OPERATIONS: INSURANCE (شركات التأمين والتغطية)
CREATE TABLE IF NOT EXISTS insurance_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    contact_person VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurance_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES insurance_companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    coverage_pct NUMERIC(5, 2) DEFAULT 80.00,
    max_annual_limit NUMERIC(12, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_insurance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES insurance_plans(id) ON DELETE CASCADE,
    policy_number VARCHAR(50) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. MEDIA: PATIENT IMAGES & X-RAYS (الصور والأشعة السينية)
CREATE TABLE IF NOT EXISTS patient_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    tooth_number INTEGER,
    image_type VARCHAR(30) DEFAULT 'xray', -- xray, panoramic, cbct, intraoral_photo, smile_design
    file_url TEXT NOT NULL,
    title VARCHAR(200),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. STAFF: ATTENDANCE (نظام الحضور والانصراف)
CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff_members(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    total_hours NUMERIC(4, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PATIENT FEEDBACK (استبيانات وتقييمات المرضى)
CREATE TABLE IF NOT EXISTS patient_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. MULTI-TENANCY: BRANCHES & OPERATORIES (الفروع وكراسي العلاج)
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operatories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- كرسي 1، كرسي 2، غرفة الجراحة
    chair_number INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
