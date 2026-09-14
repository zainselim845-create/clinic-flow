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

    it('detects booking intent and prepares appointment payload', () => {
      const stateWithPatients = {
        ...mockState,
        patients: [{ id: 'p1', name: 'محمد علي', phone: '01011223344', allergies: 'بنسلين', balance: 0 }]
      };
      const res = processDoctorIntent('احجز لمحمد علي موعد بكرة الساعة 06:00 م كشف عادي', stateWithPatients);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('BOOK_APPOINTMENT');
      expect(res.payload.patientName).toBe('محمد علي');
      expect(res.payload.phone).toBe('01011223344');
      expect(res.payload.time).toBe('06:00 م');
      expect(res.payload.type).toBe('كشف عادي');
      expect(res.replyText).toContain('تم حجز الموعد بنجاح');
    });

    it('detects patient dossier query and retrieves patient details', () => {
      const stateWithPatients = {
        ...mockState,
        patients: [{ id: 'p1', name: 'سارة أحمد', phone: '01234567890', allergies: 'لا يوجد', chronicDiseases: 'سكر', balance: 150 }]
      };
      const res = processDoctorIntent('شوفلي ملف المريض سارة أحمد', stateWithPatients);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('SHOW_PATIENT');
      expect(res.payload.name).toBe('سارة أحمد');
      expect(res.replyText).toContain('الملف الطبي للمريض: سارة أحمد');
      expect(res.replyText).toContain('150 ج.م');
    });

    it('detects inventory low stock query and warns about items under minQuantity', () => {
      const stateWithInventory = {
        ...mockState,
        inventory: [
          { id: 'i1', name: 'بنج أسنان', quantity: 2, minQuantity: 10, unit: 'أمبول' },
          { id: 'i2', name: 'قفازات طبية', quantity: 50, minQuantity: 20, unit: 'علبة' }
        ]
      };
      const res = processDoctorIntent('ايه الأدوية الناقصة في المخزن؟', stateWithInventory);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('INFO');
      expect(res.replyText).toContain('بنج أسنان');
      expect(res.replyText).toContain('تنبيه نواقص المخزن الطبي');
    });

    it('detects debtors and financial inquiry', () => {
      const stateWithDebts = {
        ...mockState,
        patients: [
          { id: 'p1', name: 'محمود خالد', phone: '01099887766', balance: 400 },
          { id: 'p2', name: 'منى السيد', phone: '01122334455', balance: 0 }
        ]
      };
      const res = processDoctorIntent('مين عليه فلوس في العيادة؟', stateWithDebts);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('INFO');
      expect(res.replyText).toContain('تقرير المديونيات المعلقة');
      expect(res.replyText).toContain('محمود خالد');
      expect(res.replyText).toContain('400 ج.م');
    });

    it('detects in-app navigation intent to inventory and settings', () => {
      const resInv = processDoctorIntent('وديني للمخزن', mockState);
      expect(resInv.isAction).toBe(true);
      expect(resInv.actionType).toBe('NAVIGATE');
      expect(resInv.payload.path).toBe('/inventory');

      const resSet = processDoctorIntent('افتح شاشة الإعدادات', mockState);
      expect(resSet.isAction).toBe(true);
      expect(resSet.actionType).toBe('NAVIGATE');
      expect(resSet.payload.path).toBe('/settings');
    });

    it('detects 1-click WhatsApp messaging intent', () => {
      const stateWithPatients = {
        ...mockState,
        patients: [{ id: 'p1', name: 'كريم حسن', phone: '01012345678' }]
      };
      const res = processDoctorIntent('ابعت واتساب لكريم حسن', stateWithPatients);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('SEND_WHATSAPP');
      expect(res.payload.phone).toBe('01012345678');
      expect(res.payload.url).toContain('https://wa.me/201012345678');
    });

    it('handles optional labs query gracefully', () => {
      const stateWithLabs = {
        ...mockState,
        labs: []
      };
      const res = processDoctorIntent('ايه التحاليل المعلقة؟', stateWithLabs);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('INFO');
      expect(res.replyText).toContain('لا توجد أي تحاليل');
    });

    it('returns isAction: false for general conversation', () => {
      const res = processDoctorIntent('ازيك يا مساعد', mockState);
      expect(res.isAction).toBe(false);
    });
  });

});

