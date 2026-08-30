import { supabase, isSupabaseConfigured } from '../lib/supabase';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export function fromDbClinic(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || 'كلينك فلو التخصصية',
    doctorName: row.doctor_name || 'د. أحمد الشريف',
    specialty: row.specialty || 'استشاري أمراض الباطنة والقلب والسكر',
    address: row.address || 'القاهرة — التجمع الخامس، ميديكال بارك سنتر',
    phone: row.phone || '01006285031',
    doctorEmail: row.doctor_email || 'doctor@clinicflow.com',
    doctorPassword: row.doctor_password || 'admin123',
    regularFee: row.regular_fee || '300 ج.م',
    consultationFee: row.consultation_fee || '150 ج.م',
    workingHours: row.working_hours || 'السبت - الخميس: ٥:٠٠ م - ١٠:٠٠ م',
    scheduleConfig: row.schedule_config || null,
    createdAt: row.created_at
  };
}

export function toDbClinic(data) {
  if (!data) return {};
  const payload = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.doctorName !== undefined) payload.doctor_name = data.doctorName;
  if (data.specialty !== undefined) payload.specialty = data.specialty;
  if (data.address !== undefined) payload.address = data.address;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.doctorEmail !== undefined) payload.doctor_email = data.doctorEmail;
  if (data.regularFee !== undefined) payload.regular_fee = data.regularFee;
  if (data.consultationFee !== undefined) payload.consultation_fee = data.consultationFee;
  if (data.workingHours !== undefined) payload.working_hours = data.workingHours;
  if (data.scheduleConfig !== undefined) payload.schedule_config = data.scheduleConfig;

  return payload;
}

export async function getClinicInfo(clinicId = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase.from('clinics').select('*');
    if (clinicId) {
      query = query.eq('id', clinicId);
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    return { data: data ? fromDbClinic(data) : null, error: null };
  } catch (error) {
    console.error('Error fetching clinic info:', error);
    return { data: null, error };
  }
}

export async function updateClinicInfo(clinicId, updateData) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const dbPayload = toDbClinic(updateData);
    let query = supabase.from('clinics').update(dbPayload);
    if (clinicId) {
      query = query.eq('id', clinicId);
    }
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    return { data: data ? fromDbClinic(data) : null, error: null };
  } catch (error) {
    console.error('Error updating clinic info:', error);
    return { data: null, error };
  }
}
