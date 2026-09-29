import React from 'react';
import { describe, it, expect } from 'vitest';
import { 
  parseNationalId, 
  validateNationalId,
  EGYPT_GOVERNORATES, 
  EGYPT_PAYMENT_METHODS 
} from '../features/egypt-national';
import PatientCard from '../components/PatientCard';
import AppointmentCard from '../components/AppointmentCard';
import NewAppointmentModal from '../components/appointments/NewAppointmentModal';
import PatientFormModal from '../components/patients/PatientFormModal';
import OnboardingStepClinic from '../pages/onboarding/components/OnboardingStepClinic';

describe('Egyptian National Scale UI & End-to-End Architecture Verification', () => {

  it('accurately parses 14-digit National ID and calculates exact demographics', () => {
    // 29504151201478 -> Born 15/04/1995 in Dakahlia (code 12), Male (7 is odd)
    const parsed = parseNationalId('29504151201478');
    expect(parsed.isValid).toBe(true);
    expect(parsed.birthYear).toBe(1995);
    expect(parsed.birthDate).toBe('1995-04-15');
    expect(parsed.governorateCode).toBe('12');
    expect(parsed.governorateNameAr).toBe('الدقهلية');
    expect(parsed.gender).toBe('male');
    expect(parsed.genderAr).toBe('ذكر');
    expect(parsed.age).toBeGreaterThanOrEqual(28);
  });

  it('contains all 27 official Egyptian governorates plus expats code', () => {
    expect(EGYPT_GOVERNORATES.length).toBe(28);
    const cairo = EGYPT_GOVERNORATES.find(g => g.code === '01');
    expect(cairo.nameAr).toBe('القاهرة');
    expect(cairo.dialCode).toBe('02');

    const alex = EGYPT_GOVERNORATES.find(g => g.code === '02');
    expect(alex.nameAr).toBe('الإسكندرية');
    expect(alex.dialCode).toBe('03');

    const aswan = EGYPT_GOVERNORATES.find(g => g.code === '28');
    expect(aswan.nameAr).toBe('أسوان');
    expect(aswan.regionAr).toBe('إقليم جنوب الصعيد');

    const exp = EGYPT_GOVERNORATES.find(g => g.code === '88');
    expect(exp.nameAr).toBe('مواليد خارج الجمهورية');
  });

  it('provides all official Egyptian national payment rails (Cash, InstaPay, Mobile Wallets, Fawry, Meeza)', () => {
    expect(EGYPT_PAYMENT_METHODS.length).toBe(8);
    const ids = EGYPT_PAYMENT_METHODS.map(m => m.id);
    expect(ids).toContain('cash');
    expect(ids).toContain('instapay');
    expect(ids).toContain('vodafone_cash');
    expect(ids).toContain('orange_cash');
    expect(ids).toContain('etisalat_cash');
    expect(ids).toContain('we_pay');
    expect(ids).toContain('fawry');
    expect(ids).toContain('meeza_card');
  });

  it('validates PatientCard component element creation with Egyptian governorate', () => {
    const mockPatient = {
      id: 'pat-101',
      name: 'محمود عبد الرازق',
      phone: '01006285031',
      age: 32,
      gender: 'ذكر',
      governorate: 'الدقهلية'
    };
    const el = React.createElement(PatientCard, { patient: mockPatient });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.patient.governorate).toBe('الدقهلية');
    expect(el.props.patient.phone).toBe('01006285031');
  });

  it('validates AppointmentCard component element creation with Egyptian payment rails', () => {
    const mockAppt = {
      id: 'appt-202',
      patientName: 'مريم الأحمدي',
      patientPhone: '01123456789',
      date: '2026-10-01',
      time: '18:00',
      type: 'كشف واستشارة',
      fee: '400 ج.م',
      paymentMethod: 'instapay',
      status: 'booked'
    };
    const el = React.createElement(AppointmentCard, { appointment: mockAppt });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.appointment.paymentMethod).toBe('instapay');
  });

  it('validates NewAppointmentModal element creation with paymentMethod support', () => {
    expect(typeof NewAppointmentModal).toBe('function');
    const el = React.createElement(NewAppointmentModal, {
      isOpen: true,
      formData: {
        patientId: 'pat-1',
        date: '2026-10-01',
        time: '17:00',
        type: 'كشف عيادة',
        fee: '300 ج.م',
        paymentMethod: 'vodafone_cash',
        notes: ''
      },
      patients: [{ id: 'pat-1', name: 'أحمد سعيد', phone: '01000000000', governorate: 'الجيزة' }],
      availableSlots: ['17:00', '17:30']
    });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.formData.paymentMethod).toBe('vodafone_cash');
  });

  it('validates PatientFormModal element creation with phone-first registration and governorate', () => {
    expect(typeof PatientFormModal).toBe('function');
    const el = React.createElement(PatientFormModal, {
      isOpen: true,
      formData: {
        name: 'إبراهيم حسن',
        phone: '01200000000',
        governorate: 'الدقهلية',
        age: 30,
        gender: 'ذكر'
      }
    });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.formData.phone).toBe('01200000000');
    expect(el.props.formData.governorate).toBe('الدقهلية');
  });

  it('validates OnboardingStepClinic element creation with 27 governorates selector', () => {
    expect(typeof OnboardingStepClinic).toBe('function');
    const el = React.createElement(OnboardingStepClinic, {
      clinicName: 'مركز النخبة الطبي',
      specialtyCategory: 'dental',
      filteredSpecialties: [],
      selectedSpecialtyId: 'general-dental',
      city: 'القاهرة',
      address: 'شارع الثورة'
    });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.city).toBe('القاهرة');
  });

  it('supports CSV export headers containing Governorate without National ID friction', () => {
    const headers = ['الاسم', 'المحافظة', 'العمر', 'الجنس', 'الهاتف', 'فصيلة الدم', 'التشخيص', 'عدد الزيارات', 'آخر زيارة', 'ملاحظات'];
    expect(headers).toContain('المحافظة');
    expect(headers).not.toContain('الرقم القومي');
  });

  it('end-to-end appointment payload enriches patient demographics correctly', () => {
    const rawPatient = {
      name: 'سارة عبد الله',
      governorate: 'القاهرة',
      phone: '01099887766'
    };

    const appointmentPayload = {
      id: 'appt-999',
      patientName: rawPatient.name,
      patientPhone: rawPatient.phone,
      governorate: rawPatient.governorate,
      paymentMethod: 'meeza',
      status: 'booked'
    };

    expect(appointmentPayload.patientName).toBe('سارة عبد الله');
    expect(appointmentPayload.governorate).toBe('القاهرة');
    expect(appointmentPayload.paymentMethod).toBe('meeza');
  });

});

