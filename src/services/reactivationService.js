import { formatDoctorName } from '../utils/doctorAgentHelpers';

/**
 * 3-Stage Drip Reactivation Sequence
 * Stage 1: Soft Care / Check-in
 * Stage 2: Clinical Value / Health Tip
 * Stage 3: Special Voucher / Free Follow-up
 */

export const REACTIVATION_STAGES = {
  STAGE_1_CARE: 1,
  STAGE_2_VALUE: 2,
  STAGE_3_OFFER: 3,
  CONVERTED: 'converted'
};

export function generateReactivationMessage(stage, patient, clinicInfo) {
  const patientFirstName = (patient.name || 'مريضنا العزيز').split(' ')[0];
  const doctorName = formatDoctorName(clinicInfo?.doctorName || 'طبيب العيادة');
  const clinicName = clinicInfo?.name || 'العيادة';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinic-flow.com';
  const bookingUrl = `${origin}/booking`;


  switch (stage) {
    case REACTIVATION_STAGES.STAGE_1_CARE:
      return `أهلاً ${patientFirstName} ✨\n${doctorName} وفريق ${clinicName} بنطمن عليك وعلى صحتك ونتايج آخر زيارة ليك بالعيادة. يسعدنا دايماً نكون جزء من اهتمامك بصحتك. لو حابب تستفسر عن أي شيء أو تجدول فحصك الدوري احنا في خدمتك: \n${bookingUrl}`;

    case REACTIVATION_STAGES.STAGE_2_VALUE:
      return `مرحباً ${patientFirstName} 💡\nمعلومة طبية سريعة من ${doctorName}: الفحص والمتابعة الدورية كل 6 أشهر بيحميك من 90% من المضاعفات غير المتوقعة ويوفر عليك تكاليف علاجات طويلة. بنفكرك تحجز موعد المتابعة الوقائي بكل سهولة: \n${bookingUrl}`;

    case REACTIVATION_STAGES.STAGE_3_OFFER:
      return `عزيزنا ${patientFirstName} 🎁\nتقديراً لثقتك في ${clinicName} ومرور فترة على آخر زيارة، وفرنالك جلسة كشف واستشارة متابعة مجانية كاملة + خصم خاص 15% على أي إجراء تجميلي أو علاجي خلال هذا الأسبوع.\n\nلحجز موعدك والاستفادة من العرض: \n${bookingUrl}`;

    default:
      return `مرحباً ${patientFirstName}، نتمنى لك دوام الصحة والعافية في ${clinicName}.\n${bookingUrl}`;
  }
}

/**
 * Advance patient drip flow state
 */
export function getNextDripStage(currentStage) {
  if (currentStage === REACTIVATION_STAGES.STAGE_1_CARE) return REACTIVATION_STAGES.STAGE_2_VALUE;
  if (currentStage === REACTIVATION_STAGES.STAGE_2_VALUE) return REACTIVATION_STAGES.STAGE_3_OFFER;
  return REACTIVATION_STAGES.CONVERTED;
}
