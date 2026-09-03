import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';

export const DEFAULT_DENTAL_VISIT_TYPES = [
  { id: 'vt-1', nameAr: 'كشف وفحص تشخيصي شامل للأسنان', nameEn: 'General Dental Examination', standardFee: 300, colorCode: '#0D9488', isDefault: true, isOnline: true },
  { id: 'vt-2', nameAr: 'استشارة ومتابعة بعد العلاج', nameEn: 'Follow-up Consultation', standardFee: 150, colorCode: '#3B82F6', isDefault: false, isOnline: true },
  { id: 'vt-3', nameAr: 'جلسة تنظيف وتلميع وإزالة جير', nameEn: 'Scaling & Polishing', standardFee: 400, colorCode: '#10B981', isDefault: false, isOnline: true },
  { id: 'vt-4', nameAr: 'حشو تجميلي كومبوزيت ليزر', nameEn: 'Composite Restoration', standardFee: 500, colorCode: '#8B5CF6', isDefault: false, isOnline: true },
  { id: 'vt-5', nameAr: 'علاج جذور وعصب السن (RCT)', nameEn: 'Root Canal Treatment', standardFee: 900, colorCode: '#EC4899', isDefault: false, isOnline: true },
  { id: 'vt-6', nameAr: 'خلع ضرس عادي أو مخلخل', nameEn: 'Simple Extraction', standardFee: 400, colorCode: '#F59E0B', isDefault: false, isOnline: true },
  { id: 'vt-7', nameAr: 'طربوش / تاج زيركون تجميلي', nameEn: 'Zirconia Crown', standardFee: 1800, colorCode: '#6366F1', isDefault: false, isOnline: false },
  { id: 'vt-8', nameAr: 'تبييض أسنان احترافي بالعيادة', nameEn: 'In-Office Teeth Whitening', standardFee: 2000, colorCode: '#06B6D4', isDefault: false, isOnline: true },
  { id: 'vt-9', nameAr: 'زراعة سن تيتانيوم ألماني', nameEn: 'Dental Implant', standardFee: 6500, colorCode: '#D97706', isDefault: false, isOnline: false },
  { id: 'vt-10', nameAr: 'حالة طارئة ومستعجلة', nameEn: 'Dental Emergency', standardFee: 400, colorCode: '#EF4444', isDefault: false, isOnline: true }
];

export function fromDbVisitType(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    nameAr: row.name_ar,
    nameEn: row.name_en || '',
    standardFee: Number(row.standard_fee || 0),
    colorCode: row.color_code || '#0D9488',
    isDefault: Boolean(row.is_default),
    isOnline: Boolean(row.is_online),
    isActive: Boolean(row.is_active)
  };
}

export function toDbVisitType(data) {
  if (!data) return {};
  return {
    id: data.id || undefined,
    clinic_id: data.clinicId || undefined,
    name_ar: data.nameAr,
    name_en: data.nameEn || '',
    standard_fee: Number(data.standardFee || 0),
    color_code: data.colorCode || '#0D9488',
    is_default: Boolean(data.isDefault),
    is_online: Boolean(data.isOnline),
    is_active: data.isActive !== undefined ? Boolean(data.isActive) : true
  };
}

export async function getVisitTypes(clinicId) {
  if (!isSupabaseConfigured()) {
    return { data: DEFAULT_DENTAL_VISIT_TYPES, error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase.from('visit_types').select('*').order('standard_fee', { ascending: true });
    if (clinicId) query = query.eq('clinic_id', clinicId);

    const { data, error } = await query;
    if (error) throw error;
    return { 
      data: data && data.length > 0 ? data.map(fromDbVisitType) : DEFAULT_DENTAL_VISIT_TYPES, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching visit types:', error);
    return { data: DEFAULT_DENTAL_VISIT_TYPES, error };
  }
}

export async function addVisitType(visitType) {
  if (!isSupabaseConfigured()) {
    return { data: visitType, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const row = toDbVisitType(visitType);
    const { data, error } = await supabase.from('visit_types').insert(row).select().single();
    if (error) throw error;
    return { data: fromDbVisitType(data), error: null };
  } catch (error) {
    console.error('Error adding visit type:', error);
    return { data: visitType, error };
  }
}

export async function updateVisitType(id, updateData) {
  if (!isSupabaseConfigured()) {
    return { data: updateData, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const row = toDbVisitType(updateData);
    const { data, error } = await supabase.from('visit_types').update(row).eq('id', id).select().single();
    if (error) throw error;
    return { data: fromDbVisitType(data), error: null };
  } catch (error) {
    console.error('Error updating visit type:', error);
    return { data: updateData, error };
  }
}

export async function deleteVisitType(id) {
  if (!isSupabaseConfigured()) {
    return { success: true, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { error } = await supabase.from('visit_types').delete().eq('id', id);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting visit type:', error);
    return { success: false, error };
  }
}
