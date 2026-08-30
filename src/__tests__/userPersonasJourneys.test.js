import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../context/AppContext';
import { formatLocalDate, getTodayDateStr } from '../utils/timeSlots';

describe('End-to-End User Personas Experience Testing', () => {

  // =========================================================================
  // 1. PERSONA: المريض (Patient Online Self-Service Journey)
  // =========================================================================
  describe('Persona 1: المريض (Patient Self-Service)', () => {
    const today = getTodayDateStr();

    it('executes full patient booking lifecycle from reservation to reschedule and cancellation', () => {
      const newBooking = {
        id: 'appt-patient-1',
        patientId: 'patient-1',
        patientName: 'محمد سعيد',
        patientPhone: '01006285031',
        date: today,
        time: '05:30 م',
        type: 'كشف عادي',
        fee: '300 ج.م',
        bookingCode: 'CF-7821',
        status: 'booked',
        notes: 'شكوى من آلام المعدة'
      };

      // 1. Booking created
      let state = appReducer(initialState, { type: 'ADD_APPOINTMENT', payload: newBooking });
      expect(state.appointments.length).toBe(1);
      expect(state.appointments[0].bookingCode).toBe('CF-7821');
      expect(state.notifications.length).toBe(1);
      expect(state.notifications[0].title).toBe('حجز موعد جديد');

      // 2. Reschedule to next day
      const target = state.appointments[0];
      const tomorrow = formatLocalDate(new Date(Date.now() + 86400000));
      const rescheduledAppt = {
        ...target,
        date: tomorrow,
        time: '07:00 م',
        status: 'booked'
      };

      state = appReducer(state, { type: 'UPDATE_APPOINTMENT', payload: rescheduledAppt });
      const updated = state.appointments.find(a => a.id === target.id);
      expect(updated.date).toBe(tomorrow);
      expect(updated.time).toBe('07:00 م');

      // 3. Cancel booking
      state = appReducer(state, {
        type: 'UPDATE_APPOINTMENT_STATUS',
        payload: { id: 'appt-patient-1', status: 'cancelled' }
      });
      const cancelled = state.appointments.find(a => a.id === 'appt-patient-1');
      expect(cancelled.status).toBe('cancelled');
    });

    it('handles emergency booking submission with correct prioritization flags', () => {
      const emergencyBooking = {
        id: 'appt-patient-2',
        patientId: 'patient-2',
        patientName: 'مريم أحمد',
        patientPhone: '01122334455',
        date: today,
        time: '06:00 م',
        type: 'طوارئ',
        fee: '400 ج.م',
        isEmergency: true,
        bookingCode: 'CF-9911',
        status: 'booked',
        notes: 'مغص كلوي حاد مفاجئ'
      };

      const state = appReducer(initialState, { type: 'ADD_APPOINTMENT', payload: emergencyBooking });
      expect(state.appointments.length).toBe(1);
      expect(state.appointments[0].isEmergency).toBe(true);
      expect(state.appointments[0].type).toBe('طوارئ');
    });
  });

  // =========================================================================
  // 2. PERSONA: السكرتيرة (Secretary / Receptionist Journey)
  // =========================================================================
  describe('Persona 2: السكرتيرة (Secretary Operations)', () => {
    const today = getTodayDateStr();

    it('registers walk-in patient and advances them into active examination room', () => {
      const walkInAppt = {
        id: 'appt-walkin-1',
        patientName: 'طارق حسام',
        patientPhone: '01255556666',
        date: today,
        time: '05:15 م',
        type: 'طوارئ',
        isEmergency: true,
        fee: '400 ج.م',
        status: 'waiting',
        checkedInAt: new Date().toISOString()
      };

      let state = appReducer(initialState, { type: 'ADD_APPOINTMENT', payload: walkInAppt });
      expect(state.appointments.length).toBe(1);
      expect(state.appointments[0].status).toBe('waiting');

      // Advance into active consultation
      state = appReducer(state, {
        type: 'UPDATE_APPOINTMENT_STATUS',
        payload: { id: 'appt-walkin-1', status: 'in_progress' }
      });

      const inProgress = state.appointments.find(a => a.id === 'appt-walkin-1');
      expect(inProgress.status).toBe('in_progress');
      expect(inProgress.consultationStartedAt).toBeDefined();
    });

    it('blocks and unblocks doctor appointment slots dynamically', () => {
      let state = appReducer(initialState, {
        type: 'TOGGLE_BLOCK_SLOT',
        payload: { date: today, time: '08:00 م' }
      });

      expect(state.blockedSlots.length).toBe(1);
      expect(state.blockedSlots[0].time).toBe('08:00 م');

      // Toggling again unblocks the slot
      state = appReducer(state, {
        type: 'TOGGLE_BLOCK_SLOT',
        payload: { date: today, time: '08:00 م' }
      });
      expect(state.blockedSlots.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. PERSONA: الطبيب (Doctor Consultation & Clinical Operations)
  // =========================================================================
  describe('Persona 3: الطبيب (Doctor Clinical Operations)', () => {
    const today = getTodayDateStr();

    it('completes consultation and automatically updates patient visit record', () => {
      const patientId = 'p-vip-1';
      let state = appReducer(initialState, {
        type: 'ADD_PATIENT',
        payload: { id: patientId, name: 'سارة عبد الله', phone: '01099887766', visitsCount: 0 }
      });

      const appt = {
        id: 'appt-doc-exam',
        patientId: patientId,
        patientName: 'سارة عبد الله',
        patientPhone: '01099887766',
        date: today,
        time: '05:30 م',
        type: 'كشف عادي',
        fee: '300 ج.م',
        status: 'in_progress'
      };
      state = appReducer(state, { type: 'ADD_APPOINTMENT', payload: appt });

      // Complete examination
      state = appReducer(state, {
        type: 'UPDATE_APPOINTMENT_STATUS',
        payload: { id: 'appt-doc-exam', status: 'completed' }
      });

      const completed = state.appointments.find(a => a.id === 'appt-doc-exam');
      expect(completed.status).toBe('completed');

      const patient = state.patients.find(p => p.id === patientId);
      expect(patient.visitsCount).toBe(1);
      expect(patient.lastVisit).toBe(today);
    });

    it('recognizes returning patient by phone number for accelerated 1-click booking', () => {
      const existingPatient = {
        id: 'patient-ret-10',
        name: 'عمرو دياب البدري',
        phone: '01012345678',
        visitsCount: 4,
        diagnosis: 'متابعة دورية'
      };

      let state = appReducer(initialState, { type: 'ADD_PATIENT', payload: existingPatient });
      
      // Simulate phone-first lookup
      const phoneToLookup = '01012345678';
      const found = state.patients.find(p => p.phone === phoneToLookup);
      expect(found).toBeDefined();
      expect(found.name).toBe('عمرو دياب البدري');
      expect(found.visitsCount).toBe(4);
    });
  });

});

