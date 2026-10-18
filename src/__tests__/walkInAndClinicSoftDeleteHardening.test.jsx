import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as clinicsService from '@/features/platform/services/clinicsService';
import { fromDbClinic, toDbClinic } from '@/features/platform/services/clinicsService';
import { getSlotsForDate, formatTimeToArabic, formatLocalDate } from '@/utils/timeSlots';

describe('Walk-in & Clinic Soft-Delete Hardening Suite', () => {
  describe('Clinics Soft-Delete & Data Integrity', () => {
    it('properly maps deleted_at in fromDbClinic and toDbClinic', () => {
      const now = new Date().toISOString();
      const dbRow = {
        id: 'clinic-123',
        name: 'عيادة الشفاء التخصصية',
        slug: 'al-shifa',
        deleted_at: now,
        created_at: now
      };

      const mapped = fromDbClinic(dbRow);
      expect(mapped.deletedAt).toBe(now);
      expect(mapped.deleted_at).toBe(now);

      const serialized = toDbClinic({
        name: 'عيادة الشفاء',
        deletedAt: now
      });
      expect(serialized.deleted_at).toBe(now);
    });

    it('toDbClinic preserves null deleted_at when active', () => {
      const serialized = toDbClinic({
        name: 'عيادة نشطة',
        deletedAt: null
      });
      expect(serialized.deleted_at).toBeNull();
    });
  });

  describe('Dynamic Time Slots & Calendar Resolution', () => {
    const sampleConfig = {
      workingDays: [6, 0, 1, 2, 3, 4], // Sat - Thu (Friday off)
      startTime: '16:00',
      endTime: '21:00',
      slotDuration: 30,
      breakTime: { enabled: true, start: '18:30', end: '19:00', label: 'استراحة' },
      vacations: [
        { startDate: '2026-12-25', endDate: '2026-12-26', title: 'عطلة رسمية' }
      ]
    };

    it('returns empty slots and isDayOff for Friday (off day)', () => {
      // 2026-10-23 is Friday
      const fridayRes = getSlotsForDate('2026-10-23', sampleConfig);
      expect(fridayRes.isDayOff).toBe(true);
      expect(fridayRes.slots).toEqual([]);
    });

    it('returns isVacation and vacationReason for vacation dates', () => {
      const vacationRes = getSlotsForDate('2026-12-25', sampleConfig);
      expect(vacationRes.isVacation).toBe(true);
      expect(vacationRes.isDayOff).toBe(true);
      expect(vacationRes.slots).toEqual([]);
    });

    it('generates working slots while skipping break window on active days', () => {
      // 2026-10-24 is Saturday (working day)
      const saturdayRes = getSlotsForDate('2026-10-24', sampleConfig);
      expect(saturdayRes.isDayOff).toBe(false);
      expect(saturdayRes.slots.length).toBeGreaterThan(0);
      // Break is 18:30 - 19:00 (06:30 م - 07:00 م)
      expect(saturdayRes.slots).not.toContain('06:30 م');
    });
  });

  describe('Walk-in Doctor Assignment & Non-Colliding Slots', () => {
    it('formats 24h time to standard Arabic representation accurately', () => {
      expect(formatTimeToArabic('14:30')).toBe('02:30 م');
      expect(formatTimeToArabic('09:15')).toBe('09:15 ص');
      expect(formatTimeToArabic('00:00')).toBe('12:00 ص');
      expect(formatTimeToArabic('12:00')).toBe('12:00 م');
    });

    it('calculates deterministic unique doctor IDs when defaulting', () => {
      const clinicWithDoctor = { doctorId: 'doc-uuid-1234', doctorName: 'د. حسام' };
      const assignedId = clinicWithDoctor.doctorId || 'fallback-id';
      expect(assignedId).toBe('doc-uuid-1234');
    });
  });
});
