/**
 * Enterprise Input Validation Schemas & Sanitization Guards
 * Enforces zero-trust boundary verification across all mutation paths.
 * 
 * DUAL-LAYER VALIDATION:
 *   Layer 1 (Legacy): Hand-rolled validators for UI forms (validateAppointmentBooking, etc.)
 *   Layer 2 (Zod):    Strict mutation schemas for service-layer tenant-scoped writes
 */

import { z } from 'zod';
import { validateEgyptianPhone, cleanEgyptianPhone } from './phoneValidation';

// ==========================================
// LAYER 1: LEGACY FORM VALIDATORS
// ==========================================

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

// ==========================================
// LAYER 2: ZOD MUTATION SCHEMAS (Multi-Tenant)
// ==========================================

/**
 * Universal safe validator returning structured { success, data, error, errors }
 */
export function validateWithSchema(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMsg = result.error.issues
      .map(issue => `${issue.path.join('.') || 'field'}: ${issue.message}`)
      .join('; ');
    return { success: false, data: null, error: errorMsg, errors: result.error.issues };
  }
  return { success: true, data: result.data, error: null };
}

// 1. Appointment Mutation Schema
export const appointmentSchema = z.object({
  clinicId: z.string().min(1, 'معرف العيادة مطلوب لمنع تسريب البيانات'),
  patientName: z.string().min(2, 'اسم المريض يجب أن يتكون من حرفين على الأقل'),
  patientPhone: z.string().optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'),
  time: z.string().min(1, 'وقت الموعد مطلوب'),
  type: z.string().default('كشف عادي'),
  fee: z.union([z.string(), z.number()]).optional(),
  status: z.enum(['booked', 'confirmed', 'completed', 'cancelled', 'no_show', 'refunded']).default('booked'),
  bookingCode: z.string().optional(),
  notes: z.string().optional()
});

// 2. Patient Mutation Schema
export const patientSchema = z.object({
  clinicId: z.string().min(1, 'معرف العيادة مطلوب'),
  name: z.string().min(2, 'اسم المريض مطلوب'),
  phone: z.string().optional().default(''),
  age: z.union([z.string(), z.number()]).optional(),
  gender: z.string().default('ذكر'),
  bloodType: z.string().optional(),
  medicalAlerts: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  visitsCount: z.number().int().nonnegative().default(1)
});

// 3. Invoice Mutation Schema
export const invoiceSchema = z.object({
  clinicId: z.string().min(1, 'معرف العيادة مطلوب'),
  patientId: z.string().min(1, 'معرف المريض مطلوب'),
  invoiceNumber: z.string().min(1, 'رقم الفاتورة مطلوب'),
  subtotal: z.number().nonnegative('المبلغ الفرعي لا يمكن أن يكون سالباً'),
  discount: z.number().nonnegative('الخصم لا يمكن أن يكون سالباً').default(0),
  taxPercentage: z.number().nonnegative().default(0),
  taxAmount: z.number().nonnegative().default(0),
  total: z.number().nonnegative('الإجمالي لا يمكن أن يكون سالباً'),
  insuranceShare: z.number().nonnegative().default(0),
  patientShare: z.number().nonnegative('حصة المريض لا يمكن أن تكون سالبة'),
  paymentStatus: z.enum(['unpaid', 'partial', 'paid', 'refunded']).default('unpaid'),
  items: z.array(z.any()).default([])
});

// 4. Payment Mutation Schema
export const paymentSchema = z.object({
  clinicId: z.string().min(1, 'معرف العيادة مطلوب'),
  invoiceId: z.string().min(1, 'معرف الفاتورة مطلوب'),
  amount: z.number().positive('مبلغ الدفعة يجب أن يكون أكبر من صفر'),
  paymentMethod: z.enum(['cash', 'card', 'vodafone_cash', 'instapay', 'bank_transfer', 'cheque']).default('cash'),
  transactionRef: z.string().optional(),
  notes: z.string().optional()
});

// 5. Tenant Registration Schema
export const tenantRegistrationSchema = z.object({
  name: z.string().min(3, 'اسم المركز أو العيادة مطلوب'),
  doctorName: z.string().min(3, 'اسم الطبيب المدير مطلوب'),
  phone: z.string().min(10, 'رقم الهاتف مطلوب'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'المسار يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وفواصل فقط'),
  subscriptionTier: z.enum(['starter', 'pro', 'enterprise']).default('pro')
});
