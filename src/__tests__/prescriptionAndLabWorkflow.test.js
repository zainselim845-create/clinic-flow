import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createPrescriptionRecord, 
  formatPrescriptionForWhatsApp, 
  savePrescriptionToStorage, 
  getPatientPrescriptionsFromStorage, 
  COMMON_MEDICATIONS 
} from '../services/prescriptionService';
import { 
  getLabOrders, 
  addLabOrder, 
  updateLabOrderStatus, 
  DENTAL_WORK_TYPES 
} from '../services/labsService';

describe('Official e-Prescription & External Lab Workflow Suite', () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, val) => { mockStorage[key] = String(val); },
      removeItem: (key) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };
    global.localStorage = storageMock;
    if (typeof window !== 'undefined') window.localStorage = storageMock;
  });

  describe('1. e-Prescription Generation & Formatting', () => {
    it('creates a validated prescription record with unique verification code and tenant metadata', () => {
      const clinic = {
        id: 'clinic-dental-101',
        name: 'مركز الشريف لطب الأسنان',
        specialty: 'طب وجراحة الفم والأسنان',
        phone: '01006285031',
        doctorName: 'د. أحمد الشريف'
      };

      const patient = {
        id: 'pat-999',
        name: 'ياسر كمال',
        phone: '01012345678',
        age: 34
      };

      const medications = [
        { name: 'أوجمنتين 1 جم', dose: 'قرص واحد', frequency: 'كل 12 ساعة بعد الأكل', duration: 'لمدة 7 أيام' },
        { name: 'كتافلام 50 مجم', dose: 'قرص واحد', frequency: 'عند اللزوم', duration: 'لمدة 3 أيام' }
      ];

      const rx = createPrescriptionRecord({
        clinic,
        doctor: { name: clinic.doctorName },
        patient,
        diagnosis: 'التهاب حاد في عصب الضرس السفلي',
        procedures: 'فتح حجرة العصب وتطهير القنوات',
        medications,
        generalInstructions: 'الالتزام بمواعيد المضاد الحيوي وتجنب الأطعمة الصلبة'
      });

      expect(rx.id).toMatch(/^rx-/);
      expect(rx.clinicId).toBe('clinic-dental-101');
      expect(rx.patientName).toBe('ياسر كمال');
      expect(rx.verificationCode).toMatch(/^CF-RX-\d{4}-\d+/);
      expect(rx.medications).toHaveLength(2);
      expect(rx.medications[0].name).toBe('أوجمنتين 1 جم');
    });

    it('formats a prescription into a legible Arabic WhatsApp text message', () => {
      const rx = {
        clinicName: 'عيادة د. سارة للجلدية',
        doctorName: 'د. سارة عثمان',
        doctorTitle: 'استشاري الأمراض الجلدية والتجميل',
        patientName: 'منى عبد الرحمن',
        date: '2026-09-16',
        diagnosis: 'إكزيما تحسسية حادة',
        verificationCode: 'CF-RX-2026-784920',
        medications: [
          { name: 'كريم هيدروكورتيزون 1%', dose: 'دهان موضعي', frequency: 'مرتين يومياً', duration: 'لمدة 5 أيام' },
          { name: 'أقراص زيرتك 10 مجم', dose: 'قرص واحد', frequency: 'مساءً قبل النوم', duration: 'لمدة أسبوع' }
        ],
        generalInstructions: 'تجنب الصابون العطري والماء الساخن',
        nextVisit: 'بعد أسبوعين'
      };

      const formatted = formatPrescriptionForWhatsApp(rx);

      expect(formatted).toContain('عيادة د. سارة للجلدية');
      expect(formatted).toContain('د. سارة عثمان');
      expect(formatted).toContain('منى عبد الرحمن');
      expect(formatted).toContain('إكزيما تحسسية حادة');
      expect(formatted).toContain('1. كريم هيدروكورتيزون 1%');
      expect(formatted).toContain('2. أقراص زيرتك 10 مجم');
      expect(formatted).toContain('CF-RX-2026-784920');
      expect(formatted.length).toBeGreaterThan(50);
    });

    it('saves and retrieves prescriptions scoped by clinic and patient', () => {
      const rxAhmed = {
        id: 'rx-ahmed-1',
        clinicId: 'clinic-ahmed',
        patientId: 'pat-1',
        patientName: 'مريض أحمد'
      };
      const rxSara = {
        id: 'rx-sara-1',
        clinicId: 'clinic-sara',
        patientId: 'pat-2',
        patientName: 'مريضة سارة'
      };

      savePrescriptionToStorage(rxAhmed);
      savePrescriptionToStorage(rxSara);

      // Verify Ahmed clinic sees only its prescriptions
      const ahmedPatientRx = getPatientPrescriptionsFromStorage('pat-1', 'clinic-ahmed');
      expect(ahmedPatientRx).toHaveLength(1);
      expect(ahmedPatientRx[0].id).toBe('rx-ahmed-1');

      // Verify cross-tenant isolation: Sara's clinic does NOT see Ahmed's patient prescriptions
      const saraCheck = getPatientPrescriptionsFromStorage('pat-1', 'clinic-sara');
      expect(saraCheck).toHaveLength(0);
    });
  });

  describe('2. Lab Orders & Dental Prosthetics Management', () => {
    it('creates and tracks lab order lifecycle from creation to delivery', async () => {
      const clinicId = 'clinic-dental-1';
      const orderData = {
        id: 'lab-ord-1',
        patientName: 'كريم ممدوح',
        patientPhone: '01223344556',
        labName: 'معمل الأهرام للتركيبات',
        workType: 'طربوش زيركون (Zirconia Crown)',
        toothNumber: 16,
        shade: 'A2',
        cost: 450,
        status: 'sent',
        dueDate: '2026-09-25',
        notes: 'إطباق دقيق'
      };

      // Add order
      const { data: added } = await addLabOrder(orderData, clinicId);
      expect(added.id).toBe('lab-ord-1');
      expect(added.status).toBe('sent');

      // Status transition: first_try (بروفة أولى)
      const resTry = await updateLabOrderStatus('lab-ord-1', 'first_try');
      expect(resTry.success).toBe(true);

      // Status transition: received (تم الاستلام بالعيادة)
      const resReceived = await updateLabOrderStatus('lab-ord-1', 'received', { receivedDate: '2026-09-24' });
      expect(resReceived.success).toBe(true);

      // Status transition: delivered (تم التسليم والتركيب للمريض)
      const resDelivered = await updateLabOrderStatus('lab-ord-1', 'delivered', { deliveredDate: '2026-09-25' });
      expect(resDelivered.success).toBe(true);
    });

    it('provides standard dental work types with Arabic clinical labels', () => {
      expect(DENTAL_WORK_TYPES.length).toBeGreaterThanOrEqual(5);
      const zircon = DENTAL_WORK_TYPES.find(w => w.id === 'zircon_crown');
      expect(zircon).toBeDefined();
      expect(zircon.labelAr).toContain('زيركون');
    });
  });
});
