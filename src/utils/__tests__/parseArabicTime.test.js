import { describe, it, expect } from 'vitest';
import { parseArabicTime, arabicTimeToDate } from '../parseArabicTime';

describe('parseArabicTime', () => {
  it('correctly parses PM Arabic time strings', () => {
    expect(parseArabicTime('05:00 م')).toEqual({ hours: 17, minutes: 0 });
    expect(parseArabicTime('5:30 م')).toEqual({ hours: 17, minutes: 30 });
    expect(parseArabicTime('12:00 م')).toEqual({ hours: 12, minutes: 0 });
    expect(parseArabicTime('11:45 م')).toEqual({ hours: 23, minutes: 45 });
  });

  it('correctly parses AM Arabic time strings', () => {
    expect(parseArabicTime('08:30 ص')).toEqual({ hours: 8, minutes: 30 });
    expect(parseArabicTime('10:00 ص')).toEqual({ hours: 10, minutes: 0 });
    expect(parseArabicTime('12:00 ص')).toEqual({ hours: 0, minutes: 0 });
    expect(parseArabicTime('12:30 ص')).toEqual({ hours: 0, minutes: 30 });
  });

  it('correctly parses standard 24h format', () => {
    expect(parseArabicTime('17:00')).toEqual({ hours: 17, minutes: 0 });
    expect(parseArabicTime('09:15')).toEqual({ hours: 9, minutes: 15 });
  });

  it('returns null for invalid inputs', () => {
    expect(parseArabicTime('')).toBeNull();
    expect(parseArabicTime(null)).toBeNull();
    expect(parseArabicTime('invalid')).toBeNull();
    expect(parseArabicTime('25:00')).toBeNull();
  });
});

describe('arabicTimeToDate', () => {
  it('constructs a valid Date object from Arabic time and date string', () => {
    const d = arabicTimeToDate('2026-08-31', '05:00 م');
    expect(isNaN(d.getTime())).toBe(false);
    expect(d.getHours()).toBe(17);
    expect(d.getMinutes()).toBe(0);
  });

  it('sorts Arabic times in ascending order', () => {
    const times = [
      { date: '2026-08-31', time: '09:00 م' },
      { date: '2026-08-31', time: '10:00 ص' },
      { date: '2026-08-31', time: '02:00 م' }
    ];

    const sorted = times.sort((a, b) => {
      return arabicTimeToDate(a.date, a.time) - arabicTimeToDate(b.date, b.time);
    });

    expect(sorted[0].time).toBe('10:00 ص');
    expect(sorted[1].time).toBe('02:00 م');
    expect(sorted[2].time).toBe('09:00 م');
  });
});
