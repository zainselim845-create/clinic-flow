import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';

export const LAB_ORDER_STATUSES = [
  { key: 'pending', labelAr: 'قيد التجهيز بالعيادة', color: '#64748B' },
  { key: 'sent', labelAr: 'أُرسل للمعمل', color: '#3B82F6' },
  { key: 'first_try', labelAr: 'بروفة أولى (Try-in)', color: '#8B5CF6' },
  { key: 'adjustment', labelAr: 'مطلوب تعديل بالمعمل', color: '#F59E0B' },
  { key: 'final_try', labelAr: 'بروفة نهائية', color: '#06B6D4' },
  { key: 'delivered', labelAr: 'تم التسليم والتثبيت للمريض', color: '#10B981' }
];

export const DENTAL_WORK_TYPES = [
  { id: 'zircon_crown', labelAr: 'طربوش زيركون (Zirconia Crown)' },
  { id: 'emax_crown', labelAr: 'طربوش إيماكس (E-Max Crown)' },
  { id: 'pfm_crown', labelAr: 'طربوش بورسلين بمعدن (PFM)' },
  { id: 'zircon_bridge', labelAr: 'جسر زيركون (Zirconia Bridge)' },
  { id: 'veneer', labelAr: 'عدسة / فينير تجميلي (Veneer)' },
  { id: 'post_core', labelAr: 'وتد كاستنج / فايبر (Post & Core)' },
  { id: 'inlay_onlay', labelAr: 'إنلاي / أونلاي خذف (Inlay/Onlay)' },
  { id: 'partial_denture', labelAr: 'طقم جزئي متحرك (Partial Denture)' },
  { id: 'full_denture', labelAr: 'طقم كامل علوي/سفلي (Full Denture)' },
  { id: 'night_guard', labelAr: 'حارس ليلي (Night Guard / Splint)' }
];

export const TOOTH_SHADES = [
  'A1', 'A2', 'A3', 'A3.5', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D2', 'D3', 'D4',
  'Bleach 1 (BL1)', 'Bleach 2 (BL2)', 'Bleach 3 (BL3)'
];

export function fromDbLabOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    patientName: row.patient_name || '',
    patientPhone: row.patient_phone || '',
    labId: row.lab_id,
    labName: row.lab_name || '',
    workType: row.work_type,
    toothNumber: row.tooth_number ? Number(row.tooth_number) : null,
    shade: row.shade || 'A2',
    cost: Number(row.cost || 0),
    status: row.status || 'pending',
    sentDate: row.sent_date,
    dueDate: row.due_date,
    receivedDate: row.received_date,
    notes: row.notes || '',
    createdAt: row.created_at
  };
}

export function toDbLabOrder(data) {
  if (!data) return {};
  return {
    id: data.id || undefined,
    clinic_id: data.clinicId || undefined,
    patient_id: data.patientId,
    lab_id: data.labId || null,
    work_type: data.workType,
    tooth_number: data.toothNumber ? Number(data.toothNumber) : null,
    shade: data.shade || 'A2',
    cost: Number(data.cost || 0),
    status: data.status || 'pending',
    sent_date: data.sentDate || null,
    due_date: data.dueDate || null,
    received_date: data.receivedDate || null,
    notes: data.notes || ''
  };
}

export async function getLabOrders(clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase.from('lab_orders').select('*').order('created_at', { ascending: false });
    if (clinicId) query = query.eq('clinic_id', clinicId);

    const { data, error } = await query;
    if (error) throw error;
    return { data: (data || []).map(fromDbLabOrder), error: null };
  } catch (error) {
    console.error('Error fetching lab orders:', error);
    return { data: [], error };
  }
}

export async function addLabOrder(order) {
  if (!isSupabaseConfigured()) {
    return { data: order, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const row = toDbLabOrder(order);
    const { data, error } = await supabase.from('lab_orders').insert(row).select().single();
    if (error) throw error;
    return { data: fromDbLabOrder(data), error: null };
  } catch (error) {
    console.error('Error adding lab order:', error);
    return { data: order, error };
  }
}

export async function updateLabOrderStatus(id, status, extraFields = {}) {
  if (!isSupabaseConfigured()) {
    return { success: true, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { error } = await supabase.from('lab_orders').update({
      status,
      ...extraFields
    }).eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating lab order status:', error);
    return { success: false, error };
  }
}
