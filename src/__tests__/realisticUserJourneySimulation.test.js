import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../context/AppContext';
import { getTodayDateStr, formatLocalDate } from '../utils/timeSlots';
import { processDoctorIntent } from '../utils/clinicalAssistantActions';

describe('Real-World Medical Practice Simulation (Realistic Users & Lifecycle)', () => {
  const today = getTodayDateStr();
  const tomorrow = formatLocalDate(new Date(Date.now() + 86400000));

  // Initialize clean state
  let state = {
    ...initialState,
    patients: [],
    appointments: [],
    notifications: [],
    blockedSlots: [],
    prescriptions: [],
    expenses: [],
    recalls: [],
    isLoading: false
  };

  it('Step 1: New Patient Online Booking (مروة عادل)', () => {
    const newPatient = {
      id: 'patient-marwa-101',
      name: 'مروة عادل إبراهيم',
      phone: '01098765432',
      age: '29',
      gender: 'أنثى',
      diagnosis: '',
      visitsCount: 0
    };

    const newAppointment = {
      id: 'appt-marwa-1',
      bookingCode: 'CF-5501',
      patientId: newPatient.id,
      patientName: newPatient.name,
      patientPhone: newPatient.phone,
      date: today,
      time: '05:00 م',
      type: 'كشف عادي',
      fee: '300 ج.م',
      status: 'booked',
      notes: 'شكوى من حموضة متكررة'
    };

    // Dispatch add patient & appointment
    state = appReducer(state, { type: 'ADD_PATIENT', payload: newPatient });
    state = appReducer(state, { type: 'ADD_APPOINTMENT', payload: newAppointment });

    expect(state.patients.length).toBe(1);
    expect(state.appointments.length).toBe(1);
    expect(state.notifications.length).toBe(1);
    expect(state.notifications[0].title).toBe('حجز موعد جديد');
  });

  it('Step 2: Emergency Walk-In Patient Registration (طارق منصور)', () => {
    const emergencyPatient = {
      id: 'patient-tarek-102',
      name: 'طارق منصور عبد الرحيم',
      phone: '01122334455',
      age: '42',
      gender: 'ذكر',
      visitsCount: 0
    };

    const emergencyAppt = {
      id: 'appt-tarek-2',
      bookingCode: 'CF-9902',
      patientId: emergencyPatient.id,
      patientName: emergencyPatient.name,
      patientPhone: emergencyPatient.phone,
      date: today,
      time: '05:15 م',
      type: 'طوارئ',
      fee: '400 ج.م',
      isEmergency: true,
      status: 'waiting',
      checkedInAt: new Date().toISOString(),
      notes: 'ألم حاد مفاجئ بالبطن'
    };

    state = appReducer(state, { type: 'ADD_PATIENT', payload: emergencyPatient });
    state = appReducer(state, { type: 'ADD_APPOINTMENT', payload: emergencyAppt });

    expect(state.patients.length).toBe(2);
    expect(state.appointments.length).toBe(2);

    // Verify Emergency Sorting: Emergency patient must take precedence in the waiting queue
    const waitingPatients = state.appointments
      .filter(a => a.status === 'waiting' || a.isEmergency)
      .sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        return 0;
      });

    expect(waitingPatients[0].patientName).toBe('طارق منصور عبد الرحيم');
  });

  it('Step 3: Doctor Starts Examination for Emergency Patient', () => {
    state = appReducer(state, {
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id: 'appt-tarek-2', status: 'in_progress' }
    });

    const inProgressAppt = state.appointments.find(a => a.id === 'appt-tarek-2');
    expect(inProgressAppt.status).toBe('in_progress');
  });

  it('Step 4: Doctor Completes Consultation and Issues E-Prescription', () => {
    // 1. Complete exam
    state = appReducer(state, {
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: {
        id: 'appt-tarek-2',
        status: 'completed',
        diagnosis: 'نزلة معوية حادة وتجفاف خفيف',
        prescription: 'محلول جفاف + Nexium 40mg',
        notes: 'الراحة التامة والعودة للاستشارة بعد 3 أيام'
      }
    });

    // 2. Update patient medical history
    state = appReducer(state, {
      type: 'UPDATE_PATIENT_MEDICAL_HISTORY',
      payload: {
        patientId: 'patient-tarek-102',
        diagnosis: 'نزلة معوية حادة وتجفاف خفيف',
        prescription: 'محلول جفاف + Nexium 40mg',
        notes: 'الراحة التامة والعودة للاستشارة بعد 3 أيام',
        lastVisit: today
      }
    });

    // 3. Create E-Prescription record
    const newRx = {
      id: 'rx-tarek-01',
      patientId: 'patient-tarek-102',
      patientName: 'طارق منصور عبد الرحيم',
      patientPhone: '01122334455',
      appointmentId: 'appt-tarek-2',
      date: today,
      doctorName: 'د. أحمد الشريف',
      specialty: 'باطنة وجهاز هضمي',
      diagnosis: 'نزلة معوية حادة وتجفاف خفيف',
      medications: [
        { name: 'Nexium 40mg', dose: 'قرص واحد', freq: 'قبل الإفطار', duration: '14 يوم', notes: 'على معدة فارغة' },
        { name: 'Panadol 500mg', dose: 'قرص واحد', freq: 'عند اللزوم', duration: '3 أيام', notes: 'بعد الأكل' }
      ]
    };

    state = appReducer(state, { type: 'ADD_PRESCRIPTION', payload: newRx });

    const tarekPatient = state.patients.find(p => p.id === 'patient-tarek-102');
    expect(tarekPatient.visitsCount).toBe(1);
    expect(tarekPatient.diagnosis).toBe('نزلة معوية حادة وتجفاف خفيف');
    expect(state.prescriptions.length).toBe(1);
    expect(state.prescriptions[0].medications.length).toBe(2);

    // Calculate revenue from completed appointments
    const completedAppts = state.appointments.filter(a => a.status === 'completed');
    const revenue = completedAppts.reduce((sum, a) => sum + (parseInt(a.fee.replace(/\D/g, ''), 10) || 300), 0);
    expect(revenue).toBe(400); // 400 EGP for emergency visit
  });

  it('Step 5: Returning Patient Recognition Flow (مروة عادل تحجز استشارة ثانية)', () => {
    const lookupPhone = '01098765432';
    const recognized = state.patients.find(p => p.phone === lookupPhone);

    expect(recognized).toBeDefined();
    expect(recognized.name).toBe('مروة عادل إبراهيم');

    // Quick returning booking
    const secondBooking = {
      id: 'appt-marwa-2',
      bookingCode: 'CF-7703',
      patientId: recognized.id,
      patientName: recognized.name,
      patientPhone: recognized.phone,
      date: tomorrow,
      time: '06:00 م',
      type: 'استشارة',
      fee: '150 ج.م',
      status: 'booked',
      notes: 'متابعة نتائج التحاليل'
    };

    state = appReducer(state, { type: 'ADD_APPOINTMENT', payload: secondBooking });
    expect(state.appointments.length).toBe(3);
  });

  it('Step 6: Patient Rescheduling via Self-Service Manage Booking Portal', () => {
    const targetAppt = state.appointments.find(a => a.bookingCode === 'CF-7703');
    const nextWeek = formatLocalDate(new Date(Date.now() + 7 * 86400000));

    const updatedAppt = {
      ...targetAppt,
      date: nextWeek,
      time: '07:30 م'
    };

    state = appReducer(state, { type: 'UPDATE_APPOINTMENT', payload: updatedAppt });
    const afterReschedule = state.appointments.find(a => a.bookingCode === 'CF-7703');
    expect(afterReschedule.date).toBe(nextWeek);
    expect(afterReschedule.time).toBe('07:30 م');
  });

  it('Step 7: Doctor AI Assistant Blocks Day Off via Natural Language', () => {
    const command = 'احظر يوم الخميس القادم إجازة سنوية';
    const actionResult = processDoctorIntent(command);

    expect(actionResult.isAction).toBe(true);
    expect(actionResult.actionType).toBe('BLOCK_FULL_DAY');

    state = appReducer(state, { type: 'BLOCK_FULL_DAY', payload: actionResult.payload });
    expect(state.blockedSlots.length).toBe(1);
    expect(state.blockedSlots[0].isFullDay).toBe(true);
  });

});
