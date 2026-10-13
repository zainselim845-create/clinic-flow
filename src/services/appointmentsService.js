import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { apiCache } from './apiCacheService';
import { appointmentSchema, validateWithSchema } from '../utils/validationSchemas';
import { executeWithIdempotency } from './idempotencyService';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export const DEFAULT_APPOINTMENT_COLUMNS = 'id, booking_code, clinic_id, doctor_id, doctor_name, branch_id, patient_id, patient_name, patient_phone, date, time, type, fee, status, checked_in_at, consultation_started_at, notes, reminder_sent, deleted_at, created_at';

// In-flight slot lock map to serialize concurrent booking bursts for the same slot
const inFlightSlotLocks = new Map();

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
 * 
 * @param {string} clinicId - Clinic ID or slug
 * @param {string} date - Date string YYYY-MM-DD
 * @param {string} time - Time slot e.g. "05:00 م"
 * @param {string} [excludeAppointmentId=null] - Optional appointment ID to exclude
 * @param {Array} [inMemoryAppointments=[]] - Optional memory store for offline mode
 * @param {string} [doctorId=null] - Optional doctor ID for multi-doctor clinics
 * @returns {Promise<boolean>} True if collision exists, false if slot is available
 */
export async function checkSlotCollision(clinicId, date, time, excludeAppointmentId = null, inMemoryAppointments = [], doctorId = null) {
  let excludeId = excludeAppointmentId;
  let appointmentsList = inMemoryAppointments;

  // Polymorphic support: if 4th argument is an array, treat it as inMemoryAppointments
  if (Array.isArray(excludeAppointmentId) && appointmentsList.length === 0) {
    appointmentsList = excludeAppointmentId;
    excludeId = null;
  }

  // 1. Check in-memory / local appointments first (works offline & in tests)
  if (appointmentsList && appointmentsList.length > 0) {
    const collision = appointmentsList.some(apt => {
      const matchClinic = !clinicId || !apt.clinicId || apt.clinicId === clinicId;
      const matchDate = apt.date === date;
      const matchTime = apt.time === time;
      const matchDoctor = !doctorId || !apt.doctorId || apt.doctorId === doctorId;
      const notExcluded = !excludeId || String(apt.id) !== String(excludeId);
      const isNotCancelled = apt.status !== 'cancelled';
      return matchClinic && matchDate && matchTime && matchDoctor && notExcluded && isNotCancelled;
    });
    if (collision) return true;
  }

  // 2. Check Supabase if configured
  if (isSupabaseConfigured() && typeof supabase?.from === 'function') {
    try {
      const table = supabase.from('appointments');
      if (typeof table?.select === 'function') {
        let query = table.select('id');
        if (typeof query?.eq === 'function') {
          query = query
            .eq('clinic_id', clinicId)
            .eq('date', date)
            .eq('time', time);
          if (doctorId) {
            query = query.eq('doctor_id', doctorId);
          }
          if (typeof query?.not === 'function') {
            query = query.not('status', 'in', '("cancelled","refunded")');
          }
          if (excludeAppointmentId && typeof query?.neq === 'function') {
            query = query.neq('id', excludeAppointmentId);
          }
          if (typeof query?.limit === 'function') {
            query = query.limit(1);
          }
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          return true;
        }
      }
    } catch (err) {
      console.warn('[AppointmentsService] Slot conflict check note:', err);
    }
  }

  return false;
}

/**
 * Add a new appointment with atomic concurrency protection and idempotency
 */
export async function addAppointment(appointment, options = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  const clinicId = appointment?.clinicId || appointment?.clinic_id;
  if (!appointment || !clinicId) {
    return { data: null, error: new Error('Clinic ID is strictly required to add an appointment') };
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
    return { data: null, error: new Error(`Validation Error: ${validation.error}`) };
  }

  const doctorId = appointment?.doctorId || appointment?.doctor_id || null;
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
      // 1. Verify slot collision honoring doctorId
      const isColliding = await checkSlotCollision(clinicId, appointment.date, appointment.time, null, [], doctorId);
      if (isColliding) {
        return { 
          data: null, 
          error: new Error(`Slot collision: The requested slot on ${appointment.date} at ${appointment.time} is already booked.`) 
        };
      }

      const dbPayload = toDbAppointment(appointment);
      const { data, error } = await supabase
        .from('appointments')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        // Catch Postgres unique violation (code 23505) or duplicate slot key error
        if (error.code === '23505' || String(error.message || '').toLowerCase().includes('unique') || String(error.message || '').toLowerCase().includes('duplicate')) {
          return {
            data: null,
            error: new Error(`Slot collision: The requested slot on ${appointment.date} at ${appointment.time} is already booked.`)
          };
        }
        throw error;
      }

      apiCache.invalidateResource('appointments', clinicId);
      return { data: fromDbAppointment(data), error: null };
    } catch (error) {
      console.error('Error adding appointment:', error);
      return { data: null, error };
    } finally {
      releaseLock?.();
      inFlightSlotLocks.delete(slotLockKey);
    }
  }, { clinicId });

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
      const isColliding = await checkSlotCollision(targetClinicId, updateData.date, updateData.time, id, [], doctorId);
      if (isColliding) {
        return {
          data: null,
          error: new Error(`Slot collision: The requested slot on ${updateData.date} at ${updateData.time} is already booked.`)
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
 * Get all booked time slots for a given date
 */
export async function getBookedSlotsForDate(clinicId, date) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  if (!clinicId) {
    return { data: [], error: new Error('Clinic ID is strictly required to get booked slots') };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('time')
      .eq('clinic_id', clinicId)
      .eq('date', date)
      .neq('status', 'cancelled');

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
      .select('*', { count: 'exact' })
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

