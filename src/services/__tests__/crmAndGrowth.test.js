import { describe, it, expect, beforeEach } from 'vitest';
import { 
  segmentPatient, 
  segmentAllPatients, 
  filterPatientsBySegment, 
  getDaysDifference, 
  calculatePatientLtv,
  LIFECYCLE_SEGMENTS,
  VALUE_TIERS
} from '../segmentationService';
import { 
  DEFAULT_CROSS_SELL_RULES, 
  getPatientCrossSellOpportunities, 
  scanAllCrossSellingOpportunities 
} from '../crossSellingService';
import { 
  REACTIVATION_STAGES, 
  generateReactivationMessage, 
  getNextDripStage 
} from '../reactivationService';
import { 
  saveBookingDraft, 
  getBookingDrafts, 
  completeBookingDraft, 
  generateLeadRecoveryWhatsAppMessage 
} from '../leadRecoveryService';
import { 
  getPatientReferralCode, 
  getPatientReferralLink, 
  recordReferral, 
  getReferralsLedger 
} from '../referralService';
import { 
  savePatientPackage, 
  getPatientPackages, 
  detectStalledPackages 
} from '../packagesService';
import { generatePostVisitFeedbackMessage } from '../feedbackService';
import { safeStorage } from '../../utils/safeStorage';

describe('Medical CRM & Retention Growth Engine Test Suite (test-guard compliant)', () => {

  describe('1. Patient Segmentation Engine', () => {
    it('accurately segments patient as VIP and Loyal based on LTV and visits count', () => {
      const patient = { id: 'p1', name: 'أحمد محمود', visitsCount: 6, lastVisit: '2026-08-15' };
      const invoices = [{ patientId: 'p1', total: 6000, paidAmount: 6000, status: 'paid' }];
      
      const segmented = segmentPatient(patient, [], invoices, [], []);
      expect(segmented.valueTier).toBe(VALUE_TIERS.VIP);
      expect(segmented.lifecycle).toBe(LIFECYCLE_SEGMENTS.LOYAL);
      expect(segmented.ltv).toBe(6000);
    });

    it('identifies dormant patients who have not visited in over 90 days', () => {
      const patient = { id: 'p2', name: 'سارة علي', visitsCount: 2, lastVisit: '2026-03-01' };
      const segmented = segmentPatient(patient, [], [], [], []);
      
      expect(segmented.lifecycle).toBe(LIFECYCLE_SEGMENTS.LOST);
      expect(segmented.daysSinceLastVisit).toBeGreaterThan(150);
    });

    it('classifies patients without any visit history as NEW, not DORMANT', () => {
      const newPatient = { id: 'p_new', name: 'مريض جديد', visitsCount: 0, lastVisit: null };
      const segmented = segmentPatient(newPatient, [], [], [], []);
      
      expect(segmented.lifecycle).toBe(LIFECYCLE_SEGMENTS.NEW);
      expect(segmented.daysSinceLastVisit).toBe(0);
    });

    it('aggregates statistics across a population of patients', () => {
      const samplePatients = [
        { id: 'p1', name: 'مريض 1', visitsCount: 1, lastVisit: '2026-08-20' },
        { id: 'p2', name: 'مريض 2', visitsCount: 5, lastVisit: '2026-08-22' },
        { id: 'p3', name: 'مريض 3', visitsCount: 2, lastVisit: '2025-12-01' }
      ];
      const result = segmentAllPatients(samplePatients, [], [], [], []);
      
      expect(result.stats.total).toBe(3);
      expect(result.stats.loyal).toBe(1);
      expect(result.stats.lost).toBe(1);
    });
  });

  describe('2. Clinically-Guided Cross-Selling Engine', () => {
    it('detects teeth whitening opportunity for dental patient who completed scaling 14 days ago', () => {
      const dentalPatient = {
        id: 'p_dent',
        name: 'كريم عصام',
        phone: '01011223344',
        serviceHistory: ['جلسة تنظيف وتلميع وإزالة جير الأسنان'],
        daysSinceLastVisit: 14
      };

      const opps = getPatientCrossSellOpportunities(dentalPatient, DEFAULT_CROSS_SELL_RULES);
      expect(opps.length).toBeGreaterThan(0);
      expect(opps[0].suggestedService).toContain('تبييض');
    });

    it('detects skin booster opportunity for derma patient who received Botox 60 days ago', () => {
      const dermaPatient = {
        id: 'p_derma',
        name: 'دينا سمير',
        phone: '01122334455',
        serviceHistory: ['حقن بوتوكس للتجاعيد التعبيرية'],
        daysSinceLastVisit: 60
      };

      const opps = getPatientCrossSellOpportunities(dermaPatient, DEFAULT_CROSS_SELL_RULES);
      expect(opps.length).toBeGreaterThan(0);
      expect(opps[0].suggestedService).toContain('سكين بوستر');
    });
  });

  describe('3. Drip Reactivation Sequence', () => {
    it('generates personalized copy for Stage 1, Stage 2 and Stage 3', () => {
      const patient = { name: 'طارق حسام', phone: '01233445566' };
      const clinic = { name: 'مركز النخبة', doctorName: 'د. أحمد الشريف' };

      const msg1 = generateReactivationMessage(REACTIVATION_STAGES.STAGE_1_CARE, patient, clinic);
      expect(msg1).toContain('طارق');
      expect(msg1).toContain('د. أحمد الشريف');

      const msg3 = generateReactivationMessage(REACTIVATION_STAGES.STAGE_3_OFFER, patient, clinic);
      expect(msg3).toContain('مجانية');
      expect(msg3).toContain('خصم خاص');

      expect(getNextDripStage(REACTIVATION_STAGES.STAGE_1_CARE)).toBe(REACTIVATION_STAGES.STAGE_2_VALUE);
    });
  });

  describe('4. Abandoned Booking & Lead Recovery', () => {
    beforeEach(() => {
      safeStorage.clear();
    });

    it('captures lead draft and recovers with WhatsApp resume link', () => {
      const draft = saveBookingDraft({
        phone: '01099887766',
        name: 'عميل حجز لم يكتمل',
        service: 'كشف عادي'
      });

      expect(draft).not.toBeNull();
      expect(draft.phone).toBe('01099887766');

      const drafts = getBookingDrafts();
      expect(drafts.length).toBe(1);

      const waMsg = generateLeadRecoveryWhatsAppMessage(draft, { name: 'مركز النخبة' });
      expect(waMsg).toContain('https://wa.me/201099887766');
      expect(decodeURIComponent(waMsg)).toContain('booking?resume=');

      completeBookingDraft('01099887766');
      const updatedDrafts = getBookingDrafts();
      expect(updatedDrafts[0].status).toBe('completed');
    });
  });

  describe('5. Referral & Reward Program', () => {
    it('generates unique referral codes and links', () => {
      const code = getPatientReferralCode('p_9921');
      expect(code).toBe('CF-REF-9921');

      const link = getPatientReferralLink('p_9921');
      expect(link).toContain('booking?ref=CF-REF-9921');

      const refEntry = recordReferral(code, 'صديق محال', '01199887744');
      expect(refEntry.referralCode).toBe(code);
      expect(refEntry.rewardAmount).toBe(100);
    });
  });

  describe('6. Packages & Multi-Session Tracking', () => {
    it('manages sessions countdown and detects stalled packages', () => {
      const savedPkg = savePatientPackage({
        id: 'pkg_test_1',
        patientId: 'p_laser',
        patientName: 'منى إبراهيم',
        packageName: 'باقة ليزر 6 جلسات',
        totalSessions: 6,
        completedSessions: 2,
        sessionIntervalDays: 28,
        lastSessionDate: '2026-05-01' // Stalled (> 60 days ago)
      });

      expect(savedPkg.remainingSessions).toBe(4);

      const stalled = detectStalledPackages([savedPkg]);
      expect(stalled.length).toBe(1);
    });
  });

  describe('7. Post-Visit Review & NPS Funnel', () => {
    it('generates 5-star Google review funnel copy', () => {
      const feedbackMsg = generatePostVisitFeedbackMessage(
        { name: 'محمد مصطفى' },
        null,
        { name: 'عيادة النخبة', googleReviewUrl: 'https://g.page/r/clinicflow/review' }
      );

      expect(feedbackMsg).toContain('محمد');
      expect(feedbackMsg).toContain('https://g.page/r/clinicflow/review');
    });
  });

});
