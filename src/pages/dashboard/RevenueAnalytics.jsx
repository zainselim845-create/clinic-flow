import React, { useMemo } from 'react';
import { TrendingUp, Wallet, CheckCircle2, Users, TrendingDown, DollarSign, BellRing } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts';

export default function RevenueAnalytics({
  weeklyData = [],
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

  const netProfit = useMemo(() => {
    // Total clinic revenue from all completed appointments
    const allRevenue = (state.appointments || [])
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => {
        const feeNum = parseInt((a.fee || '300').replace(/\D/g, ''), 10) || 300;
        return sum + feeNum;
      }, 0);
    return allRevenue - totalExpenses;
  }, [state.appointments, totalExpenses]);

  const chartData = weeklyData || [
    { day: 'السبت', count: 12, revenue: 3600 },
    { day: 'الأحد', count: 15, revenue: 4500 },
    { day: 'الإثنين', count: 10, revenue: 3000 },
    { day: 'الثلاثاء', count: 18, revenue: 5400 },
    { day: 'الأربعاء', count: 14, revenue: 4200 },
    { day: 'الخميس', count: 16, revenue: 4800 },
    { day: 'الجمعة', count: 0, revenue: 0 }
  ];

  return (
    <div className="analytics-overview-card">
      <div className="analytics-header">
        <div>
          <h4>
            <TrendingUp size={20} className="text-primary" />
            <span>مؤشرات الأداء المالي والسريري</span>
          </h4>
          <p>توزيع أعداد المرضى، الإيرادات والمصروفات وصافي الأرباح</p>
        </div>
        
        <div className="analytics-quick-stats" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div className="quick-stat-badge">
            <Wallet size={16} />
            <span>إيراد اليوم: <strong>{todayRevenue} ج.م</strong></span>
          </div>

          <div className="quick-stat-badge" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <TrendingDown size={16} color="#ef4444" />
            <span>المصروفات: <strong style={{ color: '#ef4444' }}>{totalExpenses} ج.م</strong></span>
          </div>

          <div className="quick-stat-badge" style={{ borderColor: 'rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.05)' }}>
            <DollarSign size={16} color="#10b981" />
            <span>صافي الربح: <strong style={{ color: '#10b981' }}>{netProfit} ج.م</strong></span>
          </div>

          {onOpenExpenses && (
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={onOpenExpenses}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 700 }}
            >
              <Wallet size={14} />
              <span>إدارة المصروفات</span>
            </button>
          )}

          {onOpenRecalls && (
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={onOpenRecalls}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 700 }}
            >
              <BellRing size={14} />
              <span>استدعاء المرضى ({(state.recalls || []).length})</span>
            </button>
          )}
        </div>
      </div>

      <div className="chart-container" style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                direction: 'rtl'
              }}
              formatter={(value, name) => [
                name === 'revenue' ? `${value} ج.م` : `${value} مريض`,
                name === 'revenue' ? 'الإيراد' : 'عدد الكشوفات'
              ]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#0d9488"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
