import { describe, it, expect } from 'vitest';
import { checkPrescriptionSafety } from '../services/drugInteractionService';
import { 
  recordAuditEvent, getAuditLogs, filterAuditLogs, AUDIT_EVENT_TYPES 
} from '../services/auditLoggerService';

describe('Enterprise Healthcare Modules & Clinical Decision Support Suite', () => {

  describe('1. Clinical Decision Support (CDS) Drug & Allergy Safety Engine', () => {
    it('flags critical penicillin allergy when prescribing Augmentin / Amoxicillin', () => {
      const patient = {
        name: 'كريم محمود',
        allergies: 'حساسية شديدة من البنسلين ومشتقاته',
        chronicDiseases: ''
      };

      const warnings = checkPrescriptionSafety('Augmentin 1gm قرص كل 12 ساعة بعد الأكل', patient);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].id).toBe('penicillin_allergy');
      expect(warnings[0].severity).toBe('danger');
      expect(warnings[0].recommendation).toContain('Dalacin C');
    });

    it('warns when prescribing NSAIDs (Cataflam/Brufen) to patient with Peptic Ulcer', () => {
      const patient = {
        name: 'منى الشاذلي',
        allergies: '',
        chronicDiseases: 'قرحة معدة مزمنة وارتجاع مريء'
      };

      const warnings = checkPrescriptionSafety('كتافلام 50مجم مسكن للألم عند اللزوم', patient);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].id).toBe('nsaids_peptic_ulcer');
      expect(warnings[0].severity).toBe('warning');
      expect(warnings[0].recommendation).toContain('Panadol');
    });

    it('warns against Epinephrine local anesthetic in uncontrolled hypertension', () => {
      const patient = {
        name: 'صلاح الدين',
        allergies: '',
        chronicDiseases: 'ضغط دم غير منضبط ومشاكل قلبية'
      };

      const warnings = checkPrescriptionSafety('بنج اسنان موضعي مع ادرينالين', patient);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].id).toBe('local_anesthetic_epinephrine_hypertension');
      expect(warnings[0].severity).toBe('danger');
      expect(warnings[0].recommendation).toContain('Mepivacaine');
    });

    it('returns empty warnings when prescription has no contraindicated drugs', () => {
      const patient = {
        name: 'أحمد سالم',
        allergies: 'حساسية بنسلين',
        chronicDiseases: ''
      };

      const warnings = checkPrescriptionSafety('Panadol Extra 500mg قرصين عند الصداع', patient);
      expect(warnings.length).toBe(0);
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
