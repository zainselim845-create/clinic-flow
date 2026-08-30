/**
 * Smart Post-Visit NPS & Google Reviews Funnel
 * 5-Star ratings -> Directed to Google Maps Review URL
 * Low ratings -> Directed to Private Clinic Management Inbox
 */

export function generatePostVisitFeedbackMessage(patient, appointment, clinicInfo) {
  const patientFirstName = (patient?.name || appointment?.patientName || 'مريضنا العزيز').split(' ')[0];
  const clinicName = clinicInfo?.name || 'العيادة';
  const googleReviewUrl = clinicInfo?.googleReviewUrl || 'https://maps.google.com';
  
  const text = `مرحباً ${patientFirstName} 🌸\nشكراً لزيارتك لـ ${clinicName} بالأمس. صحتك ورضاك هما أولويتنا دائماً.\n\nرأيك يهمنا جداً! كيف تقيم تجربتك معنا اليوم؟\n\n⭐️⭐️⭐️⭐️⭐️ (ممتازة جداً): شاركنا رأيك على جوجل لمساعدتنا في خدمة مرضى آخرين:\n${googleReviewUrl}\n\n📝 إذا كان لديك أي ملاحظة أو استفسار، يسعدنا تواصلك المباشر معنا لنقدم لك الأفضل دائماً!`;

  return text;
}
