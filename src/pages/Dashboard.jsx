import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useTenant } from '@/context/TenantContext';
import { 
  UserPlus, Share2, CalendarDays, Clock, Wallet, Landmark, BellRing 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getTodayDateStr, formatTimeToArabic } from '@/utils/timeSlots';
import WaitingRoomQueue from '@/pages/dashboard/WaitingRoomQueue';
import RevenueAnalytics from '@/pages/dashboard/RevenueAnalytics';
import * as appointmentsService from '@/features/appointments/services/appointmentsService';
import * as patientsService from '@/features/patients/services/patientsService';
import { addInvoice, getNextInvoiceNumber } from '@/features/billing/services/invoicesService';
import { recordAuditEvent, AUDIT_EVENT_TYPES } from '@/features/auth/services/auditLoggerService';
import { isDoctorRole, isAdminRole, hasCapability, CAPABILITIES } from '@/utils/permissions';
import { getBookingFunnelStats, getBookingDrafts } from '@/features/marketing/services/leadRecoveryService';
import { safeGetJSON, safeSetJSON } from '@/utils/safeStorage';
import { 
  DashboardMetricsGrid, 
  DashboardScheduleTable, 
  DashboardLeadRecoveryCard,
  DashboardQuickDock,
  DashboardModalsContainer,
  DashboardPendingBanner
} from '@/pages/dashboard/components';
import FeatureErrorBoundary from '@/components/FeatureErrorBoundary';
import './Dashboard.css';

/**
 * Dashboard - Core Clinical Operations & Real-time Flow Orchestrator
 */
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
  const [dossierPatient, setDossierPatient] = useState(null);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [paymentModalAppt, setPaymentModalAppt] = useState(null);
  const [roomWarningModal, setRoomWarningModal] = useState(null);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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

  const dueRecallsCount = useMemo(() => {
    return (state?.recalls || []).filter(r => {
      if (!r) return false;
      const rClinicId = r.clinicId || r.clinic_id;
      if (rClinicId && currentClinicId && rClinicId !== currentClinicId) return false;
      return r.dueDate <= today && r.status !== 'completed';
    }).length;
  }, [state?.recalls, currentClinicId, today]);

  // Calculate today's revenue strictly from completed appointments
  const todayRevenue = useMemo(() => {
    return completedToday.reduce((sum, a) => {
      const rawFee = a.fee ?? a.paidAmount;
      const numericFee = typeof rawFee === 'number'
        ? rawFee
        : (rawFee ? parseInt(String(rawFee).replace(/\D/g, ''), 10) : 0);
      return sum + (isNaN(numericFee) ? 0 : numericFee);
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
  }, [currentClinicId]);

  const recentAbandonedLeads = useMemo(() => {
    const drafts = getBookingDrafts(currentClinicId);
    return drafts
      .filter(d => d.status === 'abandoned')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 5);
  }, [currentClinicId]);

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

    recordAuditEvent({
      eventType: AUDIT_EVENT_TYPES.CONSULTATION_COMPLETED,
      user: user?.name || currentClinic.doctorName || 'طبيب العيادة',
      action: 'إنهاء الفحص السريري وتسجيل التشخيص',
      details: `تم إنهاء فحص المريض ${data.patientName || 'مريض'} (التشخيص: ${data.diagnosis || 'فحص عام'}) وتحويله للمحاسبة والاستقبال`,
      entityId: data.appointmentId,
      entityType: 'appointment'
    });

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

    try {
      await addInvoice(newInvoice);
      const existingInvoices = safeGetJSON(`clinicflow_invoices_${clinicSlug}`, []);
      safeSetJSON(`clinicflow_invoices_${clinicSlug}`, [newInvoice, ...existingInvoices]);
    } catch (invErr) {
      console.warn('Could not persist auto-generated invoice:', invErr);
    }

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

    // Explicit doctor assignment to prevent collision on zero-UUID in DB unique index
    const assignedDoctorId = walkInData.doctorId || 
      currentClinic.doctorId || 
      currentClinic.doctor_id || 
      tenant?.doctorId || 
      (state.doctors && state.doctors[0]?.id) || 
      generateUuid();

    // Calculate non-colliding time slot for the assigned doctor
    const now = new Date();
    const rawHour = String(now.getHours()).padStart(2, '0');
    const rawMin = String(now.getMinutes()).padStart(2, '0');
    let targetTime = formatTimeToArabic(`${rawHour}:${rawMin}`);

    let minuteOffset = 0;
    while (
      (state.appointments || []).some(a =>
        a.date === walkInData.date &&
        (a.doctorId === assignedDoctorId || a.doctor_id === assignedDoctorId) &&
        a.time === targetTime &&
        a.status !== 'cancelled'
      ) && minuteOffset < 60
    ) {
      minuteOffset += 1;
      const offsetDate = new Date(now.getTime() + minuteOffset * 60000);
      const offHour = String(offsetDate.getHours()).padStart(2, '0');
      const offMin = String(offsetDate.getMinutes()).padStart(2, '0');
      targetTime = formatTimeToArabic(`${offHour}:${offMin}`);
    }

    const newBooking = {
      id: generateUuid(),
      clinicId: currentClinicId,
      clinic_id: currentClinicId,
      patientId,
      patientName: walkInData.name,
      patientPhone: walkInData.phone,
      doctorId: assignedDoctorId,
      doctor_id: assignedDoctorId,
      date: walkInData.date,
      time: targetTime,
      type: walkInData.type || 'كشف عيادة',
      fee: walkInData.fee || currentClinic.regularFee || '0 ج.م',
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

  // Floating Command Dock Shortcuts
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
      {/* SaaS Pending Activation & Review Banner */}
      <DashboardPendingBanner 
        tenant={tenant}
        currentClinic={currentClinic}
        user={user}
      />

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
            onClick={() => setIsShareModalOpen(true)} 
            className="btn btn-secondary btn-sm"
            title="مشاركة بوابة حجز العيادة، النطاق الرقمي، ورمز QR للمرضى"
          >
            <Share2 size={13} />
            <span>مشاركة الحجز</span>
          </button>

          {(isAdmin || user?.role === 'staff' || user?.role === 'receptionist') && (
            <button 
              type="button" 
              onClick={() => setIsShiftModalOpen(true)} 
              className="btn btn-secondary btn-sm"
              title="تصفية الخزينة وتسليم وردية الاستقبال"
            >
              <Landmark size={13} />
              <span>تسليم الوردية</span>
            </button>
          )}

          <button 
            type="button" 
            onClick={() => setIsWalkInModalOpen(true)} 
            className="btn btn-primary btn-sm"
          >
            <UserPlus size={15} />
            <span>كشف فوري</span>
          </button>
        </div>
      </div>

      {/* 2. Google Material 3 Unified KPI Cards Grid */}
      <FeatureErrorBoundary featureName="مؤشرات أداء اليوم">
        <DashboardMetricsGrid
          todaysAppointments={todaysAppointments}
          completedToday={completedToday}
          waitingToday={waitingToday}
          inProgressToday={inProgressToday}
          attendanceRate={attendanceRate}
          currentExamPatient={currentExamPatient}
          canViewRevenue={canViewRevenue}
          todayRevenue={todayRevenue}
          activeFilterTab={activeFilterTab}
          onSelectFilterTab={setActiveFilterTab}
          isDoctor={isDoctor}
        />
      </FeatureErrorBoundary>

      {/* 3. Cockpit Layout: 2-Column Responsive High-Density Grid */}
      <div className="dashboard-cockpit-grid">
        {/* Main Column: Live Floor + Today's Schedule */}
        <div className="cockpit-main-column">
          <WaitingRoomQueue
            currentExamPatient={currentExamPatient}
            waitingToday={waitingToday}
            onStartExam={handleStartExam}
            onOpenFinishModal={(appt) => setFinishExamAppt(appt)}
            onOpenDossier={(appt) => setDossierPatient(appt)}
            onOpenWalkInModal={() => setIsWalkInModalOpen(true)}
            isDoctor={isDoctor}
          />

          <FeatureErrorBoundary featureName="جدول المواعيد">
            <DashboardScheduleTable
              filteredAppointments={filteredAppointments}
              scheduleSearchQuery={scheduleSearchQuery}
              setScheduleSearchQuery={setScheduleSearchQuery}
              activeFilterTab={activeFilterTab}
              setActiveFilterTab={setActiveFilterTab}
              waitingToday={waitingToday}
              inProgressToday={inProgressToday}
              pendingPaymentToday={pendingPaymentToday}
              completedToday={completedToday}
              bookedToday={bookedToday}
              currentExamPatient={currentExamPatient}
              isDoctor={isDoctor}
              onStartExam={handleStartExam}
              onFinishExam={(appt) => setFinishExamAppt(appt)}
              onCollectPayment={(appt) => setPaymentModalAppt(appt)}
              onOpenDossier={(appt) => setDossierPatient(appt)}
              onOpenWalkInModal={() => setIsWalkInModalOpen(true)}
            />
          </FeatureErrorBoundary>
        </div>

        {/* Side Column: Revenue Analytics or Reception Toolkit */}
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
                  onClick={() => setIsShareModalOpen(true)} 
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
                <button 
                  type="button" 
                  onClick={() => setIsRecallModalOpen(true)} 
                  className={`toolkit-action-btn ${dueRecallsCount > 0 ? 'highlight' : ''}`}
                  style={dueRecallsCount > 0 ? { borderColor: '#ef4444', background: '#fef2f2' } : { borderColor: 'var(--primary-color)' }}
                >
                  <BellRing size={18} style={dueRecallsCount > 0 ? { color: '#ef4444' } : { color: 'var(--primary-color)' }} />
                  <div className="btn-text">
                    <strong>استدعاء وتأكيد المواعيد ({dueRecallsCount} مستحق)</strong>
                    <small>تأكيد وتجديد مواعيد المتابعة الدورية مع العملاء</small>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Booking Funnel & Abandoned Leads Recovery Cockpit Card */}
          <FeatureErrorBoundary featureName="مسار الحجز واستعادة المرضى">
            <DashboardLeadRecoveryCard
              bookingFunnelStats={bookingFunnelStats}
              recentAbandonedLeads={recentAbandonedLeads}
              currentClinic={currentClinic}
              isDoctor={isDoctor}
              onNavigateToCrm={() => navigate('/doctor-agent')}
            />
          </FeatureErrorBoundary>
        </div>
      </div>

      {/* Modals & Drawers Container */}
      <DashboardModalsContainer
        isWalkInModalOpen={isWalkInModalOpen}
        setIsWalkInModalOpen={setIsWalkInModalOpen}
        handleWalkInSubmit={handleWalkInSubmit}
        currentClinic={currentClinic}
        finishExamAppt={finishExamAppt}
        setFinishExamAppt={setFinishExamAppt}
        handleFinishConsultation={handleFinishConsultation}
        dossierPatient={dossierPatient}
        setDossierPatient={setDossierPatient}
        isExpensesModalOpen={isExpensesModalOpen}
        setIsExpensesModalOpen={setIsExpensesModalOpen}
        isRecallModalOpen={isRecallModalOpen}
        setIsRecallModalOpen={setIsRecallModalOpen}
        isShiftModalOpen={isShiftModalOpen}
        setIsShiftModalOpen={setIsShiftModalOpen}
        paymentModalAppt={paymentModalAppt}
        setPaymentModalAppt={setPaymentModalAppt}
        handleCollectPayment={handleCollectPayment}
        roomWarningModal={roomWarningModal}
        setRoomWarningModal={setRoomWarningModal}
        isShareModalOpen={isShareModalOpen}
        setIsShareModalOpen={setIsShareModalOpen}
        tenant={tenant}
        doctors={state.doctors || []}
        defaultDoctorId={currentClinic?.doctorId || currentClinic?.doctor_id || tenant?.doctorId || (state.doctors && state.doctors[0]?.id) || ''}
        onScheduleAppointment={(recall) => {
          setIsRecallModalOpen(false);
          navigate(`/appointments?action=new&patientId=${encodeURIComponent(recall.patientId)}&date=${encodeURIComponent(recall.dueDate || today)}&type=${encodeURIComponent(recall.reason)}&recallId=${encodeURIComponent(recall.id)}`);
        }}
      />

      {/* Floating Quick Actions Command Dock */}
      <DashboardQuickDock dockItems={dockItems} />
    </div>
  );
};

export default Dashboard;
