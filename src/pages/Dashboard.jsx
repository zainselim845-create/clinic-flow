import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  UserPlus, Search, FolderOpen, Share2,
  CalendarDays, Clock, Stethoscope, Wallet, TrendingUp, Landmark
} from 'lucide-react';
import { getTodayDateStr } from '../utils/timeSlots';
import WaitingRoomQueue from './dashboard/WaitingRoomQueue';
import ConsultationModal from './dashboard/ConsultationModal';
import WalkInRegistrationModal from './dashboard/WalkInRegistrationModal';
import RevenueAnalytics from './dashboard/RevenueAnalytics';
import PatientDossierDrawer from './dashboard/PatientDossierDrawer';
import PrescriptionModal from '../components/PrescriptionModal';
import ExpensesModal from '../components/ExpensesModal';
import PatientRecallModal from '../components/PatientRecallModal';
import ShiftHandoverModal from '../components/ShiftHandoverModal';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';
import './Dashboard.css';

const Dashboard = () => {
  const { state, dispatch } = useApp();
  
  const currentClinic = state.clinicInfo || {};
  const today = getTodayDateStr();

  // Modals & Drawers state
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [finishExamAppt, setFinishExamAppt] = useState(null);
  const [dossierPatient, setDossierPatient] = useState(null);
  const [prescriptionPatient, setPrescriptionPatient] = useState(null);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all');
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);

  const handleCopyBookingLink = () => {
    const url = `${window.location.origin}/booking`;
    navigator.clipboard.writeText(url);
    setCopiedBookingLink(true);
    setTimeout(() => setCopiedBookingLink(false), 2500);
  };

  // Filter today's appointments
  const todaysAppointments = useMemo(() => {
    return (state.appointments || []).filter(a => a.date === today);
  }, [state.appointments, today]);

  // Clinical Lifecycle Segmentation (Memoized)
  const completedToday = useMemo(() => todaysAppointments.filter(a => a.status === 'completed'), [todaysAppointments]);
  const inProgressToday = useMemo(() => todaysAppointments.filter(a => a.status === 'in_progress'), [todaysAppointments]);
  const waitingToday = useMemo(() => {
    return todaysAppointments
      .filter(a => a.status === 'waiting')
      .sort((a, b) => {
        const aIsEmergency = a.isEmergency || a.type === 'طوارئ' || (a.type || '').includes('طوارئ');
        const bIsEmergency = b.isEmergency || b.type === 'طوارئ' || (b.type || '').includes('طوارئ');
        if (aIsEmergency && !bIsEmergency) return -1;
        if (!aIsEmergency && bIsEmergency) return 1;
        return new Date(a.checkedInAt || 0) - new Date(b.checkedInAt || 0);
      });
  }, [todaysAppointments]);
  
  const bookedToday = useMemo(() => todaysAppointments.filter(a => a.status === 'booked' || a.status === 'upcoming'), [todaysAppointments]);

  const attendanceRate = useMemo(() => {
    return todaysAppointments.length > 0
      ? Math.round((completedToday.length / todaysAppointments.length) * 100)
      : 0;
  }, [todaysAppointments.length, completedToday.length]);

  // Calculate today's revenue strictly from completed appointments
  const todayRevenue = useMemo(() => {
    return completedToday.reduce((sum, a) => {
      const numericFee = a.fee ? parseInt(a.fee.replace(/\D/g, ''), 10) : 300;
      return sum + (isNaN(numericFee) ? 300 : numericFee);
    }, 0);
  }, [completedToday]);

  // Dynamic Weekly Stats calculation from appointments
  const weeklyData = useMemo(() => {
    const daysMap = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const counts = { 'السبت': 0, 'الأحد': 0, 'الإثنين': 0, 'الثلاثاء': 0, 'الأربعاء': 0, 'الخميس': 0, 'الجمعة': 0 };
    const revenues = { 'السبت': 0, 'الأحد': 0, 'الإثنين': 0, 'الثلاثاء': 0, 'الأربعاء': 0, 'الخميس': 0, 'الجمعة': 0 };

    (state.appointments || []).forEach((appt) => {
      if (appt.date) {
        const d = new Date(appt.date);
        if (!isNaN(d.getDay())) {
          const dayName = daysMap[d.getDay()];
          if (counts[dayName] !== undefined) {
            counts[dayName]++;
            if (appt.status === 'completed') {
              const fee = parseInt((appt.fee || '300').replace(/\D/g, ''), 10) || 300;
              revenues[dayName] += fee;
            }
          }
        }
      }
    });

    return ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map(day => ({
      day,
      count: counts[day],
      revenue: revenues[day]
    }));
  }, [state.appointments]);

  const currentExamPatient = inProgressToday[0] || null;

  // Status transitions
  const handleStartExam = async (appt) => {
    if (state.useSupabase) {
      try {
        await appointmentsService.updateAppointmentStatus(appt.id, 'in_progress', {
          consultationStartedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Failed to sync in_progress status to Supabase:', err);
      }
    }
    dispatch({
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id: appt.id, status: 'in_progress' }
    });
  };

  const handleFinishConsultation = async (data) => {
    if (state.useSupabase) {
      try {
        await appointmentsService.updateAppointmentStatus(data.appointmentId, 'completed', {
          notes: data.notes || '',
          diagnosis: data.diagnosis || ''
        });
        if (data.patientId && data.diagnosis) {
          await patientsService.updatePatient(data.patientId, {
            diagnosis: data.diagnosis,
            notes: data.notes,
            lastVisit: today
          });
        }
      } catch (err) {
        console.error('Failed to sync consultation completion to Supabase:', err);
      }
    }

    dispatch({
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: {
        id: data.appointmentId,
        status: 'completed',
        notes: data.notes,
        diagnosis: data.diagnosis,
        paidAmount: data.paidAmount,
        paymentMethod: data.paymentMethod
      }
    });

    if (data.patientId && data.diagnosis) {
      dispatch({
        type: 'UPDATE_PATIENT',
        payload: {
          id: data.patientId,
          diagnosis: data.diagnosis,
          notes: data.notes,
          lastVisit: today
        }
      });
    }

    // Schedule recall if selected
    if (data.recallInterval && data.patientId) {
      const intervalDays = parseInt(data.recallInterval, 10);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + intervalDays);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const newRecall = {
        id: `rec-${Date.now()}`,
        patientId: data.patientId,
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        reason: `متابعة واستدعاء دوري بعد (${data.diagnosis || 'الكشف'})`,
        dueDate: targetDateStr,
        intervalDays,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      dispatch({ type: 'ADD_RECALL', payload: newRecall });
    }

    setFinishExamAppt(null);
  };

  // Walk-in Registration Submit
  const handleWalkInSubmit = async (walkInData) => {
    const patientId = `p-${Date.now()}`;
    const newBooking = {
      id: `walkin-${Date.now()}`,
      patientId,
      patientName: walkInData.name,
      patientPhone: walkInData.phone,
      date: walkInData.date,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      type: walkInData.type,
      fee: (() => {
        const match = (currentClinic.services || []).find(s => s.name === walkInData.type || (walkInData.type && s.name.includes(walkInData.type)));
        if (match?.price) return match.price;
        if (walkInData.type === 'استشارة') return currentClinic.consultationFee || '150 ج.م';
        if (walkInData.type === 'طوارئ') return currentClinic.emergencyFee || '400 ج.م';
        if (walkInData.type === 'تنظيف وتلميع أسنان') return '400 ج.م';
        if (walkInData.type === 'حشو تجميلي كومبوزيت') return '500 ج.م';
        if (walkInData.type === 'علاج جذور وعصب') return '900 ج.م';
        if (walkInData.type === 'خلع أسنان') return '400 ج.م';
        if (walkInData.type === 'طربوش زيركون') return '1800 ج.م';
        if (walkInData.type === 'تبييض أسنان') return '2000 ج.م';
        if (walkInData.type === 'زراعة أسنان') return '6500 ج.م';
        return currentClinic.regularFee || '300 ج.م';
      })(),
      isEmergency: walkInData.isEmergency,
      status: 'waiting',
      checkedInAt: new Date().toISOString(),
      notes: walkInData.notes
    };

    if (state.useSupabase) {
      try {
        await patientsService.addPatient({
          id: patientId,
          name: walkInData.name,
          phone: walkInData.phone,
          notes: 'مريض مباشر (Walk-in)',
          lastVisit: walkInData.date
        });
        await appointmentsService.addAppointment(newBooking);
      } catch (err) {
        console.error('Failed to sync walk-in to Supabase:', err);
      }
    }

    dispatch({ type: 'ADD_APPOINTMENT', payload: newBooking });
  };

  // Schedule filtering (Memoized for high performance)
  const filteredAppointments = useMemo(() => {
    const query = scheduleSearchQuery.trim().toLowerCase();
    return todaysAppointments.filter((a) => {
      const matchesTab = activeFilterTab === 'all' || a.status === activeFilterTab;
      if (!matchesTab) return false;
      if (!query) return true;
      return (
        (a.patientName && a.patientName.toLowerCase().includes(query)) ||
        (a.patientPhone && a.patientPhone.includes(query))
      );
    });
  }, [todaysAppointments, activeFilterTab, scheduleSearchQuery]);

  return (
    <div className="dashboard-page">
      
      {/* 1. Executive Operations Hero Banner */}
      <div className="dashboard-top-hero">
        <div className="hero-welcome">
          <div className="hero-title-row">
            <h2>لوحة العمليات والتحكم السريري</h2>
            <span className="hero-status-pill">
              <span className="live-pulse-dot"></span>
              <span>العيادة تستقبل المرضى الآن</span>
            </span>
          </div>
          <p className="hero-subtitle">
            جدول اليوم: <strong>{today}</strong> • المتابعة الحية لحركة صالة الانتظار وغرف الكشف ومؤشرات الإيراد
          </p>
        </div>

        <div className="hero-actions">
          <button 
            type="button" 
            onClick={() => setIsShiftModalOpen(true)} 
            className="btn-hero-action secondary" 
            title="تصفية ومطابقة درج الخزينة وتسليم الوردية"
            style={{ background: '#f8fafc', color: '#1e40af', border: '1px solid #cbd5e1' }}
          >
            <Landmark size={16} />
            <span>تسليم وردية الاستقبال</span>
          </button>
          <button 
            type="button" 
            onClick={handleCopyBookingLink} 
            className="btn-hero-action secondary" 
            title="نسخ رابط الحجز المباشر للمرضى"
          >
            <Share2 size={16} />
            <span>{copiedBookingLink ? 'تم نسخ الرابط!' : 'مشاركة رابط الحجز'}</span>
          </button>
          <button 
            type="button" 
            onClick={() => setIsWalkInModalOpen(true)} 
            className="btn-hero-action primary"
          >
            <UserPlus size={16} />
            <span>تسجيل حضور مباشر (Walk-in)</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive KPI Command Cards (4-Grid with Click-to-Filter) */}
      <div className="cockpit-stats-grid">
        
        {/* Metric 1: Total Appointments */}
        <div 
          className={`cockpit-stat-card total-card ${activeFilterTab === 'all' ? 'active-filter-card' : ''}`}
          onClick={() => setActiveFilterTab('all')}
          title="انقر لتصفية جدول اليوم لعرض كافة المواعيد"
        >
          <div className="stat-card-header">
            <div className="stat-icon-box total">
              <CalendarDays size={20} />
            </div>
            <span className="stat-card-tag">جدول اليوم</span>
          </div>
          <div className="stat-card-body">
            <h3 className="stat-main-number">{todaysAppointments.length}</h3>
            <span className="stat-card-label">حالة مسجلة بالأجندة</span>
          </div>
          <div className="stat-progress-bar">
            <div 
              className="stat-progress-fill" 
              style={{ width: `${attendanceRate}%`, background: 'var(--primary)' }}
            ></div>
          </div>
          <div className="stat-card-footer">
            <span>نسبة الإنجاز: {attendanceRate}%</span>
            <span>{completedToday.length} تم الكشف</span>
          </div>
        </div>

        {/* Metric 2: Live Waiting Queue */}
        <div 
          className={`cockpit-stat-card waiting-card ${activeFilterTab === 'waiting' ? 'active-filter-card' : ''}`}
          onClick={() => setActiveFilterTab('waiting')}
          title="انقر لتصفية الجدول لعرض حالات صالة الانتظار فقط"
        >
          <div className="stat-card-header">
            <div className="stat-icon-box waiting">
              <Clock size={20} />
            </div>
            <span className="stat-card-tag waiting-tag">
              <span className="live-pulse-dot" style={{ width: 6, height: 6 }}></span>
              <span>مباشر بالعيادة</span>
            </span>
          </div>
          <div className="stat-card-body">
            <h3 className="stat-main-number text-warning">{waitingToday.length}</h3>
            <span className="stat-card-label">مرضى في صالة الانتظار</span>
          </div>
          <div className="stat-progress-bar">
            <div 
              className="stat-progress-fill" 
              style={{ width: `${Math.min(100, waitingToday.length * 20)}%`, background: 'var(--warning)' }}
            ></div>
          </div>
          <div className="stat-card-footer">
            <span>{waitingToday.length > 0 ? 'متوسط الانتظار: حوالي 10 دقائق' : 'لا يوجد انتظار حالياً'}</span>
            <span>أولوية الطوارئ مفعلة</span>
          </div>
        </div>

        {/* Metric 3: Active Consultation Room */}
        <div 
          className={`cockpit-stat-card exam-card ${activeFilterTab === 'in_progress' ? 'active-filter-card' : ''}`}
          onClick={() => setActiveFilterTab('in_progress')}
          title="انقر لتصفية الجدول لعرض حالة الكشف الجارية"
        >
          <div className="stat-card-header">
            <div className="stat-icon-box exam">
              <Stethoscope size={20} />
            </div>
            <span className={`stat-card-tag ${currentExamPatient ? 'in-session-tag' : 'vacant-tag'}`}>
              {currentExamPatient ? 'جاري الفحص' : 'الغرفة شاغرة'}
            </span>
          </div>
          <div className="stat-card-body">
            <h4 className="stat-patient-name">
              {currentExamPatient ? currentExamPatient.patientName : 'الغرفة شاغرة ومستعدة'}
            </h4>
            <span className="stat-card-label">
              {currentExamPatient ? `نوع الزيارة: ${currentExamPatient.type || 'كشف عادي'}` : 'جاهزة لاستدعاء الحالة التالية'}
            </span>
          </div>
          <div className="stat-card-footer exam-footer">
            {currentExamPatient ? (
              <span className="text-primary font-bold">⏱️ انقر للمعاينة السريعة</span>
            ) : (
              <span className="text-success">✅ شاغرة لاستقبال مريض</span>
            )}
          </div>
        </div>

        {/* Metric 4: Daily Net Revenue */}
        <div 
          className={`cockpit-stat-card revenue-card ${activeFilterTab === 'completed' ? 'active-filter-card' : ''}`}
          onClick={() => setActiveFilterTab('completed')}
          title="انقر لتصفية الجدول لعرض الحالات المسددة والمكتملة"
        >
          <div className="stat-card-header">
            <div className="stat-icon-box revenue">
              <Wallet size={20} />
            </div>
            <span className="stat-card-tag revenue-tag">
              <TrendingUp size={12} />
              <span>تحصيل نقدي وفوري</span>
            </span>
          </div>
          <div className="stat-card-body">
            <h3 className="stat-main-number text-success">{todayRevenue} ج.م</h3>
            <span className="stat-card-label">إجمالي إيراد الكشوفات اليوم</span>
          </div>
          <div className="stat-progress-bar">
            <div 
              className="stat-progress-fill" 
              style={{ width: `${attendanceRate}%`, background: 'var(--success)' }}
            ></div>
          </div>
          <div className="stat-card-footer">
            <span>{completedToday.length} كشف مسدد</span>
            <span>الذمم المالية موثقة</span>
          </div>
        </div>

      </div>

      {/* 2. Cockpit Layout: 2-Column Responsive High-Density Grid */}
      <div className="dashboard-cockpit-grid">
        
        {/* Main Column: Live Floor + Today's Schedule */}
        <div className="cockpit-main-column">
          
          {/* Waiting Room & Examination Room */}
          <WaitingRoomQueue
            currentExamPatient={currentExamPatient}
            waitingToday={waitingToday}
            onStartExam={handleStartExam}
            onOpenFinishModal={(appt) => setFinishExamAppt(appt)}
            onOpenDossier={(appt) => setDossierPatient(appt)}
            onOpenWalkInModal={() => setIsWalkInModalOpen(true)}
            onOpenPrescription={(appt) => setPrescriptionPatient(appt)}
          />

          {/* Schedule Table Section */}
          <div className="schedule-table-card compact-table-card">
            <div className="table-card-header">
              <div className="header-title">
                <h3>جدول مواعيد اليوم التفصيلي ({filteredAppointments.length})</h3>
              </div>
              <div className="header-tools">
                <div className="search-box compact-search">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="بحث سريع..."
                    value={scheduleSearchQuery}
                    onChange={(e) => setScheduleSearchQuery(e.target.value)}
                  />
                </div>
                <div className="filter-tabs compact-tabs">
                  {['all', 'waiting', 'in_progress', 'completed', 'booked'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`tab-pill ${activeFilterTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveFilterTab(tab)}
                    >
                      {tab === 'all' && 'الكل'}
                      {tab === 'waiting' && `انتظار (${waitingToday.length})`}
                      {tab === 'in_progress' && `في الكشف (${inProgressToday.length})`}
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
                      <td colSpan={6} className="text-center empty-cell">
                        لا توجد مواعيد مطابقة لهذا الفلتر اليوم.
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
                            {appt.status === 'completed' && 'مكتمل '}
                            {appt.status === 'in_progress' && 'في الكشف '}
                            {appt.status === 'waiting' && 'في الانتظار '}
                            {(appt.status === 'booked' || appt.status === 'upcoming') && 'محجوز '}
                            {appt.status === 'cancelled' && 'ملغي '}
                          </span>
                        </td>
                        <td>{appt.fee || '300 ج.م'}</td>
                        <td>
                          <div className="row-actions">
                            {appt.status === 'waiting' && (
                              <button
                                type="button"
                                onClick={() => handleStartExam(appt)}
                                className="btn-action-primary"
                              >
                                بدء الكشف
                              </button>
                            )}
                            {appt.status === 'in_progress' && (
                              <button
                                type="button"
                                onClick={() => setFinishExamAppt(appt)}
                                className="btn-action-success"
                              >
                                إنهاء الكشف
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDossierPatient(appt)}
                              className="btn-action-icon"
                              title="عرض السجل الطبي"
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

        </div>

        {/* Side Column: Revenue Analytics & Fast Toolkit */}
        <div className="cockpit-side-column">
          <RevenueAnalytics
            weeklyData={weeklyData}
            todayRevenue={todayRevenue}
            attendanceRate={attendanceRate}
            completedCount={completedToday.length}
            onOpenExpenses={() => setIsExpensesModalOpen(true)}
            onOpenRecalls={() => setIsRecallModalOpen(true)}
          />
        </div>

      </div>

      {/* Modals & Drawers */}
      {isWalkInModalOpen && (
        <WalkInRegistrationModal
          isOpen={isWalkInModalOpen}
          onClose={() => setIsWalkInModalOpen(false)}
          onSubmit={handleWalkInSubmit}
          regularFee={currentClinic.regularFee || '300 ج.م'}
        />
      )}

      {finishExamAppt && (
        <ConsultationModal
          isOpen={!!finishExamAppt}
          appointment={finishExamAppt}
          onClose={() => setFinishExamAppt(null)}
          onSubmit={handleFinishConsultation}
        />
      )}

      {prescriptionPatient && (
        <PrescriptionModal
          isOpen={!!prescriptionPatient}
          patient={prescriptionPatient}
          onClose={() => setPrescriptionPatient(null)}
        />
      )}

      {dossierPatient && (
        <PatientDossierDrawer
          isOpen={!!dossierPatient}
          patient={dossierPatient}
          onClose={() => setDossierPatient(null)}
        />
      )}

      {isExpensesModalOpen && (
        <ExpensesModal
          isOpen={isExpensesModalOpen}
          onClose={() => setIsExpensesModalOpen(false)}
        />
      )}

      {isRecallModalOpen && (
        <PatientRecallModal
          isOpen={isRecallModalOpen}
          onClose={() => setIsRecallModalOpen(false)}
        />
      )}

      {isShiftModalOpen && (
        <ShiftHandoverModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
