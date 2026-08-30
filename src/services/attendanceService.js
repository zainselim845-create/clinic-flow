import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';

export function fromDbAttendance(row) {
  if (!row) return null;
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff_name || '',
    checkIn: row.check_in,
    checkOut: row.check_out,
    totalHours: Number(row.total_hours || 0),
    notes: row.notes || '',
    date: row.check_in ? row.check_in.split('T')[0] : ''
  };
}

export async function getStaffAttendance() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase
      .from('staff_attendance')
      .select('*')
      .order('check_in', { ascending: false });

    if (error) throw error;
    return { data: (data || []).map(fromDbAttendance), error: null };
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return { data: [], error };
  }
}

export async function recordCheckIn(staffId, staffName) {
  if (!isSupabaseConfigured()) {
    return { 
      data: {
        id: 'att_' + Date.now(),
        staffId,
        staffName,
        checkIn: new Date().toISOString(),
        checkOut: null,
        totalHours: 0
      }, 
      error: NOT_CONFIGURED_ERROR 
    };
  }

  try {
    const { data, error } = await supabase
      .from('staff_attendance')
      .insert({
        staff_id: staffId,
        check_in: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbAttendance(data), error: null };
  } catch (error) {
    console.error('Error recording check-in:', error);
    return { data: null, error };
  }
}

export async function recordCheckOut(attendanceId, checkInTime) {
  const checkOutTime = new Date();
  const checkInDate = new Date(checkInTime);
  const diffHours = ((checkOutTime - checkInDate) / (1000 * 60 * 60)).toFixed(2);

  if (!isSupabaseConfigured()) {
    return { 
      data: {
        id: attendanceId,
        checkOut: checkOutTime.toISOString(),
        totalHours: Number(diffHours)
      }, 
      error: NOT_CONFIGURED_ERROR 
    };
  }

  try {
    const { data, error } = await supabase
      .from('staff_attendance')
      .update({
        check_out: checkOutTime.toISOString(),
        total_hours: Number(diffHours)
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbAttendance(data), error: null };
  } catch (error) {
    console.error('Error recording check-out:', error);
    return { data: null, error };
  }
}
