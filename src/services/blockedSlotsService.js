import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Fetch blocked slots, optionally filtered by date
 */
export async function getBlockedSlots(clinicId, date = null) {
  if (!isSupabaseConfigured()) return null;

  try {
    let query = supabase
      .from('blocked_slots')
      .select('*');

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching blocked slots:', error);
    return { data: null, error };
  }
}

/**
 * Toggle a blocked slot. If it exists, delete it. If not, insert it.
 */
export async function toggleBlockSlot(clinicId, date, time) {
  if (!isSupabaseConfigured()) return null;

  try {
    let checkQuery = supabase
      .from('blocked_slots')
      .select('id')
      .eq('date', date)
      .eq('time', time);

    if (clinicId) {
      checkQuery = checkQuery.eq('clinic_id', clinicId);
    }

    const { data: existing, error: checkError } = await checkQuery.maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      const { error } = await supabase
        .from('blocked_slots')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      return { data: null, action: 'deleted', error: null };
    } else {
      const payload = { date, time, reason: 'مغلق من السكرتارية' };
      if (clinicId) payload.clinic_id = clinicId;

      const { data, error } = await supabase
        .from('blocked_slots')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return { data, action: 'added', error: null };
    }
  } catch (error) {
    console.error('Error toggling blocked slot:', error);
    return { data: null, error };
  }
}

/**
 * Check if a specific slot is blocked
 */
export async function isSlotBlocked(clinicId, date, time) {
  if (!isSupabaseConfigured()) return null;

  try {
    let query = supabase
      .from('blocked_slots')
      .select('id')
      .eq('date', date)
      .eq('time', time);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return { data: !!data, error: null };
  } catch (error) {
    console.error('Error checking blocked slot:', error);
    return { data: null, error };
  }
}
