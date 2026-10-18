import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Plus, BellRing, MessageCircle, Trash2, CalendarPlus, MessageSquare, PhoneCall, CheckCircle2
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import { useTenant } from '@/context/TenantContext';
import { getTodayDateStr } from '@/utils/timeSlots';
import { generateUuid } from '@/utils/uuid';
import './PatientRecallModal.css';

export const PatientRecallModal = ({ isOpen, onClose, initialPatient, onScheduleAppointment }) => {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { tenant } = useTenant();
  const today = getTodayDateStr();
  const currentClinicId = tenant?.id || state?.clinicInfo?.id;

  const patients = useMemo(() => {
    return (state?.patients || []).filter(p => {
      if (!p) return false;
      const pClinicId = p.clinicId || p.clinic_id;
      if (pClinicId && currentClinicId) return pClinicId === currentClinicId;
      return true;
    });
  }, [state?.patients, currentClinicId]);

  const clinicRecalls = useMemo(() => {
    return (state?.recalls || []).filter(r => {
      if (!r) return false;
      const rClinicId = r.clinicId || r.clinic_id;
      if (rClinicId && currentClinicId) return rClinicId === currentClinicId;
      return true;
    });
  }, [state?.recalls, currentClinicId]);

  // Default follow-up date is 2 weeks from today
  const defaultDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedPatientId, setSelectedPatientId] = useState(initialPatient?.id || (patients[0]?.id || ''));
  const [customReason, setCustomReason] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(defaultDateStr);
  const [appointmentTime, setAppointmentTime] = useState('06:00 م');
  const [activePreset, setActivePreset] = useState('14d');
  const [bookDirectlyInCalendar, setBookDirectlyInCalendar] = useState(true);
  const [notes, setNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const handleQuickDate = (days, presetId) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setAppointmentDate(d.toISOString().split('T')[0]);
    setActivePreset(presetId);
  };

  const targetPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || initialPatient || null;
  }, [patients, selectedPatientId, initialPatient]);

  const filteredRecalls = useMemo(() => {
    return clinicRecalls.filter(r => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'due') return r.dueDate <= today && r.status !== 'completed';
      if (filterStatus === 'upcoming') return r.dueDate > today && r.status !== 'completed';
      return r.status === filterStatus;
    });
  }, [clinicRecalls, filterStatus, today]);

  const dueCount = useMemo(() => {
    return clinicRecalls.filter(r => r.dueDate <= today && r.status !== 'completed').length;
  }, [clinicRecalls, today]);

  const handleAddRecall = (e) => {
    e.preventDefault();
    if (!targetPatient) return;

    const reasonText = customReason.trim() || 'كشف واستشارة متابعة دورية';
    const chosenDate = appointmentDate || today;

    // 1. Create recall item
    const newRecall = {
      id: generateUuid(),
      clinicId: currentClinicId,
      clinic_id: currentClinicId,
      patientId: targetPatient.id,
      patientName: targetPatient.name,
      patientPhone: targetPatient.phone,
      reason: reasonText,
      time: appointmentTime,
      dueDate: chosenDate,
      status: bookDirectlyInCalendar ? 'scheduled' : 'pending',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      lastContactedAt: null
    };

    dispatch({ type: 'ADD_RECALL', payload: newRecall });

    // 2. Direct booking in calendar if patient is at clinic
    if (bookDirectlyInCalendar) {
      const assignedDoctorId = 
        tenant?.doctorId || 
        state?.clinicInfo?.doctorId || 
        (state?.doctors && state?.doctors[0]?.id) || 
        '';

      const newAppointment = {
        id: generateUuid(),
        clinicId: currentClinicId,
        clinic_id: currentClinicId,
        patientId: targetPatient.id,
        patientName: targetPatient.name,
        patientPhone: targetPatient.phone,
        doctorId: assignedDoctorId,
        doctor_id: assignedDoctorId,
        date: chosenDate,
        time: appointmentTime,
        type: reasonText,
        fee: state?.clinicInfo?.regularFee || tenant?.regularFee || '0 ج.م',
        status: 'confirmed',
        notes: notes.trim() ? `متابعة واستدعاء: ${notes.trim()}` : `موعد متابعة مؤكد بالعيادة (${reasonText})`,
        createdAt: new Date().toISOString()
      };

      dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
    }

    setSaveSuccessMsg(
      bookDirectlyInCalendar 
        ? `تم تثبيت وحجز الموعد بنجاح للمريض (${targetPatient.name}) في جدول العيادة بتاريخ ${chosenDate} الساعة ${appointmentTime}!` 
        : `تم تسجيل تذكير المتابعة للمريض (${targetPatient.name}) بتاريخ ${chosenDate} بنجاح!`
    );
    setTimeout(() => setSaveSuccessMsg(''), 4500);

    setCustomReason('');
    setNotes('');
  };

  const handleUpdateStatus = (id, newStatus) => {
    dispatch({
      type: 'UPDATE_RECALL_STATUS',
      payload: { 
        id, 
        status: newStatus,
        lastContactedAt: newStatus === 'contacted' ? new Date().toISOString() : undefined
      }
    });
  };

  const handleDeleteRecall = (id) => {
    if (window.confirm('هل أنت متأكد من إلغاء هذا الاستدعاء؟')) {
      dispatch({ type: 'DELETE_RECALL', payload: id });
    }
  };

  const generateSmsRecallUrl = (recall) => {
    const clinicName = tenant?.name || state.clinicInfo?.name || 'العيادة التخصصية';
    const doctorPhone = tenant?.phone || state.clinicInfo?.phone || '01006285031';
    const cleanPhone = (recall.patientPhone || '').replace(/\D/g, '');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinic-flow-lh3g.vercel.app';
    const bookingPath = tenant?.slug ? `/c/${tenant.slug}` : (state.clinicInfo?.slug ? `/c/${state.clinicInfo.slug}` : '/');
    
    const message = `مرحباً أستاذ/ة ${recall.patientName}،\nنود تذكيركم بموعدكم الدوري لمتابعة [${recall.reason}] لدى ${clinicName}.\n\nللحجز وتأكيد الموعد المناسب لكم: ${origin}${bookingPath}\nأو الاتصال على: ${doctorPhone}\nنتمنى لكم دوام الصحة والعافية.`;
    
    return `sms:+2${cleanPhone}?body=${encodeURIComponent(message)}`;
  };

  const generateWhatsAppRecallUrl = (recall) => {
    const clinicName = tenant?.name || state.clinicInfo?.name || 'العيادة التخصصية';
    const cleanPhone = (recall.patientPhone || '').replace(/\D/g, '').replace(/^0/, '20');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinic-flow-lh3g.vercel.app';
    const bookingPath = tenant?.slug ? `/c/${tenant.slug}` : (state.clinicInfo?.slug ? `/c/${state.clinicInfo.slug}` : '/');
    const fullBookingUrl = `${origin}${bookingPath}`;
    const message = `مرحباً أستاذ/ة ${recall.patientName}،\nنود تذكيركم بموعدكم الدوري لمتابعة [${recall.reason}] لدى ${clinicName}.\n\nللحجز وتأكيد الموعد المناسب لكم مباشرة: ${fullBookingUrl}\nأو الرد على هذه الرسالة لتأكيد الموعد مباشرة مع الاستقبال.\nنتمنى لكم دوام الصحة والعافية.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleConfirmAndSchedule = (recall) => {
    handleUpdateStatus(recall.id, 'contacted');
    if (onScheduleAppointment) {
      onScheduleAppointment(recall);
    } else {
      navigate(`/appointments?action=new&patientId=${encodeURIComponent(recall.patientId)}&date=${encodeURIComponent(recall.dueDate || today)}&type=${encodeURIComponent(recall.reason)}&recallId=${encodeURIComponent(recall.id)}`);
    }
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()} lazyMount unmountOnExit>
      <Dialog.Backdrop className="recall-modal-overlay" />
      <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <Dialog.Content className="recall-modal-card glass-card">
          
          {/* Header */}
          <div className="modal-header">
            <div className="brand-title">
              <BellRing size={22} className="text-primary" />
              <h3>نظام متابعة واستدعاء مواعيد المرضى بالعيادة</h3>
            </div>
            <Dialog.CloseTrigger className="btn-close-modal" onClick={onClose} aria-label="إغلاق النافذة">
              <X size={20} />
            </Dialog.CloseTrigger>
          </div>

        {/* Stats Strip */}
        <div className="recall-stats-strip">
          <div className="rec-stat-pill">
            <span>مواعيد المتابعة المستحقة الآن:</span>
            <strong style={{ color: dueCount > 0 ? '#ef4444' : '#10b981' }}>{dueCount} مريض</strong>
          </div>
          <div className="rec-stat-pill">
            <span>إجمالي المتابعات المجدولة:</span>
            <strong>{clinicRecalls.length} مريض</strong>
          </div>
        </div>

        {saveSuccessMsg && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #10b981',
            color: '#065f46',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            margin: '0.75rem 1.25rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 700
          }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        <div className="modal-body-scrollable">
          
          {/* Schedule Recall Form */}
          <form onSubmit={handleAddRecall} className="schedule-recall-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>
                تحديد موعد مراجعة / استدعاء لمريض بالعيادة:
              </h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                تحديد مباشر ومؤكد من داخل العيادة
              </span>
            </div>

            <div className="form-grid-3col">
              {/* Field 1: Patient select */}
              <div className="form-group">
                <label htmlFor="rec-patient-select">المريض *</label>
                <select 
                  id="rec-patient-select"
                  className="input-field"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Appointment Date */}
              <div className="form-group">
                <label htmlFor="rec-due-date">تاريخ المراجعة / المتابعة القادمة *</label>
                <input 
                  id="rec-due-date"
                  type="date" 
                  className="input-field"
                  value={appointmentDate}
                  min={today}
                  onChange={(e) => {
                    setAppointmentDate(e.target.value);
                    setActivePreset(null);
                  }}
                  required
                />
              </div>

              {/* Field 3: Appointment Time */}
              <div className="form-group">
                <label htmlFor="rec-app-time">توقيت الموعد المفضل</label>
                <select 
                  id="rec-app-time"
                  className="input-field"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                >
                  <option value="04:00 م">04:00 مساءً</option>
                  <option value="05:00 م">05:00 مساءً</option>
                  <option value="06:00 م">06:00 مساءً</option>
                  <option value="07:00 م">07:00 مساءً</option>
                  <option value="08:00 م">08:00 مساءً</option>
                  <option value="09:00 م">09:00 مساءً</option>
                  <option value="10:00 م">10:00 مساءً</option>
                  <option value="صباحاً">فترة صباحية</option>
                  <option value="مساءً">فترة مسائية</option>
                </select>
              </div>

              {/* Quick Presets row under date */}
              <div className="form-group full-span-3" style={{ gridColumn: '1 / -1', marginTop: '-0.25rem' }}>
                <div className="quick-presets-row">
                  <span className="quick-presets-label">تحديد موعد سريع:</span>
                  {[
                    { label: 'بعد أسبوع (7 أيام)', days: 7, id: '7d' },
                    { label: 'بعد أسبوعين (14 يوم)', days: 14, id: '14d' },
                    { label: 'بعد شهر (30 يوم)', days: 30, id: '30d' },
                    { label: 'بعد شهرين (60 يوم)', days: 60, id: '60d' },
                    { label: 'بعد 3 أشهر', days: 90, id: '90d' },
                    { label: 'بعد 6 أشهر', days: 180, id: '180d' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn-quick-preset ${activePreset === p.id ? 'active' : ''}`}
                      onClick={() => handleQuickDate(p.days, p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 4: Reason / Clinical Instructions */}
              <div className="form-group full-span-3" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="rec-custom-reason">سبب المراجعة أو الإجراء المطلوب</label>
                <input 
                  id="rec-custom-reason"
                  type="text" 
                  className="input-field" 
                  placeholder="مثال: فحص دوري، فك غرز، متابعة تحليل، تلميع أسنان..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              </div>
            </div>

            {/* Direct Booking In Clinic Switch & Submit */}
            <div className="direct-booking-banner">
              <label className="toggle-container">
                <input 
                  type="checkbox"
                  id="rec-direct-booking"
                  checked={bookDirectlyInCalendar}
                  onChange={(e) => setBookDirectlyInCalendar(e.target.checked)}
                />
                <span style={{ fontSize: '0.85rem' }}>
                  <strong>تثبيت وتأكيد الحجز في جدول المواعيد مباشرة</strong> (المريض متواجد الآن بالعيادة)
                </span>
              </label>

              <button type="submit" className="btn-add-rec-action" aria-label="تأكيد وحفظ الموعد">
                {bookDirectlyInCalendar ? <CalendarPlus size={16} /> : <Plus size={16} />}
                <span>{bookDirectlyInCalendar ? 'تثبيت وحجز الموعد بالجدول الآن' : 'حفظ تذكير للمتابعة'}</span>
              </button>
            </div>
          </form>

          {/* Recall List Table */}
          <div className="recalls-list-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>
                قائمة متابعات ومواعيد المرضى ({filteredRecalls.length}):
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label htmlFor="rec-filter-status" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>تصفية الحالة:</label>
                <select 
                  id="rec-filter-status"
                  className="input-field" 
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.82rem' }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="تصفية حالة الاستدعاء"
                >
                  <option value="all">كافة المواعيد</option>
                  <option value="due">مستحق المتابعة الآن</option>
                  <option value="upcoming">قادم لاحقاً</option>
                  <option value="contacted">تم التواصل</option>
                </select>
              </div>
            </div>

            {filteredRecalls.length === 0 ? (
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                لا توجد خطط استدعاء مسجلة تطابق التصفية الحالية.
              </div>
            ) : (
              <div className="recalls-table-wrapper">
                <table className="recalls-data-table">
                  <thead>
                    <tr>
                      <th>اسم المريض</th>
                      <th>رقم الهاتف</th>
                      <th>سبب المراجعة</th>
                      <th>موعد المتابعة</th>
                      <th>الحالة</th>
                      <th style={{ textAlign: 'center' }}>تواصل وتأكيد</th>
                      <th style={{ textAlign: 'center' }}>تأكيد وحجز</th>
                      <th style={{ textAlign: 'center' }}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecalls.map((rec) => {
                      const isOverdue = rec.dueDate <= today && rec.status !== 'completed';
                      return (
                        <tr key={rec.id} className={isOverdue ? 'row-overdue' : ''}>
                          <td style={{ fontWeight: 700 }}>{rec.patientName}</td>
                          <td dir="ltr" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span>{rec.patientPhone}</span>
                            {rec.patientPhone && (
                              <a 
                                href={`tel:${rec.patientPhone}`}
                                className="btn-call-inline"
                                title="اتصال هاتفي مباشر لتأكيد الموعد"
                                style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px', color: 'var(--primary-color, #0284c7)' }}
                                aria-label={`اتصال هاتفي بالمريض ${rec.patientName}`}
                              >
                                <PhoneCall size={14} />
                              </a>
                            )}
                          </td>
                          <td>{rec.reason}</td>
                          <td>
                            <strong style={{ color: isOverdue ? '#ef4444' : 'inherit' }}>
                              {rec.dueDate}
                            </strong>
                            {isOverdue && <span className="due-tag">مستحق الآن</span>}
                          </td>
                          <td>
                            <select 
                              className="status-select-badge"
                              value={rec.status}
                              onChange={(e) => handleUpdateStatus(rec.id, e.target.value)}
                              aria-label={`تغيير حالة استدعاء المريض ${rec.patientName}`}
                            >
                              <option value="pending">قيد الانتظار</option>
                              <option value="contacted">تم التواصل</option>
                              <option value="scheduled">تم حجز موعد</option>
                              <option value="completed">مكتمل</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                              <a 
                                href={generateWhatsAppRecallUrl(rec)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-send-whatsapp-recall"
                                onClick={() => handleUpdateStatus(rec.id, 'contacted')}
                                title="تأكيد الموعد عبر واتساب"
                                aria-label={`تأكيد الموعد عبر واتساب مع المريض ${rec.patientName}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  background: '#25D366',
                                  color: '#ffffff',
                                  padding: '0.32rem 0.55rem',
                                  borderRadius: '6px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  textDecoration: 'none'
                                }}
                              >
                                <MessageSquare size={13} />
                                <span>واتساب</span>
                              </a>
                              <a 
                                href={generateSmsRecallUrl(rec)}
                                className="btn-send-sms-recall"
                                onClick={() => handleUpdateStatus(rec.id, 'contacted')}
                                title="إرسال رسالة تذكير مخصصة عبر SMS"
                                aria-label={`إرسال رسالة تذكير SMS للمريض ${rec.patientName}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  background: 'var(--clinic-primary, #09090B)',
                                  color: '#ffffff',
                                  padding: '0.32rem 0.55rem',
                                  borderRadius: '6px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  textDecoration: 'none'
                                }}
                              >
                                <MessageCircle size={13} />
                                <span>SMS</span>
                              </a>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button 
                              type="button" 
                              className="btn-schedule-recall-now"
                              onClick={() => handleConfirmAndSchedule(rec)}
                              title="الانتقال إلى جدول المواعيد لتأكيد وتثبيت الحجز مع العميل"
                              aria-label={`تأكيد وحجز موعد في الجدول للمريض ${rec.patientName}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                background: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.35rem 0.7rem',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                              }}
                            >
                              <CalendarPlus size={14} />
                              <span>تأكيد وحجز</span>
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
                              className="btn-trash-exp"
                              onClick={() => handleDeleteRecall(rec.id)}
                              title="إلغاء الاستدعاء"
                              aria-label={`إلغاء استدعاء المريض ${rec.patientName}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="modal-footer-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            إغلاق
          </button>
        </div>

        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
export default PatientRecallModal;
