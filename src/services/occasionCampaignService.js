/**
 * Occasion & Birthday Campaigns Service
 * Generates personalized, clinically tailored greeting & promotional messages
 * based on patient history, preferred services, and upcoming events.
 */

export const OCCASIONS = [
  { id: 'birthday', name: 'أعياد ميلاد المرضى', icon: '🎂', description: 'تهنئة عيد الميلاد مع هدية خصم خاصة' },
  { id: 'ramadan', name: 'شهر رمضان المبارك', icon: '🌙', description: 'عروض العناية والابتسامة الرمضانية' },
  { id: 'eid', name: 'عيد الفطر والأضحى', icon: '✨', description: 'استعدادات العيد وتبييض الأسنان والنضارة' },
  { id: 'summer', name: 'موسم الصيف والمناسبات', icon: '☀️', description: 'جلسات النضارة وباقات الليزر الصيفية' }
];

/**
 * Scan patients with upcoming birthdays or eligible for seasonal occasions
 */
export function getOccasionCampaignCandidates(patients = [], occasionId = 'birthday') {
  if (!patients || !Array.isArray(patients)) return [];

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12

  return patients.map(p => {
    // Derive favorite service from diagnosis or last notes
    const favoriteService = p.diagnosis || (p.lastTreatment || 'خدمات العناية المتكاملة');
    
    // Check birthday match (if birthDate exists, or fallback based on patient ID hash for demo)
    let isBirthdayCandidate = false;
    if (p.birthDate) {
      const bMonth = new Date(p.birthDate).getMonth() + 1;
      isBirthdayCandidate = bMonth === currentMonth;
    } else {
      // Deterministic spread for demo purposes
      isBirthdayCandidate = ((parseInt((p.id || '1').replace(/\D/g, ''), 10) || 1) % 4) === 0;
    }

    return {
      patientId: p.id,
      patientName: p.name,
      patientPhone: p.phone,
      favoriteService,
      isBirthdayCandidate,
      visitsCount: p.visitsCount || 1
    };
  });
}

/**
 * Generate Personalized Message for Occasion
 */
export function generatePersonalizedOccasionMessage(patient, occasionId, clinicInfo, customOffer = '') {
  const patientFirstName = (patient?.patientName || patient?.name || 'مريضنا العزيز').split(' ')[0];
  const clinicName = clinicInfo?.name || 'مركز النخبة الطبي';
  const service = patient?.favoriteService || 'العناية بصحتك وابتسامتك';
  const offer = customOffer || 'خصم خاص 20% على زيارتك القادمة';

  switch (occasionId) {
    case 'birthday':
      return (
        `كل عام وأنت بألف خير يا ${patientFirstName}! 🎂🎉\n\n` +
        `طاقم ${clinicName} يتمنى لك عاماً سعيداً مليئاً بالصحة والنجاح.\n` +
        `احتفالاً بيوم ميلادك، خصصنا لك هدية حصرية:\n` +
        `🎁 ${offer} خاصة بـ (${service}).\n\n` +
        `يسعدنا تشريفك وحجز موعدك في أي وقت يناسبك! 🌸`
      );

    case 'ramadan':
      return (
        `رمضان مبارك عليك وعلى أسرتك الكريمة يا ${patientFirstName}! 🌙✨\n\n` +
        `نتمنى لك شهراً مباركاً وصحة دائمة من ${clinicName}.\n` +
        `بمناسبة الشهر الفضيل، نقدم لك عرض العناية الرمضاني:\n` +
        `🌟 ${offer} لخدمات ${service}.\n\n` +
        `مواعيدنا ممتدة ومريحة طوال الشهر الكريم.`
      );

    case 'eid':
      return (
        `عيدكم مبارك وكل عام وأنتم بخير يا ${patientFirstName}! 🎊✨\n\n` +
        `استعد للعيد بأجمل إطلالة وابتسامة ناصعة من ${clinicName}.\n` +
        `عرض العيد المخصص لك:\n` +
        `✨ ${offer} لـ ${service}.\n\n` +
        `احجز موعدك الآن قبل اكتمال المواعيد في العيد!`
      );

    case 'summer':
    default:
      return (
        `مرحباً ${patientFirstName} ☀️🌴\n\n` +
        `بداية موسم الصيف والمناسبات هي الوقت المثالي لتجديد إشراقتك!\n` +
        `يسر ${clinicName} تقديم باقة الصيف الخاصة:\n` +
        `🏖️ ${offer} على ${service}.\n\n` +
        `تواصل معنا لتأكيد حجزك بكل سهولة.`
      );
  }
}
