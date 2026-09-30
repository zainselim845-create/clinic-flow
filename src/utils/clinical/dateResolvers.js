import { formatLocalDate, getTodayDateStr } from '../timeSlots';

export const ARABIC_DAYS_MAP = {
  'السبت': 6,
  'سبت': 6,
  'الاحد': 0,
  'الأحد': 0,
  'احد': 0,
  'الحد': 0,
  'الاثنين': 1,
  'الإثنين': 1,
  'اثنين': 1,
  'الاتنين': 1,
  'الإتنين': 1,
  'الثلاثاء': 2,
  'تلات': 2,
  'تلاتاء': 2,
  'الثلاثا': 2,
  'الاربعاء': 3,
  'الأربعاء': 3,
  'اربعاء': 3,
  'الأربعا': 3,
  'الخميس': 4,
  'خميس': 4,
  'الجمعة': 5,
  'جمعة': 5
};

export const ARABIC_MONTH_NAMES = {
  'يناير': 0, 'فبراير': 1, 'مارس': 2, 'ابريل': 3, 'إبريل': 3, 'مايو': 4, 'يونيو': 5,
  'يوليو': 6, 'اغسطس': 7, 'أغسطس': 7, 'سبتمبر': 8, 'اكتوبر': 9, 'أكتوبر': 9, 'نوفمبر': 10, 'ديسمبر': 11
};

/**
 * Resolves a date string or natural language Arabic day into YYYY-MM-DD
 * @param {string} text - Message text from the doctor
 * @returns {string|null} ISO Date string YYYY-MM-DD
 */
export function resolveDateFromText(text) {
  if (!text) return null;
  const clean = text.trim().replace(/\s+/g, ' ');

  // 1. Explicit YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/202[4-9][/-](?:1[0-2]|0?[1-9])[/-](?:3[01]|[12][0-9]|0?[1-9])\b/);
  if (isoMatch) {
    const parts = isoMatch[0].split(/[/-]/).map(Number);
    return formatLocalDate(parts[0], parts[1] - 1, parts[2]);
  }

  // 2. Format DD/MM or DD-MM (e.g. 30/8, 30/08, 31/8, 30-8, 30 / 8, 30 /8)
  const ddmMatch = clean.match(/(?:3[01]|[12][0-9]|0?[1-9])\s*[/-\s]\s*(?:1[0-2]|0?[1-9])(?:\s*[/-\s]\s*(202[4-9]))?\b/);
  if (ddmMatch) {
    const parts = ddmMatch[0].split(/[/-]/).map(s => parseInt(s.trim(), 10));

    const day = parts[0];
    const month = parts[1] - 1;
    const currentYear = parts[2] || new Date().getFullYear();
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return formatLocalDate(currentYear, month, day);
    }
  }

  // 3. Arabic Month format: e.g. "30 اغسطس", "30 أغسطس", "31 يناير"
  for (const [mName, mIdx] of Object.entries(ARABIC_MONTH_NAMES)) {
    const regex = new RegExp(`(?:3[01]|[12][0-9]|0?[1-9])\\s*(?:من|في)?\\s*${mName}`);
    const match = clean.match(regex);
    if (match) {
      const dayMatch = match[0].match(/\d+/);
      if (dayMatch) {
        const day = parseInt(dayMatch[0], 10);
        const currentYear = new Date().getFullYear();
        return formatLocalDate(currentYear, mIdx, day);
      }
    }
  }

  // 4. Relative "اليوم" / "النهاردة"
  if (clean.includes('النهاردة') || clean.includes('اليوم')) {
    return getTodayDateStr();
  }

  // 5. Relative "بكرة" / "غدا"
  if (clean.includes('بكرة') || clean.includes('غداً') || clean.includes('غدا')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatLocalDate(d);
  }

  // 6. Relative "بعد بكرة" / "بعده"
  if (clean.includes('بعد بكرة') || clean.includes('بعد غد')) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return formatLocalDate(d);
  }

  // 7. Day of week mention (e.g. "يوم الأحد", "السبت الجاي", "يوم الحد")
  for (const [dayName, targetJsDay] of Object.entries(ARABIC_DAYS_MAP)) {
    if (clean.includes(dayName)) {
      const today = new Date();
      const currentJsDay = today.getDay();
      let diff = targetJsDay - currentJsDay;
      if (diff <= 0) diff += 7; // next occurrence
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + diff);
      return formatLocalDate(targetDate);
    }
  }

  // 8. Day number in current month (e.g. "يوم 30", "وم 30", "يوم30", "30 في الشهر")
  const dayNumMatch = clean.match(/(?:يوم|وم|تاريخ|day)\s*([0-3]?[0-9])\b/);
  if (dayNumMatch && dayNumMatch[1]) {
    const day = parseInt(dayNumMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const today = new Date();
      return formatLocalDate(today.getFullYear(), today.getMonth(), day);
    }
  }

  return null;
}

/**
 * Resolves a 12h or 24h time slot from Arabic text (e.g. "الساعة 8 مساء", "08:00 م")
 * @param {string} text - Message text
 * @returns {string|null} Formatted Arabic time or null
 */
export function resolveTimeFromText(text) {
  if (!text) return null;
  
  // Explicit Arabic slot (e.g. 05:30 م, 8:00 م, 10:00 ص)
  const slotMatch = text.match(/([0-1]?[0-9]:[0-5][0-9])\s*(ص|م)/);
  if (slotMatch) {
    return `${slotMatch[1]} ${slotMatch[2]}`;
  }

  // "الساعة X مساء/صباحا"
  const hourMatch = text.match(/(?:للساعة|الساعة|الساعه|ساعة)\s*([0-1]?[0-9])(?::([0-5][0-9]))?\s*(مساء|صباحا|م|ص|المغرب|العصر|الظهر|العشا|العشاء|بالليل|الصبح)?/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1], 10);
    const minute = hourMatch[2] || '00';
    const period = hourMatch[3] || '';
    const isPm = period.includes('مساء') || period === 'م' || period.includes('المغرب') || period.includes('العصر') || period.includes('الظهر') || period.includes('العشا') || period.includes('بالليل') || (hour >= 1 && hour <= 11 && !period.includes('صباح') && !period.includes('الصبح'));
    const formattedHour = String(hour > 12 ? hour - 12 : hour).padStart(2, '0');
    return `${formattedHour}:${minute} ${isPm ? 'م' : 'ص'}`;
  }

  // Short slot (e.g. "الساعة 6", "6 مساء")
  const shortMatch = text.match(/\b([1-9]|1[0-2])\s*(مساء|صباحا|م|ص)\b/);
  if (shortMatch) {
    const hour = parseInt(shortMatch[1], 10);
    const isPm = shortMatch[2].includes('مساء') || shortMatch[2] === 'م';
    const formattedHour = String(hour).padStart(2, '0');
    return `${formattedHour}:00 ${isPm ? 'م' : 'ص'}`;
  }

  return null;
}

/**
 * Searches and matches a patient from text using names or phone numbers
 * @param {string} text 
 * @param {Array} patients 
 * @returns {Object|null}
 */
export function findPatientInText(text, patients = []) {
  if (!text || !Array.isArray(patients) || patients.length === 0) return null;
  const clean = text.trim();

  // 1. Direct full name match
  for (const p of patients) {
    if (p.name && clean.includes(p.name.trim())) {
      return p;
    }
  }

  // 2. Phone number match
  const phoneMatch = clean.match(/01[0125][0-9]{8}/);
  if (phoneMatch) {
    const found = patients.find(p => p.phone && p.phone.replace(/\D/g, '').includes(phoneMatch[0]));
    if (found) return found;
  }

  // 3. First + second name match (minimum 2 words)
  for (const p of patients) {
    const parts = (p.name || '').trim().split(/\s+/);
    if (parts.length >= 2) {
      const subName = `${parts[0]} ${parts[1]}`;
      if (clean.includes(subName)) {
        return p;
      }
    }
  }

  // 4. Single distinct first name match if len >= 3
  for (const p of patients) {
    const firstName = (p.name || '').trim().split(/\s+/)[0];
    if (firstName && firstName.length >= 3 && clean.includes(firstName)) {
      return p;
    }
  }

  return null;
}

/**
 * Extracts a candidate patient name from free text
 * @param {string} text 
 * @returns {string|null}
 */
export function extractCandidateName(text) {
  if (!text) return null;
  const match = text.match(/(?:لمريض|للمريض|لـ|كشف|ملف المريض|بيانات المريض|مريض اسمه|عن المريض|عن مريض|احجز لـ|احجزلي لـ|احجز ل|ضيف موعد لـ|ضيف موعد ل|الغي كشف|الغي موعد|كنسل موعد|كنسل كشف|دخل|خلصت كشف|انقل موعد|أجل كشف|اجل كشف)\s+([^\s,.:;]+(?:\s+[^\s,.:;]+){0,2})/);
  if (match && match[1]) {
    const name = match[1].replace(/(?:بكرة|غدا|النهاردة|اليوم|الساعة|يوم|تاريخ|\d+).*/g, '').trim();
    if (name.length >= 2) return name;
  }
  return null;
}
