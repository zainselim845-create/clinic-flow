/**
 * Smart Post-Visit NPS & Google Reviews Funnel
 * 5-Star ratings -> Directed to Google Maps Review URL
 * Low ratings -> Directed to Private Clinic Management Inbox
 */

import { safeStorage } from '../utils/safeStorage';

const FEEDBACK_STORAGE_KEY = 'clinicflow_feedbacks';

export function getStoredFeedbacks() {
  return safeStorage.getItem(FEEDBACK_STORAGE_KEY, [
    { id: 'f-1', patientName: 'سارة إبراهيم', rating: 5, status: 'google_review_posted', comment: 'عيادة ممتازة ودكتور شاطر جداً', date: '2026-08-28' },
    { id: 'f-2', patientName: 'محمود عبد الفتاح', rating: 3, status: 'management_investigating', comment: 'الانتظار كان طويل شوية', date: '2026-08-29' }
  ]);
}

export function saveFeedback(feedback) {
  const current = getStoredFeedbacks();
  const updated = [feedback, ...current.filter(f => f.id !== feedback.id)];
  safeStorage.setItem(FEEDBACK_STORAGE_KEY, updated);
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
