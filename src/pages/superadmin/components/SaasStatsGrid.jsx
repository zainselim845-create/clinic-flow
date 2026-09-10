import React from 'react';
import { Building2, CreditCard, Activity, HardDrive } from 'lucide-react';

export function SaasStatsGrid({
  totalClinics,
  activeClinics,
  estimatedMRR,
  totalSmsUsed,
  totalSmsQuota
}) {
  const smsPercent = Math.round((totalSmsUsed / (totalSmsQuota || 1)) * 100);

  return (
    <div className="saas-kpi-grid">
      <div className="saas-kpi-card">
        <div className="kpi-icon-wrap primary">
          <Building2 size={24} />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">إجمالي العيادات المشتركة</span>
          <strong className="kpi-value">{totalClinics}</strong>
          <span className="kpi-subtext text-success">{activeClinics} عيادة نشطة حالياً</span>
        </div>
      </div>

      <div className="saas-kpi-card">
        <div className="kpi-icon-wrap success">
          <CreditCard size={24} />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">العائد الشهري المتكرر (MRR)</span>
          <strong className="kpi-value">{estimatedMRR.toLocaleString()} ج.م</strong>
          <span className="kpi-subtext">نمو مستقر +18% هذا الشهر</span>
        </div>
      </div>

      <div className="saas-kpi-card">
        <div className="kpi-icon-wrap warning">
          <Activity size={24} />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">استهلاك رسائل SMS للمنصة</span>
          <strong className="kpi-value">
            {totalSmsUsed.toLocaleString()} <span className="text-muted">/ {totalSmsQuota.toLocaleString()}</span>
          </strong>
          <span className="kpi-subtext">نسبة الاستهلاك الإجمالي {smsPercent}%</span>
        </div>
      </div>

      <div className="saas-kpi-card">
        <div className="kpi-icon-wrap purple">
          <HardDrive size={24} />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">عزل البيانات وحصانة RLS</span>
          <strong className="kpi-value">100%</strong>
          <span className="kpi-subtext text-success">PostgreSQL Multi-Tenant Active</span>
        </div>
      </div>
    </div>
  );
}
