import { format, formatDistanceToNow, parseISO, isValid, differenceInMinutes, differenceInHours, differenceInDays, startOfDay, endOfDay, addDays, subDays, isToday, isTomorrow, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * Format a date string or Date object to Arabic-localized display format.
 * @param {string|Date} date - ISO string or Date
 * @param {string} formatStr - date-fns format string (default: 'yyyy-MM-dd')
 * @returns {string}
 */
export function formatDate(date, formatStr = 'yyyy-MM-dd') {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '';
  return format(parsed, formatStr, { locale: ar });
}

/**
 * Get relative time (e.g., "منذ 3 ساعات")
 */
export function timeAgo(date) {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '';
  return formatDistanceToNow(parsed, { addSuffix: true, locale: ar });
}

/**
 * Format time from ISO string to HH:mm
 */
export function formatTime(date) {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '';
  return format(parsed, 'HH:mm');
}

/**
 * Get Arabic day name
 */
export function getArabicDayName(date) {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '';
  return format(parsed, 'EEEE', { locale: ar });
}

/**
 * Check if a date string represents today
 */
export function isDateToday(date) {
  if (!date) return false;
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsed) && isToday(parsed);
}

// Re-export commonly used date-fns functions for direct use
export {
  parseISO, isValid, differenceInMinutes, differenceInHours, differenceInDays,
  startOfDay, endOfDay, addDays, subDays, isToday, isTomorrow, isYesterday,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, format
};
