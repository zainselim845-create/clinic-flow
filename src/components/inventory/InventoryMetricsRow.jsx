import React from 'react';
import { Package, ShieldAlert, CheckCircle2 } from 'lucide-react';

/**
 * InventoryMetricsRow
 * High-level inventory valuation and critical stock indicators.
 */
export const InventoryMetricsRow = ({
  totalItems = 0,
  lowStockCount = 0,
  totalValuation = 0
}) => {
  return (
    <div className="inv-metrics-row">
      <div className="inv-stat-card">
        <div className="stat-icon-wrap blue">
          <Package size={22} />
        </div>
        <div>
          <span className="stat-lbl">إجمالي الأصناف المسجلة</span>
          <strong className="stat-val">{totalItems} صنف</strong>
        </div>
      </div>

      <div className="inv-stat-card">
        <div className="stat-icon-wrap red">
          <ShieldAlert size={22} />
        </div>
        <div>
          <span className="stat-lbl">أصناف قاربت على النفاد</span>
          <strong className="stat-val text-danger">{lowStockCount} أصناف حرجة</strong>
        </div>
      </div>

      <div className="inv-stat-card">
        <div className="stat-icon-wrap green">
          <CheckCircle2 size={22} />
        </div>
        <div>
          <span className="stat-lbl">إجمالي القيمة التقديرية للمخزون</span>
          <strong className="stat-val text-success">{totalValuation.toLocaleString()} ج.م</strong>
        </div>
      </div>
    </div>
  );
};

export default InventoryMetricsRow;
