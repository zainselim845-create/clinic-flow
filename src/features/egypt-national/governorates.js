/**
 * Arab Republic of Egypt - National Healthcare & Administrative Geography
 * Complete registry of all 27 Egyptian Governorates, administrative codes,
 * regional healthcare zones, and medical syndicate branches.
 */

export const EGYPT_GOVERNORATES = [
  {
    code: '01',
    id: 'cairo',
    nameAr: 'القاهرة',
    nameEn: 'Cairo',
    region: 'Greater Cairo',
    regionAr: 'إقليم القاهرة الكبرى',
    dialCode: '02',
    majorMedicalHubs: ['مدينة نصر', 'مصر الجديدة', 'المعادي', 'وسط البلد', 'التجمع الخامس', 'شبرا']
  },
  {
    code: '02',
    id: 'alexandria',
    nameAr: 'الإسكندرية',
    nameEn: 'Alexandria',
    region: 'Alexandria & North Coast',
    regionAr: 'إقليم الإسكندرية والساحل الشمالي',
    dialCode: '03',
    majorMedicalHubs: ['محطة الرمل', 'سموحة', 'لوران', 'ميامي', 'سيدي جابر', 'المنتزه']
  },
  {
    code: '03',
    id: 'port_said',
    nameAr: 'بورسعيد',
    nameEn: 'Port Said',
    region: 'Canal Zone',
    regionAr: 'إقليم القناة',
    dialCode: '066',
    majorMedicalHubs: ['حي الشرق', 'حي العرب', 'حي المناخ', 'بورفؤاد']
  },
  {
    code: '04',
    id: 'suez',
    nameAr: 'السويس',
    nameEn: 'Suez',
    region: 'Canal Zone',
    regionAr: 'إقليم القناة',
    dialCode: '062',
    majorMedicalHubs: ['الأربعين', 'السويس', 'فيصل', 'عتاقة']
  },
  {
    code: '11',
    id: 'damietta',
    nameAr: 'دمياط',
    nameEn: 'Damietta',
    region: 'Delta',
    regionAr: 'إقليم الدلتا',
    dialCode: '057',
    majorMedicalHubs: ['دمياط القديمة', 'دمياط الجديدة', 'رأس البر', 'فارسكور']
  },
  {
    code: '12',
    id: 'dakahlia',
    nameAr: 'الدقهلية',
    nameEn: 'Dakahlia',
    region: 'Delta',
    regionAr: 'إقليم الدلتا',
    dialCode: '050',
    majorMedicalHubs: ['المنصورة (عاصمة الطب)', 'طلخا', 'ميت غمر', 'سنبلاوين', 'دكرنس']
  },
  {
    code: '13',
    id: 'sharqia',
    nameAr: 'الشرقية',
    nameEn: 'Sharqia',
    region: 'Delta',
    regionAr: 'إقليم الدلتا',
    dialCode: '055',
    majorMedicalHubs: ['الزقازيق', 'العاشر من رمضان', 'بلبيس', 'فاقوس', 'منيا القمح']
  },
  {
    code: '14',
    id: 'qalyubia',
    nameAr: 'القليوبية',
    nameEn: 'Qalyubia',
    region: 'Greater Cairo',
    regionAr: 'إقليم القاهرة الكبرى',
    dialCode: '013',
    majorMedicalHubs: ['بنها', 'شبرا الخيمة', 'قليوب', 'طوخ', 'العبور']
  },
  {
    code: '15',
    id: 'kafr_el_sheikh',
    nameAr: 'كفر الشيخ',
    nameEn: 'Kafr El Sheikh',
    region: 'Delta',
    regionAr: 'إقليم الدلتا',
    dialCode: '047',
    majorMedicalHubs: ['كفر الشيخ', 'دسوق', 'فوه', 'بلطيم']
  },
  {
    code: '16',
    id: 'gharbia',
    nameAr: 'الغربية',
    nameEn: 'Gharbia',
    region: 'Delta',
    regionAr: 'إقليم الدلتا',
    dialCode: '040',
    majorMedicalHubs: ['طنطا (المركز الطبي للدلتا)', 'المحلة الكبرى', 'زفتى', 'كفر الزيات']
  },
  {
    code: '17',
    id: 'menoufia',
    nameAr: 'المنوفية',
    nameEn: 'Menoufia',
    region: 'Delta',
    regionAr: 'إقليم الدلتا',
    dialCode: '048',
    majorMedicalHubs: ['شبين الكوم', 'قويسنا', 'منوف', 'أشمون', 'السادات']
  },
  {
    code: '18',
    id: 'beheira',
    nameAr: 'البحيرة',
    nameEn: 'Beheira',
    region: 'Delta',
    regionAr: 'إقليم الدلتا',
    dialCode: '045',
    majorMedicalHubs: ['دمنهور', 'كفر الدوار', 'إيتاي البارود', 'كوم حمادة']
  },
  {
    code: '19',
    id: 'ismailia',
    nameAr: 'الإسماعيلية',
    nameEn: 'Ismailia',
    region: 'Canal Zone',
    regionAr: 'إقليم القناة',
    dialCode: '064',
    majorMedicalHubs: ['الإسماعيلية', 'التل الكبير', 'فايد', 'القنطرة غرب']
  },
  {
    code: '21',
    id: 'giza',
    nameAr: 'الجيزة',
    nameEn: 'Giza',
    region: 'Greater Cairo',
    regionAr: 'إقليم القاهرة الكبرى',
    dialCode: '02',
    majorMedicalHubs: ['الدقي', 'المهندسين', 'الهرم', 'فيصل', 'الشيخ زايد', 'مدينة 6 أكتوبر']
  },
  {
    code: '22',
    id: 'beni_suef',
    nameAr: 'بني سويف',
    nameEn: 'Beni Suef',
    region: 'Northern Upper Egypt',
    regionAr: 'إقليم شمال الصعيد',
    dialCode: '082',
    majorMedicalHubs: ['بني سويف', 'الواسطى', 'ببا', 'الفشن']
  },
  {
    code: '23',
    id: 'fayoum',
    nameAr: 'الفيوم',
    nameEn: 'Fayoum',
    region: 'Northern Upper Egypt',
    regionAr: 'إقليم شمال الصعيد',
    dialCode: '084',
    majorMedicalHubs: ['الفيوم', 'سنورس', 'إطسا', 'طامية']
  },
  {
    code: '24',
    id: 'minya',
    nameAr: 'المنيا',
    nameEn: 'Minya',
    region: 'Northern Upper Egypt',
    regionAr: 'إقليم شمال الصعيد',
    dialCode: '086',
    majorMedicalHubs: ['المنيا', 'ملوي', 'مغاغة', 'بني مزار', 'سمالوط']
  },
  {
    code: '25',
    id: 'assiut',
    nameAr: 'أسيوط',
    nameEn: 'Assiut',
    region: 'Central Upper Egypt',
    regionAr: 'إقليم وسط الصعيد',
    dialCode: '088',
    majorMedicalHubs: ['أسيوط (عاصمة صعيد مصر الطبية)', 'ديروط', 'القوصية', 'أبو تيج']
  },
  {
    code: '26',
    id: 'sohag',
    nameAr: 'سوهاج',
    nameEn: 'Sohag',
    region: 'Southern Upper Egypt',
    regionAr: 'إقليم جنوب الصعيد',
    dialCode: '093',
    majorMedicalHubs: ['سوهاج', 'طهطا', 'جرجا', 'المراغة', 'أخميم']
  },
  {
    code: '27',
    id: 'qena',
    nameAr: 'قنا',
    nameEn: 'Qena',
    region: 'Southern Upper Egypt',
    regionAr: 'إقليم جنوب الصعيد',
    dialCode: '096',
    majorMedicalHubs: ['قنا', 'نجع حمادي', 'قوص', 'دشنا', 'أبو تشت']
  },
  {
    code: '28',
    id: 'aswan',
    nameAr: 'أسوان',
    nameEn: 'Aswan',
    region: 'Southern Upper Egypt',
    regionAr: 'إقليم جنوب الصعيد',
    dialCode: '097',
    majorMedicalHubs: ['أسوان', 'كوم أمبو', 'إدفو', 'دراو']
  },
  {
    code: '29',
    id: 'luxor',
    nameAr: 'الأقصر',
    nameEn: 'Luxor',
    region: 'Southern Upper Egypt',
    regionAr: 'إقليم جنوب الصعيد',
    dialCode: '095',
    majorMedicalHubs: ['الأقصر', 'إسنا', 'أرمنت', 'البياضية']
  },
  {
    code: '31',
    id: 'red_sea',
    nameAr: 'البحر الأحمر',
    nameEn: 'Red Sea',
    region: 'Frontier & Coastal',
    regionAr: 'محافظات الحدود والسواحل',
    dialCode: '065',
    majorMedicalHubs: ['الغردقة', 'سفاجا', 'القصير', 'مرسى علم']
  },
  {
    code: '32',
    id: 'new_valley',
    nameAr: 'الوادي الجديد',
    nameEn: 'New Valley',
    region: 'Frontier & Coastal',
    regionAr: 'محافظات الحدود والسواحل',
    dialCode: '092',
    majorMedicalHubs: ['الخارجة', 'الداخلة', 'الفرافرة']
  },
  {
    code: '33',
    id: 'matrouh',
    nameAr: 'مطروح',
    nameEn: 'Matrouh',
    region: 'Frontier & Coastal',
    regionAr: 'محافظات الحدود والسواحل',
    dialCode: '046',
    majorMedicalHubs: ['مرسى مطروح', 'العلمين', 'الضبعة', 'سيوة']
  },
  {
    code: '34',
    id: 'north_sinai',
    nameAr: 'شمال سيناء',
    nameEn: 'North Sinai',
    region: 'Frontier & Coastal',
    regionAr: 'محافظات الحدود والسواحل',
    dialCode: '068',
    majorMedicalHubs: ['العريش', 'بئر العبد', 'الشيخ زويد']
  },
  {
    code: '35',
    id: 'south_sinai',
    nameAr: 'جنوب سيناء',
    nameEn: 'South Sinai',
    region: 'Frontier & Coastal',
    regionAr: 'محافظات الحدود والسواحل',
    dialCode: '069',
    majorMedicalHubs: ['شرم الشيخ', 'طور سيناء', 'دهب', 'نويبع']
  },
  {
    code: '88',
    id: 'abroad',
    nameAr: 'مواليد خارج الجمهورية',
    nameEn: 'Born Abroad',
    region: 'Expatriate',
    regionAr: 'مواليد الخارج',
    dialCode: null,
    majorMedicalHubs: ['القاهرة (مكتب تصديقات وزارة الصحة)']
  }
];

export const GOVERNORATES_BY_CODE = Object.freeze(
  EGYPT_GOVERNORATES.reduce((acc, gov) => {
    acc[gov.code] = gov;
    return acc;
  }, {})
);

export const GOVERNORATES_BY_ID = Object.freeze(
  EGYPT_GOVERNORATES.reduce((acc, gov) => {
    acc[gov.id] = gov;
    return acc;
  }, {})
);

/**
 * Resolves Egyptian Governorate by its two-digit Ministry of Interior Civil Code
 * @param {string} code - e.g. "01" (Cairo), "12" (Dakahlia)
 * @returns {Object|null}
 */
export function getGovernorateByCode(code) {
  if (!code) return null;
  const normalized = String(code).trim().padStart(2, '0');
  return GOVERNORATES_BY_CODE[normalized] || null;
}

/**
 * Resolves Egyptian Governorate by English ID or Arabic Name
 * @param {string} query 
 * @returns {Object|null}
 */
export function findGovernorate(query) {
  if (!query || typeof query !== 'string') return null;
  const clean = query.trim().toLowerCase();
  return (
    EGYPT_GOVERNORATES.find(
      g => g.id.toLowerCase() === clean ||
           g.nameAr === query.trim() ||
           g.nameEn.toLowerCase() === clean
    ) || null
  );
}
