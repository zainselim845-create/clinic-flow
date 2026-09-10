import { supabase, isSupabaseConfigured } from '../lib/supabase';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

/**
 * Format DB snake_case record to client camelCase model
 */
export function fromDbAppointment(row) {
  if (!row) return null;
  return {
    id: row.id,
    bookingCode: row.booking_code || row.bookingCode || '',
    clinicId: row.clinic_id || row.clinicId,
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
  if (data.bookingCode !== undefined) payload.booking_code = data.bookingCode;
  if (data.clinicId !== undefined) payload.clinic_id = data.clinicId;
  if (data.patientId !== undefined) payload.patient_id = data.patientId;
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

  return payload;
}

/**
 * Get appointments with optional filters
 */
export async function getAppointments(clinicId, filters = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase
      .from('appointments')
      .select('*');

    if (!clinicId) {
      return { data: [], error: new Error('Clinic ID is strictly required to prevent multi-tenant data leaks') };
    }
    query = query.eq('clinic_id', clinicId);
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.date) {
      query = query.eq('date', filters.date);
    }

    const limit = filters.limit || 300;
    const { data, error } = await query
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { data: (data || []).map(fromDbAppointment), error: null };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { data: null, error };
  }
}

/**
 * Add a new appointment
 */
export async function addAppointment(appointment) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const dbPayload = toDbAppointment(appointment);
    const { data, error } = await supabase
      .from('appointments')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbAppointment(data), error: null };
  } catch (error) {
    console.error('Error adding appointment:', error);
    return { data: null, error };
  }
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(id, status, extraFields = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const updatePayload = { status, ...toDbAppointment(extraFields) };
    const { data, error } = await supabase
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbAppointment(data), error: null };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return { data: null, error };
  }
}

/**
 * Full update for an appointment
 */
export async function updateAppointment(id, updateData) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const dbPayload = toDbAppointment(updateData);
    const { data, error } = await supabase
      .from('appointments')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbAppointment(data), error: null };
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { data: null, error };
  }
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(id) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
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

  try {
    let query = supabase
      .from('appointments')
      .select('time')
      .eq('date', date)
      .neq('status', 'cancelled');

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
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
export async function markReminderSent(id) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ reminder_sent: true })
      .eq('id', id)
      .select()
      .single();

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

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .order('time', { ascending: true })
      .range(from, to);

    if (clinicId) query = query.eq('clinic_id', clinicId);
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

