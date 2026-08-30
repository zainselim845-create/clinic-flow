import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';

// Standard FDI notation ranges
export const ADULT_TEETH = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [38, 37, 36, 35, 34, 33, 32, 31],
  lowerRight: [41, 42, 43, 44, 45, 46, 47, 48]
};

export const PEDIATRIC_TEETH = {
  upperRight: [55, 54, 53, 52, 51],
  upperLeft: [61, 62, 63, 64, 65],
  lowerLeft: [75, 74, 73, 72, 71],
  lowerRight: [81, 82, 83, 84, 85]
};

export const TOOTH_SURFACES = [
  { id: 'O', code: 'O', nameAr: 'إطباقي (Occlusal)', nameEn: 'Occlusal' },
  { id: 'M', code: 'M', nameAr: 'إنسي (Mesial)', nameEn: 'Mesial' },
  { id: 'D', code: 'D', nameAr: 'وحشي (Distal)', nameEn: 'Distal' },
  { id: 'B', code: 'B', nameAr: 'دهليزي (Buccal)', nameEn: 'Buccal' },
  { id: 'L', code: 'L', nameAr: 'لساني (Lingual)', nameEn: 'Lingual' },
  { id: 'ROOT', code: 'ROOT', nameAr: 'الجذر (Root)', nameEn: 'Root' },
  { id: 'WHOLE', code: 'WHOLE', nameAr: 'السن بالكامل', nameEn: 'Whole Tooth' }
];

export const CLINICAL_CONDITIONS = [
  { code: 'caries', nameAr: 'تسوس نشط', nameEn: 'Active Caries', color: '#EF4444', icon: 'AlertCircle' },
  { code: 'restoration', nameAr: 'حشو تجميلي / كومبوزيت', nameEn: 'Composite Filling', color: '#3B82F6', icon: 'CheckCircle' },
  { code: 'amalgam', nameAr: 'حشو أملجم (بلاتين)', nameEn: 'Amalgam', color: '#64748B', icon: 'Shield' },
  { code: 'crown', nameAr: 'طربوش / تاج (Crown)', nameEn: 'Crown', color: '#D97706', icon: 'Award' },
  { code: 'bridge', nameAr: 'جسر أسنان (Bridge)', nameEn: 'Bridge', color: '#F59E0B', icon: 'Layers' },
  { code: 'implant', nameAr: 'زرعة أسنان (Implant)', nameEn: 'Implant', color: '#8B5CF6', icon: 'Anchor' },
  { code: 'rct', nameAr: 'علاج جذور وعصب (RCT)', nameEn: 'Root Canal', color: '#EC4899', icon: 'Activity' },
  { code: 'missing', nameAr: 'سن مفقود / مخلوع', nameEn: 'Missing Tooth', color: '#1E293B', icon: 'X' },
  { code: 'extraction_planned', nameAr: 'خلع مخطط له', nameEn: 'Extraction Planned', color: '#B91C1C', icon: 'Trash2' },
  { code: 'veneer', nameAr: 'عدسة / فينير', nameEn: 'Veneer', color: '#06B6D4', icon: 'Sparkles' }
];

export function fromDbDentalChart(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    toothNumber: Number(row.tooth_number),
    surface: row.surface || 'WHOLE',
    conditionCode: row.condition_code,
    status: row.status || 'existing', // existing, planned, completed
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toDbDentalChart(data) {
  if (!data) return {};
  return {
    id: data.id || undefined,
    clinic_id: data.clinicId || undefined,
    patient_id: data.patientId,
    tooth_number: Number(data.toothNumber),
    surface: data.surface || 'WHOLE',
    condition_code: data.conditionCode,
    status: data.status || 'existing',
    notes: data.notes || '',
    updated_at: new Date().toISOString()
  };
}

export async function getPatientDentalChart(patientId) {
  if (!isSupabaseConfigured() || !patientId) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase
      .from('dental_chart')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data || []).map(fromDbDentalChart), error: null };
  } catch (error) {
    console.error('Error fetching dental chart from Supabase:', error);
    return { data: [], error };
  }
}

export async function saveToothCondition(chartEntry) {
  if (!isSupabaseConfigured()) {
    return { data: chartEntry, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const row = toDbDentalChart(chartEntry);
    const { data, error } = await supabase
      .from('dental_chart')
      .upsert(row)
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbDentalChart(data), error: null };
  } catch (error) {
    console.error('Error saving dental chart entry:', error);
    return { data: chartEntry, error };
  }
}

export async function deleteToothCondition(id) {
  if (!isSupabaseConfigured()) {
    return { success: true, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { error } = await supabase
      .from('dental_chart')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting dental chart entry:', error);
    return { success: false, error };
  }
}
