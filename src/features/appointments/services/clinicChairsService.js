import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { safeGetJSON, safeSetJSON } from '@/utils/safeStorage';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function fromDbChair(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name || 'كرسي الكشف',
    roomLabel: row.room_label || '',
    assignedDoctorId: row.assigned_doctor_id || null,
    color: row.color || '#09090B',
    isActive: row.is_active ?? true,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at
  };
}

export function toDbChair(data) {
  if (!data) return {};
  const payload = {};
  if (data.clinicId !== undefined) payload.clinic_id = data.clinicId;
  if (data.clinic_id !== undefined) payload.clinic_id = data.clinic_id;
  if (data.name !== undefined) payload.name = data.name;
  if (data.roomLabel !== undefined) payload.room_label = data.roomLabel;
  if (data.assignedDoctorId !== undefined) payload.assigned_doctor_id = data.assignedDoctorId;
  if (data.color !== undefined) payload.color = data.color;
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
  return payload;
}

/**
 * Fetch all chairs for a given clinic strictly scoped to clinicId
 * @param {string} clinicId
 * @returns {Promise<{ data: Array, error: Error|null }>}
 */
export async function getClinicChairs(clinicId) {
  if (!clinicId) {
    return { data: [], error: new Error('Clinic ID is strictly required to fetch chairs') };
  }

  const cacheKey = `clinicflow_chairs_${clinicId}`;

  // If offline or non-UUID slug, use scoped local cache
  if (!isSupabaseConfigured() || !UUID_REGEX.test(clinicId)) {
    const cached = safeGetJSON(cacheKey, null);
    if (Array.isArray(cached) && cached.length > 0) {
      return { data: cached, error: null };
    }
    // Default seed chair for the clinic
    const defaultChair = {
      id: `chair_${clinicId}_1`,
      clinicId,
      name: 'كرسي الكشف الرئيسي',
      roomLabel: 'غرفة 1',
      color: '#09090B',
      isActive: true,
      sortOrder: 1,
      createdAt: new Date().toISOString()
    };
    return { data: [defaultChair], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('clinic_chairs')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      // Fallback if table doesn't exist yet on remote
      const cached = safeGetJSON(cacheKey, null);
      if (Array.isArray(cached) && cached.length > 0) {
        return { data: cached, error: null };
      }
      return {
        data: [{
          id: `chair_${clinicId}_1`,
          clinicId,
          name: 'كرسي الكشف الرئيسي',
          roomLabel: 'غرفة 1',
          color: '#09090B',
          isActive: true,
          sortOrder: 1,
          createdAt: new Date().toISOString()
        }],
        error: null
      };
    }

    const chairs = (data || []).map(fromDbChair);
    safeSetJSON(cacheKey, chairs);
    return { data: chairs, error: null };
  } catch (err) {
    console.warn('Clinic chairs fetch notice, falling back to cache:', err.message);
    const cached = safeGetJSON(cacheKey, []);
    return { data: cached, error: null };
  }
}

/**
 * Add a new chair to the clinic
 */
export async function addClinicChair(chairData = {}) {
  const clinicId = chairData.clinicId || chairData.clinic_id;
  if (!clinicId) {
    return { data: null, error: new Error('Clinic ID is strictly required to create a chair') };
  }

  const newChair = {
    id: chairData.id || `chair_${Date.now()}`,
    clinicId,
    name: chairData.name || 'كرسي كشف إضافي',
    roomLabel: chairData.roomLabel || '',
    assignedDoctorId: chairData.assignedDoctorId || null,
    color: chairData.color || '#2563EB',
    isActive: true,
    sortOrder: Number(chairData.sortOrder || 1),
    createdAt: new Date().toISOString()
  };

  const cacheKey = `clinicflow_chairs_${clinicId}`;
  const existing = safeGetJSON(cacheKey, []);
  safeSetJSON(cacheKey, [...existing, newChair]);

  if (isSupabaseConfigured() && UUID_REGEX.test(clinicId)) {
    try {
      const dbPayload = toDbChair(newChair);
      const { data, error } = await supabase.from('clinic_chairs').insert([dbPayload]).select().single();
      if (!error && data) {
        return { data: fromDbChair(data), error: null };
      }
    } catch (_err) {
      // Cache saved above
    }
  }

  return { data: newChair, error: null };
}
