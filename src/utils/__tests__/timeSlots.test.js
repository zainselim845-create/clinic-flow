import { describe, it, expect } from 'vitest';
import { 
  formatTimeToArabic, 
  generateDynamicSlots, 
  getSlotsForDate,
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
    it('excludes slots that fall inside daily break time window', () => {
      const breakTime = { enabled: true, start: '18:00', end: '19:00' };
      const slots = generateDynamicSlots('17:00', '20:00', 30, breakTime);
      // Expected: 17:00, 17:30, 19:00, 19:30, 20:00 (18:00 and 18:30 skipped)
      expect(slots).toEqual(['05:00 م', '05:30 م', '07:00 م', '07:30 م', '08:00 م']);
    });
  });

  describe('getSlotsForDate with Shifts, Breaks, and Vacations', () => {
    const config = {
      workingDays: [6, 2], // Saturday (6) and Tuesday (2)
      startTime: '17:00',
      endTime: '22:00',
      slotDuration: 30,
      enableCustomDayShifts: true,
      dayShifts: {
        6: { startTime: '17:00', endTime: '22:00' }, // Saturday 5-10 PM
        2: { startTime: '13:00', endTime: '18:00' }  // Tuesday 1-6 PM
      },
      breakTime: { enabled: true, start: '15:00', end: '16:00' },
      vacations: [
        { id: 'v1', title: 'إجازة عيد الأضحى', startDate: '2026-09-20', endDate: '2026-09-25' }
      ]
    };

    it('identifies days off correctly', () => {
      // 2026-09-06 is Sunday (day 0), which is off
      const res = getSlotsForDate('2026-09-06', config);
      expect(res.isDayOff).toBe(true);
      expect(res.slots).toEqual([]);
    });

    it('identifies scheduled vacation periods and blocks booking', () => {
      // 2026-09-22 is during the vacation
      const res = getSlotsForDate('2026-09-22', config);
      expect(res.isVacation).toBe(true);
      expect(res.vacationReason).toBe('إجازة عيد الأضحى');
      expect(res.slots).toEqual([]);
    });

    it('resolves custom day-specific working hours on Tuesday (1-6 PM) with break exclusion', () => {
      // 2026-09-08 is Tuesday (day 2)
      const res = getSlotsForDate('2026-09-08', config);
      expect(res.isDayOff).toBe(false);
      expect(res.isVacation).toBe(false);
      expect(res.startTime).toBe('13:00');
      expect(res.endTime).toBe('18:00');
      // Slots should not include 15:00 and 15:30 (break time)
      expect(res.slots).toContain('01:00 م');
      expect(res.slots).toContain('02:30 م');
      expect(res.slots).not.toContain('03:00 م');
      expect(res.slots).not.toContain('03:30 م');
      expect(res.slots).toContain('04:00 م');
      expect(res.slots).toContain('06:00 م');
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
