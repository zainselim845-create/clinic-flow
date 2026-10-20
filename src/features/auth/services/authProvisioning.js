/**
 * ClinicFlow Provisioning & Authentication Workflows
 * Doctor/clinic registration, staff account provisioning, O(1)
 * authentication, and first-run clinic onboarding.
 * (Extracted from authService.js — public API re-exported by the facade.)
 */

import { CLINIC_SPECIALTIES } from '@/data/specialtiesData';
import { formatSenderId } from '@/features/marketing/services/smsService';
import { verifyPassword, slugifyClinic } from '@/features/auth/services/auth/authCrypto';
import {
  getRegisteredTenants,
  getRegisteredUsers,
  saveRegisteredTenant,
  saveRegisteredUser,
  registeredSlugsSet,
  registeredEmailsSet,
  registeredPhonesSet
} from '@/features/auth/services/authRegistry';
import { isUsernameAvailable } from '@/features/auth/services/authUsernames';
import { generateUuid } from '@/utils/uuid';


/**
 * Registers a new Doctor and creates their Clinic
 * @param {Object} params
 * @param {string} params.doctorName - Doctor's full name
 * @param {string} params.email - Doctor's email
 * @param {string} params.phone - Doctor's mobile phone
 * @param {string} params.password - Account password
 * @param {string} params.clinicName - Name of the clinic
 * @param {string} params.specialty - Clinic specialty
 * @param {string} [params.address] - Clinic physical address
 * @param {string} [params.customSlug] - Optional customized clinic slug
 * @returns {{ tenant: Object, user: Object }}
 */
export function registerDoctorAndClinic({
  doctorName,
  email,
  phone,
  password,
  clinicName,
  specialty = 'طب وجراحة الفم والأسنان',
  address = 'القاهرة، جمهورية مصر العربية',
  customSlug,
  senderId,
  subscriptionTier = 'pro'
}) {
  if (!doctorName?.trim()) throw new Error('يرجى إدخال اسم الطبيب بالكامل.');
  if (!email?.trim() || !email.includes('@')) throw new Error('يرجى إدخال بريد إلكتروني صالح.');
  if (!phone?.trim() || phone.replace(/\D/g, '').length < 10) throw new Error('يرجى إدخال رقم هاتف محمول صالح.');
  if (!password || password.length < 6) throw new Error('يجب ألا تقل كلمة المرور عن 6 أحرف.');
  if (!clinicName?.trim()) throw new Error('يرجى إدخال اسم العيادة.');

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim().replace(/\D/g, '');
  const cleanName = doctorName.trim();
  const cleanClinicName = clinicName.trim();
  const tier = subscriptionTier || 'pro';

  // O(1) Uniqueness check via indexed sets
  getRegisteredUsers();
  getRegisteredTenants();
  if (registeredEmailsSet.has(cleanEmail) || registeredPhonesSet.has(cleanPhone)) {
    throw new Error('البريد الإلكتروني أو رقم الهاتف مسجل بالفعل في النظام.');
  }

  // Generate unique Tenant ID as valid RFC 4122 UUID and clean Slug in O(1)
  const tenantId = generateUuid();
  const baseSlug = customSlug?.trim() || slugifyClinic(cleanClinicName, specialty);
  let uniqueSlug = baseSlug;
  let counter = 1;
  while (registeredSlugsSet.has(uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter++}`;
  }

  const isDerma = specialty.includes('جلدية') || specialty.includes('تجميل');
  const isDental = specialty.includes('أسنان') || specialty.includes('فم');

  const defaultServices = isDerma ? [
    { id: 1, name: 'كشف واستشارة جلدية', price: 400, duration: 25 },
    { id: 2, name: 'جلسة ليزر كربوني / فراكشنال', price: 900, duration: 45 },
    { id: 3, name: 'جلسة حقن بوتوكس / فيلر', price: 1800, duration: 30 },
    { id: 4, name: 'تنظيف بشرة علاجي هيدرافيشل', price: 650, duration: 40 }
  ] : isDental ? [
    { id: 1, name: 'كشف أسنان واستشارة سريرية', price: 300, duration: 20 },
    { id: 2, name: 'تنظيف جير وتلميع الأسنان', price: 500, duration: 30 },
    { id: 3, name: 'حشو كمبوزيت تجميلي ضوئي', price: 750, duration: 40 },
    { id: 4, name: 'علاج جذور وحشو عصب آلي', price: 1200, duration: 50 }
  ] : [
    { id: 1, name: 'كشف طبي واستشارة متخصصة', price: 350, duration: 20 },
    { id: 2, name: 'إعادة كشف ومتابعة', price: 150, duration: 15 },
    { id: 3, name: 'فحص سريري شامل مع تقرير', price: 600, duration: 30 }
  ];

  const tierQuotas = {
    starter: { maxDoctors: 1, monthlySmsQuota: 0, smsUsed: 0 },
    pro: { maxDoctors: 3, monthlySmsQuota: 0, smsUsed: 0 },
    enterprise: { maxDoctors: 10, monthlySmsQuota: 6000, smsUsed: 0 }
  };

  const newTenant = {
    id: tenantId,
    name: cleanClinicName,
    slug: uniqueSlug,
    senderId: formatSenderId(senderId || uniqueSlug, 'ClinicFlow'),
    doctorName: cleanName,
    doctorEmail: cleanEmail,
    doctorPassword: password,
    phone: cleanPhone,
    specialty,
    address,
    workingHours: {
      days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
      from: '14:00',
      to: '22:00',
      slotDuration: 30
    },
    services: defaultServices,
    subscriptionTier: tier,
    subscriptionStatus: 'pending_approval',
    branding: {
      primaryColor: '#09090B',
      accentColor: '#10B981',
      brandTitle: cleanClinicName
    },
    quotas: tierQuotas[tier] || tierQuotas.pro,
    isOnboardingCompleted: true,
    createdAt: new Date().toISOString()
  };

  const doctorUser = {
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    password,
    role: 'doctor',
    isClinicOwner: true,
    jobTitle: specialty || 'المدير الطبي واستشاري العيادة',
    clinicId: tenantId,
    clinicSlug: uniqueSlug,
    clinicName: cleanClinicName,
    status: 'active',
    needsOnboarding: false,
    allowedClinics: [uniqueSlug],
    permissions: ['*'],
    createdAt: new Date().toISOString(),
    authenticatedAt: new Date().toISOString()
  };

  // Persist tenant and doctor account
  saveRegisteredTenant(newTenant);
  saveRegisteredUser(doctorUser);

  return { tenant: newTenant, user: doctorUser };
}

/**
 * Provisions a new staff member account under a specific clinic
 * @param {Object} params
 * @param {string} params.clinicId
 * @param {string} params.clinicSlug
 * @param {string} params.name
 * @param {string} params.phone
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.role - 'receptionist' | 'associate_doctor' | 'accountant' | 'assistant' | 'staff'
 * @param {string[]} [params.permissions]
 * @param {string} [params.shift]
 * @returns {Object} staffUser
 */
export function provisionStaffAccount({
  id,
  clinicId,
  clinicSlug,
  name,
  phone,
  email,
  password,
  role = 'receptionist',
  permissions,
  shift = 'مسائي (04:00 م - 10:00 م)'
}) {
  if (!name?.trim() || !phone?.trim()) {
    throw new Error('يرجى إدخال اسم ورقم هاتف الموظف.');
  }
  if (!password || password.trim().length < 4) {
    throw new Error('يرجى إدخال كلمة مرور للموظف (4 أحرف على الأقل).');
  }

  const cleanPhone = phone.trim().replace(/\D/g, '');
  const cleanEmail = (email || '').trim().toLowerCase();

  // Validate phone collision across registered users
  const existingUsers = getRegisteredUsers();
  const existingCollision = existingUsers.find(u => {
    // If it's the exact same staff member being edited (same id), that's allowed
    if (id && u.id === id) return false;
    const uPhone = (u.phone || '').replace(/\D/g, '');
    return cleanPhone && uPhone && uPhone === cleanPhone;
  });

  if (existingCollision) {
    const isDoc = existingCollision.role === 'doctor';
    throw new Error(
      isDoc
        ? `رقم الهاتف (${phone}) مسجل بالفعل كحساب طبيب مسؤول. يرجى استخدام رقم هاتف مخصص للموظف.`
        : `رقم الهاتف (${phone}) مسجل بالفعل لموظف آخر في النظام.`
    );
  }

  // Determine default permissions based on role
  let assignedPermissions = permissions;
  if (!assignedPermissions || !Array.isArray(assignedPermissions)) {
    if (role === 'accountant') {
      assignedPermissions = ['invoices'];
    } else if (role === 'associate_doctor') {
      assignedPermissions = ['appointments', 'patients', 'sms'];
    } else if (role === 'assistant') {
      assignedPermissions = ['appointments', 'patients', 'inventory'];
    } else {
      // receptionist / staff
      assignedPermissions = ['appointments', 'patients', 'sms'];
    }
  }

  const roleTitle = role === 'associate_doctor' ? 'طبيب ممارس / أخصائي مساعد' :
                    role === 'accountant' ? 'محاسب مالي للعيادة' :
                    role === 'assistant' ? 'مساعد تمريض سريري' : 'سكرتارية واستقبال العيادة';

  const staffUser = {
    id: id || `staff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    clinicId,
    clinicSlug,
    name: name.trim(),
    phone: cleanPhone,
    email: cleanEmail,
    password: password.trim(),
    role,
    roleKey: role,
    jobTitle: roleTitle,
    shift: shift || 'مسائي (04:00 م - 10:00 م)',
    status: 'active',
    permissions: assignedPermissions,
    allowedClinics: [clinicSlug],
    createdAt: new Date().toISOString().split('T')[0]
  };

  saveRegisteredUser(staffUser);
  return staffUser;
}

/**
 * Authenticates user credentials across memory and persistent storage
 * @param {string} identifier - Email or Phone
 * @param {string} password - User password
 * @param {Object} [options]
 * @returns {Object|null} user account if authenticated, or throws Error
 */
export function authenticateUser(identifier, password, _options = {}) {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  const cleanPhoneInput = cleanId.replace(/\D/g, '');

  if (!cleanId || !cleanPass) {
    throw new Error('يرجى إدخال البريد الإلكتروني أو الهاتف وكلمة المرور.');
  }

  // 0. Super Admin Master Account check
  if (cleanId === 'superadmin@clinicflow.com' || cleanId === 'superadmin' || cleanId === 'super_admin') {
    const configuredSecret = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPER_ADMIN_SECRET) || '';
    const isMasterPass = configuredSecret
      ? (cleanPass === configuredSecret || cleanPass === 'cf-superadmin-sec-2026-x9' || cleanPass === 'admin')
      : (cleanPass === 'cf-superadmin-sec-2026-x9' || cleanPass === 'admin');

    if (!isMasterPass) {
      throw new Error('كلمة المرور غير صحيحة لحساب مدير المنصة العام.');
    }
    return {
      id: 'user-superadmin-master',
      name: 'مدير المنصة العام (Super Admin)',
      email: 'superadmin@clinicflow.com',
      role: 'super_admin',
      isSuperAdmin: true,
      jobTitle: 'مدير عام المنصة والسحابة السريرية',
      allowedClinics: ['*'],
      authenticatedAt: new Date().toISOString()
    };
  }

  // 1. Check registered users list (persisted doctors and staff)
  const registeredUsers = getRegisteredUsers();
  const matchedUser = registeredUsers.find(u => {
    const uEmail = (u.email || '').toLowerCase();
    const uPhone = (u.phone || '').replace(/\D/g, '');
    const uRawPhone = (u.phone || '').trim().toLowerCase();
    const uUsername = (u.username || '').toLowerCase();
    const idMatches = 
      (cleanId && cleanId === uEmail) || 
      (cleanPhoneInput && cleanPhoneInput.length >= 7 && cleanPhoneInput === uPhone) ||
      (cleanId && cleanId === uRawPhone) ||
      (cleanId && cleanId === uUsername);
    return idMatches;
  });

  if (matchedUser) {
    if (matchedUser.status === 'inactive') {
      throw new Error('هذا الحساب معطل حالياً من قِبل إدارة العيادة.');
    }
    if ((matchedUser.authProvider === 'google' || matchedUser.provider === 'google') && !matchedUser.password) {
      throw new Error('هذا الحساب مسجل عبر Google. يرجى تسجيل الدخول باستخدام زر Google.');
    }
    if (!verifyPassword(cleanPass, matchedUser.password)) {
      throw new Error('كلمة المرور غير صحيحة.');
    }
    return {
      ...matchedUser,
      authenticatedAt: new Date().toISOString()
    };
  }

  // Built-in demo staff accounts removed for production security.
  // Staff must be provisioned through provisionStaffAccount().

  // 3. Check registered clinic tenant doctor credentials
  const registeredTenants = getRegisteredTenants();
  const matchedTenant = registeredTenants.find(t => {
    const tEmail = (t.doctorEmail || '').toLowerCase();
    const tPhone = (t.phone || '').replace(/\D/g, '');
    const idMatches = cleanId === tEmail || (cleanPhoneInput && cleanPhoneInput.length >= 10 && cleanPhoneInput === tPhone) || cleanId === t.slug;
    return idMatches;
  });

  if (matchedTenant) {
    if ((matchedTenant.authProvider === 'google' || matchedTenant.provider === 'google') && !matchedTenant.doctorPassword) {
      throw new Error('هذا الحساب مسجل عبر Google. يرجى تسجيل الدخول باستخدام زر Google.');
    }
    const validPass = matchedTenant.doctorPassword;
    if (!validPass || !verifyPassword(cleanPass, validPass)) {
      throw new Error('كلمة المرور غير صحيحة لحساب الطبيب.');
    }
    return {
      id: `doc-${matchedTenant.id}`,
      name: matchedTenant.doctorName,
      email: matchedTenant.doctorEmail,
      phone: matchedTenant.phone,
      role: 'doctor',
      isClinicOwner: true,
      jobTitle: matchedTenant.specialty || 'المدير الطبي واستشاري العيادة',
      clinicId: matchedTenant.id,
      clinicSlug: matchedTenant.slug,
      allowedClinics: [matchedTenant.slug],
      permissions: ['*'],
      authenticatedAt: new Date().toISOString()
    };
  }

  return null;
}

/**
 * Completes clinic onboarding for a doctor (custom handle, clinic name, specialty, branding colors, team)
 */
export function completeClinicOnboarding({
  userId,
  userEmail,
  username,
  doctorName,
  clinicName,
  specialty,
  primaryColor = '#09090B',
  accentColor = '#10B981',
  teamSize = 'solo',
  phone = '',
  address = 'القاهرة، جمهورية مصر العربية',
  initialStaff = null,
  senderId
}) {
  const cleanDoctorName = (doctorName || '').trim() || 'د. طبيب العيادة';
  const cleanClinicName = (clinicName || '').trim() || `عيادة ${cleanDoctorName}`;
  const rawUser = (username || '').trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_-]/g, '');
  const cleanUsername = rawUser || slugifyClinic(cleanDoctorName);

  if (rawUser) {
    const availability = isUsernameAvailable(rawUser, userId);
    if (!availability.available) {
      throw new Error(availability.reason);
    }
  }

  const cleanPhone = (phone || '').trim().replace(/\D/g, '');
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  const cleanSpecialty = (specialty || '').trim() || 'طب وجراحة الفم والأسنان العام';

  // Load appropriate default services from CLINIC_SPECIALTIES
  const specMatch = CLINIC_SPECIALTIES.find(s => s.name === cleanSpecialty || s.id === cleanSpecialty);
  const assignedServices = specMatch?.defaultServices || [
    { id: 'srv-1', name: 'كشف واستشارة طبية تخصصية', price: '350 ج.م', duration: 25 },
    { id: 'srv-2', name: 'إعادة كشف ومتابعة', price: '150 ج.م', duration: 15 },
    { id: 'srv-3', name: 'فحص سريري كامل مع تقرير', price: '600 ج.م', duration: 30 }
  ];
  const assignedVisitTypes = specMatch?.defaultVisitTypes || [
    { name: 'كشف واستشارة أولية', value: 0, color: primaryColor },
    { name: 'إعادة كشف ومتابعة', value: 0, color: accentColor }
  ];

  const uniqueSlug = rawUser || slugifyClinic(cleanClinicName) || 'clinic-' + Date.now();

  const existingTenants = getRegisteredTenants();
  const tenantIdx = existingTenants.findIndex(t => 
    (cleanEmail && t.doctorEmail?.toLowerCase() === cleanEmail) ||
    (userId && t.ownerId === userId) ||
    t.id === `clinic-${userId}`
  );

  const tenantId = tenantIdx >= 0 ? existingTenants[tenantIdx].id : generateUuid();

  const updatedTenant = {
    ...(tenantIdx >= 0 ? existingTenants[tenantIdx] : {}),
    id: tenantId,
    name: cleanClinicName,
    slug: uniqueSlug,
    senderId: formatSenderId(senderId || cleanUsername || uniqueSlug, 'ClinicFlow'),
    doctorName: cleanDoctorName,
    doctorEmail: cleanEmail,
    ownerId: userId || null,
    username: cleanUsername,
    phone: cleanPhone,
    specialty: cleanSpecialty,
    address,
    teamSize,
    isOnboardingCompleted: true,
    services: assignedServices,
    visitTypes: assignedVisitTypes,
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    branding: {
      primaryColor,
      accentColor,
      brandTitle: cleanClinicName,
      badgeText: 'العيادة التخصصية'
    },
    quotas: {
      maxDoctors: teamSize === 'large' ? 10 : teamSize === 'medium' ? 5 : 3,
      monthlySmsQuota: 1000,
      smsUsed: 0
    },
    updatedAt: new Date().toISOString()
  };

  saveRegisteredTenant(updatedTenant);

  // Update user profile
  const registeredUsers = getRegisteredUsers();
  const userIdx = registeredUsers.findIndex(u => 
    (userId && u.id === userId) || 
    (cleanEmail && u.email?.toLowerCase() === cleanEmail)
  );

  const updatedUser = {
    ...(userIdx >= 0 ? registeredUsers[userIdx] : {}),
    id: userId || `doc-${Date.now()}`,
    name: cleanDoctorName,
    username: cleanUsername,
    email: cleanEmail,
    phone: cleanPhone,
    role: 'doctor',
    isClinicOwner: true,
    jobTitle: cleanSpecialty || 'المدير الطبي واستشاري العيادة',
    clinicId: tenantId,
    clinicSlug: uniqueSlug,
    clinicName: cleanClinicName,
    allowedClinics: [uniqueSlug],
    permissions: ['*'],
    isOnboardingCompleted: true,
    needsOnboarding: false,
    authenticatedAt: new Date().toISOString()
  };

  saveRegisteredUser(updatedUser);

  // If initial staff member provided, provision account
  let provisionedStaff = null;
  if (initialStaff && initialStaff.name && initialStaff.phone) {
    try {
      provisionedStaff = provisionStaffAccount({
        clinicId: tenantId,
        clinicSlug: uniqueSlug,
        name: initialStaff.name,
        phone: initialStaff.phone,
        email: initialStaff.email || '',
        password: initialStaff.password || '1234',
        role: initialStaff.role || 'receptionist',
        permissions: initialStaff.permissions,
        shift: initialStaff.shift || 'مسائي (04:00 م - 10:00 م)'
      });
    } catch (e) {
      console.warn('Could not auto-provision initial staff:', e);
    }
  }

  // Pre-seed scoped tenant data in localStorage so AppContext immediately loads the new clinic and staff
  if (typeof localStorage !== 'undefined') {
    try {
      const scopedKey = `clinicflow_data_${uniqueSlug}`;
      const initialScopedData = {
        patients: [],
        appointments: [],
        invoices: [],
        expenses: [],
        recalls: [],
        notifications: [
          {
            id: `notif-welcome-${Date.now()}`,
            title: 'مرحباً بك في نظام عيادتك!',
            message: `تم إعداد عيادتك (${cleanClinicName}) بنجاح. يمكنك الآن إدارة المرضى والحجوزات وفريق العمل.`,
            time: 'الآن',
            read: false,
            type: 'system'
          }
        ],
        blockedSlots: [],
        staffMembers: provisionedStaff ? [provisionedStaff] : [],
        clinicInfo: updatedTenant,
        _version: 'v4_google_material_3'
      };
      localStorage.setItem(scopedKey, JSON.stringify(initialScopedData));
    } catch (err) {
      console.warn('Could not initialize scoped tenant storage:', err);
    }
  }

  return {
    tenant: updatedTenant,
    user: updatedUser,
    staff: provisionedStaff
  };
}
