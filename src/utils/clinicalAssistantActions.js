import { formatLocalDate, getTodayDateStr } from './timeSlots';

/**
 * Clinical Assistant Action & Intelligence Engine for ClinicFlow
 * Empowers the Doctor AI Assistant with direct operational access across:
 * - Patient Records & Medical Dossiers
 * - Instant Appointment Booking & Rescheduling
 * - Live Clinic Schedule & Waiting Room Queries
 * - Pharmacy & Medical Supplies Inventory Stock Alerts
 * - Laboratory & Diagnostic Orders
 * - Financial Ledgers, Debts, & Invoicing
 * - Doctor Schedule Blocking / Unblocking
 * - 1-Click WhatsApp & SMS Outreach
 * - Smart In-App Navigation
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
  const hourMatch = text.match(/الساعة\s*([0-1]?[0-9])(?::([0-5][0-9]))?\s*(مساء|صباحا|م|ص)?/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1], 10);
    const minute = hourMatch[2] || '00';
    const isPm = hourMatch[3]?.includes('مساء') || hourMatch[3] === 'م' || (hour >= 1 && hour <= 11 && !hourMatch[3]?.includes('صباح'));
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
  const match = text.match(/(?:لمريض|للمريض|لـ|كشف|ملف المريض|بيانات المريض|مريض اسمه|عن المريض|عن مريض|احجز لـ|احجزلي لـ|احجز ل|ضيف موعد لـ|ضيف موعد ل)\s+([^\s,.:;]+(?:\s+[^\s,.:;]+){0,2})/);
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
        replyText: ` **تمام دكتور! تم فتح الموعد فوراً!**\nتم إلغاء حظر موعد **(${targetTime})** بتاريخ **${targetDate}** وأصبح متاحاً الآن للمرضى في جدول الحجز الأونلاين. `
      };
    }

    if (targetDate) {
      return {
        isAction: true,
        actionType: 'UNBLOCK_FULL_DAY',
        payload: { date: targetDate },
        replyText: ` **أهلاً دكتور! تم تأكيد فتح اليوم بالكامل!**\nتم إلغاء الإجازة وفتح يوم **${targetDate}** بنجاح، وجميع المواعيد الآن متاحة للمرضى في جدول الحجز الأونلاين للعيادة. `
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
        replyText: ` **تم تنفيذ طلبك وإغلاق الموعد!**\nتم حظر موعد **(${targetTime})** يوم **${targetDate}** ولن يظهر للمرضى في جدول الحجز الأونلاين. `
      };
    }

    if (targetDate) {
      return {
        isAction: true,
        actionType: 'BLOCK_FULL_DAY',
        payload: { date: targetDate, reason: 'إجازة / عطلة محددة من الطبيب عبر المساعد الذكي' },
        replyText: ` **تم تنفيذ طلبك وإغلاق اليوم بالكامل!**\nتم حظر يوم **${targetDate}** بالكامل في سيستم العيادة بنجاح ولن يتمكن أي مريض من حجز مواعيد في هذا اليوم أونلاين. `
      };
    }
  }

  // 3. QUERY BLOCKED DAYS (استعلام الأيام المغلقة)
  if (text.includes('الايام المقفولة') || text.includes('الأيام المقفولة') || text.includes('الايام المحظورة') || text.includes('المواعيد المحظورة') || text.includes('جدول الاجازات') || text.includes('ايه اللي مقفول')) {
    const blocked = state.blockedSlots || [];
    if (blocked.length === 0) {
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: ` **لا توجد أي أيام أو مواعيد مغلقة حالياً.**\nجدول العيادة يعمل بكامل طاقته وفق أوقات العمل الرسمية. إذا أردت إغلاق أي يوم فقط قل لي: *(اقفل يوم ...)* وسأتولى ذلك فوراً! `
      };
    }

    const fullDays = blocked.filter(b => b.isFullDay || b.time === 'FULL_DAY').map(b => `• يوم **${b.date}** (${b.reason || 'إجازة الطبيب'})`);
    const slots = blocked.filter(b => !b.isFullDay && b.time !== 'FULL_DAY').map(b => `• يوم **${b.date}** الساعة **${b.time}**`);

    let listText = ` **قائمة الأيام والمواعيد المغلقة حالياً في العيادة:**\n\n`;
    if (fullDays.length > 0) {
      listText += `**الأيام المغلقة بالكامل:**\n${fullDays.join('\n')}\n\n`;
    }
    if (slots.length > 0) {
      listText += `**المواعيد الفردية المحظورة:**\n${slots.join('\n')}\n\n`;
    }
    listText += `يمكنك فتح أي يوم في أي وقت بقول: *(افتح يوم YYYY-MM-DD)* أو *(أنا شغال يوم ...)* `;

    return {
      isAction: true,
      actionType: 'INFO',
      replyText: listText
    };
  }

  // 4. INSTANT APPOINTMENT BOOKING (حجز وإضافة موعد فوري)
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
      replyText: ` **تم حجز الموعد بنجاح في سيستم العيادة!**\n\n` +
        `• **المريض:** ${patientName} (${patientPhone})\n` +
        `• **التاريخ:** ${resolvedDate}\n` +
        `• **الوقت:** ${resolvedTime}\n` +
        `• **الحالة:** مؤكد ومسجل بالجدول\n\n` +
        `تم تحديث جدول المواعيد السريرية فوراً وإرسال إشعار لطاقم الاستقبال.`
    };
  }

  // 5. PATIENT PROFILE & MEDICAL HISTORY (ملف المريض وبياناته)
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
            replyText: ` لا يوجد مرضى مسجل لديهم حالة **(${condition})** في السجلات الطبية الحالية.`
          };
        }

        const list = matched.map(p => `• **${p.name}** (هاتف: ${p.phone || 'غير مسجل'}${p.allergies ? ` - حساسية: ${p.allergies}` : ''})`).join('\n');
        return {
          isAction: true,
          actionType: 'INFO',
          replyText: ` **وجدت ${matched.length} مريض لديهم حالة (${condition}):**\n\n${list}\n\nيمكنك طلب استعراض الملف الكامل لأي مريض منهم بالاسم مباشرة.`
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
        replyText: `**الملف الطبي للمريض: ${matchedPatient.name}**\n\n` +
          `• **الهاتف:** ${matchedPatient.phone || 'غير مسجل'}\n` +
          `• **العمر / فصيلة الدم:** ${matchedPatient.age || 'غير محدد'} سنة | ${matchedPatient.bloodType || 'غير مسجل'}\n` +
          `• **الحساسيات المعروفة:** ${matchedPatient.allergies || 'لا توجد حساسية مسجلة'}\n` +
          `• **الأمراض المزمنة:** ${matchedPatient.chronicDiseases || 'سليم طبياً'}\n` +
          `• **عدد الزيارات:** ${patientAppts.length || matchedPatient.totalVisits || 1} زيارات\n` +
          `• **آخر كشف:** ${lastAppt ? `${lastAppt.date} (${lastAppt.type})` : (matchedPatient.lastVisit || 'لا توجد زيارة سابقة')}\n` +
          `• **الموقف المالي:** ${balanceText}\n\n` +
          `يمكنك النقر بالأسفل لفتح الملف الطبي الشامل أو التواصل معه عبر واتساب مباشرة.`
      };
    } else {
      const candidate = extractCandidateName(text);
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: ` لم أتمكن من العثور على مريض باسم **${candidate || text}** في سجلات العيادة.\nيمكنك البحث برقم الهاتف أو التأكد من كتابة الاسم ثلاثياً.`
      };
    }
  }

  // 6. SCHEDULE & WAITING ROOM QUERY (استعلام المواعيد وقاعة الانتظار)
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
          replyText: ` **صالة الانتظار فارغة حالياً.**\nلا يوجد مرضى بانتظار الدخول في الوقت الراهن.`
        };
      }
      const list = waitingList.map(a => `• **${a.patientName}** (موعد: ${a.time} - ${a.type})`).join('\n');
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: ` **المرضى المتواجدون في صالة الانتظار الآن (${waitingList.length}):**\n\n${list}\n\nجاهزون للدخول إلى غرفة الفحص.`
      };
    }

    const filtered = appts.filter(a => a.date === targetDate && a.status !== 'cancelled');
    if (filtered.length === 0) {
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: ` **لا توجد مواعيد مسجلة بتاريخ (${targetDate}).**\nالجدول فارغ ومتاح للحجز بالكامل.`
      };
    }

    const statusMap = {
      'waiting': 'في الانتظار',
      'in_progress': 'في غرفة الفحص',
      'completed': 'مكتمل',
      'confirmed': 'مؤكد',
      'pending_payment': 'في انتظار المحاسبة'
    };

    const list = filtered.map(a => `• **${a.time}** - ${a.patientName} (${a.type || 'كشف'} | ${statusMap[a.status] || a.status})`).join('\n');
    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `**جدول مواعيد العيادة لتاريخ (${targetDate}) - إجمالي ${filtered.length} مريض:**\n\n${list}\n\nهل ترغب في تعديل أو حظر أي من هذه المواعيد؟`
    };
  }

  // 7. INVENTORY & PHARMACY STOCK ALERTS (نواقص المخزن والأدوية والمستلزمات - وحدة اختيارية)
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

    // Specific item query
    const specificItemMatch = inventory.find(i => text.includes(i.name));
    if (specificItemMatch) {
      const isLow = specificItemMatch.quantity <= (specificItemMatch.minQuantity || 5);
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `(وحدة اختيارية بالعيادة)\n**بيانات الصنف بالمخزن (${specificItemMatch.name}):**\n\n` +
          `• **الكمية المتوفرة:** ${specificItemMatch.quantity} ${specificItemMatch.unit || ''}\n` +
          `• **الحد الأدنى للأمان:** ${specificItemMatch.minQuantity || 5}\n` +
          `• **تاريخ الصلاحية:** ${specificItemMatch.expiryDate || 'ساري'}\n` +
          `• **الحالة:** ${isLow ? 'نقص في المخزون (تحت الحد الأدنى)' : 'متوفر ومستقر'}`
      };
    }

    const lowItems = inventory.filter(i => (i.quantity || 0) <= (i.minQuantity || 5));
    if (lowItems.length === 0) {
      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `(وحدة اختيارية بالعيادة)\n**المخزون الطبي في حالة ممتازة:**\nكافة الأدوية والمستلزمات الطبية (${inventory.length} صنف) متوفرة بنسب أعلى من الحد الأدنى للأمان ولا يوجد أي عجز.`
      };
    }

    const list = lowItems.map(i => `• **${i.name}**: متوفر **${i.quantity} ${i.unit || ''}** (الحد الأدنى: ${i.minQuantity})`).join('\n');
    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `(وحدة اختيارية بالعيادة)\n**تنبيه نواقص المخزن الطبي (${lowItems.length} صنف قارب على النفاد):**\n\n${list}\n\nيُنصح بإصدار أمر شراء عاجل لتفادي انقطاع المستلزمات الطبية.`
    };
  }

  // 8. LABS, RADIOLOGY & DENTAL LAB ORDERS (التحاليل والأشعة والمعامل والتركيبات - وحدة اختيارية)
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
        replyText: `(وحدة اختيارية بالعيادة)\n**لا توجد أي تحاليل أو أشعة أو طلبيات تركيبات معلقة حالياً.**\nكافة نتائج المختبر والمعامل مكتملة أو لم يتم تسجيل طلبيات بعد.`
      };
    }

    const labList = pendingLabs.map(l => `• **${l.patientName}**: فحص *(${l.testName || l.test})* لدى معمل *(${l.labName || 'المختبر'})* - التاريخ: ${l.dateRequested || l.date}`).join('\n');
    const dentalList = pendingDental.map(d => `• **${d.patientName}**: تركيبة *(${d.type || d.appliance || 'تركيبة سنية'})* لدى معمل *(${d.labName || 'معمل التركيبات'})* - التسليم المتوقع: ${d.deliveryDate || d.expectedDate || 'قريباً'}`).join('\n');

    const combined = [
      labList ? `**التحاليل والفحوصات المعلقة:**\n${labList}` : '',
      dentalList ? `**طلبيات المعامل والتركيبات المعلقة:**\n${dentalList}` : ''
    ].filter(Boolean).join('\n\n');

    return {
      isAction: true,
      actionType: 'INFO',
      replyText: `(وحدة اختيارية بالعيادة)\n**قائمة المعامل والتحاليل والتركيبات المعلقة (${pendingLabs.length + pendingDental.length}):**\n\n${combined}\n\nيمكنك متابعة حالاتها واستلام التقارير من شاشات المعامل والمختبرات.`
    };
  }

  // 9. FINANCIALS, INVOICES & DEBTS (الفواتير والمديونيات والإيرادات)
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
          replyText: `**الحسابات المالية ممتازة:**\nلا توجد أي مديونيات معلقة على المرضى، وكافة الفواتير محصلة بالكامل.`
        };
      }

      const totalDebt = debtors.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);
      const list = debtors.map(p => `• **${p.name}** (هاتف: ${p.phone || 'غير مسجل'}) - المتبقي: **${p.balance} ج.م**`).join('\n');

      return {
        isAction: true,
        actionType: 'INFO',
        replyText: `**تقرير المديونيات المعلقة في العيادة:**\n\n` +
          `• **إجمالي المبالغ المستحقة:** **${totalDebt} ج.م**\n` +
          `• **عدد المرضى المدينين:** ${debtors.length} مريض\n\n` +
          `**قائمة المرضى المستحق عليهم سداد:**\n${list}\n\n` +
          `يمكنك إرسال رسائل تذكير بالمستحقات عبر واتساب بضغطة زر واحدة.`
      };
    }

    const completedAppts = (state.appointments || []).filter(a => a.status === 'completed');
    const totalRev = completedAppts.reduce((sum, a) => sum + (parseInt(String(a.fee || '0').replace(/\D/g, ''), 10) || 0), 0);
    return {
      isAction: true,
      actionType: 'INFO',
      replyText: ` **التقرير المالي العام للعيادة:**\n\n` +
        `• **إجمالي التحصيلات المسجلة:** **${totalRev} ج.م**\n` +
        `• **إجمالي الفواتير المصدرة:** ${invoices.length} فاتورة\n` +
        `• **الكشوفات المكتملة:** ${completedAppts.length} كشف\n\n` +
        `للاطلاع على كشوف الحساب التفصيلية ودفتر الأستاذ، يمكنك زيارة شاشة الفواتير.`
    };
  }

  // 10. SMART IN-APP NAVIGATION (التنقل السريع داخل النظام)
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
    } else if (text.includes('فاتورة') || text.includes('فواتير') || text.includes('حسابات') || text.includes('ماليات')) {
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
        replyText: ` **جاري نقلك فوراً إلى ${pageLabel}...** `
      };
    }
  }

  // 11. 1-CLICK WHATSAPP MESSAGING (إرسال رسالة واتساب مباشرة)
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
        replyText: ` **تم إعداد رسالة الواتساب للمريض: ${matchedPatient.name}**\n\n` +
          `• **الهاتف:** ${matchedPatient.phone}\n` +
          `• **الرابط:** [فتح محادثة واتساب الآن](${waUrl})\n\n` +
          `يمكنك الضغط على الرابط بالأسفل لفتح المحادثة وإرسالها فوراً. `
      };
    }
  }

  // 12. DAILY CLINIC SUMMARY (ملخص اليوم وأداء العيادة)
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
      replyText: ` **ملخص أداء العيادة لليوم (${today}):**\n\n` +
        `• **إجمالي مواعيد اليوم:** ${appts.length} مريض\n` +
        `• **الكشوفات المكتملة:** ${completed.length}\n` +
        `• **في صالة الانتظار:** ${waiting.length}\n` +
        `• **في غرفة الكشف حالياً:** ${inProgress.length}\n` +
        `• **إجمالي الإيرادات المحصلة:** ${revenue} ج.م\n\n` +
        `هل ترغب في صياغة رسائل متابعة للمرضى الذين أتموا كشوفاتهم اليوم؟ `
    };
  }

  return { isAction: false };
}
