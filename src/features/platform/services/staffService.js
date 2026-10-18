import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { safeGetJSON, safeSetJSON } from '@/utils/safeStorage';
import { getRegisteredUsers, deleteRegisteredUser as deleteRegisteredAuthUser } from '@/features/auth/services/authService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function fromDbStaff(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id || row.clinicId,
    name: row.name,
    phone: row.phone,
    email: row.email || '',
    password: row.password || '123',
    role: row.role || 'سكرتير أول',
    roleKey: row.role_key || row.roleKey || 'receptionist',
    shift: row.shift || 'مسائي (04:00 م - 10:00 م)',
    status: row.status || 'active',
    permissions: row.permissions || ['appointments', 'patients', 'sms'],
    createdAt: row.created_at
  };
}

export function toDbStaff(data) {
  if (!data) return {};
  const payload = {};

  if (data.id && typeof data.id === 'string' && data.id.includes('-') && data.id.length > 20) {
    payload.id = data.id;
  }
  if (data.clinicId !== undefined || data.clinic_id !== undefined) {
    const cid = data.clinicId || data.clinic_id;
    if (typeof cid === 'string' && UUID_REGEX.test(cid)) {
      payload.clinic_id = cid;
    }
  }
  if (data.name !== undefined) payload.name = data.name;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.email !== undefined) payload.email = data.email;
  if (data.password !== undefined) payload.password = data.password;
  if (data.role !== undefined) payload.role = data.role;
  if (data.shift !== undefined) payload.shift = data.shift;
  if (data.status !== undefined) payload.status = data.status;
  if (data.permissions !== undefined) payload.permissions = data.permissions;

  return payload;
}

/**
 * Helper to get local staff cached records + registered users for clinic
 */
function getLocalAndRegisteredStaff(clinicId) {
  if (!clinicId) return [];
  const cacheKey = `clinicflow_staff_${clinicId}`;
  const localList = safeGetJSON(cacheKey, []);
  const safeLocal = Array.isArray(localList) ? localList : [];

  let regUsers = [];
  try {
    regUsers = getRegisteredUsers().filter(u => 
      (u.clinicId === clinicId || u.clinicSlug === clinicId) && 
      u.role !== 'doctor' && u.role !== 'super_admin'
    ).map(u => ({
      id: u.id,
      clinicId: u.clinicId || clinicId,
      clinicSlug: u.clinicSlug || clinicId,
      name: u.name,
      phone: u.phone,
      email: u.email || '',
      password: u.password || '1234',
      role: u.jobTitle || u.role,
      roleKey: u.roleKey || u.role,
      shift: u.shift || 'مسائي (04:00 م - 10:00 م)',
      status: u.status || 'active',
      permissions: u.permissions || ['appointments', 'patients', 'sms'],
      createdAt: u.createdAt
    }));
  } catch (err) {
    console.warn('[StaffService] getRegisteredUsers reading warning:', err);
  }

  const merged = new Map();
  safeLocal.forEach(s => { if (s?.id) merged.set(s.id, s); });
  regUsers.forEach(u => {
    const existingById = merged.get(u.id);
    const existingByPhone = Array.from(merged.values()).find(s => s.phone === u.phone);
    if (!existingById && !existingByPhone) {
      merged.set(u.id, u);
    }
  });

  return Array.from(merged.values());
}

/**
 * Get all staff members for a clinic with offline-first resilient fallback
 */
export async function getStaffMembers(clinicId) {
  if (!clinicId) {
    return { data: [], error: new Error('Clinic ID is strictly required to prevent multi-tenant data leaks') };
  }

  const fallbackData = getLocalAndRegisteredStaff(clinicId);

  if (!isSupabaseConfigured() || !UUID_REGEX.test(clinicId)) {
    return { data: fallbackData, error: null };
  }

  try {
    let query = supabase
      .from('staff_members')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      if (
        error.code === 'PGRST205' || 
        error.code === '42P01' || 
        error.code === '42501' ||
        error.message?.includes('schema cache') || 
        error.message?.includes('does not exist') ||
        error.message?.includes('row-level security')
      ) {
        console.warn('[StaffService] Remote staff_members query unavailable or restricted by RLS, using local cache');
        return { data: fallbackData, error: null };
      }
      throw error;
    }

    const remoteMapped = (data || []).map(fromDbStaff);
    // Merge remote with local so any local creations not yet in remote are never lost
    const mergedMap = new Map();
    remoteMapped.forEach(s => { if (s?.id) mergedMap.set(s.id, s); });
    fallbackData.forEach(s => {
      const match = mergedMap.get(s.id) || Array.from(mergedMap.values()).find(r => r.phone === s.phone);
      if (!match) {
        mergedMap.set(s.id, s);
      }
    });

    const finalStaff = Array.from(mergedMap.values());
    safeSetJSON(`clinicflow_staff_${clinicId}`, finalStaff);
    return { data: finalStaff, error: null };
  } catch (error) {
    console.warn('[StaffService] Error fetching remote staff members, using local fallback:', error.message || error);
    return { data: fallbackData, error: null };
  }
}

/**
 * Add a new staff member with multi-tier persistence
 */
export async function addStaffMember(staff) {
  if (!staff) {
    return { data: null, error: new Error('Staff data is required') };
  }

  const clinicId = staff.clinicId || staff.clinicSlug || 'default';
  const cacheKey = `clinicflow_staff_${clinicId}`;
  const localList = safeGetJSON(cacheKey, []);
  const safeLocal = Array.isArray(localList) ? localList : [];
  const updatedList = [staff, ...safeLocal.filter(s => s.id !== staff.id && s.phone !== staff.phone)];
  safeSetJSON(cacheKey, updatedList);
  if (staff.clinicSlug && staff.clinicSlug !== clinicId) {
    safeSetJSON(`clinicflow_staff_${staff.clinicSlug}`, updatedList);
  }

  if (!isSupabaseConfigured() || !UUID_REGEX.test(clinicId)) {
    return { data: staff, error: null };
  }

  try {
    const dbPayload = toDbStaff(staff);
    if (!dbPayload.clinic_id) {
      return { data: staff, error: null };
    }

    const { data, error } = await supabase
      .from('staff_members')
      .insert([dbPayload])
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[StaffService] Remote insert note (retained locally):', error.message || error);
      return { data: staff, error: null };
    }
    return { data: fromDbStaff(data) || staff, error: null };
  } catch (error) {
    console.warn('[StaffService] Error adding staff member remotely (retained locally):', error.message || error);
    return { data: staff, error: null };
  }
}

/**
 * Update staff member
 */
export async function updateStaffMember(id, updateData, clinicId = null) {
  const targetClinic = clinicId || updateData?.clinicId || updateData?.clinicSlug;
  if (targetClinic) {
    const cacheKey = `clinicflow_staff_${targetClinic}`;
    const local = safeGetJSON(cacheKey, []);
    if (Array.isArray(local)) {
      const updated = local.map(s => s.id === id ? { ...s, ...updateData } : s);
      safeSetJSON(cacheKey, updated);
    }
    if (updateData?.clinicSlug && updateData.clinicSlug !== targetClinic) {
      safeSetJSON(`clinicflow_staff_${updateData.clinicSlug}`, updated);
    }
  }

  if (!isSupabaseConfigured()) {
    return { data: { id, ...updateData }, error: null };
  }

  try {
    const dbPayload = toDbStaff(updateData);
    const { data, error } = await supabase
      .from('staff_members')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[StaffService] Remote update note:', error.message || error);
      return { data: { id, ...updateData }, error: null };
    }
    return { data: fromDbStaff(data) || { id, ...updateData }, error: null };
  } catch (error) {
    console.warn('[StaffService] Error updating staff member remotely:', error.message || error);
    return { data: { id, ...updateData }, error: null };
  }
}

/**
 * Delete a staff member
 */
export async function deleteStaffMember(id, clinicId = null) {
  if (clinicId) {
    const cacheKey = `clinicflow_staff_${clinicId}`;
    const local = safeGetJSON(cacheKey, []);
    if (Array.isArray(local)) {
      safeSetJSON(cacheKey, local.filter(s => s.id !== id));
    }
  }

  try {
    deleteRegisteredAuthUser(id);
  } catch (err) {
    console.warn('[StaffService] Auth user delete note:', err);
  }

  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  try {
    const { error } = await supabase
      .from('staff_members')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[StaffService] Remote staff delete note:', error.message);
    }
    return { error: null };
  } catch (error) {
    console.warn('[StaffService] Remote staff delete error:', error.message);
    return { error: null };
  }
}
