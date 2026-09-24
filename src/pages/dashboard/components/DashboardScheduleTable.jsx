import React from 'react';
import { Search, Calendar, Plus, FolderOpen, Wallet } from 'lucide-react';

/**
 * DashboardScheduleTable
 * High-density schedule table for today's appointments:
 * - Search query with fast input response
 * - Segmented status filter tabs with badge counts
 * - Action buttons with guard checks (room occupancy, payment collection, clinical exam finish)
 */
const DashboardScheduleTable = ({
  filteredAppointments = [],
  scheduleSearchQuery = '',
  setScheduleSearchQuery = () => {},
  activeFilterTab = 'all',
  setActiveFilterTab = () => {},
  waitingToday = [],
  inProgressToday = [],
  pendingPaymentToday = [],
  completedToday = [],
  bookedToday = [],
  currentExamPatient = null,
  isDoctor = false,
  onStartExam = () => {},
  onFinishExam = () => {},
  onCollectPayment = () => {},
  onOpenDossier = () => {},
  onOpenWalkInModal = () => {}
}) => {
  return (
    <div className="schedule-table-card compact-table-card">
      <div className="table-card-header">
        <div className="header-title">
          <h3>جدول مواعيد اليوم التفصيلي ({filteredAppointments.length})</h3>
        </div>
        <div className="header-tools">
          <div className="search-box compact-search">
            <Search size={15} aria-hidden="true" />
            <input
              type="text"
              placeholder="بحث سريع في جدول اليوم..."
              aria-label="البحث في جدول مواعيد اليوم"
              value={scheduleSearchQuery}
              onChange={(e) => setScheduleSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-tabs compact-tabs" role="tablist" aria-label="تصفية مواعيد اليوم">
            {['all', 'waiting', 'in_progress', 'pending_payment', 'completed', 'booked'].map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeFilterTab === tab}
                aria-label={`تصفية حسب ${
                  tab === 'all' ? 'جميع الحالات' :
                  tab === 'waiting' ? 'الانتظار' :
                  tab === 'in_progress' ? 'في الكشف' :
                  tab === 'pending_payment' ? 'في انتظار التحصيل' :
                  tab === 'completed' ? 'مكتمل' : 'قادم'
                }`}
                className={`tab-pill ${activeFilterTab === tab ? 'active' : ''}`}
                onClick={() => setActiveFilterTab(tab)}
              >
                {tab === 'all' && 'الكل'}
                {tab === 'waiting' && `انتظار (${waitingToday.length})`}
                {tab === 'in_progress' && `في الكشف (${inProgressToday.length})`}
                {tab === 'pending_payment' && `تحصيل (${pendingPaymentToday.length})`}
                {tab === 'completed' && `مكتمل (${completedToday.length})`}
                {tab === 'booked' && `قادم (${bookedToday.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table compact-table">
          <thead>
            <tr>
              <th>المريض</th>
              <th>الموعد</th>
              <th>نوع الكشف</th>
              <th>الحالة</th>
              <th>الرسوم</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center empty-cell" style={{ padding: '2.5rem 1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <Calendar size={36} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} aria-hidden="true" />
                    <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: '0.96rem' }}>
                      {scheduleSearchQuery || activeFilterTab !== 'all' 
                        ? 'لا توجد مواعيد مطابقة لهذا الفلتر أو البحث' 
                        : 'لا توجد كشوفات مجدولة لهذا اليوم'}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.82rem', maxWidth: '380px' }}>
                      {scheduleSearchQuery || activeFilterTab !== 'all'
                        ? 'جرّب كتابة اسم مريض آخر أو إعادة تعيين التصفية للعودة لكافة المواعيد.'
                        : 'ابدأ بتسجيل كشف فوري (Walk-in) من شريط الإجراءات السريعة بالأسفل.'}
                    </p>
                    {scheduleSearchQuery || activeFilterTab !== 'all' ? (
                      <button
                        type="button"
                        className="tab-pill active"
                        style={{ marginTop: '0.5rem', border: '1px solid var(--border-color)', padding: '0.4rem 0.9rem' }}
                        onClick={() => { setScheduleSearchQuery(''); setActiveFilterTab('all'); }}
                      >
                        إعادة ضبط الفلاتر
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-action-primary"
                        style={{ marginTop: '0.5rem', padding: '0.45rem 1rem' }}
                        onClick={onOpenWalkInModal}
                      >
                        <Plus size={15} style={{ marginLeft: '0.35rem' }} />
                        <span>تسجيل كشف فوري (Walk-in)</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredAppointments.map((appt) => (
                <tr key={appt.id}>
                  <td>
                    <div className="patient-cell">
                      <strong>{appt.patientName}</strong>
                      <small dir="ltr">{appt.patientPhone}</small>
                    </div>
                  </td>
                  <td>{appt.time}</td>
                  <td><span className="type-chip">{appt.type || 'كشف'}</span></td>
                  <td>
                    <span className={`status-badge ${appt.status}`}>
                      {appt.status === 'completed' && 'مكتمل'}
                      {appt.status === 'in_progress' && 'في الكشف'}
                      {appt.status === 'waiting' && 'في الانتظار'}
                      {appt.status === 'pending_payment' && 'في انتظار التحصيل'}
                      {(appt.status === 'booked' || appt.status === 'upcoming') && 'محجوز'}
                      {appt.status === 'cancelled' && 'ملغي'}
                    </span>
                  </td>
                  <td>{appt.fee || '300 ج.م'}</td>
                  <td>
                    <div className="row-actions">
                      {appt.status === 'waiting' && (
                        <button
                          type="button"
                          onClick={() => onStartExam(appt)}
                          className="btn-action-primary"
                          disabled={!!currentExamPatient}
                          style={currentExamPatient ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          title={currentExamPatient ? `غرفة الكشف مشغولة حالياً بـ ${currentExamPatient.patientName}` : (isDoctor ? 'بدء الكشف' : 'إدخال للطبيب')}
                        >
                          {isDoctor ? 'بدء الكشف' : 'إدخال للطبيب'}
                        </button>
                      )}
                      {appt.status === 'in_progress' && isDoctor && (
                        <button
                          type="button"
                          onClick={() => onFinishExam(appt)}
                          className="btn-action-success"
                        >
                          إنهاء الكشف
                        </button>
                      )}
                      {appt.status === 'pending_payment' && (
                        <button
                          type="button"
                          onClick={() => onCollectPayment(appt)}
                          className="btn-action-success"
                          title="تحصيل الرسوم وإصدار الفاتورة الإلكترونية"
                        >
                          <Wallet size={13} style={{ marginLeft: '0.35rem' }} />
                          <span>تحصيل الرسوم</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenDossier(appt)}
                        className="btn-action-icon"
                        title="عرض السجل الطبي"
                        aria-label="عرض السجل الطبي"
                      >
                        <FolderOpen size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardScheduleTable;
