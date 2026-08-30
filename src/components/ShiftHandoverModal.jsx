import React, { useState, useMemo } from 'react';
import { 
  X, Landmark, DollarSign, CreditCard, ArrowRightLeft, 
  CheckCircle2, AlertCircle, Printer, Download, User, Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTodayDateStr } from '../utils/timeSlots';
import { recordAuditEvent, AUDIT_EVENT_TYPES } from '../services/auditLoggerService';
import './ShiftHandoverModal.css';

export default function ShiftHandoverModal({ isOpen, onClose }) {
  const { state, dispatch } = useApp();
  const today = getTodayDateStr();

  const [staffName, setStaffName] = useState('موظف الاستقبال (وردية اليوم)');
  const [openingFloat, setOpeningFloat] = useState(500); // عهدة بداية الوردية (الفكة)
  const [actualCashCounted, setActualCashCounted] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isShiftSaved, setIsShiftSaved] = useState(false);

  // Compute Today's Inflow from Appointments & Invoices
  const todayAppointments = useMemo(() => {
    return (state.appointments || []).filter(a => a.date === today && a.status === 'completed');
  }, [state.appointments, today]);

  const todayExpenses = useMemo(() => {
    return (state.expenses || []).filter(e => e.date === today);
  }, [state.expenses, today]);

  // Financial breakdown
  const financialTotals = useMemo(() => {
    let cashReceived = 0;
    let cardReceived = 0;
    let instaPayReceived = 0;

    // Sum from completed appointments
    todayAppointments.forEach(appt => {
      const fee = Number(appt.paidAmount || appt.fee?.replace(/\D/g, '') || 300);
      const method = appt.paymentMethod || 'cash';
      if (method === 'cash') cashReceived += fee;
      else if (method === 'card') cardReceived += fee;
      else if (method === 'instapay') instaPayReceived += fee;
      else cashReceived += fee;
    });

    const expensesPaid = todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expectedDrawerCash = Number(openingFloat || 0) + cashReceived - expensesPaid;

    return {
      cashReceived,
      cardReceived,
      instaPayReceived,
      totalRevenue: cashReceived + cardReceived + instaPayReceived,
      expensesPaid,
      expectedDrawerCash
    };
  }, [todayAppointments, todayExpenses, openingFloat]);

  // Variance calculation
  const actualCash = Number(actualCashCounted) || 0;
  const discrepancy = actualCashCounted !== '' ? actualCash - financialTotals.expectedDrawerCash : 0;

  if (!isOpen) return null;

  const handleSaveShift = (e) => {
    e.preventDefault();

    const shiftReport = {
      id: 'shift_' + Date.now(),
      date: today,
      timestamp: new Date().toISOString(),
      staffName,
      openingFloat: Number(openingFloat) || 0,
      cashReceived: financialTotals.cashReceived,
      cardReceived: financialTotals.cardReceived,
      instaPayReceived: financialTotals.instaPayReceived,
      totalRevenue: financialTotals.totalRevenue,
      expensesPaid: financialTotals.expensesPaid,
      expectedDrawerCash: financialTotals.expectedDrawerCash,
      actualCashCounted: actualCash,
      discrepancy,
      notes: handoverNotes
    };

    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.SHIFT_CLOSED,
      user: staffName,
      action: `إغلاق وتسليم وردية الاستقبال ليوم ${today}`,
      details: `إجمالي الإيراد: ${financialTotals.totalRevenue} ج.م | النقد الفعلي: ${actualCash} ج.م | الفارق: ${discrepancy} ج.م`
    });

    setIsShiftSaved(true);
    setTimeout(() => {
      setIsShiftSaved(false);
      onClose();
    }, 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop-shift">
      <div className="shift-modal-card glass-card">
        
        {/* Header */}
        <div className="shift-modal-header">
          <div className="shift-title-group">
            <Landmark className="text-primary" size={24} />
            <div>
              <h3>تسليم وردية الاستقبال ومطابقة الخزينة (Shift Reconciliation)</h3>
              <p className="subtitle">تصفية العهدة النقدية ومطابقة إيرادات اليوم: {today}</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        {isShiftSaved ? (
          <div className="shift-success-view">
            <CheckCircle2 size={48} className="text-success" />
            <h4>تم إغلاق وتسليم الوردية وتوثيقها في سجل التدقيق بنجاح!</h4>
            <p>تم ترحيل بيانات الخزينة لليوم {today}.</p>
          </div>
        ) : (
          <form onSubmit={handleSaveShift} className="shift-form-body">
            
            {/* Quick Metrics Strip */}
            <div className="shift-kpi-grid">
              <div className="shift-kpi-box">
                <span className="label"><DollarSign size={14} /> كاش محصل</span>
                <strong className="val text-success">{financialTotals.cashReceived} ج.م</strong>
              </div>
              <div className="shift-kpi-box">
                <span className="label"><CreditCard size={14} /> فيزا / كارت</span>
                <strong className="val">{financialTotals.cardReceived} ج.م</strong>
              </div>
              <div className="shift-kpi-box">
                <span className="label"><ArrowRightLeft size={14} /> إنستاباي ومحافظ</span>
                <strong className="val">{financialTotals.instaPayReceived} ج.م</strong>
              </div>
              <div className="shift-kpi-box">
                <span className="label">مصروفات مسحوبة</span>
                <strong className="val text-danger">-{financialTotals.expensesPaid} ج.م</strong>
              </div>
            </div>

            {/* Reconciliation Box */}
            <div className="drawer-calc-card">
              <div className="calc-row">
                <span>عهدة بداية الوردية (الـ Float):</span>
                <input 
                  type="number" 
                  className="calc-input" 
                  value={openingFloat} 
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  min={0}
                  required
                />
              </div>

              <div className="calc-row highlight">
                <span>النقد المطلوب وجوده بالدرج (Expected Cash):</span>
                <strong style={{ fontSize: '1.1rem', color: '#1e40af' }}>
                  {financialTotals.expectedDrawerCash} ج.م
                </strong>
              </div>

              <div className="calc-row">
                <label style={{ fontWeight: 800, color: '#0f172a' }}>
                  النقد الفعلي المعدود بالدرج (Actual Cash Count) *:
                </label>
                <input 
                  type="number" 
                  className="calc-input actual-input" 
                  placeholder="أدخل المبلغ بعد العد اليدوي..."
                  value={actualCashCounted}
                  onChange={(e) => setActualCashCounted(e.target.value)}
                  min={0}
                  required
                />
              </div>

              {actualCashCounted !== '' && (
                <div className={`discrepancy-banner ${discrepancy === 0 ? 'balanced' : discrepancy > 0 ? 'surplus' : 'deficit'}`}>
                  {discrepancy === 0 ? (
                    <><CheckCircle2 size={18} /> الخزينة متطابقة تماماً بنسبة 100% (Balanced)</>
                  ) : discrepancy > 0 ? (
                    <><AlertCircle size={18} /> يوجد فائض نقدي بالدرج: +{discrepancy} ج.م</>
                  ) : (
                    <><AlertCircle size={18} /> يوجد عجز نقدي بالدرج: {discrepancy} ج.م</>
                  )}
                </div>
              )}
            </div>

            {/* Handover Details */}
            <div className="form-group-row">
              <div className="field-box">
                <label>اسم مسؤول الاستقبال *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={staffName} 
                  onChange={(e) => setStaffName(e.target.value)}
                  required
                />
              </div>
              <div className="field-box">
                <label>ملاحظات تسليم الوردية للمناوب التالي</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="مثال: تم تسليم الخزينة ومفتاح الدرج للدكتور المناوب..."
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="shift-footer-actions">
              <button type="button" className="btn-print-shift" onClick={handlePrint}>
                <Printer size={16} />
                <span>طباعة تقرير الإغلاق</span>
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  إلغاء
                </button>
                <button type="submit" className="btn-primary">
                  تأكيد وإغلاق الوردية
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
