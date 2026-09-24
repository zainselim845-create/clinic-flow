import React from 'react';
import { Receipt, DollarSign, AlertCircle, Clock } from 'lucide-react';

export default function InvoicesMetricsGrid({
  totalBilled = 0,
  totalCollected = 0,
  totalOutstanding = 0,
  invoicesCount = 0
}) {
  return (
    <div className="invoices-metrics-grid">
      <div className="inv-metric-card">
        <div className="metric-icon-wrap blue"><Receipt size={22} /></div>
        <div>
          <span className="metric-lbl">إجمالي المطالبات</span>
          <strong className="metric-val">{totalBilled.toLocaleString()} ج.م</strong>
        </div>
      </div>

      <div className="inv-metric-card">
        <div className="metric-icon-wrap green"><DollarSign size={22} /></div>
        <div>
          <span className="metric-lbl">إجمالي المتحصلات</span>
          <strong className="metric-val text-success">{totalCollected.toLocaleString()} ج.م</strong>
        </div>
      </div>

      <div className="inv-metric-card">
        <div className="metric-icon-wrap red"><AlertCircle size={22} /></div>
        <div>
          <span className="metric-lbl">الديون والمستحقات</span>
          <strong className="metric-val text-danger">{totalOutstanding.toLocaleString()} ج.م</strong>
        </div>
      </div>

      <div className="inv-metric-card">
        <div className="metric-icon-wrap orange"><Clock size={22} /></div>
        <div>
          <span className="metric-lbl">عدد الفواتير الصادرة</span>
          <strong className="metric-val">{invoicesCount} فاتورة</strong>
        </div>
      </div>
    </div>
  );
}
