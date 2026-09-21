import { describe, it, expect } from 'vitest';
import {
  calculateBmi,
  calculatePediatricPercentile,
  assessIntraocularPressure,
  calculateGestationalAge,
  calculateHadlockEfw,
  calculateCaliperDistance,
  DICOM_WINDOW_PRESETS,
  SAMPLE_DICOM_STUDIES,
  VACCINATION_SCHEDULE,
  getPatientSpecialtyData,
  savePatientSpecialtyData
} from '../services/specialtyClinicalService';
import { detectClinicLocation, EGYPT_GOVERNORATES, GULF_EXPANSION_REGIONS } from '../pages/superadmin/components/SaasGeographicAnalytics';

describe('Specialty Clinical Modules & Open Source Engines', () => {
  describe('Pediatric Growth Standards (WHO)', () => {
    it('calculates BMI correctly and rounds to 1 decimal place', () => {
      // 10 kg, 75 cm -> 10 / (0.75 * 0.75) = 17.77... -> 17.8
      expect(calculateBmi(10, 75)).toBe(17.8);
      expect(calculateBmi(0, 75)).toBe(0);
      expect(calculateBmi(10, 0)).toBe(0);
    });

    it('accurately assesses pediatric weight percentiles and clinical status', () => {
      // Normal weight for boy at 12 months (median is around 9.6 kg)
      const normalBoy = calculatePediatricPercentile(9.6, 12, 'boys', 'weightForAge');
      expect(normalBoy.percentile).toBe('P15 - P85');
      expect(normalBoy.status).toContain('نمو مثالي');
      expect(normalBoy.severity).toBe('normal');

      // Severely underweight boy at 12 months (< 7.8 kg is < P3)
      const lowBoy = calculatePediatricPercentile(6.5, 12, 'boys', 'weightForAge');
      expect(lowBoy.percentile).toBe('< P3');
      expect(lowBoy.severity).toBe('danger');

      // Overweight girl at 24 months (> P97)
      const highGirl = calculatePediatricPercentile(16.5, 24, 'girls', 'weightForAge');
      expect(highGirl.percentile).toBe('> P97');
      expect(highGirl.severity).toBe('danger');
    });

    it('contains comprehensive Egyptian/Arab vaccination schedule', () => {
      expect(VACCINATION_SCHEDULE.length).toBeGreaterThanOrEqual(9);
      const birthVac = VACCINATION_SCHEDULE.find(v => v.id === 'v-birth');
      expect(birthVac).toBeDefined();
      expect(birthVac.mandatory).toBe(true);
    });
  });

  describe('Ophthalmology & Optometry Clinical Calculations', () => {
    it('assesses Intraocular Pressure (IOP) with glaucoma alerts', () => {
      // Normal IOP (10-21 mmHg)
      const normalIop = assessIntraocularPressure(16);
      expect(normalIop.severity).toBe('normal');
      expect(normalIop.alert).toBe(false);

      // Borderline IOP (22-25 mmHg)
      const borderlineIop = assessIntraocularPressure(23);
      expect(borderlineIop.severity).toBe('borderline');
      expect(borderlineIop.alert).toBe(false);

      // High IOP (> 25 mmHg) -> Glaucoma alert
      const highIop = assessIntraocularPressure(28);
      expect(highIop.severity).toBe('high');
      expect(highIop.alert).toBe(true);
      expect(highIop.status).toContain('اشتباه جلوكوما');
    });
  });

  describe('OB/GYN Gestational Age & Hadlock Biometry', () => {
    it('calculates gestational age and EDD using Naegeles rule', () => {
      // Set LMP to 70 days ago (10 weeks)
      const today = new Date();
      const lmpDate = new Date(today.getTime() - 70 * 24 * 60 * 60 * 1000);
      const lmpStr = lmpDate.toISOString().split('T')[0];

      const res = calculateGestationalAge(lmpStr);
      expect(res.weeks).toBe(10);
      expect(res.days).toBe(0);
      expect(res.trimester).toBe(1);
      expect(res.trimesterText).toContain('الثلث الأول');
      expect(res.edd).toBeDefined();
      expect(res.daysRemaining).toBe(210);
    });

    it('calculates Estimated Fetal Weight using Hadlocks 4-parameter formula', () => {
      // Standard fetal biometry at ~20 weeks: BPD=50, HC=180, AC=160, FL=35
      const efw = calculateHadlockEfw(50, 180, 160, 35);
      expect(efw.grams).toBeGreaterThan(300);
      expect(efw.grams).toBeLessThan(500);
      expect(efw.kg).toBeGreaterThan(0.3);
    });
  });

  describe('DICOM Medical Imaging & Caliper Measurements', () => {
    it('calculates caliper distance with mm calibration', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 200, y: 100 };
      // Euclidean dist = 100px. With 0.5 mm/px -> 50.0 mm
      const res = calculateCaliperDistance(p1, p2, 0.5);
      expect(res.mm).toBe('50.0');
      expect(res.cm).toBe('5.00');
      expect(res.pixels).toBe(100);
    });

    it('provides standard radiological windowing presets', () => {
      expect(DICOM_WINDOW_PRESETS.bone).toBeDefined();
      expect(DICOM_WINDOW_PRESETS.bone.wc).toBe(300);
      expect(DICOM_WINDOW_PRESETS.bone.ww).toBe(1500);

      expect(DICOM_WINDOW_PRESETS.lung).toBeDefined();
      expect(DICOM_WINDOW_PRESETS.lung.wc).toBe(-600);

      expect(SAMPLE_DICOM_STUDIES.length).toBeGreaterThanOrEqual(3);
    });

    it('ensures tenant-isolated patient specialty persistence', () => {
      const pId = 'test-pat-123';
      const cId = 'test-clinic-456';
      const testData = { refraction: { od: '-2.00', os: '-2.50' } };

      savePatientSpecialtyData(pId, cId, 'ophthalmology', testData);
      const retrieved = getPatientSpecialtyData(pId, cId, 'ophthalmology');
      expect(retrieved.refraction).toEqual(testData.refraction);

      // Verify cross-tenant isolation
      const otherTenant = getPatientSpecialtyData(pId, 'other-clinic', 'ophthalmology');
      expect(otherTenant).toBeNull();
    });
  });

  describe('OpenStreetMap & Geographic Analytics Integration', () => {
    it('includes GPS latitude and longitude for all Egyptian governorates', () => {
      EGYPT_GOVERNORATES.forEach(gov => {
        expect(gov.lat).toBeDefined();
        expect(gov.lng).toBeDefined();
        expect(typeof gov.lat).toBe('number');
        expect(typeof gov.lng).toBe('number');
      });
    });

    it('includes GPS latitude and longitude for Gulf expansion regions', () => {
      GULF_EXPANSION_REGIONS.forEach(reg => {
        expect(reg.lat).toBeDefined();
        expect(reg.lng).toBeDefined();
      });
    });

    it('heuristically detects clinic location from address', () => {
      const cairoLoc = detectClinicLocation({ address: 'شارع التسعين، التجمع الخامس' });
      expect(cairoLoc.governorateId).toBe('cairo');

      const alexLoc = detectClinicLocation({ address: 'طريق الكورنيش، لوران، الإسكندرية' });
      expect(alexLoc.governorateId).toBe('alexandria');

      const riyadhLoc = detectClinicLocation({ address: 'طريق الملك فهد، الرياض' });
      expect(riyadhLoc.governorateId).toBe('riyadh');
    });
  });
});
