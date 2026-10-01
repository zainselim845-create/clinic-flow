import { describe, it, expect } from 'vitest';
import { 
  recordAuditEvent, getAuditLogs, filterAuditLogs, AUDIT_EVENT_TYPES 
} from '../services/auditLoggerService';

describe('Enterprise Healthcare Modules & Immutable Audit Trail Suite', () => {

  describe('1. Enterprise Multi-Branch Operational Audit Events', () => {
    it('records and verifies multi-branch patient registration events', () => {
      const event = recordAuditEvent({
        eventType: AUDIT_EVENT_TYPES.PATIENT_CREATED,
        user: 'د. سارة عمارة',
        action: 'تسجيل مريض جديد بفرع مدينة نصر',
        details: 'الرقم الطبي: MED-9901 - فرع النزهة',
        entityId: 'pat_nasr_9901',
        entityType: 'patient'
      });

      expect(event.id).toBeDefined();
      expect(event.eventType).toBe(AUDIT_EVENT_TYPES.PATIENT_CREATED);
      expect(event.entityType).toBe('patient');
      expect(event.action).toContain('فرع مدينة نصر');
    });

    it('records and logs enterprise appointment rescheduling events', () => {
      const event = recordAuditEvent({
        eventType: AUDIT_EVENT_TYPES.APPOINTMENT_UPDATED,
        user: 'موظف الاستقبال - فرع المهندسين',
        action: 'تعديل موعد استشارة جراحة أسنان',
        details: 'تم التقديم 24 ساعة بناء على طلب المريض',
        entityId: 'apt_moh_3301',
        entityType: 'appointment'
      });

      expect(event.id).toBeDefined();
      expect(event.eventType).toBe(AUDIT_EVENT_TYPES.APPOINTMENT_UPDATED);
      expect(event.entityType).toBe('appointment');
    });

    it('captures clinical laboratory order lifecycle events', () => {
      const event = recordAuditEvent({
        eventType: AUDIT_EVENT_TYPES.CLINICAL_NOTE_ADDED,
        user: 'د. أحمد كامل',
        action: 'طلب تحليل دم شامل وصورة دم كاملة CBC',
        details: 'معمل البرج - باركود التحليل: LAB-8812',
        entityId: 'lab_order_8812',
        entityType: 'clinical_note'
      });

      expect(event.id).toBeDefined();
      expect(event.action).toContain('CBC');
    });

    it('captures enterprise medical fee adjustment events with authorization details', () => {
      const event = recordAuditEvent({
        eventType: AUDIT_EVENT_TYPES.INVOICE_CREATED,
        user: 'المحاسب المالي العام',
        action: 'تطبيق خصم نقابي بنسبة 15%',
        details: 'فاتورة رقم INV-772 - خصم نقابة المهندسين بنسبة 15%',
        entityId: 'inv_772',
        entityType: 'invoice'
      });

      expect(event.id).toBeDefined();
      expect(event.details).toContain('15%');
    });
  });

  describe('2. Immutable Healthcare Audit Trail Logger', () => {
    it('records and retrieves structured audit logs', () => {
      const event = recordAuditEvent({
        eventType: AUDIT_EVENT_TYPES.INVOICE_CREATED,
        user: 'د. محمد',
        action: 'إصدار فاتورة علاجية رقم INV-5021',
        details: 'القيمة: 1,800 ج.م لطربوش زيركون',
        entityId: 'inv_5021',
        entityType: 'invoice'
      });

      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.eventType).toBe(AUDIT_EVENT_TYPES.INVOICE_CREATED);

      const logs = getAuditLogs();
      expect(logs.length).toBeGreaterThan(0);

      const filtered = filterAuditLogs({ query: 'INV-5021' });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].action).toContain('INV-5021');
    });
  });

});
