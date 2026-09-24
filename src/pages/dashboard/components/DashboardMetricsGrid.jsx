import React from 'react';
import { CalendarDays, Clock, Stethoscope, Wallet, CheckCircle2 } from 'lucide-react';

/**
 * DashboardMetricsGrid
 * Unified Cockpit KPI cards for today's clinical operations:
 * 1. Today's Total Agenda & Attendance Progress
 * 2. Live Waiting Room Queue
 * 3. Active Consultation Room Status
 * 4. Revenue Collection / Completed Appointments
 */
const DashboardMetricsGrid = ({
  todaysAppointments = [],
  completedToday = [],
  waitingToday = [],
  inProgressToday = [],
  attendanceRate = 0,
  currentExamPatient = null,
  canViewRevenue = false,
  todayRevenue = 0,
  activeFilterTab = 'all',
  onSelectFilterTab = () => {},
  isDoctor = false
}) => {
  return (
    <div className="cockpit-stats-grid">
      {/* Metric 1: Total Appointments */}
      <div 
        className={`cockpit-stat-card total-card ${activeFilterTab === 'all' ? 'active-filter-card' : ''}`}
        onClick={() => onSelectFilterTab('all')}
        title="انقر لتصفية جدول اليوم لعرض كافة المواعيد"
      >
        <div className="stat-card-header">
          <div className="stat-icon-box total">
            <CalendarDays size={18} />
          </div>
          <span className="stat-card-tag">أجندة اليوم</span>
        </div>
        <div className="stat-card-body">
          <h3 className="stat-main-number">{todaysAppointments.length}</h3>
          <span className="stat-card-label">حالة مسجلة بالجدول</span>
        </div>
        <div className="stat-progress-bar">
          <div 
            className="stat-progress-fill" 
            style={{ width: `${attendanceRate}%` }}
          />
        </div>
        <div className="stat-card-footer">
          <span>نسبة الإنجاز: {attendanceRate}%</span>
          <span>{completedToday.length} تم الكشف</span>
        </div>
      </div>

      {/* Metric 2: Live Waiting Queue */}
      <div 
        className={`cockpit-stat-card waiting-card ${activeFilterTab === 'waiting' ? 'active-filter-card' : ''}`}
        onClick={() => onSelectFilterTab('waiting')}
        title="انقر لتصفية الجدول لعرض حالات صالة الانتظار فقط"
      >
        <div className="stat-card-header">
          <div className="stat-icon-box waiting">
            <Clock size={18} />
          </div>
          <span className="stat-card-tag waiting-tag">
            <span className="live-pulse-dot" style={{ width: 6, height: 6 }} />
            <span>صالة الانتظار</span>
          </span>
        </div>
        <div className="stat-card-body">
          <h3 className="stat-main-number">{waitingToday.length}</h3>
          <span className="stat-card-label">مرضى بانتظار الدخول</span>
        </div>
        <div className="stat-progress-bar">
          <div 
            className="stat-progress-fill" 
            style={{ width: `${Math.min(100, waitingToday.length * 25)}%` }}
          />
        </div>
        <div className="stat-card-footer">
          <span>{waitingToday.length > 0 ? 'متوسط الانتظار: 10 د' : 'لا يوجد انتظار'}</span>
          <span>أسبقية الحضور</span>
        </div>
      </div>

      {/* Metric 3: Active Consultation Room */}
      <div 
        className={`cockpit-stat-card exam-card ${activeFilterTab === 'in_progress' ? 'active-filter-card' : ''}`}
        onClick={() => onSelectFilterTab('in_progress')}
        title="انقر لتصفية الجدول لعرض حالة الكشف الجارية"
      >
        <div className="stat-card-header">
          <div className="stat-icon-box exam">
            <Stethoscope size={18} />
          </div>
          <span className={`stat-card-tag ${currentExamPatient ? 'in-session-tag' : 'vacant-tag'}`}>
            {currentExamPatient ? (isDoctor ? 'قيد الفحص السريري' : 'داخل غرفة الكشف') : 'الغرفة شاغرة'}
          </span>
        </div>
        <div className="stat-card-body">
          {currentExamPatient ? (
            <>
              <h3 className="stat-main-number">{inProgressToday.length}</h3>
              <span className="stat-card-label">{currentExamPatient.patientName}</span>
            </>
          ) : (
            <>
              <h3 className="stat-main-number" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-secondary)' }}>شاغرة</h3>
              <span className="stat-card-label">جاهزة لاستقبال المريض التالي</span>
            </>
          )}
        </div>
        <div className="stat-progress-bar">
          <div 
            className="stat-progress-fill" 
            style={{ width: currentExamPatient ? '100%' : '0%' }}
          />
        </div>
        <div className="stat-card-footer exam-footer">
          <span>{currentExamPatient ? currentExamPatient.type || 'كشف' : 'غرفة الكشف 1'}</span>
          <span>{currentExamPatient ? 'مع الطبيب' : 'مستعدة'}</span>
        </div>
      </div>

      {/* Metric 4: Daily Revenue OR Completed Appointments */}
      {canViewRevenue ? (
        <div 
          className={`cockpit-stat-card revenue-card ${activeFilterTab === 'completed' ? 'active-filter-card' : ''}`}
          onClick={() => onSelectFilterTab('completed')}
          title="انقر لتصفية الجدول لعرض الحالات المسددة والمكتملة"
        >
          <div className="stat-card-header">
            <div className="stat-icon-box revenue">
              <Wallet size={18} />
            </div>
            <span className="stat-card-tag revenue-tag">
              <span>الخزينة والتحصيل</span>
            </span>
          </div>
          <div className="stat-card-body">
            <h3 className="stat-main-number text-success">{todayRevenue.toLocaleString('en-US')} ج.م</h3>
            <span className="stat-card-label">إجمالي التحصيل اليوم</span>
          </div>
          <div className="stat-progress-bar">
            <div 
              className="stat-progress-fill" 
              style={{ width: `${attendanceRate}%`, background: '#10B981' }}
            />
          </div>
          <div className="stat-card-footer">
            <span>{completedToday.length} كشف مسدد</span>
            <span>مطابق وموثق</span>
          </div>
        </div>
      ) : (
        <div 
          className={`cockpit-stat-card total-card ${activeFilterTab === 'completed' ? 'active-filter-card' : ''}`}
          onClick={() => onSelectFilterTab('completed')}
          title="انقر لتصفية الجدول لعرض الحالات المكتملة"
        >
          <div className="stat-card-header">
            <div className="stat-icon-box total" style={{ background: '#E6F4EA', color: '#137333' }}>
              <CheckCircle2 size={18} />
            </div>
            <span className="stat-card-tag" style={{ background: '#E6F4EA', color: '#137333' }}>
              <span>كشوفات مكتملة</span>
            </span>
          </div>
          <div className="stat-card-body">
            <h3 className="stat-main-number" style={{ color: '#137333' }}>{completedToday.length}</h3>
            <span className="stat-card-label">مريض أتموا الكشف اليوم</span>
          </div>
          <div className="stat-progress-bar">
            <div 
              className="stat-progress-fill" 
              style={{ width: `${attendanceRate}%`, background: '#137333' }}
            />
          </div>
          <div className="stat-card-footer">
            <span>نسبة الإنجاز: {attendanceRate}%</span>
            <span>تنظيم السكرتارية</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardMetricsGrid;
