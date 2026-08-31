// Clean Production Slate
export const patients = [];
export const appointments = [];
export const notifications = [];
export const blockedSlots = [];
export const prescriptions = [];
export const expenses = [];
export const recalls = [];

export const expenseCategories = [
  'إيجار ومرافق',
  'رواتب ومكافآت',
  'مستلزمات وأدوية',
  'معامل وتركيبات',
  'صيانة ونثريات',
  'تسويق ودعاية'
];

export const recallPresets = [
  { id: 'rec-1', title: 'متابعة وفحص السكر الدوري', intervalMonths: 3, description: 'إعادة قياس السكر التراكمي ووظائف الكلى' },
  { id: 'rec-2', title: 'فحص ومتابعة ضغط الدم', intervalMonths: 2, description: 'تقييم كفاءة العلاج واستقرار قراءات الضغط' },
  { id: 'rec-3', title: 'تنظيف وتلميع الأسنان الدوري', intervalMonths: 6, description: 'إزالة الجير والفحص الوقائي للثة والأسنان' },
  { id: 'rec-4', title: 'فحص سونار ومتابعة سنوية', intervalMonths: 12, description: 'فحص وقائي سنوي شامل للأعضاء الحيوية' }
];

export const weeklyStats = [
  { day: 'السبت', visits: 0, newPatients: 0 },
  { day: 'الأحد', visits: 0, newPatients: 0 },
  { day: 'الإثنين', visits: 0, newPatients: 0 },
  { day: 'الثلاثاء', visits: 0, newPatients: 0 },
  { day: 'الأربعاء', visits: 0, newPatients: 0 },
  { day: 'الخميس', visits: 0, newPatients: 0 },
  { day: 'الجمعة', visits: 0, newPatients: 0 }
];

export const defaultServices = [
  { id: 'srv-1', name: 'كشف وفحص تشخيصي شامل للأسنان', price: '300 ج.م', duration: 30, description: 'فحص شامل للفم والأسنان واللثة مع خطة العلاج المعتمدة' },
  { id: 'srv-2', name: 'جلسة تنظيف وتلميع وإزالة جير الأسنان', price: '400 ج.م', duration: 30, description: 'تنظيف عميق بجهاز الألتراسونيك وإزالة التصبغات السطحية' },
  { id: 'srv-3', name: 'حشو تجميلي كومبوزيت ليزر', price: '500 ج.م', duration: 30, description: 'ترميم السن بحشوة ضوئية مطابقة لدرجة لون السن الطبيعي' },
  { id: 'srv-4', name: 'علاج جذور وعصب السن (RCT)', price: '900 ج.م', duration: 45, description: 'تنظيف وحشو القنوات العصبية بجهاز الروتاري الرقمي' },
  { id: 'srv-5', name: 'طربوش / تاج زيركون تجميلي عالي الدقة', price: '1800 ج.م', duration: 45, description: 'تاج زيركون الماني لحماية السن وتجميل المظهر' },
  { id: 'srv-6', name: 'خلع ضرس عادي أو مخلخل', price: '400 ج.م', duration: 25, description: 'خلع آمن ومريح مع تخدير موضعي بدون ألم' },
  { id: 'srv-7', name: 'تبييض أسنان احترافي بالعيادة (Laser/LED)', price: '2000 ج.م', duration: 45, description: 'تفتيح فوري لدرجات بياض الأسنان بجلسة واحدة' }
];

export const visitTypes = [
  { name: 'كشف عادي', value: 0, color: '#3b82f6' },
  { name: 'متابعة', value: 0, color: '#10b981' },
  { name: 'استشارة', value: 0, color: '#8b5cf6' },
  { name: 'طوارئ', value: 0, color: '#ef4444' }
];

export const availableSlots = [
  '05:00 م', '05:30 م', '06:00 م', '06:30 م',
  '07:00 م', '07:30 م', '08:00 م', '08:30 م',
  '09:00 م', '09:30 م', '10:00 م'
];

export const staffMembers = [
  {
    id: 'staff-1',
    name: 'سارة كمال (سكرتارية أولى)',
    email: 'sara.reception@clinic.com',
    phone: '01012345678',
    password: '123',
    role: 'سكرتير أول',
    shift: 'مسائي (04:00 م - 10:00 م)',
    status: 'active',
    permissions: ['appointments', 'patients', 'sms', 'exports'],
    createdAt: '2026-01-15'
  }
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
  services: defaultServices,

  workingHours: 'السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً',
  scheduleConfig: {
    workingDays: [6, 0, 1, 2, 3, 4], // 6: Sat, 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu (5: Fri off)
    startTime: '17:00',
    endTime: '22:00',
    slotDuration: 30,
    workingHoursText: 'السبت - الخميس: ٥:٠٠ مساءً - ١٠:٠٠ مساءً'
  }
};

export const getInitialData = () => ({
  patients: [],
  appointments: [],
  notifications: [],
  blockedSlots: [],
  prescriptions: [],
  expenses: [],
  recalls: [],
  staffMembers,
  clinicInfo
});
