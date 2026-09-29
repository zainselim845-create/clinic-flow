/**
 * Egyptian Medical Syndicate & Healthcare Professional Registry (نقابة أطباء مصر)
 * Formats, professional ranks, and private facility licensing compliance (إدارة العلاج الحر).
 */

export const MEDICAL_RANKS = [
  {
    id: 'general_practitioner',
    titleAr: 'ممارس عام',
    titleEn: 'General Practitioner',
    minExperienceYears: 0,
    requiresMastersOrPhD: false
  },
  {
    id: 'specialist',
    titleAr: 'أخصائي',
    titleEn: 'Specialist',
    minExperienceYears: 3,
    requiresMastersOrPhD: true
  },
  {
    id: 'consultant',
    titleAr: 'استشاري',
    titleEn: 'Consultant',
    minExperienceYears: 8,
    requiresMastersOrPhD: true
  },
  {
    id: 'professor',
    titleAr: 'أستاذ دكتور',
    titleEn: 'Professor / Consultant',
    minExperienceYears: 12,
    requiresMastersOrPhD: true
  }
];

export const EGYPT_MEDICAL_SPECIALTIES = [
  { id: 'dental', nameAr: 'طب وجراحة الفم والأسنان', nameEn: 'Dentistry' },
  { id: 'derma', nameAr: 'الجلدية والتناسلية والليزر', nameEn: 'Dermatology & Laser' },
  { id: 'pediatrics', nameAr: 'طب الأطفال وحديثي الولادة', nameEn: 'Pediatrics' },
  { id: 'obgyn', nameAr: 'النساء والتوليد وعلاج العقم', nameEn: 'Obstetrics & Gynecology' },
  { id: 'cardiology', nameAr: 'أمراض القلب والأوعية الدموية والقسطرة', nameEn: 'Cardiology' },
  { id: 'internal', nameAr: 'الأمراض الباطنة والجهاز الهضمي والسكر', nameEn: 'Internal Medicine' },
  { id: 'orthopedic', nameAr: 'جراحة العظام والمفاصل والكسور', nameEn: 'Orthopedics' },
  { id: 'ophthalmology', nameAr: 'طب وجراحة العيون والليزك', nameEn: 'Ophthalmology' },
  { id: 'ent', nameAr: 'الأنف والأذن والحنجرة ومناظير الأحبال', nameEn: 'ENT' },
  { id: 'neurology', nameAr: 'المخ والأعصاب والعمود الفقري', nameEn: 'Neurology & Neurosurgery' },
  { id: 'physiotherapy', nameAr: 'العلاج الطبيعي والتأهيل الحركي', nameEn: 'Physiotherapy' },
  { id: 'nutrition', nameAr: 'التغذية العلاجية وعلاج السمنة والنحافة', nameEn: 'Clinical Nutrition' }
];

/**
 * Validates Egyptian Syndicate Registration Number (رقم قيد النقابة)
 * Syndicate IDs are strictly 4 to 8 numeric digits.
 * @param {string|number} syndicateId 
 * @returns {boolean}
 */
export function validateSyndicateId(syndicateId) {
  if (!syndicateId) return false;
  const clean = String(syndicateId).trim();
  return /^\d{4,8}$/.test(clean);
}

/**
 * Validates Ministry of Health & Population Practice License Number (ترخيص مزاولة المهنة)
 * Format: 4 to 9 numeric digits, optionally prefixed with MOHP / ص.
 * @param {string} licenseNumber 
 * @returns {boolean}
 */
export function validatePracticeLicense(licenseNumber) {
  if (!licenseNumber) return false;
  const clean = String(licenseNumber).trim().replace(/^(MOHP|MOH|ص|ترخيص)\s*[-/:]?\s*/i, '');
  return /^\d{4,9}$/.test(clean);
}

/**
 * Validates Private Medical Facility License Number (ترخيص المنشأة الطبية - العلاج الحر)
 * Format: [Governorate Code / Facility ID] e.g. "CAI-12345" or "01/8942" or standard 5-9 digits.
 * @param {string} facilityLicense 
 * @returns {boolean}
 */
export function validateFacilityLicense(facilityLicense) {
  if (!facilityLicense) return false;
  const clean = String(facilityLicense).trim();
  return /^([a-zA-Z0-9]{2,4}[-/])?\d{4,10}$/.test(clean);
}
