import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { clinicInfo, availableSlots } from '../data/demoData';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';
import { 
  MapPin, Phone, Clock, Stethoscope, 
  Calendar, MessageCircle, Copy, Check, CalendarPlus, AlertCircle,
  AlertTriangle, Sparkles, Users, UserCheck, UserPlus, Loader2,
  RefreshCw, CheckCircle, ArrowRight, ShieldCheck, ChevronLeft
} from 'lucide-react';

import BookingCalendar from '../components/BookingCalendar';
import { validateEgyptianPhone, cleanEgyptianPhone } from '../utils/phoneValidation';
import { getTodayDateStr } from '../utils/timeSlots';
import './Booking.css';

const Booking = () => {
  const navigate = useNavigate();
  const { state, dispatch, useSupabase } = useApp();
  const { appointments = [], patients = [], blockedSlots = [] } = state;

  const currentClinic = state.clinicInfo || clinicInfo;
  const todayStr = getTodayDateStr();

  // Booking Flow: 'phone_check' -> 'appointment_details' -> 'success'
  const [currentStep, setCurrentStep] = useState('phone_check');

  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    age: '',
    gender: 'ذكر',
    date: todayStr,
    time: '',
    type: 'كشف عادي',
    notes: ''
  });

  const [phoneError, setPhoneError] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client Recognition
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [recognizedPatient, setRecognizedPatient] = useState(null);
  const [isFamilyMemberBooking, setIsFamilyMemberBooking] = useState(false);

  // Success Screen
  const [createdBooking, setCreatedBooking] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // STEP 1: Check Phone Number against DB and Local State
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setPhoneError('');
    setBookingError('');

    const clean = cleanEgyptianPhone(formData.phone);

    if (!clean || !validateEgyptianPhone(formData.phone)) {
      setPhoneError('يرجى إدخال رقم هاتف محمول مصري صحيح مكون من 11 رقماً (مثال: 01012345678)');
      return;
    }

    setIsCheckingPhone(true);

    try {
      let foundPatient = null;

      // 1. Check local state patients (instant)
      const localMatch = patients.find(p => {
        const pClean = cleanEgyptianPhone(p.phone || '');
        return pClean === clean || p.phone === formData.phone;
      });

      if (localMatch) {
        foundPatient = localMatch;
      }

      // 2. Check previous appointments in local state
      if (!foundPatient) {
        const apptMatch = appointments.find(a => {
          const aClean = cleanEgyptianPhone(a.patientPhone || '');
          return aClean === clean || a.patientPhone === formData.phone;
        });
        if (apptMatch && apptMatch.patientName) {
          foundPatient = {
            id: apptMatch.patientId || ('patient_' + clean),
            name: apptMatch.patientName,
            phone: apptMatch.patientPhone,
            age: apptMatch.patientAge || '',
            gender: apptMatch.patientGender || 'ذكر',
            visitsCount: 1
          };
        }
      }

      // 3. Check Supabase PostgreSQL database
      if (!foundPatient && useSupabase) {
        const { data } = await patientsService.findPatientByPhone(null, formData.phone);
        if (data) {
          foundPatient = data;
        }
      }

      if (foundPatient) {
        // EXISTING CLIENT: Recognize and pre-fill name
        setIsExistingClient(true);
        setRecognizedPatient(foundPatient);
        setIsFamilyMemberBooking(false);
        setFormData(prev => ({
          ...prev,
          name: foundPatient.name || '',
          age: foundPatient.age || '',
          gender: foundPatient.gender || 'ذكر'
        }));
      } else {
        // NEW CLIENT: Clear name so they can enter their details first
        setIsExistingClient(false);
        setRecognizedPatient(null);
        setIsFamilyMemberBooking(false);
        setFormData(prev => ({
          ...prev,
          name: '',
          age: '',
          gender: 'ذكر'
        }));
      }

      setCurrentStep('appointment_details');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('Error during phone lookup:', err);
      // Fallback: Proceed as new client
      setIsExistingClient(false);
      setRecognizedPatient(null);
      setCurrentStep('appointment_details');
    } finally {
      setIsCheckingPhone(false);
    }
  };

  // STEP 2: Final Booking Submission
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');

    const cleanedPhone = cleanEgyptianPhone(formData.phone);

    if (!formData.name || formData.name.trim().length < 3) {
      setBookingError('يرجى إدخال اسم المريض الثلاثي بالكامل.');
      return;
    }

    if (!formData.date || !formData.time) {
      setBookingError('يرجى اختيار يوم ووقت الكشف المناسب لك من جدول المواعيد.');
      return;
    }

    // Duplicate check
    const duplicateAppt = appointments.find(
      a => (cleanEgyptianPhone(a.patientPhone) === cleanedPhone || a.patientPhone === cleanedPhone) &&
           a.date === formData.date &&
           a.time === formData.time &&
           a.status !== 'cancelled'
    );
    if (duplicateAppt) {
      setBookingError('يوجد حجز مسجل مسبقاً بنفس رقم الهاتف في هذا الموعد المحدد.');
      return;
    }

    // Availability check
    const isSlotBooked = appointments.some(
      a => a.date === formData.date && a.time === formData.time && a.status !== 'cancelled'
    );
    const isSlotBlocked = blockedSlots.some(
      b => b.date === formData.date && (b.time === formData.time || b.isFullDay || b.time === 'FULL_DAY')
    );

    if (isSlotBooked || isSlotBlocked) {
      setBookingError('عذراً، هذا الموعد تم حجزه أو إغلاقه مؤخراً. يرجى اختيار موعد آخر.');
      return;
    }

    setIsSubmitting(true);

    try {
      let patientId;

      if (isExistingClient && recognizedPatient && !isFamilyMemberBooking) {
        patientId = recognizedPatient.id;
      } else {
        // Create new patient record for new client or family member
        patientId = Date.now().toString() + '_p';
        const newPatientData = {
          id: patientId,
          name: formData.name.trim(),
          phone: formData.phone,
          age: formData.age || 'غير محدد',
          gender: formData.gender || 'ذكر',
          bloodType: 'غير محدد',
          diagnosis: 'مريض جديد أونلاين',
          lastVisit: formData.date,
          visitsCount: 1,
          notes: isFamilyMemberBooking ? `فرد عائلة برقم ${formData.phone}` : 'حجز عبر البوابة الإلكترونية'
        };

        if (useSupabase) {
          try {
            await patientsService.addPatient(newPatientData);
          } catch (err) {
            console.error('Failed to sync new patient to Supabase:', err);
          }
        }
        dispatch({ type: 'ADD_PATIENT', payload: newPatientData });
      }

      const bookingId = Date.now().toString();
      const bookingCode = '#CF-' + Math.floor(1000 + Math.random() * 9000);

      const selectedService = (currentClinic.services || []).find(s => s.name === formData.type);
      const serviceFee = selectedService?.price || (formData.type === 'طوارئ' ? (currentClinic.emergencyFee || '400 ج.م') : (currentClinic.regularFee || '300 ج.م'));

      const newAppointment = {
        id: bookingId,
        patientId: patientId,
        patientName: formData.name.trim(),
        patientPhone: formData.phone,
        patientAge: formData.age || '',
        patientGender: formData.gender || 'ذكر',
        date: formData.date,
        time: formData.time,
        type: formData.type,
        fee: serviceFee,
        status: 'booked',
        bookingCode: bookingCode,
        source: 'online_patient',
        notes: formData.notes || 'حجز عبر البوابة الإلكترونية'
      };

      if (useSupabase) {
        try {
          await appointmentsService.addAppointment(newAppointment);
        } catch (err) {
          console.error('Failed to sync appointment to Supabase:', err);
        }
      }

      dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });

      setCreatedBooking(newAppointment);
      setCurrentStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('Error creating booking:', err);
      setBookingError('حدث خطأ أثناء تأكيد الحجز. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Calendar Link
  const getGoogleCalendarUrl = (booking) => {
    if (!booking || !booking.date || !booking.time) return '#';
    const isPM = booking.time.includes('م');
    const timeClean = booking.time.replace(/[^\d:]/g, '');
    const [rawH, rawM] = timeClean.split(':').map(Number);
    let hours = rawH || 18;
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    const dateFormatted = booking.date.replace(/-/g, '');
    const startHourStr = String(hours).padStart(2, '0');
    const startMinStr = String(rawM || 0).padStart(2, '0');
    const endHourStr = String(hours + 1).padStart(2, '0');

    const startIso = `${dateFormatted}T${startHourStr}${startMinStr}00`;
    const endIso = `${dateFormatted}T${endHourStr}${startMinStr}00`;

    const title = encodeURIComponent(`موعد كشف في ${currentClinic.name}`);
    const details = encodeURIComponent(`كود الحجز: ${booking.bookingCode}\nالنوع: ${booking.type}\nالعنوان: ${currentClinic.address}`);
    const location = encodeURIComponent(currentClinic.address || '');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  const copyBookingCode = () => {
    if (createdBooking?.bookingCode) {
      navigator.clipboard.writeText(createdBooking.bookingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // =========================================================================
  // VIEW 3: SUCCESS CONFIRMATION TICKET (NEBRAS STYLE)
  // =========================================================================
  if (currentStep === 'success' && createdBooking) {
    const cleanPhone = (createdBooking.patientPhone || '').replace(/^0/, '20').replace(/\D/g, '');
    const clinicPhoneClean = (currentClinic.phone || '').replace(/^0/, '20').replace(/\D/g, '');
    const whatsappMsg = encodeURIComponent(
      `مرحباً، تم حجز موعد كشف باسم: ${createdBooking.patientName}\n` +
      `كود الحجز: ${createdBooking.bookingCode}\n` +
      `الموعد: ${createdBooking.date} الساعة ${createdBooking.time}\n` +
      `الخدمة: ${createdBooking.type}\n` +
      `العنوان: ${currentClinic.address}`
    );
    const whatsappUrl = `https://wa.me/${clinicPhoneClean || cleanPhone}?text=${whatsappMsg}`;

    return (
      <div className="nebras-booking-page">
        
        {/* Nebras Top Brand Bar */}
        <header className="nebras-top-bar">
          <div className="nebras-brand">
            <Stethoscope size={24} className="brand-logo-icon" />
            <span className="brand-title">{currentClinic.name}</span>
          </div>
          <div className="nebras-bar-links">
            <button onClick={() => navigate('/manage-booking')} className="nebras-nav-btn">
              <span>تعديل موعد سابق</span>
            </button>
            <button onClick={() => navigate('/login')} className="nebras-nav-btn outline">
              <span>بوابة العيادة</span>
            </button>
          </div>
        </header>

        <div className="nebras-body-container" style={{ maxWidth: '650px' }}>
          
          {/* Visual Progress Stepper (Success State) */}
          <div className="booking-visual-stepper">
            <div className="stepper-step completed">
              <span className="step-num"><Check size={14} /></span>
              <span className="step-title">التحقق من الهاتف</span>
            </div>
            <div className="stepper-line filled"></div>
            <div className="stepper-step completed">
              <span className="step-num"><Check size={14} /></span>
              <span className="step-title">اختيار الخدمة والموعد</span>
            </div>
            <div className="stepper-line filled"></div>
            <div className="stepper-step active">
              <span className="step-num"><Check size={14} /></span>
              <span className="step-title">تأكيد وتذكرة الحجز</span>
            </div>
          </div>

          <div className="nebras-card">
            <div className="nebras-card-header">
              <h3>تم تأكيد حجز موعدك بنجاح</h3>
            </div>


            <div className="nebras-card-body text-center">
              <div className="nebras-success-icon-wrap">
                <CheckCircle size={52} className="text-nebras-orange" />
              </div>

              <h4 className="success-headline">شكراً لثقتكم بنا</h4>
              <p className="success-subtext">تم تسجيل وتثبيت حجزك في العيادة بنجاح وتجهيز ملفك الطبي.</p>

              {/* Digital Pass */}
              <div className="nebras-ticket-box">
                <div className="nebras-ticket-header">
                  <span>كود الحجز المرجعي:</span>
                  <div className="ticket-code-group">
                    <strong className="ticket-code-text">{createdBooking.bookingCode}</strong>
                    <button onClick={copyBookingCode} className="nebras-btn-copy" title="نسخ الكود">
                      {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                      <span>{copiedCode ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                </div>

                <div className="nebras-ticket-grid">
                  <div className="ticket-row">
                    <span className="ticket-lbl">اسم المريض:</span>
                    <strong className="ticket-val">{createdBooking.patientName}</strong>
                  </div>
                  <div className="ticket-row">
                    <span className="ticket-lbl">رقم الهاتف:</span>
                    <strong className="ticket-val" dir="ltr">{createdBooking.patientPhone}</strong>
                  </div>
                  <div className="ticket-row">
                    <span className="ticket-lbl">تاريخ الموعد:</span>
                    <strong className="ticket-val">{createdBooking.date}</strong>
                  </div>
                  <div className="ticket-row">
                    <span className="ticket-lbl">التوقيت:</span>
                    <strong className="ticket-val text-nebras-orange">{createdBooking.time}</strong>
                  </div>
                  <div className="ticket-row">
                    <span className="ticket-lbl">نوع الخدمة:</span>
                    <strong className="ticket-val">{createdBooking.type}</strong>
                  </div>
                  <div className="ticket-row">
                    <span className="ticket-lbl">قيمة الكشف:</span>
                    <strong className="ticket-val text-nebras-orange">{createdBooking.fee}</strong>
                  </div>
                </div>

                <div className="nebras-ticket-address">
                  <MapPin size={16} />
                  <span>{currentClinic.address}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="nebras-actions-row">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="nebras-action-btn whatsapp">
                  <MessageCircle size={18} />
                  <span>إرسال تفاصيل الموعد للواتساب</span>
                </a>
                <a href={getGoogleCalendarUrl(createdBooking)} target="_blank" rel="noopener noreferrer" className="nebras-action-btn calendar">
                  <CalendarPlus size={18} />
                  <span>إضافة إلى تقويم جوجل</span>
                </a>
              </div>

              <div className="nebras-success-footer">
                <button 
                  onClick={() => {
                    setCurrentStep('phone_check');
                    setCreatedBooking(null);
                    setFormData({
                      phone: '',
                      name: '',
                      age: '',
                      gender: 'ذكر',
                      date: todayStr,
                      time: '',
                      type: 'كشف عادي',
                      notes: ''
                    });
                    setIsExistingClient(false);
                    setRecognizedPatient(null);
                  }} 
                  className="nebras-link-btn"
                >
                  <RefreshCw size={14} />
                  <span>حجز موعد جديد</span>
                </button>
                <button onClick={() => navigate('/manage-booking')} className="nebras-link-btn secondary">
                  <span>إدارة أو تعديل الموعد</span>
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    );
  }

  // =========================================================================
  // MAIN BOOKING PORTAL (EXACT NEBRAS DENTALORE CLONE)
  // =========================================================================
  return (
    <div className="nebras-booking-page">
      
      {/* Top Brand Bar */}
      <header className="nebras-top-bar">
        <div className="nebras-brand">
          <Stethoscope size={24} className="brand-logo-icon" />
          <div>
            <span className="brand-title">{currentClinic.name}</span>
            <span className="brand-subtitle">{currentClinic.doctorName} — {currentClinic.specialty}</span>
          </div>
        </div>
        <div className="nebras-bar-links">
          <button onClick={() => navigate('/manage-booking')} className="nebras-nav-btn">
            <span>تعديل موعد سابق</span>
          </button>
          <button onClick={() => navigate('/login')} className="nebras-nav-btn outline">
            <span>بوابة العيادة</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="nebras-body-container">

        {/* Visual Progress Stepper */}
        <div className="booking-visual-stepper">
          <div className={`stepper-step ${currentStep === 'phone_check' ? 'active' : 'completed'}`}>
            <span className="step-num">{currentStep !== 'phone_check' ? <Check size={14} /> : '1'}</span>
            <span className="step-title">التحقق من الهاتف</span>
          </div>
          <div className={`stepper-line ${currentStep !== 'phone_check' ? 'filled' : ''}`}></div>
          <div className={`stepper-step ${currentStep === 'appointment_details' ? 'active' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-title">اختيار الخدمة والموعد</span>
          </div>
          <div className="stepper-line"></div>
          <div className="stepper-step">
            <span className="step-num">3</span>
            <span className="step-title">تأكيد وتذكرة الحجز</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* STEP 1: PHONE SEARCH CARD (SEARCH PATIENT)                         */}
        {/* ================================================================= */}
        {currentStep === 'phone_check' && (

          <div className="nebras-card search-card">
            
            {/* Dark Navy Header */}
            <div className="nebras-card-header">
              <p>حجز موعد أونلاين / Online Booking</p>
            </div>

            {/* White Body */}
            <div className="nebras-card-body">
              
              <div className="search-instruction">
                <h4>أدخل رقم هاتفك المحمول للبدء</h4>
                <p>سنتحقق فوراً من قاعدة البيانات: إذا كنت مسجلاً مسبقاً ستتمكن من اختيار موعدك مباشرة، وإذا كانت زيارتك الأولى ستسجل بياناتك أولاً.</p>
              </div>

              <form onSubmit={handlePhoneSubmit} className="nebras-search-form">
                
                <div className="nebras-input-group">
                  <label className="nebras-label">رقم الهاتف المحمول (مصر) *</label>
                  <div className="nebras-input-wrap">
                    <input 
                      type="tel"
                      id="SearchPhoneNumber"
                      className={`nebras-input ${phoneError ? 'error-border' : ''}`}
                      placeholder="01012345678"
                      dir="ltr"
                      value={formData.phone}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\s+/g, '');
                        setFormData(prev => ({ ...prev, phone: clean }));
                        setPhoneError('');
                      }}
                      maxLength={11}
                      autoFocus
                      required
                    />
                    <Phone size={18} className="nebras-field-icon" />
                  </div>
                  {phoneError && (
                    <span className="nebras-error-msg">
                      <AlertCircle size={14} />
                      <span>{phoneError}</span>
                    </span>
                  )}
                </div>

                <div className="nebras-btn-wrap">
                  <button 
                    type="submit" 
                    id="searchPatient"
                    className="default-custom-btn"
                    disabled={isCheckingPhone || !formData.phone || formData.phone.length < 11}
                  >
                    {isCheckingPhone ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        <span>جاري التحقق من قاعدة البيانات...</span>
                      </>
                    ) : (
                      <>
                        <span>متابعة</span>
                        <ChevronLeft size={18} />
                      </>
                    )}
                  </button>
                </div>

              </form>

              <div className="nebras-privacy-badge">
                <ShieldCheck size={16} />
                <span>بياناتك الطبية والشخصية مشفرة ومحمية بالكامل.</span>
              </div>

            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 2: APPOINTMENT DETAILS (CONDITIONAL FLOW)                     */}
        {/* ================================================================= */}
        {currentStep === 'appointment_details' && (
          <div className="nebras-card details-card">
            
            {/* Dark Navy Header */}
            <div className="nebras-card-header flex-between">
              <p>{isExistingClient && !isFamilyMemberBooking ? 'بيانات الموعد (عميل مسجل)' : 'تسجيل مريض جديد وتحديد الموعد'}</p>
              <button 
                type="button" 
                onClick={() => setCurrentStep('phone_check')}
                className="nebras-header-back-btn"
              >
                <ArrowRight size={14} />
                <span>تغيير الرقم ({formData.phone})</span>
              </button>
            </div>

            {/* White Body */}
            <div className="nebras-card-body">
              
              <form onSubmit={handleFinalSubmit} className="nebras-booking-form">

                {/* --------------------------------------------------------- */}
                {/* BRANCH 1: EXISTING CLIENT WELCOME (NO PERSONAL INPUTS!)   */}
                {/* --------------------------------------------------------- */}
                {isExistingClient && recognizedPatient && !isFamilyMemberBooking && (
                  <div className="nebras-patient-recognized-box">
                    <div className="recognized-info">
                      <Sparkles size={22} className="text-nebras-orange" />
                      <div>
                        <h4>أهلاً بك مجدداً يا أستاذ/ {recognizedPatient.name}</h4>
                        <p>رقم الهاتف: <span dir="ltr">{formData.phone}</span> • ملفك الطبي مسجل لدينا في العيادة. يمكنك اختيار موعدك بالأسفل مباشرةً.</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsFamilyMemberBooking(true);
                        setFormData(prev => ({ ...prev, name: '', age: '' }));
                      }}
                      className="nebras-family-btn"
                    >
                      <Users size={13} />
                      <span>حجز لشخص آخر من العائلة بنفس الرقم؟</span>
                    </button>
                  </div>
                )}

                {/* --------------------------------------------------------- */}
                {/* BRANCH 2: NEW CLIENT (OR FAMILY) -> FILL INFO FIRST       */}
                {/* --------------------------------------------------------- */}
                {(!isExistingClient || isFamilyMemberBooking) && (
                  <div className="nebras-new-patient-section">
                    <div className="new-patient-title">
                      <UserPlus size={18} className="text-nebras-orange" />
                      <h5>{isFamilyMemberBooking ? 'بيانات فرد العائلة' : 'البيانات الشخصية للمريض الأول مرة'}</h5>
                    </div>

                    <div className="nebras-form-grid">
                      <div className="nebras-input-group">
                        <label className="nebras-label">الاسم بالكامل (الاسم الثلاثي) *</label>
                        <input 
                          type="text" 
                          className="nebras-input"
                          placeholder="أدخل اسمك الثلاثي"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          required 
                          autoFocus
                        />
                      </div>

                      <div className="nebras-row-2">
                        <div className="nebras-input-group">
                          <label className="nebras-label">السن (العمر)</label>
                          <input 
                            type="number" 
                            className="nebras-input"
                            placeholder="مثال: 30"
                            value={formData.age}
                            onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                            min="1"
                            max="120"
                          />
                        </div>
                        <div className="nebras-input-group">
                          <label className="nebras-label">النوع</label>
                          <select 
                            className="nebras-input nebras-select"
                            value={formData.gender}
                            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                          >
                            <option value="ذكر">ذكر</option>
                            <option value="أنثى">أنثى</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --------------------------------------------------------- */}
                {/* SERVICE SELECTION                                         */}
                {/* --------------------------------------------------------- */}
                <div className="nebras-section">
                  <h5 className="nebras-section-heading">الخدمة الطبية المطلوبة</h5>
                  <div className="nebras-input-group">
                    <select 
                      className="nebras-input nebras-select"
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    >
                      {(currentClinic.services && currentClinic.services.length > 0 ? currentClinic.services : [
                        { id: '1', name: 'كشف عادي', price: currentClinic.regularFee || '300 ج.م', duration: 30 },
                        { id: '2', name: 'استشارة', price: currentClinic.consultationFee || '150 ج.م', duration: 20 },
                        { id: '3', name: 'متابعة', price: currentClinic.consultationFee || '150 ج.م', duration: 20 },
                        { id: '4', name: 'طوارئ', price: currentClinic.emergencyFee || '400 ج.م', duration: 30 }
                      ]).map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} — ({s.price}) {s.duration ? `[مدة ${s.duration} دقيقة]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(formData.type === 'طوارئ' || formData.type.includes('طوارئ')) && (
                    <div className="nebras-emergency-banner">
                      <AlertTriangle size={16} />
                      <span>حالة طوارئ طبية عاجلة — سيتم إعطاء هذا الحجز أولوية قصوى داخل العيادة فور وصولكم.</span>
                    </div>
                  )}
                </div>

                {/* --------------------------------------------------------- */}
                {/* CALENDAR & TIME SLOTS SELECTION                           */}
                {/* --------------------------------------------------------- */}
                <div className="nebras-section">
                  <h5 className="nebras-section-heading">اختر يوم ووقت الكشف المناسب</h5>
                  
                  <BookingCalendar 
                    selectedDate={formData.date}
                    onSelectDate={(newDate) => {
                      setFormData(prev => ({ ...prev, date: newDate, time: '' }));
                      setBookingError('');
                    }}
                    onDateSelect={(newDate) => {
                      setFormData(prev => ({ ...prev, date: newDate, time: '' }));
                      setBookingError('');
                    }}
                    selectedTime={formData.time}
                    onSelectTime={(newTime) => {
                      setFormData(prev => ({ ...prev, time: newTime }));
                      setBookingError('');
                    }}
                    onTimeSelect={(newTime) => {
                      setFormData(prev => ({ ...prev, time: newTime }));
                      setBookingError('');
                    }}
                    appointments={appointments}
                    blockedSlots={blockedSlots}
                    availableSlots={availableSlots}
                    scheduleConfig={currentClinic.scheduleConfig}
                  />
                </div>

                {/* --------------------------------------------------------- */}
                {/* NOTES & SUBMIT                                            */}
                {/* --------------------------------------------------------- */}
                <div className="nebras-section">
                  <h5 className="nebras-section-heading">ملاحظات إضافية (اختياري)</h5>
                  <textarea 
                    className="nebras-input nebras-textarea"
                    rows="2"
                    placeholder="اكتب هنا أي تفاصيل أو أعراض ترغب في إبلاغ الطبيب بها مسبقاً..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  ></textarea>

                  {bookingError && (
                    <div className="nebras-error-banner">
                      <AlertCircle size={18} />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <div className="nebras-btn-wrap" style={{ marginTop: '25px' }}>
                    <button 
                      type="submit" 
                      className="default-custom-btn full-width"
                      disabled={!formData.time || !formData.date || !formData.name || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={18} className="spinner" />
                          <span>جاري تأكيد حجزك...</span>
                        </>
                      ) : (
                        <span>{formData.time ? `تأكيد حجز الموعد (${formData.date} — الساعة ${formData.time})` : 'يرجى اختيار وقت من الجدول أعلاه'}</span>
                      )}
                    </button>
                  </div>
                </div>

              </form>

            </div>

          </div>
        )}

      </div>

      {/* Nebras Subtle Footer */}
      <footer className="nebras-footer">
        <p>نظام الحجز الإلكتروني • {currentClinic.name} • {currentClinic.address}</p>
      </footer>

    </div>
  );
};

export default Booking;
