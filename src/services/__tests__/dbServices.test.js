import { describe, it, expect } from 'vitest';
import * as appointmentsService from '../appointmentsService';
import * as patientsService from '../patientsService';
import * as blockedSlotsService from '../blockedSlotsService';
import * as staffService from '../staffService';
import * as clinicsService from '../clinicsService';
import * as notificationsService from '../notificationsService';

describe('Database Services & Schema Mappers Test Suite', () => {

  describe('Appointments Database Service Mappers', () => {
    it('correctly maps DB snake_case to client camelCase model', () => {
      const dbRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        clinic_id: 'c1',
        patient_id: 'p1',
        patient_name: 'أحمد محمود',
        patient_phone: '01012345678',
        date: '2026-08-25',
        time: '05:30 م',
        type: 'طوارئ',
        fee: '400 ج.م',
        status: 'waiting',
        checked_in_at: '2026-08-25T14:00:00.000Z',
        consultation_started_at: null,
        notes: 'حالة عاجلة',
        reminder_sent: true,
        booking_code: 'CF-9921',
        created_at: '2026-08-25T13:00:00.000Z'
      };

      const model = appointmentsService.fromDbAppointment(dbRow);
      expect(model.id).toBe(dbRow.id);
      expect(model.patientName).toBe('أحمد محمود');
      expect(model.patientPhone).toBe('01012345678');
      expect(model.bookingCode).toBe('CF-9921');
      expect(model.isEmergency).toBe(true);
      expect(model.checkedInAt).toBe('2026-08-25T14:00:00.000Z');
      expect(model.reminderSent).toBe(true);
    });

    it('correctly maps client model to DB snake_case payload', () => {
      const clientModel = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        clinicId: 'c1',
        patientId: 'p1',
        patientName: 'أحمد محمود',
        patientPhone: '01012345678',
        date: '2026-08-25',
        time: '05:30 م',
        type: 'كشف عادي',
        fee: '300 ج.م',
        status: 'booked',
        bookingCode: 'CF-1122',
        checkedInAt: '2026-08-25T14:00:00.000Z',
        reminderSent: false
      };

      const payload = appointmentsService.toDbAppointment(clientModel);
      expect(payload.id).toBe(clientModel.id);
      expect(payload.clinic_id).toBe('c1');
      expect(payload.patient_id).toBe('p1');
      expect(payload.patient_name).toBe('أحمد محمود');
      expect(payload.patient_phone).toBe('01012345678');
      expect(payload.booking_code).toBe('CF-1122');
      expect(payload.checked_in_at).toBe('2026-08-25T14:00:00.000Z');
      expect(payload.reminder_sent).toBe(false);
    });
  });

  describe('Patients Database Service Mappers', () => {
    it('correctly maps DB patient row to client model', () => {
      const dbRow = {
        id: 'p-101',
        clinic_id: 'c1',
        name: 'سارة خالد',
        age: 28,
        gender: 'أنثى',
        phone: '01122334455',
        email: 'sara@test.com',
        blood_type: 'A+',
        diagnosis: 'التهاب حاد بالمعدة',
        notes: 'حساسية من البنسلين',
        total_visits: 4,
        last_visit: '2026-08-20T10:00:00.000Z'
      };

      const patient = patientsService.fromDbPatient(dbRow);
      expect(patient.name).toBe('سارة خالد');
      expect(patient.age).toBe('28');
      expect(patient.bloodType).toBe('A+');
      expect(patient.visitsCount).toBe(4);
      expect(patient.lastVisit).toBe('2026-08-20');
    });

    it('correctly maps client patient model to DB payload', () => {
      const clientPatient = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'سارة خالد',
        age: '28 سنة',
        bloodType: 'B+',
        visitsCount: 3,
        lastVisit: '2026-08-25'
      };

      const payload = patientsService.toDbPatient(clientPatient);
      expect(payload.id).toBe(clientPatient.id);
      expect(payload.name).toBe('سارة خالد');
      expect(payload.age).toBe(28);
      expect(payload.blood_type).toBe('B+');
      expect(payload.total_visits).toBe(3);
    });
  });

  describe('Blocked Slots & Staff & Clinic Mappers', () => {
    it('correctly maps blocked slots DB row', () => {
      const dbSlot = {
        id: 'slot-1',
        clinic_id: 'c1',
        date: '2026-08-30',
        time: 'FULL_DAY',
        is_full_day: true,
        reason: 'إجازة سنوية'
      };

      const mapped = blockedSlotsService.fromDbBlockedSlot(dbSlot);
      expect(mapped.date).toBe('2026-08-30');
      expect(mapped.isFullDay).toBe(true);
      expect(mapped.reason).toBe('إجازة سنوية');
    });

    it('correctly maps staff member DB row', () => {
      const dbStaff = {
        id: 'staff-1',
        name: 'سارة الاستقبال',
        phone: '01011223344',
        email: 'sara@clinic.com',
        role: 'سكرتير أول',
        status: 'active',
        permissions: ['appointments', 'patients']
      };

      const mapped = staffService.fromDbStaff(dbStaff);
      expect(mapped.name).toBe('سارة الاستقبال');
      expect(mapped.status).toBe('active');
      expect(mapped.permissions).toContain('appointments');
    });

    it('correctly maps clinic DB row and payload', () => {
      const dbClinic = {
        id: 'c-1',
        name: 'عيادة الشريف',
        doctor_name: 'د. أحمد',
        specialty: 'باطنة',
        regular_fee: '300 ج.م',
        consultation_fee: '150 ج.م'
      };

      const clinic = clinicsService.fromDbClinic(dbClinic);
      expect(clinic.name).toBe('عيادة الشريف');
      expect(clinic.doctorName).toBe('د. أحمد');
      expect(clinic.regularFee).toBe('300 ج.م');
      expect(clinic.consultationFee).toBe('150 ج.م');

      const payload = clinicsService.toDbClinic({
        name: 'عيادة الشريف المحدثة',
        regularFee: '350 ج.م'
      });
      expect(payload.name).toBe('عيادة الشريف المحدثة');
      expect(payload.regular_fee).toBe('350 ج.م');
    });

    it('correctly maps notification DB row', () => {
      const dbNotif = {
        id: 'n-1',
        type: 'emergency',
        title: 'طوارئ',
        message: 'حالة مستعجلة',
        read: false,
        related_id: 'appt-123',
        created_at: '2026-08-25T12:00:00.000Z'
      };

      const notif = notificationsService.fromDbNotification(dbNotif);
      expect(notif.type).toBe('emergency');
      expect(notif.relatedId).toBe('appt-123');
      expect(notif.read).toBe(false);
    });
  });

  describe('Expenses & Recalls Database Services', () => {
    it('correctly maps expenses DB row and payload', async () => {
      const expensesService = await import('../expensesService');
      const row = {
        id: 'exp-1',
        clinic_id: 'c-1',
        title: 'شراء شاش وقطن',
        amount: '450.50',
        category: 'مستلزمات وأدوية',
        date: '2026-08-25',
        notes: 'فاتورة صيدلية',
        created_at: '2026-08-25T10:00:00.000Z'
      };

      const expense = expensesService.fromDbExpense(row);
      expect(expense.title).toBe('شراء شاش وقطن');
      expect(expense.amount).toBe(450.5);
      expect(expense.category).toBe('مستلزمات وأدوية');

      const payload = expensesService.toDbExpense({
        title: 'إيجار العيادة',
        amount: 8000,
        category: 'إيجار ومرافق',
        date: '2026-08-01'
      });
      expect(payload.title).toBe('إيجار العيادة');
      expect(payload.amount).toBe(8000);
      expect(payload.category).toBe('إيجار ومرافق');
    });

    it('correctly maps patient recalls DB row and payload', async () => {
      const recallsService = await import('../recallsService');
      const row = {
        id: 'rec-1',
        clinic_id: 'c-1',
        patient_id: 'p-1',
        patient_name: 'محمد علي',
        patient_phone: '01012345678',
        reason: 'فحص دوري سكر وضغط',
        due_date: '2026-09-25',
        interval_days: 30,
        status: 'pending',
        created_at: '2026-08-25T10:00:00.000Z'
      };

      const recall = recallsService.fromDbRecall(row);
      expect(recall.patientName).toBe('محمد علي');
      expect(recall.dueDate).toBe('2026-09-25');
      expect(recall.intervalDays).toBe(30);
      expect(recall.status).toBe('pending');

      const payload = recallsService.toDbRecall({
        patientName: 'سارة خالد',
        patientPhone: '01122334455',
        reason: 'تنظيف أسنان دوري',
        dueDate: '2026-10-01',
        intervalDays: 60,
        status: 'contacted'
      });
      expect(payload.patient_name).toBe('سارة خالد');
      expect(payload.reason).toBe('تنظيف أسنان دوري');
      expect(payload.interval_days).toBe(60);
      expect(payload.status).toBe('contacted');
    });
  });

});
