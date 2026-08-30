import { supabase, isSupabaseConfigured } from '../lib/supabase';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export function fromDbBlockedSlot(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id || row.clinicId,
    date: row.date,
    time: row.time,
    isFullDay: row.is_full_day ?? (row.time === 'FULL_DAY' || row.time === 'ALL'),
    reason: row.reason || 'مغلق من السكرتارية',
    createdAt: row.created_at
  };
}

export function toDbBlockedSlot(data) {
  if (!data) return {};
  const payload = {};

  if (data.id && typeof data.id === 'string' && data.id.includes('-') && data.id.length > 20) {
    payload.id = data.id;
  }
  if (data.clinicId !== undefined) payload.clinic_id = data.clinicId;
  if (data.date !== undefined) payload.date = data.date;
  if (data.time !== undefined) payload.time = data.time;
  if (data.isFullDay !== undefined) payload.is_full_day = data.isFullDay;
  if (data.reason !== undefined) payload.reason = data.reason;

  return payload;
}

/**
 * Fetch blocked slots, optionally filtered by date
 */
export async function getBlockedSlots(clinicId, date = null) {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED_ERROR };

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
    return { data: (data || []).map(fromDbBlockedSlot), error: null };
  } catch (error) {
    console.error('Error fetching blocked slots:', error);
    return { data: null, error };
  }
}

/**
 * Toggle a blocked slot. If it exists, delete it. If not, insert it.
 */
export async function toggleBlockSlot(clinicId, date, time) {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED_ERROR };

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
      const payload = { date, time, reason: 'مغلق من السكرتارية', is_full_day: time === 'FULL_DAY' || time === 'ALL' };
      if (clinicId) payload.clinic_id = clinicId;

      const { data, error } = await supabase
        .from('blocked_slots')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return { data: fromDbBlockedSlot(data), action: 'added', error: null };
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
  if (!isSupabaseConfigured()) return { data: false, error: NOT_CONFIGURED_ERROR };

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
    return { data: false, error };
  }
}

/**
 * Block a specific slot or full day in database
 */
export async function blockSlotInDb(date, time, reason = 'حظر مخصص', isFullDay = false) {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED_ERROR };
  try {
    const payload = { date, time, reason, is_full_day: isFullDay };
    const { data, error } = await supabase.from('blocked_slots').insert([payload]).select().single();
    if (error) throw error;
    return { data: fromDbBlockedSlot(data), error: null };
  } catch (error) {
    console.error('Error blocking slot in DB:', error);
    return { data: null, error };
  }
}

/**
 * Unblock a specific slot in database
 */
export async function unblockSlotInDb(date, time) {
  if (!isSupabaseConfigured()) return { success: false, error: NOT_CONFIGURED_ERROR };
  try {
    const { error } = await supabase.from('blocked_slots').delete().eq('date', date).eq('time', time);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error unblocking slot in DB:', error);
    return { success: false, error };
  }
}

/**
 * Unblock a full day in database
 */
export async function unblockFullDayInDb(date) {
  if (!isSupabaseConfigured()) return { success: false, error: NOT_CONFIGURED_ERROR };
  try {
    const { error } = await supabase.from('blocked_slots').delete().eq('date', date);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error unblocking full day in DB:', error);
    return { success: false, error };
  }
}
