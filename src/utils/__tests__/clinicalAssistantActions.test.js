import { describe, it, expect } from 'vitest';
import { resolveDateFromText, resolveTimeFromText, processDoctorIntent } from '../clinicalAssistantActions';
import { getTodayDateStr } from '../timeSlots';

describe('Clinical Assistant Actions & NLP Intent Processing', () => {

  describe('resolveDateFromText', () => {
    it('extracts explicit YYYY-MM-DD date', () => {
      expect(resolveDateFromText('اقفل يوم 2026-08-30 علشان مسافر')).toBe('2026-08-30');
    });

    it('extracts DD/MM formats like 30/8 and 30 /8', () => {
      const year = new Date().getFullYear();
      expect(resolveDateFromText('وكمان انا شغال وم 30 /8')).toBe(`${year}-08-30`);
      expect(resolveDateFromText('انا شغال يوم 30/8')).toBe(`${year}-08-30`);
      expect(resolveDateFromText('افتح 31-8')).toBe(`${year}-08-31`);
    });

    it('extracts Arabic month name like 30 اغسطس', () => {
      const year = new Date().getFullYear();
      expect(resolveDateFromText('افتح يوم 30 اغسطس')).toBe(`${year}-08-30`);
      expect(resolveDateFromText('اقفل 15 مايو')).toBe(`${year}-05-15`);
    });

    it('extracts relative "النهاردة" as today', () => {
      expect(resolveDateFromText('اقفل النهاردة')).toBe(getTodayDateStr());
    });

    it('extracts relative "بكرة" as tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expected = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      expect(resolveDateFromText('اقفل بكرة')).toBe(expected);
    });

    it('extracts day of week like "الأحد"', () => {
      const resolved = resolveDateFromText('عايز اقفل يوم الأحد الجاي');
      expect(resolved).toMatch(/^202[4-9]-\d{2}-\d{2}$/);
    });
  });

  describe('resolveTimeFromText', () => {
    it('extracts formatted 12h Arabic slot', () => {
      expect(resolveTimeFromText('احظر موعد 08:00 م يوم 2026-08-30')).toBe('08:00 م');
      expect(resolveTimeFromText('اقفل الساعة 05:30 م')).toBe('05:30 م');
    });
  });

  describe('processDoctorIntent', () => {
    const mockState = {
      blockedSlots: [
        { date: '2026-08-31', time: 'FULL_DAY', isFullDay: true, reason: 'إجازة الطبيب' },
        { date: '2026-08-28', time: '08:00 م', reason: 'مغلق' }
      ],
      appointments: [
        { id: '1', date: getTodayDateStr(), status: 'completed', fee: '300 ج.م' },
        { id: '2', date: getTodayDateStr(), status: 'waiting', fee: '300 ج.م' }
      ]
    };

    const currentYear = new Date().getFullYear();
    it.each([
      ['وكمان انا شغال وم 30 /8', `${currentYear}-08-30`],
      ['مش اجازة يوم 31/8', `${currentYear}-08-31`],
      ['افتح يوم 2026-08-31 تاني', '2026-08-31'],
      ['الغي الاجازة يوم 2026-09-01', '2026-09-01']
    ])('detects UNBLOCK_FULL_DAY intent for phrase "%s" resolving to date %s', (phrase, expectedDate) => {
      const res = processDoctorIntent(phrase, mockState);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('UNBLOCK_FULL_DAY');
      expect(res.payload.date).toBe(expectedDate);
    });

    it('detects BLOCK_FULL_DAY intent and returns action payload', () => {
      const res = processDoctorIntent('اقفل يوم 2026-08-30', mockState);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('BLOCK_FULL_DAY');
      expect(res.payload.date).toBe('2026-08-30');
      expect(res.replyText).toContain('تم تنفيذ طلبك وإغلاق اليوم بالكامل');
    });

    it('detects query for blocked days and formats list', () => {
      const res = processDoctorIntent('ايه الايام المقفولة في العيادة؟', mockState);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('INFO');
      expect(res.replyText).toContain('2026-08-31');
      expect(res.replyText).toContain('08:00 م');
    });

    it('detects daily summary query and calculates stats', () => {
      const res = processDoctorIntent('ملخص اليوم', mockState);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('INFO');
      expect(res.replyText).toContain('ملخص أداء العيادة لليوم');
      expect(res.replyText).toContain('300 ج.م');
    });

    it('returns isAction: false for general conversation', () => {
      const res = processDoctorIntent('ازيك يا مساعد', mockState);
      expect(res.isAction).toBe(false);
    });
  });

});
