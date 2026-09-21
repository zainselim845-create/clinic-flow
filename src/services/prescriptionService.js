import { safeStorage } from '../utils/safeStorage';
import { checkPrescriptionSafety } from './drugInteractionService';

/**
 * Curated library of common Egyptian clinic medications across Dental, General,
 * Dermatology, Internal Medicine, and ENT specialties.
 */
export const COMMON_MEDICATIONS = [
  {
    id: 'med-augmentin-1g',
    name: 'أوجمنتين 1 جم (Augmentin 1g tab)',
    genericName: 'Amoxicillin / Clavulanic acid',
    category: 'antibiotic',
    defaultDose: 'قرص واحد',
    defaultFrequency: 'كل 12 ساعة بعد الأكل',
    defaultDuration: 'لمدة 7 أيام',
    defaultInstructions: 'مع كوب ماء وفير بعد الوجبة مباشرة'
  },
  {
    id: 'med-curam-1g',
    name: 'كيورام 1 جم (Curam 1g tab)',
    genericName: 'Amoxicillin / Clavulanic acid',
    category: 'antibiotic',
    defaultDose: 'قرص واحد',
    defaultFrequency: 'كل 12 ساعة بعد الأكل',
    defaultDuration: 'لمدة 7 أيام',
    defaultInstructions: 'بعد الأكل مباشرة'
  },
  {
    id: 'med-dalacin-300',
    name: 'دالاسين سي 300 مجم (Dalacin C 300mg cap)',
    genericName: 'Clindamycin',
    category: 'antibiotic',
    defaultDose: 'كبسولة واحدة',
    defaultFrequency: 'كل 8 ساعات',
    defaultDuration: 'لمدة 5-7 أيام',
    defaultInstructions: 'تؤخذ مع كوب ماء كبير في وضع الجلوس'
  },
  {
    id: 'med-flagyl-500',
    name: 'فلاجيل 500 مجم (Flagyl 500mg tab)',
    genericName: 'Metronidazole',
    category: 'antibiotic',
    defaultDose: 'قرص واحد',
    defaultFrequency: 'كل 8 ساعات بعد الأكل',
    defaultDuration: 'لمدة 5 أيام',
    defaultInstructions: 'بعد الأكل - تجنب تناوله على معدة فارغة'
  },
  {
    id: 'med-cataflam-50',
    name: 'كتافلام 50 مجم (Cataflam 50mg tab)',
    genericName: 'Diclofenac potassium',
    category: 'analgesic',
    defaultDose: 'قرص واحد',
    defaultFrequency: 'عند اللزوم أو كل 8 ساعات',
    defaultDuration: 'لمدة 3-5 أيام',
    defaultInstructions: 'بعد الأكل مباشرة لتجنب تهيج المعدة'
  },
  {
    id: 'med-panadol-extra',
    name: 'بانادول إكسترا (Panadol Extra tab)',
    genericName: 'Paracetamol / Caffeine',
    category: 'analgesic',
    defaultDose: 'قرص إلى قرصين',
    defaultFrequency: 'كل 6-8 ساعات عند اللزوم',
    defaultDuration: 'عند اللزوم (بحد أقصى 6 أقراص يومياً)',
    defaultInstructions: 'بعد الأكل مع كوب ماء'
  },
  {
    id: 'med-brufen-600',
    name: 'بروفين 600 مجم (Brufen 600mg tab)',
    genericName: 'Ibuprofen',
    category: 'nsaid',
    defaultDose: 'قرص واحد',
    defaultFrequency: 'كل 12 ساعة بعد الأكل',
    defaultDuration: 'لمدة 4 أيام',
    defaultInstructions: 'بعد الوجبات الرئيسية'
  },
  {
    id: 'med-controloc-40',
    name: 'كنترولوك 40 مجم (Controloc 40mg tab)',
    genericName: 'Pantoprazole',
    category: 'gastro',
    defaultDose: 'قرص واحد',
    defaultFrequency: 'مرة واحدة يومياً صباحاً',
    defaultDuration: 'لمدة 14 يوماً',
    defaultInstructions: 'قبل الإفطار بنصف ساعة'
  },
  {
    id: 'med-hexitol',
    name: 'مضمضة هكستول (Hexitol Mouthwash)',
    genericName: 'Chlorhexidine 0.1%',
    category: 'dental',
    defaultDose: '15 مل (ملء الغطاء)',
    defaultFrequency: 'مضمضة لمدة دقيقة مرتين يومياً',
    defaultDuration: 'لمدة 7-10 أيام',
    defaultInstructions: 'بدون تخفيف، والامتناع عن الأكل والشرب لمدة 30 دقيقة بعدها'
  },
  {
    id: 'med-zyrtec-10',
    name: 'زيرتك 10 مجم (Zyrtec 10mg tab)',
    genericName: 'Cetirizine',
    category: 'antihistamine',
    defaultDose: 'قرص واحد',
    defaultFrequency: 'مرة واحدة يومياً مساءً',
    defaultDuration: 'لمدة 5-7 أيام',
    defaultInstructions: 'قبل النوم'
  },
  {
    id: 'med-telfast-180',
    name: 'تلفاست 180 مجم (Telfast 180mg tab)',
    genericName: 'Fexofenadine',
    category: 'antihistamine',
    defaultDose: 'قرص واحد',
    defaultFrequency: 'مرة واحدة يومياً',
    defaultDuration: 'لمدة أسبوع',
    defaultInstructions: 'مع كوب ماء، لا يسبب النعاس'
  },
  {
    id: 'med-fucicort',
    name: 'كريم فيوسيكورت (Fucicort Cream)',
    genericName: 'Fusidic acid / Betamethasone',
    category: 'dermatology',
    defaultDose: 'دهان موضعي خفيف',
    defaultFrequency: 'مرتين إلى ثلاث مرات يومياً',
    defaultDuration: 'لمدة 5-7 أيام',
    defaultInstructions: 'على المنطقة المصابة فقط بعد غسلها وتجفيفها'
  }
];

/**
 * Creates a normalized prescription object
 */
export function createPrescription({
  clinic,
  doctor,
  patient,
  appointment,
  diagnosis = '',
  procedures = '',
  medications = [],
  generalInstructions = '',
  nextVisit = null
}) {
  const now = new Date();
  const year = now.getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const verificationCode = `CF-RX-${year}-${randomSuffix}`;

  const clinicId = clinic?.id || appointment?.clinicId || appointment?.clinic_id || 'default';
  const patientId = patient?.id || appointment?.patientId || appointment?.id || 'pat-' + Date.now();

  return {
    id: 'rx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    clinicId,
    clinicName: clinic?.name || 'عيادة كلينيك فلو',
    clinicSpecialty: clinic?.specialty || 'طب عام وتخصصي',
    clinicPhone: clinic?.phone || '01000000000',
    clinicAddress: clinic?.address || 'مصر',
    doctorName: doctor?.name || clinic?.doctorName || 'د. استشاري العيادة',
    doctorTitle: doctor?.title || clinic?.doctorTitle || 'استشاري ورئيس القسم',
    syndicateNumber: doctor?.syndicateNumber || clinic?.syndicateNumber || `قيد نقابة: ${randomSuffix.toString().slice(0, 5)}`,
    patientId,
    patientName: patient?.name || patient?.patientName || appointment?.patientName || 'المريض',
    patientPhone: patient?.phone || patient?.patientPhone || appointment?.patientPhone || '',
    patientAge: patient?.age || appointment?.patientAge || '',
    patientGender: patient?.gender || appointment?.patientGender || '',
    appointmentId: appointment?.id || null,
    date: now.toISOString().split('T')[0],
    createdAt: now.toISOString(),
    diagnosis: diagnosis.trim(),
    procedures: procedures.trim(),
    medications: (medications || []).map((med, idx) => ({
      id: med.id || `med-item-${idx}-${Date.now()}`,
      name: med.name || '',
      dose: med.dose || 'قرص واحد',
      frequency: med.frequency || 'مرتين يومياً بعد الأكل',
      duration: med.duration || 'لمدة 5 أيام',
      instructions: med.instructions || ''
    })),
    generalInstructions: generalInstructions.trim() || 'الالتزام بمواعيد الدواء ومراجعة العيادة في حال حدوث أي أعراض غير متوقعة.',
    nextVisit: nextVisit || null,
    verificationCode,
    status: 'active'
  };
}

export const createPrescriptionRecord = createPrescription;

/**
 * Formats a prescription into a clean, legible Arabic WhatsApp message
 */
export function formatPrescriptionForWhatsApp(prescription) {
  if (!prescription) return '';

  const {
    clinicName,
    doctorName,
    doctorTitle,
    patientName,
    date,
    diagnosis,
    medications = [],
    generalInstructions,
    nextVisit,
    verificationCode
  } = prescription;

  let msg = `${clinicName || 'عيادة كلينيك فلو'}\n`;
  if (doctorName) msg += `الطبيب: ${doctorName} ${doctorTitle ? `(${doctorTitle})` : ''}\n`;
  msg += `المريض: ${patientName}\n`;
  msg += `تاريخ الكشف: ${date}\n`;
  msg += `---------------------\n`;

  if (diagnosis) {
    msg += `التشخيص الطبي:\n${diagnosis}\n\n`;
  }

  msg += `الروشتة الدوائية المقررة:\n`;

  if (medications.length === 0) {
    msg += `(لا توجد أدوية مضافة - مراجعة تعليمات الطبيب أدناه)\n`;
  } else {
    medications.forEach((med, i) => {
      msg += `\n${i + 1}. ${med.name}\n`;
      if (med.dose) msg += `   الجرعة: ${med.dose}\n`;
      if (med.frequency) msg += `   التكرار: ${med.frequency}\n`;
      if (med.duration) msg += `   المدة: ${med.duration}\n`;
      if (med.instructions) msg += `   ملاحظات: ${med.instructions}\n`;
    });
  }

  msg += `\n---------------------\n`;

  if (generalInstructions) {
    msg += `نصائح وتعليمات هامة:\n${generalInstructions}\n\n`;
  }

  if (nextVisit) {
    msg += `موعد الاستشارة / المتابعة: ${nextVisit}\n\n`;
  }

  msg += `كود التحقق الرقمي: ${verificationCode}\n`;
  msg += `مع تمنياتنا لكم بالشفاء العاجل ودوام الصحة والعافية.`;

  return msg;
}

/**
 * Storage helpers for prescriptions
 */
export function getStoredPrescriptions(clinicId) {
  const key = `clinicflow_prescriptions_${clinicId || 'default'}`;
  return safeStorage.getItem(key, []);
}

export function savePrescriptionToStorage(prescription) {
  if (!prescription) return null;
  const clinicId = prescription.clinicId || 'default';
  const key = `clinicflow_prescriptions_${clinicId}`;
  const existing = safeStorage.getItem(key, []);
  
  // Replace or prepend
  const index = existing.findIndex(p => p.id === prescription.id);
  let updated;
  if (index >= 0) {
    updated = [...existing];
    updated[index] = prescription;
  } else {
    updated = [prescription, ...existing];
  }

  safeStorage.setItem(key, updated);
  return prescription;
}

export function getPatientPrescriptionsFromStorage(patientId, clinicId) {
  const all = getStoredPrescriptions(clinicId);
  if (!patientId) return all;
  return all.filter(p => p.patientId === patientId || String(p.patientPhone).replace(/\D/g, '') === String(patientId).replace(/\D/g, ''));
}
