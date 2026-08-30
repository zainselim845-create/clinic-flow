// Pre-defined Clinical Campaign Templates
export const CAMPAIGN_TEMPLATES = [
  {
    id: 'post_care',
    title: ' نصائح وإرشادات ما بعد الكشف',
    description: 'إرسال تعليمات العناية والاطمئنان بعد زيارة العيادة',
    template: 'مرحباً أ/ {اسم_المريض}، نتمنى لك دوام الصحة والعافية بعد زيارتك لـ {اسم_العيادة}. نذكرك بالالتزام بتعليمات العلاج الموصوفة، ونحن دائماً في خدمتك للاستفسار. نتمنى لك الشفاء العاجل! '
  },
  {
    id: 'followup_reminder',
    title: ' تذكير بموعد الاستشارة الدورية',
    description: 'تنبيه المرضى بقرب موعد الاستشارة ومراجعة التحاليل',
    template: 'مرحباً أ/ {اسم_المريض}، من {اسم_العيادة}. نود تذكيرك بموعد الاستشارة ومتابعة نتائج التحاليل للاطمئنان التام على صحتك. يمكنك حجز موعدك بسهولة عبر الرابط: {رابط_الحجز}'
  },
  {
    id: 'medication_check',
    title: ' متابعة الالتزام بالخطة العلاجية',
    description: 'الاطمئنان على انتظام المريض في أخذ الأدوية والجرعات',
    template: 'عزيزي أ/ {اسم_المريض}، متابعة لصحتك من عيادة {اسم_العيادة}، نرجو التأكد من تناول الأدوية في مواعيدها المحددة من {اسم_الطبيب}. مع تمنياتنا لك بتمام العافية! '
  },
  {
    id: 'routine_invitation',
    title: ' دعوة للفحص الدوري السنوي/الشهري',
    description: 'تشجيع المرضى على إجراء الفحوصات والتحاليل الوقائية',
    template: 'مرحباً أ/ {اسم_المريض}، حرصاً من {اسم_العيادة} على صحتك ووقايتك، نذكرك بأهمية إجراء الفحص والمتابعة الدورية. يسعدنا استقبالك في أي وقت: {رابط_الحجز}'
  }
];

export const formatDoctorName = (name) => {
  if (!name) return 'د. أحمد الشريف';
  const trimmed = name.trim();
  if (trimmed.startsWith('د.') || trimmed.startsWith('د/')) return trimmed;
  return `د. ${trimmed}`;
};

export const personalizeMessage = (templateText, patient, clinicInfo) => {
  if (!templateText) return '';
  const clinicName = clinicInfo?.name || 'عيادة كلينك فلو';
  const doctorName = formatDoctorName(clinicInfo?.doctorName);
  const bookingLink = typeof window !== 'undefined' ? `${window.location.origin}/booking` : 'https://clinic-flow-lh3g.vercel.app/booking';


  return templateText
    .replace(/{اسم_المريض}/g, patient.name || 'المريض')
    .replace(/{اسم_العيادة}/g, clinicName)
    .replace(/{اسم_الطبيب}/g, doctorName)
    .replace(/{تاريخ_الزيارة}/g, patient.lastVisit || 'سابقاً')
    .replace(/{رابط_الحجز}/g, bookingLink);
};

export const filterTargetPatients = (patients, appointments, queryFilter) => {
  if (!patients || patients.length === 0) return [];
  const normalizedQuery = (queryFilter || '').trim().toLowerCase();

  return patients.filter(patient => {
    const patientAppts = (appointments || []).filter(a => a.patientId === patient.id || a.patientPhone === patient.phone);

    if (!normalizedQuery || normalizedQuery === 'all') return true;

    // Filter by Service / Visit Type
    if (normalizedQuery === 'consultation' || normalizedQuery.includes('استشارة')) {
      return patientAppts.some(a => (a.type || '').includes('استشارة'));
    }
    if (normalizedQuery === 'regular' || normalizedQuery.includes('كشف عادي')) {
      return patientAppts.some(a => (a.type || '').includes('كشف عادي') || (a.type || '').includes('عادي'));
    }
    if (normalizedQuery === 'followup' || normalizedQuery.includes('متابعة')) {
      return (patient.visitsCount > 1) || patientAppts.some(a => (a.type || '').includes('متابعة') || (a.type || '').includes('استشارة'));
    }
    if (normalizedQuery.includes('طوارئ') || normalizedQuery === 'urgent') {
      return patientAppts.some(a => (a.type || '').includes('طوارئ'));
    }

    if (normalizedQuery.includes('حضور') || normalizedQuery.includes('مكتمل') || normalizedQuery.includes('تم الكشف')) {
      return patientAppts.some(a => a.status === 'completed');
    }

    if (normalizedQuery.includes('انتظار') || normalizedQuery.includes('في الانتظار')) {
      return patientAppts.some(a => a.status === 'waiting');
    }

    if (normalizedQuery.includes('تأخر') || normalizedQuery.includes('لم يحضر') || normalizedQuery.includes('غائب')) {
      return patientAppts.some(a => a.status === 'no_show' || a.status === 'cancelled');
    }

    const matchesName = (patient.name || '').toLowerCase().includes(normalizedQuery);
    const matchesPhone = (patient.phone || '').includes(normalizedQuery);
    const matchesDiagnosis = (patient.diagnosis || '').toLowerCase().includes(normalizedQuery);
    const matchesNotes = (patient.notes || '').toLowerCase().includes(normalizedQuery);
    const matchesApptType = patientAppts.some(a => (a.type || '').toLowerCase().includes(normalizedQuery) || (a.notes || '').toLowerCase().includes(normalizedQuery));

    return matchesName || matchesPhone || matchesDiagnosis || matchesNotes || matchesApptType;
  });
};

