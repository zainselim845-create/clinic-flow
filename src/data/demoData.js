// ClinicFlow High-Standard Clinical Production Seed Data
// Realistic Egyptian Dental & Medical Clinic Profiles, Services, and Staff configurations.

export const defaultServices = [
  { id: 'srv-1', name: 'كشف وفحص تشخيصي شامل للأسنان', price: '300 ج.م', description: 'فحص شامل للفم والأسنان واللثة مع خطة العلاج المعتمدة' },
  { id: 'srv-2', name: 'استشارة ومتابعة بعد العلاج', price: '150 ج.م', description: 'مراجعة سريرية وتغيير الضمادات ومتابعة التئام اللثة' },
  { id: 'srv-3', name: 'جلسة تنظيف وتلميع وإزالة جير الأسنان', price: '400 ج.م', description: 'تنظيف عميق بجهاز الألتراسونيك وإزالة التصبغات السطحية' },
  { id: 'srv-4', name: 'حشو تجميلي كومبوزيت ليزر', price: '500 ج.م', description: 'ترميم السن بحشوة ضوئية مطابقة لدرجة لون السن الطبيعي' },
  { id: 'srv-5', name: 'علاج جذور وعصب السن (RCT)', price: '900 ج.م', description: 'تنظيف وحشو القنوات العصبية بجهاز الروتاري الرقمي' },
  { id: 'srv-6', name: 'طربوش / تاج زيركون تجميلي عالي الدقة', price: '1800 ج.م', description: 'تاج زيركون الماني لحماية السن وتجميل المظهر' },
  { id: 'srv-7', name: 'خلع ضرس عادي أو مخلخل', price: '400 ج.م', description: 'خلع آمن ومريح مع تخدير موضعي بدون ألم' },
  { id: 'srv-8', name: 'تبييض أسنان احترافي بالعيادة (Laser/LED)', price: '2000 ج.م', description: 'تفتيح فوري لدرجات بياض الأسنان بجلسة واحدة' },
  { id: 'srv-9', name: 'زراعة سن تيتانيوم ألماني فوري', price: '6500 ج.م', description: 'غرسة تيتانيوم متوافقة حيوياً مع دعامة التاج' }
];

export const expenseCategories = [
  'إيجار ومرافق',
  'رواتب ومكافآت',
  'مستلزمات وأدوية',
  'معامل وتركيبات',
  'صيانة ونثريات',
  'تسويق ودعاية'
];

export const recallPresets = [
  { id: 'rec-1', title: 'تنظيف وتلميع الأسنان الدوري', intervalMonths: 6, description: 'إزالة الجير والفحص الوقائي للثة والأسنان' },
  { id: 'rec-2', title: 'متابعة وفحص علاج الجذور والتاج', intervalMonths: 3, description: 'أشعة سينية للتأكد من استقرار حشو العصب والتئام العظم' },
  { id: 'rec-3', title: 'جلسة صيانة تبييض الأسنان', intervalMonths: 6, description: 'تلميع ومراجعة درجة البياض وإزالة التصبغات الجديدة' },
  { id: 'rec-4', title: 'متابعة تقويم الأسنان والواقي الليلي', intervalMonths: 1, description: 'شد وتعديل أسلاك التقويم وفحص حركة الأسنان' }
];

export const visitTypes = [
  { name: 'كشف عادي', value: 3, color: '#0071E3' },
  { name: 'متابعة', value: 2, color: '#10B981' },
  { name: 'استشارة', value: 2, color: '#8B5CF6' }
];

export const availableSlots = [
  '05:00 م', '05:30 م', '06:00 م', '06:30 م',
  '07:00 م', '07:30 م', '08:00 م', '08:30 م',
  '09:00 م', '09:30 م', '10:00 م'
];

export const clinicInfo = {
  name: 'مركز النخبة لطب وجراحة الأسنان',
  doctorName: 'د. أحمد الشريف',
  doctorEmail: 'doctor@clinicflow.com',
  specialty: 'طب وجراحة الفم والأسنان وتجميل الابتسامة',
  address: 'مصر الجديدة — شارع الأهرام، برج الأطباء، الدور الرابع',
  phone: '01006285031',
  regularFee: '300 ج.م',
  consultationFee: '150 ج.م',
  emergencyFee: '400 ج.م',
  services: defaultServices,
  workingHours: 'السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً',
  scheduleConfig: {
    workingDays: [6, 0, 1, 2, 3, 4],
    startTime: '17:00',
    endTime: '22:00',
    slotDuration: 30,
    workingHoursText: 'السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً'
  }
};

export const demoClinics = [
  {
    ...clinicInfo,
    id: '550e8400-e29b-41d4-a716-446655440000',
    slug: 'dr-ahmed',
    customDomain: 'dr-ahmed-dental.com',
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    branding: {
      primaryColor: '#0071E3',
      accentColor: '#10B981',
      badgeText: 'مركز الأسنان والابتسامة',
      brandTitle: 'كلينيك فلو دنتال'
    },
    quotas: {
      maxDoctors: 3,
      monthlySmsQuota: 2000,
      smsUsed: 340,
      aiTokensQuota: 10000000,
      aiTokensUsed: 1250000
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440099',
    slug: 'dr-sara',
    customDomain: 'drsara-clinic.com',
    name: 'عيادة د. سارة للجلدية والتجميل والليزر',
    doctorName: 'د. سارة محمود',
    doctorEmail: 'sara.clinic@clinicflow.com',
    specialty: 'استشاري الأمراض الجلدية وتجميل الليزر والحقن التجميلي',
    phone: '01123456780',
    address: 'التجمع الخامس — ميديكال سنتر 2، الدور الثالث',
    regularFee: '500 ج.م',
    consultationFee: '250 ج.م',
    emergencyFee: '600 ج.م',
    subscriptionTier: 'enterprise',
    subscriptionStatus: 'active',
    branding: {
      primaryColor: '#8B5CF6',
      accentColor: '#EC4899',
      badgeText: 'مركز الجلدية والتجميل',
      brandTitle: 'كلينيك فلو ديرما'
    },
    quotas: {
      maxDoctors: 10,
      monthlySmsQuota: 5000,
      smsUsed: 1120,
      aiTokensQuota: 25000000,
      aiTokensUsed: 4300000
    },
    services: [
      { id: 'srv-sara-1', name: 'كشف واستشارة جلدية متخصصة', price: '500 ج.م', description: 'فحص مجهري للجلد وتشخيص تساقط الشعر والتصبغات' },
      { id: 'srv-sara-2', name: 'جلسة فراكشنال ليزر نضارة وتفتيح', price: '1200 ج.م', description: 'علاج آثار حب الشباب وتجديد خلايا البشرة' },
      { id: 'srv-sara-3', name: 'جلسة حقن بوتوكس لإزالة التجاعيد', price: '2500 ج.م', description: 'حقن عضلات الوجه والجبهة بمادة معتمدة عالمياً' }
    ],
    workingHours: 'السبت - الأربعاء: ١:٠٠ م - ٨:٠٠ م',
    scheduleConfig: {
      workingDays: [6, 0, 1, 2, 3],
      startTime: '13:00',
      endTime: '20:00',
      slotDuration: 30,
      workingHoursText: 'السبت - الأربعاء: ١:٠٠ م - ٨:٠٠ م'
    }
  }
];

export const staffMembers = [
  {
    id: 'staff-1',
    name: 'سارة كمال (سكرتير أول)',
    email: 'sara@clinic.com',
    phone: '01012345678',
    password: '123',
    role: 'سكرتير أول',
    shift: 'مسائي (04:00 م - 10:00 م)',
    status: 'active',
    permissions: ['appointments', 'patients', 'invoices', 'inventory', 'sms', 'labs'],
    createdAt: '2026-01-10'
  },
  {
    id: 'staff-2',
    name: 'مريم حسني (سكرتير مساعد)',
    email: 'mariam@clinic.com',
    phone: '01123456789',
    password: '123',
    role: 'سكرتير مساعد',
    shift: 'صباحي (09:00 ص - 03:00 م)',
    status: 'active',
    permissions: ['appointments', 'patients', 'sms'],
    createdAt: '2026-02-01'
  },
  {
    id: 'staff-3',
    name: 'محمود طارق (مشرف استقبال ومخزون)',
    email: 'mahmoud@clinic.com',
    phone: '01234567890',
    password: '123',
    role: 'مدير إداري',
    shift: 'كامل (09:00 ص - 10:00 م)',
    status: 'active',
    permissions: ['appointments', 'invoices', 'inventory'],
    createdAt: '2026-02-15'
  }
];

import { getTodayDateStr } from '../utils/timeSlots';

// Seed templates for isolated tenant testing
export const getSeedPatientsAhmed = () => [
  {
    id: 'pat-ahmed-1',
    clinicId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'عمر عبد العزيز محمود',
    phone: '01001234567',
    age: '34',
    gender: 'ذكر',
    diagnosis: 'تسوس عميق بالضرس 46 مع التهاب عصب حاد',
    visitsCount: 4,
    lastVisit: getTodayDateStr()
  },
  {
    id: 'pat-ahmed-2',
    clinicId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'مينا سمير غالي',
    phone: '01223344556',
    age: '28',
    gender: 'ذكر',
    diagnosis: 'متابعة تقويم وتركيب واقي ليلي للأسنان',
    visitsCount: 2,
    lastVisit: getTodayDateStr()
  },
  {
    id: 'pat-ahmed-3',
    clinicId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'ياسمين عادل إبراهيم',
    phone: '01155667788',
    age: '31',
    gender: 'أنثى',
    diagnosis: 'تنظيف وتلميع وإزالة جير الأسنان الدوري',
    visitsCount: 1,
    lastVisit: getTodayDateStr()
  },
  {
    id: 'pat-ahmed-4',
    clinicId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'طارق مصطفى حسن',
    phone: '01098765432',
    age: '45',
    gender: 'ذكر',
    diagnosis: 'زراعة سن تيتانيوم أمامي',
    visitsCount: 3,
    lastVisit: '2026-08-20'
  },
  {
    id: 'pat-ahmed-5',
    clinicId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'فريدة شريف كامل',
    phone: '01055443322',
    age: '24',
    gender: 'أنثى',
    diagnosis: 'حشو تجميلي كومبوزيت ليزر بالفك العلوي',
    visitsCount: 2,
    lastVisit: getTodayDateStr()
  }
];

export const getSeedAppointmentsAhmed = () => {
  const today = getTodayDateStr();
  return [
    {
      id: 'appt-ahmed-1',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      bookingCode: 'CF-9021',
      patientId: 'pat-ahmed-1',
      patientName: 'عمر عبد العزيز محمود',
      patientPhone: '01001234567',
      date: today,
      time: '05:00 م',
      service: 'علاج جذور وعصب السن (RCT)',
      type: 'علاج جذور وعصب السن (RCT)',
      fee: '900 ج.م',
      status: 'in_progress',
      doctorName: 'د. أحمد الشريف',
      checkedInAt: new Date(Date.now() - 25 * 60000).toISOString(),
      consultationStartedAt: new Date(Date.now() - 10 * 60000).toISOString()
    },
    {
      id: 'appt-ahmed-2',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      bookingCode: 'CF-9022',
      patientId: 'pat-ahmed-2',
      patientName: 'مينا سمير غالي',
      patientPhone: '01223344556',
      date: today,
      time: '05:30 م',
      service: 'استشارة ومتابعة بعد العلاج',
      type: 'استشارة ومتابعة بعد العلاج',
      fee: '150 ج.م',
      status: 'waiting',
      doctorName: 'د. أحمد الشريف',
      checkedInAt: new Date(Date.now() - 15 * 60000).toISOString()
    },
    {
      id: 'appt-ahmed-3',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      bookingCode: 'CF-9023',
      patientId: 'pat-ahmed-3',
      patientName: 'ياسمين عادل إبراهيم',
      patientPhone: '01155667788',
      date: today,
      time: '06:00 م',
      service: 'جلسة تنظيف وتلميع وإزالة جير الأسنان',
      type: 'جلسة تنظيف وتلميع وإزالة جير الأسنان',
      fee: '400 ج.م',
      status: 'waiting',
      doctorName: 'د. أحمد الشريف',
      checkedInAt: new Date(Date.now() - 5 * 60000).toISOString()
    },
    {
      id: 'appt-ahmed-4',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      bookingCode: 'CF-9024',
      patientId: 'pat-ahmed-4',
      patientName: 'طارق مصطفى حسن',
      patientPhone: '01098765432',
      date: today,
      time: '07:00 م',
      service: 'كشف وفحص تشخيصي شامل للأسنان',
      type: 'كشف وفحص تشخيصي شامل للأسنان',
      fee: '300 ج.م',
      status: 'confirmed',
      doctorName: 'د. أحمد الشريف'
    },
    {
      id: 'appt-ahmed-5',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      bookingCode: 'CF-9020',
      patientId: 'pat-ahmed-5',
      patientName: 'فريدة شريف كامل',
      patientPhone: '01055443322',
      date: today,
      time: '04:30 م',
      service: 'حشو تجميلي كومبوزيت ليزر',
      type: 'حشو تجميلي كومبوزيت ليزر',
      fee: '500 ج.م',
      status: 'completed',
      doctorName: 'د. أحمد الشريف',
      checkedInAt: new Date(Date.now() - 90 * 60000).toISOString(),
      consultationStartedAt: new Date(Date.now() - 75 * 60000).toISOString(),
      consultationEndedAt: new Date(Date.now() - 45 * 60000).toISOString()
    }
  ];
};

export const getSeedInvoicesAhmed = () => {
  const today = getTodayDateStr();
  return [
    {
      id: 'inv-ahmed-1',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      invoiceNumber: 'INV-2026-001',
      patientId: 'pat-ahmed-5',
      patientName: 'فريدة شريف كامل',
      patientPhone: '01055443322',
      date: today,
      service: 'حشو تجميلي كومبوزيت ليزر',
      total: 500,
      amountPaid: 500,
      remainingAmount: 0,
      paymentMethod: 'cash',
      status: 'paid',
      createdAt: new Date(Date.now() - 45 * 60000).toISOString()
    }
  ];
};

export const getSeedExpensesAhmed = () => {
  const today = getTodayDateStr();
  return [
    {
      id: 'exp-ahmed-1',
      clinicId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'بنج موضعي ومستلزمات تعقيم وأقنعة',
      category: 'مستلزمات وأدوية',
      amount: 350,
      date: today,
      paidBy: 'د. أحمد الشريف',
      notes: 'شراء من شركة الدلتا للمستلزمات الطبية'
    }
  ];
};

export const patients = getSeedPatientsAhmed();
export const appointments = getSeedAppointmentsAhmed();
export const invoices = getSeedInvoicesAhmed();
export const expenses = getSeedExpensesAhmed();
export const recalls = [];
export const notifications = [];
export const blockedSlots = [];

export const getSeedPatientsSara = () => [
  {
    id: 'pat-sara-1',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    name: 'نورهان عبد الله الشامي',
    phone: '01011223344',
    age: '29',
    gender: 'أنثى',
    diagnosis: 'ندبات حب الشباب وتصبغات سطحية',
    visitsCount: 3,
    lastVisit: getTodayDateStr()
  },
  {
    id: 'pat-sara-2',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    name: 'هدى محمد القاضي',
    phone: '01122334455',
    age: '35',
    gender: 'أنثى',
    diagnosis: 'جلسة حقن بوتوكس لإزالة تجاعيد الجبهة',
    visitsCount: 2,
    lastVisit: getTodayDateStr()
  },
  {
    id: 'pat-sara-3',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    name: 'ريم محمود زكي',
    phone: '01233445566',
    age: '27',
    gender: 'أنثى',
    diagnosis: 'كشف واستشارة جلدية متخصصة وتساقط شعر',
    visitsCount: 1,
    lastVisit: getTodayDateStr()
  }
];

export const getSeedAppointmentsSara = () => {
  const today = getTodayDateStr();
  return [
    {
      id: 'appt-sara-1',
      clinicId: '550e8400-e29b-41d4-a716-446655440099',
      bookingCode: 'CF-8011',
      patientId: 'pat-sara-1',
      patientName: 'نورهان عبد الله الشامي',
      patientPhone: '01011223344',
      date: today,
      time: '02:00 م',
      service: 'جلسة فراكشنال ليزر نضارة وتفتيح',
      type: 'جلسة فراكشنال ليزر نضارة وتفتيح',
      fee: '1200 ج.م',
      status: 'in_progress',
      doctorName: 'د. سارة محمود',
      checkedInAt: new Date(Date.now() - 20 * 60000).toISOString(),
      consultationStartedAt: new Date(Date.now() - 8 * 60000).toISOString()
    },
    {
      id: 'appt-sara-2',
      clinicId: '550e8400-e29b-41d4-a716-446655440099',
      bookingCode: 'CF-8012',
      patientId: 'pat-sara-2',
      patientName: 'هدى محمد القاضي',
      patientPhone: '01122334455',
      date: today,
      time: '02:30 م',
      service: 'جلسة حقن بوتوكس لإزالة التجاعيد',
      type: 'جلسة حقن بوتوكس لإزالة التجاعيد',
      fee: '2500 ج.م',
      status: 'waiting',
      doctorName: 'د. سارة محمود',
      checkedInAt: new Date(Date.now() - 10 * 60000).toISOString()
    },
    {
      id: 'appt-sara-3',
      clinicId: '550e8400-e29b-41d4-a716-446655440099',
      bookingCode: 'CF-8010',
      patientId: 'pat-sara-3',
      patientName: 'ريم محمود زكي',
      patientPhone: '01233445566',
      date: today,
      time: '01:30 م',
      service: 'كشف واستشارة جلدية متخصصة',
      type: 'كشف واستشارة جلدية متخصصة',
      fee: '500 ج.م',
      status: 'completed',
      doctorName: 'د. سارة محمود',
      checkedInAt: new Date(Date.now() - 80 * 60000).toISOString(),
      consultationStartedAt: new Date(Date.now() - 65 * 60000).toISOString(),
      consultationEndedAt: new Date(Date.now() - 35 * 60000).toISOString()
    }
  ];
};

export const getSeedInvoicesSara = () => {
  const today = getTodayDateStr();
  return [
    {
      id: 'inv-sara-1',
      clinicId: '550e8400-e29b-41d4-a716-446655440099',
      invoiceNumber: 'INV-DERMA-001',
      patientId: 'pat-sara-3',
      patientName: 'ريم محمود زكي',
      patientPhone: '01233445566',
      date: today,
      service: 'كشف واستشارة جلدية متخصصة',
      total: 500,
      amountPaid: 500,
      remainingAmount: 0,
      paymentMethod: 'card',
      status: 'paid',
      createdAt: new Date(Date.now() - 35 * 60000).toISOString()
    }
  ];
};

export const getSeedExpensesSara = () => {
  const today = getTodayDateStr();
  return [
    {
      id: 'exp-sara-1',
      clinicId: '550e8400-e29b-41d4-a716-446655440099',
      title: 'سيروم ومواد هيدرافيشل وترطيب',
      category: 'مستلزمات وأدوية',
      amount: 400,
      date: today,
      paidBy: 'د. سارة محمود',
      notes: 'مستلزمات العيادة الأسبوعية'
    }
  ];
};

export const drSaraPatients = getSeedPatientsSara();
export const drSaraAppointments = getSeedAppointmentsSara();
export const drSaraInvoices = getSeedInvoicesSara();
export const drSaraExpenses = getSeedExpensesSara();
export const drSaraRecalls = [];
export const drSaraNotifications = [];
export const drSaraBlockedSlots = [];

export const drSaraStaffMembers = [
  {
    id: 'staff-sara-1',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    clinicSlug: 'dr-sara',
    allowedClinics: ['dr-sara'],
    name: 'مريم سمير (منسقة عيادة الجلدية)',
    email: 'mariam@sara-clinic.com',
    phone: '01198765432',
    password: '123',
    role: 'منسقة عيادة التجميل',
    shift: 'صباحي/مسائي (01:00 م - 08:00 م)',
    status: 'active',
    permissions: ['appointments', 'patients', 'invoices', 'inventory', 'sms'],
    createdAt: '2026-02-01'
  }
];

export const getInitialDataForTenant = (tenantOrSlug) => {
  const slug = typeof tenantOrSlug === 'string'
    ? tenantOrSlug
    : (tenantOrSlug?.slug || 'dr-ahmed');
  const targetId = typeof tenantOrSlug === 'object' ? tenantOrSlug?.id : null;

  if (slug === 'dr-sara' || targetId === '550e8400-e29b-41d4-a716-446655440099') {
    const saraClinic = demoClinics.find(c => c.slug === 'dr-sara') || demoClinics[1];
    return {
      patients: getSeedPatientsSara().map(p => ({ ...p, clinicId: '550e8400-e29b-41d4-a716-446655440099' })),
      appointments: getSeedAppointmentsSara().map(a => ({ ...a, clinicId: '550e8400-e29b-41d4-a716-446655440099' })),
      invoices: getSeedInvoicesSara(),
      expenses: getSeedExpensesSara(),
      recalls: drSaraRecalls,
      notifications: drSaraNotifications,
      blockedSlots: drSaraBlockedSlots,
      staffMembers: drSaraStaffMembers,
      clinicInfo: saraClinic
    };
  }

  if (slug === 'dr-ahmed' || targetId === '550e8400-e29b-41d4-a716-446655440000' || !tenantOrSlug) {
    // Default demo clinic (Dr. Ahmed dental)
    return {
      patients: getSeedPatientsAhmed().map(p => ({ ...p, clinicId: '550e8400-e29b-41d4-a716-446655440000' })),
      appointments: getSeedAppointmentsAhmed().map(a => ({ ...a, clinicId: '550e8400-e29b-41d4-a716-446655440000' })),
      invoices: getSeedInvoicesAhmed(),
      expenses: getSeedExpensesAhmed(),
      recalls,
      notifications,
      blockedSlots,
      staffMembers,
      clinicInfo: demoClinics[0] || clinicInfo
    };
  }

  // Any custom or newly provisioned clinic gets a clean, strictly isolated state
  const targetClinic = typeof tenantOrSlug === 'object' ? tenantOrSlug : { slug, name: slug };
  return {
    patients: [],
    appointments: [],
    invoices: [],
    expenses: [],
    recalls: [],
    notifications: [],
    blockedSlots: [],
    staffMembers: [],
    clinicInfo: targetClinic
  };
};

/**
 * Returns a 100% pristine clean slate with zero appointments or patients
 */
export const getCleanInitialDataForTenant = (tenantOrSlug) => {
  const initial = getInitialDataForTenant(tenantOrSlug);
  return {
    ...initial,
    patients: [],
    appointments: [],
    invoices: [],
    expenses: [],
    recalls: [],
    notifications: [],
    blockedSlots: []
  };
};

export const getInitialData = (tenantOrSlug = 'dr-ahmed') => {
  return getInitialDataForTenant(tenantOrSlug);
};
