import { resolveDateFromText, resolveTimeFromText, findPatientInText, extractCandidateName } from './dateResolvers';
import { getTodayDateStr } from '../timeSlots';

/**
 * Evaluates appointment booking, cancellation, rescheduling, status workflow, and schedule inspection
 * @param {string} text 
 * @param {Object} state 
 * @returns {{ handled: boolean, result?: Object }}
 */
export function evaluateAppointmentActions(text, state = {}) {
  // 1. CANCEL / DELETE APPOINTMENT INTENTS
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
        handled: true,
        result: {
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
        }
      };
    }

    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `لم أتمكن من العثور على موعد قادم مسجل باسم ${candidateName || 'المريض المحدد'} لإلغائه. يرجى التأكد من الاسم أو التاريخ.`
      }
    };
  }

  // 2. RESCHEDULE APPOINTMENT INTENTS
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
        handled: true,
        result: {
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
        }
      };
    }

    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `لم يتم العثور على موعد حالي للمريض (${candidateName || 'المحدد'}) لنقله. يمكنك إنشاء حجز جديد مباشرة.`
      }
    };
  }

  // 3. APPOINTMENT STATUS PROGRESSION
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
        handled: true,
        result: {
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
        }
      };
    }

    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `لم يتم العثور على كشف نشط اليوم للمريض (${candidateName || 'المحدد'}) لتحديث حالته.`
      }
    };
  }

  // 4. INSTANT APPOINTMENT BOOKING
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
      handled: true,
      result: {
        isAction: true,
        actionType: 'BOOK_APPOINTMENT',
        payload: newAppointment,
        replyText: `تم حجز الموعد بنجاح في سيستم العيادة.\n\n` +
          `• المريض: ${patientName} (${patientPhone})\n` +
          `• التاريخ: ${resolvedDate}\n` +
          `• الوقت: ${resolvedTime}\n` +
          `• الحالة: مؤكد ومسجل بالجدول\n\n` +
          `تم تحديث جدول المواعيد السريرية فوراً وإرسال إشعار لطاقم الاستقبال.`
      }
    };
  }

  // 5. SCHEDULE & WAITING ROOM QUERY
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
          handled: true,
          result: {
            isAction: true,
            actionType: 'INFO',
            replyText: 'صالة الانتظار فارغة حالياً.\nلا يوجد مرضى بانتظار الدخول في الوقت الراهن.'
          }
        };
      }
      const list = waitingList.map(a => `• ${a.patientName} (موعد: ${a.time} - ${a.type})`).join('\n');
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: `المرضى المتواجدون في صالة الانتظار الآن (${waitingList.length}):\n\n${list}\n\nجاهزون للدخول إلى غرفة الفحص.`
        }
      };
    }

    const filtered = appts.filter(a => a.date === targetDate && a.status !== 'cancelled');
    if (filtered.length === 0) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: `لا توجد مواعيد مسجلة بتاريخ (${targetDate}).\nالجدول فارغ ومتاح للحجز بالكامل.`
        }
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
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `جدول مواعيد العيادة لتاريخ (${targetDate}) - إجمالي ${filtered.length} مريض:\n\n${list}\n\nهل ترغب في تعديل أو حظر أي من هذه المواعيد؟`
      }
    };
  }

  return { handled: false };
}
