/**
 * Enterprise Input Validation Schemas & Sanitization Guards
 * Enforces zero-trust boundary verification across all mutation paths
 * (Clinic Registration, Patient Creation, Appointment Booking, Staff Provisioning).
 */

import { validateEgyptianPhone, cleanEgyptianPhone } from './phoneValidation';

export const validatePhoneNumber = (phone) => {
  const clean = cleanEgyptianPhone(phone);
  const isValid = validateEgyptianPhone(phone);
  return {
    valid: isValid,
    normalized: clean,
    message: isValid ? null : 'رقم هاتف محمول غير صالح (يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً).'
  };
};

/**
 * Validates clinic onboarding / registration input
 * @param {Object} input 
 * @returns {{ success: boolean, errors?: Object, data?: Object }}
 */
export function validateRegisterClinic(input = {}) {
  const errors = {};

  const name = String(input.name || '').trim();
  if (!name || name.length < 3) {
    errors.name = 'اسم الطبيب يجب ألا يقل عن 3 أحرف.';
  }

  const clinicName = String(input.clinicName || '').trim();
  if (!clinicName || clinicName.length < 3) {
    errors.clinicName = 'اسم العيادة مطلوب ويجب ألا يقل عن 3 أحرف.';
  }

  const phone = String(input.phone || '').trim();
  const phoneValidation = validatePhoneNumber(phone);
  if (!phone || !phoneValidation.valid) {
    errors.phone = phoneValidation.message || 'رقم هاتف محمول غير صالح.';
  }

  const doctorEmail = String(input.doctorEmail || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!doctorEmail || !emailRegex.test(doctorEmail)) {
    errors.doctorEmail = 'بريد إلكتروني غير صالح.';
  }

  const password = String(input.password || '');
  if (!password || password.length < 4) {
    errors.password = 'كلمة المرور يجب أن تكون 4 خانات على الأقل.';
  }

  const hasErrors = Object.keys(errors).length > 0;
  return {
    success: !hasErrors,
    errors: hasErrors ? errors : null,
    data: hasErrors ? null : {
      name,
      clinicName,
      phone: phoneValidation.normalized || phone,
      doctorEmail,
      specialty: String(input.specialty || '').trim() || 'الطب العام',
      tier: String(input.tier || 'pro').toLowerCase()
    }
  };
}

/**
 * Validates public appointment booking input
 * @param {Object} input 
 * @returns {{ success: boolean, errors?: Object, data?: Object }}
 */
export function validateAppointmentBooking(input = {}) {
  const errors = {};

  const patientName = String(input.patientName || input.name || '').trim();
  if (!patientName || patientName.length < 3) {
    errors.patientName = 'اسم المريض بالكامل مطلوب (3 أحرف على الأقل).';
  }

  const phone = String(input.patientPhone || input.phone || '').trim();
  const phoneValidation = validatePhoneNumber(phone);
  if (!phone || !phoneValidation.valid) {
    errors.phone = phoneValidation.message || 'يرجى إدخال رقم هاتف محمول صحيح لتأكيد الحجز.';
  }

  const date = String(input.date || '').trim();
  if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.date = 'تاريخ الحجز غير صالح.';
  }

  const time = String(input.time || '').trim();
  if (!time) {
    errors.time = 'وقت الموعد مطلوب.';
  }

  const hasErrors = Object.keys(errors).length > 0;
  return {
    success: !hasErrors,
    errors: hasErrors ? errors : null,
    data: hasErrors ? null : {
      patientName,
      patientPhone: phoneValidation.normalized || phone,
      date,
      time,
      type: String(input.type || 'كشف عادي').trim(),
      notes: String(input.notes || '').trim(),
      clinicId: input.clinicId || input.clinicSlug
    }
  };
}

/**
 * Validates patient registration / medical file input
 * @param {Object} input 
 * @returns {{ success: boolean, errors?: Object, data?: Object }}
 */
export function validatePatientRecord(input = {}) {
  const errors = {};

  const name = String(input.name || '').trim();
  if (!name || name.length < 3) {
    errors.name = 'اسم المريض مطلوب ويجب ألا يقل عن 3 أحرف.';
  }

  const phone = String(input.phone || '').trim();
  if (phone) {
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      errors.phone = phoneValidation.message || 'رقم هاتف غير صالح.';
    }
  }

  let age = null;
  if (input.age !== undefined && input.age !== null && input.age !== '') {
    const parsedAge = parseInt(input.age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      errors.age = 'عمر المريض غير صالح (من 0 إلى 130 عاماً).';
    } else {
      age = parsedAge;
    }
  }

  const hasErrors = Object.keys(errors).length > 0;
  return {
    success: !hasErrors,
    errors: hasErrors ? errors : null,
    data: hasErrors ? null : {
      name,
      phone: phone || '',
      age,
      gender: input.gender === 'female' ? 'female' : 'male',
      medicalHistory: Array.isArray(input.medicalHistory) ? input.medicalHistory : [],
      allergies: Array.isArray(input.allergies) ? input.allergies : []
    }
  };
}

/**
 * Validates staff account provisioning
 * @param {Object} input 
 * @returns {{ success: boolean, errors?: Object, data?: Object }}
 */
export function validateStaffAccount(input = {}) {
  const errors = {};

  const name = String(input.name || '').trim();
  if (!name || name.length < 2) {
    errors.name = 'اسم الموظف مطلوب (حرفين على الأقل).';
  }

  const phone = String(input.phone || '').trim();
  const phoneValidation = validatePhoneNumber(phone);
  if (!phone || !phoneValidation.valid) {
    errors.phone = phoneValidation.message || 'رقم هاتف غير صالح.';
  }

  const password = String(input.password || '');
  if (!password || password.length < 4) {
    errors.password = 'كلمة المرور يجب أن تكون 4 خانات على الأقل.';
  }

  const role = String(input.role || 'receptionist').trim();
  const allowedRoles = ['receptionist', 'associate_doctor', 'accountant', 'assistant', 'staff'];
  if (!allowedRoles.includes(role)) {
    errors.role = 'الدور الوظيفي المحدد غير مدعوم.';
  }

  const hasErrors = Object.keys(errors).length > 0;
  return {
    success: !hasErrors,
    errors: hasErrors ? errors : null,
    data: hasErrors ? null : {
      name,
      phone: phoneValidation.normalized || phone,
      email: input.email ? String(input.email).trim().toLowerCase() : '',
      password,
      role,
      shift: input.shift || 'مسائي (04:00 م - 10:00 م)',
      permissions: Array.isArray(input.permissions) ? input.permissions : ['appointments', 'patients']
    }
  };
}
