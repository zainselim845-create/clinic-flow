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
 * Generate time slots array based on start time, end time, duration, and break time
 * @param {string} startTime24 e.g. "17:00"
 * @param {string} endTime24 e.g. "22:00"
 * @param {number} durationMinutes e.g. 30
 * @param {Object} breakTime e.g. { enabled: true, start: "19:30", end: "20:00" }
 * @returns {string[]} e.g. ["05:00 م", "05:30 م", ...]
 */
export function generateDynamicSlots(
  startTime24 = '17:00', 
  endTime24 = '22:00', 
  durationMinutes = 30,
  breakTime = null
) {
  const slots = [];
  const [startH, startM] = (startTime24 || '17:00').split(':').map(Number);
  const [endH, endM] = (endTime24 || '22:00').split(':').map(Number);

  let currentTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;

  let breakStartMinutes = -1;
  let breakEndMinutes = -1;
  if (breakTime && breakTime.enabled && breakTime.start && breakTime.end) {
    const [bsh, bsm] = breakTime.start.split(':').map(Number);
    const [beh, bem] = breakTime.end.split(':').map(Number);
    breakStartMinutes = bsh * 60 + bsm;
    breakEndMinutes = beh * 60 + bem;
  }

  while (currentTotalMinutes <= endTotalMinutes) {
    // Skip slots falling inside the break window
    if (breakStartMinutes !== -1 && breakEndMinutes !== -1) {
      if (currentTotalMinutes >= breakStartMinutes && currentTotalMinutes < breakEndMinutes) {
        currentTotalMinutes += durationMinutes;
        continue;
      }
    }

    const h = Math.floor(currentTotalMinutes / 60);
    const m = currentTotalMinutes % 60;
    const time24Str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(formatTimeToArabic(time24Str));
    currentTotalMinutes += durationMinutes;
  }

  return slots;
}

/**
 * Resolves available slots and status for a specific date using scheduleConfig:
 *  - Checks if date falls inside any vacation date ranges
 *  - Checks day of week against workingDays
 *  - Resolves day-specific shifts (e.g. Saturday 17:00-22:00, Tuesday 13:00-18:00)
 *  - Excludes daily break times
 * 
 * @param {string} dateStr "YYYY-MM-DD"
 * @param {Object} scheduleConfig 
 * @returns {{ isVacation: boolean, vacationReason?: string, isDayOff: boolean, slots: string[], startTime?: string, endTime?: string, workingHoursStr?: string }}
 */
export function getSlotsForDate(dateStr, scheduleConfig = {}) {
  if (!dateStr) return { isVacation: false, isDayOff: false, slots: [] };

  // 1. Check vacations / annual leave
  const vacations = scheduleConfig?.vacations || [];
  const matchedVacation = vacations.find(v => v.startDate && v.endDate && dateStr >= v.startDate && dateStr <= v.endDate);
  if (matchedVacation) {
    return {
      isVacation: true,
      vacationReason: matchedVacation.title || 'إجازة رسمية للعيادة',
      isDayOff: true,
      slots: []
    };
  }

  // 2. Check working days
  const dateObj = parseLocalDate(dateStr);
  const jsDay = dateObj.getDay();
  const workingDays = scheduleConfig?.workingDays || [6, 0, 1, 2, 3, 4];
  if (!workingDays.includes(jsDay)) {
    return {
      isVacation: false,
      isDayOff: true,
      slots: []
    };
  }

  // 3. Resolve day-specific shift or fallback to global hours
  const dayShifts = scheduleConfig?.dayShifts || {};
  const dayShift = dayShifts[jsDay] || {
    startTime: scheduleConfig?.startTime || '17:00',
    endTime: scheduleConfig?.endTime || '22:00'
  };

  const startTime = dayShift.startTime || scheduleConfig?.startTime || '17:00';
  const endTime = dayShift.endTime || scheduleConfig?.endTime || '22:00';
  const slotDuration = scheduleConfig?.slotDuration || 30;
  const breakTime = scheduleConfig?.breakTime || null;

  const slots = generateDynamicSlots(startTime, endTime, slotDuration, breakTime);

  return {
    isVacation: false,
    isDayOff: false,
    slots,
    startTime,
    endTime,
    workingHoursStr: `${formatTimeToArabic(startTime)} - ${formatTimeToArabic(endTime)}`
  };
}
