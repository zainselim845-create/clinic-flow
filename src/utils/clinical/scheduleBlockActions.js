import { resolveDateFromText, resolveTimeFromText } from './dateResolvers';

/**
 * Evaluates schedule, vacation blocks, duty roster, and availability unblock intents
 * @param {string} text 
 * @param {Object} state 
 * @returns {{ handled: boolean, result?: Object }}
 */
export function evaluateScheduleBlockActions(text, state = {}) {
  // Special Staff on duty check (must precede general unblock)
  const isStaffQuery = text.includes('مين شغال') || text.includes('شغال مين') || text.includes('مين من التمريض') || text.includes('طاقم العيادة') || text.includes('حضور الطاقم');
  if (isStaffQuery) {
    const staff = state.staffMembers || [];
    if (staff.length === 0) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: 'لا يوجد أعضاء طاقم مسجلين حالياً في سيستم العيادة. يمكنك إضافة أعضاء الفريق من شاشة إدارة الطاقم.'
        }
      };
    }
    const activeStaff = staff.filter(s => s.status !== 'inactive');
    const list = activeStaff.map(s => `• ${s.name} (${s.role || 'طاقم العمل'} - هاتف: ${s.phone || 'غير مسجل'})`).join('\n');
    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `طاقم العيادة على رأس العمل اليوم (${activeStaff.length} موظف):\n\n${list}\n\nالجميع متواجدون وجاهزون لخدمة العيادة والمرضى.`
      }
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
        handled: true,
        result: {
          isAction: true,
          actionType: 'UNBLOCK_SLOT',
          payload: { date: targetDate, time: targetTime },
          replyText: `تمام دكتور، تم فتح الموعد فوراً.\nتم إلغاء حظر موعد (${targetTime}) بتاريخ ${targetDate} وأصبح متاحاً الآن للمرضى في جدول الحجز.`
        }
      };
    }

    if (targetDate) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'UNBLOCK_FULL_DAY',
          payload: { date: targetDate },
          replyText: `أهلاً دكتور، تم تأكيد فتح اليوم بالكامل.\nتم إلغاء الإجازة وفتح يوم ${targetDate} بنجاح، وجميع المواعيد الآن متاحة للحجز بالعيادة.`
        }
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
        handled: true,
        result: {
          isAction: true,
          actionType: 'BLOCK_SLOT',
          payload: { date: targetDate, time: targetTime, reason: 'حظر مخصص من الطبيب عبر المساعد الذكي' },
          replyText: `تم تنفيذ طلبك وإغلاق الموعد.\nتم حظر موعد (${targetTime}) يوم ${targetDate} ولن يظهر للمرضى في جدول الحجز.`
        }
      };
    }

    if (targetDate) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'BLOCK_FULL_DAY',
          payload: { date: targetDate, reason: 'إجازة / عطلة محددة من الطبيب عبر المساعد الذكي' },
          replyText: `تم تنفيذ طلبك وإغلاق اليوم بالكامل.\nتم حظر يوم ${targetDate} بالكامل في سيستم العيادة بنجاح ولن يتمكن أي مريض من حجز مواعيد في هذا اليوم أونلاين.`
        }
      };
    }
  }

  // 3. QUERY BLOCKED DAYS
  if (text.includes('الايام المقفولة') || text.includes('الأيام المقفولة') || text.includes('الايام المحظورة') || text.includes('المواعيد المحظورة') || text.includes('جدول الاجازات') || text.includes('ايه اللي مقفول')) {
    const blocked = state.blockedSlots || [];
    if (blocked.length === 0) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: 'لا توجد أي أيام أو مواعيد مغلقة حالياً.\nجدول العيادة يعمل بكامل طاقته وفق أوقات العمل الرسمية. إذا أردت إغلاق أي يوم فقط قل لي: (اقفل يوم ...) وسأتولى ذلك فوراً.'
        }
      };
    }

    const fullDays = blocked.filter(b => b.isFullDay || b.time === 'FULL_DAY').map(b => `• يوم ${b.date} (${b.reason || 'إجازة الطبيب'})`);
    const slots = blocked.filter(b => !b.isFullDay && b.time !== 'FULL_DAY').map(b => `• يوم ${b.date} الساعة ${b.time}`);

    let listText = 'قائمة الأيام والمواعيد المغلقة حالياً في العيادة:\n\n';
    if (fullDays.length > 0) {
      listText += `الأيام المغلقة بالكامل:\n${fullDays.join('\n')}\n\n`;
    }
    if (slots.length > 0) {
      listText += `المواعيد الفردية المحظورة:\n${slots.join('\n')}\n\n`;
    }
    listText += 'يمكنك فتح أي يوم في أي وقت بقول: (افتح يوم YYYY-MM-DD) أو (أنا شغال يوم ...)';

    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: listText
      }
    };
  }

  return { handled: false };
}
