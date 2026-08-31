import { supabase, isSupabaseConfigured } from '../lib/supabase';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

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
  if (data.clinicId !== undefined) payload.clinic_id = data.clinicId;
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
 * Get all staff members for a clinic
 */
export async function getStaffMembers(clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase
      .from('staff_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []).map(fromDbStaff), error: null };
  } catch (error) {
    console.error('Error fetching staff members:', error);
    return { data: null, error };
  }
}

/**
 * Add a new staff member
 */
export async function addStaffMember(staff) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const dbPayload = toDbStaff(staff);
    const { data, error } = await supabase
      .from('staff_members')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbStaff(data), error: null };
  } catch (error) {
    console.error('Error adding staff member:', error);
    return { data: null, error };
  }
}

/**
 * Update staff member
 */
export async function updateStaffMember(id, updateData) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const dbPayload = toDbStaff(updateData);
    const { data, error } = await supabase
      .from('staff_members')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbStaff(data), error: null };
  } catch (error) {
    console.error('Error updating staff member:', error);
    return { data: null, error };
  }
}

/**
 * Delete a staff member
 */
export async function deleteStaffMember(id) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { error } = await supabase
      .from('staff_members')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting staff member:', error);
    return { error };
  }
}
