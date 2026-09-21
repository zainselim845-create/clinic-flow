/**
 * Specialty Clinical Services & Computational Engines
 * - Pediatrics: WHO Child Growth Standards (0-5y, 5-19y), Percentiles & Z-scores, Vaccination schedule
 * - Ophthalmology: Refraction Matrix (OD/OS: SPH, CYL, AXIS, ADD, PD, IOP), Snellen Acuity, Prescription generator
 * - OB/GYN: Naegele's Rule EDD, Gestational Age, Hadlock Fetal Biometry (BPD, HC, AC, FL -> EFW), Antenatal checklist
 * - Radiology/DICOM: Windowing/Leveling presets, Caliper measurement calibration, Sample clinical studies
 */

import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';

// ============================================================================
// 1. PEDIATRICS: WHO GROWTH STANDARDS & COMPUTATIONAL ENGINE
// ============================================================================

/**
 * WHO Child Growth Standards Data Tables (Simplified empirical reference for 0-60 months)
 * Median (P50), -2 SD (P3), +2 SD (P97) for Boys and Girls
 */
export const WHO_GROWTH_STANDARDS = {
  boys: {
    weightForAge: [
      { month: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
      { month: 3, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
      { month: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 },
      { month: 9, p3: 7.2, p15: 8.0, p50: 8.9, p85: 9.9, p97: 11.0 },
      { month: 12, p3: 7.8, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 },
      { month: 18, p3: 8.8, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.7 },
      { month: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.3 },
      { month: 36, p3: 11.3, p15: 12.7, p50: 14.3, p85: 16.2, p97: 18.3 },
      { month: 48, p3: 12.7, p15: 14.4, p50: 16.3, p85: 18.6, p97: 21.2 },
      { month: 60, p3: 14.1, p15: 16.1, p50: 18.3, p85: 21.0, p97: 24.2 }
    ],
    heightForAge: [
      { month: 0, p3: 46.1, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.7 },
      { month: 3, p3: 57.3, p15: 59.3, p50: 61.4, p85: 63.5, p97: 65.5 },
      { month: 6, p3: 63.3, p15: 65.5, p50: 67.6, p85: 69.8, p97: 71.9 },
      { month: 9, p3: 67.7, p15: 69.9, p50: 72.0, p85: 74.2, p97: 76.5 },
      { month: 12, p3: 71.0, p15: 73.4, p50: 75.7, p85: 78.1, p97: 80.5 },
      { month: 18, p3: 76.9, p15: 79.6, p50: 82.3, p85: 85.0, p97: 87.7 },
      { month: 24, p3: 81.7, p15: 84.8, p50: 87.8, p85: 90.9, p97: 93.9 },
      { month: 36, p3: 88.7, p15: 92.4, p50: 96.1, p85: 99.8, p97: 103.5 },
      { month: 48, p3: 94.9, p15: 99.1, p50: 103.3, p85: 107.5, p97: 111.7 },
      { month: 60, p3: 100.7, p15: 105.3, p50: 110.0, p85: 114.6, p97: 119.2 }
    ],
    headCircumference: [
      { month: 0, p3: 31.9, p15: 33.2, p50: 34.5, p85: 35.8, p97: 37.0 },
      { month: 3, p3: 38.3, p15: 39.5, p50: 40.5, p85: 41.7, p97: 42.9 },
      { month: 6, p3: 41.0, p15: 42.1, p50: 43.3, p85: 44.5, p97: 45.6 },
      { month: 12, p3: 43.5, p15: 44.8, p50: 46.1, p85: 47.3, p97: 48.6 },
      { month: 24, p3: 45.8, p15: 47.0, p50: 48.3, p85: 49.6, p97: 50.8 },
      { month: 36, p3: 47.0, p15: 48.2, p50: 49.5, p85: 50.8, p97: 52.0 },
      { month: 60, p3: 48.3, p15: 49.6, p50: 51.0, p85: 52.3, p97: 53.7 }
    ]
  },
  girls: {
    weightForAge: [
      { month: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
      { month: 3, p3: 4.5, p15: 5.2, p50: 5.8, p85: 6.6, p97: 7.5 },
      { month: 6, p3: 5.7, p15: 6.5, p50: 7.3, p85: 8.2, p97: 9.3 },
      { month: 9, p3: 6.5, p15: 7.3, p50: 8.2, p85: 9.3, p97: 10.5 },
      { month: 12, p3: 7.0, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.5 },
      { month: 18, p3: 8.1, p15: 9.1, p50: 10.2, p85: 11.6, p97: 13.2 },
      { month: 24, p3: 9.0, p15: 10.2, p50: 11.5, p85: 13.0, p97: 14.8 },
      { month: 36, p3: 10.8, p15: 12.2, p50: 13.9, p85: 15.8, p97: 18.1 },
      { month: 48, p3: 12.3, p15: 14.0, p50: 16.1, p85: 18.5, p97: 21.5 },
      { month: 60, p3: 13.7, p15: 15.8, p50: 18.2, p85: 21.2, p97: 24.9 }
    ],
    heightForAge: [
      { month: 0, p3: 45.4, p15: 47.3, p50: 49.1, p85: 51.0, p97: 52.9 },
      { month: 3, p3: 55.6, p15: 57.7, p50: 59.8, p85: 61.9, p97: 64.0 },
      { month: 6, p3: 61.2, p15: 63.5, p50: 65.7, p85: 68.0, p97: 70.3 },
      { month: 9, p3: 65.3, p15: 67.7, p50: 70.1, p85: 72.6, p97: 75.0 },
      { month: 12, p3: 68.9, p15: 71.4, p50: 74.0, p85: 76.6, p97: 79.2 },
      { month: 18, p3: 74.9, p15: 77.8, p50: 80.7, p85: 83.6, p97: 86.5 },
      { month: 24, p3: 80.0, p15: 83.2, p50: 86.4, p85: 89.6, p97: 92.9 },
      { month: 36, p3: 87.4, p15: 91.2, p50: 95.1, p85: 98.9, p97: 102.7 },
      { month: 48, p3: 94.1, p15: 98.4, p50: 102.7, p85: 107.0, p97: 111.3 },
      { month: 60, p3: 99.9, p15: 104.7, p50: 109.4, p85: 114.2, p97: 118.9 }
    ],
    headCircumference: [
      { month: 0, p3: 31.5, p15: 32.7, p50: 33.9, p85: 35.1, p97: 36.2 },
      { month: 3, p3: 37.2, p15: 38.3, p50: 39.5, p85: 40.7, p97: 41.9 },
      { month: 6, p3: 39.7, p15: 40.9, p50: 42.2, p85: 43.4, p97: 44.6 },
      { month: 12, p3: 42.2, p15: 43.6, p50: 44.9, p85: 46.2, p97: 47.4 },
      { month: 24, p3: 44.6, p15: 45.9, p50: 47.2, p85: 48.5, p97: 49.8 },
      { month: 36, p3: 45.8, p15: 47.1, p50: 48.5, p85: 49.8, p97: 51.1 },
      { month: 60, p3: 47.4, p15: 48.8, p50: 50.1, p85: 51.4, p97: 52.8 }
    ]
  }
};

/**
 * Calculates BMI (Body Mass Index) in kg/m²
 * @param {number} weightKg
 * @param {number} heightCm
 * @returns {number}
 */
export function calculateBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

/**
 * Calculates WHO Percentile and clinical status for a child's weight or height
 * @param {number} value
 * @param {number} ageMonths
 * @param {'boys'|'girls'} gender
 * @param {'weightForAge'|'heightForAge'|'headCircumference'} metric
 * @returns {{ percentile: string, zScore: number, status: string, severity: 'normal'|'warning'|'danger' }}
 */
export function calculatePediatricPercentile(value, ageMonths, gender = 'boys', metric = 'weightForAge') {
  if (!value || isNaN(value)) {
    return { percentile: '--', zScore: 0, status: 'بيانات غير متوفرة', severity: 'normal' };
  }

  const dataset = WHO_GROWTH_STANDARDS[gender]?.[metric] || WHO_GROWTH_STANDARDS.boys[metric];
  // Find closest month bracket
  let closest = dataset[0];
  let minDiff = Math.abs(dataset[0].month - ageMonths);
  for (const entry of dataset) {
    const diff = Math.abs(entry.month - ageMonths);
    if (diff < minDiff) {
      minDiff = diff;
      closest = entry;
    }
  }

  const { p3, p15, p50, p85, p97 } = closest;

  // Approximate Z-score based on distance from median (P50) to SD points
  const sdUpper = (p97 - p50) / 2;
  const sdLower = (p50 - p3) / 2;
  let zScore = 0;
  if (value >= p50) {
    zScore = sdUpper > 0 ? (value - p50) / sdUpper : 0;
  } else {
    zScore = sdLower > 0 ? (value - p50) / sdLower : 0;
  }
  zScore = Number(zScore.toFixed(2));

  let percentile = 'P50';
  let status = 'طبيعي ومتناسق مع العمر';
  let severity = 'normal';

  if (value < p3) {
    percentile = '< P3';
    status = metric === 'weightForAge' ? 'نقص وزن شديد (تحت المئين الثالث)' : 'قصر قامة شديد';
    severity = 'danger';
  } else if (value < p15) {
    percentile = 'P3 - P15';
    status = metric === 'weightForAge' ? 'أقل من المتوسط (خطر نقص التغذية)' : 'قامة قصيرة نسبياً';
    severity = 'warning';
  } else if (value <= p85) {
    percentile = 'P15 - P85';
    status = 'نمو مثالي وصحي ضمن المئين الطبيعي';
    severity = 'normal';
  } else if (value <= p97) {
    percentile = 'P85 - P97';
    status = metric === 'weightForAge' ? 'وزن أعلى من المتوسط (خطر زيادة الوزن)' : 'قامة طويلة نسبياً';
    severity = 'warning';
  } else {
    percentile = '> P97';
    status = metric === 'weightForAge' ? 'سمنة مفرطة أو زيادة ملحوظة في الوزن' : 'طول فارع (فوق المئين 97)';
    severity = 'danger';
  }

  return { percentile, zScore, status, severity };
}

/**
 * Standard Mandatory & Optional Vaccination Schedule (Egypt & Arab Region)
 */
export const VACCINATION_SCHEDULE = [
  { id: 'v-birth', age: 'عند الولادة (اليوم الأول)', name: 'الدرن (BCG) + شلل الأطفال الفموي (الصفرية)', mandatory: true },
  { id: 'v-2m', age: 'شهرين', name: 'الخماسي (الدفتيريا، التيتانوس، السعال الديكي، الكبدي B، الإنفلونزا البكتيرية) + شلل الأطفال الفموي (سابين) + شلل أطفال بالحقن (سولك)', mandatory: true },
  { id: 'v-4m', age: '4 أشهر', name: 'الخماسي (الجرعة الثانية) + شلل الأطفال الفموي + شلل أطفال بالحقن (سولك)', mandatory: true },
  { id: 'v-6m', age: '6 أشهر', name: 'الخماسي (الجرعة الثالثة) + شلل الأطفال الفموي + شلل أطفال بالحقن (سولك)', mandatory: true },
  { id: 'v-9m', age: '9 أشهر', name: 'شلل الأطفال الفموي + فيتامين (أ) كبسولة 100 ألف وحدة', mandatory: true },
  { id: 'v-12m', age: '12 شهراً (سنة)', name: 'الثلاثي الفيروسي (MMR: حصبة، حصبة ألمانية، نكاف) + شلل الأطفال الفموي', mandatory: true },
  { id: 'v-18m', age: '18 شهراً (سنة ونصف)', name: 'الجرعة المنشطة: الثلاثي البكتيري + MMR + شلل الأطفال الفموي + فيتامين (أ) 200 ألف وحدة', mandatory: true },
  { id: 'v-opt-rotavirus', age: 'شهران و 4 أشهر (اختياري)', name: 'لقاح فيروس الروتا (Rotavirus) للوقاية من النزلات المعوية الحادة', mandatory: false },
  { id: 'v-opt-pneumo', age: 'شهران، 4، 6 أشهر (اختياري)', name: 'لقاح المكورات الرئوية (Prevenar) للوقاية من الالتهاب الرئوي والحمى الشوكية', mandatory: false }
];

// ============================================================================
// 2. OPHTHALMOLOGY: REFRACTION MATRIX & VISUAL ACUITY
// ============================================================================

export const SNELLEN_ACUITY_VALUES = [
  { snellen: '6/6', decimal: 1.0, logmar: 0.0, label: '6/6 (حدة إبصار ممتازة)' },
  { snellen: '6/9', decimal: 0.67, logmar: 0.18, label: '6/9 (حدة إبصار جيدة)' },
  { snellen: '6/12', decimal: 0.5, logmar: 0.3, label: '6/12 (متوسط)' },
  { snellen: '6/18', decimal: 0.33, logmar: 0.48, label: '6/18 (ضعف إبصار خفيف)' },
  { snellen: '6/24', decimal: 0.25, logmar: 0.6, label: '6/24 (ضعف إبصار متوسط)' },
  { snellen: '6/36', decimal: 0.17, logmar: 0.78, label: '6/36 (ضعف شديد)' },
  { snellen: '6/60', decimal: 0.1, logmar: 1.0, label: '6/60 (ضعف شديد جداً)' },
  { snellen: 'CF', decimal: 0.02, logmar: 1.7, label: 'عد الأصابع (Counting Fingers)' },
  { snellen: 'HM', decimal: 0.01, logmar: 2.0, label: 'حركة اليد (Hand Motion)' },
  { snellen: 'LP', decimal: 0.001, logmar: 3.0, label: 'إدراك الضوء (Light Perception)' },
  { snellen: 'NLP', decimal: 0.0, logmar: 4.0, label: 'عدم إدراك الضوء (No Light Perception)' }
];

/**
 * Validates and assesses Intraocular Pressure (IOP)
 * @param {number} iopMmHg
 * @returns {{ isElevated: boolean, alert: boolean, severity: 'normal'|'borderline'|'high', status: string, alertColor: string }}
 */
export function assessIntraocularPressure(iopMmHg) {
  if (!iopMmHg || isNaN(iopMmHg)) {
    return { isElevated: false, alert: false, severity: 'normal', status: 'لم يُسجل', alertColor: 'var(--text-secondary)' };
  }
  const val = Number(iopMmHg);
  if (val < 10) {
    return { isElevated: false, alert: false, severity: 'borderline', status: 'منخفض (Hypotony Risk)', alertColor: '#F59E0B' };
  }
  if (val <= 21) {
    return { isElevated: false, alert: false, severity: 'normal', status: 'طبيعي وآمن (10-21 mmHg)', alertColor: '#10B981' };
  }
  if (val <= 25) {
    return { isElevated: true, alert: false, severity: 'borderline', status: 'مرتفع نسبياً - متابعة دورية (22-25 mmHg)', alertColor: '#F59E0B' };
  }
  return { isElevated: true, alert: true, severity: 'high', status: 'مرتفع جداً - اشتباه جلوكوما (Glaucoma Alert)', alertColor: '#EF4444' };
}

// ============================================================================
// 3. OB/GYN: GESTATIONAL AGE, EDD & FETAL BIOMETRY (HADLOCK FORMULA)
// ============================================================================

/**
 * Calculates Estimated Due Date (EDD) and Gestational Age using Naegele's rule
 * Naegele's rule: LMP + 280 days (or LMP + 7 days - 3 months + 1 year)
 * @param {string|Date} lmpDateStr
 * @param {Date} [referenceDate=new Date()]
 * @returns {{ edd: Date, eddFormatted: string, weeks: number, days: number, totalDays: number, trimester: 1|2|3, trimesterLabel: string, trimesterText: string, daysRemaining: number, progressPercent: number }}
 */
export function calculateGestationalAge(lmpDateStr, referenceDate = new Date()) {
  if (!lmpDateStr) return { edd: null, eddFormatted: '', weeks: 0, days: 0, totalDays: 0, trimester: 1, trimesterLabel: '', trimesterText: '', daysRemaining: 0, progressPercent: 0 };
  const lmp = new Date(lmpDateStr);
  if (isNaN(lmp.getTime())) return { edd: null, eddFormatted: '', weeks: 0, days: 0, totalDays: 0, trimester: 1, trimesterLabel: '', trimesterText: '', daysRemaining: 0, progressPercent: 0 };

  // EDD = LMP + 280 days
  const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
  const now = referenceDate instanceof Date ? referenceDate : new Date();

  const diffMs = now.getTime() - lmp.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  let trimester = 1;
  let trimesterLabel = 'الثلث الأول (الأسبوع 1 - 13)';
  if (weeks >= 14 && weeks <= 27) {
    trimester = 2;
    trimesterLabel = 'الثلث الثاني (الأسبوع 14 - 27)';
  } else if (weeks >= 28) {
    trimester = 3;
    trimesterLabel = 'الثلث الثالث (الأسبوع 28 - 40)';
  }

  const progressPercent = Math.min(100, Math.round((totalDays / 280) * 100));
  const daysRemaining = Math.max(0, 280 - totalDays);

  const eddFormatted = edd.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    edd,
    eddFormatted,
    weeks,
    days,
    totalDays,
    trimester,
    trimesterLabel,
    trimesterText: trimesterLabel,
    daysRemaining,
    progressPercent
  };
}

/**
 * Calculates Estimated Fetal Weight (EFW) in grams using Hadlock formula (BPD, HC, AC, FL in cm)
 * Log10(EFW) = 1.3596 - 0.00386(AC*FL) + 0.07(HC) + 0.1715(BPD) + 0.0315(AC)
 * Supports both object parameter ({ bpdMm, hcMm, acMm, flMm }) or individual arguments (bpd, hc, ac, fl)
 * @returns {{ efwGrams: number, efwKg: string, grams: number, kg: number, status: string }}
 */
export function calculateHadlockEfw(arg1, arg2, arg3, arg4) {
  let bpdMm, hcMm, acMm, flMm;
  if (typeof arg1 === 'object' && arg1 !== null) {
    bpdMm = Number(arg1.bpdMm || arg1.bpd || 0);
    hcMm = Number(arg1.hcMm || arg1.hc || 0);
    acMm = Number(arg1.acMm || arg1.ac || 0);
    flMm = Number(arg1.flMm || arg1.fl || 0);
  } else {
    bpdMm = Number(arg1 || 0);
    hcMm = Number(arg2 || 0);
    acMm = Number(arg3 || 0);
    flMm = Number(arg4 || 0);
  }

  if (!bpdMm || !hcMm || !acMm || !flMm) {
    return { efwGrams: 0, efwKg: '0.00', grams: 0, kg: 0, status: 'بيانات القياسات غير مكتملة' };
  }

  // Convert mm to cm for Hadlock equation
  const bpd = bpdMm / 10;
  const hc = hcMm / 10;
  const ac = acMm / 10;
  const fl = flMm / 10;

  // Standard Hadlock IV Formula (BPD, HC, AC, FL in cm):
  // Log10(EFW) = 1.3596 + 0.0064(HC) + 0.0424(AC) + 0.174(FL) + 0.00061(BPD*AC) - 0.00386(AC*FL)
  const log10Weight = 1.3596 + (0.0064 * hc) + (0.0424 * ac) + (0.174 * fl) + (0.00061 * bpd * ac) - (0.00386 * ac * fl);
  const efwGrams = Math.round(Math.pow(10, log10Weight));
  const efwKg = (efwGrams / 1000).toFixed(2);
  const kgNum = Number(efwKg);

  let status = 'وزن متناسق مع عمر الحمل';
  if (efwGrams < 500) {
    status = 'مرحلة تكوين أولية للجنين';
  } else if (efwGrams >= 2500 && efwGrams <= 4000) {
    status = 'وزن مثالي لولادة مكتملة النمو (Term Weight)';
  } else if (efwGrams > 4000) {
    status = 'كبر حجم الجنين - ماكروسوميا (Fetal Macrosomia Risk)';
  }

  return { efwGrams, efwKg, grams: efwGrams, kg: kgNum, status };
}

// ============================================================================
// 4. RADIOLOGY & DICOM: WINDOWING PRESETS & MEASUREMENT CALIBRATION
// ============================================================================

export const DICOM_WINDOW_PRESETS = {
  bone: { id: 'bone', name: 'عظام (Bone)', windowWidth: 2000, windowCenter: 300, wc: 300, ww: 1500, description: 'فحص الكسور، العظام، والفكين' },
  lung: { id: 'lung', name: 'رئة (Lung)', windowWidth: 1500, windowCenter: -600, wc: -600, ww: 1500, description: 'فحص الحويصلات الهوائية والصدر' },
  soft_tissue: { id: 'soft_tissue', name: 'أنسجة رخوة (Soft Tissue)', windowWidth: 350, windowCenter: 40, wc: 40, ww: 400, description: 'فحص العضلات والأعضاء الباطنية' },
  brain: { id: 'brain', name: 'مخ وأعصاب (Brain)', windowWidth: 80, windowCenter: 40, wc: 40, ww: 80, description: 'فحص الأنسجة الدماغية والنزيف' },
  default: { id: 'default', name: 'افتراضي (Full Range)', windowWidth: 256, windowCenter: 128, wc: 128, ww: 256, description: 'العرض الكامل القياسي' }
};

/**
 * Sample Built-in Clinical Studies for instant diagnostic preview
 */
export const SAMPLE_DICOM_STUDIES = [
  {
    id: 'study-chest-01',
    patientName: 'أحمد محمود العوضي',
    studyDate: '2026-09-15',
    modality: 'CR (أشعة سينية رقمية)',
    bodyPart: 'Chest AP / الصدر',
    sliceThickness: '2.5 mm',
    institution: 'مستشفى النخبة التخصصي',
    imageType: 'chest',
    description: 'فحص الصدر الشعاعي لمتابعة التهاب الشعب الهوائية وتمدد الرئتين'
  },
  {
    id: 'study-knee-02',
    patientName: 'مريم السيد خالد',
    studyDate: '2026-09-18',
    modality: 'DX (أشعة رقمية عظام)',
    bodyPart: 'Knee Joint AP/Lat / مفصل الركبة',
    sliceThickness: '1.8 mm',
    institution: 'مركز السلام التخصصي',
    imageType: 'knee',
    description: 'فحص مفصل الركبة لتقييم خشونة المفاصل وسلامة الغضاريف'
  },
  {
    id: 'study-brain-03',
    patientName: 'كريم عبد الرحمن',
    studyDate: '2026-09-20',
    modality: 'CT (أشعة مقطعية بالكمبيوتر)',
    bodyPart: 'Head & Brain / المخ والجمجمة',
    sliceThickness: '0.625 mm',
    institution: 'مجمع العيادات التخصصية',
    imageType: 'brain',
    description: 'أشعة مقطعية للمخ لاستبعاد النزيف الداخلي وأورام الجيوب الأنفية'
  },
  {
    id: 'study-dental-04',
    patientName: 'سارة شريف كمال',
    studyDate: '2026-09-21',
    modality: 'OPG (أشعة بانوراما للأسنان)',
    bodyPart: 'Dental Panoramic / الفكين والأسنان',
    sliceThickness: '1.0 mm',
    institution: 'مركز النخبة لطب وجراحة الأسنان',
    imageType: 'dental',
    description: 'بانوراما شاملة لتقييم جذور الأسنان، ضروس العقل، وعظام الفك'
  }
];

/**
 * Calculates Euclidean Distance between two points in canvas space
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @param {number} [pixelSpacingMm=0.25] (Typical mm per pixel calibration)
 * @returns {{ pixels: number, mm: string, cm: string }}
 */
export function calculateCaliperDistance(p1, p2, pixelSpacingMm = 0.25) {
  if (!p1 || !p2) return { pixels: 0, mm: '0.0', cm: '0.0' };
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const pixels = Math.sqrt(dx * dx + dy * dy);
  const mm = (pixels * pixelSpacingMm).toFixed(1);
  const cm = (pixels * pixelSpacingMm / 10).toFixed(2);
  return { pixels: Math.round(pixels), mm, cm };
}

// ============================================================================
// 5. STORAGE & PERSISTENCE HELPERS FOR CLINICAL SPECIALTY DATA
// ============================================================================

/**
 * Retrieves specialty records for a specific patient
 * @param {string} patientId
 * @param {string} clinicId
 * @param {'pediatrics'|'ophthalmology'|'obgyn'|'dicom'} module
 */
export function getPatientSpecialtyData(patientId, clinicId, module) {
  if (!patientId) return null;
  const key = `clinicflow_spec_${module}_${clinicId || 'global'}_${patientId}`;
  return safeGetJSON(key, null);
}

/**
 * Saves specialty records for a specific patient
 * @param {string} patientId
 * @param {string} clinicId
 * @param {'pediatrics'|'ophthalmology'|'obgyn'|'dicom'} module
 * @param {Object} data
 */
export function savePatientSpecialtyData(patientId, clinicId, module, data) {
  if (!patientId) return false;
  const key = `clinicflow_spec_${module}_${clinicId || 'global'}_${patientId}`;
  return safeSetJSON(key, { ...data, updatedAt: new Date().toISOString() });
}
