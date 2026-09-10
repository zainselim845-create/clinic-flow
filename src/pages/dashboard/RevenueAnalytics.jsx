import React, { useMemo } from 'react';
import { Wallet, CreditCard, Banknote, ArrowUpRight, ArrowDownRight, BellRing, Receipt, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

function RevenueAnalytics({
  todayRevenue = 0,
  attendanceRate = 0,
  completedCount = 0,
  onOpenExpenses,
  onOpenRecalls
}) {
  const { state } = useApp();

  const totalExpenses = useMemo(() => {
    return (state.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [state.expenses]);

  // Breakdown of today payments
  const todayBreakdown = useMemo(() => {
    const completed = (state.appointments || []).filter(a => a.status === 'completed');
    let cash = 0;
    let electronic = 0;

    completed.forEach(a => {
      const rawFee = a.fee ?? a.paidAmount;
      const fee = typeof rawFee === 'number'
        ? rawFee
        : (parseInt(String(rawFee || '300').replace(/\D/g, ''), 10) || 300);
      if (a.paymentMethod === 'card' || a.paymentMethod === 'instapay') {
        electronic += fee;
      } else {
        cash += fee;
      }
    });

    return { cash, electronic };
  }, [state.appointments]);

  const netTodayProfit = Math.max(0, todayRevenue - (totalExpenses > 0 ? Math.min(todayRevenue, totalExpenses) : 0));
  const waitingCount = (state.appointments || []).filter(a => a.status === 'waiting').length;
  const totalToday = (state.appointments || []).filter(a => a.date === new Date().toISOString().split('T')[0]).length || 5;

  return (
    <div className="apple-financial-card">
      {/* 1. Header */}
      <div className="af-header">
        <div className="af-title-group">
          <div className="af-icon-circle">
            <Receipt size={18} />
          </div>
          <div>
            <h4 className="af-title">الخزينة والعمليات السريرية</h4>
            <span className="af-subtitle">متابعة دقيقة للإيرادات والمصروفات وصافي الأرباح</span>
          </div>
        </div>
        <span className="af-status-badge">
          <ShieldCheck size={13} />
          <span>مطابق وموثق</span>
        </span>
      </div>

      {/* 2. Hero Net Revenue Figure */}
      <div className="af-hero-stat">
        <div className="af-hero-main">
          <span className="af-hero-label">إجمالي إيراد اليوم المحصل</span>
          <div className="af-hero-amount-row">
            <h2 className="af-hero-amount">{todayRevenue.toLocaleString('en-US')} <span className="af-currency">ج.م</span></h2>
            <span className="af-profit-tag">
              <ArrowUpRight size={14} />
              <span>صافي اليوم: {netTodayProfit.toLocaleString('en-US')} ج.م</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Detailed Operational Breakdown Grid */}
      <div className="af-breakdown-grid">
        <div className="af-mini-card">
          <div className="af-mini-header">
            <Banknote size={15} className="text-muted" />
            <span>التحصيل النقدي (كاش)</span>
          </div>
          <strong className="af-mini-val">{todayBreakdown.cash.toLocaleString('en-US')} ج.م</strong>
        </div>

        <div className="af-mini-card">
          <div className="af-mini-header">
            <CreditCard size={15} className="text-muted" />
            <span>إلكتروني (فيزا / إنستاباي)</span>
          </div>
          <strong className="af-mini-val">{todayBreakdown.electronic.toLocaleString('en-US')} ج.م</strong>
        </div>

        <div className="af-mini-card">
          <div className="af-mini-header">
            <ArrowDownRight size={15} className="text-muted" />
            <span>المصروفات المسجلة</span>
          </div>
          <strong className="af-mini-val text-error">{totalExpenses.toLocaleString('en-US')} ج.م</strong>
        </div>
      </div>

      {/* 4. Operational Progress Bar */}
      <div className="af-progress-box">
        <div className="af-progress-labels">
          <span>إنجاز جدول اليوم ({completedCount} من {totalToday})</span>
          <span className="af-progress-pct">{attendanceRate}%</span>
        </div>
        <div className="af-progress-track">
          <div className="af-progress-fill" style={{ width: `${attendanceRate}%` }}></div>
        </div>
        <div className="af-progress-footer">
          <span>المرضى في صالة الانتظار: <strong>{waitingCount}</strong></span>
          <span>ترتيب حسب الحضور</span>
        </div>
      </div>

      {/* 5. Clean Action Controls */}
      <div className="af-actions-row">
        {onOpenExpenses && (
          <button 
            type="button" 
            className="af-btn-action"
            onClick={onOpenExpenses}
          >
            <Wallet size={15} />
            <span>إدارة المصروفات</span>
          </button>
        )}

        {onOpenRecalls && (
          <button 
            type="button" 
            className="af-btn-action"
            onClick={onOpenRecalls}
          >
            <BellRing size={15} />
            <span>استدعاء المتابعة ({(state.recalls || []).length})</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default React.memo(RevenueAnalytics);
