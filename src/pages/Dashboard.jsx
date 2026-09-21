import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import { 
  UserPlus, Search, FolderOpen, Share2, RotateCcw,
  CalendarDays, Clock, Stethoscope, Wallet, Landmark, CheckCircle2,
  Sparkles, BellRing, Plus, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTodayDateStr } from '../utils/timeSlots';
import WaitingRoomQueue from './dashboard/WaitingRoomQueue';
import ConsultationModal from './dashboard/ConsultationModal';
import WalkInRegistrationModal from './dashboard/WalkInRegistrationModal';
import RevenueAnalytics from './dashboard/RevenueAnalytics';
import PatientDossierDrawer from './dashboard/PatientDossierDrawer';
import PrescriptionPrintModal from '../components/PrescriptionPrintModal';
import ExpensesModal from '../components/ExpensesModal';
import PatientRecallModal from '../components/PatientRecallModal';
import ShiftHandoverModal from '../components/ShiftHandoverModal';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';
import { addInvoice, getNextInvoiceNumber } from '../services/invoicesService';
import { savePrescriptionToStorage } from '../services/prescriptionService';
import { recordAuditEvent, AUDIT_EVENT_TYPES } from '../services/auditLoggerService';
import { isDoctorRole, isAdminRole, hasCapability, CAPABILITIES } from '../utils/permissions';
import './Dashboard.css';

const Dashboard = () => {
  const { state, dispatch } = useApp();
  const { tenant } = useTenant();
  const { user } = useAuth();
  
  const isDoctor = isDoctorRole(user);
  const isAdmin = isAdminRole(user);
  const canViewRevenue = hasCapability(user, CAPABILITIES.BILLING_REVENUE_VIEW);
  const navigate = useNavigate();
  
  const currentClinic = state.clinicInfo || {};
  const currentClinicId = tenant?.id || currentClinic?.id || null;
  const today = getTodayDateStr();

  // Modals & Drawers state
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [finishExamAppt, setFinishExamAppt] = useState(null);
  const [activePrescription, setActivePrescription] = useState(null);
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
                : (rawFee ? parseInt(String(rawFee).replace(/\D/g, ''), 10) || 0 : 0);
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
          procedures: data.procedures || '',
          fee: data.fee
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
        procedures: data.procedures || '',
        fee: data.fee
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

    // Record healthcare audit trail
    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.CONSULTATION_COMPLETED,
      user: user?.name || currentClinic.doctorName || 'طبيب العيادة',
      action: 'إنهاء الفحص السريري وتسجيل التشخيص',
      details: `تم إنهاء فحص المريض ${data.patientName || 'مريض'} (التشخيص: ${data.diagnosis || 'فحص عام'}) وتحويله للمحاسبة والاستقبال`,
      entityId: data.appointmentId,
      entityType: 'appointment'
    });

    // Save Prescription if issued by doctor
    if (data.prescription) {
      try {
        savePrescriptionToStorage(data.prescription);
      } catch (rxErr) {
        console.warn('Failed to save prescription:', rxErr);
      }
      if (data.printPrescriptionImmediate) {
        setActivePrescription(data.prescription);
      }
    }

    setFinishExamAppt(null);
  };

  // Secretary collects payment → status becomes completed + auto invoice creation
  const handleCollectPayment = async (appointmentId, paymentMethod) => {
    const targetAppt = todaysAppointments.find(a => a.id === appointmentId);
    const rawFee = targetAppt?.fee ?? targetAppt?.paidAmount;
    const numericFee = typeof rawFee === 'number'
      ? rawFee
      : (rawFee ? parseInt(String(rawFee).replace(/\D/g, ''), 10) || 0 : (currentClinic.regularFee || 0));

    const clinicSlug = currentClinic.slug || 'dr-ahmed';
    const invoiceNumber = getNextInvoiceNumber(currentClinicId || clinicSlug);

    const newInvoice = {
      id: 'inv-' + Date.now(),
      clinicId: currentClinicId || '550e8400-e29b-41d4-a716-446655440000',
      clinic_id: currentClinicId || '550e8400-e29b-41d4-a716-446655440000',
      patientId: targetAppt?.patientId || appointmentId,
      patientName: targetAppt?.patientName || 'مريض',
      patientPhone: targetAppt?.patientPhone || '',
      appointmentId,
      invoiceNumber,
      subtotal: numericFee,
      discount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      total: numericFee,
      patientShare: numericFee,
      paidAmount: numericFee,
      remainingBalance: 0,
      paymentStatus: 'paid',
      paymentMethod,
      items: [{
        description: targetAppt?.type || 'كشف واستشارة طبية',
        procedures: targetAppt?.procedures || targetAppt?.diagnosis || '',
        unitPrice: numericFee,
        quantity: 1,
        total: numericFee
      }],
      notes: `تم تحصيل الرسوم بواسطة مكتب الاستقبال عبر (${paymentMethod === 'cash' ? 'نقداً (كاش)' : paymentMethod === 'card' ? 'بطاقة بنكية' : 'إنستاباي/محفظة'})`,
      createdAt: new Date().toISOString()
    };

    // 1. Sync invoice to Supabase and LocalStorage
    try {
      await addInvoice(newInvoice);
      const stored = localStorage.getItem(`clinicflow_invoices_${clinicSlug}`);
      const existingInvoices = stored ? JSON.parse(stored) : [];
      localStorage.setItem(`clinicflow_invoices_${clinicSlug}`, JSON.stringify([newInvoice, ...existingInvoices]));
    } catch (invErr) {
      console.warn('Could not persist auto-generated invoice:', invErr);
    }

    // 2. Sync appointment status in Supabase if configured
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

    // 3. Dispatch status update to React AppContext
    dispatch({
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: {
        id: appointmentId,
        status: 'completed',
        paymentMethod,
        paidAt: new Date().toISOString()
      }
    });

    // 4. Record Audit Event
    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.PAYMENT_COLLECTED,
      user: user?.name || 'مكتب الاستقبال',
      action: 'تحصيل رسوم وإصدار فاتورة إلكترونية',
      details: `تم تحصيل ${numericFee} ج.م بنجاح للمريض ${targetAppt?.patientName || 'مريض'} وإصدار الفاتورة رقم ${invoiceNumber}`,
      entityId: appointmentId,
      entityType: 'financial'
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
      type: walkInData.type || 'كشف عيادة',
      fee: walkInData.fee || currentClinic.regularFee || '300 ج.م',
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

  // Minimalist Monochrome Quick Actions Dock Shortcuts
  const dockItems = useMemo(() => [
    {
      id: 'walkin',
      label: 'تسجيل سريع',
      icon: <UserPlus size={16} strokeWidth={2.2} />,
      iconType: 'blue',
      onClick: () => setIsWalkInModalOpen(true)
    },
    ...((isAdmin || user?.role === 'staff' || user?.role === 'receptionist') ? [{
      id: 'shift',
      label: 'الخزينة والوردية',
      icon: <Landmark size={16} strokeWidth={2.2} />,
      iconType: 'emerald',
      onClick: () => setIsShiftModalOpen(true)
    }] : []),
    {
      id: 'waiting',
      label: 'صالة الانتظار',
      icon: <Clock size={16} strokeWidth={2.2} />,
      iconType: 'amber',
      badge: waitingToday.length > 0 ? waitingToday.length : undefined,
      onClick: () => setActiveFilterTab('waiting'),
      active: activeFilterTab === 'waiting'
    },
    ...(pendingPaymentToday.length > 0 ? [{
      id: 'pending_payment',
      label: 'بانتظار التحصيل',
      icon: <Wallet size={16} strokeWidth={2.2} />,
      iconType: 'purple',
      badge: pendingPaymentToday.length,
      onClick: () => setActiveFilterTab('pending_payment'),
      active: activeFilterTab === 'pending_payment'
    }] : []),
    {
      id: 'recalls',
      label: 'استدعاء دوري',
      icon: <BellRing size={16} strokeWidth={2.2} />,
      iconType: 'rose',
      onClick: () => setIsRecallModalOpen(true)
    }
  ], [waitingToday.length, pendingPaymentToday.length, activeFilterTab, isAdmin, user?.role]);

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
      
      {/* 1. Sleek Minimal Architectural Command Bar */}
      <div 
        className="dashboard-command-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--bg-primary, #FFFFFF)',
          border: '1px solid var(--border-color, #E4E4E7)',
          borderRadius: '16px',
          padding: '1rem 1.5rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary, #09090B)' }}>
              {isDoctor 
                ? `العمليات السريرية • ${(user?.name && !user.name.startsWith('د.') ? `د. ${user.name}` : (user?.name || tenant?.doctorName || currentClinic.doctorName || tenant?.name || 'طبيب العيادة'))}`
                : `مكتب الاستقبال • ${user?.name || 'طاقم الاستقبال'}`}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--text-secondary, #71717A)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <CalendarDays size={13} />
                <span>{today}</span>
              </span>
              <span>•</span>
              <span style={{ fontWeight: 600, color: waitingToday.length > 0 ? 'var(--text-primary)' : 'inherit' }}>
                {waitingToday.length} في صالة الانتظار
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={handleCopyBookingLink} 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              backgroundColor: 'var(--surface, transparent)',
              border: '1px solid var(--border-color, #E4E4E7)',
              color: 'var(--text-primary, #09090B)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="نسخ رابط حجز العيادة المباشر للمرضى"
          >
            <Share2 size={13} />
            <span>{copiedBookingLink ? 'تم النسخ!' : 'رابط الحجز'}</span>
          </button>

          {(isAdmin || user?.role === 'staff' || user?.role === 'receptionist') && (
            <button 
              type="button" 
              onClick={() => setIsShiftModalOpen(true)} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                backgroundColor: 'var(--surface, transparent)',
                border: '1px solid var(--border-color, #E4E4E7)',
                color: 'var(--text-primary, #09090B)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="تصفية الخزينة وتسليم وردية الاستقبال"
            >
              <Landmark size={13} />
              <span>تسليم وردية الاستقبال</span>
            </button>
          )}

          {(currentClinic?.slug === 'dr-ahmed' || currentClinic?.slug === 'dr-sara') && (
            <button 
              type="button" 
              onClick={handleRefreshToday} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid #E4E4E7',
                color: '#71717A',
                cursor: 'pointer'
              }}
              title="تحديث جدول اليوم التجريبي"
            >
              <RotateCcw size={14} />
            </button>
          )}

          <button 
            type="button" 
            onClick={() => setIsWalkInModalOpen(true)} 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.48rem 1rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              backgroundColor: '#09090B',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
            }}
          >
            <UserPlus size={15} />
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
            ></div>
          </div>
          <div className="stat-card-footer exam-footer">
            <span>{currentExamPatient ? currentExamPatient.type || 'كشف' : 'غرفة الكشف 1'}</span>
            <span>{currentExamPatient ? 'مع الطبيب' : 'مستعدة'}</span>
          </div>
        </div>

        {/* Metric 4: Daily Revenue (Authorized Financials) OR Completed Appointments (Staff) */}
        {canViewRevenue ? (
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
                              onClick={() => setIsWalkInModalOpen(true)}
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
              todaysAppointments={todaysAppointments}
              completedToday={completedToday}
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

      <PrescriptionPrintModal
        isOpen={!!activePrescription}
        prescription={activePrescription}
        onClose={() => setActivePrescription(null)}
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

      {/* 4. Floating Quick Actions Command Dock */}
      <div 
        className="dashboard-floating-dock" 
        role="toolbar" 
        aria-label="شريط الوصول السريع للعمليات السريرية"
      >
        <div className="dock-actions-group">
          {dockItems.map((item, idx) => (
            <React.Fragment key={item.id}>
              {/* Vertical separator between main action triggers and filtering tabs */}
              {idx === 2 && <div className="dock-separator" role="separator" aria-orientation="vertical" />}
              <button
                type="button"
                onClick={item.onClick}
                className={`dock-pill-btn ${item.active ? 'active' : ''}`}
                title={item.label}
                aria-pressed={item.active}
              >
                <span className={`dock-icon-box ${item.iconType || 'default'}`}>
                  {item.icon}
                </span>
                <span className="dock-label">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="dock-badge">{item.badge}</span>
                )}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
