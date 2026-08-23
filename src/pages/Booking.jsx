import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { clinicInfo, availableSlots } from '../data/demoData';
import { sendBookingConfirmation } from '../services/smsService';
import * as appointmentsService from '../services/appointmentsService';
import * as patientsService from '../services/patientsService';
import * as notificationsService from '../services/notificationsService';
import { MapPin, Phone, Clock, CheckCircle2, Stethoscope, LayoutDashboard, Calendar, AlertCircle, MessageCircle } from 'lucide-react';
import './Booking.css';

const Booking = () => {
  const navigate = useNavigate();
  const { state, dispatch, useSupabase } = useApp();
  const { appointments = [], patients = [], blockedSlots = [] } = state;

  const todayStr = new Date().toISOString().split('T')[0];

  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: todayStr, // Default to today so time slots show up immediately!
    time: '',
    type: 'كشف عادي',
    notes: ''
  });

  const getAvailableSlotsForDate = (selectedDate) => {
    const targetDate = selectedDate || todayStr;

    // Find already booked times for the selected date (not cancelled)
    const bookedTimes = appointments
      .filter(appt => appt.date === targetDate && appt.status !== 'cancelled')
      .map(appt => appt.time);

    // Find secretary blocked times for the selected date
    const blockedTimes = blockedSlots
      .filter(b => b.date === targetDate)
      .map(b => b.time);

    return availableSlots.map(slot => {
      const isBooked = bookedTimes.includes(slot);
      const isBlocked = blockedTimes.includes(slot);
      return {
        time: slot,
        isAvailable: !isBooked && !isBlocked,
        isBooked,
        isBlocked
      };
    });
  };

  const slotsForSelectedDate = getAvailableSlotsForDate(formData.date);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.date || !formData.time) {
      alert('يرجى ملء جميع البيانات واختيار موعد متاح.');
      return;
    }

    // Check if slot is still available
    const targetSlot = slotsForSelectedDate.find(s => s.time === formData.time);
    if (!targetSlot || !targetSlot.isAvailable) {
      alert('عذراً، هذا الموعد تم حجزه أو إغلاقه مؤخراً. يرجى اختيار موعد آخر.');
      return;
    }

    // Check if patient exists by phone, if not create one
    let patient = patients.find(p => p.phone === formData.phone);
    let patientId;

    if (patient) {
      patientId = patient.id;
    } else {
      patientId = Date.now().toString() + '_p';
      const newPatientData = {
        id: patientId,
        name: formData.name,
        phone: formData.phone,
        age: '',
        gender: 'غير محدد',
        bloodType: '',
        diagnosis: '',
        notes: 'مريض جديد من الحجز الإلكتروني',
        visitsCount: 1
      };

      if (useSupabase) {
        patientsService.addPatient(newPatientData);
      }
      dispatch({
        type: 'ADD_PATIENT',
        payload: newPatientData
      });
    }

    const newAppointment = {
      id: Date.now().toString(),
      patientId,
      patientName: formData.name,
      patientPhone: formData.phone,
      date: formData.date,
      time: formData.time,
      type: formData.type,
      notes: formData.notes,
      status: 'upcoming',
      reminderSent: false
    };

    if (useSupabase) {
      appointmentsService.addAppointment(newAppointment);
    }
    dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
    
    // Add notification for admin/secretary
    const newNotification = {
      id: Date.now().toString() + '_n',
      type: 'appointment',
      title: 'حجز أونلاين جديد',
      message: `تم حجز موعد جديد باسم ${formData.name} يوم ${formData.date} الساعة ${formData.time}`,
      timestamp: new Date().toISOString(),
      read: false
    };

    if (useSupabase) {
      notificationsService.addNotification(newNotification);
    }
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: newNotification
    });

    // Send SMS Confirmation via TextBee / Supabase / Simulation
    try {
      await sendBookingConfirmation(
        formData.name,
        formData.phone,
        formData.date,
        formData.time,
        clinicInfo.name
      );
    } catch (smsErr) {
      console.warn('Could not send SMS confirmation:', smsErr);
    }

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="booking-public-page">
        <header className="public-top-nav">
          <div className="nav-brand">
            <Stethoscope size={24} />
            <span>ClinicFlow • حجز العيادة</span>
          </div>
          <button className="nav-admin-btn" onClick={() => navigate('/')}>
            <LayoutDashboard size={18} />
            لوحة تحكم العيادة
          </button>
        </header>

        <div className="success-container glass-card">
          <div className="success-animation">
            <CheckCircle2 size={80} color="var(--success-color, #10B981)" />
          </div>
          <h2>تم حجز موعدك بنجاح!</h2>
          
          <div className="booking-summary">
            <div className="summary-item">
              <span>الاسم:</span> <strong>{formData.name}</strong>
            </div>
            <div className="summary-item">
              <span>التاريخ:</span> <strong dir="ltr">{formData.date}</strong>
            </div>
            <div className="summary-item">
              <span>الوقت:</span> <strong>{formData.time}</strong>
            </div>
            <div className="summary-item">
              <span>نوع الزيارة:</span> <strong>{formData.type}</strong>
            </div>
          </div>

          <p className="success-msg">📱 تم تسجيل حجزك وسيتم إرسال رسالة SMS تذكيرية برقم هاتفك.</p>
          <p className="success-msg sm">الموعد مغلق الآن ولن يتمكن أي شخص آخر من حجزه.</p>
          
          <div className="success-actions">
            <button 
              className="btn-whatsapp" 
              onClick={() => {
                const cleanPhone = formData.phone ? formData.phone.replace(/^0/, '20').replace(/\D/g, '') : '';
                const msg = `🏥 *تأكيد حجز موعد — ${clinicInfo.name}*\n` +
                  `👤 *المريض:* ${formData.name}\n` +
                  `📅 *التاريخ:* ${formData.date}\n` +
                  `⏰ *الوقت:* ${formData.time}\n` +
                  `🩺 *نوع الزيارة:* ${formData.type}\n` +
                  `📍 *العنوان:* ${clinicInfo.address}\n\n` +
                  `يرجى الحضور قبل الموعد بـ 15 دقيقة. نتمنى لكم السلامة! ✨`;
                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: '#25D366',
                color: '#fff',
                padding: '0.85rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <MessageCircle size={18} />
              <span>إرسال تفاصيل الموعد عبر واتساب 💬</span>
            </button>
            <button className="btn-primary" onClick={() => {
              setIsSuccess(false);
              setFormData({ name: '', phone: '', date: todayStr, time: '', type: 'كشف عادي', notes: '' });
            }}>
              حجز موعد آخر
            </button>
            <button className="btn-secondary" onClick={() => navigate('/')}>
              الذهاب للوحة التحكم
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-public-page">
      {/* Top Navbar for Public Page */}
      <header className="public-top-nav">
        <div className="nav-brand">
          <Stethoscope size={24} className="brand-icon" />
          <span className="brand-name">كلينك فلو ClinicFlow</span>
        </div>
        <button className="nav-admin-btn" onClick={() => navigate('/')} title="لوحة التحكم للسكرتير والدكتور">
          <LayoutDashboard size={18} />
          لوحة تحكم العيادة
        </button>
      </header>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1>{clinicInfo.name}</h1>
          <p className="specialty">{clinicInfo.specialty}</p>
          <p className="welcome-msg">مرحباً بك في عيادتنا. جدول المواعيد محدث لحظياً - احجز موعدك أونلاين بسهولة.</p>
        </div>
      </div>

      {/* Clinic Info Cards */}
      <div className="clinic-info-cards">
        <div className="info-card glass-card">
          <MapPin size={24} className="info-icon" />
          <h3>العنوان</h3>
          <p>{clinicInfo.address}</p>
        </div>
        <div className="info-card glass-card">
          <Phone size={24} className="info-icon" />
          <h3>رقم الهاتف</h3>
          <p dir="ltr">{clinicInfo.phone}</p>
        </div>
        <div className="info-card glass-card">
          <Clock size={24} className="info-icon" />
          <h3>ساعات العمل</h3>
          <p>{clinicInfo.workingHours}</p>
        </div>
      </div>

      {/* Main Booking Form */}
      <div className="booking-form-container glass-card">
        <h2>احجز موعدك أونلاين</h2>
        <form onSubmit={handleSubmit} className="public-booking-form">
          <div className="form-row">
            <div className="form-group">
              <label>الاسم بالكامل *</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="أدخل اسمك الثلاثي"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label>رقم الهاتف *</label>
              <input 
                type="tel" 
                className="input-field" 
                placeholder="01xxxxxxxxx"
                dir="ltr"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>التاريخ *</label>
              <input 
                type="date" 
                className="input-field"
                min={todayStr}
                value={formData.date}
                onChange={(e) => {
                  setFormData({...formData, date: e.target.value, time: ''});
                }}
                required 
              />
            </div>
            <div className="form-group">
              <label>نوع الزيارة</label>
              <select 
                className="input-field"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="كشف عادي">كشف عادي</option>
                <option value="متابعة">متابعة</option>
                <option value="استشارة">استشارة</option>
              </select>
            </div>
          </div>

          {/* Time Slots Section - Prominently Displayed */}
          <div className="form-group time-slots-group">
            <div className="time-slots-header">
              <label className="time-slots-label">
                <Calendar size={20} />
                <span>اختر الوقت المناسب يوم ({formData.date || todayStr}) *</span>
              </label>
              {formData.time && (
                <span className="selected-time-badge">الموعد المحدد: {formData.time}</span>
              )}
            </div>

            <div className="slots-legend">
              <span className="legend-item available"><span className="legend-dot"></span> متاح للحجز</span>
              <span className="legend-item booked"><span className="legend-dot"></span> محجوز ✕</span>
              <span className="legend-item blocked"><span className="legend-dot"></span> مغلق من العيادة 🔒</span>
            </div>

            <div className="time-slots-grid">
              {slotsForSelectedDate.map(slot => {
                let statusLabel = 'متاح';
                let statusClass = 'available';

                if (slot.isBooked) {
                  statusLabel = 'محجوز ✕';
                  statusClass = 'booked';
                } else if (slot.isBlocked) {
                  statusLabel = 'مغلق 🔒';
                  statusClass = 'blocked';
                }

                const isSelected = formData.time === slot.time;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.isAvailable}
                    className={`time-slot-btn ${statusClass} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setFormData({...formData, time: slot.time})}
                  >
                    <span className="slot-time">{slot.time}</span>
                    <span className="slot-status">{statusLabel}</span>
                  </button>
                );
              })}
            </div>
            
            {!formData.time && (
              <p className="select-slot-hint">
                <AlertCircle size={15} /> انقر على أي وقت باللون الأخضر أعلاه لتحديده للحجز.
              </p>
            )}
          </div>

          <div className="form-group">
            <label>ملاحظات (اختياري)</label>
            <textarea 
              className="input-field"
              rows="3"
              placeholder="أي تفاصيل إضافية تود إخبار الطبيب بها..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            ></textarea>
          </div>

          <button type="submit" className="submit-booking-btn" disabled={!formData.time}>
            {formData.time ? `تأكيد حجز موعد (${formData.time})` : 'يرجى اختيار موعد متاح أولاً'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Booking;
