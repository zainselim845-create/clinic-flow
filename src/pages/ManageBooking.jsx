import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Calendar, Clock, CheckCircle2, XCircle, AlertCircle, 
  Phone, Stethoscope, RefreshCw, ShieldCheck,
  KeyRound, Lock, Unlock, MessageSquare, UserCheck, HelpCircle
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import { generateDynamicSlots, getTodayDateStr, parseLocalDate } from '../utils/timeSlots';
import { cleanEgyptianPhone } from '../utils/phoneValidation';
import * as appointmentsService from '../services/appointmentsService';
import { isSupabaseConfigured } from '../lib/supabase';
import './ManageBooking.css';

const ManageBooking = () => {
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useApp();
  const useSupabase = isSupabaseConfigured();
  const appointments = state.appointments || [];

  const blockedSlots = state.blockedSlots || [];
  const clinicInfo = state.clinicInfo || {};
  const scheduleConfig = clinicInfo.scheduleConfig || {
    workingDays: [6, 0, 1, 2, 3, 4],
    startTime: '17:00',
    endTime: '22:00',
    slotDuration: 30
  };

  const [phoneSearch, setPhoneSearch] = useState(searchParams.get('phone') || '');
  const [bookingCodeSearch, setBookingCodeSearch] = useState(searchParams.get('code') || '');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  // Identity Verification Fallback State (التحقق بالاسم المسجل بدون تكلفة SMS)
  const [isForgotCodeMode, setIsForgotCodeMode] = useState(false);
  const [verifyPatientName, setVerifyPatientName] = useState('');
  const [verifyFeedback, setVerifyFeedback] = useState(null);

  // Auto-find appointment if id/phone AND code are passed securely in URL
  useEffect(() => {
    const idParam = searchParams.get('id');
    const phoneParam = searchParams.get('phone');
    const codeParam = searchParams.get('code');

    if (codeParam && (idParam || phoneParam)) {
      const cleanCode = codeParam.trim().toUpperCase().replace('#', '');
      const cleanPhone = cleanEgyptianPhone(phoneParam);

      const found = (state.appointments || []).find(a => {
        const matchesId = idParam && String(a.id) === String(idParam);
        const aPhone = cleanEgyptianPhone(a.patientPhone);
        const matchesPhone = cleanPhone && aPhone && (aPhone.includes(cleanPhone) || cleanPhone.includes(aPhone));
        const matchesCode = a.bookingCode && a.bookingCode.toUpperCase().replace('#', '') === cleanCode;
        return (matchesId || matchesPhone) && matchesCode;
      });

      if (found) {
        setSelectedAppointment(found);
        setBookingCodeSearch(codeParam);
      }
    }
  }, [searchParams, state.appointments]);

  // Secure 2-Factor Search Handler (Phone + Secret Booking Reference Code)
  const handleSearch = (e) => {
    e.preventDefault();
    if (!phoneSearch.trim()) {
      setStatusMessage({ type: 'error', text: 'يرجى كتابة رقم الهاتف المسجل بالحجز.' });
      return;
    }
    if (!bookingCodeSearch.trim()) {
      setStatusMessage({ 
        type: 'error', 
        text: ' لحماية خصوصية بيانات المرضى ومنع التلاعب بالمواعيد، يرجى كتابة كود الحجز المرجعي (#CF-XXXX) المستلم عند الحجز، أو استخدام خيار "نسيت كود الحجز".' 
      });
      return;
    }

    const cleanDigits = cleanEgyptianPhone(phoneSearch);
    const cleanCode = bookingCodeSearch.trim().toUpperCase().replace('#', '');

    // Check if phone exists
    const matchingPhoneAppts = appointments.filter(a => {
      const aPhone = cleanEgyptianPhone(a.patientPhone);
      return cleanDigits && aPhone && (aPhone.includes(cleanDigits) || cleanDigits.includes(aPhone));
    });

    if (matchingPhoneAppts.length === 0) {
      setSelectedAppointment(null);
      setStatusMessage({ type: 'error', text: 'لم نتمكن من العثور على أي موعد مسجل بهذا الرقم. يرجى التأكد من كتابة الرقم بشكل صحيح.' });
      return;
    }

    // Check if code matches the phone's appointment
    const verifiedAppt = matchingPhoneAppts.find(a => {
      const aCode = (a.bookingCode || '').toUpperCase().replace('#', '');
      return aCode === cleanCode || aCode.endsWith(cleanCode);
    });

    if (verifiedAppt) {
      setSelectedAppointment(verifiedAppt);
      setStatusMessage(null);
      setIsForgotCodeMode(false);
    } else {
      setSelectedAppointment(null);
      setStatusMessage({
        type: 'error',
        text: ' كود الحجز المرجعي غير متطابق مع رقم الهاتف. لحماية خصوصية المريض ومنع التلاعب بمواعيد الآخرين، يرجى كتابة الكود الصحيح (#CF-XXXX) أو الضغط على "نسيت كود الحجز؟" بالأسفل للتحقق بالاسم المسجل مجاناً.'
      });
    }
  };

  // Zero-Cost Verification via Registered Patient Name Match (التحقق بالاسم المسجل بدون SMS)
  const handleVerifyByName = (e) => {
    e.preventDefault();
    const cleanDigits = cleanEgyptianPhone(phoneSearch);
    const cleanName = verifyPatientName.trim().toLowerCase();

    if (!cleanDigits || cleanDigits.length < 10) {
      setVerifyFeedback({ type: 'error', text: 'يرجى كتابة رقم الهاتف المسجل بالحجز أولاً.' });
      return;
    }

    if (!cleanName || cleanName.length < 2) {
      setVerifyFeedback({ type: 'error', text: 'يرجى كتابة اسم المريض المسجل بالحجز للتحقق.' });
      return;
    }

    const matchingAppts = appointments.filter(a => {
      const aPhone = cleanEgyptianPhone(a.patientPhone);
      return aPhone && (aPhone.includes(cleanDigits) || cleanDigits.includes(aPhone));
    });

    if (matchingAppts.length === 0) {
      setVerifyFeedback({ type: 'error', text: 'لم يتم العثور على موعد مسجل بهذا الرقم في العيادة.' });
      return;
    }

    // Check if patient name matches
    const nameMatchedAppt = matchingAppts.find(a => {
      const dbName = (a.patientName || '').trim().toLowerCase();
      // Match first name or full name
      const nameParts = cleanName.split(/\s+/);
      return dbName.includes(cleanName) || nameParts.some(part => part.length >= 3 && dbName.includes(part));
    });

    if (nameMatchedAppt) {
      setSelectedAppointment(nameMatchedAppt);
      setIsForgotCodeMode(false);
      setVerifyFeedback(null);
      setStatusMessage({ type: 'success', text: `تم التحقق من هوية المريض (${nameMatchedAppt.patientName}) بنجاح! تم استرجاع الموعد بأمان.` });
    } else {
      setVerifyFeedback({ 
        type: 'error', 
        text: 'اسم المريض غير متطابق مع المسجل لهذا الرقم. يرجى التأكد من كتابة الاسم المسجل بالحجز أو التواصل مع العيادة عبر واتساب.' 
      });
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    if (window.confirm('هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟')) {
      if (useSupabase) {
        try {
          await appointmentsService.updateAppointmentStatus(selectedAppointment.id, 'cancelled');
        } catch (err) {
          console.error('Failed to cancel appointment in Supabase:', err);
        }
      }
      dispatch({
        type: 'UPDATE_APPOINTMENT_STATUS',
        payload: { id: selectedAppointment.id, status: 'cancelled' }
      });
      setSelectedAppointment(prev => ({ ...prev, status: 'cancelled' }));
      setStatusMessage({ type: 'success', text: 'تم إلغاء الموعد بنجاح.' });
    }
  };

  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) {
      setStatusMessage({ type: 'error', text: 'يرجى اختيار التاريخ والوقت الجديدين أولاً' });
      return;
    }

    const updatedAppt = {
      ...selectedAppointment,
      date: newDate,
      time: newTime,
      status: 'booked'
    };

    if (useSupabase) {
      try {
        await appointmentsService.updateAppointment(selectedAppointment.id, {
          date: newDate,
          time: newTime,
          status: 'booked'
        });
      } catch (err) {
        console.error('Failed to update rescheduled appointment in Supabase:', err);
      }
    }

    dispatch({
      type: 'UPDATE_APPOINTMENT',
      payload: updatedAppt
    });

    setSelectedAppointment(prev => ({
      ...prev,
      date: newDate,
      time: newTime,
      status: 'booked'
    }));

    setIsRescheduling(false);
    setStatusMessage({ type: 'success', text: `تم تعديل الموعد بنجاح إلى: ${newDate} الساعة ${newTime} ` });
  };

  const getAvailableSlots = (date) => {
    if (!date) return [];
    
    const jsDay = parseLocalDate(date).getDay();
    const workingDays = scheduleConfig.workingDays || [6, 0, 1, 2, 3, 4];
    if (!workingDays.includes(jsDay)) return [];

    const isFullDayBlocked = (blockedSlots || []).some(
      b => b.date === date && (b.isFullDay || b.time === 'FULL_DAY' || b.time === 'ALL')
    );
    if (isFullDayBlocked) return [];

    const daySlots = generateDynamicSlots(
      scheduleConfig.startTime || '17:00',
      scheduleConfig.endTime || '22:00',
      scheduleConfig.slotDuration || 30
    );

    const bookedOnDate = appointments
      .filter(a => a.date === date && a.status !== 'cancelled' && a.id !== selectedAppointment?.id)
      .map(a => a.time);

    const blockedOnDate = (blockedSlots || [])
      .filter(b => b.date === date)
      .map(b => b.time);

    return daySlots.filter(slot => !bookedOnDate.includes(slot) && !blockedOnDate.includes(slot));
  };

  const clinicPhoneClean = (clinicInfo.phone || '01006285031').replace(/\D/g, '');
  const whatsappHelpUrl = `https://wa.me/2${clinicPhoneClean}?text=${encodeURIComponent(`مرحباً، أنا المريض المسجل برقم (${phoneSearch || '...'}) وأرغب في المساعدة باسترجاع كود الحجز المرجعي الخاص بي لإدارة موعدي.`)}`;

  return (
    <div className="manage-booking-page">
      <div className="manage-booking-container glass-card">
        
        {/* Header */}
        <div className="manage-header">
          <div className="brand-badge">
            <Stethoscope size={28} className="text-primary" />
            <h2>بوابة إدارة مواعيد المرضى المؤمنة</h2>
          </div>
          <p className="subtitle">عرض وتعديل أو إلغاء موعدك الطبي بأمان تام وخصوصية مشددة بدون أي رسوم أو اشتراكات</p>
          <div className="security-notice-badge">
            <ShieldCheck size={16} color="#059669" />
            <span>نظام محمي بالتحقق المزدوج: يتطلب رقم الهاتف مع كود الحجز المرجعي لمنع التلاعب بمواعيد الآخرين.</span>
          </div>
        </div>

        {/* 1. Secure Double Verification Search Form */}
        {!selectedAppointment && !isForgotCodeMode && (
          <div className="search-section">
            <form onSubmit={handleSearch} className="secure-search-form">
              <div className="form-grid-2col">
                <div className="form-group">
                  <label className="form-label">
                    <Phone size={16} /> رقم الهاتف المسجل بالحجز:
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="مثال: 01006285031"
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    dir="ltr"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <KeyRound size={16} /> كود الحجز المرجعي السري:
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="مثال: #CF-3531 أو 3531"
                    value={bookingCodeSearch}
                    onChange={(e) => setBookingCodeSearch(e.target.value)}
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="search-actions-bar">
                <button type="submit" className="btn-primary search-btn">
                  <Lock size={16} />
                  <span>التحقق وعرض تفاصيل الموعد </span>
                </button>

                <button 
                  type="button" 
                  className="btn-link-otp"
                  onClick={() => { setIsForgotCodeMode(true); setStatusMessage(null); }}
                >
                  <HelpCircle size={16} />
                  <span>نسيت كود الحجز؟ تحقق بالاسم المسجل مجاناً </span>
                </button>
              </div>
            </form>

            <div className="new-booking-hint">
              <span>تريد حجز موعد جديد بالكامل؟</span>
              <Link to="/booking" className="link-booking">احجز موعد جديد الآن </Link>
            </div>
          </div>
        )}

        {/* 2. Free Zero-Cost Verification via Registered Name Match */}
        {!selectedAppointment && isForgotCodeMode && (
          <div className="otp-verification-section">
            <div className="otp-card-header">
              <UserCheck size={24} className="text-primary" />
              <div>
                <h4>التحقق الآمن من هوية صاحب الحجز (مجاني 100%)</h4>
                <p>أدخل اسم المريض المسجل بالحجز للتأكد من هويتك ومنع الغرباء من تعديل موعدك:</p>
              </div>
            </div>

            <form onSubmit={handleVerifyByName} className="otp-verify-form">
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>رقم الهاتف المسجل:</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    placeholder="01006285031"
                    dir="ltr"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>اسم المريض المسجل بالحجز:</label>
                  <input
                    type="text"
                    className="input-field"
                    value={verifyPatientName}
                    onChange={(e) => setVerifyPatientName(e.target.value)}
                    placeholder="مثال: محمد سعيد"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="otp-actions-row">
                <button type="submit" className="btn-primary">
                  <Unlock size={16} />
                  <span>تأكيد الهوية وفتح الموعد </span>
                </button>

                <a 
                  href={whatsappHelpUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-whatsapp-help"
                  title="مراسلة واتساب العيادة لاسترجاع الكود"
                >
                  <MessageSquare size={16} />
                  <span>طلب الكود عبر واتساب </span>
                </a>

                <a 
                  href={`tel:${clinicPhoneClean}`} 
                  className="btn-call-help"
                  title="الاتصال الفوري بسكرتارية العيادة للمساعدة"
                >
                  <Phone size={16} />
                  <span>اتصال هاتفي بالعيادة </span>
                </a>

                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => { setIsForgotCodeMode(false); setVerifyFeedback(null); }}
                >
                  رجوع للبحث بالكود
                </button>
              </div>
            </form>

            {verifyFeedback && (
              <div className={`status-banner ${verifyFeedback.type}`} style={{ marginTop: '1rem' }}>
                {verifyFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{verifyFeedback.text}</span>
              </div>
            )}
          </div>
        )}

        {/* Status Notification Banner */}
        {statusMessage && (
          <div className={`status-banner ${statusMessage.type}`}>
            {statusMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 3. Appointment Details Card (Shown ONLY after successful verification) */}
        {selectedAppointment && !isRescheduling && (
          <div className="appointment-details-card">
            <div className="card-top-bar">
              <span className={`status-pill ${selectedAppointment.status}`}>
                {(selectedAppointment.status === 'upcoming' || selectedAppointment.status === 'booked') && ' موعد قادم ومؤكد'}
                {selectedAppointment.status === 'waiting' && ' تم تسجيل وصولك - في صالة الانتظار'}
                {selectedAppointment.status === 'in_progress' && ' في غرفة الكشف الآن'}
                {selectedAppointment.status === 'completed' && ' تم الكشف والمحاسبة'}
                {selectedAppointment.status === 'cancelled' && ' موعد ملغي'}
              </span>
              <button 
                type="button" 
                className="btn-text-change-phone"
                onClick={() => { setSelectedAppointment(null); setStatusMessage(null); }}
              >
                 إغلاق والبحث عن موعد آخر
              </button>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span className="label">كود الحجز المرجعي:</span>
                <strong className="value code-highlight">#{selectedAppointment.bookingCode}</strong>
              </div>
              <div className="detail-item">
                <span className="label">اسم المريض:</span>
                <strong className="value">{selectedAppointment.patientName}</strong>
              </div>
              <div className="detail-item">
                <span className="label">رقم الهاتف:</span>
                <span className="value" dir="ltr">{selectedAppointment.patientPhone}</span>
              </div>
              <div className="detail-item">
                <span className="label">التاريخ:</span>
                <strong className="value date-val"> {selectedAppointment.date}</strong>
              </div>
              <div className="detail-item">
                <span className="label">الوقت:</span>
                <strong className="value time-val"> {selectedAppointment.time}</strong>
              </div>
              <div className="detail-item">
                <span className="label">نوع الكشف:</span>
                <span className="value">{selectedAppointment.type || 'كشف عادي'}</span>
              </div>
              <div className="detail-item">
                <span className="label">قيمة الكشف:</span>
                <span className="value fee-val">{String(selectedAppointment.fee || '300').replace(/ج\.?م/g, '').trim()} ج.م</span>
              </div>
            </div>

            {(selectedAppointment.status === 'upcoming' || selectedAppointment.status === 'booked') && (
              <div className="action-buttons-row">
                <button 
                  type="button" 
                  className="btn-reschedule"
                  onClick={() => { setIsRescheduling(true); setNewDate(selectedAppointment.date); }}
                >
                  <RefreshCw size={18} />
                  <span>تغيير موعد الكشف (Reschedule)</span>
                </button>

                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={handleCancelAppointment}
                >
                  <XCircle size={18} />
                  <span>إلغاء الموعد</span>
                </button>
              </div>
            )}

            <div className="clinic-location-box">
              <ShieldCheck size={20} className="text-primary" />
              <div>
                <strong>عنوان العيادة:</strong>
                <p>{clinicInfo.address || 'مصر الجديدة — شارع الأهرام، برج الأطباء، الدور الرابع.'}</p>
                <span className="clinic-phone"> للاستفسارات والواتساب: {clinicInfo.phone || '01006285031'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Reschedule Form Section */}
        {selectedAppointment && isRescheduling && (
          <div className="reschedule-section">
            <div className="reschedule-header">
              <h3>تغيير موعد الكشف لمريض: {selectedAppointment.patientName}</h3>
              <p>اختر التاريخ الجديد المناسب لك من جدول عمل العيادة:</p>
            </div>

            <form onSubmit={handleConfirmReschedule} className="reschedule-form">
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={16} /> اختر التاريخ الجديد:
                </label>
                <input
                  type="date"
                  className="input-field"
                  min={getTodayDateStr()}
                  value={newDate}
                  onChange={(e) => { setNewDate(e.target.value); setNewTime(''); }}
                  required
                />
              </div>

              {newDate && (
                <div className="slots-selection-wrapper">
                  <label className="form-label">
                    <Clock size={16} /> المواعيد المتاحة ليوم ({newDate}):
                  </label>
                  
                  {getAvailableSlots(newDate).length === 0 ? (
                    <div className="no-slots-warning">
                      <AlertCircle size={18} />
                      <span>عفواً، لا توجد مواعيد متاحة في هذا اليوم (عطلة أو محجوز بالكامل). يرجى اختيار تاريخ آخر.</span>
                    </div>
                  ) : (
                    <div className="time-slots-grid">
                      {getAvailableSlots(newDate).map((slot, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`slot-chip ${newTime === slot ? 'selected' : ''}`}
                          onClick={() => setNewTime(slot)}
                        >
                          <span>{slot}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="reschedule-actions-row">
                <button
                  type="submit"
                  className="btn-primary confirm-btn"
                  disabled={!newDate || !newTime}
                >
                  <CheckCircle2 size={18} />
                  <span>تأكيد الموعد الجديد {newTime && `(${newTime})`}</span>
                </button>

                <button
                  type="button"
                  className="btn-secondary cancel-btn"
                  onClick={() => setIsRescheduling(false)}
                >
                  إلغاء والعودة
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default ManageBooking;
