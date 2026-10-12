import { describe, it, expect } from 'vitest';
import { fromDbDoctor, toDbDoctor, calculateDoctorCommissions } from '../services/doctorsService';
import { fromDbAppointment, toDbAppointment, checkSlotCollision } from '../services/appointmentsService';
import { fromDbInvoice, toDbInvoice } from '../services/invoicesService';
import { settingsReducer } from '../context/reducers/settingsReducer';

describe('Multi-Doctor & Polyclinic Enterprise Architecture', () => {
  it('correctly maps doctor DB entity to client model and payload', () => {
    const rawDb = {
      id: 'doc-uuid-12345',
      clinic_id: 'clinic-poly-01',
      user_id: 'user-auth-01',
      name: 'د. كريم عبد العزيز',
      specialty: 'جراحة عظام وزراعة مفاصل',
      phone: '01011112222',
      email: 'karim@clinic.com',
      regular_fee: '400 ج.م',
      consultation_fee: '200 ج.م',
      commission_rate: 60,
      working_hours: 'السبت والإثنين: ٥:٠٠ م - ١٠:٠٠ م',
      is_active: true,
      created_at: '2026-10-12T10:00:00Z'
    };

    const model = fromDbDoctor(rawDb);
    expect(model.id).toBe('doc-uuid-12345');
    expect(model.clinicId).toBe('clinic-poly-01');
    expect(model.name).toBe('د. كريم عبد العزيز');
    expect(model.commissionRate).toBe(60);
    expect(model.regularFee).toBe('400 ج.م');

    const payload = toDbDoctor(model);
    expect(payload.clinic_id).toBe('clinic-poly-01');
    expect(payload.commission_rate).toBe(60);
    expect(payload.regular_fee).toBe('400 ج.م');
  });

  it('maps doctorId and doctorName correctly in appointments service', () => {
    const apptDb = {
      id: 'appt-101',
      booking_code: '#CF-8899',
      clinic_id: 'clinic-poly-01',
      doctor_id: 'doc-uuid-1',
      doctor_name: 'د. أحمد الشريف',
      branch_id: 'branch-01',
      patient_id: 'pat-01',
      patient_name: 'محمد الشناوي',
      date: '2026-10-15',
      time: '06:00 م',
      status: 'booked'
    };

    const appt = fromDbAppointment(apptDb);
    expect(appt.doctorId).toBe('doc-uuid-1');
    expect(appt.doctorName).toBe('د. أحمد الشريف');
    expect(appt.branchId).toBe('branch-01');

    const payload = toDbAppointment(appt);
    expect(payload.doctor_id).toBe('doc-uuid-1');
    expect(payload.doctor_name).toBe('د. أحمد الشريف');
    expect(payload.branch_id).toBe('branch-01');
  });

  it('allows concurrent appointments at the same time if assigned to DIFFERENT doctors in a polyclinic', async () => {
    const inMemoryAppointments = [
      {
        id: 'appt-doc1',
        clinicId: 'clinic-poly-01',
        doctorId: 'doc-1',
        date: '2026-10-20',
        time: '07:00 م',
        status: 'booked'
      }
    ];

    // Attempting to book SAME slot for the SAME doctor -> collision!
    const collisionSameDoc = await checkSlotCollision(
      'clinic-poly-01',
      '2026-10-20',
      '07:00 م',
      null,
      inMemoryAppointments,
      'doc-1'
    );
    expect(collisionSameDoc).toBe(true);

    // Attempting to book SAME slot for a DIFFERENT doctor in the same clinic -> ALLOWED (no collision)
    const collisionDiffDoc = await checkSlotCollision(
      'clinic-poly-01',
      '2026-10-20',
      '07:00 م',
      null,
      inMemoryAppointments,
      'doc-2'
    );
    expect(collisionDiffDoc).toBe(false);
  });

  it('calculates doctor commissions and clinic net revenue breakdown accurately', () => {
    const doctors = [
      { id: 'doc-1', name: 'د. طارق (عظام)', specialty: 'عظام', commissionRate: 60 },
      { id: 'doc-2', name: 'د. منى (جلدية)', specialty: 'جلدية', commissionRate: 50 }
    ];

    const invoices = [
      { id: 'inv-1', doctorId: 'doc-1', total: 1000, paidAmount: 1000, items: [{ name: 'كشف عظام' }] },
      { id: 'inv-2', doctorId: 'doc-1', total: 2000, paidAmount: 2000, items: [{ name: 'حقن بلازما مفصل' }] },
      { id: 'inv-3', doctorId: 'doc-2', total: 1500, paidAmount: 1500, items: [{ name: 'جلسة فراكشنال ليزر' }] }
    ];

    const report = calculateDoctorCommissions(invoices, doctors);
    expect(report.length).toBe(2);

    const doc1Report = report.find(r => r.doctorId === 'doc-1');
    expect(doc1Report.grossRevenue).toBe(3000);
    expect(doc1Report.doctorNetShare).toBe(1800); // 60% of 3000
    expect(doc1Report.clinicNetShare).toBe(1200); // 40% of 3000

    const doc2Report = report.find(r => r.doctorId === 'doc-2');
    expect(doc2Report.grossRevenue).toBe(1500);
    expect(doc2Report.doctorNetShare).toBe(750);  // 50% of 1500
    expect(doc2Report.clinicNetShare).toBe(750);  // 50% of 1500
  });

  it('handles multi-doctor state management via settingsReducer', () => {
    const initialState = { doctors: [] };

    // 1. ADD_DOCTOR
    const stateWithDoc = settingsReducer(initialState, {
      type: 'ADD_DOCTOR',
      payload: { id: 'doc-99', name: 'د. يوسف', commissionRate: 55, isActive: true }
    });
    expect(stateWithDoc.doctors.length).toBe(1);
    expect(stateWithDoc.doctors[0].name).toBe('د. يوسف');

    // 2. UPDATE_DOCTOR
    const updatedState = settingsReducer(stateWithDoc, {
      type: 'UPDATE_DOCTOR',
      payload: { id: 'doc-99', commissionRate: 65 }
    });
    expect(updatedState.doctors[0].commissionRate).toBe(65);

    // 3. TOGGLE_DOCTOR_STATUS
    const toggledState = settingsReducer(updatedState, {
      type: 'TOGGLE_DOCTOR_STATUS',
      payload: 'doc-99'
    });
    expect(toggledState.doctors[0].isActive).toBe(false);

    // 4. DELETE_DOCTOR
    const finalState = settingsReducer(toggledState, {
      type: 'DELETE_DOCTOR',
      payload: 'doc-99'
    });
    expect(finalState.doctors.length).toBe(0);
  });
});
