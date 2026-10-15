import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '@/lib/supabase';

export function fromDbClinicalNote(row) {
  if (!row) return null;
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    appointmentId: row.appointment_id,
    doctorName: row.doctor_name || '',
    chiefComplaint: row.chief_complaint || '',
    diagnosis: row.diagnosis || '',
    treatmentNotes: row.treatment_notes || '',
    nextVisitPlan: row.next_visit_plan || '',
    createdAt: row.created_at
  };
}

export function toDbClinicalNote(data) {
  if (!data) return {};
  return {
    id: data.id || undefined,
    clinic_id: data.clinicId || undefined,
    patient_id: data.patientId,
    appointment_id: data.appointmentId || null,
    doctor_name: data.doctorName || '',
    chief_complaint: data.chiefComplaint || '',
    diagnosis: data.diagnosis || '',
    treatment_notes: data.treatmentNotes || '',
    next_visit_plan: data.nextVisitPlan || ''
  };
}

export async function getPatientClinicalNotes(patientId) {
  if (!isSupabaseConfigured() || !patientId) {
    return { data: [], error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase
      .from('clinical_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data || []).map(fromDbClinicalNote), error: null };
  } catch (error) {
    console.error('Error fetching clinical notes:', error);
    return { data: [], error };
  }
}

export async function addClinicalNote(note) {
  if (!isSupabaseConfigured()) {
    return { data: note, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const row = toDbClinicalNote(note);
    const { data, error } = await supabase
      .from('clinical_notes')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return { data: fromDbClinicalNote(data), error: null };
  } catch (error) {
    console.error('Error adding clinical note:', error);
    return { data: note, error };
  }
}

export async function deleteClinicalNote(id) {
  if (!isSupabaseConfigured()) {
    return { success: true, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { error } = await supabase
      .from('clinical_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting clinical note:', error);
    return { success: false, error };
  }
}

/* =========================================================================
 * Clinic-scoped strict layer (tenant binding — prescriptionService pattern)
 * ========================================================================= */

/**
 * Fetches clinical notes for a clinic (optionally narrowed to one patient),
 * strictly bound to clinic_id.
 */
export async function getClinicClinicalNotes(clinicId, patientId = null) {
  if (!clinicId) {
    throw new Error('clinicId is strictly required to fetch clinical notes');
  }
  if (!isSupabaseConfigured()) {
    return { data: null, error: NOT_CONFIGURED_ERROR };
  }
  let query = supabase
    .from('clinical_notes')
    .select('*')
    .eq('clinic_id', clinicId);
  if (patientId) {
    query = query.eq('patient_id', patientId);
  }
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return { data: null, error };
  return { data: (data || []).map(fromDbClinicalNote), error: null };
}

/**
 * Insert with a strict clinic binding — refuses notes that are not
 * tenant-owned (defense in depth on top of the prescriber-write RLS tier).
 */
export async function addClinicalNoteForClinic(note) {
  const clinicId = note?.clinicId || note?.clinic_id;
  if (!clinicId) {
    throw new Error('clinicId is strictly required to add a clinical note');
  }
  return addClinicalNote(note);
}
