import { supabase, isSupabaseConfigured } from '../lib/supabase';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export function fromDbNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id || row.clinicId,
    type: row.type || 'appointment',
    title: row.title,
    message: row.message,
    read: row.read ?? false,
    relatedId: row.related_id || row.relatedId,
    timestamp: row.created_at || row.timestamp || new Date().toISOString()
  };
}

export function toDbNotification(data) {
  if (!data) return {};
  const payload = {};

  if (data.id && typeof data.id === 'string' && data.id.includes('-') && data.id.length > 20) {
    payload.id = data.id;
  }
  if (data.clinicId !== undefined) payload.clinic_id = data.clinicId;
  if (data.type !== undefined) payload.type = data.type;
  if (data.title !== undefined) payload.title = data.title;
  if (data.message !== undefined) payload.message = data.message;
  if (data.read !== undefined) payload.read = data.read;
  if (data.relatedId !== undefined) payload.related_id = data.relatedId;

  return payload;
}

/**
 * Fetch all notifications, ordered by created_at DESC
 */
export async function getNotifications(clinicId) {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED_ERROR };

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: (data || []).map(fromDbNotification), error: null };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { data: null, error };
  }
}

/**
 * Add a new notification
 */
export async function addNotification(notification) {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED_ERROR };

  try {
    const dbPayload = toDbNotification(notification);
    const { data, error } = await supabase
      .from('notifications')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbNotification(data), error: null };
  } catch (error) {
    console.error('Error adding notification:', error);
    return { data: null, error };
  }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(id) {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED_ERROR };

  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbNotification(data), error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { data: null, error };
  }
}

/**
 * Mark all notifications as read for a clinic
 */
export async function markAllAsRead(clinicId) {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED_ERROR };

  try {
    let query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { data: null, error };
  }
}

/**
 * Delete a single notification
 */
export async function deleteNotification(id) {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED_ERROR };

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { error };
  }
}

/**
 * Delete all notifications for a clinic
 */
export async function clearAllNotifications(clinicId) {
  if (!isSupabaseConfigured()) return { data: null, error: NOT_CONFIGURED_ERROR };

  try {
    let query = supabase
      .from('notifications')
      .delete();

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { error } = await query;

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return { error };
  }
}
