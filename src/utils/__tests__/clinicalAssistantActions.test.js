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

    it('detects CANCEL_APPOINTMENT intent and resolves matching appointment', () => {
      const stateWithAppts = {
        ...mockState,
        patients: [{ id: 'p-1', name: 'أحمد سعيد', phone: '01012345678' }],
        appointments: [
          { id: 'appt-10', patientId: 'p-1', patientName: 'أحمد سعيد', date: '2026-08-30', time: '07:00 م', status: 'confirmed' }
        ]
      };
      const res = processDoctorIntent('الغي كشف أحمد سعيد', stateWithAppts);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('CANCEL_APPOINTMENT');
      expect(res.payload.id).toBe('appt-10');
      expect(res.payload.patientName).toBe('أحمد سعيد');
      expect(res.replyText).toContain('تم إلغاء الموعد للمريض');
    });

    it('detects RESCHEDULE_APPOINTMENT intent with new date and time', () => {
      const stateWithAppts = {
        ...mockState,
        patients: [{ id: 'p-1', name: 'طارق علي', phone: '01122334455' }],
        appointments: [
          { id: 'appt-20', patientId: 'p-1', patientName: 'طارق علي', date: '2026-08-30', time: '05:00 م', status: 'confirmed' }
        ]
      };
      const res = processDoctorIntent('أجل كشف طارق علي لبكرة الساعة 08:00 م', stateWithAppts);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('RESCHEDULE_APPOINTMENT');
      expect(res.payload.id).toBe('appt-20');
      expect(res.payload.time).toBe('08:00 م');
      expect(res.replyText).toContain('تم تعديل وتأجيل موعد المريض');
    });

    it('detects UPDATE_APPOINTMENT_STATUS for workflow transitions: in_progress, pending_payment, completed', () => {
      const today = getTodayDateStr();
      const stateWithAppts = {
        ...mockState,
        patients: [{ id: 'p-1', name: 'سيف الدين', phone: '01234567890' }],
        appointments: [
          { id: 'appt-30', patientId: 'p-1', patientName: 'سيف الدين', date: today, time: '06:00 م', status: 'waiting' }
        ]
      };

      // 1. in_progress
      const resStart = processDoctorIntent('دخل سيف الدين غرفة الكشف', stateWithAppts);
      expect(resStart.isAction).toBe(true);
      expect(resStart.actionType).toBe('UPDATE_APPOINTMENT_STATUS');
      expect(resStart.payload.status).toBe('in_progress');

      // 2. pending_payment
      const resFinish = processDoctorIntent('خلصت كشف سيف الدين وحول للمحاسبة', stateWithAppts);
      expect(resFinish.isAction).toBe(true);
      expect(resFinish.actionType).toBe('UPDATE_APPOINTMENT_STATUS');
      expect(resFinish.payload.status).toBe('pending_payment');

      // 3. completed
      const resComplete = processDoctorIntent('تم تحصيل كشف سيف الدين وأتم الزيارة', stateWithAppts);
      expect(resComplete.isAction).toBe(true);
      expect(resComplete.actionType).toBe('UPDATE_APPOINTMENT_STATUS');
      expect(resComplete.payload.status).toBe('completed');
    });

    it('detects ADD_PATIENT intent with demographics and allergies', () => {
      const res = processDoctorIntent('سجل مريض جديد اسمه حسام البدري تليفونه 01098765432 عمره 42 ذكر حساسية بنسلين وعنده سكر', mockState);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('ADD_PATIENT');
      expect(res.payload.name).toBe('حسام البدري');
      expect(res.payload.phone).toBe('01098765432');
      expect(res.payload.age).toBe('42');
      expect(res.payload.gender).toBe('ذكر');
      expect(res.payload.allergies).toBe('بنسلين');
      expect(res.payload.chronicDiseases).toBe('سكر');
      expect(res.replyText).toContain('تم تسجيل المريض الجديد (حسام البدري)');
    });

    it('detects UPDATE_PATIENT intent to update allergies, phone, diagnosis', () => {
      const stateWithPatients = {
        ...mockState,
        patients: [{ id: 'p-99', name: 'ياسر جلال', phone: '01011112222', allergies: 'لا يوجد' }]
      };
      const res = processDoctorIntent('سجل حساسية أسبرين للمريض ياسر جلال', stateWithPatients);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('UPDATE_PATIENT');
      expect(res.payload.id).toBe('p-99');
      expect(res.payload.allergies).toBe('أسبرين');
      expect(res.replyText).toContain('تم تحديث الملف الطبي للمريض (ياسر جلال)');
    });

    it('detects ADD_EXPENSE intent with category and amount', () => {
      const res = processDoctorIntent('سجل مصروف 450 جنيه مستلزمات طبية للعيادة', mockState);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('ADD_EXPENSE');
      expect(res.payload.amount).toBe(450);
      expect(res.payload.category).toBe('مستلزمات طبية');
      expect(res.replyText).toContain('تم تسجيل المصروف بقيمة 450 ج.م');
    });

    it('detects RECORD_PAYMENT intent and returns payment payload', () => {
      const stateWithPatients = {
        ...mockState,
        patients: [{ id: 'p-1', name: 'عمرو دياب', phone: '01012345678' }]
      };
      const res = processDoctorIntent('حصلت 300 جنيه من عمرو دياب كشف', stateWithPatients);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('RECORD_PAYMENT');
      expect(res.payload.amount).toBe(300);
      expect(res.payload.patientName).toBe('عمرو دياب');
      expect(res.replyText).toContain('تم تسجيل تحصيل مبلغ 300 ج.م');
    });

    it('detects treasury and live cash flow calculation query', () => {
      const today = getTodayDateStr();
      const stateWithCash = {
        ...mockState,
        appointments: [
          { id: '1', date: today, status: 'completed', fee: '400 ج.م' },
          { id: '2', date: today, status: 'completed', fee: '300 ج.م' }
        ],
        expenses: [
          { id: 'e1', date: today, amount: 200, category: 'نثريات' }
        ]
      };
      const res = processDoctorIntent('رصيد الخزنة وصافي الدخل كام النهاردة؟', stateWithCash);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('INFO');
      expect(res.replyText).toContain('تقرير حركة الخزنة لليوم');
      expect(res.replyText).toContain('700 ج.م');
      expect(res.replyText).toContain('200 ج.م');
      expect(res.replyText).toContain('+500 ج.م');
    });

    it('detects UPDATE_CLINIC_FEE and ADD_SERVICE intents', () => {
      const resFee = processDoctorIntent('خلي سعر الكشف 400 جنيه', mockState);
      expect(resFee.isAction).toBe(true);
      expect(resFee.actionType).toBe('UPDATE_CLINIC_FEE');
      expect(resFee.payload.price).toBe(400);

      const resSrv = processDoctorIntent('ضيف خدمة جديدة جلسة ليزر بسعر 800 جنيه', mockState);
      expect(resSrv.isAction).toBe(true);
      expect(resSrv.actionType).toBe('ADD_SERVICE');
      expect(resSrv.payload.name).toBe('جلسة ليزر');
      expect(resSrv.payload.priceNumber).toBe(800);
    });

    it('detects staff on duty roster check', () => {
      const stateWithStaff = {
        ...mockState,
        staffMembers: [
          { id: 's1', name: 'مروة السعيد', role: 'تمريض', status: 'active', phone: '01012345678' }
        ]
      };
      const res = processDoctorIntent('مين شغال النهاردة من التمريض؟', stateWithStaff);
      expect(res.isAction).toBe(true);
      expect(res.actionType).toBe('INFO');
      expect(res.replyText).toContain('مروة السعيد');
      expect(res.replyText).toContain('تمريض');
    });

    it('returns isAction: false for general conversation', () => {
      const res = processDoctorIntent('ازيك يا مساعد', mockState);
      expect(res.isAction).toBe(false);
    });
  });

});

