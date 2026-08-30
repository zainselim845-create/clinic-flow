import { formatLocalDate, getTodayDateStr, parseLocalDate } from './timeSlots';

/**
 * Clinical Assistant Action Engine for ClinicFlow
 * Parses doctor commands to execute direct actions (blocking/unblocking days, checking stats, segmenting patients)
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
  const isoMatch = clean.match(/202[4-9][\-\/](?:1[0-2]|0?[1-9])[\-\/](?:3[01]|[12][0-9]|0?[1-9])\b/);
  if (isoMatch) {
    const parts = isoMatch[0].split(/[\-\/]/).map(Number);
    return formatLocalDate(parts[0], parts[1] - 1, parts[2]);
  }

  // 2. Format DD/MM or DD-MM (e.g. 30/8, 30/08, 31/8, 30-8, 30 / 8, 30 /8)
  const ddmMatch = clean.match(/(?:3[01]|[12][0-9]|0?[1-9])\s*[\/\-]\s*(?:1[0-2]|0?[1-9])(?:\s*[\/\-]\s*(202[4-9]))?\b/);
  if (ddmMatch) {
    const parts = ddmMatch[0].split(/[\/\-]/).map(s => parseInt(s.trim(), 10));
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
    const isPm = hourMatch[3]?.includes('مساء') || hourMatch[3] === 'م' || hour >= 12;
    const formattedHour = String(hour > 12 ? hour - 12 : hour).padStart(2, '0');
    return `${formattedHour}:${minute} ${isPm ? 'م' : 'ص'}`;
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

  // UNBLOCK INTENTS:
  // "شغال", "انا شغال", "مش اجازة", "افتح", "فك", "شيل الحظر", "الغاء حظر", "الغي الاجازة", "مفتوح"
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

  // BLOCK INTENTS:
  // "اقفل", "احظر", "عطلة", "اجازة", "إجازة", "قفل", "بلك", "سكر", "منع", "وقف", "مش هشتغل", "مش شغال", "مفيش شغل", "مسافر"
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

  // 1. UNBLOCK FULL DAY / SLOT
  if (isUnblockIntent) {
    const targetDate = resolveDateFromText(text);
    const targetTime = resolveTimeFromText(text);

    if (targetDate && targetTime) {
      return {
        isAction: true,
        actionType: 'UNBLOCK_SLOT',
        payload: { date: targetDate, time: targetTime },
        replyText: ` **تمام د. أحمد! تم فتح الموعد فوراً!**\nتم إلغاء حظر موعد **(${targetTime})** بتاريخ **${targetDate}** وأصبح متاحاً الآن للمرضى في جدول الحجز الأونلاين. `
      };
    }

    if (targetDate) {
      return {
        isAction: true,
        actionType: 'UNBLOCK_FULL_DAY',
        payload: { date: targetDate },
        replyText: ` **أهلاً د. أحمد! تم تأكيد فتح اليوم بالكامل!**\nتم إلغاء الإجازة وفتح يوم **${targetDate}** بنجاح، وجميع المواعيد الآن متاحة للمرضى في جدول الحجز الأونلاين للعيادة. `
      };
    }
  }

  // 2. BLOCK FULL DAY / SLOT
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

  // 3. QUERY BLOCKED DAYS (e.g. "ايه الايام المقفولة؟", "الايام المحظورة")
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

  // 4. DAILY CLINIC SUMMARY (e.g. "ملخص اليوم", "احصائيات اليوم")
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
