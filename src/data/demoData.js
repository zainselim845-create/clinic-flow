export const patients = [
  { id: 'p1', name: 'أحمد محمد علي', age: 45, gender: 'ذكر', phone: '01011112222', email: 'ahmed.m@example.com', diagnosis: 'ضغط دم مرتفع', notes: 'يحتاج إلى متابعة الضغط أسبوعياً', createdAt: '2026-05-10T10:00:00Z', lastVisit: '2026-08-01T10:30:00Z', totalVisits: 5, bloodType: 'A+' },
  { id: 'p2', name: 'فاطمة حسن إبراهيم', age: 60, gender: 'أنثى', phone: '01122223333', email: 'fatima.h@example.com', diagnosis: 'سكري نوع ٢', notes: 'الالتزام بالنظام الغذائي ضروري', createdAt: '2026-06-15T09:00:00Z', lastVisit: '2026-08-05T11:00:00Z', totalVisits: 3, bloodType: 'O+' },
  { id: 'p3', name: 'محمود عبد الله صالح', age: 32, gender: 'ذكر', phone: '01233334444', email: 'mahmoud.a@example.com', diagnosis: 'حساسية موسمية', notes: 'تجنب التعرض للأتربة', createdAt: '2026-07-20T12:00:00Z', lastVisit: '2026-08-10T14:00:00Z', totalVisits: 2, bloodType: 'B+' },
  { id: 'p4', name: 'سارة كمال مصطفى', age: 28, gender: 'أنثى', phone: '01544445555', email: 'sara.k@example.com', diagnosis: 'صداع نصفي', notes: 'يتم تناول الدواء عند اللزوم', createdAt: '2026-04-12T09:30:00Z', lastVisit: '2026-07-25T13:00:00Z', totalVisits: 8, bloodType: 'AB+' },
  { id: 'p5', name: 'عمرو يوسف طارق', age: 55, gender: 'ذكر', phone: '01055556666', email: 'amr.y@example.com', diagnosis: 'قرحة معدة', notes: 'تجنب الأطعمة الحارة والمقليات', createdAt: '2026-06-05T11:15:00Z', lastVisit: '2026-08-02T10:00:00Z', totalVisits: 4, bloodType: 'O-' },
  { id: 'p6', name: 'ندى سمير عباس', age: 40, gender: 'أنثى', phone: '01166667777', email: '', diagnosis: 'نقص فيتامين د', notes: 'تناول المكملات بانتظام والتعرض للشمس', createdAt: '2026-07-01T10:00:00Z', lastVisit: '2026-08-12T12:00:00Z', totalVisits: 2, bloodType: 'A-' },
  { id: 'p7', name: 'خالد جمال فريد', age: 65, gender: 'ذكر', phone: '01277778888', email: 'khaled.j@example.com', diagnosis: 'التهاب مفاصل', notes: 'عمل جلسات علاج طبيعي', createdAt: '2026-03-20T14:00:00Z', lastVisit: '2026-08-08T15:30:00Z', totalVisits: 12, bloodType: 'B-' },
  { id: 'p8', name: 'مريم أحمد شوقي', age: 22, gender: 'أنثى', phone: '01588889999', email: 'mariam.s@example.com', diagnosis: 'انيميا', notes: 'زيادة تناول الأطعمة الغنية بالحديد', createdAt: '2026-07-15T09:00:00Z', lastVisit: '2026-08-06T10:00:00Z', totalVisits: 1, bloodType: 'AB-' },
  { id: 'p9', name: 'طارق حسين عبد الرحمن', age: 50, gender: 'ذكر', phone: '01099990000', email: 'tarek.h@example.com', diagnosis: 'ارتجاع مريء', notes: 'عدم النوم مباشرة بعد الأكل', createdAt: '2026-05-25T11:30:00Z', lastVisit: '2026-08-09T16:00:00Z', totalVisits: 6, bloodType: 'O+' },
  { id: 'p10', name: 'هدى محمود نبيل', age: 48, gender: 'أنثى', phone: '01100001111', email: '', diagnosis: 'ربو', notes: 'استخدام البخاخ بانتظام', createdAt: '2026-06-10T13:00:00Z', lastVisit: '2026-08-11T12:30:00Z', totalVisits: 4, bloodType: 'A+' },
  { id: 'p11', name: 'مصطفى رجب خليل', age: 38, gender: 'ذكر', phone: '01211112233', email: 'mostafa.r@example.com', diagnosis: 'التهاب رئوي', notes: 'إنهاء كورس المضاد الحيوي بالكامل', createdAt: '2026-08-01T09:00:00Z', lastVisit: '2026-08-07T10:00:00Z', totalVisits: 2, bloodType: 'B+' },
  { id: 'p12', name: 'ياسمين فؤاد عادل', age: 26, gender: 'أنثى', phone: '01522223344', email: 'yasmine.f@example.com', diagnosis: 'حساسية', notes: 'استخدام مضادات الهيستامين', createdAt: '2026-07-10T14:00:00Z', lastVisit: '2026-08-03T15:00:00Z', totalVisits: 3, bloodType: 'O-' },
  { id: 'p13', name: 'سامي عثمان جابر', age: 72, gender: 'ذكر', phone: '01033334455', email: 'sami.o@example.com', diagnosis: 'ضغط دم مرتفع وسكري', notes: 'متابعة دورية كل أسبوعين', createdAt: '2026-02-15T10:00:00Z', lastVisit: '2026-08-05T09:30:00Z', totalVisits: 15, bloodType: 'A-' },
  { id: 'p14', name: 'ريم سعد عبد العزيز', age: 34, gender: 'أنثى', phone: '01144445566', email: '', diagnosis: 'قولون عصبي', notes: 'الابتعاد عن التوتر والقلق', createdAt: '2026-06-22T11:00:00Z', lastVisit: '2026-08-10T11:30:00Z', totalVisits: 5, bloodType: 'AB+' },
  { id: 'p15', name: 'عمر فاروق توفيق', age: 29, gender: 'ذكر', phone: '01255556677', email: 'omar.f@example.com', diagnosis: 'تمزق عضلي', notes: 'راحة تامة لمدة أسبوعين', createdAt: '2026-08-05T13:00:00Z', lastVisit: '2026-08-12T14:00:00Z', totalVisits: 2, bloodType: 'B-' }
];

// Reference Today is 2026-08-13
export const appointments = [
  // Past
  { id: 'a1', patientId: 'p1', patientName: 'أحمد محمد علي', patientPhone: '01011112222', date: '2026-08-01', time: '10:30', type: 'كشف عادي', status: 'completed', notes: 'الضغط مستقر', reminderSent: true },
  { id: 'a2', patientId: 'p5', patientName: 'عمرو يوسف طارق', patientPhone: '01055556666', date: '2026-08-02', time: '10:00', type: 'متابعة', status: 'completed', notes: 'تحسن ملحوظ', reminderSent: true },
  { id: 'a3', patientId: 'p12', patientName: 'ياسمين فؤاد عادل', patientPhone: '01522223344', date: '2026-08-03', time: '15:00', type: 'استشارة', status: 'completed', notes: '', reminderSent: true },
  { id: 'a4', patientId: 'p2', patientName: 'فاطمة حسن إبراهيم', patientPhone: '01122223333', date: '2026-08-05', time: '11:00', type: 'متابعة', status: 'completed', notes: 'تعديل جرعة الدواء', reminderSent: true },
  { id: 'a5', patientId: 'p13', patientName: 'سامي عثمان جابر', patientPhone: '01033334455', date: '2026-08-05', time: '09:30', type: 'كشف عادي', status: 'completed', notes: 'التحاليل سليمة', reminderSent: true },
  { id: 'a6', patientId: 'p8', patientName: 'مريم أحمد شوقي', patientPhone: '01588889999', date: '2026-08-06', time: '10:00', type: 'متابعة', status: 'completed', notes: '', reminderSent: true },
  { id: 'a7', patientId: 'p11', patientName: 'مصطفى رجب خليل', patientPhone: '01211112233', date: '2026-08-07', time: '10:00', type: 'استشارة', status: 'cancelled', notes: 'المريض اعتذر', reminderSent: false },
  { id: 'a8', patientId: 'p7', patientName: 'خالد جمال فريد', patientPhone: '01277778888', date: '2026-08-08', time: '15:30', type: 'متابعة', status: 'completed', notes: 'استمرار الجلسات', reminderSent: true },
  { id: 'a9', patientId: 'p9', patientName: 'طارق حسين عبد الرحمن', patientPhone: '01099990000', date: '2026-08-09', time: '16:00', type: 'كشف عادي', status: 'completed', notes: '', reminderSent: true },
  { id: 'a10', patientId: 'p3', patientName: 'محمود عبد الله صالح', patientPhone: '01233334444', date: '2026-08-10', time: '14:00', type: 'استشارة', status: 'completed', notes: '', reminderSent: true },
  { id: 'a11', patientId: 'p14', patientName: 'ريم سعد عبد العزيز', patientPhone: '01144445566', date: '2026-08-10', time: '11:30', type: 'متابعة', status: 'completed', notes: '', reminderSent: true },
  { id: 'a12', patientId: 'p10', patientName: 'هدى محمود نبيل', patientPhone: '01100001111', date: '2026-08-11', time: '12:30', type: 'متابعة', status: 'completed', notes: 'تحسن الحالة', reminderSent: true },
  { id: 'a13', patientId: 'p6', patientName: 'ندى سمير عباس', patientPhone: '01166667777', date: '2026-08-12', time: '12:00', type: 'أشعة', status: 'completed', notes: 'تم عمل الأشعة', reminderSent: true },
  { id: 'a14', patientId: 'p15', patientName: 'عمر فاروق توفيق', patientPhone: '01255556677', date: '2026-08-12', time: '14:00', type: 'طوارئ', status: 'completed', notes: 'إصابة عمل', reminderSent: true },
  // Today (2026-08-13)
  { id: 'a15', patientId: 'p1', patientName: 'أحمد محمد علي', patientPhone: '01011112222', date: '2026-08-13', time: '12:00', type: 'متابعة', status: 'upcoming', notes: '', reminderSent: false },
  { id: 'a16', patientId: 'p4', patientName: 'سارة كمال مصطفى', patientPhone: '01544445555', date: '2026-08-13', time: '13:30', type: 'كشف عادي', status: 'upcoming', notes: '', reminderSent: false },
  { id: 'a17', patientId: 'p2', patientName: 'فاطمة حسن إبراهيم', patientPhone: '01122223333', date: '2026-08-13', time: '16:00', type: 'متابعة', status: 'upcoming', notes: '', reminderSent: false },
  // Future
  { id: 'a18', patientId: 'p5', patientName: 'عمرو يوسف طارق', patientPhone: '01055556666', date: '2026-08-15', time: '10:00', type: 'استشارة', status: 'upcoming', notes: '', reminderSent: false },
  { id: 'a19', patientId: 'p11', patientName: 'مصطفى رجب خليل', patientPhone: '01211112233', date: '2026-08-16', time: '11:00', type: 'كشف عادي', status: 'upcoming', notes: '', reminderSent: false },
  { id: 'a20', patientId: 'p7', patientName: 'خالد جمال فريد', patientPhone: '01277778888', date: '2026-08-17', time: '09:30', type: 'متابعة', status: 'upcoming', notes: '', reminderSent: false }
];

export const notifications = [
  { id: 'n1', type: 'appointment', title: 'موعد جديد', message: 'تم حجز موعد جديد للمريض أحمد محمد علي', timestamp: '2026-08-12T09:00:00Z', read: true, relatedId: 'a15' },
  { id: 'n2', type: 'new_patient', title: 'مريض جديد', message: 'تم تسجيل المريض عمر فاروق توفيق بالعيادة', timestamp: '2026-08-05T13:05:00Z', read: true, relatedId: 'p15' },
  { id: 'n3', type: 'cancelled', title: 'إلغاء موعد', message: 'قام المريض مصطفى رجب خليل بإلغاء موعده', timestamp: '2026-08-06T15:30:00Z', read: true, relatedId: 'a7' },
  { id: 'n4', type: 'completed', title: 'انتهاء كشف', message: 'تم الانتهاء من كشف المريض محمود عبد الله صالح', timestamp: '2026-08-10T14:45:00Z', read: true, relatedId: 'a10' },
  { id: 'n5', type: 'appointment', title: 'تحديث موعد', message: 'تم تعديل موعد المريضة سارة كمال مصطفى', timestamp: '2026-08-11T10:00:00Z', read: false, relatedId: 'a16' },
  { id: 'n6', type: 'reminder', title: 'تذكير بموعد', message: 'موعد المريضة ندى سمير عباس خلال ٣٠ دقيقة', timestamp: '2026-08-12T11:30:00Z', read: true, relatedId: 'a13' },
  { id: 'n7', type: 'completed', title: 'انتهاء كشف', message: 'تم الانتهاء من كشف المريض عمر فاروق توفيق', timestamp: '2026-08-12T14:30:00Z', read: true, relatedId: 'a14' },
  { id: 'n8', type: 'appointment', title: 'موعد جديد', message: 'تم حجز موعد جديد للمريضة فاطمة حسن إبراهيم', timestamp: '2026-08-12T16:00:00Z', read: false, relatedId: 'a17' },
  { id: 'n9', type: 'new_patient', title: 'مريض جديد', message: 'تم تسجيل المريض مصطفى رجب خليل بالعيادة', timestamp: '2026-08-01T09:10:00Z', read: true, relatedId: 'p11' },
  { id: 'n10', type: 'reminder', title: 'تذكير مستحق', message: 'تأكد من متابعة التحاليل الخاصة بالمريض سامي عثمان جابر', timestamp: '2026-08-13T08:00:00Z', read: false, relatedId: 'p13' }
];

export const weeklyStats = [
  { day: 'الجمعة', visits: 0, newPatients: 0 },
  { day: 'السبت', visits: 15, newPatients: 2 },
  { day: 'الأحد', visits: 22, newPatients: 3 },
  { day: 'الإثنين', visits: 18, newPatients: 1 },
  { day: 'الثلاثاء', visits: 25, newPatients: 4 },
  { day: 'الأربعاء', visits: 20, newPatients: 2 },
  { day: 'الخميس', visits: 12, newPatients: 1 }
];

export const visitTypes = [
  { name: 'كشف عادي', value: 45, color: '#3b82f6' }, // blue-500
  { name: 'متابعة', value: 35, color: '#10b981' },    // emerald-500
  { name: 'استشارة', value: 10, color: '#8b5cf6' },   // violet-500
  { name: 'طوارئ', value: 5, color: '#ef4444' },      // red-500
  { name: 'أشعة', value: 5, color: '#f59e0b' }        // amber-500
];

export const availableSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00'
];

export const clinicInfo = {
  name: 'عيادة د. أحمد الشريف',
  specialty: 'باطنة وجهاز هضمي',
  address: 'شارع التحرير، الدقي، الجيزة',
  phone: '01012345678',
  workingHours: 'السبت - الخميس: ٩ صباحاً - ٥ مساءً'
};

export const getInitialData = () => ({
  patients,
  appointments,
  notifications,
  blockedSlots: []
});
