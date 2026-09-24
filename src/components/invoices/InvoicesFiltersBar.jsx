import React from 'react';
import { Search } from 'lucide-react';

export default function InvoicesFiltersBar({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  totalCount = 0
}) {
  return (
    <div className="filters-bar glass-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <div className="search-box" style={{ flex: 1, minWidth: '240px' }}>
        <Search size={18} className="search-icon" aria-hidden="true" />
        <input
          type="text"
          placeholder="بحث برقم الفاتورة، اسم المريض، أو الهاتف..."
          aria-label="بحث برقم الفاتورة، اسم المريض، أو الهاتف"
          className="input-field"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="status-filter-pills" role="tablist" aria-label="تصفية الفواتير حسب حالة السداد">
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === 'all'}
          className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          الكل ({totalCount})
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
  );
}
