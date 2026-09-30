import { findPatientInText } from './dateResolvers';
import { getTodayDateStr } from '../timeSlots';

/**
 * Evaluates treasury movements, cash flow, expenses, payments, invoices, and debt metrics
 * @param {string} text 
 * @param {Object} state 
 * @returns {{ handled: boolean, result?: Object }}
 */
export function evaluateTreasuryActions(text, state = {}) {
  // 1. RECORD EXPENSE INTENTS
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
      handled: true,
      result: {
        isAction: true,
        actionType: 'ADD_EXPENSE',
        payload: newExpense,
        replyText: `تم تسجيل المصروف بقيمة ${amount} ج.م [${titleClean} - ${category}] وخصمه من الخزنة بنجاح.`
      }
    };
  }

  // 2. RECORD PAYMENT / CASH INFLOW
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
      handled: true,
      result: {
        isAction: true,
        actionType: 'RECORD_PAYMENT',
        payload: {
          patientId: matchedPatient?.id || null,
          patientName,
          amount,
          date: getTodayDateStr()
        },
        replyText: `تم تسجيل تحصيل مبلغ ${amount} ج.م من (${patientName}) وإيداعه في الخزنة النقدية للعيادة بنجاح.`
      }
    };
  }

  // 3. LIVE CASH FLOW & TREASURY QUERY
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
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `تقرير حركة الخزنة لليوم (${today}):\n\n` +
          `• إجمالي الإيرادات المحصلة: ${todayRevenues} ج.م (${todayAppts.length} كشف مكتمل)\n` +
          `• إجمالي المصروفات: ${todayExpenses} ج.م\n` +
          `• صافي التدفق النقدي بالخزنة (صافي السيولة النقدية): ${netCash >= 0 ? `+${netCash}` : netCash} ج.م\n\n` +
          `كافة العمليات مسجلة لحظياً في مركز التدفقات النقدية.`
      }
    };
  }

  // 4. FINANCIALS, INVOICES & DEBTS
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
          handled: true,
          result: {
            isAction: true,
            actionType: 'INFO',
            replyText: 'الحسابات المالية ممتازة:\nلا توجد أي مديونيات معلقة على المرضى، وكافة الفواتير محصلة بالكامل.'
          }
        };
      }

      const totalDebt = debtors.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);
      const list = debtors.map(p => `• ${p.name} (هاتف: ${p.phone || 'غير مسجل'}) - المتبقي: ${p.balance} ج.م`).join('\n');

      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: `تقرير المديونيات المعلقة في العيادة:\n\n` +
            `• إجمالي المبالغ المستحقة: ${totalDebt} ج.م\n` +
            `• عدد المرضى المدينين: ${debtors.length} مريض\n\n` +
            `قائمة المرضى المستحق عليهم سداد:\n${list}\n\n` +
            `يمكنك إرسال رسائل تذكير بالمستحقات عبر واتساب بضغطة زر واحدة.`
        }
      };
    }

    const completedAppts = (state.appointments || []).filter(a => a.status === 'completed');
    const totalRev = completedAppts.reduce((sum, a) => sum + (parseInt(String(a.fee || '0').replace(/\D/g, ''), 10) || 0), 0);
    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `التقرير المالي العام للعيادة:\n\n` +
          `• إجمالي التحصيلات المسجلة: ${totalRev} ج.م\n` +
          `• إجمالي الفواتير المصدرة: ${invoices.length} فاتورة\n` +
          `• الكشوفات المكتملة: ${completedAppts.length} كشف\n\n` +
          `للاطلاع على كشوف الحساب التفصيلية ودفتر الأستاذ، يمكنك زيارة شاشة الفواتير.`
      }
    };
  }

  return { handled: false };
}
