/**
 * Clinical Decision Support (CDS) Drug Interaction & Allergy Checker
 * Analyzes prescription texts against patient medical history, allergies, and chronic conditions.
 */

export const DRUG_SAFETY_RULES = [
  {
    id: 'penicillin_allergy',
    drugKeywords: ['أموكسيسيلين', 'أوجمنتين', 'بنسلين', 'اموكسيل', 'هاي بيوتك', 'كيورام', 'amoxicillin', 'augmentin', 'penicillin', 'curam', 'hibiotic'],
    conditionKeywords: ['حساسية بنسلين', 'حساسية بنسلينات', 'penicillin allergy', 'حساسية من البنسلين'],
    severity: 'danger',
    title: '⚠️ تحذير حرج: حساسية بنسلين مسجلة للمريض!',
    description: 'المريض لديه حساسية مسجلة من مركبات البنسلين ومشتقاتها (قد تسبب صدمة تحسسية Anaphylaxis).',
    recommendation: 'يُوصى باستبداله بماكروليد أو كليندامايسين (مثل: Dalacin C 300mg أو Azithromycin 500mg) بعد تقييم الطبيب.'
  },
  {
    id: 'nsaids_peptic_ulcer',
    drugKeywords: ['بروفين', 'كتافلام', 'فولتارين', 'كيتوفان', 'باي الكوفان', 'ديكلوفيناك', 'ايبوبروفين', 'ibuprofen', 'cataflam', 'voltaren', 'ketofan', 'diclofenac', 'ketoprofen'],
    conditionKeywords: ['قرحة معدة', 'التهاب معدة حاد', 'نزيف هضمي', 'peptic ulcer', 'gastritis', 'حموضة وقرحة'],
    severity: 'warning',
    title: '⚠️ تنبيه: مسكن NSAID مع مريض قرحة معدة',
    description: 'المسكنات غير الستيرويدية (NSAIDs) تزيد من خطر النزيف وتهيج بطانة المعدة.',
    recommendation: 'يُفضل استخدام باراسيتامول آمن (Panadol / Cetal) أو إضافة واقي للمعدة (PPI مثل Omeprazole / Pantoprazole).'
  },
  {
    id: 'nsaids_renal_disease',
    drugKeywords: ['بروفين', 'كتافلام', 'فولتارين', 'كيتوفان', 'باي الكوفان', 'ديكلوفيناك', 'ايبوبروفين', 'ibuprofen', 'cataflam', 'voltaren', 'diclofenac'],
    conditionKeywords: ['قصور كلوي', 'فشل كلوي', 'اعتلال الكلى', 'renal impairment', 'kidney disease'],
    severity: 'danger',
    title: '⚠️ تحذير حرج: مسكن NSAID مع قصور كلوي',
    description: 'مضادات الالتهاب غير الستيرويدية تؤدي لتثبيط البروستاجلاندين وتدهور وظائف الكلى.',
    recommendation: 'استخدم الباراسيتامول بجرعات معدلة واستشر أخصائي الكلى.'
  },
  {
    id: 'pregnancy_teratogenic',
    drugKeywords: ['سيبروفلوكساسين', 'دوكسيسيكلين', 'ميترونيدازول', 'تتراسيكلين', 'ciprofloxacin', 'doxycycline', 'flagyl', 'فلاجيل'],
    conditionKeywords: ['حامل', 'حمل', 'pregnancy', 'رضاعة', 'مرضع'],
    severity: 'danger',
    title: '⚠️ تحذير: مضاد حيوي غير آمن في الحمل/الرضاعة',
    description: 'بعض المضادات الحيوية (كالكوينولونات والتتراسيكلين) قد تؤثر على تكوين عظام وأسنان الجنين.',
    recommendation: 'البنسلينات والسيفالوسبورينات الفموية تُعد الخيار الأكثر أماناً (Category B) تحت إشراف الطبيب.'
  },
  {
    id: 'local_anesthetic_epinephrine_hypertension',
    drugKeywords: ['ادرينالين', 'ارتيكايين مع ادرينالين', 'epinephrine', 'adrenaline', 'articaine with epi', 'septanest'],
    conditionKeywords: ['ضغط دم غير منضبط', 'ضغط مرتفع حاد', 'جلطة حديثة', 'ذبحة صدرية', 'uncontrolled hypertension'],
    severity: 'danger',
    title: '⚠️ تنبيه سريري: قابض أوعية (Epinephrine) مع ضغط مرتفع غير منضبط',
    description: 'استخدام المخدر الموضعي المحتوي على مقبضات الأوعية قد يرفع ضغط الدم ويزيد النبض.',
    recommendation: 'يُفضل استخدام مخدر موضعي خالي من الأدرينالين (Plain Mepivacaine 3% Scandonest).'
  },
  {
    id: 'sulfa_allergy',
    drugKeywords: ['سلفا', 'سبترين', 'سيبتازول', 'sulfamethoxazole', 'bactrim', 'septrin', 'septazole'],
    conditionKeywords: ['حساسية سلفا', 'sulfa allergy', 'حساسية من السلفا'],
    severity: 'danger',
    title: '⚠️ تحذير حرج: حساسية مركبات السلفا',
    description: 'المريض مسجل لديه حساسية معروفة لمركبات السلفوناميد.',
    recommendation: 'تجنب أي دواء يحتوي على السلفاميثوكسازول واستبدله بخيار بديل.'
  }
];

/**
 * Checks a prescription string against patient medical conditions and allergies.
 * @param {string} prescriptionText 
 * @param {object} patientRecord - { allergies, chronicDiseases, medicalHistory, ... }
 * @returns {Array} List of triggered safety warnings
 */
export function checkPrescriptionSafety(prescriptionText = '', patientRecord = {}) {
  if (!prescriptionText || typeof prescriptionText !== 'string') return [];
  const textLower = prescriptionText.toLowerCase();

  // Aggregate all patient health factors into a single normalized searchable string
  const patientHealthFactors = [
    patientRecord.allergies || '',
    patientRecord.chronicDiseases || '',
    patientRecord.medicalHistory || '',
    patientRecord.notes || '',
    ...(patientRecord.medicalAlerts || [])
  ].join(' ').toLowerCase();

  if (!patientHealthFactors.trim()) return [];

  const triggeredWarnings = [];

  for (const rule of DRUG_SAFETY_RULES) {
    const drugMatched = rule.drugKeywords.some(keyword => textLower.includes(keyword.toLowerCase()));

    if (drugMatched) {
      const conditionMatched = rule.conditionKeywords.some(condition => patientHealthFactors.includes(condition.toLowerCase()));

      if (conditionMatched) {
        triggeredWarnings.push({
          id: rule.id,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          recommendation: rule.recommendation
        });
      }
    }
  }

  return triggeredWarnings;
}
