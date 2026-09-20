-- ======================================================================================
-- ClinicFlow Enterprise Database Performance & Indexing Migration
-- Target: PostgreSQL / Supabase
-- Purpose: 
--   1. Accelerate queries on high-traffic columns (clinic_id, date, status, phone, patient_id)
--   2. Eliminate full table scans on multi-tenant data lookups
--   3. Enforce slot uniqueness & double-booking prevention at the database engine level
--   4. Optimize Connection Pooling for Serverless & Edge environments (Supavisor Port 6543)
-- ======================================================================================

-- 1. Patients Table Indexes
-- Compound index for tenant-scoped patient retrieval ordered by creation time
CREATE INDEX IF NOT EXISTS idx_patients_clinic_created 
  ON patients (clinic_id, created_at DESC);

-- Index for instant phone number lookups during booking verification
CREATE INDEX IF NOT EXISTS idx_patients_clinic_phone 
  ON patients (clinic_id, phone);

-- Partial index for patients with outstanding balances (debtors)
CREATE INDEX IF NOT EXISTS idx_patients_clinic_debtors 
  ON patients (clinic_id) 
  WHERE balance > 0;

-- 2. Appointments Table Indexes
-- Compound index for calendar & daily schedule queries
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date_time 
  ON appointments (clinic_id, date, time);

-- Compound index for status-filtered queries (e.g. pending, completed, confirmed)
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_status 
  ON appointments (clinic_id, status);

-- Foreign key index to eliminate N+1 lookup latency when joining patient dossiers
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id 
  ON appointments (patient_id);

-- Booking code lookup for public patient self-service management
CREATE INDEX IF NOT EXISTS idx_appointments_booking_code 
  ON appointments (booking_code);

-- Partial index: prevent slot double-booking for active appointments
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_slot_collision 
  ON appointments (clinic_id, date, time) 
  WHERE status NOT IN ('cancelled', 'refunded');

-- 3. Blocked Slots Table Indexes
CREATE INDEX IF NOT EXISTS idx_blocked_slots_clinic_date 
  ON blocked_slots (clinic_id, date);

-- 4. Recalls Table Indexes
CREATE INDEX IF NOT EXISTS idx_recalls_clinic_due_status 
  ON recalls (clinic_id, due_date, status);

CREATE INDEX IF NOT EXISTS idx_recalls_patient_id 
  ON recalls (patient_id);

-- 5. Expenses & Financial Table Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_date 
  ON expenses (clinic_id, date DESC);

-- 6. Staff & Attendance Table Indexes
CREATE INDEX IF NOT EXISTS idx_staff_clinic_status 
  ON staff_members (clinic_id, status);

-- 7. Clinics Table Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_slug 
  ON clinics (slug);

-- ======================================================================================
-- Connection Pooling Configuration Guidelines (Supabase / Supavisor)
-- ======================================================================================
-- In serverless environments (e.g. Vercel Edge / Functions), avoid direct connections
-- on Port 5432 which exhaust connection pools.
-- Instead, configure the Connection Pooler:
-- Mode: Transaction Mode
-- Host: aws-0-[region].pooler.supabase.com
-- Port: 6543 (Pooler)
-- Pool Size: 15-20 connections per serverless instance
-- ======================================================================================
