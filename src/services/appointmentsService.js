import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Get appointments with optional filters
 */
export async function getAppointments(clinicId, filters = {}) {
  if (!isSupabaseConfigured()) return null;

  try {
    let query = supabase
      .from('appointments')
      .select('*');

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.date) {
      query = query.eq('date', filters.date);
    }

    const { data, error } = await query.order('date', { ascending: true }).order('time', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return { data: null, error };
  }
}

/**
 * Add a new appointment
 */
export async function addAppointment(appointment) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert([appointment])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding appointment:', error);
    return { data: null, error };
  }
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(id, status) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return { data: null, error };
  }
}

/**
 * Full update for an appointment
 */
export async function updateAppointment(id, updateData) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating appointment:', error);
    return { data: null, error };
  }
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(id) {
  if (!isSupabaseConfigured()) return null;

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
  if (!isSupabaseConfigured()) return null;

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
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ reminder_sent: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error marking reminder as sent:', error);
    return { data: null, error };
  }
}
