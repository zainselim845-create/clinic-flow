import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const getPrescriptions = async (clinicId) => {
  if (!isSupabaseConfigured()) return [];
  try {
    let query = supabase.from('prescriptions').select('*').order('created_at', { ascending: false });
    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching prescriptions from Supabase:', error);
      return [];
    }
    return (data || []).map(p => ({
      id: p.id,
      patientId: p.patient_id,
      patientName: p.patient_name,
      patientPhone: p.patient_phone,
      appointmentId: p.appointment_id,
      date: p.date,
      doctorName: p.doctor_name,
      specialty: p.specialty,
      diagnosis: p.diagnosis,
      medications: p.medications || [],
      labTests: p.lab_tests,
      followUpDate: p.follow_up_date,
      generalAdvice: p.general_advice,
      createdAt: p.created_at
    }));
  } catch (err) {
    console.warn('Supabase getPrescriptions exception:', err);
    return [];
  }
};

export const addPrescription = async (prescription) => {
  if (!isSupabaseConfigured()) return prescription;
  try {
    const payload = {
      patient_id: prescription.patientId,
      patient_name: prescription.patientName,
      patient_phone: prescription.patientPhone,
      appointment_id: prescription.appointmentId,
      date: prescription.date,
      doctor_name: prescription.doctorName,
      specialty: prescription.specialty,
      diagnosis: prescription.diagnosis,
      medications: prescription.medications || [],
      lab_tests: prescription.labTests,
      follow_up_date: prescription.followUpDate,
      general_advice: prescription.generalAdvice
    };
    const { data, error } = await supabase.from('prescriptions').insert([payload]).select().single();
    if (error) {
      console.warn('Error inserting prescription into Supabase:', error);
      return prescription;
    }
    return { ...prescription, id: data.id };
  } catch (err) {
    console.warn('Supabase addPrescription exception:', err);
    return prescription;
  }
};

export const deletePrescription = async (id) => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase.from('prescriptions').delete().eq('id', id);
    if (error) {
      console.warn('Error deleting prescription from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase deletePrescription exception:', err);
    return false;
  }
};
