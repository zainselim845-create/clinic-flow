// ClinicFlow High-Standard Clinical Production Seed Data
// Realistic Egyptian Dental & Medical Clinic Profiles, Patients, Appointments, and Records.

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
  doctorPassword: 'admin',
  specialty: 'طب وجراحة الفم والأسنان وتجميل الابتسامة',
  address: 'مصر الجديدة — شارع الأهرام، برج الأطباء، الدور الرابع',
  phone: '01006285031',
  regularFee: '300 ج.م',
  consultationFee: '150 ج.م',
  emergencyFee: '400 ج.م',
  services: defaultServices,
  workingHours: 'السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً',
  scheduleConfig: {
    workingDays: [6, 0, 1, 2, 3, 4], // Sat - Thu
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
    doctorPassword: 'admin',
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

export const patients = [
  {
    id: 'pat-1',
    name: 'عمر عبد العزيز محمود',
    phone: '01001234567',
    age: 34,
    gender: 'ذكر',
    bloodType: 'A+',
    fileNumber: 'D-101',
    diagnosis: 'تسوس عميق بالضرس 46 مع التهاب عصب حاد',
    allergies: 'حساسية البنسلين (Penicillin)',
    chronicConditions: 'لا يوجد',
    address: 'مصر الجديدة، القاهرة',
    visitsCount: 4,
    totalSpent: 3200,
    lastVisit: '2026-08-31',
    serviceHistory: ['كشف وفحص تشخيصي شامل للأسنان', 'علاج جذور وعصب السن (RCT)'],
    daysSinceLastVisit: 0,
    notes: 'تم البدء في علاج جذور القنوات العصبية، يحتاج لتاج زيركون نهائي.',
    createdAt: '2026-06-12'
  },
  {
    id: 'pat-2',
    name: 'سارة محمود إبراهيم',
    phone: '01112345678',
    age: 28,
    gender: 'أنثى',
    bloodType: 'O+',
    fileNumber: 'D-102',
    diagnosis: 'جلسة تنظيف وتلميع وإزالة جير الأسنان',
    allergies: 'لا يوجد',
    chronicConditions: 'لا يوجد',
    address: 'مدينة نصر، القاهرة',
    visitsCount: 3,
    totalSpent: 2800,
    lastVisit: '2026-08-17',
    serviceHistory: ['جلسة تنظيف وتلميع وإزالة جير الأسنان'],
    daysSinceLastVisit: 14,
    notes: 'صحة اللثة ممتازة. مهتمة بجلسة تبييض الأسنان بالليزر.',
    createdAt: '2026-05-10'
  },
  {
    id: 'pat-3',
    name: 'طارق الدسوقي خليل',
    phone: '01223456789',
    age: 52,
    gender: 'ذكر',
    bloodType: 'B+',
    fileNumber: 'D-103',
    diagnosis: 'فقدان الضرس 36 ويحتاج لزراعة سن تيتانيوم',
    allergies: 'حساسية السلفا',
    chronicConditions: 'ضغط دم مرتفع منتظم بالعلاج',
    address: 'التجمع الخامس، القاهرة الجديدة',
    visitsCount: 7,
    totalSpent: 8500,
    lastVisit: '2026-08-25',
    serviceHistory: ['خلع ضرس عادي أو مخلخل', 'زراعة سن تيتانيوم ألماني فوري'],
    daysSinceLastVisit: 6,
    notes: 'تم أخذ الأشعة المقطعية CBCT والتخطيط للغرسة.',
    createdAt: '2026-01-20'
  },
  {
    id: 'pat-4',
    name: 'نورهان خالد الشربيني',
    phone: '01098765432',
    age: 25,
    gender: 'أنثى',
    bloodType: 'A-',
    fileNumber: 'D-104',
    diagnosis: 'حشو تجميلي كومبوزيت ليزر للأسنان الأمامية',
    allergies: 'لا يوجد',
    chronicConditions: 'لا يوجد',
    address: 'المعادي، القاهرة',
    visitsCount: 2,
    totalSpent: 1400,
    lastVisit: '2026-08-28',
    serviceHistory: ['حشو تجميلي كومبوزيت ليزر'],
    daysSinceLastVisit: 3,
    notes: 'تم ترميم القواطع العلوية بنجاح والشكل الجمالي متناسق.',
    createdAt: '2026-07-01'
  },
  {
    id: 'pat-5',
    name: 'كريم السعيد عبد الله',
    phone: '01556789012',
    age: 41,
    gender: 'ذكر',
    bloodType: 'O-',
    fileNumber: 'D-105',
    diagnosis: 'تآكل في التيجان السابقة مع التهاب لثوي',
    allergies: 'لا يوجد',
    chronicConditions: 'سكر النوع الثاني',
    address: 'الشروق، القاهرة',
    visitsCount: 5,
    totalSpent: 5600,
    lastVisit: '2026-02-10',
    serviceHistory: ['كشف وفحص تشخيصي شامل للأسنان', 'طربوش / تاج زيركون تجميلي عالي الدقة'],
    daysSinceLastVisit: 202,
    notes: 'منقطع منذ 6 أشهر، مرشح رئيسي لحملات إعادة التنشيط والفحص الدوري.',
    createdAt: '2025-11-15'
  },
  {
    id: 'pat-6',
    name: 'رانيا فؤاد مصطفى',
    phone: '01065432109',
    age: 31,
    gender: 'أنثى',
    bloodType: 'AB+',
    fileNumber: 'D-106',
    diagnosis: 'تبييض أسنان احترافي بالعيادة (Laser/LED)',
    allergies: 'لا يوجد',
    chronicConditions: 'لا يوجد',
    address: 'الرحاب، القاهرة الجديدة',
    visitsCount: 4,
    totalSpent: 4200,
    lastVisit: '2026-08-30',
    serviceHistory: ['تبييض أسنان احترافي بالعيادة (Laser/LED)'],
    daysSinceLastVisit: 1,
    notes: 'تم الحصول على درجة بياض BL2، مسجلة لاستبيان الرضا بعد 24 ساعة.',
    createdAt: '2026-04-18'
  },
  {
    id: 'pat-7',
    name: 'يوسف الشناوي فهمي',
    phone: '01198765432',
    age: 22,
    gender: 'ذكر',
    bloodType: 'B-',
    fileNumber: 'D-107',
    diagnosis: 'بروز أسنان ويحتاج تقويم أسنان شفاف',
    allergies: 'لا يوجد',
    chronicConditions: 'لا يوجد',
    address: 'الدقي، الجيزة',
    visitsCount: 1,
    totalSpent: 300,
    lastVisit: '2026-08-31',
    serviceHistory: ['كشف وفحص تشخيصي شامل للأسنان'],
    daysSinceLastVisit: 0,
    notes: 'مريض جديد، موعده اليوم لأخذ المقاسات والصور الفوتوغرافية.',
    createdAt: '2026-08-30'
  },
  {
    id: 'pat-8',
    name: 'منى إبراهيم النجار',
    phone: '01287654321',
    age: 37,
    gender: 'أنثى',
    bloodType: 'A+',
    fileNumber: 'D-108',
    diagnosis: 'ألم مفصل الفك والصرير الليلي (Bruxism)',
    allergies: 'لا يوجد',
    chronicConditions: 'صداع نصفي',
    address: 'المهندسين، الجيزة',
    visitsCount: 3,
    totalSpent: 2200,
    lastVisit: '2026-08-10',
    serviceHistory: ['كشف وفحص تشخيصي شامل للأسنان'],
    daysSinceLastVisit: 21,
    notes: 'تم تسليم الواقي الليلي Night Guard، متابعة استرخاء عضلات الفك.',
    createdAt: '2026-06-05'
  },
  {
    id: 'pat-9',
    name: 'هشام البدري توفيق',
    phone: '01033445566',
    age: 46,
    gender: 'ذكر',
    bloodType: 'O+',
    fileNumber: 'D-109',
    diagnosis: 'كسر جزئي في الحافة القاطعة مع ألم عند المضغ',
    allergies: 'لا يوجد',
    chronicConditions: 'لا يوجد',
    address: 'الزمالك، القاهرة',
    visitsCount: 6,
    totalSpent: 7200,
    lastVisit: '2026-08-20',
    serviceHistory: ['طربوش / تاج زيركون تجميلي عالي الدقة'],
    daysSinceLastVisit: 11,
    notes: 'عميل VIP متميز، تم تركيب التاج الزيركون بنجاح فائق.',
    createdAt: '2026-02-18'
  },
  {
    id: 'pat-10',
    name: 'مريم الجندي رضوان',
    phone: '01155667788',
    age: 19,
    gender: 'أنثى',
    bloodType: 'A+',
    fileNumber: 'D-110',
    diagnosis: 'تسوس سطحي متعدد بين الأسنان (Proximal Caries)',
    allergies: 'لا يوجد',
    chronicConditions: 'لا يوجد',
    address: 'الهرم، الجيزة',
    visitsCount: 2,
    totalSpent: 1000,
    lastVisit: '2026-08-26',
    serviceHistory: ['حشو تجميلي كومبوزيت ليزر'],
    daysSinceLastVisit: 5,
    notes: 'مريض محال عن طريق كود الإحالة CF-REF-101.',
    createdAt: '2026-08-20'
  }
];

export const appointments = [
  {
    id: 'appt-101',
    patientId: 'pat-1',
    patientName: 'عمر عبد العزيز محمود',
    patientPhone: '01001234567',
    doctorName: 'د. أحمد الشريف',
    type: 'علاج جذور وعصب السن (RCT)',
    date: '2026-08-31',
    time: '05:00 م',
    status: 'in_progress', // In exam room now
    fee: '900 ج.م',
    bookingCode: '#CF-8101',
    notes: 'الجلسة الثانية لعلاج العصب وتجهيز حشو القنوات النهائي.',
    createdAt: '2026-08-28'
  },
  {
    id: 'appt-102',
    patientId: 'pat-7',
    patientName: 'يوسف الشناوي فهمي',
    patientPhone: '01198765432',
    doctorName: 'د. أحمد الشريف',
    type: 'كشف وفحص تشخيصي شامل للأسنان',
    date: '2026-08-31',
    time: '05:30 م',
    status: 'waiting', // In waiting room
    fee: '300 ج.م',
    bookingCode: '#CF-8102',
    notes: 'المريض في صالة الانتظار منذ 10 دقائق.',
    createdAt: '2026-08-30'
  },
  {
    id: 'appt-103',
    patientId: 'pat-4',
    patientName: 'نورهان خالد الشربيني',
    patientPhone: '01098765432',
    doctorName: 'د. أحمد الشريف',
    type: 'حشو تجميلي كومبوزيت ليزر',
    date: '2026-08-31',
    time: '06:00 م',
    status: 'booked', // Upcoming today
    fee: '500 ج.م',
    bookingCode: '#CF-8103',
    notes: 'تم تأكيد الموعد هاتفياً من قبل السكرتارية.',
    createdAt: '2026-08-29'
  },
  {
    id: 'appt-104',
    patientId: 'pat-3',
    patientName: 'طارق الدسوقي خليل',
    patientPhone: '01223456789',
    doctorName: 'د. أحمد الشريف',
    type: 'زراعة سن تيتانيوم ألماني فوري',
    date: '2026-08-31',
    time: '07:00 م',
    status: 'booked',
    fee: '6500 ج.م',
    bookingCode: '#CF-8104',
    notes: 'تجهيز غرفة العمليات والتعقيم لجلسة الغرس الجراحي.',
    createdAt: '2026-08-25'
  },
  {
    id: 'appt-105',
    patientId: 'pat-6',
    patientName: 'رانيا فؤاد مصطفى',
    patientPhone: '01065432109',
    doctorName: 'د. أحمد الشريف',
    type: 'تبييض أسنان احترافي بالعيادة (Laser/LED)',
    date: '2026-08-30',
    time: '06:30 م',
    status: 'completed',
    fee: '2000 ج.م',
    bookingCode: '#CF-8105',
    notes: 'تمت الجلسة بنجاح ورضا المريضة ممتاز.',
    createdAt: '2026-08-27'
  },
  {
    id: 'appt-106',
    patientId: 'pat-9',
    patientName: 'هشام البدري توفيق',
    patientPhone: '01033445566',
    doctorName: 'د. أحمد الشريف',
    type: 'طربوش / تاج زيركون تجميلي عالي الدقة',
    date: '2026-08-20',
    time: '08:00 م',
    status: 'completed',
    fee: '1800 ج.م',
    bookingCode: '#CF-8106',
    notes: 'تم تثبيت التاج وتعديل الإطباق.',
    createdAt: '2026-08-15'
  },
  {
    id: 'appt-107',
    patientId: 'pat-2',
    patientName: 'سارة محمود إبراهيم',
    patientPhone: '01112345678',
    doctorName: 'د. أحمد الشريف',
    type: 'جلسة تنظيف وتلميع وإزالة جير الأسنان',
    date: '2026-09-01',
    time: '05:00 م',
    status: 'booked',
    fee: '400 ج.م',
    bookingCode: '#CF-8107',
    notes: 'حجز مؤكد عبر الموقع الإلكتروني.',
    createdAt: '2026-08-30'
  },
  {
    id: 'appt-108',
    patientId: 'pat-5',
    patientName: 'كريم السعيد عبد الله',
    patientPhone: '01556789012',
    doctorName: 'د. أحمد الشريف',
    type: 'كشف وفحص تشخيصي شامل للأسنان',
    date: '2026-08-26',
    time: '08:30 م',
    status: 'cancelled',
    fee: '300 ج.م',
    bookingCode: '#CF-8108',
    notes: 'اعتذر لظرف طارئ في العمل، مسجل في قائمة استعادة الـ No-Show.',
    createdAt: '2026-08-24'
  }
];

export const invoices = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    patientId: 'pat-1',
    patientName: 'عمر عبد العزيز محمود',
    patientPhone: '01001234567',
    appointmentId: 'appt-101',
    date: '2026-08-31',
    items: [
      { id: 'item-1', name: 'علاج جذور وعصب السن (RCT)', price: 900, qty: 1 }
    ],
    subtotal: 900,
    discount: 0,
    patientShare: 900,
    paidAmount: 500,
    remainingBalance: 400,
    paymentStatus: 'partial',
    paymentMethod: 'cash',
    doctorName: 'د. أحمد الشريف',
    notes: 'دفعة أولى 500 ج.م، متبقي 400 ج.م عند الحشو النهائي.',
    createdAt: '2026-08-31T17:15:00Z'
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    patientId: 'pat-6',
    patientName: 'رانيا فؤاد مصطفى',
    patientPhone: '01065432109',
    appointmentId: 'appt-105',
    date: '2026-08-30',
    items: [
      { id: 'item-2', name: 'تبييض أسنان احترافي بالعيادة (Laser/LED)', price: 2000, qty: 1 }
    ],
    subtotal: 2000,
    discount: 200,
    patientShare: 1800,
    paidAmount: 1800,
    remainingBalance: 0,
    paymentStatus: 'paid',
    paymentMethod: 'visa',
    doctorName: 'د. أحمد الشريف',
    notes: 'سداد كامل بالبطاقة الائتمانية مع تطبيق خصم الحملة الصيفية.',
    createdAt: '2026-08-30T19:00:00Z'
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-003',
    patientId: 'pat-9',
    patientName: 'هشام البدري توفيق',
    patientPhone: '01033445566',
    appointmentId: 'appt-106',
    date: '2026-08-20',
    items: [
      { id: 'item-3', name: 'طربوش / تاج زيركون تجميلي عالي الدقة', price: 1800, qty: 1 }
    ],
    subtotal: 1800,
    discount: 0,
    patientShare: 1800,
    paidAmount: 1800,
    remainingBalance: 0,
    paymentStatus: 'paid',
    paymentMethod: 'instapay',
    doctorName: 'د. أحمد الشريف',
    notes: 'تم التحويل عبر تطبيق انستاباي Instapay بالكامل.',
    createdAt: '2026-08-20T20:30:00Z'
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2026-004',
    patientId: 'pat-3',
    patientName: 'طارق الدسوقي خليل',
    patientPhone: '01223456789',
    appointmentId: 'appt-104',
    date: '2026-08-31',
    items: [
      { id: 'item-4', name: 'زراعة سن تيتانيوم ألماني فوري (دفعة الحجز)', price: 6500, qty: 1 }
    ],
    subtotal: 6500,
    discount: 500,
    patientShare: 6000,
    paidAmount: 3000,
    remainingBalance: 3000,
    paymentStatus: 'partial',
    paymentMethod: 'cash',
    doctorName: 'د. أحمد الشريف',
    notes: 'مقدم زراعة سن 3000 ج.م ومتبقي 3000 ج.م عند تركيب الدعامة والتاج.',
    createdAt: '2026-08-31T18:00:00Z'
  },
  {
    id: 'inv-5',
    invoiceNumber: 'INV-2026-005',
    patientId: 'pat-4',
    patientName: 'نورهان خالد الشربيني',
    patientPhone: '01098765432',
    date: '2026-08-28',
    items: [
      { id: 'item-5', name: 'حشو تجميلي كومبوزيت ليزر', price: 500, qty: 2 }
    ],
    subtotal: 1000,
    discount: 0,
    patientShare: 1000,
    paidAmount: 1000,
    remainingBalance: 0,
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    doctorName: 'د. أحمد الشريف',
    notes: 'سداد نقدي كامل لجلستين حشو تجميلي.',
    createdAt: '2026-08-28T18:45:00Z'
  },
  {
    id: 'inv-6',
    invoiceNumber: 'INV-2026-006',
    patientId: 'pat-10',
    patientName: 'مريم الجندي رضوان',
    patientPhone: '01155667788',
    date: '2026-08-26',
    items: [
      { id: 'item-6', name: 'حشو تجميلي كومبوزيت ليزر', price: 500, qty: 1 }
    ],
    subtotal: 500,
    discount: 50,
    patientShare: 450,
    paidAmount: 450,
    remainingBalance: 0,
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    doctorName: 'د. أحمد الشريف',
    notes: 'تطبيق خصم 10% عبر كود الإحالة.',
    createdAt: '2026-08-26T17:30:00Z'
  }
];

export const expenses = [
  { id: 'exp-1', title: 'شراء كربولات بنج ليدوكايين وحقن معقمة', category: 'مستلزمات وأدوية', amount: 1850, date: '2026-08-28', paidTo: 'شركة الدلتا للتوريدات الطبية', notes: 'فاتورة رقم #9921' },
  { id: 'exp-2', title: 'سداد إيجار مقر العيادة لشهر أغسطس', category: 'إيجار ومرافق', amount: 8000, date: '2026-08-01', paidTo: 'إدارة برج الأطباء', notes: 'إيصال استلام رسمي' },
  { id: 'exp-3', title: 'راتب السكرتارية والتمريض', category: 'رواتب ومكافآت', amount: 9500, date: '2026-08-25', paidTo: 'طاقم العيادة', notes: 'رواتب الشهر + حوافز الانتظام' },
  { id: 'exp-4', title: 'تكلفة تصنيع طربوش زيركون عالي الدقة', category: 'معامل وتركيبات', amount: 1400, date: '2026-08-22', paidTo: 'معمل النخبة الرقمي للأسنان', notes: 'حالة المريض هشام البدري' },
  { id: 'exp-5', title: 'صيانة دورية لجهاز الأوتوكلاف ووحدة الأسنان', category: 'صيانة ونثريات', amount: 650, date: '2026-08-15', paidTo: 'المهندس كريم للصيانة الطبية', notes: 'تغيير فلاتر وجوانات' },
  { id: 'exp-6', title: 'شحن باقة رسائل SMS التسويقية والإشعارات', category: 'تسويق ودعاية', amount: 450, date: '2026-08-10', paidTo: 'بوابة إرسال SMS', notes: 'باقة 2500 رسالة' }
];

export const recalls = [
  { id: 'rec-101', patientId: 'pat-2', patientName: 'سارة محمود إبراهيم', patientPhone: '01112345678', reason: 'جلسة تنظيف وتلميع الأسنان الدوري (6 أشهر)', dueDate: '2026-09-10', status: 'pending' },
  { id: 'rec-102', patientId: 'pat-1', patientName: 'عمر عبد العزيز محمود', patientPhone: '01001234567', reason: 'متابعة وفحص علاج الجذور والتاج النهائي', dueDate: '2026-09-07', status: 'scheduled' },
  { id: 'rec-103', patientId: 'pat-5', patientName: 'كريم السعيد عبد الله', patientPhone: '01556789012', reason: 'فحص دوري ووقائي لصحة اللثة والأسنان', dueDate: '2026-08-20', status: 'pending' },
  { id: 'rec-104', patientId: 'pat-6', patientName: 'رانيا فؤاد مصطفى', patientPhone: '01065432109', reason: 'متابعة استقرار بياض الأسنان بعد التبييض', dueDate: '2026-09-30', status: 'pending' }
];

export const notifications = [
  { id: 'notif-1', title: 'حجز موعد إلكتروني جديد', message: 'قام المريض يوسف الشناوي بحجز موعد كشف تشخيصي عبر البوابة الإلكترونية.', time: 'منذ 25 دقيقة', read: false, type: 'booking' },
  { id: 'notif-2', title: 'تنبيه مخزون المستلزمات', message: 'رصيد كربولات البنج الموضعي ليدوكايين قارب على حد الأمان الأدنى (متبقي 2 عبوة).', time: 'منذ ساعتين', read: false, type: 'inventory' },
  { id: 'notif-3', title: 'استحقاق موعد استدعاء مريض', message: 'حان موعد الفحص الدوري للمريضة سارة محمود لتنظيف وتلميع الأسنان.', time: 'اليوم 09:00 ص', read: true, type: 'recall' },
  { id: 'notif-4', title: 'تحصيل دفعة مالية', message: 'تم استلام دفعة بقيمة 1800 ج.م عبر البطاقة الائتمانية لفاتورة INV-2026-002.', time: 'أمس 07:30 م', read: true, type: 'payment' }
];

export const blockedSlots = [
  { id: 'blk-1', date: '2026-09-05', time: 'FULL_DAY', isFullDay: true, reason: 'صيانة دورية وتعقيم شامل لعيادة الأسنان' }
];

export const weeklyStats = [
  { day: 'السبت', visits: 8, newPatients: 3 },
  { day: 'الأحد', visits: 10, newPatients: 4 },
  { day: 'الإثنين', visits: 9, newPatients: 2 },
  { day: 'الثلاثاء', visits: 11, newPatients: 5 },
  { day: 'الأربعاء', visits: 7, newPatients: 2 },
  { day: 'الخميس', visits: 12, newPatients: 6 },
  { day: 'الجمعة', visits: 0, newPatients: 0 }
];

// =========================================================================
// Dermatology Clinic (Dr. Sara) Dedicated Scoped Seed Dataset
// =========================================================================
export const drSaraPatients = [
  {
    id: 'pat-sara-1',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    name: 'نورهان عبد الله الشامي',
    phone: '01011223344',
    age: '27',
    gender: 'أنثى',
    bloodType: 'A+',
    diagnosis: 'ندبات وآثار حب الشباب بالوجه — خطة فراكشنال ليزر',
    notes: 'تم عمل اختبار حساسية للبشرة، استجابة ممتازة للفراكشنال ليزر',
    lastVisit: '2026-09-01',
    visitsCount: 3,
    totalVisits: 3,
    createdAt: '2026-06-15T10:00:00Z'
  },
  {
    id: 'pat-sara-2',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    name: 'ياسمين الشاذلي إبراهيم',
    phone: '01122334455',
    age: '35',
    gender: 'أنثى',
    bloodType: 'O+',
    diagnosis: 'تجاعيد تعبيرية بالجبهة وحول العينين — حقن بوتوكس',
    notes: 'تم حقن 35 وحدة بوتوكس أليرجان، تحديد موعد رتوش بعد أسبوعين',
    lastVisit: '2026-08-25',
    visitsCount: 2,
    totalVisits: 2,
    createdAt: '2026-07-20T11:30:00Z'
  },
  {
    id: 'pat-sara-3',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    name: 'هدى مصطفى منصور',
    phone: '01233445566',
    age: '42',
    gender: 'أنثى',
    bloodType: 'B+',
    diagnosis: 'تساقط شعر كربي وتراجع كثافة مقدمة الرأس',
    notes: 'بدء كورس بلازما PRP مع فيتامينات ميزوثيرابي',
    lastVisit: '2026-09-03',
    visitsCount: 4,
    totalVisits: 4,
    createdAt: '2026-05-10T14:00:00Z'
  },
  {
    id: 'pat-sara-4',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    name: 'كريم أشرف عبد العزيز',
    phone: '01555667788',
    age: '31',
    gender: 'ذكر',
    bloodType: 'A-',
    diagnosis: 'تصبغات جلدية شمسية وآثار حروق سطحية',
    notes: 'جلسة تقشير كيميائي سطحي وجلسة ليزر كربوني',
    lastVisit: '2026-08-18',
    visitsCount: 1,
    totalVisits: 1,
    createdAt: '2026-08-18T16:00:00Z'
  }
];

export const drSaraAppointments = [
  {
    id: 'appt-sara-1',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    patientId: 'pat-sara-1',
    patientName: 'نورهان عبد الله الشامي',
    patientPhone: '01011223344',
    date: '2026-09-08',
    time: '02:00 م',
    type: 'جلسة فراكشنال ليزر',
    fee: '1200 ج.م',
    status: 'in_progress',
    checkedInAt: '2026-09-08T11:45:00Z',
    consultationStartedAt: '2026-09-08T12:00:00Z',
    notes: 'الجلسة الثالثة لكورس فراكشنال ليزر الوجه',
    reminderSent: true,
    doctorName: 'د. سارة محمود'
  },
  {
    id: 'appt-sara-2',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    patientId: 'pat-sara-2',
    patientName: 'ياسمين الشاذلي إبراهيم',
    patientPhone: '01122334455',
    date: '2026-09-08',
    time: '03:00 م',
    type: 'جلسة حقن بوتوكس',
    fee: '2500 ج.م',
    status: 'waiting',
    checkedInAt: '2026-09-08T12:15:00Z',
    notes: 'رتوش ومراجعة نتيجة حقن البوتوكس',
    reminderSent: true,
    doctorName: 'د. سارة محمود'
  },
  {
    id: 'appt-sara-3',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    patientId: 'pat-sara-3',
    patientName: 'هدى مصطفى منصور',
    patientPhone: '01233445566',
    date: '2026-09-08',
    time: '04:30 م',
    type: 'كشف واستشارة جلدية',
    fee: '500 ج.م',
    status: 'upcoming',
    notes: 'فحص مجهري لبصيلات الشعر ومتابعة كورس العلاج',
    reminderSent: false,
    doctorName: 'د. سارة محمود'
  }
];

export const drSaraInvoices = [
  {
    id: 'inv-sara-1',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    invoiceNumber: 'INV-DERM-001',
    patientId: 'pat-sara-2',
    patientName: 'ياسمين الشاذلي إبراهيم',
    patientPhone: '01122334455',
    date: '2026-09-08',
    total: 2500,
    paidAmount: 2500,
    remainingBalance: 0,
    paymentStatus: 'paid',
    paymentMethod: 'visa',
    doctorName: 'د. سارة محمود',
    notes: 'جلسة بوتوكس كاملة مع ضمان الرتوش',
    createdAt: '2026-09-08T11:00:00Z'
  },
  {
    id: 'inv-sara-2',
    clinicId: '550e8400-e29b-41d4-a716-446655440099',
    invoiceNumber: 'INV-DERM-002',
    patientId: 'pat-sara-1',
    patientName: 'نورهان عبد الله الشامي',
    patientPhone: '01011223344',
    date: '2026-09-08',
    total: 1200,
    paidAmount: 1200,
    remainingBalance: 0,
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    doctorName: 'د. سارة محمود',
    notes: 'جلسة فراكشنال ليزر للوجه والرقبة',
    createdAt: '2026-09-08T11:45:00Z'
  }
];

export const drSaraExpenses = [
  { id: 'exp-sara-1', title: 'توريد خراطيش ليزر أصلية من وكيل كانديلا', category: 'مستلزمات وأدوية', amount: 4500, date: '2026-09-02', paidTo: 'الشركة الدولية للأجهزة الطبية والليزرات', notes: 'خراطيش كانديلا جنتل برو' },
  { id: 'exp-sara-2', title: 'شراء أمبولات بوتوكس وديسبورت معتمدة', category: 'مستلزمات وأدوية', amount: 9200, date: '2026-09-01', paidTo: 'مستودع الأدوية المعتمد', notes: 'فاتورة رسمية تشمل ضريبة القيمة المضافة' },
  { id: 'exp-sara-3', title: 'إيجار مقر عيادة التجمع الخامس ميديكال سنتر 2', category: 'إيجار ومرافق', amount: 14000, date: '2026-09-01', paidTo: 'إدارة ميديكال سنتر 2', notes: 'إيجار شهر سبتمبر 2026' }
];

export const drSaraRecalls = [
  { id: 'rec-sara-1', patientId: 'pat-sara-2', patientName: 'ياسمين الشاذلي إبراهيم', patientPhone: '01122334455', reason: 'جلسة رتوش البوتوكس المجانية (أسبوعين)', dueDate: '2026-09-22', status: 'pending' },
  { id: 'rec-sara-2', patientId: 'pat-sara-1', patientName: 'نورهان عبد الله الشامي', patientPhone: '01011223344', reason: 'جلسة الفراكشنال ليزر الرابعة (بعد 4 أسابيع)', dueDate: '2026-10-06', status: 'pending' }
];

export const drSaraNotifications = [
  { id: 'notif-sara-1', title: 'حجز جلسة ليزر جديدة', message: 'تم حجز جلسة فراكشنال ليزر للمريضة نورهان عبد الله.', time: 'منذ 10 دقائق', read: false, type: 'booking' },
  { id: 'notif-sara-2', title: 'استحقاق رتوش بوتوكس', message: 'حان موعد رتوش البوتوكس للمريضة ياسمين الشاذلي.', time: 'منذ ساعتين', read: true, type: 'recall' }
];

export const drSaraBlockedSlots = [
  { id: 'blk-sara-1', date: '2026-09-10', time: 'FULL_DAY', isFullDay: true, reason: 'مؤتمر الجمعية المصرية لأطباء الجلدية والتجميل' }
];

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
      patients: drSaraPatients.map(p => ({ ...p, clinicId: p.clinicId || '550e8400-e29b-41d4-a716-446655440099', clinic_id: p.clinic_id || '550e8400-e29b-41d4-a716-446655440099' })),
      appointments: drSaraAppointments.map(a => ({ ...a, clinicId: a.clinicId || '550e8400-e29b-41d4-a716-446655440099', clinic_id: a.clinic_id || '550e8400-e29b-41d4-a716-446655440099' })),
      invoices: drSaraInvoices,
      expenses: drSaraExpenses,
      recalls: drSaraRecalls,
      notifications: drSaraNotifications,
      blockedSlots: drSaraBlockedSlots,
      staffMembers: drSaraStaffMembers,
      clinicInfo: saraClinic
    };
  }

  // Default to Dr. Ahmed's clinic (dental)
  return {
    patients: patients.map(p => ({ ...p, clinicId: p.clinicId || '550e8400-e29b-41d4-a716-446655440000', clinic_id: p.clinic_id || '550e8400-e29b-41d4-a716-446655440000' })),
    appointments: appointments.map(a => ({ ...a, clinicId: a.clinicId || '550e8400-e29b-41d4-a716-446655440000', clinic_id: a.clinic_id || '550e8400-e29b-41d4-a716-446655440000' })),
    invoices,
    expenses,
    recalls,
    notifications,
    blockedSlots,
    staffMembers,
    clinicInfo: demoClinics[0] || clinicInfo
  };
};

export const getInitialData = (tenantOrSlug = 'dr-ahmed') => {
  return getInitialDataForTenant(tenantOrSlug);
};

