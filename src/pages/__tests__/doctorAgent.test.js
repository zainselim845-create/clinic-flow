import { describe, it, expect } from 'vitest';
import { 
  personalizeMessage, 
  filterTargetPatients, 
  CAMPAIGN_TEMPLATES 
} from '../../utils/doctorAgentHelpers';


describe('Doctor AI Agent & Follow-up Engine', () => {
  const sampleClinic = {
    name: 'عيادة د. أحمد الشريف',
    doctorName: 'د. أحمد الشريف'
  };

  const samplePatients = [
    {
      id: 'p-1',
      name: 'محمد سعيد',
      phone: '01006285031',
      diagnosis: 'التهاب مزمن بالمعدة ومتابعة سكر',
      notes: 'كشف استشاري',
      visitsCount: 3,
      lastVisit: '2026-08-20'
    },
    {
      id: 'p-2',
      name: 'سارة كمال',
      phone: '01122223333',
      diagnosis: 'نزلة معوية حادة',
      notes: 'كشف عادي جديد',
      visitsCount: 1,
      lastVisit: '2026-08-24'
    },
    {
      id: 'p-3',
      name: 'محمود حسن',
      phone: '01233334444',
      diagnosis: 'فحص دوري وضغط',
      notes: 'طوارئ',
      visitsCount: 1,
      lastVisit: '2026-08-22'
    }
  ];

  const sampleAppointments = [
    { id: 'a-1', patientId: 'p-1', type: 'استشارة', status: 'completed' },
    { id: 'a-2', patientId: 'p-2', type: 'كشف عادي', status: 'completed' },
    { id: 'a-3', patientId: 'p-3', type: 'طوارئ', status: 'completed' }
  ];

  describe('personalizeMessage', () => {
    it('replaces all patient and clinic placeholders correctly', () => {
      const template = 'مرحباً أ/ {اسم_المريض}، من {اسم_العيادة} مع د. {اسم_الطبيب}. زيارتك كانت بتاريخ {تاريخ_الزيارة}. الحجز: {رابط_الحجز}';
      const patient = { name: 'علي حسن', lastVisit: '2026-08-15' };
      
      const result = personalizeMessage(template, patient, sampleClinic);

      expect(result).toContain('علي حسن');
      expect(result).toContain('عيادة د. أحمد الشريف');
      expect(result).toContain('د. أحمد الشريف');
      expect(result).toContain('2026-08-15');
      expect(result).toContain('/booking');
    });

    it('handles empty template or patient gracefully without errors', () => {
      expect(personalizeMessage('', {}, sampleClinic)).toBe('');
      expect(personalizeMessage(null, {}, sampleClinic)).toBe('');
    });
  });

  describe('filterTargetPatients', () => {
    it.each([
      ['consultation', 'محمد سعيد'],
      ['regular', 'سارة كمال'],
      ['urgent', 'محمود حسن'],
      ['سكر', 'محمد سعيد'],
    ])('filters patients by "%s"  returns %s', (filter, expectedName) => {
      const matched = filterTargetPatients(samplePatients, sampleAppointments, filter);
      expect(matched).toHaveLength(1);
      expect(matched[0].name).toBe(expectedName);
    });

    it('returns all patients when filter is "all" or empty string', () => {
      expect(filterTargetPatients(samplePatients, sampleAppointments, 'all')).toHaveLength(3);
      expect(filterTargetPatients(samplePatients, sampleAppointments, '')).toHaveLength(3);
    });

    it('returns empty array when patients list is empty or null', () => {
      expect(filterTargetPatients([], sampleAppointments, 'consultation')).toEqual([]);
      expect(filterTargetPatients(null, sampleAppointments, 'consultation')).toEqual([]);
    });
  });

  describe('CAMPAIGN_TEMPLATES Catalog', () => {
    it.each(CAMPAIGN_TEMPLATES)('renders template "$id" cleanly with personalized patient data', (template) => {
      const rendered = personalizeMessage(template.template, { name: 'عمر محمود', lastVisit: '2026-08-20' }, sampleClinic);
      expect(rendered).toContain('عمر محمود');
      expect(rendered).toContain(sampleClinic.name);
      expect(rendered).not.toContain('{اسم_المريض}');
      expect(rendered).not.toContain('{اسم_العيادة}');
    });
  });
});
