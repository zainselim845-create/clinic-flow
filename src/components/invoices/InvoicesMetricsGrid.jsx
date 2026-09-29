import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, AlertCircle, Calendar } from 'lucide-react';

export default function InvoicesMetricsGrid({
  totalBilled = 0,
  totalCollected = 0,
  totalOutstanding = 0,
  invoicesCount = 0,
  totalInflow,
  totalOutflow = 0,
  netCashFlow,
  expensesCount = 0,
  dateRangeLabel = ''
}) {
  const resolvedInflow = totalInflow !== undefined ? totalInflow : totalCollected;
  const resolvedNet = netCashFlow !== undefined ? netCashFlow : (resolvedInflow - totalOutflow);
  const isSurplus = resolvedNet >= 0;

  return (
    <div className="invoices-metrics-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {dateRangeLabel && (
        <div 
          className="date-range-active-indicator" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            alignSelf: 'flex-start',
            border: '1px solid var(--border-color)'
          }}
        >
          <Calendar size={14} style={{ color: 'var(--primary)' }} />
          <span>الفترة المحاسبية النشطة: <strong>{dateRangeLabel}</strong></span>
        </div>
      )}

      <div className="invoices-metrics-grid">
        {/* Money In (فلوس داخل) */}
        <div className="inv-metric-card" style={{ borderRight: '4px solid var(--success, #16A34A)' }}>
          <div className="metric-icon-wrap green"><ArrowDownLeft size={24} /></div>
          <div>
            <span className="metric-lbl">فلوس داخل (المقبوضات المحصلة)</span>
            <strong className="metric-val text-success">+{resolvedInflow.toLocaleString()} ج.م</strong>
            <small style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {invoicesCount} معاملة تحصيل
            </small>
          </div>
        </div>

        {/* Money Out (فلوس خارج) */}
        <div className="inv-metric-card" style={{ borderRight: '4px solid var(--danger, #DC2626)' }}>
          <div className="metric-icon-wrap red"><ArrowUpRight size={24} /></div>
          <div>
            <span className="metric-lbl">فلوس خارج (المصروفات التشغيلية)</span>
            <strong className="metric-val text-danger">-{totalOutflow.toLocaleString()} ج.م</strong>
            <small style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {expensesCount} سند صرف نقدية
            </small>
          </div>
        </div>

        {/* Net Cash Flow (صافي الخزينة) */}
        <div className="inv-metric-card" style={{ borderRight: `4px solid ${isSurplus ? 'var(--primary, #09090B)' : 'var(--danger, #DC2626)'}` }}>
          <div className="metric-icon-wrap blue"><Wallet size={24} /></div>
          <div>
            <span className="metric-lbl">صافي الخزينة (السيولة النقدية)</span>
            <strong className={`metric-val ${isSurplus ? 'text-primary' : 'text-danger'}`}>
              {resolvedNet.toLocaleString()} ج.م
            </strong>
            <small style={{ display: 'block', fontSize: '0.72rem', color: isSurplus ? 'var(--success, #16A34A)' : 'var(--danger, #DC2626)', marginTop: '0.15rem', fontWeight: 700 }}>
              {isSurplus ? 'فائض نقدي متاح' : 'عجز في السيولة'}
            </small>
          </div>
        </div>

        {/* Pending Receivables (مستحقات معلقة) */}
        <div className="inv-metric-card" style={{ borderRight: '4px solid var(--warning, #D97706)' }}>
          <div className="metric-icon-wrap orange"><AlertCircle size={24} /></div>
          <div>
            <span className="metric-lbl">مستحقات معلقة (ديون المرضى)</span>
            <strong className="metric-val text-danger">{totalOutstanding.toLocaleString()} ج.م</strong>
            <small style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              مبالغ متبقية قيد السداد
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

