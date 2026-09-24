import React from 'react';
import { Search, LayoutGrid, Armchair, Download, Lock, Plus } from 'lucide-react';

/**
 * AppointmentFiltersBar
 * Decoupled filtering header and toolbar for Appointments page:
 * - Status pills with live counts
 * - View mode toggle (Cards grid vs Multi-Chair synchronous grid)
 * - Date picker filter
 * - Quick text search
 * - Action buttons: Export CSV, Block Slots (Doctor), New Appointment
 */
const AppointmentFiltersBar = ({
  appointments = [],
  filterStatus = 'all',
  onSelectFilterStatus = () => {},
  filterDate = '',
  onChangeFilterDate = () => {},
  searchQuery = '',
  onChangeSearchQuery = () => {},
  viewMode = 'grid',
  onChangeViewMode = () => {},
  isDoctor = false,
  onExportCsv = () => {},
  onOpenBlockerModal = () => {},
  onOpenNewAppointmentModal = () => {}
}) => {
  const waitingCount = appointments.filter(a => a.status === 'waiting').length;
  const inProgressCount = appointments.filter(a => a.status === 'in_progress').length;
  const bookedCount = appointments.filter(a => a.status === 'booked' || a.status === 'upcoming').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;

  return (
    <>
      <div className="page-header">
        <h1>إدارة المواعيد (لوحة السكرتير والأطباء)</h1>
        <div className="header-actions-btns">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onExportCsv} 
            title="تصدير المواعيد لملف إكسيل"
          >
            <Download size={16} />
            <span>تصدير إكسيل (CSV)</span>
          </button>
          {isDoctor && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onOpenBlockerModal} 
              title="إغلاق/فتح مواعيد العيادة (مخصص للطبيب فقط)"
            >
              <Lock size={16} />
              <span>إغلاق / حظر مواعيد</span>
            </button>
          )}
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onOpenNewAppointmentModal}
          >
            <Plus size={18} />
            <span>موعد جديد</span>
          </button>
        </div>
      </div>

      <div className="filters-bar glass-card">
        <div className="status-filters" role="tablist" aria-label="تصفية المواعيد حسب الحالة">
          <button 
            type="button" 
            role="tab" 
            aria-selected={filterStatus === 'all'} 
            className={filterStatus === 'all' ? 'active' : ''} 
            onClick={() => onSelectFilterStatus('all')}
          >
            الكل ({appointments.length})
          </button>
          <button 
            type="button" 
            role="tab" 
            aria-selected={filterStatus === 'waiting'} 
            className={filterStatus === 'waiting' ? 'active' : ''} 
            onClick={() => onSelectFilterStatus('waiting')}
          >
            في الانتظار ({waitingCount})
          </button>
          <button 
            type="button" 
            role="tab" 
            aria-selected={filterStatus === 'in_progress'} 
            className={filterStatus === 'in_progress' ? 'active' : ''} 
            onClick={() => onSelectFilterStatus('in_progress')}
          >
            في الكشف ({inProgressCount})
          </button>
          <button 
            type="button" 
            role="tab" 
            aria-selected={filterStatus === 'booked'} 
            className={filterStatus === 'booked' ? 'active' : ''} 
            onClick={() => onSelectFilterStatus('booked')}
          >
            محجوز ({bookedCount})
          </button>
          <button 
            type="button" 
            role="tab" 
            aria-selected={filterStatus === 'completed'} 
            className={filterStatus === 'completed' ? 'active' : ''} 
            onClick={() => onSelectFilterStatus('completed')}
          >
            مكتمل ({completedCount})
          </button>
          <button 
            type="button" 
            role="tab" 
            aria-selected={filterStatus === 'cancelled'} 
            className={filterStatus === 'cancelled' ? 'active' : ''} 
            onClick={() => onSelectFilterStatus('cancelled')}
          >
            ملغي ({cancelledCount})
          </button>
        </div>
        
        <div className="other-filters">
          <div className="view-mode-toggle-group">
            <button 
              type="button"
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onChangeViewMode('grid')}
            >
              <LayoutGrid size={14} />
              <span>بطاقات</span>
            </button>
            <button 
              type="button"
              className={`view-mode-btn ${viewMode === 'chairs' ? 'active' : ''}`}
              onClick={() => onChangeViewMode('chairs')}
            >
              <Armchair size={14} />
              <span>الكراسي المتزامنة</span>
            </button>
          </div>

          <div className="date-filter-group">
            <input 
              type="date" 
              className="input-field date-filter-input" 
              value={filterDate}
              onChange={(e) => onChangeFilterDate(e.target.value)}
              aria-label="تصفية المواعيد حسب التاريخ"
              title="تصفية المواعيد حسب التاريخ المحدد"
            />
            {filterDate && (
              <button
                type="button"
                onClick={() => onChangeFilterDate('')}
                className="btn-clear-date"
                title="إلغاء تصفية التاريخ وعرض كافة المواعيد"
              >
                عرض كل الأيام
              </button>
            )}
          </div>
          <div className="search-box">
            <Search size={18} className="search-icon" aria-hidden="true" />
            <input 
              type="text" 
              placeholder="بحث باسم المريض أو الهاتف..." 
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              aria-label="البحث في المواعيد"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default AppointmentFiltersBar;
