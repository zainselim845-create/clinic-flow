-- =========================================================================
-- ClinicFlow Database Hardening: Atomic Appointment Booking, Unique Slots &
-- Persistent Server-Side Idempotency
-- Migration: 20261013_atomic_appointment_booking.sql
-- =========================================================================

-- 1. Pre-Migration Data Collision Check (Safety Gate)
-- Fails loudly if existing data contains duplicates, preventing silent data corruption
-- and requiring human review/resolution before applying the unique index.
DO $$
DECLARE
    v_collision_count INT;
BEGIN
    SELECT COUNT(*) INTO v_collision_count
    FROM (
        SELECT clinic_id, COALESCE(doctor_id, '00000000-0000-0000-0000-000000000000'::uuid) as doc, date, time
        FROM public.appointments
        WHERE status NOT IN ('cancelled', 'refunded') AND deleted_at IS NULL
        GROUP BY clinic_id, doc, date, time
        HAVING COUNT(*) > 1
    ) collisions;

    IF v_collision_count > 0 THEN
        RAISE EXCEPTION 'MIGRATION HALTED: Found % duplicate active appointment slot(s). Resolve collisions before applying idx_appointments_unique_active_slot.', v_collision_count;
    END IF;
END $$;

-- 2. Schema Alignment: Ensure required columns exist on public.appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS duration_min INTEGER DEFAULT 30;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS start_minute INTEGER;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS end_minute INTEGER;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Partial Unique Index: Prevent duplicate concurrent bookings on the exact same slot
-- Applies strictly to active (non-cancelled, non-refunded, non-deleted) appointments.
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_active_slot
ON public.appointments (
    clinic_id, 
    COALESCE(doctor_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    date, 
    time
)
WHERE COALESCE(status, 'booked') NOT IN ('cancelled', 'refunded') AND deleted_at IS NULL;

-- 4. Persistent Server-Side Idempotency Keys Table with RLS & Operation Scoping
-- Guarantees distributed, crash-resilient idempotency backed by database constraints and RLS.
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    clinic_id UUID NOT NULL REFERENCES public.clinics ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users ON DELETE SET NULL,
    operation_type TEXT NOT NULL DEFAULT 'appointment_booking',
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    recovery_point TEXT,
    response_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    CONSTRAINT uq_idempotency_scoped UNIQUE (clinic_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), operation_type, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scoped_lookup 
ON public.idempotency_keys(clinic_id, user_id, operation_type, key);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at 
ON public.idempotency_keys(expires_at);

-- Enable RLS and restrict permissions on idempotency_keys
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "idempotency_tenant_isolation" ON public.idempotency_keys;
CREATE POLICY "idempotency_tenant_isolation" ON public.idempotency_keys
FOR ALL TO authenticated
USING (
    clinic_id IN (SELECT clinic_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND (user_id = auth.uid() OR user_id IS NULL)
);

DROP POLICY IF EXISTS "idempotency_service_role" ON public.idempotency_keys;
CREATE POLICY "idempotency_service_role" ON public.idempotency_keys
FOR ALL TO service_role
USING (true);

REVOKE ALL ON TABLE public.idempotency_keys FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.idempotency_keys TO authenticated;
GRANT ALL ON TABLE public.idempotency_keys TO service_role;

-- 4. Helper Function: Time parser to minutes from midnight (Supports Arabic and 24h formats)
CREATE OR REPLACE FUNCTION public.parse_time_to_minutes(p_time TEXT)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_clean TEXT;
    v_is_pm BOOLEAN;
    v_is_am BOOLEAN;
    v_parts TEXT[];
    v_hours INT;
    v_mins INT;
BEGIN
    IF p_time IS NULL THEN RETURN NULL; END IF;
    v_clean := trim(p_time);
    v_is_pm := (v_clean LIKE '%م%');
    v_is_am := (v_clean LIKE '%ص%');
    v_clean := regexp_replace(v_clean, '[^0-9:]', '', 'g');
    v_parts := string_to_array(v_clean, ':');
    IF array_length(v_parts, 1) < 2 THEN RETURN NULL; END IF;
    v_hours := v_parts[1]::INT;
    v_mins := v_parts[2]::INT;
    IF v_is_pm AND v_hours < 12 THEN
        v_hours := v_hours + 12;
    ELSIF v_is_am AND v_hours = 12 THEN
        v_hours := 0;
    END IF;
    RETURN (v_hours * 60) + v_mins;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 5. Hardened Atomic Transactional RPC: book_appointment_atomic
-- Eliminates TOCTOU race conditions via advisory locks, enforces duration overlap prevention,
-- validates caller authorization against protected tables, prevents SQLERRM leak,
-- and records persistent server-side idempotency.
CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
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
    p_branch_id UUID DEFAULT NULL,
    p_duration_min INTEGER DEFAULT 30,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_is_authorized BOOLEAN := FALSE;
    v_existing_id UUID;
    v_existing_appointment public.appointments%ROWTYPE;
    v_new_appointment public.appointments%ROWTYPE;
    v_idemp_record public.idempotency_keys%ROWTYPE;
    v_lock_key BIGINT;
    v_final_booking_code TEXT;
    v_req_start INTEGER;
    v_req_duration INTEGER;
    v_req_end INTEGER;
BEGIN
    -- 1. Server-Enforced Authentication & Caller Verification
    v_caller_id := auth.uid();

    -- Allow service_role (backend worker / serverless API)
    IF current_user = 'service_role' OR session_user = 'service_role' THEN
        v_is_authorized := TRUE;
    -- Authenticated client check against protected database tables (cannot be client-spoofed)
    ELSIF v_caller_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.tenant_members 
            WHERE user_id = v_caller_id AND role = 'super_admin' AND is_active = true
        ) OR EXISTS (
            SELECT 1 FROM public.clinics 
            WHERE id = p_clinic_id AND owner_id = v_caller_id
        ) OR EXISTS (
            SELECT 1 FROM public.tenant_members 
            WHERE clinic_id = p_clinic_id AND user_id = v_caller_id AND is_active = true
        ) OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = v_caller_id AND (clinic_id = p_clinic_id OR role = 'super_admin')
        ) THEN
            v_is_authorized := TRUE;
        END IF;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'UNAUTHORIZED',
            'message', 'Caller is not authorized to book appointments for this clinic.'
        );
    END IF;

    -- 2. Input Parameter Validation
    IF p_clinic_id IS NULL OR p_date IS NULL OR p_time IS NULL OR length(trim(p_time)) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_PARAMETERS',
            'message', 'Clinic ID, appointment date, and time slot are strictly required.'
        );
    END IF;

    -- Validate booking status whitelist
    IF p_status IS NOT NULL AND p_status NOT IN ('booked', 'confirmed', 'waiting', 'pending') THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_STATUS',
            'message', 'Invalid initial booking status. Allowed values: booked, confirmed, waiting, pending.'
        );
    END IF;

    v_final_booking_code := COALESCE(p_booking_code, p_idempotency_key, 'BK-' || upper(substr(md5(random()::text), 1, 6)));

    -- 3. Persistent Server-Side Idempotency Check (Scoped to clinic, user, operation_type, and key)
    IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
        SELECT * INTO v_idemp_record
        FROM public.idempotency_keys
        WHERE clinic_id = p_clinic_id 
          AND operation_type = 'appointment_booking'
          AND (user_id = v_caller_id OR (user_id IS NULL AND v_caller_id IS NULL))
          AND key = p_idempotency_key
          AND expires_at > NOW()
        LIMIT 1;

        IF v_idemp_record.id IS NOT NULL AND v_idemp_record.status = 'completed' THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_replay', true,
                'data', v_idemp_record.response_payload
            );
        END IF;

        -- Fallback: Check existing appointment with matching booking_code
        SELECT * INTO v_existing_appointment
        FROM public.appointments
        WHERE clinic_id = p_clinic_id
          AND (booking_code = p_idempotency_key OR booking_code = v_final_booking_code)
        LIMIT 1;

        IF v_existing_appointment.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_replay', true,
                'data', to_jsonb(v_existing_appointment)
            );
        END IF;
    END IF;

    -- 4. Transactional Advisory Locking (Scoped to clinic, branch, doctor, date)
    -- Locks the schedule interval domain for this doctor/branch on this day to prevent concurrent race conditions
    v_lock_key := ('x' || substr(md5(p_clinic_id::text || '_' || COALESCE(p_branch_id::text, 'all') || '_' || COALESCE(p_doctor_id::text, 'general') || '_' || p_date::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 5. Collision Check (Duration Overlap, Doctor, Branch, Active Status)
    v_req_start := public.parse_time_to_minutes(p_time);
    v_req_duration := COALESCE(p_duration_min, 30);
    v_req_end := v_req_start + v_req_duration;

    SELECT id INTO v_existing_id
    FROM public.appointments
    WHERE clinic_id = p_clinic_id
      AND date = p_date
      AND (
          (p_doctor_id IS NULL AND (doctor_id IS NULL OR doctor_id = '00000000-0000-0000-0000-000000000000'::uuid))
          OR (p_doctor_id IS NOT NULL AND (doctor_id = p_doctor_id OR doctor_id IS NULL))
      )
      AND (
          (p_branch_id IS NULL AND (branch_id IS NULL OR true))
          OR (p_branch_id IS NOT NULL AND (branch_id = p_branch_id OR branch_id IS NULL))
      )
      AND COALESCE(status, 'booked') NOT IN ('cancelled', 'refunded')
      AND deleted_at IS NULL
      AND (
          -- Interval overlap check when both times are parseable: [req_start, req_end) vs [exist_start, exist_end)
          (
              v_req_start IS NOT NULL 
              AND public.parse_time_to_minutes(time) IS NOT NULL 
              AND v_req_start < (public.parse_time_to_minutes(time) + COALESCE(duration_min, 30))
              AND public.parse_time_to_minutes(time) < v_req_end
          )
          -- Fallback exact string match
          OR (trim(time) = trim(p_time))
      )
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SLOT_COLLISION',
            'message', 'Slot collision: The requested slot on ' || p_date || ' at ' || p_time || ' is already booked or overlaps with an active appointment.'
        );
    END IF;

    -- 6. Atomic Insertion
    INSERT INTO public.appointments (
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
        duration_min,
        start_minute,
        end_minute,
        created_at
    ) VALUES (
        p_clinic_id,
        p_doctor_id,
        p_patient_id,
        COALESCE(p_patient_name, ''),
        COALESCE(p_patient_phone, ''),
        p_date,
        trim(p_time),
        COALESCE(p_type, 'كشف عادي'),
        COALESCE(p_fee, '300 ج.م'),
        COALESCE(p_status, 'booked'),
        v_final_booking_code,
        p_notes,
        p_branch_id,
        v_req_duration,
        v_req_start,
        v_req_end,
        NOW()
    ) RETURNING * INTO v_new_appointment;

    -- 7. Persist Idempotency Record
    IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
        INSERT INTO public.idempotency_keys (
            key,
            clinic_id,
            user_id,
            operation_type,
            status,
            recovery_point,
            response_payload,
            expires_at
        ) VALUES (
            p_idempotency_key,
            p_clinic_id,
            v_caller_id,
            'appointment_booking',
            'completed',
            'book_appointment_atomic',
            to_jsonb(v_new_appointment),
            NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (clinic_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), operation_type, key) 
        DO UPDATE SET status = 'completed',
                      response_payload = to_jsonb(v_new_appointment);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_replay', false,
        'data', to_jsonb(v_new_appointment)
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SLOT_COLLISION',
            'message', 'Slot collision: Concurrent booking detected on ' || p_date || ' at ' || p_time || '.'
        );
    WHEN OTHERS THEN
        -- Log internal diagnostic warning safely inside Postgres
        RAISE WARNING 'book_appointment_atomic internal failure: % %', SQLSTATE, SQLERRM;
        -- Return generic sanitized message to caller (no SQLERRM leak)
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INTERNAL_ERROR',
            'message', 'A database error occurred while processing the appointment booking.'
        );
END;
$$;

-- 6. Restrict Execution Privileges (Principle of Least Privilege)
REVOKE ALL ON FUNCTION public.book_appointment_atomic(UUID, UUID, UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_appointment_atomic(UUID, UUID, UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.book_appointment_atomic(UUID, UUID, UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, INTEGER, TEXT) TO authenticated, service_role;
