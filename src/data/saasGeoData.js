// Standard Egyptian Governorates and Regional Clusters with real GPS coordinates for OpenStreetMap
export const EGYPT_GOVERNORATES = [
  { 
    id: 'cairo', 
    name: 'القاهرة', 
    region: 'greater_cairo', 
    lat: 30.0444, 
    lng: 31.2357,
    keywords: ['قاهرة', 'cairo', 'تجمع', 'معادي', 'نصر', 'جديدة', 'شروق', 'مدينتي', 'رحاب', 'ميديكال بارك', 'أهرام'],
    center: { x: 442, y: 222 },
    path: 'M 425 205 L 470 205 L 465 245 L 420 245 Z'
  },
  { 
    id: 'giza', 
    name: 'الجيزة', 
    region: 'greater_cairo', 
    lat: 30.0131, 
    lng: 31.2089,
    keywords: ['جيزة', 'giza', 'دقي', 'مهندسين', 'أكتوبر', 'october', 'زايد', 'zayed', 'هرم', 'فيصل'],
    center: { x: 382, y: 228 },
    path: 'M 360 195 L 415 205 L 410 260 L 350 250 Z'
  },
  { 
    id: 'alexandria', 
    name: 'الإسكندرية', 
    region: 'alex_coast', 
    lat: 31.2001, 
    lng: 29.9187,
    keywords: ['إسكندرية', 'اسكندرية', 'alex', 'alexandria', 'سموحة', 'لوران', 'رشدي', 'رمل'],
    center: { x: 305, y: 105 },
    path: 'M 260 90 L 340 90 L 350 120 L 280 130 Z'
  },
  { 
    id: 'dakahlia', 
    name: 'الدقهلية (المنصورة)', 
    region: 'delta', 
    lat: 31.0409, 
    lng: 31.3785,
    keywords: ['دقهلية', 'منصورة', 'mansoura', 'ميت غمر', 'سنبلاوين'],
    center: { x: 420, y: 135 },
    path: 'M 400 120 L 440 115 L 450 150 L 395 155 Z'
  },
  { 
    id: 'gharbia', 
    name: 'الغربية (طنطا)', 
    region: 'delta', 
    lat: 30.7865, 
    lng: 31.0004,
    keywords: ['غربية', 'طنطا', 'tanta', 'محلة'],
    center: { x: 378, y: 138 },
    path: 'M 350 120 L 400 120 L 395 155 L 360 155 Z'
  },
  { 
    id: 'sharqia', 
    name: 'الشرقية (الزقازيق)', 
    region: 'delta', 
    lat: 30.5765, 
    lng: 31.5041,
    keywords: ['شرقية', 'زقازيق', 'عاشر', '10th'],
    center: { x: 448, y: 152 },
    path: 'M 440 115 L 470 125 L 475 180 L 420 180 L 430 150 Z'
  },
  { 
    id: 'qalyubia', 
    name: 'القليوبية (بنها)', 
    region: 'greater_cairo', 
    lat: 30.4660, 
    lng: 31.1856,
    keywords: ['قليوبية', 'بنها', 'شبرا'],
    center: { x: 410, y: 192 },
    path: 'M 395 180 L 430 180 L 425 205 L 395 205 Z'
  },
  { 
    id: 'menofia', 
    name: 'المنوفية (شبين الكوم)', 
    region: 'delta', 
    lat: 30.5567, 
    lng: 31.0089,
    keywords: ['منوفية', 'شبين', 'سادات', 'منوف'],
    center: { x: 382, y: 170 },
    path: 'M 360 155 L 395 155 L 400 180 L 365 185 Z'
  },
  { 
    id: 'beheira', 
    name: 'البحيرة (دمنهور)', 
    region: 'delta', 
    lat: 31.0409, 
    lng: 30.4700,
    keywords: ['بحيرة', 'دمنهور', 'كفر الدوار'],
    center: { x: 320, y: 155 },
    path: 'M 280 130 L 350 120 L 360 170 L 300 180 Z'
  },
  { 
    id: 'kafr_el_sheikh', 
    name: 'كفر الشيخ', 
    region: 'delta', 
    lat: 31.1107, 
    lng: 30.9388,
    keywords: ['كفر الشيخ', 'دسوق'],
    center: { x: 375, y: 100 },
    path: 'M 340 90 L 410 80 L 400 120 L 350 120 Z'
  },
  { 
    id: 'damietta', 
    name: 'دمياط', 
    region: 'delta', 
    lat: 31.4175, 
    lng: 31.8144,
    keywords: ['دمياط', 'رأس البر'],
    center: { x: 425, y: 100 },
    path: 'M 410 80 L 450 85 L 440 115 L 400 120 Z'
  },
  { 
    id: 'port_said', 
    name: 'بورسعيد', 
    region: 'canal', 
    lat: 31.2653, 
    lng: 32.3019,
    keywords: ['بورسعيد', 'بورفؤاد'],
    center: { x: 468, y: 108 },
    path: 'M 450 85 L 485 95 L 480 125 L 450 120 Z'
  },
  { 
    id: 'ismailia', 
    name: 'الإسماعيلية', 
    region: 'canal', 
    lat: 30.5965, 
    lng: 32.2715,
    keywords: ['إسماعيلية', 'اسماعيلية'],
    center: { x: 482, y: 155 },
    path: 'M 470 125 L 500 135 L 495 180 L 465 175 Z'
  },
  { 
    id: 'suez', 
    name: 'السويس', 
    region: 'canal', 
    lat: 29.9668, 
    lng: 32.5498,
    keywords: ['سويس', 'عين سخنة'],
    center: { x: 478, y: 210 },
    path: 'M 465 175 L 500 185 L 490 240 L 455 235 Z'
  },
  { 
    id: 'sinai', 
    name: 'سيناء (شرم الشيخ)', 
    region: 'canal', 
    lat: 27.9158, 
    lng: 34.3299,
    keywords: ['سيناء', 'شرم', 'دهب', 'طابا', 'عريش'],
    center: { x: 550, y: 210 },
    path: 'M 500 95 L 610 110 L 590 290 L 535 320 L 500 185 Z'
  },
  { 
    id: 'fayoum', 
    name: 'الفيوم', 
    region: 'upper_egypt', 
    lat: 29.3084, 
    lng: 30.8428,
    keywords: ['فيوم'],
    center: { x: 362, y: 268 },
    path: 'M 345 250 L 385 255 L 380 285 L 340 280 Z'
  },
  { 
    id: 'beni_suef', 
    name: 'بني سويف', 
    region: 'upper_egypt', 
    lat: 29.0661, 
    lng: 31.0994,
    keywords: ['بني سويف'],
    center: { x: 410, y: 275 },
    path: 'M 385 255 L 440 255 L 435 295 L 380 295 Z'
  },
  { 
    id: 'minya', 
    name: 'المنيا', 
    region: 'upper_egypt', 
    lat: 28.1099, 
    lng: 30.7503,
    keywords: ['منيا', 'ملوي'],
    center: { x: 410, y: 322 },
    path: 'M 375 295 L 440 295 L 445 350 L 380 350 Z'
  },
  { 
    id: 'assiut', 
    name: 'أسيوط', 
    region: 'upper_egypt', 
    lat: 27.1783, 
    lng: 31.1859,
    keywords: ['أسيوط', 'اسيوط', 'ديروط'],
    center: { x: 422, y: 380 },
    path: 'M 380 350 L 455 350 L 460 410 L 390 410 Z'
  },
  { 
    id: 'sohag', 
    name: 'سوهاج', 
    region: 'upper_egypt', 
    lat: 26.5569, 
    lng: 31.6948,
    keywords: ['سوهاج', 'طهطا', 'جرجا'],
    center: { x: 438, y: 435 },
    path: 'M 395 410 L 470 410 L 475 460 L 410 460 Z'
  },
  { 
    id: 'qena', 
    name: 'قنا', 
    region: 'upper_egypt', 
    lat: 26.1551, 
    lng: 32.7160,
    keywords: ['قنا', 'نجع حمادي'],
    center: { x: 465, y: 480 },
    path: 'M 420 460 L 505 460 L 500 500 L 435 500 Z'
  },
  { 
    id: 'luxor', 
    name: 'الأقصر', 
    region: 'upper_egypt', 
    lat: 25.6872, 
    lng: 32.6396,
    keywords: ['أقصر', 'اقصر', 'luxor'],
    center: { x: 465, y: 518 },
    path: 'M 435 500 L 495 500 L 490 535 L 440 535 Z'
  },
  { 
    id: 'aswan', 
    name: 'أسوان', 
    region: 'upper_egypt', 
    lat: 24.0889, 
    lng: 32.8998,
    keywords: ['أسوان', 'اسوان', 'aswan'],
    center: { x: 470, y: 572 },
    path: 'M 430 535 L 520 535 L 510 610 L 420 610 Z'
  },
  { 
    id: 'red_sea', 
    name: 'البحر الأحمر (الغردقة)', 
    region: 'frontier', 
    lat: 27.2579, 
    lng: 33.8116,
    keywords: ['بحر أحمر', 'غردقة', 'hurghada', 'جونة', 'سفاجا', 'قصير', 'علم'],
    center: { x: 555, y: 420 },
    path: 'M 490 240 L 540 260 L 630 460 L 590 590 L 520 535 L 460 260 Z'
  },
  { 
    id: 'matrouh', 
    name: 'مطروح والساحل الشمالي', 
    region: 'frontier', 
    lat: 31.3543, 
    lng: 27.2373,
    keywords: ['مطروح', 'ساحل', 'علمين', 'ضبعة', 'سلوم'],
    center: { x: 175, y: 180 },
    path: 'M 70 85 L 260 90 L 280 180 L 160 280 L 70 280 Z'
  },
  { 
    id: 'new_valley', 
    name: 'الوادي الجديد', 
    region: 'frontier', 
    lat: 25.4514, 
    lng: 30.5472,
    keywords: ['وادي جديد', 'خارجة', 'داخلة', 'فرافرة'],
    center: { x: 245, y: 445 },
    path: 'M 70 280 L 380 350 L 420 610 L 70 610 Z'
  }
];

export const REGIONAL_CLUSTERS = {
  greater_cairo: 'إقليم القاهرة الكبرى',
  alex_coast: 'الإسكندرية والساحل',
  delta: 'محافظات الدلتا والوجه البحري',
  canal: 'مدن القناة وسيناء',
  upper_egypt: 'محافظات صعيد مصر',
  frontier: 'المحافظات الساحلية والحدودية',
  gulf_international: 'الخليج والتوسع الدولي'
};

export const GULF_EXPANSION_REGIONS = [
  { id: 'riyadh', name: 'المملكة العربية السعودية', code: 'SA', lat: 24.7136, lng: 46.6753, region: 'gulf_international', center: { x: 380, y: 260 }, path: 'M 220 180 L 460 160 L 520 340 L 300 370 Z' },
  { id: 'dubai', name: 'الإمارات العربية المتحدة', code: 'AE', lat: 25.2048, lng: 55.2708, region: 'gulf_international', center: { x: 580, y: 250 }, path: 'M 540 220 L 630 230 L 620 290 L 530 280 Z' },
  { id: 'kuwait', name: 'دولة الكويت', code: 'KW', lat: 29.3759, lng: 47.9774, region: 'gulf_international', center: { x: 410, y: 140 }, path: 'M 390 120 L 440 125 L 435 165 L 385 160 Z' }
];

/**
 * Heuristic detector for clinic location based on address, phone, and name
 */
export function detectClinicLocation(clinic = {}) {
  const address = (clinic.address || '').toLowerCase();
  const name = (clinic.name || '').toLowerCase();
  const text = `${address} ${name}`;

  // 1. Check Egyptian governorates
  for (const gov of EGYPT_GOVERNORATES) {
    for (const kw of gov.keywords) {
      if (text.includes(kw)) {
        return {
          country: 'مصر',
          countryCode: 'EG',
          governorateId: gov.id,
          governorateName: gov.name,
          regionCluster: gov.region,
          regionClusterName: REGIONAL_CLUSTERS[gov.region]
        };
      }
    }
  }

  // 2. Check Gulf / International
  if (text.includes('سعودية') || text.includes('رياض') || text.includes('جدة') || text.includes('saudi') || (clinic.phone && clinic.phone.startsWith('+966'))) {
    return { country: 'المملكة العربية السعودية', countryCode: 'SA', governorateId: 'riyadh', governorateName: 'الرياض والمملكة', regionCluster: 'gulf_international', regionClusterName: REGIONAL_CLUSTERS.gulf_international };
  }
  if (text.includes('إمارات') || text.includes('دبي') || text.includes('uae') || text.includes('dubai') || (clinic.phone && clinic.phone.startsWith('+971'))) {
    return { country: 'الإمارات العربية المتحدة', countryCode: 'AE', governorateId: 'dubai', governorateName: 'دبي والإمارات', regionCluster: 'gulf_international', regionClusterName: REGIONAL_CLUSTERS.gulf_international };
  }
  if (text.includes('كويت') || text.includes('kuwait') || (clinic.phone && clinic.phone.startsWith('+965'))) {
    return { country: 'الكويت', countryCode: 'KW', governorateId: 'kuwait', governorateName: 'دولة الكويت', regionCluster: 'gulf_international', regionClusterName: REGIONAL_CLUSTERS.gulf_international };
  }

  // Default: Cairo (Heart of Operations)
  return {
    country: 'مصر',
    countryCode: 'EG',
    governorateId: 'cairo',
    governorateName: 'القاهرة',
    regionCluster: 'greater_cairo',
    regionClusterName: REGIONAL_CLUSTERS.greater_cairo
  };
}

/**
 * Calculates straight-line distance in kilometers between two GPS coordinates using Haversine formula
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

/**
 * Resolves accurate coordinates for a clinic:
 * Priority: 1. Explicit clinic coordinates (lat, lng)
 *           2. Coordinates parsed from Google Maps URL
 *           3. Real coordinates of detected Egyptian governorate/city with deterministic spread
 */
export function getClinicCoordinates(clinic = {}, detectedGov = {}) {
  // 1. Explicit coordinates object
  if (clinic.coordinates && typeof clinic.coordinates.lat === 'number' && typeof clinic.coordinates.lng === 'number') {
    return { lat: clinic.coordinates.lat, lng: clinic.coordinates.lng, isExactGps: true };
  }
  if (typeof clinic.lat === 'number' && typeof clinic.lng === 'number') {
    return { lat: clinic.lat, lng: clinic.lng, isExactGps: true };
  }

  // 2. Parse from googleMapsUrl if present
  if (clinic.googleMapsUrl && typeof clinic.googleMapsUrl === 'string') {
    const match = clinic.googleMapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || 
                  clinic.googleMapsUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng, isExactGps: true };
      }
    }
  }

  // 3. Governorate base coordinates with deterministic spread so multiple clinics in same city don't overlap
  const baseLat = detectedGov.lat || 30.0444;
  const baseLng = detectedGov.lng || 31.2357;
  let hash = 0;
  const str = String(clinic.id || clinic.slug || clinic.name || 'clinic');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((Math.abs(hash) % 100) - 50) * 0.0006;
  const offsetLng = ((Math.abs(hash >> 3) % 100) - 50) * 0.0006;

  return {
    lat: Math.round((baseLat + offsetLat) * 10000) / 10000,
    lng: Math.round((baseLng + offsetLng) * 10000) / 10000,
    isExactGps: false
  };
}
