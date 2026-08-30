import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';


/**
 * Format DB snake_case record to client camelCase model
 */
export function fromDbPatient(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id || row.clinicId,
    name: row.name,
    age: row.age ? String(row.age) : '30',
    gender: row.gender || 'غير محدد',
    phone: row.phone || '',
    email: row.email || '',
    bloodType: row.blood_type || row.bloodType || 'غير محدد',
    medicalAlerts: row.medical_alerts || row.medicalAlerts || '',
    diagnosis: row.diagnosis || '',
    notes: row.notes || '',
    attachments: row.attachments || [],
    visitsCount: row.total_visits ?? row.visitsCount ?? 1,
    totalVisits: row.total_visits ?? row.totalVisits ?? 1,
    lastVisit: row.last_visit ? String(row.last_visit).split('T')[0] : (row.lastVisit || null),
    createdAt: row.created_at || row.createdAt
  };
}

/**
 * Format client camelCase model to DB snake_case payload
 */
export function toDbPatient(data) {
  if (!data) return {};
  const payload = {};

  if (data.id && typeof data.id === 'string' && data.id.includes('-') && data.id.length > 20) {
    payload.id = data.id;
  }
  if (data.clinicId !== undefined) payload.clinic_id = data.clinicId;
  if (data.name !== undefined) payload.name = data.name;
  if (data.age !== undefined) payload.age = parseInt(String(data.age).replace(/\D/g, ''), 10) || 30;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.email !== undefined) payload.email = data.email;
  if (data.bloodType !== undefined) payload.blood_type = data.bloodType;
  if (data.medicalAlerts !== undefined) payload.medical_alerts = data.medicalAlerts;
  if (data.diagnosis !== undefined) payload.diagnosis = data.diagnosis;
  if (data.notes !== undefined) payload.notes = data.notes;

  if (data.attachments !== undefined) payload.attachments = data.attachments;
  if (data.totalVisits !== undefined || data.visitsCount !== undefined) {
    payload.total_visits = data.totalVisits ?? data.visitsCount ?? 1;
  }
  if (data.lastVisit !== undefined) payload.last_visit = data.lastVisit;

  return payload;
}

/**
 * Get all patients for a clinic
 */
export async function getPatients(clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []).map(fromDbPatient), error: null };
  } catch (error) {
    console.error('Error fetching patients:', error);
    return { data: null, error };
  }
}

/**
 * Add a new patient
 */
export async function addPatient(patient) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const dbPayload = toDbPatient(patient);
    const { data, error } = await supabase
      .from('patients')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbPatient(data), error: null };
  } catch (error) {
    console.error('Error adding patient:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing patient
 */
export async function updatePatient(id, updateData) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const dbPayload = toDbPatient(updateData);
    const { data, error } = await supabase
      .from('patients')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbPatient(data), error: null };
  } catch (error) {
    console.error('Error updating patient:', error);
    return { data: null, error };
  }
}

/**
 * Delete a patient
 */
export async function deletePatient(id) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting patient:', error);
    return { data: null, error };
  }
}

/**
 * Find patient by phone number (for booking)
 */
export async function findPatientByPhone(clinicId, phone) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const raw = (phone || '').trim();
    const cleanDigits = raw.replace(/\D/g, '');
    const standard11 = cleanDigits.startsWith('20') ? '0' + cleanDigits.slice(2) : (cleanDigits.startsWith('0') ? cleanDigits : '0' + cleanDigits);
    const withCountry = cleanDigits.startsWith('20') ? cleanDigits : ('20' + (cleanDigits.startsWith('0') ? cleanDigits.slice(1) : cleanDigits));

    let query = supabase
      .from('patients')
      .select('*')
      .or(`phone.eq.${raw},phone.eq.${standard11},phone.eq.${withCountry},phone.eq.${cleanDigits}`);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query.limit(1);
    if (error) throw error;
    const patient = data && data.length > 0 ? fromDbPatient(data[0]) : null;
    return { data: patient, error: null };
  } catch (error) {
    console.error('Error finding patient by phone:', error);
    return { data: null, error };
  }
}

/**
 * Get paginated patients with server-side range for large databases (100k+ records)
 */
export async function getPatientsPaginated({ clinicId, page = 1, pageSize = 25, searchQuery = '' } = {}) {
  if (!isSupabaseConfigured()) {
    return { data: [], total: 0, page, pageSize, totalPages: 1, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,diagnosis.ilike.%${q}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(fromDbPatient),
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize) || 1,
      error: null
    };
  } catch (error) {
    console.error('Error fetching paginated patients:', error);
    return { data: [], total: 0, page, pageSize, totalPages: 1, error };
  }
}


