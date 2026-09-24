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

export const REACTIVATION_STAGES_LIST = [
  { stage: REACTIVATION_STAGES.STAGE_1_CARE, name: 'المرحلة 1: تذكير واطمئنان', discount: false },
  { stage: REACTIVATION_STAGES.STAGE_2_VALUE, name: 'المرحلة 2: إرشاد وقائي', discount: false },
  { stage: REACTIVATION_STAGES.STAGE_3_OFFER, name: 'المرحلة 3: عرض خاص واستشارة', discount: true },
];

export function generateReactivationMessage(stageOrPatient, patientOrStage, clinicInfo) {
  let stage = stageOrPatient;
  let patient = patientOrStage;

  // Handle parameter inversion gracefully
  if (typeof stageOrPatient === 'object' && stageOrPatient !== null && (typeof patientOrStage === 'number' || typeof patientOrStage === 'string')) {
    patient = stageOrPatient;
    stage = patientOrStage;
  }

  const patientFirstName = (patient?.name || 'مريضنا العزيز').split(' ')[0];
  const doctorName = formatDoctorName(clinicInfo?.doctorName || 'طبيب العيادة');
  const clinicName = clinicInfo?.name || 'العيادة';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinic-flow.com';
  const clinicSlug = clinicInfo?.slug;
  const bookingUrl = clinicSlug ? `${origin}/c/${clinicSlug}/booking` : `${origin}/booking`;

  switch (stage) {
    case REACTIVATION_STAGES.STAGE_1_CARE:
      return `أهلاً بك ${patientFirstName}.\n${doctorName} وفريق ${clinicName} يطمئنون على صحتك ونتائج آخر زيارة لك بالعيادة. يسعدنا دائماً تقديم المشورة الطبية وجدولة فحصك الدوري لراحتك:\n${bookingUrl}`;

    case REACTIVATION_STAGES.STAGE_2_VALUE:
      return `مرحباً بك ${patientFirstName}.\nإرشاد طبي وقائي من ${doctorName}: الفحص والمتابعة الدورية كل 6 أشهر يقي من المضاعفات غير المتوقعة ويوفر تكاليف علاجات طويلة. نذكرك بحجز موعد المتابعة الوقائي بكل سهولة:\n${bookingUrl}`;

    case REACTIVATION_STAGES.STAGE_3_OFFER:
      return `عزيزنا ${patientFirstName}.\nتقديراً لثقتك في ${clinicName}، يسعدنا تقديم استشارة متابعة مجانية مع خصم خاص 15% على أي إجراء تكميلي خلال هذا الأسبوع.\n\nلحجز موعدك والاستفادة من الميزة:\n${bookingUrl}`;

    default:
      return `مرحباً بك ${patientFirstName}، نتمنى لك دوام الصحة والعافية في ${clinicName}.\n${bookingUrl}`;
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
