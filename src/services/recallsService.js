import { supabase, isSupabaseConfigured } from '../lib/supabase';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export function fromDbRecall(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    reason: row.reason,
    dueDate: row.due_date,
    intervalDays: row.interval_days || 30,
    status: row.status || 'pending',
    createdAt: row.created_at
  };
}

export function toDbRecall(data) {
  if (!data) return {};
  const payload = {};
  if (data.id && typeof data.id === 'string' && data.id.includes('-') && data.id.length > 20) {
    payload.id = data.id;
  }
  if (data.clinicId && typeof data.clinicId === 'string' && data.clinicId.includes('-')) {
    payload.clinic_id = data.clinicId;
  }
  if (data.patientId && typeof data.patientId === 'string' && data.patientId.includes('-')) {
    payload.patient_id = data.patientId;
  }
  if (data.patientName !== undefined) payload.patient_name = data.patientName;
  if (data.patientPhone !== undefined) payload.patient_phone = data.patientPhone;
  if (data.reason !== undefined) payload.reason = data.reason;
  if (data.dueDate !== undefined) payload.due_date = data.dueDate;
  if (data.intervalDays !== undefined) payload.interval_days = Number(data.intervalDays) || 30;
  if (data.status !== undefined) payload.status = data.status;
  return payload;
}

export async function getRecalls(clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  try {
    let query = supabase.from('patient_recalls').select('*');
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query.order('due_date', { ascending: true });
    if (error) throw error;
    return { data: (data || []).map(fromDbRecall), error: null };
  } catch (error) {
    console.warn('Patient recalls table fetch notice:', error.message);
    return { data: null, error };
  }
}

export async function addRecall(recall) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  try {
    const dbPayload = toDbRecall(recall);
    const { data, error } = await supabase
      .from('patient_recalls')
      .insert([dbPayload])
      .select()
      .single();
    if (error) throw error;
    return { data: fromDbRecall(data), error: null };
  } catch (error) {
    console.warn('Patient recall add notice:', error.message);
    return { data: null, error };
  }
}

export async function updateRecallStatus(id, status) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  try {
    const { data, error } = await supabase
      .from('patient_recalls')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data: fromDbRecall(data), error: null };
  } catch (error) {
    console.warn('Patient recall update notice:', error.message);
    return { data: null, error };
  }
}

export async function deleteRecall(id) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  try {
    const { error } = await supabase
      .from('patient_recalls')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.warn('Patient recall delete notice:', error.message);
    return { success: false, error };
  }
}
