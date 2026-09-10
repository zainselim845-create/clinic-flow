import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import { clinicInfo, availableSlots } from '../data/demoData';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';
import { saveBookingDraft, completeBookingDraft, getBookingDrafts } from '../services/leadRecoveryService';
import { recordReferral } from '../services/referralService';
import { Check } from 'lucide-react';

import { validateEgyptianPhone, cleanEgyptianPhone } from '../utils/phoneValidation';
import { patientIndex } from '../services/indexedSearchService';
import { getTodayDateStr } from '../utils/timeSlots';
import { checkActionRateLimit } from '../utils/rateLimiter';

import BookingHeader from './booking/BookingHeader';
import ClinicDiscoveryView from './booking/ClinicDiscoveryView';
import SuspendedClinicView from './booking/SuspendedClinicView';
import PhoneCheckStep from './booking/PhoneCheckStep';
import AppointmentDetailsStep from './booking/AppointmentDetailsStep';
import BookingSuccessStep from './booking/BookingSuccessStep';

import './Booking.css';

const Booking = () => {
  const navigate = useNavigate();
  const { clinicSlug } = useParams();
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('resume');
  const refCode = searchParams.get('ref');

  const { state, dispatch, useSupabase } = useApp();
  const { tenant, allTenants, switchTenant, isDedicatedDomain } = useTenant();
  const { appointments = [], patients = [], blockedSlots = [] } = state;

  const clinicQuery = searchParams.get('clinic');
  const hasDirectClinic = Boolean(clinicSlug || clinicQuery || isDedicatedDomain);

  const [discoverySearch, setDiscoverySearch] = useState('');
  const [discoverySpecialty, setDiscoverySpecialty] = useState('الكل');

  useEffect(() => {
    if (clinicSlug && tenant?.slug !== clinicSlug) {
      switchTenant(clinicSlug);
    }
  }, [clinicSlug, tenant, switchTenant]);

  const targetSlug = clinicSlug || clinicQuery;
  const resolvedTenant = (targetSlug ? allTenants.find(t => t.slug === targetSlug || t.id === targetSlug) : null) || (isDedicatedDomain ? tenant : null) || tenant;
  const currentClinic = resolvedTenant || state.clinicInfo || clinicInfo;

  // Tenant data isolation: filter local patients & appointments by active clinic
  const clinicPatients = patients.filter(p => !p.clinicId || p.clinicId === currentClinic?.id);
  const clinicAppointments = appointments.filter(a => !a.clinicId || a.clinicId === currentClinic?.id);

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
    type: currentClinic.services?.[0]?.name || 'كشف وفحص تشخيصي شامل',
    notes: ''
  });

  // Sync service type if clinic changes
  useEffect(() => {
    if (currentClinic?.services?.[0]?.name) {
      setFormData(prev => {
        const hasMatchingService = (currentClinic.services || []).some(s => s.name === prev.type);
        if (!hasMatchingService) {
          return { ...prev, type: currentClinic.services[0].name };
        }
        return prev;
      });
    }
  }, [currentClinic]);

  // Resume abandoned draft if param present
  useEffect(() => {
    if (resumeId) {
      const drafts = getBookingDrafts();
      const match = drafts.find(d => d.id === resumeId);
      if (match) {
        setFormData(prev => ({
          ...prev,
          phone: match.phone || prev.phone,
          name: match.name || prev.name,
          type: match.service || prev.type
        }));
        setCurrentStep('appointment_details');
      }
    }
  }, [resumeId]);

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

    // Rate limiting: Protect against automated scraping and phone enumeration
    const phoneRate = checkActionRateLimit('phone_lookup', clean, 10, 60000);
    if (!phoneRate.allowed) {
      setPhoneError(`محاولات بحث سريعة ومتكررة. يرجى الانتظار ${phoneRate.retryAfterSeconds} ثانية قبل المحاولة مجدداً.`);
      return;
    }

    setIsCheckingPhone(true);

    try {
      let foundPatient = null;

      // 1. O(1) Instantaneous Index Lookup
      if (!patientIndex.isIndexed || patientIndex.patientCount !== clinicPatients.length || patientIndex.currentClinicId !== currentClinic?.id) {
        patientIndex.buildIndex(clinicPatients, currentClinic?.id);
      }
      const indexedMatch = patientIndex.findByPhone(clean, currentClinic?.id);
      if (indexedMatch) {
        foundPatient = indexedMatch;
      }

      // 2. Check previous appointments in local state (scoped to current clinic)
      if (!foundPatient) {
        const apptMatch = clinicAppointments.find(a => {
          const aClean = cleanEgyptianPhone(a.patientPhone || '');
          return aClean === clean || a.patientPhone === formData.phone;
        });
        if (apptMatch && apptMatch.patientName) {
          foundPatient = {
            id: apptMatch.patientId || ('patient_' + clean),
            clinicId: currentClinic?.id,
            clinic_id: currentClinic?.id,
            name: apptMatch.patientName,
            phone: apptMatch.patientPhone,
            age: apptMatch.patientAge || '',
            gender: apptMatch.patientGender || 'ذكر',
            visitsCount: 1
          };
        }
      }

      // 3. Check Supabase PostgreSQL database (strictly scoped to currentClinic)
      if (!foundPatient && useSupabase) {
        const { data } = await patientsService.findPatientByPhone(currentClinic?.id, clean);
        if (data) {
          foundPatient = data;
        }
      }

      if (foundPatient) {
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

      // Save initial draft for lead recovery
      saveBookingDraft({
        phone: clean,
        name: foundPatient?.name || formData.name,
        service: formData.type,
        date: formData.date,
        step: 2
      });

      setCurrentStep('appointment_details');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('Error during phone lookup:', err);
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

    // Duplicate check (scoped to clinic)
    const duplicateAppt = clinicAppointments.find(
      a => (cleanEgyptianPhone(a.patientPhone) === cleanedPhone || a.patientPhone === cleanedPhone) &&
           a.date === formData.date &&
           a.time === formData.time &&
           a.status !== 'cancelled'
    );
    if (duplicateAppt) {
      setBookingError('يوجد حجز مسجل مسبقاً بنفس رقم الهاتف في هذا الموعد المحدد.');
      return;
    }

    // Availability check (scoped to clinic)
    const isSlotBooked = clinicAppointments.some(
      a => a.date === formData.date && a.time === formData.time && a.status !== 'cancelled'
    );
    const isSlotBlocked = blockedSlots.some(
      b => b.date === formData.date && (b.time === formData.time || b.isFullDay || b.time === 'FULL_DAY')
    );

    if (isSlotBooked || isSlotBlocked) {
      setBookingError('عذراً، هذا الموعد تم حجزه أو إغلاقه مؤخراً. يرجى اختيار موعد آخر.');
      return;
    }

    // Rate limiting: Protect against bot booking flooding (Max 5 booking requests per 10 mins)
    const bookingRate = checkActionRateLimit('booking_submit', cleanedPhone, 5, 600000);
    if (!bookingRate.allowed) {
      setBookingError(`عذراً، تجاوزت الحد المسموح به للمحاولات السريعة لحماية النظام. يرجى الانتظار ${bookingRate.retryAfterSeconds} ثانية والمحاولة مجدداً.`);
      return;
    }

    setIsSubmitting(true);

    try {
      let patientId;

      const generateUuid = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      if (isExistingClient && recognizedPatient && !isFamilyMemberBooking) {
        patientId = recognizedPatient.id;
      } else {
        patientId = generateUuid();
        const newPatientData = {
          id: patientId,
          clinicId: currentClinic?.id,
          clinic_id: currentClinic?.id,
          name: formData.name.trim(),
          phone: cleanedPhone,
          age: formData.age || 'غير محدد',
          gender: formData.gender || 'ذكر',
          bloodType: 'غير محدد',
          diagnosis: 'مريض جديد أونلاين',
          lastVisit: formData.date,
          visitsCount: 1,
          notes: isFamilyMemberBooking ? `فرد عائلة برقم ${cleanedPhone}` : 'حجز عبر البوابة الإلكترونية'
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

      const bookingId = generateUuid();
      const bookingCode = '#CF-' + Math.floor(1000 + Math.random() * 9000);

      const selectedService = (currentClinic.services || []).find(s => s.name === formData.type);
      const serviceFee = selectedService?.price || (currentClinic.regularFee || '300 ج.م');

      const newAppointment = {
        id: bookingId,
        clinicId: currentClinic?.id,
        clinic_id: currentClinic?.id,
        patientId: patientId,
        patientName: formData.name.trim(),
        patientPhone: cleanedPhone,
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
      completeBookingDraft(cleanedPhone);

      if (refCode) {
        recordReferral(refCode, formData.name.trim(), cleanedPhone);
      }

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

  const copyBookingCode = () => {
    if (createdBooking?.bookingCode) {
      navigator.clipboard.writeText(createdBooking.bookingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const resetBookingForm = () => {
    setCurrentStep('phone_check');
    setCreatedBooking(null);
    setFormData({
      phone: '',
      name: '',
      age: '',
      gender: 'ذكر',
      date: todayStr,
      time: '',
      type: currentClinic.services?.[0]?.name || 'كشف وفحص تشخيصي شامل',
      notes: ''
    });
    setIsExistingClient(false);
    setRecognizedPatient(null);
  };

  // VIEW 0: GENERAL PLATFORM CLINIC DISCOVERY & SELECTOR (/booking on main domain)
  if (!hasDirectClinic) {
    return (
      <ClinicDiscoveryView
        allTenants={allTenants}
        discoverySearch={discoverySearch}
        setDiscoverySearch={setDiscoverySearch}
        discoverySpecialty={discoverySpecialty}
        setDiscoverySpecialty={setDiscoverySpecialty}
        onSelectClinic={(clinic) => navigate(`/c/${clinic.slug}/booking`)}
        onNavigate={navigate}
      />
    );
  }

  // GUARD: SUSPENDED CLINIC NOTICE
  if (currentClinic?.subscriptionStatus === 'suspended') {
    return <SuspendedClinicView clinic={currentClinic} />;
  }

  // VIEW 3: SUCCESS CONFIRMATION TICKET
  if (currentStep === 'success' && createdBooking) {
    return (
      <BookingSuccessStep
        createdBooking={createdBooking}
        currentClinic={currentClinic}
        copiedCode={copiedCode}
        onCopyBookingCode={copyBookingCode}
        onNewBooking={resetBookingForm}
        onManageBooking={() => navigate('/manage-booking')}
        onNavigate={navigate}
      />
    );
  }

  // MAIN BOOKING PORTAL (STEPS 1 & 2)
  return (
    <div className="nebras-booking-page">
      <BookingHeader clinic={currentClinic} onNavigate={navigate} />

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

        {/* STEP 1: PHONE SEARCH CARD */}
        {currentStep === 'phone_check' && (
          <PhoneCheckStep
            formData={formData}
            setFormData={setFormData}
            phoneError={phoneError}
            setPhoneError={setPhoneError}
            isCheckingPhone={isCheckingPhone}
            onSubmit={handlePhoneSubmit}
          />
        )}

        {/* STEP 2: APPOINTMENT DETAILS */}
        {currentStep === 'appointment_details' && (
          <AppointmentDetailsStep
            formData={formData}
            setFormData={setFormData}
            isExistingClient={isExistingClient}
            recognizedPatient={recognizedPatient}
            isFamilyMemberBooking={isFamilyMemberBooking}
            setIsFamilyMemberBooking={setIsFamilyMemberBooking}
            currentClinic={currentClinic}
            clinicAppointments={clinicAppointments}
            blockedSlots={blockedSlots}
            availableSlots={availableSlots}
            bookingError={bookingError}
            setBookingError={setBookingError}
            isSubmitting={isSubmitting}
            onSubmit={handleFinalSubmit}
            onBackToPhone={() => setCurrentStep('phone_check')}
          />
        )}
      </div>

      <footer className="nebras-footer">
        <p>نظام الحجز الإلكتروني • {currentClinic.name} • {currentClinic.address}</p>
      </footer>
    </div>
  );
};

export default Booking;
