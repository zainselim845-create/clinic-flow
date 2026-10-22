import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
    regularFee: row.regular_fee || '',
    consultationFee: row.consultation_fee || '',
    workingHours: row.working_hours || 'السبت - الخميس: ٥:٠٠ م - ١٠:٠٠ م',
    scheduleConfig: row.schedule_config || null,
    customDomain: row.custom_domain || null,
    custom_domain: row.custom_domain || null,
    subscriptionTier: row.subscription_tier || 'pro',
    subscriptionStatus: row.subscription_status || 'active',
    branding: row.branding || { primaryColor: '#09090B', accentColor: '#10B981' },
    quotas: row.quotas || { maxDoctors: 3, monthlySmsQuota: 1000, smsUsed: 0 },
    googleMapsUrl: row.google_maps_url || row.googleMapsUrl || '',
    coordinates: row.coordinates || row.branding?.coordinates || null,
    ownerLocation: row.owner_location || row.ownerLocation || row.branding?.ownerLocation || (row.coordinates?.isOwnerDevice ? row.coordinates : (row.branding?.coordinates?.isOwnerDevice ? row.branding.coordinates : null)),
    deletedAt: row.deleted_at || null,
    deleted_at: row.deleted_at || null,
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
  if (data.googleMapsUrl !== undefined || data.google_maps_url !== undefined) {
    payload.google_maps_url = data.googleMapsUrl || data.google_maps_url;
  }
  if (data.coordinates !== undefined || data.ownerLocation !== undefined || data.owner_location !== undefined) {
    const ownerLoc = data.ownerLocation !== undefined ? data.ownerLocation : data.owner_location;
    payload.branding = {
      ...(payload.branding || {}),
      ...(data.coordinates !== undefined ? { coordinates: data.coordinates } : {}),
      ...(ownerLoc !== undefined ? { ownerLocation: ownerLoc } : {})
    };
  }
  if (data.deletedAt !== undefined || data.deleted_at !== undefined) {
    payload.deleted_at = data.deletedAt !== undefined ? data.deletedAt : data.deleted_at;
  }

  return payload;
}

// Track whether remote Supabase 'clinics' table contains deleted_at column.
// Defaults to false to prevent HTTP 400 (code 42703) on live production databases lacking this column.
let hasClinicsDeletedAtColumn = false;

export function setHasClinicsDeletedAtColumn(supported) {
  hasClinicsDeletedAtColumn = Boolean(supported);
}

export function getHasClinicsDeletedAtColumn() {
  return hasClinicsDeletedAtColumn;
}

const isUuidString = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

export async function getClinicInfo(clinicId = null, options = {}) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase.from('clinics').select('*');
    if (hasClinicsDeletedAtColumn && !options.includeDeleted) {
      query = query.is('deleted_at', null);
    }
    if (clinicId) {
      query = isUuidString(clinicId) ? query.eq('id', clinicId) : query.eq('slug', clinicId);
    }
    let { data, error } = await query.limit(1).maybeSingle();
    if (error && (error.code === '42703' || String(error.message || '').includes('deleted_at'))) {
      hasClinicsDeletedAtColumn = false;
      let fallbackQuery = supabase.from('clinics').select('*');
      if (clinicId) {
        fallbackQuery = isUuidString(clinicId) ? fallbackQuery.eq('id', clinicId) : fallbackQuery.eq('slug', clinicId);
      }
      const fallback = await fallbackQuery.limit(1).maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }
    if (error) throw error;
    const parsed = data ? fromDbClinic(data) : null;
    if (parsed && !options.includeDeleted && (parsed.deletedAt || parsed.deleted_at)) {
      return { data: null, error: null };
    }
    return { data: parsed, error: null };
  } catch (error) {
    console.error('Error fetching clinic info:', error);
    return { data: null, error };
  }
}

export async function getAllClinicsFromDb(options = {}) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  try {
    let query = supabase.from('clinics').select('*');
    if (hasClinicsDeletedAtColumn && !options.includeDeleted) {
      query = query.is('deleted_at', null);
    }
    let { data, error } = await query.order('created_at', { ascending: false });
    if (error && (error.code === '42703' || String(error.message || '').includes('deleted_at'))) {
      hasClinicsDeletedAtColumn = false;
      const fallback = await supabase.from('clinics').select('*').order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }
    if (error) throw error;
    let list = (data || []).map(fromDbClinic);
    if (!options.includeDeleted) {
      list = list.filter(c => !c.deletedAt && !c.deleted_at);
    }
    return { data: list, error: null };
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

export async function deleteClinicFromDb(clinicId, options = {}) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: NOT_CONFIGURED_ERROR };
  }

  if (!clinicId) {
    return { success: false, error: new Error('Clinic ID is strictly required to delete clinic') };
  }

  try {
    const isUuid = isUuidString(clinicId);
    if (options.hardDelete) {
      let delQuery = supabase.from('clinics').delete();
      delQuery = isUuid ? delQuery.eq('id', clinicId) : delQuery.eq('slug', clinicId);
      const { error } = await delQuery;
      if (error) throw error;
      return { success: true, error: null };
    }

    // Default: Soft-delete for compliance, audit trails, and financial retention
    const payload = { 
      subscription_status: 'cancelled'
    };
    if (hasClinicsDeletedAtColumn) {
      payload.deleted_at = new Date().toISOString();
    }

    let updateQuery = supabase.from('clinics').update(payload);
    updateQuery = isUuid ? updateQuery.eq('id', clinicId) : updateQuery.eq('slug', clinicId);
    let { error } = await updateQuery;

    if (error && (error.code === '42703' || String(error.message || '').includes('deleted_at'))) {
      hasClinicsDeletedAtColumn = false;
      let fallback = supabase.from('clinics').update({ subscription_status: 'cancelled' });
      fallback = isUuid ? fallback.eq('id', clinicId) : fallback.eq('slug', clinicId);
      const res = await fallback;
      error = res.error;
    }

    if (error) throw error;
    return { success: true, error: null, softDeleted: true };
  } catch (error) {
    console.error('Error deleting clinic from DB:', error);
    return { success: false, error };
  }
}

export async function updateClinicInfo(clinicId, updateData) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }

  if (!clinicId) {
    return { data: null, error: new Error('Clinic ID is strictly required to update clinic info') };
  }

  try {
    const dbPayload = toDbClinic(updateData);
    const isUuid = isUuidString(clinicId);
    let query = supabase.from('clinics').update(dbPayload);
    if (isUuid) {
      query = query.or(`id.eq.${clinicId},slug.eq.${clinicId}`);
    } else {
      query = query.eq('slug', clinicId);
    }
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    return { data: data ? fromDbClinic(data) : null, error: null };
  } catch (error) {
    console.error('Error updating clinic info:', error);
    return { data: null, error };
  }
}

/**
 * Searches for a clinic in Supabase DB by doctor email, phone, or slug
 * @param {string} identifier - Email, phone number, or slug
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function findClinicByEmailOrIdentifier(identifier) {
  if (!isSupabaseConfigured() || !identifier) {
    return { data: null, error: isSupabaseConfigured() ? null : NOT_CONFIGURED_ERROR };
  }

  try {
    const clean = String(identifier).trim();
    const cleanLower = clean.toLowerCase();
    const cleanPhone = clean.replace(/\D/g, '');

    // 1. Check by doctor_email if it contains @
    if (cleanLower.includes('@')) {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .ilike('doctor_email', cleanLower)
        .limit(1)
        .maybeSingle();

      if (data) return { data: fromDbClinic(data), error: null };
      if (error && error.code !== 'PGRST116') throw error;
    }

    // 2. Check by phone if phone digits are sufficient
    if (cleanPhone.length >= 8) {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .ilike('phone', `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (data) return { data: fromDbClinic(data), error: null };
      if (error && error.code !== 'PGRST116') throw error;
    }

    // 3. Check by slug
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('slug', cleanLower)
      .limit(1)
      .maybeSingle();

    if (data) return { data: fromDbClinic(data), error: null };
    if (error && error.code !== 'PGRST116') throw error;

    return { data: null, error: null };
  } catch (error) {
    console.error('Error finding clinic by identifier from DB:', error);
    return { data: null, error };
  }
}

/**
 * Searches for a clinic strictly by doctor email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function findClinicByDoctorEmail(email) {
  const result = await findClinicByEmailOrIdentifier(email);
  return result?.data || null;
}

/**
 * Subscribes to real-time changes on the clinics table across the platform
 * (Used by Super Admin Dashboard for instant multi-tenant reactivity)
 * @param {Object} options
 * @param {Function} options.onClinicChange
 * @param {Function} [options.onStatusChange]
 * @returns {{ unsubscribe: Function }}
 */
export function subscribeToPlatformClinics({ onClinicChange, onStatusChange } = {}) {
  if (!isSupabaseConfigured()) {
    return { unsubscribe: () => {} };
  }

  try {
    const channel = supabase.channel('platform-clinics-realtime');
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'clinics'
      },
      (payload) => {
        onClinicChange?.(payload);
      }
    );

    channel.subscribe((status) => {
      onStatusChange?.(status);
    });

    return {
      unsubscribe: () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  } catch (err) {
    console.warn('[ClinicsService] subscribeToPlatformClinics warning:', err);
    return { unsubscribe: () => {} };
  }
}

/**
 * Public safe getter for patient booking (uses public_get_active_clinic_by_slug RPC)
 * Allows anonymous visitors to fetch only public clinic metadata without table scan access
 * @param {string} slug
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getPublicClinicBySlug(slug) {
  if (!isSupabaseConfigured() || !slug) {
    return { data: null, error: isSupabaseConfigured() ? null : NOT_CONFIGURED_ERROR };
  }

  try {
    const cleanSlug = String(slug).trim().toLowerCase();
    const { data, error } = await supabase.rpc('public_get_active_clinic_by_slug', { p_slug: cleanSlug });
    if (error) {
      // Fallback to table query if RPC not yet deployed or in dev environment
      const fallback = await supabase
        .from('clinics')
        .select('*')
        .eq('slug', cleanSlug)
        .limit(1)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      return { data: fallback.data ? fromDbClinic(fallback.data) : null, error: null };
    }

    const row = Array.isArray(data) ? data[0] : data;
    return { data: row ? fromDbClinic(row) : null, error: null };
  } catch (error) {
    console.error('Error fetching public clinic by slug:', error);
    return { data: null, error };
  }
}

