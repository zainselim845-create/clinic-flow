import { describe, it, expect } from 'vitest';
import { 
  formatTimeToArabic, 
  generateDynamicSlots, 
  formatLocalDate, 
  parseLocalDate, 
  getTodayDateStr 
} from '../timeSlots';

describe('timeSlots Utility', () => {
  describe('formatTimeToArabic', () => {
    it.each([
      ['17:00', '05:00 م'],
      ['17:30', '05:30 م'],
      ['09:00', '09:00 ص'],
      ['12:00', '12:00 م'],
      ['00:00', '12:00 ص'],
      ['22:45', '10:45 م']
    ])('formats 24h time "%s" to Arabic 12h format "%s"', (input24, expectedArabic) => {
      expect(formatTimeToArabic(input24)).toBe(expectedArabic);
    });

    it('returns empty string when given empty or invalid input', () => {
      expect(formatTimeToArabic('')).toBe('');
      expect(formatTimeToArabic(null)).toBe('');
    });
  });

  describe('generateDynamicSlots', () => {
    it.each([
      ['17:00', '19:00', 30, ['05:00 م', '05:30 م', '06:00 م', '06:30 م', '07:00 م']],
      ['10:00', '11:00', 15, ['10:00 ص', '10:15 ص', '10:30 ص', '10:45 ص', '11:00 ص']],
      ['18:00', '18:00', 30, ['06:00 م']]
    ])('generates dynamic slots from %s to %s with step %i min', (start, end, step, expected) => {
      expect(generateDynamicSlots(start, end, step)).toEqual(expected);
    });
  });

  describe('Timezone-Safe Date Helpers', () => {
    it('formats local year, month, day to YYYY-MM-DD string without UTC shift', () => {
      // Month 7 is August (0-indexed)
      expect(formatLocalDate(2026, 7, 29)).toBe('2026-08-29');
      expect(formatLocalDate(2026, 7, 1)).toBe('2026-08-01');
      expect(formatLocalDate(2026, 11, 31)).toBe('2026-12-31');
    });

    it('formats Date object to YYYY-MM-DD using local calendar date', () => {
      const d = new Date(2026, 7, 29);
      expect(formatLocalDate(d)).toBe('2026-08-29');
    });

    it('parses YYYY-MM-DD into local Date object', () => {
      const d = parseLocalDate('2026-08-29');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(7);
      expect(d.getDate()).toBe(29);
    });

    it('returns valid today local date string', () => {
      const today = getTodayDateStr();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
