import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  COMMON_MEDICATIONS, 
  createPrescription, 
  formatPrescriptionForWhatsApp, 
  savePrescriptionToStorage, 
  getPatientPrescriptionsFromStorage 
} from '../services/prescriptionService';
import { checkPrescriptionSafety } from '../services/drugInteractionService';
import { 
  formatPhoneForWhatsApp, 
  getWhatsAppUri, 
  getBookingConfirmationWhatsAppUrl, 
  getAppointmentReminderWhatsAppUrl, 
  getRecallReminderWhatsAppUrl 
} from '../services/smsService';
import { safeStorage } from '../utils/safeStorage';

describe('e-Prescription & WhatsApp Direct Integration', () => {
  beforeEach(() => {
    safeStorage.clear();
  });

  describe('1. Clinical e-Prescription Engine', () => {
    it('has standard curated Egyptian medications library with proper defaults', () => {
      expect(COMMON_MEDICATIONS.length).toBeGreaterThan(5);
      const augmentin = COMMON_MEDICATIONS.find(m => m.id === 'med-augmentin-1g');
      expect(augmentin).toBeDefined();
      expect(augmentin.name).toContain('Augmentin');
      expect(augmentin.defaultDose).toBe('قرص واحد');
      expect(augmentin.defaultFrequency).toContain('12 ساعة');
    });

    it('creates a normalized prescription object with a cryptographic verification code', () => {
      const clinic = { id: 'clinic-1', name: 'مركز الشريف التخصصي', phone: '01012345678', specialty: 'طب الفم والأسنان' };
      const doctor = { name: 'د. أحمد الشريف', title: 'استشاري جراحة الأسنان', syndicateNumber: 'قيد نقابة: 48921' };
      const patient = { id: 'pat-99', name: 'محمود حسن', phone: '01099887766', age: 34, gender: 'ذكر' };
      const medications = [
        { name: 'Augmentin 1g', dose: 'قرص واحد', frequency: 'كل 12 ساعة', duration: 'لمدة 7 أيام', instructions: 'بعد الأكل' },
        { name: 'Cataflam 50mg', dose: 'قرص واحد', frequency: 'عند اللزوم', duration: 'لمدة 3 أيام', instructions: 'بعد الوجبة مباشرة' }
      ];

      const rx = createPrescription({
        clinic,
        doctor,
        patient,
        diagnosis: 'التهاب عصب سني حاد',
        procedures: 'فتح خراج وتطهير القنوات',
        medications,
        generalInstructions: 'الراحة وتجنب المشروبات الساخنة',
        nextVisit: 'بعد أسبوع'
      });

      expect(rx.id).toMatch(/^rx-\d+/);
      expect(rx.verificationCode).toMatch(/^CF-RX-\d{4}-\d{6}$/);
      expect(rx.clinicName).toBe('مركز الشريف التخصصي');
      expect(rx.doctorName).toBe('د. أحمد الشريف');
      expect(rx.patientName).toBe('محمود حسن');
      expect(rx.medications).toHaveLength(2);
      expect(rx.medications[0].name).toBe('Augmentin 1g');
      expect(rx.status).toBe('active');
    });

    it('persists and retrieves prescriptions per patient and clinic', () => {
      const rx1 = createPrescription({
        clinic: { id: 'c-alpha' },
        patient: { id: 'p-101', name: 'أحمد علي', phone: '01011112222' },
        diagnosis: 'نزلة معوية',
        medications: [{ name: 'Controloc 40mg' }]
      });

      const rx2 = createPrescription({
        clinic: { id: 'c-alpha' },
        patient: { id: 'p-102', name: 'سارة إبراهيم', phone: '01122223333' },
        diagnosis: 'التهاب أذن',
        medications: [{ name: 'Curam 1g' }]
      });

      savePrescriptionToStorage(rx1);
      savePrescriptionToStorage(rx2);

      const patient1Rx = getPatientPrescriptionsFromStorage('p-101', 'c-alpha');
      expect(patient1Rx).toHaveLength(1);
      expect(patient1Rx[0].patientName).toBe('أحمد علي');
      expect(patient1Rx[0].diagnosis).toBe('نزلة معوية');

      const patient2Rx = getPatientPrescriptionsFromStorage('p-102', 'c-alpha');
      expect(patient2Rx).toHaveLength(1);
      expect(patient2Rx[0].patientName).toBe('سارة إبراهيم');
    });

    it('detects penicillin allergy during prescription building', () => {
      const patientWithPenicillinAllergy = {
        id: 'pat-1',
        name: 'كريم مجدي',
        allergies: 'حساسية من البنسلين ومشتقاته (Penicillin)'
      };

      const medsText = 'أوجمنتين 1 جم أقراص كل 12 ساعة';
      const warnings = checkPrescriptionSafety(medsText, patientWithPenicillinAllergy);

      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings[0].id).toBe('penicillin_allergy');
      expect(warnings[0].severity).toBe('danger');
      expect(warnings[0].title).toContain('حساسية بنسلين');
    });
  });

  describe('2. WhatsApp Message Generation & Direct Linking', () => {
    it('normalizes Egyptian phone numbers to international WhatsApp wa.me format', () => {
      expect(formatPhoneForWhatsApp('01012345678')).toBe('201012345678');
      expect(formatPhoneForWhatsApp('+201122334455')).toBe('201122334455');
      expect(formatPhoneForWhatsApp('0020155556666')).toBe('20155556666');
      expect(formatPhoneForWhatsApp('012 3456 7890')).toBe('201234567890');
      expect(formatPhoneForWhatsApp('201099887766')).toBe('201099887766');
    });

    it('generates valid WhatsApp wa.me URL with encoded payload', () => {
      const url = getWhatsAppUri('01012345678', 'مرحباً بك في العيادة');
      expect(url).toContain('https://wa.me/201012345678?text=');
      expect(url).toContain(encodeURIComponent('مرحباً بك في العيادة'));
    });

    it('formats a complete Arabic medical prescription for WhatsApp sharing', () => {
      const rx = createPrescription({
        clinic: { name: 'عيادة د. أحمد الشريف' },
        doctor: { name: 'د. أحمد الشريف', title: 'استشاري أسنان' },
        patient: { name: 'عمر خالد' },
        diagnosis: 'خراج ضرس عقل',
        medications: [
          { name: 'Augmentin 1g', dose: 'قرص واحد', frequency: 'كل 12 ساعة', duration: '5 أيام', instructions: 'بعد الأكل' }
        ],
        generalInstructions: 'الراحة التامة والامتناع عن التدخين',
        nextVisit: '2026-09-20'
      });

      const message = formatPrescriptionForWhatsApp(rx);
      expect(message).toContain('عيادة د. أحمد الشريف');
      expect(message).toContain('د. أحمد الشريف');
      expect(message).toContain('عمر خالد');
      expect(message).toContain('خراج ضرس عقل');
      expect(message).toContain('Augmentin 1g');
      expect(message).toContain('قرص واحد');
      expect(message).toContain('الراحة التامة والامتناع عن التدخين');
      expect(message).toContain(rx.verificationCode);
    });

    it('generates booking confirmation WhatsApp URL with reservation ticket details', () => {
      const url = getBookingConfirmationWhatsAppUrl({
        patientName: 'مريم عادل',
        phone: '01055556666',
        date: '2026-09-15',
        time: '06:30 مساءً',
        clinicName: 'مركز الحياة الطبي',
        bookingCode: 'BK-78901',
        manageUrl: 'https://clinicflow.app/manage-booking'
      });

      expect(url).toContain('https://wa.me/201055556666?text=');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('مريم عادل');
      expect(decoded).toContain('مركز الحياة الطبي');
      expect(decoded).toContain('2026-09-15');
      expect(decoded).toContain('BK-78901');
      expect(decoded).toContain('https://clinicflow.app/manage-booking');
    });

    it('generates appointment reminder and recall WhatsApp links', () => {
      const reminderUrl = getAppointmentReminderWhatsAppUrl({
        patientName: 'يوسف شريف',
        phone: '01199887766',
        date: 'غداً الإثنين',
        time: '05:00 م',
        clinicName: 'عيادة كلينيك فلو'
      });
      expect(reminderUrl).toContain('https://wa.me/201199887766?text=');
      expect(decodeURIComponent(reminderUrl)).toContain('تذكير بموعد الكشف');

      const recallUrl = getRecallReminderWhatsAppUrl({
        patientName: 'ياسمين طارق',
        phone: '01211113333',
        clinicName: 'مركز الدلتا للأسنان',
        reason: 'تنظيف جير وفحص وقائي',
        dueDate: '2026-10-01'
      });
      expect(recallUrl).toContain('https://wa.me/201211113333?text=');
      expect(decodeURIComponent(recallUrl)).toContain('تنظيف جير وفحص وقائي');
    });
  });

  describe('3. PWA Web App Manifest & Service Worker Assets', () => {
    it('contains a valid, well-formed public/manifest.json for PWA installation', () => {
      const manifestPath = path.resolve(__dirname, '../../public/manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const content = fs.readFileSync(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.name).toContain('ClinicFlow');
      expect(parsed.short_name).toBe('ClinicFlow');
      expect(parsed.start_url).toBe('/');
      expect(parsed.display).toBe('standalone');
      expect(parsed.theme_color).toBe('#1A73E8');
      expect(parsed.dir).toBe('rtl');
      expect(parsed.lang).toBe('ar');
      expect(parsed.icons).toBeInstanceOf(Array);
      expect(parsed.icons.length).toBeGreaterThan(0);
    });

    it('contains a responsive Service Worker public/sw.js with network resilience caching', () => {
      const swPath = path.resolve(__dirname, '../../public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);

      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toContain('CACHE_NAME');
      expect(content).toContain('addEventListener(\'install\'');
      expect(content).toContain('addEventListener(\'activate\'');
      expect(content).toContain('addEventListener(\'fetch\'');
      expect(content).toContain('navigate');
    });
  });
});
