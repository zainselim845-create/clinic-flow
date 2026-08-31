import { describe, it, expect } from 'vitest';
import { DEFAULT_DENTAL_VISIT_TYPES } from '../../services/visitTypesService';
import { defaultServices, clinicInfo } from '../../data/demoData';

describe('Clinical Pricing & Data Consistency Audit', () => {
  it('all default services have numeric or proper Egyptian currency formats without duration clutter', () => {
    expect(defaultServices.length).toBeGreaterThan(5);
    defaultServices.forEach(s => {
      expect(s.price).toMatch(/^[0-9]+\s*ج\.م$/);
      expect(s.name).toBeDefined();
    });
  });

  it('clinicInfo contains regular, consultation, and emergency fees matching clinical standard', () => {
    expect(clinicInfo.regularFee).toBe('300 ج.م');
    expect(clinicInfo.consultationFee).toBe('150 ج.م');
    expect(clinicInfo.emergencyFee).toBe('400 ج.م');
  });

  it('DEFAULT_DENTAL_VISIT_TYPES are properly formatted with standard fees', () => {
    DEFAULT_DENTAL_VISIT_TYPES.forEach(vt => {
      expect(vt.standardFee).toBeGreaterThanOrEqual(100);
      expect(vt.nameAr).toBeDefined();
    });
  });
});
