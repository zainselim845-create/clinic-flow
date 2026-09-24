import { formatDoctorName } from '../utils/doctorAgentHelpers';

/**
 * No-Show Recovery Engine
 * Re-engages patients who missed their scheduled appointments with gentle self-service rescheduling
 */

export function generateNoShowRecoveryMessage(appointment, clinicInfo) {
  const patientFirstName = (appointment?.patientName || 'مريضنا العزيز').split(' ')[0];
  const doctorName = formatDoctorName(clinicInfo?.doctorName || 'طبيب العيادة');
  const clinicName = clinicInfo?.name || 'العيادة';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinic-flow.com';
  const clinicSlug = clinicInfo?.slug || appointment?.clinicSlug;
  const rescheduleUrl = clinicSlug 
    ? `${origin}/c/${clinicSlug}/booking` 
    : `${origin}/booking`;

  return `أهلاً بك ${patientFirstName}.\nنأسف لعدم تمكنك من حضور موعدك اليوم في ${clinicName} مع ${doctorName}.\n\nصحتك تهمنا دائماً، وإذا كان هناك ظرف طارئ نرجو أن تكون بأفضل حال. يسعدنا مساعدتك في اختيار موعد بديل يناسب جدولك بضغطة زر وبدون انتظار عبر الرابط:\n${rescheduleUrl}\n\nنتمنى لك دوام الصحة والعافية!`;
}
