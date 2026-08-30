import { supabase, isSupabaseConfigured, NOT_CONFIGURED_ERROR } from '../lib/supabase';

export async function addPatientFeedback(feedback) {
  if (!isSupabaseConfigured()) {
    return { data: feedback, error: NOT_CONFIGURED_ERROR };
  }

  try {
    const { data, error } = await supabase.from('patient_feedback').insert({
      patient_id: feedback.patientId || null,
      appointment_id: feedback.appointmentId || null,
      rating: Number(feedback.rating || 5),
      comment: feedback.comment || ''
    }).select().single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error recording patient feedback:', error);
    return { data: feedback, error };
  }
}
