import React from 'react';
import { Search, Calendar, RotateCcw, ArrowDownLeft, ArrowUpRight, Layers } from 'lucide-react';

export default function InvoicesFiltersBar({
  searchQuery = '',
  setSearchQuery,
  statusFilter = 'all',
  setStatusFilter,
  totalCount = 0,
  viewMode = 'all', // 'all' (حركة الخزينة), 'in' (فلوس داخل), 'out' (فلوس خارج)
  setViewMode,
  startDate = '',
  setStartDate,
  endDate = '',
  setEndDate,
  inflowCount = 0,
  outflowCount = 0
}) {
  const handleQuickPreset = (presetKey) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (presetKey === 'today') {
      setStartDate?.(todayStr);
      setEndDate?.(todayStr);
    } else if (presetKey === 'week') {
      const d = new Date(today);
      d.setDate(today.getDate() - 7);
      setStartDate?.(d.toISOString().split('T')[0]);
      setEndDate?.(todayStr);
    } else if (presetKey === 'month') {
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      setStartDate?.(`${y}-${m}-01`);
      setEndDate?.(todayStr);
    } else if (presetKey === 'last30') {
      const d = new Date(today);
      d.setDate(today.getDate() - 30);
      setStartDate?.(d.toISOString().split('T')[0]);
      setEndDate?.(todayStr);
    } else if (presetKey === 'all') {
      setStartDate?.('');
      setEndDate?.('');
    }
  };

  const hasActiveDateFilter = Boolean(startDate || endDate);

  return (
    <div className="invoices-filter-panel glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem', borderRadius: 'var(--radius-xl)' }}>
      {/* Top Row: Flow View Mode Tabs (داخل / خارج / الكل) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div className="flow-mode-tabs" role="tablist" aria-label="نوع التدفق المالي" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'all'}
            className={`filter-pill ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode?.('all')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Layers size={15} />
            <span>حركة الخزينة العامة ({totalCount})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'in'}
            className={`filter-pill ${viewMode === 'in' ? 'active' : ''}`}
            onClick={() => setViewMode?.('in')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowDownLeft size={15} color="var(--success, #16A34A)" />
            <span>فلوس داخل (المقبوضات) {inflowCount > 0 ? `(${inflowCount})` : ''}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'out'}
            className={`filter-pill ${viewMode === 'out' ? 'active' : ''}`}
            onClick={() => setViewMode?.('out')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowUpRight size={15} color="var(--danger, #DC2626)" />
            <span>فلوس خارج (المصروفات) {outflowCount > 0 ? `(${outflowCount})` : ''}</span>
          </button>
        </div>

        {/* Quick Date Presets (اليوم، هذا الأسبوع، هذا الشهر، آخر 30 يوماً، الكل) */}
        <div className="quick-date-presets" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>فترة سريعة:</span>
          <button
            type="button"
            className="btn-quick-date"
            onClick={() => handleQuickPreset('today')}
          >
            اليوم
          </button>
          <button
            type="button"
            className="btn-quick-date"
            onClick={() => handleQuickPreset('week')}
          >
            هذا الأسبوع
          </button>
          <button
            type="button"
            className="btn-quick-date"
            onClick={() => handleQuickPreset('month')}
          >
            هذا الشهر
          </button>
          <button
            type="button"
            className="btn-quick-date"
            onClick={() => handleQuickPreset('last30')}
          >
            آخر 30 يوماً
          </button>
          <button
            type="button"
            className="btn-quick-date"
            onClick={() => handleQuickPreset('all')}
          >
            كل الفترات
          </button>
        </div>
      </div>

      {/* Middle Row: Date Range Pickers ("من تاريخ كذا إلى تاريخ كذا") + Search Box */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        {/* Search */}
        <div className="search-box" style={{ flex: '1 1 260px', minWidth: '220px' }}>
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder={viewMode === 'out' ? 'بحث ببند المصروف، التصنيف، أو الملاحظات...' : 'بحث برقم الفاتورة، اسم المريض، الهاتف، أو البند...'}
            aria-label="بحث في الحسابات"
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery?.(e.target.value)}
          />
        </div>

        {/* Date Range Inputs ("من كذا لكذا") */}
        <div className="date-range-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={16} color="var(--primary)" />
            <label htmlFor="date-range-start" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              من:
            </label>
            <input
              id="date-range-start"
              type="date"
              className="input-field"
              style={{ width: 'auto', minWidth: '135px', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
              value={startDate}
              onChange={(e) => setStartDate?.(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <label htmlFor="date-range-end" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              إلى:
            </label>
            <input
              id="date-range-end"
              type="date"
              className="input-field"
              style={{ width: 'auto', minWidth: '135px', padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
              value={endDate}
              onChange={(e) => setEndDate?.(e.target.value)}
            />
          </div>

          {hasActiveDateFilter && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={() => {
                setStartDate?.('');
                setEndDate?.('');
              }}
              title="إلغاء فلتر التاريخ وعرض كل الفترات"
            >
              <RotateCcw size={14} />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Status Filter Pills (Active when viewing Invoices or All) */}
      {viewMode !== 'out' && setStatusFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>حالة سداد الفواتير:</span>
          <div className="status-filter-pills" role="tablist" aria-label="تصفية الفواتير حسب حالة السداد">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              الكل
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'unpaid'}
              className={`filter-pill ${statusFilter === 'unpaid' ? 'active' : ''}`}
              onClick={() => setStatusFilter('unpaid')}
            >
              مستحقة للدفع
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'partial'}
              className={`filter-pill ${statusFilter === 'partial' ? 'active' : ''}`}
              onClick={() => setStatusFilter('partial')}
            >
              سداد جزئي
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'paid'}
              className={`filter-pill ${statusFilter === 'paid' ? 'active' : ''}`}
              onClick={() => setStatusFilter('paid')}
            >
              مدفوعة بالكامل
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

