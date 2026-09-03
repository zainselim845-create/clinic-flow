/**
 * Parses Arabic-formatted time strings like '05:00 م' or '08:30 ص' into 24-hour { hours, minutes }.
 * Also handles plain 24h formats like '17:00' and '5:30'.
 * Returns { hours: number, minutes: number } or null if unparseable.
 */
export function parseArabicTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const cleaned = timeStr.trim();

  // Detect AM/PM Arabic markers
  const isPM = cleaned.includes('م');
  const isAM = cleaned.includes('ص');

  // Strip Arabic AM/PM markers and any trailing whitespace
  const numericPart = cleaned.replace(/[مص]/g, '').trim();

  // Extract hours and minutes from the numeric part
  const match = numericPart.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isNaN(hours) || isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  // Convert 12-hour to 24-hour
  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

/**
 * Converts an Arabic time string and a date string into a Date object.
 * Returns Invalid Date if parsing fails.
 */
export function arabicTimeToDate(dateStr, timeStr) {
  const parsed = parseArabicTime(timeStr);
  if (!parsed) return new Date(NaN);

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return new Date(NaN);

  date.setHours(parsed.hours, parsed.minutes, 0, 0);
  return date;
}
