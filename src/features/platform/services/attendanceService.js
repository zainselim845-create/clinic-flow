import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { safeGetJSON, safeSetJSON } from '@/utils/safeStorage';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function fromDbAttendance(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id || row.clinicId,
    staffId: row.staff_id,
    staffName: row.staff_name || '',
    checkIn: row.check_in,
    checkOut: row.check_out,
    totalHours: Number(row.total_hours || 0),
    notes: row.notes || '',
    date: row.check_in ? row.check_in.split('T')[0] : ''
  };
}

export async function getStaffAttendance(clinicId = null) {
  if (!clinicId) {
    return { data: [], error: new Error('Clinic ID is strictly required to fetch staff attendance') };
  }

  const cacheKey = `clinicflow_attendance_${clinicId}`;

  // If Supabase not configured or non-UUID tenant slug, use local scoped storage
  if (!isSupabaseConfigured() || !UUID_REGEX.test(clinicId)) {
    const local = safeGetJSON(cacheKey, []);
    return { data: Array.isArray(local) ? local : [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('check_in', { ascending: false });

    if (error) {
      // Graceful Schema Cache / Missing Table Fallback (PGRST205 / 42P01 / 42703)
      if (
        error.code === 'PGRST205' || 
        error.code === '42P01' || 
        error.code === '42703' ||
        error.message?.includes('schema cache') || 
        error.message?.includes('does not exist')
      ) {
        console.warn('staff_attendance table missing on server, falling back to local storage cache');
        const local = safeGetJSON(cacheKey, []);
        return { data: Array.isArray(local) ? local : [], error: null };
      }
      throw error;
    }

    const attendance = (data || []).map(fromDbAttendance);
    safeSetJSON(cacheKey, attendance);
    return { data: attendance, error: null };
  } catch (error) {
    console.warn('Error fetching attendance, using local cache:', error.message || error);
    const local = safeGetJSON(cacheKey, []);
    return { data: Array.isArray(local) ? local : [], error: null };
  }
}

export async function recordCheckIn(staffId, staffName, clinicId = null) {
  if (!clinicId) {
    return { data: null, error: new Error('Clinic ID is strictly required to record check-in') };
  }

  const cacheKey = `clinicflow_attendance_${clinicId}`;
  const localRecord = {
    id: 'att_' + Date.now(),
    clinicId,
    staffId,
    staffName: staffName || 'عضو الفريق',
    checkIn: new Date().toISOString(),
    checkOut: null,
    totalHours: 0,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  };

  const existing = safeGetJSON(cacheKey, []);
  const updatedList = [localRecord, ...existing.filter(r => r.id !== localRecord.id)];
  safeSetJSON(cacheKey, updatedList);

  if (!isSupabaseConfigured() || !UUID_REGEX.test(clinicId)) {
    return { data: localRecord, error: null };
  }

  try {
    const payload = {
      clinic_id: clinicId,
      staff_id: staffId,
      staff_name: staffName || '',
      check_in: localRecord.checkIn
    };

    const { data, error } = await supabase
      .from('staff_attendance')
      .insert(payload)
      .select()
      .single();

    if (error) {
      // Remote table unconfigured or offline notice
      console.warn('Server attendance persistence notice:', error.message);
      return { data: localRecord, error: null };
    }

    const dbRecord = fromDbAttendance(data);
    // Sync local cache with db id
    const syncedList = [dbRecord, ...existing.filter(r => r.id !== localRecord.id)];
    safeSetJSON(cacheKey, syncedList);
    return { data: dbRecord, error: null };
  } catch (error) {
    console.warn('Remote check-in notice, saved locally:', error.message);
    return { data: localRecord, error: null };
  }
}

export async function recordCheckOut(attendanceId, checkInTime, clinicId = null) {
  if (!clinicId) {
    return { data: null, error: new Error('Clinic ID is strictly required to record check-out') };
  }

  const checkOutTime = new Date();
  const checkInDate = checkInTime ? new Date(checkInTime) : null;
  const validCheckIn = checkInDate && !isNaN(checkInDate.getTime());
  const diffHours = validCheckIn ? Math.max(0, Number(((checkOutTime - checkInDate) / (1000 * 60 * 60)).toFixed(2))) : 0;

  const cacheKey = `clinicflow_attendance_${clinicId}`;
  const existing = safeGetJSON(cacheKey, []);
  const updatedList = existing.map(record => {
    if (record.id === attendanceId) {
      return {
        ...record,
        checkOut: checkOutTime.toISOString(),
        totalHours: diffHours
      };
    }
    return record;
  });
  safeSetJSON(cacheKey, updatedList);

  const localUpdated = updatedList.find(r => r.id === attendanceId) || {
    id: attendanceId,
    clinicId,
    checkOut: checkOutTime.toISOString(),
    totalHours: diffHours
  };

  if (!isSupabaseConfigured() || !UUID_REGEX.test(clinicId)) {
    return { data: localUpdated, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('staff_attendance')
      .update({
        check_out: checkOutTime.toISOString(),
        total_hours: Number(diffHours)
      })
      .eq('id', attendanceId)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (error) {
      console.warn('Server check-out persistence notice:', error.message);
      return { data: localUpdated, error: null };
    }

    return { data: fromDbAttendance(data), error: null };
  } catch (error) {
    console.warn('Remote check-out notice, updated locally:', error.message);
    return { data: localUpdated, error: null };
  }
}

/* =========================================================================
 * Strict tenant layer — the legacy getStaffAttendance()/recordCheckIn()
 * treat clinicId as OPTIONAL, which allows cross-clinic reads when omitted.
 * These canonical variants refuse to run without an explicit clinic bound.
 * ========================================================================= */

export async function getStaffAttendanceForClinic(clinicId) {
  if (!clinicId) {
    throw new Error('clinicId is strictly required to fetch staff attendance');
  }
  return getStaffAttendance(clinicId);
}

export async function recordCheckInForClinic(staffId, staffName, clinicId) {
  if (!clinicId) {
    throw new Error('clinicId is strictly required to record a check-in');
  }
  return recordCheckIn(staffId, staffName, clinicId);
}

export async function recordCheckOutForClinic(attendanceId, checkInTime, clinicId) {
  if (!clinicId) {
    throw new Error('clinicId is strictly required to record a check-out');
  }
  return recordCheckOut(attendanceId, checkInTime, clinicId);
}
