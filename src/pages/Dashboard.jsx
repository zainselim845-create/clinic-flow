import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import { 
  UserPlus, Search, FolderOpen, Share2, RotateCcw,
  CalendarDays, Clock, Stethoscope, Wallet, Landmark, CheckCircle2,
  BellRing, Plus, Calendar, UserX, MessageCircle, ArrowRight
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
import ConfirmationModal from '../components/ConfirmationModal';
import QuickPaymentModal from './dashboard/QuickPaymentModal';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';
import { addInvoice, getNextInvoiceNumber } from '../services/invoicesService';
import { savePrescriptionToStorage } from '../services/prescriptionService';
import { recordAuditEvent, AUDIT_EVENT_TYPES } from '../services/auditLoggerService';
import { isDoctorRole, isAdminRole, hasCapability, CAPABILITIES } from '../utils/permissions';
import { getBookingFunnelStats, getBookingDrafts, generateLeadRecoveryWhatsAppUrl, BOOKING_FUNNEL_STEPS } from '../services/leadRecoveryService';
import { safeGetJSON, safeSetJSON } from '../utils/safeStorage';
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
  const [paymentModalAppt, setPaymentModalAppt] = useState(null);
  const [roomWarningModal, setRoomWarningModal] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
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

  // Booking Funnel Monitoring: Live abandoned leads and conversion analytics
  const bookingFunnelStats = useMemo(() => {
    return getBookingFunnelStats(currentClinicId);
  }, [currentClinicId, state.appointments?.length]);

  const recentAbandonedLeads = useMemo(() => {
    const drafts = getBookingDrafts(currentClinicId);
    return drafts
      .filter(d => d.status === 'abandoned')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 5);
  }, [currentClinicId, state.appointments?.length]);

  const currentExamPatient = inProgressToday[0] || null;

  // Status transitions with Room Occupancy Guard
  const handleStartExam = async (appt) => {
    if (currentExamPatient && currentExamPatient.id !== appt.id) {
      setRoomWarningModal({
        occupiedPatient: currentExamPatient,
        nextPatient: appt
      });
      return;
    }

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
  const handleCollectPayment = async (appointmentId, paymentMethod, customAmount, notes) => {
    const targetAppt = todaysAppointments.find(a => a.id === appointmentId);
    const rawFee = targetAppt?.fee ?? targetAppt?.paidAmount;
    const defaultNumericFee = typeof rawFee === 'number'
      ? rawFee
      : (rawFee ? parseInt(String(rawFee).replace(/\D/g, ''), 10) || 0 : (currentClinic.regularFee || 0));
    const numericFee = (customAmount !== undefined && customAmount !== null) ? Number(customAmount) : defaultNumericFee;

    const clinicSlug = currentClinic.slug || tenant?.slug || 'clinic';
    const invoiceNumber = getNextInvoiceNumber(currentClinicId || clinicSlug);

    const paymentMethodLabel = paymentMethod === 'cash' ? 'نقداً (كاش)' : paymentMethod === 'card' ? 'بطاقة بنكية' : 'إنستاباي/محفظة إلكترونية';
    const paymentNotes = notes ? `ملاحظات: ${notes} • تم التحصيل عبر (${paymentMethodLabel})` : `تم تحصيل الرسوم بواسطة مكتب الاستقبال عبر (${paymentMethodLabel})`;

    const newInvoice = {
      id: 'inv-' + Date.now(),
      clinicId: currentClinicId || tenant?.id || (clinicSlug ? `tenant-${clinicSlug}` : 'clinic-default'),
      clinic_id: currentClinicId || tenant?.id || (clinicSlug ? `tenant-${clinicSlug}` : 'clinic-default'),
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
      notes: paymentNotes,
      createdAt: new Date().toISOString()
    };

    // 1. Sync invoice to Supabase and LocalStorage
    try {
      await addInvoice(newInvoice);
      const existingInvoices = safeGetJSON(`clinicflow_invoices_${clinicSlug}`, []);
      safeSetJSON(`clinicflow_invoices_${clinicSlug}`, [newInvoice, ...existingInvoices]);
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
    setIsResetConfirmOpen(true);
  };

  const confirmResetToday = () => {
    dispatch({ type: 'REFRESH_TODAY_DEMO_DATA' });
    setIsResetConfirmOpen(false);
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
  ], [waitingToday.length, pendingPaymentToday.length, activeFilterTab, isAdmin, isDoctor, user?.role, navigate]);

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
      
      {/* SaaS Pending Activation & Review Banner */}
      {((tenant?.subscriptionStatus === 'pending_approval') || (currentClinic?.subscriptionStatus === 'pending_approval')) && (
        <div style={{
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
          border: '1.5px solid #FCD34D',
          borderRadius: '14px',
          padding: '1.1rem 1.4rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          direction: 'rtl',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#F59E0B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              <Clock size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#92400E' }}>
                  حساب العيادة قيد المراجعة والتفعيل السريع
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: '#FDE68A',
                  color: '#78350F',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  باقة {tenant?.subscriptionTier === 'enterprise' ? 'Enterprise (المراكز الكبرى)' : tenant?.subscriptionTier === 'starter' ? 'Starter (الأساسية)' : 'Pro (العيادة الذكية)'}
                </span>
              </div>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.86rem', color: '#B45309', lineHeight: 1.5 }}>
                مرحباً بك {user?.name ? (user.name.startsWith('د.') ? user.name : `د. ${user.name}`) : 'دكتور'}! تم تدشين عيادتك بنجاح ويمكنك استكشاف النظام وإدخال بيانات المرضى والخدمات. سيقوم فريق ClinicFlow بالتواصل معك هاتفياً على ({user?.phone || tenant?.phone || 'رقم هاتفك'}) لتأكيد الاشتراك وتفعيل كافة الصلاحيات المتقدمة.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <a 
              href={`https://wa.me/201006285031?text=${encodeURIComponent(`مرحباً فريق ClinicFlow، أنا الطبيب ${user?.name || ''} عيادة ${tenant?.name || ''} وأرغب في تأكيد وتفعيل حسابي سريعاً.`)}`}
              target="_blank" 
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                background: '#10B981',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
              }}
            >
              <MessageCircle size={15} />
              <span>تواصل لتسريع التفعيل</span>
            </a>
          </div>
        </div>
      )}

      {/* 1. Sleek Minimal Architectural Command Bar */}
      <div className="dashboard-command-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {isDoctor 
                ? `العمليات السريرية • ${(user?.name && !user.name.startsWith('د.') ? `د. ${user.name}` : (user?.name || tenant?.doctorName || currentClinic.doctorName || tenant?.name || 'طبيب العيادة'))}`
                : `مكتب الاستقبال • ${user?.name || 'طاقم الاستقبال'}`}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
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
            className="btn btn-secondary btn-sm"
            title="نسخ رابط حجز العيادة المباشر للمرضى"
          >
            <Share2 size={13} />
            <span>{copiedBookingLink ? 'تم نسخ الرابط بنجاح!' : 'نسخ رابط حجز المرضى'}</span>
          </button>

          {(isAdmin || user?.role === 'staff' || user?.role === 'receptionist') && (
            <button 
              type="button" 
              onClick={() => setIsShiftModalOpen(true)} 
              className="btn btn-secondary btn-sm"
              title="تصفية الخزينة وتسليم وردية الاستقبال"
            >
              <Landmark size={13} />
              <span>تسليم وردية الاستقبال</span>
            </button>
          )}

          <button 
            type="button" 
            onClick={() => setIsWalkInModalOpen(true)} 
            className="btn btn-primary btn-sm"
          >
            <UserPlus size={15} />
            <span>تسجيل كشف فوري (Walk-in)</span>
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
                                onClick={() => handleStartExam(appt)}
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
                                onClick={() => setFinishExamAppt(appt)}
                                className="btn-action-success"
                              >
                                إنهاء الكشف
                              </button>
                            )}
                            {appt.status === 'pending_payment' && (
                              <button
                                type="button"
                                onClick={() => setPaymentModalAppt(appt)}
                                className="btn-action-success"
                                title="تحصيل الرسوم وإصدار الفاتورة الإلكترونية"
                              >
                                <Wallet size={13} style={{ marginLeft: '0.35rem' }} />
                                <span>تحصيل الرسوم</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDossierPatient(appt)}
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
                    <strong>في انتظار التحصيل ({pendingPaymentToday.length} مريض)</strong>
                    <small>مرضى أنهوا الكشف وينتظرون دفع الرسوم</small>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Booking Funnel & Abandoned Leads Recovery Cockpit Card */}
          <div className="dashboard-funnel-card">
            <div className="funnel-card-header">
              <div className="funnel-header-title">
                <div className="funnel-header-icon-box">
                  <UserX size={16} />
                </div>
                <div>
                  <h4 className="funnel-title">مسار الحجز واستعادة المرضى</h4>
                  <span className="funnel-subtitle">رصد المرضى الذين بدأوا الحجز وتوقفوا</span>
                </div>
              </div>
              <span className="funnel-badge-pill">
                {bookingFunnelStats.conversionRate}% نسبة الإكمال
              </span>
            </div>

            {/* Conversion Funnel Progress Indicators */}
            <div className="funnel-steps-bar" role="group" aria-label="مراحل مسار الحجز الرقمي">
              <div className="funnel-step-item" title="الخطوة 1: إدخال الهاتف والاسم">
                <span className="step-val">{bookingFunnelStats.step1Count}</span>
                <span className="step-lbl">بيانات</span>
              </div>
              <span className="funnel-step-arrow" aria-hidden="true">←</span>
              <div className="funnel-step-item" title="الخطوة 2: اختيار نوع الخدمة">
                <span className="step-val">{bookingFunnelStats.step2Count}</span>
                <span className="step-lbl">الخدمة</span>
              </div>
              <span className="funnel-step-arrow" aria-hidden="true">←</span>
              <div className="funnel-step-item" title="الخطوة 3: اختيار الموعد المناسب">
                <span className="step-val">{bookingFunnelStats.step3Count}</span>
                <span className="step-lbl">الموعد</span>
              </div>
              <span className="funnel-step-arrow" aria-hidden="true">←</span>
              <div className="funnel-step-item completed" title="الخطوة 4: حجز مؤكد ومكتمل">
                <span className="step-val">{bookingFunnelStats.completedCount}</span>
                <span className="step-lbl">مؤكد</span>
              </div>
            </div>

            {/* Abandoned Leads List */}
            <div className="funnel-leads-section">
              <div className="funnel-leads-header">
                <span className="leads-header-title">
                  حالات معلقة لم تكتمل ({recentAbandonedLeads.length})
                </span>
                {isDoctor && (
                  <button 
                    type="button" 
                    onClick={() => navigate('/doctor-agent')}
                    className="btn-link-crm"
                    title="فتح مركز التسويق واستعادة العملاء بالكامل"
                  >
                    <span>مركز الاستعادة</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>

              {recentAbandonedLeads.length === 0 ? (
                <div className="funnel-empty-state">
                  <CheckCircle2 size={20} className="empty-check-icon" />
                  <span>كافة المرضى الذين بدأوا الحجز أتموا خطواتهم بنجاح.</span>
                </div>
              ) : (
                <div className="funnel-leads-list">
                  {recentAbandonedLeads.map((lead) => {
                    const stepName = BOOKING_FUNNEL_STEPS[lead.step]?.name || lead.stepName || 'توقف أثناء الحجز';
                    const whatsappUrl = generateLeadRecoveryWhatsAppUrl(lead, currentClinic);
                    return (
                      <div key={lead.id} className="funnel-lead-row">
                        <div className="lead-row-info">
                          <div className="lead-row-top">
                            <strong className="lead-name">{lead.name || 'مريض جديد'}</strong>
                            <span className="lead-phone" dir="ltr">{lead.phone}</span>
                          </div>
                          <div className="lead-row-meta">
                            <span className="lead-step-badge">{stepName}</span>
                            {lead.service && <span className="lead-service-badge">{lead.service}</span>}
                          </div>
                        </div>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-recover-lead"
                          title="إرسال رسالة تذكيرية فورية عبر واتساب لاستكمال الحجز بنقرة واحدة"
                        >
                          <MessageCircle size={13} />
                          <span>استعادة</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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

      {/* Quick Payment & Invoicing Modal */}
      <QuickPaymentModal
        isOpen={!!paymentModalAppt}
        appointment={paymentModalAppt}
        onClose={() => setPaymentModalAppt(null)}
        onConfirm={handleCollectPayment}
      />

      {/* Room Occupancy Guard Warning Modal */}
      <ConfirmationModal
        isOpen={!!roomWarningModal}
        onClose={() => setRoomWarningModal(null)}
        onConfirm={() => setRoomWarningModal(null)}
        title="غرفة الكشف مشغولة حالياً"
        message={`المريض (${roomWarningModal?.occupiedPatient?.patientName || ''}) متواجد حالياً داخل غرفة الكشف مع الطبيب. يرجى إنهاء الكشف الحالي قبل إدخال (${roomWarningModal?.nextPatient?.patientName || ''}).`}
        confirmText="حسناً، فهمت"
        cancelText=""
        isDestructive={false}
      />

      {/* Reset Schedule Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={confirmResetToday}
        title="تأكيد استعادة جدول مواعيد اليوم"
        message="هل أنت متأكد من رغبتك في إعادة ضبط واستعادة جدول مواعيد اليوم للحالة الأولية؟"
        confirmText="تأكيد إعادة الضبط"
        cancelText="إلغاء"
        isDestructive={true}
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
