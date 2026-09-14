import { supabase, isSupabaseConfigured } from '../lib/supabase';

const NOT_CONFIGURED_ERROR = new Error('Supabase is not configured');

export function fromDbClinic(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || 'عيادة تخصصية',
    slug: row.slug || (row.name ? row.name.toLowerCase().replace(/\s+/g, '-') : 'clinic'),
    doctorName: row.doctor_name || row.name || 'طبيب العيادة',
    specialty: row.specialty || 'الطب العام والتخصصي',
    address: row.address || '',
    phone: row.phone || '',
    doctorEmail: row.doctor_email || '',
    regularFee: row.regular_fee || '300 ج.م',
    consultationFee: row.consultation_fee || '150 ج.م',
    workingHours: row.working_hours || 'السبت - الخميس: ٥:٠٠ م - ١٠:٠٠ م',
    scheduleConfig: row.schedule_config || null,
    customDomain: row.custom_domain || null,
    custom_domain: row.custom_domain || null,
    subscriptionTier: row.subscription_tier || 'pro',
    subscriptionStatus: row.subscription_status || 'active',
    branding: row.branding || { primaryColor: '#0071E3', accentColor: '#10B981' },
    quotas: row.quotas || { maxDoctors: 3, monthlySmsQuota: 1000, smsUsed: 0 },
    createdAt: row.created_at
  };
}

export function toDbClinic(data) {
  if (!data) return {};
  const payload = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.doctorName !== undefined) payload.doctor_name = data.doctorName;
  if (data.specialty !== undefined) payload.specialty = data.specialty;
  if (data.address !== undefined) payload.address = data.address;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.doctorEmail !== undefined) payload.doctor_email = data.doctorEmail;
  if (data.regularFee !== undefined) payload.regular_fee = data.regularFee;
  if (data.consultationFee !== undefined) payload.consultation_fee = data.consultationFee;
  if (data.workingHours !== undefined) payload.working_hours = data.workingHours;
  if (data.scheduleConfig !== undefined) payload.schedule_config = data.scheduleConfig;
  if (data.customDomain !== undefined || data.custom_domain !== undefined) {
    payload.custom_domain = data.customDomain || data.custom_domain;
  }
  if (data.subscriptionTier !== undefined) payload.subscription_tier = data.subscriptionTier;
  if (data.subscriptionStatus !== undefined) payload.subscription_status = data.subscriptionStatus;
  if (data.branding !== undefined) payload.branding = data.branding;
  if (data.quotas !== undefined) payload.quotas = data.quotas;

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

export async function getAllClinicsFromDb() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase.from('clinics').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return { data: (data || []).map(fromDbClinic), error: null };
  } catch (error) {
    console.error('Error fetching all clinics from DB:', error);
    return { data: [], error };
  }
}

export async function createClinicInDb(clinicData) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const payload = {
      ...(clinicData.id ? { id: clinicData.id } : {}),
      ...toDbClinic(clinicData)
    };
    const { data, error } = await supabase.from('clinics').insert(payload).select().maybeSingle();
    if (error) throw error;
    return { data: data ? fromDbClinic(data) : null, error: null };
  } catch (error) {
    console.error('Error creating clinic in DB:', error);
    return { data: null, error };
  }
}

export async function deleteClinicFromDb(clinicId) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { error } = await supabase.from('clinics').delete().eq('id', clinicId);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting clinic from DB:', error);
    return { success: false, error };
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
