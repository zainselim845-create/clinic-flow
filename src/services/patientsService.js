import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Get all patients for a clinic
 */
export async function getPatients(clinicId) {
  if (!isSupabaseConfigured()) return null;

  try {
    let query = supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching patients:', error);
    return { data: null, error };
  }
}

/**
 * Add a new patient
 */
export async function addPatient(patient) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('patients')
      .insert([patient])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding patient:', error);
    return { data: null, error };
  }
}

/**
 * Update an existing patient
 */
export async function updatePatient(id, updateData) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating patient:', error);
    return { data: null, error };
  }
}

/**
 * Delete a patient
 */
export async function deletePatient(id) {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error deleting patient:', error);
    return { data: null, error };
  }
}

/**
 * Find patient by phone number (for booking)
 */
export async function findPatientByPhone(clinicId, phone) {
  if (!isSupabaseConfigured()) return null;

  try {
    let query = supabase
      .from('patients')
      .select('*')
      .eq('phone', phone);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error finding patient by phone:', error);
    return { data: null, error };
  }
}
