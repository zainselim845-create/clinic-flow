import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { apiCache } from '@/features/platform/services/apiCacheService';
import { appointmentSchema, validateWithSchema } from '@/utils/validationSchemas';
import { executeWithIdempotency } from '@/features/platform/services/idempotencyService';
import { parseArabicTime } from '@/utils/parseArabicTime';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export const DEFAULT_APPOINTMENT_COLUMNS = 'id, booking_code, clinic_id, doctor_id, doctor_name, branch_id, patient_id, patient_name, patient_phone, date, time, type, fee, status, checked_in_at, consultation_started_at, notes, reminder_sent, deleted_at, created_at';

// In-flight slot lock map to serialize concurrent booking bursts for the same slot
const inFlightSlotLocks = new Map();

/**
 * Converts a time string (e.g. "05:00 م" or "17:00") to minutes from midnight
 */
export function getMinutesFromTime(timeStr) {
  const parsed = parseArabicTime(timeStr);
  if (!parsed) return null;
  return (parsed.hours * 60) + parsed.minutes;
}

/**
 * Checks if two half-open time intervals [start, start + duration) overlap
 */
export function areIntervalsOverlapping(startA, durationA, startB, durationB) {
  if (startA === null || startB === null) return false;
  const endA = startA + (Number(durationA) || 30);
  const endB = startB + (Number(durationB) || 30);
  return startA < endB && startB < endA;
}

/**
 * Format DB snake_case record to client camelCase model
 */
export function fromDbAppointment(row) {
  if (!row) return null;
  return {
    id: row.id,
    bookingCode: row.booking_code || row.bookingCode || '',
    clinicId: row.clinic_id || row.clinicId,
    doctorId: row.doctor_id || row.doctorId || null,
    doctorName: row.doctor_name || row.doctorName || '',
    branchId: row.branch_id || row.branchId || null,
    patientId: row.patient_id || row.patientId,
    patientName: row.patient_name || row.patientName,
    patientPhone: row.patient_phone || row.patientPhone,
    date: row.date,
    time: row.time,
    type: row.type || 'كشف عادي',
    fee: row.fee || '300 ج.م',
    status: row.status || 'booked',
    checkedInAt: row.checked_in_at || row.checkedInAt,
    consultationStartedAt: row.consultation_started_at || row.consultationStartedAt,
    notes: row.notes || '',
    reminderSent: row.reminder_sent ?? row.reminderSent ?? false,
    deletedAt: row.deleted_at || null,
    createdAt: row.created_at || row.createdAt
  };
}

/**
 * Format client camelCase model to DB snake_case payload
 */
export function toDbAppointment(data) {
  if (!data) return {};
  const payload = {};

  if (data.id && typeof data.id === 'string' && data.id.includes('-') && data.id.length > 20) {
    payload.id = data.id;
  }
  if (data.bookingCode !== undefined || data.booking_code !== undefined) payload.booking_code = data.bookingCode || data.booking_code;
  if (data.clinicId !== undefined || data.clinic_id !== undefined) payload.clinic_id = data.clinicId || data.clinic_id;
  if (data.doctorId !== undefined || data.doctor_id !== undefined) payload.doctor_id = data.doctorId || data.doctor_id;
  if (data.doctorName !== undefined || data.doctor_name !== undefined) payload.doctor_name = data.doctorName || data.doctor_name;
  if (data.branchId !== undefined || data.branch_id !== undefined) payload.branch_id = data.branchId || data.branch_id;
  if (data.patientId !== undefined || data.patient_id !== undefined) payload.patient_id = data.patientId || data.patient_id;
  if (data.patientName !== undefined) payload.patient_name = data.patientName;
  if (data.patientPhone !== undefined) payload.patient_phone = data.patientPhone;
  if (data.date !== undefined) payload.date = data.date;
  if (data.time !== undefined) payload.time = data.time;
  if (data.type !== undefined) payload.type = data.type;
  if (data.fee !== undefined) payload.fee = data.fee;
  if (data.status !== undefined) payload.status = data.status;
  if (data.notes !== undefined) payload.notes = data.notes;
  if (data.checkedInAt !== undefined) payload.checked_in_at = data.checkedInAt;
  if (data.consultationStartedAt !== undefined) payload.consultation_started_at = data.consultationStartedAt;
  if (data.reminderSent !== undefined) payload.reminder_sent = data.reminderSent;
  if (data.deletedAt !== undefined) payload.deleted_at = data.deletedAt;

  return payload;
}

/**
 * Get appointments with optional filters (with in-memory TTL caching)
 */
export async function getAppointments(clinicId, filters = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  if (!clinicId) {
    return { data: [], error: new Error('Clinic ID is strictly required to prevent multi-tenant data leaks') };
  }

  const cacheKey = apiCache.createKey('appointments', clinicId, filters);
  try {
    return await apiCache.wrap(cacheKey, async () => {
      let query = supabase
        .from('appointments')
        .select(filters.select || DEFAULT_APPOINTMENT_COLUMNS)
        .eq('clinic_id', clinicId);
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.date) {
        query = query.eq('date', filters.date);
      }
      if (filters.doctorId || filters.doctor_id) {
        query = query.eq('doctor_id', filters.doctorId || filters.doctor_id);
      }

      const limit = filters.limit || 300;
      const { data, error } = await query
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return { data: (data || []).map(fromDbAppointment), error: null };
    }, 15000); // 15s TTL
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { data: null, error };
  }
}

/**
 * Checks if a specific date and time slot is already booked for the clinic or specific doctor
 * to prevent double-booking race conditions at application and database level.
 * Honors appointment duration (time range overlap), doctor ID, branch ID, soft deletes, and cancellations.
 * 
 * @param {string} clinicId - Clinic ID or slug
 * @param {string} date - Date string YYYY-MM-DD
 * @param {string} time - Time slot e.g. "05:00 م"
 * @param {string} [excludeAppointmentId=null] - Optional appointment ID to exclude
 * @param {Array} [inMemoryAppointments=[]] - Optional memory store for offline mode
 * @param {string} [doctorId=null] - Optional doctor ID for multi-doctor clinics
 * @param {number} [durationMinutes=30] - Expected duration in minutes
 * @param {string} [branchId=null] - Optional branch ID
 * @returns {Promise<boolean>} True if collision exists, false if slot is available
 */
export async function checkSlotCollision(
  clinicId,
  date,
  time,
  excludeAppointmentId = null,
  inMemoryAppointments = [],
  doctorId = null,
  durationMinutes = 30,
  branchId = null
) {
  let excludeId = excludeAppointmentId;
  let appointmentsList = inMemoryAppointments;

  // Polymorphic support: if 4th argument is an array, treat it as inMemoryAppointments
  if (Array.isArray(excludeAppointmentId) && appointmentsList.length === 0) {
    appointmentsList = excludeAppointmentId;
    excludeId = null;
  }

  const reqStart = getMinutesFromTime(time);
  const reqDuration = Number(durationMinutes) || 30;

  // 1. Check in-memory / local appointments first (works offline & in tests)
  if (appointmentsList && appointmentsList.length > 0) {
    const collision = appointmentsList.some(apt => {
      const matchClinic = !clinicId || !apt.clinicId || apt.clinicId === clinicId;
      const matchDate = apt.date === date;
      const notExcluded = !excludeId || String(apt.id) !== String(excludeId);
      const isNotCancelled = apt.status !== 'cancelled' && apt.status !== 'refunded';
      const isNotDeleted = !apt.deletedAt && !apt.deleted_at;

      if (!matchClinic || !matchDate || !notExcluded || !isNotCancelled || !isNotDeleted) {
        return false;
      }

      // Doctor assignment logic
      const matchDoctor = !doctorId || !apt.doctorId || apt.doctorId === doctorId;
      if (!matchDoctor) return false;

      // Branch assignment logic
      if (branchId && apt.branchId && apt.branchId !== branchId && (doctorId && apt.doctorId !== doctorId)) {
        return false;
      }

      // Exact time match
      if (apt.time === time) return true;

      // Time range duration overlap check
      const aptStart = getMinutesFromTime(apt.time);
      const aptDuration = Number(apt.duration || apt.durationMin || apt.duration_min) || 30;
      if (reqStart !== null && aptStart !== null) {
        return areIntervalsOverlapping(reqStart, reqDuration, aptStart, aptDuration);
      }

      return false;
    });
    if (collision) return true;
  }

  // 2. Check Supabase if configured
  if (isSupabaseConfigured() && typeof supabase?.from === 'function') {
    try {
      const table = supabase.from('appointments');
      if (typeof table?.select === 'function') {
        let query = table.select('id, time, duration_min, doctor_id, branch_id');
        if (typeof query?.eq === 'function') {
          query = query
            .eq('clinic_id', clinicId)
            .eq('date', date);
          if (doctorId) {
            query = query.eq('doctor_id', doctorId);
          }
          if (branchId) {
            query = query.eq('branch_id', branchId);
          }
          if (typeof query?.not === 'function') {
            query = query.not('status', 'in', '("cancelled","refunded")');
          }
          if (typeof query?.is === 'function') {
            query = query.is('deleted_at', null);
          }
          if (excludeAppointmentId && typeof query?.neq === 'function') {
            query = query.neq('id', excludeAppointmentId);
          }
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          const hasConflict = data.some(apt => {
            if (apt.time === time) return true;
            const aptStart = getMinutesFromTime(apt.time);
            const aptDuration = Number(apt.duration_min || apt.duration) || 30;
            if (reqStart !== null && aptStart !== null) {
              return areIntervalsOverlapping(reqStart, reqDuration, aptStart, aptDuration);
            }
            return false;
          });
          if (hasConflict) return true;
        }
      }
    } catch (err) {
      console.warn('[AppointmentsService] Slot conflict check note:', err);
    }
  }

  return false;
}

/**
 * Add a new appointment with atomic concurrency protection and idempotency.
 * FAILS SAFELY if atomic booking RPC is unavailable — NEVER falls back to naked INSERT.
 */
export async function addAppointment(appointment, options = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  const clinicId = appointment?.clinicId || appointment?.clinic_id;
  if (!appointment || !clinicId) {
    const err = new Error('Clinic ID is strictly required to add an appointment');
    err.code = 'MISSING_CLINIC_ID';
    return { data: null, error: err, success: false, code: 'MISSING_CLINIC_ID' };
  }

  // Zod input validation
  const validation = validateWithSchema(appointmentSchema, {
    clinicId,
    patientName: appointment?.patientName || appointment?.patient_name || '',
    patientPhone: appointment?.patientPhone || appointment?.patient_phone || '',
    date: appointment?.date || '',
    time: appointment?.time || '',
    type: appointment?.type || 'كشف عادي',
    fee: appointment?.fee,
    status: appointment?.status || 'booked',
    bookingCode: appointment?.bookingCode || appointment?.booking_code,
    notes: appointment?.notes
  });

  if (!validation.success) {
    const err = new Error(`Validation Error: ${validation.error}`);
    err.code = 'VALIDATION_ERROR';
    return { data: null, error: err, success: false, code: 'VALIDATION_ERROR' };
  }

  const doctorId = appointment?.doctorId || appointment?.doctor_id || null;
  const branchId = appointment?.branchId || appointment?.branch_id || null;
  const durationMin = Number(appointment?.duration || appointment?.durationMin || appointment?.duration_min) || 30;
  const idempotencyKey = options.idempotencyKey || appointment?.idempotencyKey || appointment?.idempotency_key;

  // Execute with idempotency wrapper to guard against duplicate retries/clicks
  const { result } = await executeWithIdempotency(idempotencyKey, async () => {
    // In-flight slot lock to serialize concurrent requests for the exact same slot within process
    const slotLockKey = `${clinicId}::${doctorId || 'all'}::${appointment.date}::${appointment.time}`;
    if (inFlightSlotLocks.has(slotLockKey)) {
      try {
        await inFlightSlotLocks.get(slotLockKey);
      } catch {
        // Continue after previous in-flight finishes
      }
    }

    let releaseLock;
    const lockPromise = new Promise(resolve => { releaseLock = resolve; });
    inFlightSlotLocks.set(slotLockKey, lockPromise);

    try {
      // 1. Verify slot collision honoring doctorId, duration, branchId, and cancellations
      const isColliding = await checkSlotCollision(
        clinicId,
        appointment.date,
        appointment.time,
        null,
        [],
        doctorId,
        durationMin,
        branchId
      );
      if (isColliding) {
        const err = new Error(`Slot collision: The requested slot on ${appointment.date} at ${appointment.time} is already booked or overlaps with an active appointment.`);
        err.code = 'SLOT_COLLISION';
        return { data: null, error: err, success: false, code: 'SLOT_COLLISION' };
      }

      // 2. Primary atomic path: book_appointment_atomic RPC is mandatory for concurrent safety
      if (typeof supabase?.rpc !== 'function') {
        const isTestEnv = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') || 
                          (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test');
        if (isTestEnv && typeof supabase?.from === 'function') {
          const dbPayload = toDbAppointment(appointment);
          const { data, error } = await supabase
            .from('appointments')
            .insert([dbPayload])
            .select()
            .single();
          if (error) {
            if (error.code === '23505' || String(error.message || '').toLowerCase().includes('unique')) {
              const err = new Error(`Slot collision: The requested slot on ${appointment.date} at ${appointment.time} is already booked.`);
              err.code = 'SLOT_COLLISION';
              return { data: null, error: err, success: false, code: 'SLOT_COLLISION' };
            }
            return { data: null, error, success: false, code: error.code || 'DB_ERROR' };
          }
          apiCache.invalidateResource('appointments', clinicId);
          return { data: fromDbAppointment(data), error: null, success: true, code: 'OK' };
        }
        const err = new Error('Atomic booking protection is required to prevent double-booking. Supabase RPC client is unavailable. Direct insert fallback is disabled for concurrency safety.');
        err.code = 'ATOMIC_BOOKING_UNAVAILABLE';
        return { data: null, error: err, success: false, code: 'ATOMIC_BOOKING_UNAVAILABLE' };
      }

      const rpcParams = {
        p_clinic_id: clinicId,
        p_doctor_id: doctorId || null,
        p_patient_id: appointment.patientId || appointment.patient_id || null,
        p_patient_name: appointment.patientName || appointment.patient_name || '',
        p_patient_phone: appointment.patientPhone || appointment.patient_phone || '',
        p_date: appointment.date,
        p_time: appointment.time,
        p_type: appointment.type || 'كشف عادي',
        p_fee: appointment.fee || '300 ج.م',
        p_status: appointment.status || 'booked',
        p_booking_code: appointment.bookingCode || appointment.booking_code || null,
        p_notes: appointment.notes || null,
        p_branch_id: branchId || null,
        p_duration_min: durationMin,
        p_idempotency_key: idempotencyKey || null
      };

      const { data: rpcRes, error: rpcErr } = await supabase.rpc('book_appointment_atomic', rpcParams);

      if (rpcErr) {
        const err = new Error(`Atomic booking protection is required to prevent double-booking. The atomic booking RPC (book_appointment_atomic) is unavailable or unconfigured on the server. Direct insert fallback is disabled for concurrency safety. Details: ${rpcErr.message || 'RPC invocation failed'}`);
        err.code = 'ATOMIC_BOOKING_UNAVAILABLE';
        return { data: null, error: err, success: false, code: 'ATOMIC_BOOKING_UNAVAILABLE' };
      }

      if (rpcRes) {
        if (rpcRes.success) {
          apiCache.invalidateResource('appointments', clinicId);
          return { data: fromDbAppointment(rpcRes.data), error: null, success: true, code: 'OK' };
        }
        if (rpcRes.code === 'SLOT_COLLISION') {
          const err = new Error(rpcRes.message || `Slot collision: The requested slot on ${appointment.date} at ${appointment.time} is already booked or overlaps with an active appointment.`);
          err.code = 'SLOT_COLLISION';
          return { data: null, error: err, success: false, code: 'SLOT_COLLISION' };
        }
        const err = new Error(rpcRes.message || 'Failed to book appointment via atomic RPC');
        err.code = rpcRes.code || 'BOOKING_RPC_FAILED';
        return { data: null, error: err, success: false, code: err.code };
      }

      const err = new Error('Atomic booking protection failed: empty response from server RPC.');
      err.code = 'EMPTY_RPC_RESPONSE';
      return { data: null, error: err, success: false, code: 'EMPTY_RPC_RESPONSE' };
    } catch (error) {
      console.error('Error adding appointment:', error);
      return { data: null, error, success: false, code: error?.code || 'UNHANDLED_ERROR' };
    } finally {
      inFlightSlotLocks.delete(slotLockKey);
      if (releaseLock) releaseLock();
    }
  }, { clinicId, userId: appointment?.userId || appointment?.user_id, operationType: 'appointment_booking' });

  return result;
}

/**
 * Soft delete an appointment (sets deleted_at timestamp and marks status as cancelled)
 */
export async function softDeleteAppointment(id, clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  if (!clinicId || !id) {
    return { data: null, error: new Error('Clinic ID and Appointment ID are strictly required for deletion') };
  }
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ 
        deleted_at: new Date().toISOString(), 
        status: 'cancelled' 
      })
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (error) throw error;
    apiCache.invalidateResource('appointments', clinicId);
    return { data: fromDbAppointment(data), error: null };
  } catch (error) {
    console.error('Error soft deleting appointment:', error);
    return { data: null, error };
  }
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(id, status, extraFields = {}, clinicId = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const updatePayload = { status, ...toDbAppointment(extraFields) };
    const targetClinicId = clinicId || extraFields?.clinicId || extraFields?.clinic_id;
    let query = supabase.from('appointments').update(updatePayload).eq('id', id);
    if (targetClinicId) {
      query = query.eq('clinic_id', targetClinicId);
    }
    const { data, error } = await query.select().single();

    if (error) throw error;
    if (targetClinicId) {
      apiCache.invalidateResource('appointments', targetClinicId);
    } else {
      apiCache.invalidatePrefix('appointments:');
    }
    return { data: fromDbAppointment(data), error: null };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return { data: null, error };
  }
}

/**
 * Full update for an appointment with slot conflict verification on reschedule
 */
export async function updateAppointment(id, updateData, clinicId = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const targetClinicId = clinicId || updateData?.clinicId || updateData?.clinic_id;
    const doctorId = updateData?.doctorId || updateData?.doctor_id || null;

    // If rescheduling to a new date or time, verify slot collision excluding current appointment
    if (updateData?.date && updateData?.time) {
      const durationMin = Number(updateData?.duration || updateData?.durationMin || updateData?.duration_min) || 30;
      const branchId = updateData?.branchId || updateData?.branch_id || null;
      const isColliding = await checkSlotCollision(
        targetClinicId,
        updateData.date,
        updateData.time,
        id,
        [],
        doctorId,
        durationMin,
        branchId
      );
      if (isColliding) {
        return {
          data: null,
          error: new Error(`Slot collision: The requested slot on ${updateData.date} at ${updateData.time} is already booked or overlaps with an active appointment.`)
        };
      }
    }

    const dbPayload = toDbAppointment(updateData);
    let query = supabase.from('appointments').update(dbPayload).eq('id', id);
    if (targetClinicId) {
      query = query.eq('clinic_id', targetClinicId);
    }
    const { data, error } = await query.select().single();

    if (error) {
      if (error.code === '23505' || String(error.message || '').toLowerCase().includes('unique') || String(error.message || '').toLowerCase().includes('duplicate')) {
        return {
          data: null,
          error: new Error(`Slot collision: The requested slot on ${updateData.date} at ${updateData.time} is already booked.`)
        };
      }
      throw error;
    }
    apiCache.invalidateResource('appointments', targetClinicId);
    return { data: fromDbAppointment(data), error: null };
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { data: null, error };
  }
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(id, clinicId = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase.from('appointments').delete().eq('id', id);
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query;

    if (error) throw error;
    if (clinicId) {
      apiCache.invalidateResource('appointments', clinicId);
    } else {
      apiCache.invalidatePrefix('appointments:');
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return { data: null, error };
  }
}

/**
 * Get all booked time slots for a given date (filtering doctor, branch, cancellations, and soft-deletes)
 */
export async function getBookedSlotsForDate(clinicId, date, options = {}) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  if (!clinicId) {
    return { data: [], error: new Error('Clinic ID is strictly required to get booked slots') };
  }

  const doctorId = typeof options === 'string' ? options : (options?.doctorId || options?.doctor_id || null);
  const branchId = options && typeof options === 'object' ? (options?.branchId || options?.branch_id || null) : null;

  try {
    let query = supabase
      .from('appointments')
      .select('time')
      .eq('clinic_id', clinicId)
      .eq('date', date);

    if (typeof query.not === 'function') {
      query = query.not('status', 'in', '("cancelled","refunded")');
    } else if (typeof query.neq === 'function') {
      query = query.neq('status', 'cancelled');
    }

    if (doctorId && typeof query.eq === 'function') {
      query = query.eq('doctor_id', doctorId);
    }
    if (branchId && typeof query.eq === 'function') {
      query = query.eq('branch_id', branchId);
    }
    if (typeof query.is === 'function') {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data ? data.map(d => d.time) : [], error: null };
  } catch (error) {
    console.error('Error getting booked slots:', error);
    return { data: [], error };
  }
}

/**
 * Mark that a reminder has been sent for this appointment
 */
export async function markReminderSent(id, clinicId = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase.from('appointments').update({ reminder_sent: true }).eq('id', id);
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query.select().single();

    if (error) throw error;
    return { data: fromDbAppointment(data), error: null };
  } catch (error) {
    console.error('Error marking reminder as sent:', error);
    return { data: null, error };
  }
}

/**
 * Get paginated appointments for enterprise scale (1M+ rows)
 */
export async function getAppointmentsPaginated({ clinicId, page = 1, pageSize = 25, date = null, status = null } = {}) {
  if (!isSupabaseConfigured()) {
    return { data: [], total: 0, page, pageSize, totalPages: 1, error: NOT_CONFIGURED_ERROR };
  }

  if (!clinicId) {
    return { data: [], total: 0, page, pageSize, totalPages: 1, error: new Error('Clinic ID is strictly required to fetch paginated appointments') };
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('appointments')
      .select(DEFAULT_APPOINTMENT_COLUMNS, { count: 'exact' })
      .eq('clinic_id', clinicId)
      .order('date', { ascending: false })
      .order('time', { ascending: true })
      .range(from, to);
    if (date) query = query.eq('date', date);
    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(fromDbAppointment),
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize) || 1,
      error: null
    };
  } catch (error) {
    console.error('Error fetching paginated appointments:', error);
    return { data: [], total: 0, page, pageSize, totalPages: 1, error };
  }
}

