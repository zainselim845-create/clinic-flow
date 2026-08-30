-- ============================================================================
-- Migration V3: Scalability & Performance Indexes for 100,000+ Records
-- ============================================================================

-- 1. Patients Scale Indexes
CREATE INDEX IF NOT EXISTS idx_patients_phone_btree ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_created ON patients(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);

-- 2. Appointments Scale Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_phone ON appointments(patient_phone);

-- 3. Clinical Modules Scale Indexes
CREATE INDEX IF NOT EXISTS idx_dental_chart_patient_id ON dental_chart(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_id ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_id ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_status ON invoices(clinic_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_wallets_patient_id ON patient_wallets(patient_id);
