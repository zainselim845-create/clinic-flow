import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';
import { apiCache } from './apiCacheService';
import { patientSchema, validateWithSchema } from '../utils/validationSchemas';

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
    deletedAt: row.deleted_at || null,
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
  if (data.clinicId !== undefined || data.clinic_id !== undefined) payload.clinic_id = data.clinicId || data.clinic_id;
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
  if (data.deletedAt !== undefined) payload.deleted_at = data.deletedAt;

  return payload;
}

/**
 * Get all patients for a clinic (with in-memory TTL caching)
 */
export async function getPatients(clinicId, options = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  if (!clinicId) {
    return { data: [], error: new Error('Clinic ID is strictly required to prevent multi-tenant data leaks') };
  }

  const cacheKey = apiCache.createKey('patients', clinicId, options);
  try {
    return await apiCache.wrap(cacheKey, async () => {
      let query = supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      const limit = options?.limit || 300;
      query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return { data: (data || []).map(fromDbPatient), error: null };
    }, 20000); // 20s TTL
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

  const clinicId = patient?.clinicId || patient?.clinic_id;
  if (!patient || !clinicId) {
    return { data: null, error: new Error('Clinic ID is strictly required to add a patient') };
  }

  // Zod input validation
  const validation = validateWithSchema(patientSchema, {
    clinicId,
    name: patient?.name || '',
    phone: patient?.phone || '',
    age: patient?.age,
    gender: patient?.gender || 'ذكر',
    bloodType: patient?.bloodType,
    medicalAlerts: patient?.medicalAlerts,
    diagnosis: patient?.diagnosis,
    notes: patient?.notes,
    visitsCount: patient?.visitsCount || patient?.totalVisits || 1
  });

  if (!validation.success) {
    return { data: null, error: new Error(`Validation Error: ${validation.error}`) };
  }

  try {
    const dbPayload = toDbPatient(patient);
    const { data, error } = await supabase
      .from('patients')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;
    apiCache.invalidateResource('patients', clinicId);
    return { data: fromDbPatient(data), error: null };
  } catch (error) {
    console.error('Error adding patient:', error);
    return { data: null, error };
  }
}

/**
 * Soft delete a patient (sets deleted_at timestamp)
 */
export async function softDeletePatient(id, clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  if (!clinicId || !id) {
    return { data: null, error: new Error('Clinic ID and Patient ID are strictly required for deletion') };
  }
  try {
    const { data, error } = await supabase
      .from('patients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (error) throw error;
    apiCache.invalidateResource('patients', clinicId);
    return { data: fromDbPatient(data), error: null };
  } catch (error) {
    console.error('Error soft deleting patient:', error);
    return { data: null, error };
  }
}

/**
 * Add multiple patients in bulk (e.g. from Excel import)
 */
export async function addPatientsBulk(patientsList) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  if (!Array.isArray(patientsList) || patientsList.length === 0) {
    return { data: [], error: null };
  }
  try {
    const dbPayloads = patientsList.map(toDbPatient);
    const { data, error } = await supabase
      .from('patients')
      .insert(dbPayloads)
      .select();

    if (error) throw error;
    apiCache.invalidateResource('patients', patientsList[0]?.clinicId || patientsList[0]?.clinic_id);
    return { data: (data || []).map(fromDbPatient), error: null };
  } catch (error) {
    console.error('Error adding patients bulk:', error);
    return { data: null, error };
  }
}


/**
 * Update an existing patient
 */
export async function updatePatient(id, updateData, clinicId = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const dbPayload = toDbPatient(updateData);
    const targetClinicId = clinicId || updateData?.clinicId || updateData?.clinic_id;
    let query = supabase.from('patients').update(dbPayload).eq('id', id);
    if (targetClinicId) {
      query = query.eq('clinic_id', targetClinicId);
    }
    const { data, error } = await query.select().single();

    if (error) throw error;
    if (targetClinicId) {
      apiCache.invalidateResource('patients', targetClinicId);
    } else {
      apiCache.invalidatePrefix('patients:');
    }
    return { data: fromDbPatient(data), error: null };
  } catch (error) {
    console.error('Error updating patient:', error);
    return { data: null, error };
  }
}

/**
 * Delete a patient
 */
export async function deletePatient(id, clinicId = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase.from('patients').delete().eq('id', id);
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { error } = await query;

    if (error) throw error;
    if (clinicId) {
      apiCache.invalidateResource('patients', clinicId);
    } else {
      apiCache.invalidatePrefix('patients:');
    }
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

  if (!clinicId) {
    return { data: null, error: new Error('Clinic ID is strictly required to find patients by phone') };
  }

  try {
    const raw = (phone || '').trim();
    const cleanDigits = raw.replace(/\D/g, '');
    if (!cleanDigits) return { data: null, error: null };
    const standard11 = cleanDigits.startsWith('20') ? '0' + cleanDigits.slice(2) : (cleanDigits.startsWith('0') ? cleanDigits : '0' + cleanDigits);
    const withCountry = cleanDigits.startsWith('20') ? cleanDigits : ('20' + (cleanDigits.startsWith('0') ? cleanDigits.slice(1) : cleanDigits));

    let query = supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .or(`phone.eq.${cleanDigits},phone.eq.${standard11},phone.eq.${withCountry}`);

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

  if (!clinicId) {
    return { data: [], total: 0, page, pageSize, totalPages: 1, error: new Error('Clinic ID is strictly required to fetch paginated patients') };
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().replace(/[,()]/g, '');
      if (q) {
        query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,diagnosis.ilike.%${q}%`);
      }
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


