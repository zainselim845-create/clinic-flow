import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import { 
  UserPlus, Search, FolderOpen, Share2, RotateCcw,
  CalendarDays, Clock, Stethoscope, Wallet, TrendingUp, Landmark, CheckCircle2,
  Sparkles, BellRing
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTodayDateStr } from '../utils/timeSlots';
import WaitingRoomQueue from './dashboard/WaitingRoomQueue';
import ConsultationModal from './dashboard/ConsultationModal';
import WalkInRegistrationModal from './dashboard/WalkInRegistrationModal';
import RevenueAnalytics from './dashboard/RevenueAnalytics';
import PatientDossierDrawer from './dashboard/PatientDossierDrawer';
import ExpensesModal from '../components/ExpensesModal';
import PatientRecallModal from '../components/PatientRecallModal';
import ShiftHandoverModal from '../components/ShiftHandoverModal';
import { AppleGlassDock } from '../components/ui';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';
import { isDoctorRole } from '../utils/permissions';
import './Dashboard.css';

const Dashboard = () => {
  const { state, dispatch } = useApp();
  const { tenant } = useTenant();
  const { user } = useAuth();
  
  const isDoctor = isDoctorRole(user);
  const isStaff = !isDoctor;
  const navigate = useNavigate();
  
  const currentClinic = state.clinicInfo || {};
  const currentClinicId = tenant?.id || currentClinic?.id || null;
  const today = getTodayDateStr();

  // Modals & Drawers state
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [finishExamAppt, setFinishExamAppt] = useState(null);
  const [dossierPatient, setDossierPatient] = useState(null);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all');
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);

  const handleCopyBookingLink = () => {
    const origin = window.location.origin;
    const url = state.clinicInfo?.slug 
      ? `${origin}/c/${state.clinicInfo.slug}/booking`
      : `${origin}/booking`;
    navigator.clipboard.writeText(url);
    setCopiedBookingLink(true);
    setTimeout(() => setCopiedBookingLink(false), 2500);
  };

  // Filter today's appointments strictly scoped to current clinic
  const todaysAppointments = useMemo(() => {
    return (state.appointments || []).filter(a => {
      if (a.date !== today) return false;
      if (a.clinicId && currentClinicId) return a.clinicId === currentClinicId;
      return !currentClinicId || a.clinicId === currentClinicId;
    });
  }, [state.appointments, today, currentClinicId]);

  // Clinical Lifecycle Segmentation (Memoized)
  const completedToday = useMemo(() => todaysAppointments.filter(a => a.status === 'completed'), [todaysAppointments]);
  const inProgressToday = useMemo(() => todaysAppointments.filter(a => a.status === 'in_progress'), [todaysAppointments]);
  const waitingToday = useMemo(() => {
    return todaysAppointments
      .filter(a => a.status === 'waiting')
      .sort((a, b) => new Date(a.checkedInAt || 0) - new Date(b.checkedInAt || 0));
  }, [todaysAppointments]);
  
  const bookedToday = useMemo(() => todaysAppointments.filter(a => a.status === 'booked' || a.status === 'upcoming'), [todaysAppointments]);
  const pendingPaymentToday = useMemo(() => todaysAppointments.filter(a => a.status === 'pending_payment'), [todaysAppointments]);

  const attendanceRate = useMemo(() => {
    return todaysAppointments.length > 0
      ? Math.round((completedToday.length / todaysAppointments.length) * 100)
      : 0;
  }, [todaysAppointments.length, completedToday.length]);

  // Calculate today's revenue strictly from completed appointments
  const todayRevenue = useMemo(() => {
    return completedToday.reduce((sum, a) => {
      const rawFee = a.fee ?? a.paidAmount;
      const numericFee = typeof rawFee === 'number'
        ? rawFee
        : (rawFee ? parseInt(String(rawFee).replace(/\D/g, ''), 10) : 300);
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
              const rawFee = appt.fee ?? appt.paidAmount;
              const fee = typeof rawFee === 'number'
                ? rawFee
                : (parseInt(String(rawFee || '300').replace(/\D/g, ''), 10) || 300);
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
        await appointmentsService.updateAppointmentStatus(data.appointmentId, 'pending_payment', {
          notes: data.notes || '',
          diagnosis: data.diagnosis || '',
          procedures: data.procedures || ''
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

    // Doctor finishes → status = pending_payment (secretary handles payment)
    dispatch({
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: {
        id: data.appointmentId,
        status: 'pending_payment',
        notes: data.notes,
        diagnosis: data.diagnosis,
        procedures: data.procedures || ''
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

    setFinishExamAppt(null);
  };

  // Secretary collects payment → status becomes completed
  const handleCollectPayment = async (appointmentId, paymentMethod) => {
    if (state.useSupabase) {
      try {
        await appointmentsService.updateAppointmentStatus(appointmentId, 'completed', {
          paymentMethod,
          paidAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Failed to sync completed payment to Supabase:', err);
      }
    }
    dispatch({
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: {
        id: appointmentId,
        status: 'completed',
        paymentMethod,
        paidAt: new Date().toISOString()
      }
    });
  };

  // Walk-in Registration Submit
  const handleWalkInSubmit = async (walkInData) => {
    const generateUuid = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    const patientId = generateUuid();
    const newBooking = {
      id: generateUuid(),
      clinicId: currentClinicId,
      clinic_id: currentClinicId,
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
        if (walkInData.type === 'تنظيف وتلميع أسنان') return '400 ج.م';
        if (walkInData.type === 'حشو تجميلي كومبوزيت') return '500 ج.م';
        if (walkInData.type === 'علاج جذور وعصب') return '900 ج.م';
        if (walkInData.type === 'خلع أسنان') return '400 ج.م';
        if (walkInData.type === 'طربوش زيركون') return '1800 ج.م';
        if (walkInData.type === 'تبييض أسنان') return '2000 ج.م';
        if (walkInData.type === 'زراعة أسنان') return '6500 ج.م';
        return currentClinic.regularFee || '300 ج.م';
      })(),
      status: 'waiting',
      checkedInAt: new Date().toISOString(),
      notes: walkInData.notes
    };

    const newPatient = {
      id: patientId,
      clinicId: currentClinicId,
      clinic_id: currentClinicId,
      name: walkInData.name,
      phone: walkInData.phone,
      notes: 'مريض مباشر (Walk-in)',
      lastVisit: walkInData.date,
      visitsCount: 1
    };

    if (state.useSupabase) {
      try {
        await patientsService.addPatient(newPatient);
        await appointmentsService.addAppointment(newBooking);
      } catch (err) {
        console.error('Failed to sync walk-in to Supabase:', err);
      }
    }

    dispatch({ type: 'ADD_PATIENT', payload: newPatient });
    dispatch({ type: 'ADD_APPOINTMENT', payload: newBooking });
  };

  const handleRefreshToday = () => {
    if (window.confirm('تنبيه: هل أنت متأكد من رغبتك في إعادة ضبط واستعادة جدول مواعيد اليوم للحالة الأولية؟')) {
      dispatch({ type: 'REFRESH_TODAY_DEMO_DATA' });
    }
  };

  // Apple Glass Floating Dock Shortcuts
  const dockItems = useMemo(() => [
    {
      id: 'walkin',
      label: 'تسجيل سريع',
      icon: <UserPlus className="w-5 h-5 text-[var(--apple-blue)]" />,
      onClick: () => setIsWalkInModalOpen(true)
    },
    {
      id: 'shift',
      label: 'الخزينة والوردية',
      icon: <Landmark className="w-5 h-5 text-[var(--apple-purple)]" />,
      onClick: () => setIsShiftModalOpen(true)
    },
    {
      id: 'waiting',
      label: 'صالة الانتظار',
      icon: <Clock className="w-5 h-5 text-[var(--apple-orange)]" />,
      badge: waitingToday.length > 0 ? waitingToday.length : undefined,
      onClick: () => setActiveFilterTab('waiting'),
      active: activeFilterTab === 'waiting'
    },
    ...(pendingPaymentToday.length > 0 ? [{
      id: 'pending_payment',
      label: 'بانتظار التحصيل',
      icon: <Wallet className="w-5 h-5 text-[var(--apple-green)]" />,
      badge: pendingPaymentToday.length,
      onClick: () => setActiveFilterTab('pending_payment'),
      active: activeFilterTab === 'pending_payment'
    }] : []),
    {
      id: 'doctor_agent',
      label: 'مساعد الطبيب الذكي',
      icon: <Sparkles className="w-5 h-5 text-[var(--apple-pink)]" />,
      onClick: () => navigate('/doctor-agent')
    },
    {
      id: 'recalls',
      label: 'استدعاء دوري',
      icon: <BellRing className="w-5 h-5 text-[var(--apple-teal)]" />,
      onClick: () => setIsRecallModalOpen(true)
    }
  ], [waitingToday.length, pendingPaymentToday.length, activeFilterTab, navigate]);

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
      
      {/* 1. Google Workspace Operational Action Bar */}
      <div className="google-workspace-bar">
        <div className="workspace-bar-info">
          <div className="workspace-title-pill">
            <span className="live-pulse-dot" />
            <span className="workspace-title-text">
              {isDoctor 
                ? `العيادة والعمليات السريرية • ${user?.name || currentClinic.doctorName || 'د. أحمد الشريف'}`
                : `مكتب الاستقبال والتنظيم • ${user?.name || 'طاقم الاستقبال'}`}
            </span>
            <span className="workspace-role-chip">{isDoctor ? 'المدير الطبي' : 'سكرتارية واستقبال'}</span>
          </div>
          <div className="workspace-date-chip">
            <CalendarDays size={14} className="date-icon" />
            <span>{today}</span>
            <span className="bullet-sep">•</span>
            <span className="queue-live-count">{waitingToday.length} بالانتظار</span>
          </div>
        </div>

        <div className="workspace-bar-actions">
          <button 
            type="button" 
            onClick={handleCopyBookingLink} 
            className="google-m3-tonal-btn" 
            title="نسخ رابط حجز العيادة المباشر للمرضى"
          >
            <Share2 size={15} />
            <span>{copiedBookingLink ? 'تم النسخ!' : 'رابط الحجز'}</span>
          </button>
          <button 
            type="button" 
            onClick={() => setIsShiftModalOpen(true)} 
            className="google-m3-tonal-btn" 
            title="تصفية الخزينة وتسليم وردية الاستقبال"
          >
            <Landmark size={15} />
            <span>تسليم وردية الاستقبال</span>
          </button>
          <button 
            type="button" 
            onClick={handleRefreshToday} 
            className="google-m3-icon-btn" 
            title="تحديث واستعادة جدول اليوم"
          >
            <RotateCcw size={15} />
          </button>
          <button 
            type="button" 
            onClick={() => setIsWalkInModalOpen(true)} 
            className="google-m3-fab-btn"
          >
            <UserPlus size={17} />
            <span>{isDoctor ? 'تسجيل مريض جديد' : 'تسجيل حضور مباشر (Walk-in)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Google Material 3 Unified KPI Cards Grid */}
      <div className="cockpit-stats-grid">
        
        {/* Metric 1: Total Appointments */}
        <div 
          className={`cockpit-stat-card total-card ${activeFilterTab === 'all' ? 'active-filter-card' : ''}`}
          onClick={() => setActiveFilterTab('all')}
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
              <Clock size={18} />
            </div>
            <span className="stat-card-tag waiting-tag">
              <span className="live-pulse-dot" style={{ width: 6, height: 6 }}></span>
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
            ></div>
          </div>
          <div className="stat-card-footer">
            <span>{waitingToday.length > 0 ? 'متوسط الانتظار: 10 د' : 'لا يوجد انتظار'}</span>
            <span>أسبقية الحضور</span>
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
              <Stethoscope size={18} />
            </div>
            <span className={`stat-card-tag ${currentExamPatient ? 'in-session-tag' : 'vacant-tag'}`}>
              {currentExamPatient ? (isDoctor ? 'قيد الفحص السريري' : 'داخل غرفة الكشف') : 'الغرفة شاغرة'}
            </span>
          </div>
          <div className="stat-card-body">
            <h3 className="stat-main-number">{inProgressToday.length}</h3>
            <span className="stat-card-label">
              {currentExamPatient ? currentExamPatient.patientName : 'الغرفة مستعدة للمريض التالي'}
            </span>
          </div>
          <div className="stat-progress-bar">
            <div 
              className="stat-progress-fill" 
              style={{ width: currentExamPatient ? '100%' : '0%' }}
            ></div>
          </div>
          <div className="stat-card-footer exam-footer">
            <span>{currentExamPatient ? currentExamPatient.type || 'كشف' : 'غرفة الكشف 1'}</span>
            <span>{currentExamPatient ? 'مع الطبيب' : 'مستعدة'}</span>
          </div>
        </div>

        {/* Metric 4: Daily Revenue (Doctor) OR Completed Appointments (Staff) */}
        {isDoctor ? (
          <div 
            className={`cockpit-stat-card revenue-card ${activeFilterTab === 'completed' ? 'active-filter-card' : ''}`}
            onClick={() => setActiveFilterTab('completed')}
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
              ></div>
            </div>
            <div className="stat-card-footer">
              <span>{completedToday.length} كشف مسدد</span>
              <span>مطابق وموثق</span>
            </div>
          </div>
        ) : (
          <div 
            className={`cockpit-stat-card total-card ${activeFilterTab === 'completed' ? 'active-filter-card' : ''}`}
            onClick={() => setActiveFilterTab('completed')}
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
              ></div>
            </div>
            <div className="stat-card-footer">
              <span>نسبة الإنجاز: {attendanceRate}%</span>
              <span>تنظيم السكرتارية</span>
            </div>
          </div>
        )}
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
            isDoctor={isDoctor}
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
                  {['all', 'waiting', 'in_progress', 'pending_payment', 'completed', 'booked'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`tab-pill ${activeFilterTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveFilterTab(tab)}
                    >
                      {tab === 'all' && 'الكل'}
                      {tab === 'waiting' && `انتظار (${waitingToday.length})`}
                      {tab === 'in_progress' && `في الكشف (${inProgressToday.length})`}
                      {tab === 'pending_payment' && `💰 تحصيل (${pendingPaymentToday.length})`}
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
                            {appt.status === 'completed' && 'مكتمل ✅'}
                            {appt.status === 'in_progress' && 'في الكشف 🩺'}
                            {appt.status === 'waiting' && 'في الانتظار ⏳'}
                            {appt.status === 'pending_payment' && 'في انتظار التحصيل 💰'}
                            {(appt.status === 'booked' || appt.status === 'upcoming') && 'محجوز 📋'}
                            {appt.status === 'cancelled' && 'ملغي ❌'}
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
                                {isDoctor ? 'بدء الكشف' : 'إدخال للطبيب'}
                              </button>
                            )}
                            {appt.status === 'in_progress' && isDoctor && (
                              <button
                                type="button"
                                onClick={() => setFinishExamAppt(appt)}
                                className="btn-action-success"
                              >
                                إنهاء الكشف
                              </button>
                            )}
                            {appt.status === 'pending_payment' && (
                              <div className="payment-actions" style={{ display: 'flex', gap: '0.3rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleCollectPayment(appt.id, 'cash')}
                                  className="btn-action-success"
                                  title="تحصيل نقداً"
                                >
                                  💵 كاش
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCollectPayment(appt.id, 'card')}
                                  className="btn-action-primary"
                                  title="تحصيل بالبطاقة"
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  💳 فيزا
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCollectPayment(appt.id, 'instapay')}
                                  className="btn-action-primary"
                                  title="تحصيل إنستاباي"
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  📱 إنستاباي
                                </button>
                              </div>
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

        {/* Side Column: Revenue Analytics (Doctor) or Reception Toolkit (Staff) */}
        <div className="cockpit-side-column">
          {isDoctor ? (
            <RevenueAnalytics
              weeklyData={weeklyData}
              todayRevenue={todayRevenue}
              attendanceRate={attendanceRate}
              completedCount={completedToday.length}
              onOpenExpenses={() => setIsExpensesModalOpen(true)}
              onOpenRecalls={() => setIsRecallModalOpen(true)}
            />
          ) : (
            <div className="reception-toolkit-card">
              <div className="toolkit-header">
                <h4>مهام مكتب الاستقبال</h4>
                <span className="toolkit-badge">Reception Desk</span>
              </div>
              <div className="toolkit-actions-list">
                <button 
                  type="button" 
                  onClick={() => setIsWalkInModalOpen(true)} 
                  className="toolkit-action-btn primary"
                >
                  <UserPlus size={18} />
                  <div className="btn-text">
                    <strong>تسجيل حضور مباشر (Walk-in)</strong>
                    <small>إضافة مريض وصل العيادة بدون حجز مسبق</small>
                  </div>
                </button>
                <button 
                  type="button" 
                  onClick={handleCopyBookingLink} 
                  className="toolkit-action-btn"
                >
                  <Share2 size={18} />
                  <div className="btn-text">
                    <strong>مشاركة رابط الحجز الرقمي</strong>
                    <small>إرسال رابط العيادة للمرضى عبر الواتساب</small>
                  </div>
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveFilterTab('waiting')} 
                  className="toolkit-action-btn"
                >
                  <Clock size={18} />
                  <div className="btn-text">
                    <strong>صالة الانتظار ({waitingToday.length} مريض)</strong>
                    <small>ترتيب أسبقية الحضور والتجهيز للدخول</small>
                  </div>
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveFilterTab('pending_payment')} 
                  className={`toolkit-action-btn ${pendingPaymentToday.length > 0 ? 'highlight' : ''}`}
                  style={pendingPaymentToday.length > 0 ? { borderColor: '#F59E0B', background: '#FFFBEB' } : {}}
                >
                  <Wallet size={18} />
                  <div className="btn-text">
                    <strong>💰 في انتظار التحصيل ({pendingPaymentToday.length} مريض)</strong>
                    <small>مرضى أنهوا الكشف وينتظرون دفع الرسوم</small>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modals & Drawers */}
      <WalkInRegistrationModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onSubmit={handleWalkInSubmit}
        regularFee={currentClinic.regularFee || '300 ج.م'}
      />

      <ConsultationModal
        isOpen={!!finishExamAppt}
        appointment={finishExamAppt}
        onClose={() => setFinishExamAppt(null)}
        onComplete={handleFinishConsultation}
      />

      <PatientDossierDrawer
        patient={dossierPatient}
        onClose={() => setDossierPatient(null)}
      />

      <ExpensesModal
        isOpen={isExpensesModalOpen}
        onClose={() => setIsExpensesModalOpen(false)}
      />

      <PatientRecallModal
        isOpen={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
      />

      <ShiftHandoverModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />

      {/* 4. Apple Glass Floating Action Dock (macOS & visionOS Spatial Style) */}
      <AppleGlassDock items={dockItems} />
    </div>
  );
};

export default Dashboard;
