import { describe, it, expect } from 'vitest';
import { checkPrescriptionSafety, DRUG_SAFETY_RULES } from '../services/drugInteractionService';
import { 
  createInitialDentalChart, calculateDentalSummary, TOOTH_SURFACES, RESTORATION_TYPES 
} from '../utils/dentalChartHelper';
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

  describe('2. Anatomical 5-Surface Dental Charting & Perio Pocket Evaluation', () => {
    it('initializes 32 standard adult FDI teeth with 5 anatomical surfaces each', () => {
      const chart = createInitialDentalChart();
      expect(Object.keys(chart).length).toBe(32);
      expect(chart[16]).toBeDefined();
      expect(chart[16].surfaces.O).toBe('sound');
      expect(chart[16].surfaces.M).toBe('sound');
      expect(chart[16].surfaces.D).toBe('sound');
      expect(chart[16].surfaces.B).toBe('sound');
      expect(chart[16].surfaces.L).toBe('sound');
    });

    it('calculates WHO DMFT score and Perio disease risk correctly', () => {
      const chart = createInitialDentalChart();

      // Tooth 16 has Occlusal Cavity
      chart[16].surfaces.O = 'cavity';
      // Tooth 24 is Missing
      chart[24].status = 'missing';
      // Tooth 36 has Composite restoration on MO surfaces
      chart[36].surfaces.M = 'composite';
      chart[36].surfaces.O = 'composite';
      // Tooth 46 has deep periodontal pocket (5mm) and BOP
      chart[46].perio.buccalPocket = 5;
      chart[46].perio.bop = true;

      const summary = calculateDentalSummary(chart);

      expect(summary.cavityCount).toBe(1);
      expect(summary.missingCount).toBe(1);
      expect(summary.filledCount).toBe(1);
      expect(summary.dmftScore).toBe(3); // 1 Decayed + 1 Missing + 1 Filled
      expect(summary.perioRiskCount).toBe(1); // Tooth 46 with 5mm pocket
    });
  });

  describe('3. Immutable Healthcare Audit Trail Logger', () => {
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
