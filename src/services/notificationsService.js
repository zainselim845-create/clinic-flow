import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Fetch all notifications, ordered by created_at DESC
 */
export async function getNotifications(clinicId) {
  if (!isSupabaseConfigured()) return null;

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
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { data: null, error };
  }
}

/**
 * Add a new notification
 */
export async function addNotification(notification) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding notification:', error);
    return { data: null, error };
  }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(id) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { data: null, error };
  }
}

/**
 * Mark all notifications as read for a clinic
 */
export async function markAllAsRead(clinicId) {
  if (!isSupabaseConfigured()) return null;

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
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { data: null, error };
  }
}

/**
 * Delete all notifications for a clinic
 */
export async function clearAll(clinicId) {
  if (!isSupabaseConfigured()) return null;

  try {
    let query = supabase
      .from('notifications')
      .delete();

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return { data: null, error };
  }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount(clinicId) {
  if (!isSupabaseConfigured()) return null;

  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { count, error } = await query;

    if (error) throw error;
    return { data: count, error: null };
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return { data: null, error };
  }
}
