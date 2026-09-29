import { formatLocalDate, getTodayDateStr } from './timeSlots';

/**
 * Clinical Assistant Action & Intelligence Engine for ClinicFlow
 * Empowers the Doctor AI Assistant with full operational execution authority across:
 * - Appointments: Booking, Cancelling, Rescheduling, Status Workflow (waiting -> in_progress -> pending_payment -> completed)
 * - Patient Records & Medical Dossiers: Registration, Allergies, Chronic Diseases, Diagnosis
 * - Cash Flow & Treasury: Expenses, Payments, Live Net Balances
 * - Schedule & Blocks: Full-day & Slot Blocking/Unblocking, Working Hours
 * - Clinic Settings & Services: Fee updates, New Services
 * - Staff: Duty Roster & Attendance
 * - Strict Zero Emojis compliance
 */

const ARABIC_DAYS_MAP = {
  'السبت': 6,
  'سبت': 6,
  'الاحد': 0,
  'الأحد': 0,
  'احد': 0,
  'الحد': 0,
  'الاثنين': 1,
  'الإثنين': 1,
  'اثنين': 1,
  'الاتنين': 1,
  'الإتنين': 1,
  'الثلاثاء': 2,
  'تلات': 2,
  'تلاتاء': 2,
  'الثلاثا': 2,
  'الاربعاء': 3,
  'الأربعاء': 3,
  'اربعاء': 3,
  'الأربعا': 3,
  'الخميس': 4,
  'خميس': 4,
  'الجمعة': 5,
  'جمعة': 5
};

const ARABIC_MONTH_NAMES = {
  'يناير': 0, 'فبراير': 1, 'مارس': 2, 'ابريل': 3, 'إبريل': 3, 'مايو': 4, 'يونيو': 5,
  'يوليو': 6, 'اغسطس': 7, 'أغسطس': 7, 'سبتمبر': 8, 'اكتوبر': 9, 'أكتوبر': 9, 'نوفمبر': 10, 'ديسمبر': 11
};

/**
 * Resolves a date string or natural language Arabic day into YYYY-MM-DD
 * @param {string} text - Message text from the doctor
 * @returns {string|null} ISO Date string YYYY-MM-DD
 */
export function resolveDateFromText(text) {
  if (!text) return null;
  const clean = text.trim().replace(/\s+/g, ' ');

  // 1. Explicit YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/202[4-9][/-](?:1[0-2]|0?[1-9])[/-](?:3[01]|[12][0-9]|0?[1-9])\b/);
  if (isoMatch) {
    const parts = isoMatch[0].split(/[/-]/).map(Number);
    return formatLocalDate(parts[0], parts[1] - 1, parts[2]);
  }

  // 2. Format DD/MM or DD-MM (e.g. 30/8, 30/08, 31/8, 30-8, 30 / 8, 30 /8)
  const ddmMatch = clean.match(/(?:3[01]|[12][0-9]|0?[1-9])\s*[/-\s]\s*(?:1[0-2]|0?[1-9])(?:\s*[/-\s]\s*(202[4-9]))?\b/);
  if (ddmMatch) {
    const parts = ddmMatch[0].split(/[/-]/).map(s => parseInt(s.trim(), 10));

    const day = parts[0];
    const month = parts[1] - 1;
    const currentYear = parts[2] || new Date().getFullYear();
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return formatLocalDate(currentYear, month, day);
    }
  }

  // 3. Arabic Month format: e.g. "30 اغسطس", "30 أغسطس", "31 يناير"
  for (const [mName, mIdx] of Object.entries(ARABIC_MONTH_NAMES)) {
    const regex = new RegExp(`(?:3[01]|[12][0-9]|0?[1-9])\\s*(?:من|في)?\\s*${mName}`);
    const match = clean.match(regex);
    if (match) {
      const dayMatch = match[0].match(/\d+/);
      if (dayMatch) {
        const day = parseInt(dayMatch[0], 10);
        const currentYear = new Date().getFullYear();
        return formatLocalDate(currentYear, mIdx, day);
      }
    }
  }

  // 4. Relative "اليوم" / "النهاردة"
  if (clean.includes('النهاردة') || clean.includes('اليوم')) {
    return getTodayDateStr();
  }

  // 5. Relative "بكرة" / "غدا"
  if (clean.includes('بكرة') || clean.includes('غداً') || clean.includes('غدا')) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatLocalDate(d);
  }

  // 6. Relative "بعد بكرة" / "بعده"
  if (clean.includes('بعد بكرة') || clean.includes('بعد غد')) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return formatLocalDate(d);
  }

  // 7. Day of week mention (e.g. "يوم الأحد", "السبت الجاي", "يوم الحد")
  for (const [dayName, targetJsDay] of Object.entries(ARABIC_DAYS_MAP)) {
    if (clean.includes(dayName)) {
      const today = new Date();
      const currentJsDay = today.getDay();
      let diff = targetJsDay - currentJsDay;
      if (diff <= 0) diff += 7; // next occurrence
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + diff);
      return formatLocalDate(targetDate);
    }
  }

  // 8. Day number in current month (e.g. "يوم 30", "وم 30", "يوم30", "30 في الشهر")
  const dayNumMatch = clean.match(/(?:يوم|وم|تاريخ|day)\s*([0-3]?[0-9])\b/);
  if (dayNumMatch && dayNumMatch[1]) {
    const day = parseInt(dayNumMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const today = new Date();
      return formatLocalDate(today.getFullYear(), today.getMonth(), day);
    }
  }

  return null;
}

/**
 * Resolves a 12h or 24h time slot from Arabic text (e.g. "الساعة 8 مساء", "08:00 م")
 * @param {string} text - Message text
 * @returns {string|null} Formatted Arabic time or null
 */
export function resolveTimeFromText(text) {
  if (!text) return null;
  
  // Explicit Arabic slot (e.g. 05:30 م, 8:00 م, 10:00 ص)
  const slotMatch = text.match(/([0-1]?[0-9]:[0-5][0-9])\s*(ص|م)/);
  if (slotMatch) {
    return `${slotMatch[1]} ${slotMatch[2]}`;
  }

  // "الساعة X مساء/صباحا"
  const hourMatch = text.match(/(?:للساعة|الساعة|الساعه|ساعة)\s*([0-1]?[0-9])(?::([0-5][0-9]))?\s*(مساء|صباحا|م|ص|المغرب|العصر|الظهر|العشا|العشاء|بالليل|الصبح)?/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1], 10);
    const minute = hourMatch[2] || '00';
    const period = hourMatch[3] || '';
    const isPm = period.includes('مساء') || period === 'م' || period.includes('المغرب') || period.includes('العصر') || period.includes('الظهر') || period.includes('العشا') || period.includes('بالليل') || (hour >= 1 && hour <= 11 && !period.includes('صباح') && !period.includes('الصبح'));
    const formattedHour = String(hour > 12 ? hour - 12 : hour).padStart(2, '0');
    return `${formattedHour}:${minute} ${isPm ? 'م' : 'ص'}`;
  }

  // Short slot (e.g. "الساعة 6", "6 مساء")
  const shortMatch = text.match(/\b([1-9]|1[0-2])\s*(مساء|صباحا|م|ص)\b/);
  if (shortMatch) {
    const hour = parseInt(shortMatch[1], 10);
    const isPm = shortMatch[2].includes('مساء') || shortMatch[2] === 'م';
    const formattedHour = String(hour).padStart(2, '0');
    return `${formattedHour}:00 ${isPm ? 'م' : 'ص'}`;
  }

  return null;
}

/**
 * Searches and matches a patient from text using names or phone numbers
 * @param {string} text 
 * @param {Array} patients 
 * @returns {Object|null}
 */
export function findPatientInText(text, patients = []) {
  if (!text || !Array.isArray(patients) || patients.length === 0) return null;
  const clean = text.trim();

  // 1. Direct full name match
  for (const p of patients) {
    if (p.name && clean.includes(p.name.trim())) {
      return p;
    }
  }

  // 2. Phone number match
  const phoneMatch = clean.match(/01[0125][0-9]{8}/);
  if (phoneMatch) {
    const found = patients.find(p => p.phone && p.phone.replace(/\D/g, '').includes(phoneMatch[0]));
    if (found) return found;
  }

  // 3. First + second name match (minimum 2 words)
  for (const p of patients) {
    const parts = (p.name || '').trim().split(/\s+/);
    if (parts.length >= 2) {
      const subName = `${parts[0]} ${parts[1]}`;
      if (clean.includes(subName)) {
        return p;
      }
    }
  }

  // 4. Single distinct first name match if len >= 3
  for (const p of patients) {
    const firstName = (p.name || '').trim().split(/\s+/)[0];
    if (firstName && firstName.length >= 3 && clean.includes(firstName)) {
      return p;
    }
  }

  return null;
}

/**
 * Extracts a candidate patient name from free text
 * @param {string} text 
 * @returns {string|null}
 */
export function extractCandidateName(text) {
  if (!text) return null;
  const match = text.match(/(?:لمريض|للمريض|لـ|كشف|ملف المريض|بيانات المريض|مريض اسمه|عن المريض|عن مريض|احجز لـ|احجزلي لـ|احجز ل|ضيف موعد لـ|ضيف موعد ل|الغي كشف|الغي موعد|كنسل موعد|كنسل كشف|دخل|خلصت كشف|انقل موعد|أجل كشف|اجل كشف)\s+([^\s,.:;]+(?:\s+[^\s,.:;]+){0,2})/);
  if (match && match[1]) {
    const name = match[1].replace(/(?:بكرة|غدا|النهاردة|اليوم|الساعة|يوم|تاريخ|\d+).*/g, '').trim();
    if (name.length >= 2) return name;
  }
  return null;
}

/**
 * Analyzes the doctor's message to detect administrative actions.
 * @param {string} message - Doctor message
 * @param {Object} state - Current AppContext state
 * @returns {Object} { isAction: boolean, actionType: string, payload: any, replyText: string }
 */
export function processDoctorIntent(message, state = {}) {
  const text = message.trim();

  // Special Staff on duty check (must precede general unblock)
  const isStaffQuery = text.includes('مين شغال') || text.includes('شغال مين') || text.includes('مين من التمريض') || text.includes('طاقم العيادة') || text.includes('حضور الطاقم');
  if (isStaffQuery) {
    const staff = state.staffMembers || [];
    if (staff.length === 0) {
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `لا يوجد أعضاء طاقم مسجلين حالياً في سيستم العيادة. يمكنك إضافة أعضاء الفريق من شاشة إدارة الطاقم.`
      };
    }
    const activeStaff = staff.filter(s => s.status !== 'inactive');
    const list = activeStaff.map(s => `• ${s.name} (${s.role || 'طاقم العمل'} - هاتف: ${s.phone || 'غير مسجل'})`).join('\n');
    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `طاقم العيادة على رأس العمل اليوم (${activeStaff.length} موظف):\n\n${list}\n\nالجميع متواجدون وجاهزون لخدمة العيادة والمرضى.`
    };
  }

  // 1. UNBLOCK INTENTS (الأيام والمواعيد المغلقة)
  const isUnblockIntent = 
    text.includes('شغال') ||
    text.includes('شغالين') ||
    text.includes('مش اجازة') ||
    text.includes('مش إجازة') ||
    text.includes('مش عطلة') ||
    text.includes('مش مقفول') ||
    text.includes('افتح') ||
    text.includes('فتح') ||
    text.includes('افتحلي') ||
    text.includes('فك حظر') ||
    text.includes('الغاء حظر') ||
    text.includes('إلغاء حظر') ||
    text.includes('شيل الحظر') ||
    text.includes('شيل الإجازة') ||
    text.includes('شيل الاجازة') ||
    text.includes('الغي الإجازة') ||
    text.includes('الغي الاجازة') ||
    text.includes('إلغاء الإجازة') ||
    text.includes('الغاء الاجازة') ||
    text.includes('خليه مفتوح');

  if (isUnblockIntent) {
    const targetDate = resolveDateFromText(text);
    const targetTime = resolveTimeFromText(text);

    if (targetDate && targetTime) {
      return {
        isAction: true,
        actionType: 'UNBLOCK_SLOT',
        payload: { date: targetDate, time: targetTime },
        replyText: `تمام دكتور، تم فتح الموعد فوراً.\nتم إلغاء حظر موعد (${targetTime}) بتاريخ ${targetDate} وأصبح متاحاً الآن للمرضى في جدول الحجز.`
      };
    }

    if (targetDate) {
      return {
        isAction: true,
        actionType: 'UNBLOCK_FULL_DAY',
        payload: { date: targetDate },
        replyText: `أهلاً دكتور، تم تأكيد فتح اليوم بالكامل.\nتم إلغاء الإجازة وفتح يوم ${targetDate} بنجاح، وجميع المواعيد الآن متاحة للحجز بالعيادة.`
      };
    }
  }

  // 2. BLOCK INTENTS (إغلاق يوم أو موعد)
  const isBlockIntent = !isUnblockIntent && (
    text.includes('اقفل') ||
    text.includes('احظر') ||
    text.includes('حظر') ||
    text.includes('إغلاق') ||
    text.includes('اغلاق') ||
    text.includes('إجازة') ||
    text.includes('اجازة') ||
    text.includes('عطلة') ||
    text.includes('مش هشتغل') ||
    text.includes('مش شغالين') ||
    text.includes('مفيش شغل') ||
    text.includes('مسافر') ||
    text.includes('وقف') ||
    text.includes('قفل') ||
    text.includes('بلك') ||
    text.includes('سكر') ||
    text.includes('منع')
  );

  if (isBlockIntent) {
    const targetDate = resolveDateFromText(text);
    const targetTime = resolveTimeFromText(text);

    if (targetDate && targetTime) {
      return {
        isAction: true,
        actionType: 'BLOCK_SLOT',
        payload: { date: targetDate, time: targetTime, reason: 'حظر مخصص من الطبيب عبر المساعد الذكي' },
        replyText: `تم تنفيذ طلبك وإغلاق الموعد.\nتم حظر موعد (${targetTime}) يوم ${targetDate} ولن يظهر للمرضى في جدول الحجز.`
      };
    }

    if (targetDate) {
      return {
        isAction: true,
        actionType: 'BLOCK_FULL_DAY',
        payload: { date: targetDate, reason: 'إجازة / عطلة محددة من الطبيب عبر المساعد الذكي' },
        replyText: `تم تنفيذ طلبك وإغلاق اليوم بالكامل.\nتم حظر يوم ${targetDate} بالكامل في سيستم العيادة بنجاح ولن يتمكن أي مريض من حجز مواعيد في هذا اليوم أونلاين.`
      };
    }
  }

  // 3. CANCEL / DELETE APPOINTMENT INTENTS (إلغاء وحذف المواعيد)
  const isCancelApptIntent = (
    text.includes('الغي') ||
    text.includes('ألغي') ||
    text.includes('إلغاء') ||
    text.includes('الغاء') ||
    text.includes('كنسل') ||
    text.includes('احذف') ||
    text.includes('حذف') ||
    text.includes('شيل') ||
    text.includes('مسح')
  ) && (
    text.includes('كشف') ||
    text.includes('موعد') ||
    text.includes('ميعاد') ||
    text.includes('حجز')
  );

  if (isCancelApptIntent) {
    const matchedPatient = findPatientInText(text, state.patients);
    const candidateName = matchedPatient ? matchedPatient.name : extractCandidateName(text);
    const targetDate = resolveDateFromText(text);

    const appts = state.appointments || [];
    let targetAppt = null;

    if (matchedPatient) {
      targetAppt = appts.find(a => 
        (a.patientId === matchedPatient.id || a.patientName === matchedPatient.name) &&
        (!targetDate || a.date === targetDate) &&
        a.status !== 'cancelled'
      );
    } else if (candidateName) {
      targetAppt = appts.find(a => 
        a.patientName && a.patientName.includes(candidateName) &&
        (!targetDate || a.date === targetDate) &&
        a.status !== 'cancelled'
      );
    } else if (targetDate) {
      targetAppt = appts.find(a => a.date === targetDate && a.status !== 'cancelled');
    }

    if (targetAppt) {
      return {
        isAction: true,
        actionType: 'CANCEL_APPOINTMENT',
        payload: {
          appointmentId: targetAppt.id,
          id: targetAppt.id,
          patientName: targetAppt.patientName,
          date: targetAppt.date,
          time: targetAppt.time
        },
        replyText: `تم إلغاء الموعد للمريض (${targetAppt.patientName}) بتاريخ ${targetAppt.date} الساعة ${targetAppt.time} بنجاح وإخلاؤه من جدول العيادة.`
      };
    }

    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `لم أتمكن من العثور على موعد قادم مسجل باسم ${candidateName || 'المريض المحدد'} لإلغائه. يرجى التأكد من الاسم أو التاريخ.`
    };
  }

  // 4. RESCHEDULE APPOINTMENT INTENTS (تأجيل وتعديل مواعيد الكشوفات)
  const isRescheduleIntent = (
    text.includes('أجل') ||
    text.includes('اجل') ||
    text.includes('تأجيل') ||
    text.includes('تاجيل') ||
    text.includes('انقل') ||
    text.includes('نقل') ||
    text.includes('غير') ||
    text.includes('تعديل')
  ) && (
    text.includes('كشف') ||
    text.includes('موعد') ||
    text.includes('ميعاد') ||
    text.includes('حجز')
  );

  if (isRescheduleIntent) {
    const matchedPatient = findPatientInText(text, state.patients);
    const candidateName = matchedPatient ? matchedPatient.name : extractCandidateName(text);
    const appts = state.appointments || [];

    const targetAppt = appts.find(a => 
      ((matchedPatient && (a.patientId === matchedPatient.id || a.patientName === matchedPatient.name)) ||
      (candidateName && a.patientName && a.patientName.includes(candidateName))) &&
      a.status !== 'cancelled'
    );

    const newDate = resolveDateFromText(text) || getTodayDateStr();
    const newTime = resolveTimeFromText(text) || '07:00 م';

    if (targetAppt) {
      return {
        isAction: true,
        actionType: 'RESCHEDULE_APPOINTMENT',
        payload: {
          appointmentId: targetAppt.id,
          id: targetAppt.id,
          patientId: targetAppt.patientId,
          patientName: targetAppt.patientName,
          date: newDate,
          time: newTime,
          type: targetAppt.type || 'كشف عادي'
        },
        replyText: `تم تعديل وتأجيل موعد المريض (${targetAppt.patientName}) إلى تاريخ ${newDate} الساعة ${newTime} بنجاح وتحديث الجدول السريري.`
      };
    }

    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `لم يتم العثور على موعد حالي للمريض (${candidateName || 'المحدد'}) لنقله. يمكنك إنشاء حجز جديد مباشرة.`
    };
  }

  // 5. APPOINTMENT STATUS PROGRESSION (تحريك مسار الكشف: انتظار -> داخل الكشف -> محاسبة -> مكتمل)
  const isStatusProgressionIntent = (
    text.includes('غرفة الكشف') ||
    text.includes('داخل يكشف') ||
    text.includes('دخل كشف') ||
    text.includes('ادخل كشف') ||
    text.includes('بدء كشف') ||
    text.includes('ابدأ كشف') ||
    (text.includes('دخل') && (text.includes('كشف') || text.includes('غرفة') || text.includes('فحص'))) ||
    text.includes('خلصت كشف') ||
    text.includes('أنهيت كشف') ||
    text.includes('خلص كشف') ||
    text.includes('انتهى من الكشف') ||
    text.includes('حول للمحاسبة') ||
    text.includes('حول للخزنة') ||
    text.includes('جاهز للمحاسبة') ||
    text.includes('تم تحصيل كشف') ||
    text.includes('أتم الزيارة') ||
    text.includes('اتم الزيارة') ||
    text.includes('وصل العيادة') ||
    text.includes('حطه في الانتظار') ||
    text.includes('في صالة الانتظار') ||
    text.includes('سجل وصول')
  );

  if (isStatusProgressionIntent) {
    const matchedPatient = findPatientInText(text, state.patients);
    const candidateName = matchedPatient ? matchedPatient.name : extractCandidateName(text);
    const appts = state.appointments || [];
    const today = getTodayDateStr();

    const targetAppt = appts.find(a => 
      ((matchedPatient && (a.patientId === matchedPatient.id || a.patientName === matchedPatient.name)) ||
      (candidateName && a.patientName && a.patientName.includes(candidateName))) &&
      (a.date === today || a.status !== 'completed')
    );

    let nextStatus = 'in_progress';
    let statusLabel = 'في غرفة الفحص';

    if (text.includes('خلصت كشف') || text.includes('أنهيت كشف') || text.includes('خلص كشف') || text.includes('حول للمحاسبة') || text.includes('حول للخزنة') || text.includes('جاهز للمحاسبة')) {
      nextStatus = 'pending_payment';
      statusLabel = 'في انتظار المحاسبة والخزنة';
    } else if (text.includes('تم تحصيل') || text.includes('أتم الزيارة') || text.includes('اتم الزيارة')) {
      nextStatus = 'completed';
      statusLabel = 'مكتمل ومسدد بالكامل';
    } else if (text.includes('وصل العيادة') || text.includes('في الانتظار') || text.includes('سجل وصول')) {
      nextStatus = 'waiting';
      statusLabel = 'في صالة الانتظار';
    }

    if (targetAppt) {
      return {
        isAction: true,
        actionType: 'UPDATE_APPOINTMENT_STATUS',
        payload: {
          id: targetAppt.id,
          status: nextStatus,
          patientName: targetAppt.patientName,
          date: targetAppt.date,
          time: targetAppt.time
        },
        replyText: `تم تحديث حالة المريض (${targetAppt.patientName}) بنجاح إلى: [${statusLabel}].`
      };
    }

    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `لم يتم العثور على كشف نشط اليوم للمريض (${candidateName || 'المحدد'}) لتحديث حالته.`
    };
  }

  // 6. REGISTER NEW PATIENT (تسجيل مريض جديد)
  const isRegisterPatientIntent = (
    text.includes('سجل مريض جديد') ||
    text.includes('ضيف مريض جديد') ||
    text.includes('إضافة مريض جديد') ||
    text.includes('اضافة مريض جديد') ||
    text.includes('تسجيل مريض جديد') ||
    text.includes('افتح ملف لمريض جديد')
  );

  if (isRegisterPatientIntent) {
    const nameMatch = text.match(/(?:اسمه|اسم المريض|المريض)\s+([^\s,.:;]+(?:\s+[^\s,.:;]+){0,2})/);
    let patientName = 'مريض جديد';
    if (nameMatch) {
      patientName = nameMatch[1].replace(/(?:و\s*)?(?:تليفون|تليفونه|هاتف|موبايل|عمر|عمره|سن|سنة|ذكر|أنثى|انثى|عنده|حساسية|رقم).*/, '').trim();
      patientName = patientName.replace(/\s+و\s*$/, '').trim();
    }

    const phoneMatch = text.match(/01[0125][0-9]{8}/);
    const ageMatch = text.match(/(?:عمره|سن|عمر|سنة)\s*(\d+)/);
    const genderMatch = text.match(/(ذكر|أنثى|انثى)/);
    const allergyMatch = text.match(/حساسية\s+(?:من\s+|ضد\s+)?([^\s,.:;]+)/);
    const chronicMatch = text.match(/(سكر|ضغط|قلب|ربو|كلى)/);

    const patientPhone = phoneMatch ? phoneMatch[0] : '';
    const patientAge = ageMatch ? ageMatch[1] : '30';
    const patientGender = genderMatch ? (genderMatch[1].includes('أنثى') || genderMatch[1].includes('انثى') ? 'أنثى' : 'ذكر') : 'ذكر';
    const allergies = allergyMatch ? allergyMatch[1].replace(/(?:وعنده|عنده|مع).*/, '').trim() : 'لا يوجد';
    const chronic = chronicMatch ? chronicMatch[1].trim() : 'سليم طبياً';

    const newPatient = {
      id: 'pat-' + Date.now(),
      name: patientName,
      phone: patientPhone,
      age: patientAge,
      gender: patientGender,
      allergies,
      chronicDiseases: chronic,
      medicalAlerts: allergies !== 'لا يوجد' ? `حساسية من ${allergies}` : '',
      diagnosis: '',
      notes: 'تم التسجيل تلقائياً عبر المساعد الطبي الذكي',
      balance: 0,
      totalVisits: 0,
      createdAt: new Date().toISOString()
    };

    return {
      isAction: true,
      actionType: 'ADD_PATIENT',
      payload: newPatient,
      replyText: `تم تسجيل المريض الجديد (${patientName}) في سيستم العيادة بنجاح وفتح الملف الطبي الخاص به.\n` +
        `• الهاتف: ${patientPhone || 'غير محدد'}\n` +
        `• السن والنوع: ${patientAge} سنة | ${patientGender}\n` +
        `• الحساسيات: ${allergies}\n` +
        `• الأمراض المزمنة: ${chronic}`
    };
  }

  // 7. UPDATE PATIENT DOSSIER (تحديث ملف المريض، الحساسيات، والتشخيص)
  const isUpdatePatientIntent = (
    text.includes('سجل حساسية') ||
    text.includes('ضيف حساسية') ||
    text.includes('عنده حساسية') ||
    text.includes('سجل تشخيص') ||
    text.includes('تشخيص المريض') ||
    text.includes('عدل تليفون') ||
    text.includes('تحديث هاتف')
  );

  if (isUpdatePatientIntent) {
    const matchedPatient = findPatientInText(text, state.patients);
    if (matchedPatient) {
      const updates = { ...matchedPatient };
      let changeDesc = [];

      const allergyMatch = text.match(/حساسية\s+([^\s,.:;]+)/);
      if (allergyMatch) {
        updates.allergies = allergyMatch[1].replace(/(?:للمريض|لمريض|لـ|عنده|من|في).*/, '').trim();
        updates.medicalAlerts = `حساسية من ${updates.allergies}`;
        changeDesc.push(`تسجيل حساسية: ${updates.allergies}`);
      }

      const phoneMatch = text.match(/01[0125][0-9]{8}/);
      if (phoneMatch) {
        updates.phone = phoneMatch[0];
        changeDesc.push(`تعديل الهاتف: ${updates.phone}`);
      }

      const diagMatch = text.match(/(?:تشخيص|تشخيصه|سجل تشخيص)\s+([^\n.]+)/);
      if (diagMatch) {
        updates.diagnosis = diagMatch[1].trim();
        changeDesc.push(`تسجيل تشخيص: ${updates.diagnosis}`);
      }

      return {
        isAction: true,
        actionType: 'UPDATE_PATIENT',
        payload: updates,
        replyText: `تم تحديث الملف الطبي للمريض (${matchedPatient.name}) بنجاح.\n• التعديلات: ${changeDesc.join(' | ')}.`
      };
    }
  }

  // 8. RECORD EXPENSE INTENTS (تسجيل المصروفات بالخزنة)
  const isExpenseIntent = (
    text.includes('سجل مصروف') ||
    text.includes('تسجيل مصروف') ||
    text.includes('صرفنا') ||
    text.includes('سجل مصاريف') ||
    text.includes('دفعنا مصروف') ||
    text.includes('خرجنا من الخزنة')
  );

  if (isExpenseIntent) {
    const amountMatch = text.match(/(\d+)\s*(?:جنيه|ج\.م|ج|egp)?/);
    const amount = amountMatch ? parseInt(amountMatch[1], 10) : 100;
    
    let category = 'نثريات';
    if (text.includes('مستلزمات') || text.includes('أدوات') || text.includes('ادوات')) category = 'مستلزمات طبية';
    else if (text.includes('كهرباء') || text.includes('مياه') || text.includes('فواتير')) category = 'فواتير ومرافق';
    else if (text.includes('صيانة')) category = 'صيانة';
    else if (text.includes('شاي') || text.includes('ضيافة')) category = 'ضيافة وبوفيه';
    else if (text.includes('إيجار') || text.includes('ايجار')) category = 'إيجار';

    const titleClean = text.replace(/(?:سجل مصروف|تسجيل مصروف|صرفنا|دفعنا مصروف|خرجنا من الخزنة|\d+|جنيه|ج\.م)/g, '').trim() || category;

    const newExpense = {
      id: 'exp-' + Date.now(),
      amount,
      title: titleClean,
      category,
      date: getTodayDateStr(),
      createdAt: new Date().toISOString()
    };

    return {
      isAction: true,
      actionType: 'ADD_EXPENSE',
      payload: newExpense,
      replyText: `تم تسجيل المصروف بقيمة ${amount} ج.م [${titleClean} - ${category}] وخصمه من الخزنة بنجاح.`
    };
  }

  // 9. RECORD PAYMENT / CASH INFLOW (تحصيل الدفعات وإيرادات الكشف)
  const isPaymentIntent = (
    text.includes('حصلت') ||
    text.includes('سجل دفعة') ||
    text.includes('سجل تحصيل') ||
    text.includes('دفع كشف') ||
    text.includes('حصل من') ||
    (text.includes('حصل') && (text.includes('من') || text.includes('جنيه') || text.includes('مديونية'))) ||
    (text.includes('تحصيل') && (text.includes('من') || text.includes('جنيه') || text.includes('مديونية')))
  );

  if (isPaymentIntent) {
    const amountMatch = text.match(/(\d+)\s*(?:جنيه|ج\.م|ج|egp)?/);
    const amount = amountMatch ? parseInt(amountMatch[1], 10) : 300;
    const matchedPatient = findPatientInText(text, state.patients);
    const patientName = matchedPatient ? matchedPatient.name : 'مريض العيادة';

    return {
      isAction: true,
      actionType: 'RECORD_PAYMENT',
      payload: {
        patientId: matchedPatient?.id || null,
        patientName,
        amount,
        date: getTodayDateStr()
      },
      replyText: `تم تسجيل تحصيل مبلغ ${amount} ج.م من (${patientName}) وإيداعه في الخزنة النقدية للعيادة بنجاح.`
    };
  }

  // 10. LIVE CASH FLOW & TREASURY QUERY (استعلام حركة الخزنة وصافي الدخل)
  const isTreasuryQuery = (
    text.includes('رصيد الخزنة') ||
    text.includes('الخزنة كام') ||
    text.includes('حساب الخزنة') ||
    text.includes('إيرادات ومصروفات') ||
    text.includes('ايرادات ومصروفات') ||
    text.includes('صافي الدخل') ||
    text.includes('التدفق النقدي') ||
    text.includes('دخل الخزنة') ||
    text.includes('صافي الخزينة') ||
    text.includes('السيولة النقدية') ||
    (text.includes('الخزينة') && (text.includes('احسب') || text.includes('صافي') || text.includes('كام') || text.includes('تقرير')))
  );

  if (isTreasuryQuery) {
    const today = getTodayDateStr();
    const appts = state.appointments || [];
    const expenses = state.expenses || [];

    const todayAppts = appts.filter(a => a.date === today && a.status === 'completed');
    const todayRevenues = todayAppts.reduce((sum, a) => sum + (parseInt(String(a.fee || '0').replace(/\D/g, ''), 10) || 0), 0);
    const todayExpenses = expenses.filter(e => e.date === today).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netCash = todayRevenues - todayExpenses;

    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `تقرير حركة الخزنة لليوم (${today}):\n\n` +
        `• إجمالي الإيرادات المحصلة: ${todayRevenues} ج.م (${todayAppts.length} كشف مكتمل)\n` +
        `• إجمالي المصروفات: ${todayExpenses} ج.م\n` +
        `• صافي التدفق النقدي بالخزنة (صافي السيولة النقدية): ${netCash >= 0 ? `+${netCash}` : netCash} ج.م\n\n` +
        `كافة العمليات مسجلة لحظياً في مركز التدفقات النقدية.`
    };
  }

  // 11. UPDATE CLINIC FEE & ADD SERVICE (تعديل الأسعار وإضافة الخدمات)
  const isFeeUpdateIntent = (
    text.includes('خلي سعر الكشف') ||
    text.includes('عدل سعر الكشف') ||
    text.includes('سعر الاستشارة') ||
    text.includes('سعر الكشف بقى') ||
    text.includes('غير سعر الكشف')
  );

  if (isFeeUpdateIntent) {
    const amountMatch = text.match(/(\d+)\s*(?:جنيه|ج\.م|ج|egp)?/);
    const newFee = amountMatch ? parseInt(amountMatch[1], 10) : 350;
    const isConsultation = text.includes('استشارة') || text.includes('استشاره');
    const serviceType = isConsultation ? 'استشارة' : 'كشف عادي';

    return {
      isAction: true,
      actionType: 'UPDATE_CLINIC_FEE',
      payload: {
        fee: newFee,
        feeFormatted: `${newFee} ج.م`,
        price: newFee,
        type: serviceType
      },
      replyText: `تم تحديث سعر (${serviceType}) في إعدادات العيادة إلى ${newFee} ج.م بنجاح، وسيتم اعتماده تلقائياً في الكشوفات القادمة.`
    };
  }

  if (text.includes('ضيف خدمة') || text.includes('إضافة خدمة') || text.includes('اضافة خدمة')) {
    const nameMatch = text.match(/(?:خدمة جديدة|خدمة)\s+([^\d]+?)(?:\s+بـ|\s+بسعر|\s+وسعرها|\s+سعرها|\s+\d|$)/);
    const priceMatch = text.match(/(\d+)\s*(?:جنيه|ج\.م|ج|egp)?/);
    const serviceName = nameMatch ? nameMatch[1].trim() : 'خدمة طبية';
    const servicePrice = priceMatch ? parseInt(priceMatch[1], 10) : 200;

    return {
      isAction: true,
      actionType: 'ADD_SERVICE',
      payload: {
        id: 'srv-' + Date.now(),
        name: serviceName,
        price: servicePrice,
        priceNumber: servicePrice,
        priceFormatted: `${servicePrice} ج.م`
      },
      replyText: `تمت إضافة خدمة (${serviceName}) بسعر ${servicePrice} ج.م إلى قائمة خدمات العيادة بنجاح.`
    };
  }

  // 12. QUERY BLOCKED DAYS (استعلام الأيام المغلقة)
  if (text.includes('الايام المقفولة') || text.includes('الأيام المقفولة') || text.includes('الايام المحظورة') || text.includes('المواعيد المحظورة') || text.includes('جدول الاجازات') || text.includes('ايه اللي مقفول')) {
    const blocked = state.blockedSlots || [];
    if (blocked.length === 0) {
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `لا توجد أي أيام أو مواعيد مغلقة حالياً.\nجدول العيادة يعمل بكامل طاقته وفق أوقات العمل الرسمية. إذا أردت إغلاق أي يوم فقط قل لي: (اقفل يوم ...) وسأتولى ذلك فوراً.`
      };
    }

    const fullDays = blocked.filter(b => b.isFullDay || b.time === 'FULL_DAY').map(b => `• يوم ${b.date} (${b.reason || 'إجازة الطبيب'})`);
    const slots = blocked.filter(b => !b.isFullDay && b.time !== 'FULL_DAY').map(b => `• يوم ${b.date} الساعة ${b.time}`);

    let listText = `قائمة الأيام والمواعيد المغلقة حالياً في العيادة:\n\n`;
    if (fullDays.length > 0) {
      listText += `الأيام المغلقة بالكامل:\n${fullDays.join('\n')}\n\n`;
    }
    if (slots.length > 0) {
      listText += `المواعيد الفردية المحظورة:\n${slots.join('\n')}\n\n`;
    }
    listText += `يمكنك فتح أي يوم في أي وقت بقول: (افتح يوم YYYY-MM-DD) أو (أنا شغال يوم ...)`;

    return {
      isAction: true,
      actionType: 'INFO',
      replyText: listText
    };
  }

  // 12.5. MULTI-CLINIC & BRANCH MANAGEMENT (استعلام الفروع والتبديل بين العيادات)
  const isBranchQuery = (
    text.includes('ايه الفروع اللي عندي') ||
    text.includes('الفروع اللي عندي') ||
    text.includes('قائمة الفروع') ||
    text.includes('قائمة العيادات') ||
    text.includes('عياداتي') ||
    text.includes('فروعي')
  );

  if (isBranchQuery) {
    const clinics = state.allClinics || [];
    const currentName = state.clinicInfo?.name || 'العيادة الحالية';
    if (clinics.length <= 1) {
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `أنت تعمل حالياً على: (${currentName}).\nالمنظومة تدعم ربط عدة فروع وعيادات معاً تحت حسابك مع عزل تام للمرضى والخزينة والمواعيد لكل فرع. يمكنك إضافة فرع جديد من تبويب إعدادات الفروع والعيادات.`
      };
    }

    const branchList = clinics.map(c => `• ${c.name} [/${c.slug}] ${c.slug === state.clinicInfo?.slug ? '(الفرع النشط حالياً)' : ''}`).join('\n');
    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `قائمة الفروع والعيادات المرتبطة بحسابك:\n\n${branchList}\n\nللتبديل بين الفروع يمكنك اختيار الفرع من القائمة بالأعلى أو أن تقول لي: (حولني لفرع ...) وسأنقلك فوراً.`
    };
  }

  const isSwitchBranchIntent = (
    text.includes('حول') ||
    text.includes('بدل') ||
    text.includes('انقل') ||
    text.includes('افتح')
  ) && (
    text.includes('فرع') ||
    text.includes('عيادة')
  );

  if (isSwitchBranchIntent) {
    const clinics = state.allClinics || [];
    // 1. Direct name match
    let matched = clinics.find(c => c.name && text.includes(c.name));
    // 2. Direct slug match
    if (!matched) {
      matched = clinics.find(c => c.slug && text.includes(c.slug));
    }
    // 3. Significant word match excluding generic tokens ('فرع', 'عيادة', 'مركز')
    if (!matched) {
      const stopWords = ['فرع', 'عيادة', 'عياده', 'مركز'];
      matched = clinics.find(c => 
        c.name && c.name.split(/\s+/).filter(w => !stopWords.includes(w)).some(w => w.length >= 3 && text.includes(w))
      );
    }

    if (matched) {
      return {
        isAction: true,
        actionType: 'SWITCH_CLINIC',
        payload: {
          slug: matched.slug,
          name: matched.name
        },
        replyText: `تم تحويل المنظومة فوراً إلى: (${matched.name}). يتم الآن تحميل مواعيد وخزينة وسجلات هذا الفرع.`
      };
    }
  }

  // 13. INSTANT APPOINTMENT BOOKING (حجز وإضافة موعد فوري)
  const isBookingIntent = (
    text.includes('احجز') ||
    text.includes('احجزلي') ||
    text.includes('ضيف موعد') ||
    text.includes('سجل موعد') ||
    text.includes('حجز موعد') ||
    text.includes('اضافة موعد') ||
    text.includes('إضافة موعد')
  );

  if (isBookingIntent) {
    const matchedPatient = findPatientInText(text, state.patients);
    const candidateName = matchedPatient ? matchedPatient.name : extractCandidateName(text);
    const resolvedDate = resolveDateFromText(text) || getTodayDateStr();
    const resolvedTime = resolveTimeFromText(text) || '06:00 م';
    const isConsultation = text.includes('استشارة') || text.includes('استشاره');
    const isFollowup = text.includes('متابعة') || text.includes('متابعه');
    const visitType = isConsultation ? 'استشارة' : (isFollowup ? 'متابعة' : 'كشف عادي');
    const defaultFee = state.clinicInfo?.services?.find(s => s.name?.includes(visitType))?.price || '300 ج.م';

    const patientName = candidateName || 'مريض جديد';
    const patientPhone = matchedPatient?.phone || '01000000000';

    const newAppointment = {
      id: 'appt-' + Date.now(),
      patientId: matchedPatient?.id || ('pat-' + Date.now()),
      patientName,
      phone: patientPhone,
      date: resolvedDate,
      time: resolvedTime,
      type: visitType,
      status: 'confirmed',
      fee: typeof defaultFee === 'number' ? `${defaultFee} ج.م` : defaultFee,
      paid: false,
      notes: 'تم الحجز تلقائياً بواسطة المساعد الطبي الذكي بناءً على طلب الطبيب',
      createdAt: new Date().toISOString()
    };

    return {
      isAction: true,
      actionType: 'BOOK_APPOINTMENT',
      payload: newAppointment,
      replyText: `تم حجز الموعد بنجاح في سيستم العيادة.\n\n` +
        `• المريض: ${patientName} (${patientPhone})\n` +
        `• التاريخ: ${resolvedDate}\n` +
        `• الوقت: ${resolvedTime}\n` +
        `• الحالة: مؤكد ومسجل بالجدول\n\n` +
        `تم تحديث جدول المواعيد السريرية فوراً وإرسال إشعار لطاقم الاستقبال.`
    };
  }

  // 14. PATIENT PROFILE & MEDICAL HISTORY (ملف المريض وبياناته)
  const isPatientQueryIntent = (
    text.includes('ملف المريض') ||
    text.includes('بيانات المريض') ||
    text.includes('سجل المريض') ||
    text.includes('ملف مريض') ||
    text.includes('بيانات مريض') ||
    text.includes('تاريخ كشف') ||
    text.includes('حساسية المريض') ||
    text.includes('حساسية مريض') ||
    text.includes('معلومات المريض') ||
    text.includes('عايز ملف') ||
    text.includes('شوفلي مريض') ||
    (text.includes('مين عنده') && (text.includes('سكر') || text.includes('ضغط') || text.includes('حساسية') || text.includes('بنسلين')))
  );

  if (isPatientQueryIntent) {
    const patients = state.patients || [];
    
    // Chronic disease / allergy condition filter
    if (text.includes('مين عنده') || text.includes('المرضى اللي عندهم')) {
      const condition = text.includes('سكر') ? 'سكر' 
        : (text.includes('ضغط') ? 'ضغط' 
        : (text.includes('بنسلين') ? 'بنسلين' 
        : (text.includes('حساسية') ? 'حساسية' : '')));
      
      if (condition) {
        const matched = patients.filter(p => 
          (p.chronicDiseases && p.chronicDiseases.includes(condition)) ||
          (p.allergies && p.allergies.includes(condition)) ||
          (p.medicalHistory && p.medicalHistory.includes(condition)) ||
          (p.notes && p.notes.includes(condition))
        );

        if (matched.length === 0) {
          return {
            isAction: true,
            actionType: 'INFO',
            replyText: `لا يوجد مرضى مسجل لديهم حالة (${condition}) في السجلات الطبية الحالية.`
          };
        }

        const list = matched.map(p => `• ${p.name} (هاتف: ${p.phone || 'غير مسجل'}${p.allergies ? ` - حساسية: ${p.allergies}` : ''})`).join('\n');
        return {
          isAction: true,
          actionType: 'INFO',
          replyText: `وجدت ${matched.length} مريض لديهم حالة (${condition}):\n\n${list}\n\nيمكنك طلب استعراض الملف الكامل لأي مريض منهم بالاسم مباشرة.`
        };
      }
    }

    const matchedPatient = findPatientInText(text, state.patients || []);
    if (matchedPatient) {
      const patientAppts = (state.appointments || []).filter(a => a.patientId === matchedPatient.id || a.patientPhone === matchedPatient.phone);
      const lastAppt = patientAppts.length > 0 ? patientAppts[patientAppts.length - 1] : null;
      const balanceNum = Number(matchedPatient.balance) || 0;
      const balanceText = balanceNum > 0 ? `مديونية بقيمة ${balanceNum} ج.م` : (balanceNum < 0 ? `رصيد دائن ${Math.abs(balanceNum)} ج.م` : 'خالص ومسدد بالكامل');

      return {
        isAction: true,
        actionType: 'SHOW_PATIENT',
        payload: matchedPatient,
        replyText: `الملف الطبي للمريض: ${matchedPatient.name}\n\n` +
          `• الهاتف: ${matchedPatient.phone || 'غير مسجل'}\n` +
          `• العمر / فصيلة الدم: ${matchedPatient.age || 'غير محدد'} سنة | ${matchedPatient.bloodType || 'غير مسجل'}\n` +
          `• الحساسيات المعروفة: ${matchedPatient.allergies || 'لا توجد حساسية مسجلة'}\n` +
          `• الأمراض المزمنة: ${matchedPatient.chronicDiseases || 'سليم طبياً'}\n` +
          `• عدد الزيارات: ${patientAppts.length || matchedPatient.totalVisits || 1} زيارات\n` +
          `• آخر كشف: ${lastAppt ? `${lastAppt.date} (${lastAppt.type})` : (matchedPatient.lastVisit || 'لا توجد زيارة سابقة')}\n` +
          `• الموقف المالي: ${balanceText}\n\n` +
          `يمكنك النقر بالأسفل لفتح الملف الطبي الشامل أو التواصل معه عبر واتساب مباشرة.`
      };
    } else {
      const candidate = extractCandidateName(text);
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `لم أتمكن من العثور على مريض باسم ${candidate || text} في سجلات العيادة.\nيمكنك البحث برقم الهاتف أو التأكد من كتابة الاسم ثلاثياً.`
      };
    }
  }

  // 15. SCHEDULE & WAITING ROOM QUERY (استعلام المواعيد وقاعة الانتظار)
  const isScheduleQuery = (
    text.includes('مين عنده كشف') ||
    text.includes('مواعيد النهاردة') ||
    text.includes('مواعيد اليوم') ||
    text.includes('كشوفات اليوم') ||
    text.includes('مواعيد بكرة') ||
    text.includes('جدول بكرة') ||
    text.includes('جدول النهاردة') ||
    text.includes('صالة الانتظار') ||
    text.includes('مين في الانتظار') ||
    text.includes('مين اللي جاي') ||
    text.includes('المواعيد القادمة')
  );

  if (isScheduleQuery) {
    const isWaitingQuery = text.includes('الانتظار');
    const targetDate = resolveDateFromText(text) || getTodayDateStr();
    const appts = state.appointments || [];

    if (isWaitingQuery) {
      const waitingList = appts.filter(a => a.date === getTodayDateStr() && a.status === 'waiting');
      if (waitingList.length === 0) {
        return {
          isAction: true,
          actionType: 'INFO',
          replyText: `صالة الانتظار فارغة حالياً.\nلا يوجد مرضى بانتظار الدخول في الوقت الراهن.`
        };
      }
      const list = waitingList.map(a => `• ${a.patientName} (موعد: ${a.time} - ${a.type})`).join('\n');
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `المرضى المتواجدون في صالة الانتظار الآن (${waitingList.length}):\n\n${list}\n\nجاهزون للدخول إلى غرفة الفحص.`
      };
    }

    const filtered = appts.filter(a => a.date === targetDate && a.status !== 'cancelled');
    if (filtered.length === 0) {
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `لا توجد مواعيد مسجلة بتاريخ (${targetDate}).\nالجدول فارغ ومتاح للحجز بالكامل.`
      };
    }

    const statusMap = {
      'waiting': 'في الانتظار',
      'in_progress': 'في غرفة الفحص',
      'completed': 'مكتمل',
      'confirmed': 'مؤكد',
      'pending_payment': 'في انتظار المحاسبة'
    };

    const list = filtered.map(a => `• ${a.time} - ${a.patientName} (${a.type || 'كشف'} | ${statusMap[a.status] || a.status})`).join('\n');
    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `جدول مواعيد العيادة لتاريخ (${targetDate}) - إجمالي ${filtered.length} مريض:\n\n${list}\n\nهل ترغب في تعديل أو حظر أي من هذه المواعيد؟`
    };
  }

  // 16. INVENTORY & PHARMACY STOCK ALERTS (نواقص المخزن والأدوية والمستلزمات - وحدة اختيارية)
  const isInventoryQuery = (
    text.includes('نواقص المخزن') ||
    text.includes('الادوية الناقصة') ||
    text.includes('الأدوية الناقصة') ||
    text.includes('فحص المخزن') ||
    text.includes('مستلزمات ناقصة') ||
    text.includes('عجز مخزن') ||
    text.includes('مخزون الأدوية') ||
    text.includes('المخزون والمستلزمات') ||
    text.includes('المستلزمات والمخزون') ||
    text.includes('المخزون') ||
    text.includes('المستلزمات') ||
    text.includes('هل عندنا') ||
    text.includes('ناقص في المخزن')
  );

  if (isInventoryQuery) {
    const inventory = state.inventory || [];
    if (inventory.length === 0) {
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `(وحدة اختيارية بالعيادة)\nلا توجد أصناف مسجلة في مخزن العيادة حالياً. يمكنك التوجه إلى شاشة المخزن والمستلزمات وإضافة الأصناف إذا رغبت في تفعيل إدارة المخزون.`
      };
    }

    const specificItemMatch = inventory.find(i => text.includes(i.name));
    if (specificItemMatch) {
      const isLow = specificItemMatch.quantity <= (specificItemMatch.minQuantity || 5);
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `(وحدة اختيارية بالعيادة)\nبيانات الصنف بالمخزن (${specificItemMatch.name}):\n\n` +
          `• الكمية المتوفرة: ${specificItemMatch.quantity} ${specificItemMatch.unit || ''}\n` +
          `• الحد الأدنى للأمان: ${specificItemMatch.minQuantity || 5}\n` +
          `• تاريخ الصلاحية: ${specificItemMatch.expiryDate || 'ساري'}\n` +
          `• الحالة: ${isLow ? 'نقص في المخزون (تحت الحد الأدنى)' : 'متوفر ومستقر'}`
      };
    }

    const lowItems = inventory.filter(i => (i.quantity || 0) <= (i.minQuantity || 5));
    if (lowItems.length === 0) {
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `(وحدة اختيارية بالعيادة)\nالمخزون الطبي في حالة ممتازة:\nكافة الأدوية والمستلزمات الطبية (${inventory.length} صنف) متوفرة بنسب أعلى من الحد الأدنى للأمان ولا يوجد أي عجز.`
      };
    }

    const list = lowItems.map(i => `• ${i.name}: متوفر ${i.quantity} ${i.unit || ''} (الحد الأدنى: ${i.minQuantity})`).join('\n');
    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `(وحدة اختيارية بالعيادة)\nتنبيه نواقص المخزن الطبي (${lowItems.length} صنف قارب على النفاد):\n\n${list}\n\nيُنصح بإصدار أمر شراء عاجل لتفادي انقطاع المستلزمات الطبية.`
    };
  }

  // 17. LABS, RADIOLOGY & DENTAL LAB ORDERS (التحاليل والأشعة والمعامل والتركيبات - وحدة اختيارية)
  const isLabsQuery = (
    text.includes('تحاليل معلقة') ||
    text.includes('التحاليل المعلقة') ||
    text.includes('طلبات المعمل') ||
    text.includes('نتائج التحاليل') ||
    text.includes('فحوصات معلقة') ||
    text.includes('المعامل والتركيبات') ||
    text.includes('المعامل') ||
    text.includes('التركيبات') ||
    text.includes('التحاليل والأشعة') ||
    text.includes('التحاليل والاشعة') ||
    text.includes('الاشعة') ||
    text.includes('الأشعة') ||
    text.includes('شغل المعامل') ||
    text.includes('شغل المعمل')
  );

  if (isLabsQuery) {
    const labs = state.labs || [];
    const dentalLabs = state.dentalLabOrders || [];
    const pendingLabs = labs.filter(l => l.status === 'pending' || l.status === 'in_progress');
    const pendingDental = dentalLabs.filter(d => d.status === 'pending' || d.status === 'sent_to_lab' || d.status === 'in_progress');
    
    if (pendingLabs.length === 0 && pendingDental.length === 0) {
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `(وحدة اختيارية بالعيادة)\nلا توجد أي تحاليل أو أشعة أو طلبيات تركيبات معلقة حالياً.\nكافة نتائج المختبر والمعامل مكتملة أو لم يتم تسجيل طلبيات بعد.`
      };
    }

    const labList = pendingLabs.map(l => `• ${l.patientName}: فحص (${l.testName || l.test}) لدى معمل (${l.labName || 'المختبر'}) - التاريخ: ${l.dateRequested || l.date}`).join('\n');
    const dentalList = pendingDental.map(d => `• ${d.patientName}: تركيبة (${d.type || d.appliance || 'تركيبة سنية'}) لدى معمل (${d.labName || 'معمل التركيبات'}) - التسليم المتوقع: ${d.deliveryDate || d.expectedDate || 'قريباً'}`).join('\n');

    const combined = [
      labList ? `التحاليل والفحوصات المعلقة:\n${labList}` : '',
      dentalList ? `طلبيات المعامل والتركيبات المعلقة:\n${dentalList}` : ''
    ].filter(Boolean).join('\n\n');

    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `(وحدة اختيارية بالعيادة)\nقائمة المعامل والتحاليل والتركيبات المعلقة (${pendingLabs.length + pendingDental.length}):\n\n${combined}\n\nيمكنك متابعة حالاتها واستلام التقارير من شاشات المعامل والمختبرات.`
    };
  }

  // 18. FINANCIALS, INVOICES & DEBTS (الفواتير والمديونيات والإيرادات)
  const isFinanceQuery = (
    text.includes('مين عليه فلوس') ||
    text.includes('المديونيات') ||
    text.includes('مديونية') ||
    text.includes('فواتير غير مدفوعة') ||
    text.includes('التحصيلات المعلقة') ||
    text.includes('حسابات العيادة') ||
    text.includes('دخل الاسبوع') ||
    text.includes('دخل الأسبوع') ||
    text.includes('ارباح الشهر') ||
    text.includes('أرباح الشهر')
  );

  if (isFinanceQuery) {
    const invoices = state.invoices || [];
    const patients = state.patients || [];

    if (text.includes('مين عليه فلوس') || text.includes('المديونيات') || text.includes('فواتير غير مدفوعة')) {
      const debtors = patients.filter(p => (Number(p.balance) || 0) > 0);
      const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'partial');

      if (debtors.length === 0 && unpaidInvoices.length === 0) {
        return {
          isAction: true,
          actionType: 'INFO',
          replyText: `الحسابات المالية ممتازة:\nلا توجد أي مديونيات معلقة على المرضى، وكافة الفواتير محصلة بالكامل.`
        };
      }

      const totalDebt = debtors.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);
      const list = debtors.map(p => `• ${p.name} (هاتف: ${p.phone || 'غير مسجل'}) - المتبقي: ${p.balance} ج.م`).join('\n');

      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `تقرير المديونيات المعلقة في العيادة:\n\n` +
          `• إجمالي المبالغ المستحقة: ${totalDebt} ج.م\n` +
          `• عدد المرضى المدينين: ${debtors.length} مريض\n\n` +
          `قائمة المرضى المستحق عليهم سداد:\n${list}\n\n` +
          `يمكنك إرسال رسائل تذكير بالمستحقات عبر واتساب بضغطة زر واحدة.`
      };
    }

    const completedAppts = (state.appointments || []).filter(a => a.status === 'completed');
    const totalRev = completedAppts.reduce((sum, a) => sum + (parseInt(String(a.fee || '0').replace(/\D/g, ''), 10) || 0), 0);
    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `التقرير المالي العام للعيادة:\n\n` +
        `• إجمالي التحصيلات المسجلة: ${totalRev} ج.م\n` +
        `• إجمالي الفواتير المصدرة: ${invoices.length} فاتورة\n` +
        `• الكشوفات المكتملة: ${completedAppts.length} كشف\n\n` +
        `للاطلاع على كشوف الحساب التفصيلية ودفتر الأستاذ، يمكنك زيارة شاشة الفواتير.`
    };
  }

  // 19. SMART IN-APP NAVIGATION (التنقل السريع داخل النظام)
  const isNavIntent = (
    text.includes('وديني') ||
    text.includes('افتح شاشة') ||
    text.includes('افتح صفحة') ||
    (text.startsWith('افتح ') && !isUnblockIntent) ||
    text.includes('روح لـ')
  );

  if (isNavIntent) {
    let targetPath = null;
    let pageLabel = '';

    if (text.includes('مخزن') || text.includes('ادوية') || text.includes('أدوية')) {
      targetPath = '/inventory';
      pageLabel = 'مخزون المستلزمات الطبية';
    } else if (text.includes('اعدادات') || text.includes('إعدادات') || text.includes('ضبط')) {
      targetPath = '/settings';
      pageLabel = 'مركز إعدادات العيادة';
    } else if (text.includes('موعد') || text.includes('مواعيد') || text.includes('جدول')) {
      targetPath = '/appointments';
      pageLabel = 'جدول وإدارة المواعيد';
    } else if (text.includes('مريض') || text.includes('مرضى') || text.includes('سجلات')) {
      targetPath = '/patients';
      pageLabel = 'السجلات الطبية للمرضى';
    } else if (text.includes('فاتورة') || text.includes('فواتير') || text.includes('حسابات') || text.includes('ماليات') || text.includes('خزنة')) {
      targetPath = '/invoices';
      pageLabel = 'الفوترة والتحصيلات المالية';
    } else if (text.includes('حضور') || text.includes('طاقم') || text.includes('موظفين')) {
      targetPath = '/attendance';
      pageLabel = 'حضور وانصراف الطاقم';
    }

    if (targetPath) {
      return {
        isAction: true,
        actionType: 'NAVIGATE',
        payload: { path: targetPath, label: pageLabel },
        replyText: `جاري نقلك فوراً إلى ${pageLabel}...`
      };
    }
  }

  // 20. CLINIC WHATSAPP AI AGENT (وكيل واتساب الذكي للعيادة)
  if (text.includes('وكيل واتساب') || text.includes('بوت واتساب') || text.includes('روبوت واتساب') || text.includes('واتساب الذكي') || text.includes('whatsapp bot') || text.includes('whatsapp agent')) {
    const clinicName = state.clinicInfo?.name || 'العيادة';
    const clinicPhone = state.clinicInfo?.phone || state.clinicInfo?.whatsappNumber || '';
    const cleanPhone = clinicPhone.replace(/\D/g, '');
    const waUrl = cleanPhone 
      ? `https://wa.me/20${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(`مرحباً، أود الاستفسار والحجز عبر وكيل واتساب الذكي لـ ${clinicName}`)}`
      : null;

    return {
      isAction: true,
      actionType: 'WHATSAPP_AGENT_STATUS',
      payload: { clinicName, clinicPhone, url: waUrl },
      replyText: `تم ربط وتفعيل وكيل واتساب الذكي لـ (${clinicName}).\n\n` +
        `• حالة الوكيل: متصل وجاهز للرد على مدار الساعة.\n` +
        (clinicPhone ? `• رقم واتساب العيادة: ${clinicPhone}\n` : '') +
        `• المهام التلقائية: الرد الفوري على استفسارات المرضى، توضيح أسعار الكشوفات والخدمات، وتسجيل المواعيد المؤكدة آلياً في جدول العيادة.\n\n` +
        (waUrl ? `يمكنك تجربة محادثة وكيل واتساب الذكي مباشرة عبر الزر أدناه.` : `يمكنك إضافة رقم هاتف العيادة من الإعدادات لربط المحادثات المباشرة.`)
    };
  }

  // 21. 1-CLICK WHATSAPP MESSAGING (إرسال رسالة واتساب مباشرة لمريض)
  if (text.includes('واتساب') || text.includes('واتس اب') || text.includes('whatsapp')) {
    const matchedPatient = findPatientInText(text, state.patients);
    if (matchedPatient && matchedPatient.phone) {
      const cleanPhone = matchedPatient.phone.replace(/\D/g, '');
      const defaultMsg = `مرحباً أستاذ/ة ${matchedPatient.name}، معك ${state.clinicInfo?.name || 'عيادة كلينك فلو'}. نتمنى لك دوام الصحة والعافية.`;
      const waUrl = `https://wa.me/20${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(defaultMsg)}`;

      return {
        isAction: true,
        actionType: 'SEND_WHATSAPP',
        payload: { patient: matchedPatient, phone: cleanPhone, url: waUrl },
        replyText: `تم إعداد رسالة الواتساب للمريض: ${matchedPatient.name}\n\n` +
          `• الهاتف: ${matchedPatient.phone}\n` +
          `• الرابط: [فتح محادثة واتساب الآن](${waUrl})\n\n` +
          `يمكنك الضغط على الرابط بالأسفل لفتح المحادثة وإرسالها فوراً.`
      };
    }
  }

  // 22. DAILY CLINIC SUMMARY (ملخص اليوم وأداء العيادة)
  if (text.includes('ملخص اليوم') || text.includes('احصائيات اليوم') || text.includes('تقرير اليوم') || text.includes('شغل النهاردة')) {
    const today = getTodayDateStr();
    const appts = (state.appointments || []).filter(a => a.date === today && a.status !== 'cancelled');
    const completed = appts.filter(a => a.status === 'completed');
    const waiting = appts.filter(a => a.status === 'waiting');
    const inProgress = appts.filter(a => a.status === 'in_progress');
    const revenue = completed.reduce((sum, a) => sum + (parseInt(String(a.fee || '0').replace(/\D/g, ''), 10) || 0), 0);

    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `ملخص أداء العيادة لليوم (${today}):\n\n` +
        `• إجمالي مواعيد اليوم: ${appts.length} مريض\n` +
        `• الكشوفات المكتملة: ${completed.length}\n` +
        `• في صالة الانتظار: ${waiting.length}\n` +
        `• في غرفة الكشف حالياً: ${inProgress.length}\n` +
        `• إجمالي الإيرادات المحصلة: ${revenue} ج.م\n\n` +
        `هل ترغب في صياغة رسائل متابعة للمرضى الذين أتموا كشوفاتهم اليوم؟`
    };
  }

  return { isAction: false };
}
