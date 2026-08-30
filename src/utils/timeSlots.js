/**
 * Utility functions for generating and formatting dynamic clinic time slots
 * and robust timezone-safe local date formatting.
 */

export const ARABIC_DAYS_MAP = [
  { id: 6, name: 'السبت', short: 'سبت' },
  { id: 0, name: 'الأحد', short: 'أحد' },
  { id: 1, name: 'الإثنين', short: 'إثنين' },
  { id: 2, name: 'الثلاثاء', short: 'ثلاثاء' },
  { id: 3, name: 'الأربعاء', short: 'أربعاء' },
  { id: 4, name: 'الخميس', short: 'خميس' },
  { id: 5, name: 'الجمعة', short: 'جمعة' },
];

/**
 * Formats a Date instance or (year, monthIndex, day) to "YYYY-MM-DD" in local time.
 * Avoids toISOString() timezone shift bugs in positive/negative GMT offsets.
 */
export function formatLocalDate(yearOrDate, month, day) {
  if (yearOrDate instanceof Date) {
    const y = yearOrDate.getFullYear();
    const m = String(yearOrDate.getMonth() + 1).padStart(2, '0');
    const d = String(yearOrDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const y = yearOrDate;
  const m = String(Number(month) + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date in local "YYYY-MM-DD" format.
 */
export function getTodayDateStr() {
  return formatLocalDate(new Date());
}

/**
 * Parses "YYYY-MM-DD" into a local Date object without UTC timezone conversion.
 */
export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Converts 24h time "17:30" to Arabic formatted time "05:30 م"
 */
export function formatTimeToArabic(time24) {
  if (!time24) return '';
  const [hourStr, minStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const min = minStr || '00';
  const period = hour >= 12 ? 'م' : 'ص';
  
  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour -= 12;
  }
  
  const paddedHour = hour < 10 ? `0${hour}` : `${hour}`;
  return `${paddedHour}:${min} ${period}`;
}

/**
 * Generate time slots array based on start time, end time, and duration
 * @param {string} startTime24 e.g. "17:00"
 * @param {string} endTime24 e.g. "22:00"
 * @param {number} durationMinutes e.g. 30
 * @returns {string[]} e.g. ["05:00 م", "05:30 م", ...]
 */
export function generateDynamicSlots(startTime24 = '17:00', endTime24 = '22:00', durationMinutes = 30) {
  const slots = [];
  const [startH, startM] = (startTime24 || '17:00').split(':').map(Number);
  const [endH, endM] = (endTime24 || '22:00').split(':').map(Number);

  let currentTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;

  while (currentTotalMinutes <= endTotalMinutes) {
    const h = Math.floor(currentTotalMinutes / 60);
    const m = currentTotalMinutes % 60;
    const time24Str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(formatTimeToArabic(time24Str));
    currentTotalMinutes += durationMinutes;
  }

  return slots;
}
