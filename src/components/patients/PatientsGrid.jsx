import React from 'react';
import { Users, Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import PatientCard from '../PatientCard';

export default function PatientsGrid({
  viewMode = 'grid',
  paginatedPatients = [],
  searchQuery = '',
  totalPatientsCount = 0,
  currentPage = 1,
  totalPages = 1,
  setCurrentPage,
  setSearchQuery,
  handleOpenDetail,
  handleEditPatient,
  onOpenNewPatient
}) {
  return (
    <>
      <div className={`patients-${viewMode}`}>
        {paginatedPatients.length > 0 ? (
          paginatedPatients.map(patient => (
            <div key={patient.id} onClick={() => handleOpenDetail(patient)}>
              <PatientCard patient={patient} onEdit={handleEditPatient} />
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Users size={48} className="empty-state-icon" aria-hidden="true" />
            <h3 className="empty-state-title">
              {searchQuery ? 'لا يوجد مرضى مطابقين لمعايير البحث' : 'سجل المرضى فارغ حتى الآن'}
            </h3>
            <p className="empty-state-desc">
              {searchQuery 
                ? 'جرّب كتابة اسم مريض آخر أو رقم هاتف صحيح، أو قم بإلغاء البحث.' 
                : 'ابدأ بإضافة أول مريض في عيادتك لإنشاء ملف طبي متكامل ومتابعة الكشوفات والتقارير.'}
            </p>
            <div className="empty-state-action">
              {searchQuery ? (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setSearchQuery('')}
                >
                  إلغاء البحث
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={onOpenNewPatient}
                >
                  <Plus size={18} />
                  <span>إضافة أول مريض</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* High-Volume Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          margin: '2rem 0',
          padding: '0.75rem 1.5rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          width: 'fit-content',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ChevronRight size={16} />
            <span>السابق</span>
          </button>
          
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            صفحة {currentPage} من {totalPages} ({totalPatientsCount} مريض إجمالي)
          </span>

          <button
            type="button"
            className="btn-secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>التالي</span>
            <ChevronLeft size={16} />
          </button>
        </div>
      )}
    </>
  );
}
