import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { apiCache } from './apiCacheService';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

/**
 * Format DB snake_case record to client camelCase model
 */
export function fromDbDoctor(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id || row.clinicId,
    userId: row.user_id || row.userId || null,
    name: row.name,
    specialty: row.specialty || 'طبيب عام',
    phone: row.phone || '',
    email: row.email || '',
    regularFee: row.regular_fee || row.regularFee || '300 ج.م',
    consultationFee: row.consultation_fee || row.consultationFee || '150 ج.م',
    commissionRate: Number(row.commission_rate ?? row.commissionRate ?? 50), // Percentage, e.g. 50%
    workingHours: row.working_hours || row.workingHours || 'السبت - الخميس: ٥:٠٠ م - ١٠:٠٠ م',
    scheduleConfig: row.schedule_config || row.scheduleConfig || null,
    isActive: row.is_active ?? row.isActive ?? true,
    createdAt: row.created_at || row.createdAt
  };
}

/**
 * Format client camelCase model to DB snake_case payload
 */
export function toDbDoctor(data) {
  if (!data) return {};
  const payload = {};

  if (data.id && typeof data.id === 'string' && data.id.includes('-') && data.id.length > 20) {
    payload.id = data.id;
  }
  if (data.clinicId !== undefined || data.clinic_id !== undefined) {
    payload.clinic_id = data.clinicId || data.clinic_id;
  }
  if (data.userId !== undefined || data.user_id !== undefined) {
    payload.user_id = data.userId || data.user_id;
  }
  if (data.name !== undefined) payload.name = data.name;
  if (data.specialty !== undefined) payload.specialty = data.specialty;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.email !== undefined) payload.email = data.email;
  if (data.regularFee !== undefined) payload.regular_fee = data.regularFee;
  if (data.consultationFee !== undefined) payload.consultation_fee = data.consultationFee;
  if (data.commissionRate !== undefined) payload.commission_rate = Number(data.commissionRate);
  if (data.workingHours !== undefined) payload.working_hours = data.workingHours;
  if (data.scheduleConfig !== undefined) payload.schedule_config = data.scheduleConfig;
  if (data.isActive !== undefined) payload.is_active = Boolean(data.isActive);

  return payload;
}

/**
 * Get all doctors for a specific clinic (with TTL caching)
 */
export async function getDoctors(clinicId, options = {}) {
  if (!clinicId) {
    return { data: [], error: new Error('Clinic ID is strictly required to prevent multi-tenant data leaks') };
  }

  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  const cacheKey = apiCache.createKey('doctors', clinicId, options);

  try {
    return await apiCache.wrap(cacheKey, async () => {
      let query = supabase
        .from('doctors')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name', { ascending: true });

      if (options.onlyActive !== false) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: (data || []).map(fromDbDoctor), error: null };
    }, 20000); // 20s TTL
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return { data: null, error };
  }
}

/**
 * Add a new doctor to the clinic
 */
export async function addDoctor(doctor) {
  const clinicId = doctor?.clinicId || doctor?.clinic_id;
  if (!doctor || !clinicId) {
    return { data: null, error: new Error('Clinic ID is strictly required to add a doctor') };
  }

  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const dbPayload = toDbDoctor(doctor);
    const { data, error } = await supabase
      .from('doctors')
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;
    apiCache.invalidateResource('doctors', clinicId);
    return { data: fromDbDoctor(data), error: null };
  } catch (error) {
    console.error('Error adding doctor:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing doctor profile
 */
export async function updateDoctor(id, clinicId, updateData) {
  if (!id) {
    return { data: null, error: new Error('Doctor ID is required for update') };
  }

  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const dbPayload = toDbDoctor(updateData);
    const { data, error } = await supabase
      .from('doctors')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (clinicId) {
      apiCache.invalidateResource('doctors', clinicId);
    }
    return { data: fromDbDoctor(data), error: null };
  } catch (error) {
    console.error('Error updating doctor:', error);
    return { data: null, error };
  }
}

/**
 * Delete / deactivate a doctor
 */
export async function deleteDoctor(id, clinicId) {
  if (!id) {
    return { error: new Error('Doctor ID is required for delete') };
  }

  if (!isSupabaseConfigured()) {
    return { error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { error } = await supabase
      .from('doctors')
      .delete()
      .eq('id', id);

    if (error) throw error;
    if (clinicId) {
      apiCache.invalidateResource('doctors', clinicId);
    }
    return { error: null };
  } catch (error) {
    console.error('Error deleting doctor:', error);
    return { error };
  }
}

/**
 * Calculate multi-doctor commission breakdown from invoices & appointments
 * @param {Array} invoices - List of invoices
 * @param {Array} doctors - List of doctors in the clinic
 * @param {Array} appointments - List of appointments (optional for procedure matching)
 * @returns {Array} List of commission summaries per doctor
 */
export function calculateDoctorCommissions(invoices = [], doctors = [], appointments = []) {
  if (!Array.isArray(doctors) || doctors.length === 0) return [];

  const apptMap = new Map((appointments || []).map(a => [a.id, a]));

  const summaryByDoctor = new Map();

  doctors.forEach(doc => {
    summaryByDoctor.set(doc.id, {
      doctorId: doc.id,
      doctorName: doc.name,
      specialty: doc.specialty,
      commissionRate: Number(doc.commissionRate ?? 50),
      totalProcedures: 0,
      grossRevenue: 0,
      doctorNetShare: 0,
      clinicNetShare: 0,
      invoices: []
    });
  });

  (invoices || []).forEach(inv => {
    if (inv.deletedAt) return;

    // Resolve doctor from invoice directly or through linked appointment
    let docId = inv.doctorId || inv.doctor_id;
    if (!docId && inv.appointmentId) {
      const appt = apptMap.get(inv.appointmentId);
      if (appt) {
        docId = appt.doctorId || appt.doctor_id;
      }
    }

    if (!docId) return;

    const summary = summaryByDoctor.get(docId);
    if (!summary) return;

    const amount = Number(inv.paidAmount ?? inv.total ?? 0);
    const docRate = summary.commissionRate;
    const docShare = (amount * docRate) / 100;
    const clinicShare = amount - docShare;

    summary.totalProcedures += (inv.items && inv.items.length > 0 ? inv.items.length : 1);
    summary.grossRevenue += amount;
    summary.doctorNetShare += docShare;
    summary.clinicNetShare += clinicShare;
    summary.invoices.push(inv.id);
  });

  return Array.from(summaryByDoctor.values());
}
