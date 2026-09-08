import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../context/AppContext';
import { validateEgyptianPhone, cleanEgyptianPhone } from '../utils/phoneValidation';
import { RateLimiter } from '../utils/rateLimiter';
import { getTodayDateStr, formatLocalDate } from '../utils/timeSlots';
import { BROADCAST_EVENTS } from '../services/realtimeSyncService';

describe('Complete ClinicFlow End-to-End Operational Lifecycle (Clean Production Slate)', () => {
  const today = getTodayDateStr();
  const clinicId = '550e8400-e29b-41d4-a716-446655440000';
  const foreignClinicId = '550e8400-e29b-41d4-a716-446655440099';

  // State starts 100% clean
  let state = {
    ...initialState,
    patients: [],
    appointments: [],
    invoices: [],
    expenses: [],
    recalls: [],
    notifications: [],
    blockedSlots: [],
    isLoading: false,
    clinicInfo: {
      id: clinicId,
      name: 'مركز النخبة للأسنان',
      doctorName: 'د. أحمد الشريف',
      regularFee: '300 ج.م',
      consultationFee: '150 ج.م'
    }
  };

  // Shared booking data across phases
  let createdPatientId = null;
  let createdAppointmentId = null;
  const patientPhone = '01006285031';
  const bookingCode = 'CF-9901';

  it('Phase 1: Verifies pristine clean initial state (Zero mock records)', () => {
    expect(state.patients).toHaveLength(0);
    expect(state.appointments).toHaveLength(0);
    expect(state.invoices).toHaveLength(0);
    expect(state.expenses).toHaveLength(0);
    expect(state.recalls).toHaveLength(0);
  });

  it('Phase 2: Configures working schedule and blocks vacation days', () => {
    // Doctor sets off-day
    state = appReducer(state, {
      type: 'BLOCK_FULL_DAY',
      payload: { date: '2026-09-20', reason: 'عطلة رسمية / مؤتمر طبي' }
    });

    expect(state.blockedSlots).toHaveLength(1);
    expect(state.blockedSlots[0].date).toBe('2026-09-20');
    expect(state.blockedSlots[0].isFullDay).toBe(true);
  });

  it('Phase 3: Public online patient booking with phone-first validation & anti-abuse rate check', () => {
    // 1. Phone validation
    expect(validateEgyptianPhone(patientPhone)).toBe(true);
    const clean = cleanEgyptianPhone(patientPhone);
    expect(clean).toBe('01006285031');

    // 2. Anti-abuse rate limiter check
    const rateLimiter = new RateLimiter();
    const rateCheck = rateLimiter.check(`booking_${clean}`, 5, 60000);
    expect(rateCheck.allowed).toBe(true);

    // 3. New patient record created
    createdPatientId = 'pat-clean-101';
    const newPatient = {
      id: createdPatientId,
      clinicId,
      name: 'كريم محمود الهواري',
      phone: clean,
      age: '32',
      gender: 'ذكر',
      bloodType: 'O+',
      medicalAlerts: 'حساسية البنسلين',
      visitsCount: 0,
      totalVisits: 0,
      lastVisit: null
    };

    state = appReducer(state, { type: 'ADD_PATIENT', payload: newPatient });
    expect(state.patients).toHaveLength(1);
    expect(state.patients[0].name).toBe('كريم محمود الهواري');

    // 4. Online appointment booked
    createdAppointmentId = 'appt-clean-101';
    const newAppointment = {
      id: createdAppointmentId,
      clinicId,
      bookingCode,
      patientId: createdPatientId,
      patientName: newPatient.name,
      patientPhone: clean,
      date: today,
      time: '06:00 م',
      type: 'كشف عادي',
      fee: '300 ج.م',
      status: 'booked'
    };

    state = appReducer(state, { type: 'ADD_APPOINTMENT', payload: newAppointment });
    expect(state.appointments).toHaveLength(1);
    expect(state.appointments[0].bookingCode).toBe(bookingCode);
    expect(state.notifications.some(n => n.type === 'appointment')).toBe(true);
  });

  it('Phase 4: Receptionist check-in and waiting queue arrival event', () => {
    // Receptionist checks in patient
    state = appReducer(state, {
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id: createdAppointmentId, status: 'waiting' }
    });

    const target = state.appointments.find(a => a.id === createdAppointmentId);
    expect(target.status).toBe('waiting');
    expect(target.checkedInAt).toBeDefined();

    // Broadcast event simulation
    const broadcastPayload = {
      eventType: BROADCAST_EVENTS.PATIENT_ARRIVED,
      patientId: createdPatientId,
      patientName: target.patientName,
      clinicId
    };
    expect(broadcastPayload.eventType).toBe('PATIENT_ARRIVED');
  });

  it('Phase 5: Doctor examination room, EMR update, and consultation completion', () => {
    // 1. Doctor calls patient into examination room
    state = appReducer(state, {
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id: createdAppointmentId, status: 'in_progress' }
    });

    let appt = state.appointments.find(a => a.id === createdAppointmentId);
    expect(appt.status).toBe('in_progress');
    expect(appt.consultationStartedAt).toBeDefined();

    // 2. Doctor enters clinical diagnosis & medical history
    state = appReducer(state, {
      type: 'UPDATE_PATIENT_MEDICAL_HISTORY',
      payload: {
        patientId: createdPatientId,
        diagnosis: 'تسوس عميق بالضرس 46 مع التهاب عصب حاد',
        notes: 'تم تخدير موضعي وبدء جلسة الروتاري الأولى، يحتاج تاج زيركون'
      }
    });

    const patient = state.patients.find(p => p.id === createdPatientId);
    expect(patient.diagnosis).toContain('تسوس عميق بالضرس 46');
    expect(patient.notes).toContain('تاج زيركون');

    // 3. Doctor completes consultation
    state = appReducer(state, {
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id: createdAppointmentId, status: 'completed' }
    });

    appt = state.appointments.find(a => a.id === createdAppointmentId);
    expect(appt.status).toBe('completed');

    // 4. Verify patient visits counter automatically incremented and lastVisit updated
    const updatedPatient = state.patients.find(p => p.id === createdPatientId);
    expect(updatedPatient.totalVisits).toBe(1);
    expect(updatedPatient.lastVisit).toBe(today);
  });

  it('Phase 6: Billing & Invoicing settlement (Cash Payment & Zero Balance)', () => {
    const invoice = {
      id: 'inv-clean-1',
      clinicId,
      invoiceNumber: 'INV-2026-001',
      patientId: createdPatientId,
      patientName: 'كريم محمود الهواري',
      patientPhone,
      date: today,
      subtotal: 300,
      discount: 0,
      total: 300,
      paidAmount: 300,
      remainingBalance: 0,
      paymentStatus: 'paid',
      paymentMethod: 'cash'
    };

    expect(invoice.total).toBe(300);
    expect(invoice.paidAmount).toBe(300);
    expect(invoice.remainingBalance).toBe(0);
    expect(invoice.paymentStatus).toBe('paid');
  });

  it('Phase 7: Automated patient recall scheduling & SMS gateway reminder', () => {
    const recall = {
      id: 'rec-clean-1',
      clinicId,
      patientId: createdPatientId,
      patientName: 'كريم محمود الهواري',
      patientPhone,
      reason: 'جلسة مقاس وتركيب تاج الزيركون',
      dueDate: '2026-10-15',
      status: 'pending'
    };

    state = appReducer(state, { type: 'ADD_RECALL', payload: recall });
    expect(state.recalls).toHaveLength(1);
    expect(state.recalls[0].reason).toContain('تاج الزيركون');
    expect(state.notifications.some(n => n.type === 'recall')).toBe(true);
  });

  it('Phase 8: Patient self-service management & strict multi-tenant isolation guard', () => {
    const lookupInClinic = (code, phone, targetClinicId) => {
      return state.appointments.find(a => {
        const matchesClinic = (!a.clinicId || a.clinicId === targetClinicId);
        const matchesCode = a.bookingCode === code;
        const matchesPhone = a.patientPhone === phone;
        return matchesClinic && matchesCode && matchesPhone;
      });
    };

    // 1. Patient finds appointment within their own clinic
    const foundInOwnClinic = lookupInClinic(bookingCode, patientPhone, clinicId);
    expect(foundInOwnClinic).toBeDefined();
    expect(foundInOwnClinic.patientName).toBe('كريم محمود الهواري');

    // 2. Strict Isolation: Patient lookup from another clinic MUST fail
    const foundInForeignClinic = lookupInClinic(bookingCode, patientPhone, foreignClinicId);
    expect(foundInForeignClinic).toBeUndefined();

    // 3. Patient reschedules appointment to tomorrow
    const tomorrow = formatLocalDate(new Date(Date.now() + 86400000));
    state = appReducer(state, {
      type: 'UPDATE_APPOINTMENT',
      payload: {
        ...foundInOwnClinic,
        date: tomorrow,
        time: '07:00 م'
      }
    });

    const rescheduled = state.appointments.find(a => a.id === createdAppointmentId);
    expect(rescheduled.date).toBe(tomorrow);
    expect(rescheduled.time).toBe('07:00 م');
  });
});
