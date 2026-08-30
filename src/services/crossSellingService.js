/**
 * Clinically-Guided Cross-Selling & Next Best Action Engine
 * Uses doctor-defined clinical protocols instead of generic AI guessing
 */

export const DEFAULT_CROSS_SELL_RULES = [
  // Dental
  {
    id: 'rule-dent-1',
    specialty: 'dental',
    triggerService: 'جلسة تنظيف وتلميع وإزالة جير الأسنان',
    suggestedService: 'تبييض أسنان احترافي بالعيادة (Laser/LED)',
    minDaysAfter: 7,
    maxDaysAfter: 90,
    clinicalRationale: 'الأسنان بعد إزالة الجير والتصبغات تكون في أعلى درجات الاستعداد لامتصاص جل التبييض لتحقيق بياض ناصع وابتسامة مثالية.',
    discountBadge: 'خصم 15% لمريض العيادة'
  },
  {
    id: 'rule-dent-2',
    specialty: 'dental',
    triggerService: 'علاج جذور وعصب السن (RCT)',
    suggestedService: 'طربوش / تاج زيركون تجميلي عالي الدقة',
    minDaysAfter: 5,
    maxDaysAfter: 45,
    clinicalRationale: 'السن المعالج عصبياً يصبح هشاً ومعرضاً للكسر، وتركيب تاج الزيركون يحميه ويضمن استمراره مدى الحياة.',
    discountBadge: 'ضمان 5 سنوات معتمد'
  },
  {
    id: 'rule-dent-3',
    specialty: 'dental',
    triggerService: 'خلع ضرس عادي أو مخلخل',
    suggestedService: 'زراعة وتثبيت الأسنان الرقمية (Dental Implant)',
    minDaysAfter: 30,
    maxDaysAfter: 120,
    clinicalRationale: 'تعويض السن المخلوع يمنع تآكل عظام الفك وميلان الأسنان المجاورة ويحافظ على مخارج الحروف والمضغ السليم.',
    discountBadge: 'استشارة وتقييم مجاني للزراعة'
  },

  // Derma & Aesthetics
  {
    id: 'rule-derma-1',
    specialty: 'derma',
    triggerService: 'حقن بوتوكس للتجاعيد التعبيرية',
    suggestedService: 'جلسة سكين بوستر / نضارة بروفايلو (Skin Booster)',
    minDaysAfter: 45,
    maxDaysAfter: 120,
    clinicalRationale: 'بعد استرخاء عضلات التعبير بالبوتوكس، يعمل السكين بوستر على تغذية وترطيب البشرة بعمق لإعطاء نضارة وإشراقة طبيعية.',
    discountBadge: 'باقة النضارة المتكاملة'
  },
  {
    id: 'rule-derma-2',
    specialty: 'derma',
    triggerService: 'جلسات ليزر إزالة الشعر',
    suggestedService: 'جلسة تنظيف عميق وتقشير هايدرافيشيل (Hydrafacial)',
    minDaysAfter: 14,
    maxDaysAfter: 60,
    clinicalRationale: 'تنظيف المسام وتخليص البشرة من الرؤوس السوداء بعد جلسات الليزر يحافظ على نعومة ونقاء الجلد.',
    discountBadge: 'عرض التجديد الفوري'
  },

  // Internal Medicine
  {
    id: 'rule-internal-1',
    specialty: 'internal',
    triggerService: 'متابعة وفحص السكر الدوري',
    suggestedService: 'باقة الفحص الشامل (وظائف كلى وكبد ودهون الدم)',
    minDaysAfter: 90,
    maxDaysAfter: 180,
    clinicalRationale: 'المتابعة الدورية لوظائف الكلى والدهون ضرورية لمرضى السكري للوقاية من أي مضاعفات مبكرة.',
    discountBadge: 'متابعة وقائية دورية'
  }
];

/**
 * Generate cross-sell opportunities for a patient based on clinical history
 */
export function getPatientCrossSellOpportunities(patient, customRules = []) {
  if (!patient) return [];

  const rules = customRules.length > 0 ? customRules : DEFAULT_CROSS_SELL_RULES;
  const history = patient.serviceHistory || [];
  const daysSinceVisit = patient.daysSinceLastVisit || 0;

  const matches = [];

  for (const rule of rules) {
    // Check if patient had the trigger service in diagnosis or past services
    const hadTriggerService = history.some(s => 
      s.includes(rule.triggerService) || rule.triggerService.includes(s)
    );

    if (hadTriggerService && daysSinceVisit >= rule.minDaysAfter && daysSinceVisit <= rule.maxDaysAfter) {
      matches.push({
        ...rule,
        patientName: patient.name,
        patientPhone: patient.phone,
        patientId: patient.id,
        daysSinceTrigger: daysSinceVisit
      });
    }
  }

  return matches;
}

/**
 * Scan entire patient base for active cross-selling opportunities
 */
export function scanAllCrossSellingOpportunities(patients = [], customRules = []) {
  const allOpportunities = [];

  for (const p of patients) {
    const opps = getPatientCrossSellOpportunities(p, customRules);
    if (opps.length > 0) {
      allOpportunities.push(...opps);
    }
  }

  return allOpportunities;
}
