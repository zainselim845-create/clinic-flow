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
  { name: 'كشف عادي', value: 3, color: '#09090B' },
  { name: 'متابعة', value: 2, color: '#10B981' },
  { name: 'استشارة', value: 2, color: '#09090B' }
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
  senderId: 'DrAhmed',
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
    senderId: 'DrAhmed',
    customDomain: 'dr-ahmed-dental.com',
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    branding: {
      primaryColor: '#09090B',
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
    senderId: 'SaraDerma',
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
  },
  {
    id: 'clinic-zainselim845',
    slug: 'dr-zainselim845',
    senderId: 'ZainSelim',
    customDomain: 'zainselim-clinic.com',
    name: 'عيادة د. zain selim',
    doctorName: 'د. zain selim',
    doctorEmail: 'zainselim845@gmail.com',
    specialty: 'طب وجراحة الفم والأسنان وتجميل الابتسامة',
    phone: '01006285031',
    address: 'القاهرة — التجمع الخامس، شارع التسعين، مجمع الميديكال بارك',
    regularFee: '350 ج.م',
    consultationFee: '200 ج.م',
    emergencyFee: '500 ج.م',
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    branding: {
      primaryColor: '#09090B',
      accentColor: '#10B981',
      badgeText: 'العيادة التخصصية',
      brandTitle: 'كلينيك فلو'
    },
    quotas: {
      maxDoctors: 3,
      monthlySmsQuota: 2000,
      smsUsed: 210,
      aiTokensQuota: 10000000,
      aiTokensUsed: 650000
    },
    services: defaultServices,
    workingHours: 'السبت - الخميس: ٥:٠٠ م - ١٠:٠٠ م',
    scheduleConfig: {
      workingDays: [6, 0, 1, 2, 3, 4],
      startTime: '17:00',
      endTime: '22:00',
      slotDuration: 30,
      workingHoursText: 'السبت - الخميس: ٥:٠٠ م - ١٠:٠٠ م'
    }
  }
];

export const staffMembers = [];

// Clean zero-state seed templates (Zero Demo Contamination)
export const getSeedPatientsAhmed = () => [];
export const getSeedAppointmentsAhmed = () => [];
export const getSeedInvoicesAhmed = () => [];
export const getSeedExpensesAhmed = () => [];

export const patients = [];
export const appointments = [];
export const invoices = [];
export const expenses = [];
export const recalls = [];
export const notifications = [];
export const blockedSlots = [];

export const getSeedPatientsSara = () => [];
export const getSeedAppointmentsSara = () => [];
export const getSeedInvoicesSara = () => [];
export const getSeedExpensesSara = () => [];

export const drSaraPatients = [];
export const drSaraAppointments = [];
export const drSaraInvoices = [];
export const drSaraExpenses = [];
export const drSaraRecalls = [];
export const drSaraNotifications = [];
export const drSaraBlockedSlots = [];

export const drSaraStaffMembers = [];

export const getInitialDataForTenant = (tenantOrSlug) => {
  const slug = typeof tenantOrSlug === 'string'
    ? tenantOrSlug
    : (tenantOrSlug?.slug || 'dr-ahmed');
  const targetId = typeof tenantOrSlug === 'object' ? tenantOrSlug?.id : null;

  let matchedClinic = demoClinics.find(c => c.slug === slug || c.id === targetId || c.id === slug);
  if (!matchedClinic && typeof tenantOrSlug === 'object') {
    matchedClinic = tenantOrSlug;
  }
  if (!matchedClinic) {
    matchedClinic = { slug, name: slug };
  }

  return {
    patients: [],
    appointments: [],
    invoices: [],
    expenses: [],
    recalls: [],
    notifications: [],
    blockedSlots: [],
    staffMembers: [],
    clinicInfo: matchedClinic
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
