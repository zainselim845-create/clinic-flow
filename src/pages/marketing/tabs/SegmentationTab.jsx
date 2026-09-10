import React from 'react';
import { Search, Send } from 'lucide-react';

export function SegmentationTab({
  crmStats,
  selectedSegment,
  setSelectedSegment,
  searchQuery,
  setSearchQuery,
  filteredPatients,
  setComposerSegment,
  setActiveTab
}) {
  return (
    <div className="crm-tab-content">
      <div className="segmentation-filter-bar">
        <div className="segment-pills">
          {[
            { id: 'all', label: `الكل (${crmStats.totalPatients})` },
            { id: 'vip', label: `VIP كبار العملاء (${crmStats.vipCount})` },
            { id: 'returning', label: `مرضى دائمون (${crmStats.returningCount})` },
            { id: 'new', label: `جدد (${crmStats.newCount})` },
            { id: 'dormant', label: `خاملون 6+ أشهر (${crmStats.dormantCount})` }
          ].map(seg => (
            <button
              key={seg.id}
              className={`segment-pill-btn ${selectedSegment === seg.id ? 'active' : ''}`}
              onClick={() => setSelectedSegment(seg.id)}
            >
              {seg.label}
            </button>
          ))}
        </div>

        <div className="search-box-wrap">
          <Search size={16} />
          <input 
            type="text"
            placeholder="بحث في الشريحة بالاسم أو الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-responsive crm-table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>المريض</th>
              <th>الشريحة الحالية</th>
              <th>عدد الزيارات</th>
              <th>إجمالي الإنفاق (LTV)</th>
              <th>آخر زيارة</th>
              <th>الإجراء المقترح</th>
            </tr>
          </thead>
          <tbody>
            {(filteredPatients || []).length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-muted">لا يوجد مرضى في هذه الشريحة حالياً.</td>
              </tr>
            ) : (
              filteredPatients.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="patient-cell">
                      <strong>{p.name}</strong>
                      <small dir="ltr">{p.phone}</small>
                    </div>
                  </td>
                  <td>
                    <span className="segment-badge badge-VIP">
                      {p.valueTier === 'vip' ? '⭐ VIP مريض مميز' : p.lifecycle === 'new' ? '✨ جديد' : p.lifecycle === 'dormant' ? '⏳ خامل 6+ أشهر' : '🟢 نشط دائم'}
                    </span>
                  </td>
                  <td><strong>{p.visitsCount || 1}</strong> زيارة</td>
                  <td><strong>{p.ltv || 300} ج.م</strong></td>
                  <td>{p.daysSinceLastVisit ? `${p.daysSinceLastVisit} يوم مضت` : 'حديث التسجيل'}</td>
                  <td>
                    <button 
                      className="btn-action-primary"
                      onClick={() => {
                        setComposerSegment(p.lifecycle || 'dormant');
                        setActiveTab('ai_composer');
                      }}
                    >
                      <Send size={13} />
                      <span>تجهيز حملة</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
