/**
 * Smart Post-Visit NPS & Google Reviews Funnel
 * 5-Star ratings -> Directed to Google Maps Review URL
 * Low ratings -> Directed to Private Clinic Management Inbox
 */

import { safeStorage } from '../utils/safeStorage';

const FEEDBACK_STORAGE_KEY = 'clinicflow_feedbacks';

export function getStoredFeedbacks(clinicId) {
  const key = clinicId ? `${FEEDBACK_STORAGE_KEY}_${clinicId}` : FEEDBACK_STORAGE_KEY;
  const list = safeStorage.getItem(key, []);
  if (clinicId && Array.isArray(list)) {
    return list.filter(f => !f.clinicId || f.clinicId === clinicId);
  }
  return Array.isArray(list) ? list : [];
}

export function saveFeedback(feedback, clinicId) {
  const key = clinicId ? `${FEEDBACK_STORAGE_KEY}_${clinicId}` : FEEDBACK_STORAGE_KEY;
  const current = getStoredFeedbacks(clinicId);
  const feedbackWithClinic = {
    ...feedback,
    clinicId: clinicId || feedback.clinicId || undefined,
    clinic_id: clinicId || feedback.clinic_id || undefined
  };
  const updated = [feedbackWithClinic, ...current.filter(f => f.id !== feedback.id)];
  safeStorage.setItem(key, updated);
  return updated;
}

/**
 * Scan recent completed visits eligible for 24h follow-up
 */
export function getPostVisitEligiblePatients(appointments = []) {
  if (!appointments || !Array.isArray(appointments)) return [];

  return appointments
    .filter(a => a.status === 'completed')
    .map(a => ({
      appointmentId: a.id,
      patientId: a.patientId,
      patientName: a.patientName,
      patientPhone: a.patientPhone,
      date: a.date,
      time: a.time,
      type: a.type || 'كشف',
      feedbackSent: false
    }));
}

export function generatePostVisitFeedbackMessage(patient, appointment, clinicInfo) {
  const patientFirstName = (patient?.name || appointment?.patientName || 'مريضنا العزيز').split(' ')[0];
  const clinicName = clinicInfo?.name || 'العيادة';
  const googleReviewUrl = clinicInfo?.googleReviewUrl || 'https://maps.google.com';
  
  const text = 
    `مرحباً ${patientFirstName} 🌸\n` +
    `شكراً لزيارتك لـ ${clinicName} بالأمس. صحتك ورضاك هما أولويتنا دائماً.\n\n` +
    `رأيك يهمنا جداً! كيف تقيم تجربتك معنا اليوم؟\n\n` +
    `⭐️⭐️⭐️⭐️⭐️ (ممتازة جداً): شاركنا رأيك على جوجل لمساعدتنا في خدمة مرضى آخرين:\n${googleReviewUrl}\n\n` +
    `📝 إذا كان لديك أي ملاحظة أو استفسار، يسعدنا تواصلك المباشر معنا لنقدم لك الأفضل دائماً!`;

  return text;
}
