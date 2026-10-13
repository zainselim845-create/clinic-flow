-- =========================================================================
-- ClinicFlow Database Hardening: Atomic Appointment Booking & Unique Slots
-- Migration: 20261013_atomic_appointment_booking.sql
-- =========================================================================

-- 1. Inspection Query: Detect pre-existing slot collisions before applying unique constraint
-- If this query returns rows, investigate and resolve duplicate active bookings
-- before enforcing the unique index in production:
/*
SELECT clinic_id, COALESCE(doctor_id, '00000000-0000-0000-0000-000000000000'::uuid) as doc, date, time, COUNT(*)
FROM appointments
WHERE status NOT IN ('cancelled', 'refunded') AND deleted_at IS NULL
GROUP BY clinic_id, doc, date, time
HAVING COUNT(*) > 1;
*/

-- 2. Partial Unique Index: Prevent duplicate concurrent bookings on the same slot
-- Applies only to active (non-cancelled, non-refunded, non-deleted) appointments.
-- Uses COALESCE to safely treat NULL doctor_id as a single clinic-wide doctor slot.
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_active_slot
ON appointments (
    clinic_id, 
    COALESCE(doctor_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    date, 
    time
)
WHERE status NOT IN ('cancelled', 'refunded') AND deleted_at IS NULL;

-- 3. Atomic Transactional RPC: book_appointment_atomic
-- Eliminates TOCTOU (Time-of-Check to Time-of-Use) race conditions using
-- transactional advisory locks and safe exception handling.
CREATE OR REPLACE FUNCTION book_appointment_atomic(
    p_clinic_id UUID,
    p_doctor_id UUID,
    p_patient_id UUID,
    p_patient_name TEXT,
    p_patient_phone TEXT,
    p_date DATE,
    p_time TEXT,
    p_type TEXT DEFAULT 'كشف عادي',
    p_fee TEXT DEFAULT '300 ج.م',
    p_status TEXT DEFAULT 'booked',
    p_booking_code TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
    v_new_appointment appointments%ROWTYPE;
    v_lock_key BIGINT;
BEGIN
    -- Derive a 64-bit integer hash for transactional advisory locking
    v_lock_key := ('x' || substr(md5(p_clinic_id::text || '_' || COALESCE(p_doctor_id::text, 'none') || '_' || p_date::text || '_' || p_time), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Check for existing active appointment
    SELECT id INTO v_existing_id
    FROM appointments
    WHERE clinic_id = p_clinic_id
      AND (
          (doctor_id IS NULL AND p_doctor_id IS NULL)
          OR (doctor_id = p_doctor_id)
      )
      AND date = p_date
      AND time = p_time
      AND status NOT IN ('cancelled', 'refunded')
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SLOT_COLLISION',
            'message', 'Slot collision: The requested slot on ' || p_date || ' at ' || p_time || ' is already booked.'
        );
    END IF;

    -- Insert atomically
    INSERT INTO appointments (
        clinic_id,
        doctor_id,
        patient_id,
        patient_name,
        patient_phone,
        date,
        time,
        type,
        fee,
        status,
        booking_code,
        notes,
        branch_id,
        created_at
    ) VALUES (
        p_clinic_id,
        p_doctor_id,
        p_patient_id,
        p_patient_name,
        p_patient_phone,
        p_date,
        p_time,
        COALESCE(p_type, 'كشف عادي'),
        COALESCE(p_fee, '300 ج.م'),
        COALESCE(p_status, 'booked'),
        COALESCE(p_booking_code, 'BK-' || upper(substr(md5(random()::text), 1, 6))),
        p_notes,
        p_branch_id,
        NOW()
    ) RETURNING * INTO v_new_appointment;

    RETURN jsonb_build_object(
        'success', true,
        'data', to_jsonb(v_new_appointment)
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SLOT_COLLISION',
            'message', 'Slot collision: Concurrent booking detected on ' || p_date || ' at ' || p_time
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ERROR',
            'message', SQLERRM
        );
END;
$$;
