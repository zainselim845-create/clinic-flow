import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../context/AppContext';
import { validateEgyptianPhone, cleanEgyptianPhone } from '../utils/phoneValidation';
import { getTodayDateStr } from '../utils/timeSlots';

describe('Phone-First Conditional Booking Flow (Existing vs New Client)', () => {
  const today = getTodayDateStr();

  // Simulated Database Patients
  const dbPatients = [
    {
      id: 'pat-101',
      name: 'محمود عبد الفتاح',
      phone: '01006285031',
      age: '38',
      gender: 'ذكر',
      visitsCount: 3
    }
  ];

  it('Flow A: Existing client enters phone -> Recognized -> Skips data entry -> Directly books appointment', () => {
    const inputPhone = '01006285031';
    expect(validateEgyptianPhone(inputPhone)).toBe(true);

    const cleanInput = cleanEgyptianPhone(inputPhone);
    const existingPatient = dbPatients.find(p => cleanEgyptianPhone(p.phone) === cleanInput);

    // 1. Verified as existing client in DB
    expect(existingPatient).toBeDefined();
    expect(existingPatient.name).toBe('محمود عبد الفتاح');

    // 2. Client is greeted and data pre-filled; user directly selects service & appointment
    const directAppointment = {
      id: 'appt-exist-1',
      patientId: existingPatient.id,
      patientName: existingPatient.name,
      patientPhone: existingPatient.phone,
      date: today,
      time: '06:00 م',
      type: 'كشف عادي',
      fee: '300 ج.م',
      status: 'booked',
      bookingCode: '#CF-8821'
    };

    let state = appReducer(initialState, { type: 'ADD_APPOINTMENT', payload: directAppointment });
    expect(state.appointments.length).toBe(1);
    expect(state.appointments[0].patientName).toBe('محمود عبد الفتاح');
    expect(state.appointments[0].bookingCode).toBe('#CF-8821');
  });

  it('Flow B: New client enters phone -> Not in DB -> Enters details first (Name, Age, Gender) -> Then books appointment', () => {
    const inputPhone = '01155443322';
    expect(validateEgyptianPhone(inputPhone)).toBe(true);

    const cleanInput = cleanEgyptianPhone(inputPhone);
    const existingPatient = dbPatients.find(p => cleanEgyptianPhone(p.phone) === cleanInput);

    // 1. Verified as NOT in DB
    expect(existingPatient).toBeUndefined();

    // 2. System takes personal details first
    const newPatientDetails = {
      id: 'pat-new-202',
      name: 'نيرة مصطفى كمال',
      phone: inputPhone,
      age: '27',
      gender: 'أنثى',
      diagnosis: 'مريض جديد أونلاين',
      visitsCount: 1
    };

    let state = appReducer(initialState, { type: 'ADD_PATIENT', payload: newPatientDetails });
    expect(state.patients.length).toBe(1);
    expect(state.patients[0].name).toBe('نيرة مصطفى كمال');

    // 3. System creates appointment for the newly registered patient
    const newAppointment = {
      id: 'appt-new-1',
      patientId: newPatientDetails.id,
      patientName: newPatientDetails.name,
      patientPhone: newPatientDetails.phone,
      date: today,
      time: '07:30 م',
      type: 'كشف عادي',
      fee: '300 ج.م',
      status: 'booked',
      bookingCode: '#CF-9932'
    };

    state = appReducer(state, { type: 'ADD_APPOINTMENT', payload: newAppointment });
    expect(state.appointments.length).toBe(1);
    expect(state.appointments[0].patientName).toBe('نيرة مصطفى كمال');
  });

  it('Rejects invalid phone numbers before querying database', () => {
    expect(validateEgyptianPhone('12345')).toBe(false);
    expect(validateEgyptianPhone('0101234567')).toBe(false); // only 10 digits
    expect(validateEgyptianPhone('01312345678')).toBe(false); // invalid prefix 013
    expect(validateEgyptianPhone('01012345678')).toBe(true); // valid Vodafone
    expect(validateEgyptianPhone('01112345678')).toBe(true); // valid Etisalat
    expect(validateEgyptianPhone('01212345678')).toBe(true); // valid Orange
    expect(validateEgyptianPhone('01512345678')).toBe(true); // valid WE
  });
});
