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
  { id: 'srv-1', name: 'كشف واستشارة تخصصية', price: '300 ج.م', duration: 30, description: 'فحص سريري دقيق ومراجعة التاريخ المرضي والفحوصات المعملية' },
  { id: 'srv-2', name: 'استشارة ومتابعة علاجية', price: '150 ج.م', duration: 20, description: 'متابعة الحالة بعد الفحوصات وتعديل الجرعات الدوائية' },
  { id: 'srv-3', name: 'فحص سونار بطن وحوض', price: '400 ج.م', duration: 30, description: 'فحص بالموجات فوق الصوتية لأعضاء البطن والجهاز الهضمي' },
  { id: 'srv-4', name: 'فحص شامل وتقييم وقائي', price: '500 ج.م', duration: 45, description: 'فحص شامل للضغط والسكر والكبد والكلى وتخطيط صحي وقائي' }
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
    permissions: ['appointments', 'patients', 'whatsapp', 'exports'],
    createdAt: '2026-01-15'
  }
];

export const clinicInfo = {
  name: 'عيادة د. أحمد الشريف',
  doctorName: 'د. أحمد الشريف',
  doctorEmail: 'doctor@clinicflow.com',
  doctorPassword: 'admin',
  specialty: 'استشاري الباطنة والجهاز الهضمي والكبد',
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
